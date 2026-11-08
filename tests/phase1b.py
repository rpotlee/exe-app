"""Phase 1b regressions: Next & Later, status line, badges, five-tab nav, Priority Engine, dependencies,
decision fields, outcome completion and task edit. Serve the repo on :8000, set EXE_CHROMIUM, then run."""
import os
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
STORE = 'exe-v1-local-workspace'
def S(page): return json.loads(page.evaluate(f"localStorage.getItem('{STORE}')"))
def nav(page, route): page.locator(f'[data-nav="{route}"]').filter(visible=True).first.click()
def status(page): return ' '.join(page.locator('#status-line').inner_text().split())
def now_ids(d): return [a['outcome'] for a in d['focusAssignments'] if a['lane'] == 'now']
def open_stream(page, w, stream):
    if w < 761 and page.locator(f'[data-stream="{stream}"]').count() and not page.locator(f'[data-stream="{stream}"]').is_visible():
        page.locator('[data-picker] .active').click()
    page.locator(f'[data-stream="{stream}"]').click()
def expand(page, w, outcome):
    if w < 761:
        head = page.locator(f'[data-toggle-outcome="{outcome}"]')
        if head.get_attribute('aria-expanded') != 'true': head.click()
def fresh(browser, w):
    ctx = browser.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce')
    page = ctx.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8000/?example=1'); page.evaluate('localStorage.clear()'); page.reload()
    return ctx, page, errors
source = (ROOT / 'app.js').read_text()
assert 'CAPTURE_TASKS' not in source and 'blockedBy:[' not in source.split('function migrate')[0], 'hard-coded capture map / blockedBy must be gone'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    for w in [320, 375, 390, 430, 768, 1024, 1280, 1440]:
        ctx, page, errors = fresh(browser, w)
        mobile = w < 761
        # ---- navigation: five labeled tabs, separate plus
        labels = page.locator('.mobile-dock small') if mobile else page.locator('.sidebar-menu .nav-link span:not([data-icon]):not(.nav-count)')
        texts = [t.strip() for t in labels.all_inner_texts()]
        assert texts == ['Focus', 'Inbox', 'AI Review', 'Map', 'Decisions'], texts
        if mobile:
            for l in labels.all(): assert l.is_visible()
            dock = page.locator('.mobile-dock').bounding_box(); plus = page.locator('.mobile-capture').bounding_box()
            assert plus['y'] + plus['height'] <= dock['y'] + 1 and page.locator('.mobile-dock .mobile-capture').count() == 0
            assert page.locator('.mobile-dock [data-nav]').count() == 5
            for it in page.locator('.mobile-dock [data-nav]').all():
                r = it.bounding_box(); assert r['width'] >= 44 and r['height'] >= 44
                assert r['x'] >= dock['x'] - 1 and r['x'] + r['width'] <= dock['x'] + dock['width'] + 1
                assert not (plus['x'] < r['x'] + r['width'] and plus['x'] + plus['width'] > r['x'] and plus['y'] + plus['height'] > r['y'] and plus['y'] < r['y'] + r['height']), 'plus covers a tab'
            assert 'rgb(55, 62, 73)' in page.locator('.mobile-dock').evaluate('e=>getComputedStyle(e).backgroundImage'), 'dock is graphite (owner, DEC-007)'
        else:
            assert page.get_by_role('button', name='Quick capture').filter(visible=True).count() == 1
        # ---- status line and badges (seed has nothing awaiting review, 3 confirmed blocks)
        assert status(page) == '1 current focus of up to 3 active. 3 blocked.'
        assert page.locator('[data-inbox-count]').filter(visible=True).count() == 0
        page.locator('[data-capture]').filter(visible=True).last.click()
        page.get_by_label('Capture text').fill('New thought one\nNew thought two'); page.locator('#capture-form button[type=submit]').click()
        assert status(page) == '1 current focus of up to 3 active. 2 awaiting AI Review 3 blocked.', status(page)
        scope = '.mobile-dock' if mobile else '.sidebar'
        assert page.locator(f'{scope} [data-nav=inbox] [data-inbox-count]').inner_text() == '2'
        assert page.locator(f'{scope} [data-nav=review] [data-dock-count]').inner_text() == '2'
        before = S(page)
        # ---- Quick Capture segmentation (DEC-006) and Inbox order
        def cap(text):
            page.locator('[data-capture]').filter(visible=True).last.click(); page.get_by_label('Capture text').fill(text); page.locator('#capture-form button[type=submit]').click()
        n = len(S(page)['captures'])
        cap('Call the plumber\nBook flights\nRenew passport'); c = S(page)['captures'][n:]
        assert [x['text'] for x in c] == ['Call the plumber', 'Book flights', 'Renew passport'] and len({x['batchId'] for x in c}) == 1 and c[0]['batchText'].count('\n') == 2
        para = 'I keep thinking about whether the New York registration needs to happen before we take bookings, ' + 'and how long the publication step takes once we start.\nThe second line continues the same thought and is clearly a sentence that wraps over a long line.'
        cap(para); c = S(page)['captures'][n + 3:]; assert len(c) == 1 and c[0]['text'] == para.strip() and 'batchId' not in c[0], 'a paragraph stays one capture'
        cap('- first marked item that is quite long and goes past the short-line limit for sure, really it does, yes\n- second marked item that is also long enough to pass the short-line limit used above, yes'); assert len(S(page)['captures']) == n + 6
        nav(page, 'inbox'); first = page.locator('.raw-row .raw-text').first.inner_text(); assert first.startswith('second marked item'), first
        last_id = S(page)['captures'][-1]['id']; page.locator(f'[data-capture-check="{last_id}"]').click()
        page.locator('[data-inbox-filter=done]').click(); assert page.locator('.raw-row .raw-text').first.inner_text().startswith('second marked item')
        page.locator(f'[data-capture-check="{last_id}"]').click(); nav(page, 'focus')
        # ---- Next & Later screen: row at the bottom of Focus, own screen, lane changes, cap of three
        page.locator('[data-nav=lanes]').click()
        assert page.get_by_role('heading', name='Next & Later', exact=True).count() == 1
        assert page.locator('.lane-item').count() == 9 and page.locator('.mobile-dock .active, .sidebar .nav-link.active').filter(visible=True).count() == 1
        page.locator('[data-set-lane="reviews"][data-lane="next"]').click()
        assert [a['lane'] for a in S(page)['focusAssignments'] if a['outcome'] == 'reviews'] == ['next']
        page.locator('[data-set-lane="seo"][data-lane="now"]').click()
        page.get_by_role('heading', name='Keep focus to three').wait_for(); page.keyboard.press('Escape')
        assert len(now_ids(S(page))) == 3
        page.locator('[data-set-lane="reviews"][data-lane="later"]').click()
        nav(page, 'focus')
        # ---- Priority Engine: seed needs no change; capture never runs it; pin -> suggestion -> confirm -> audit
        page.locator('[data-review-priorities]').click()
        assert 'No change suggested' in page.locator('.mission-suggest').inner_text()
        ran = S(page)['priorityReview']['lastRun']
        page.locator('[data-capture]').filter(visible=True).last.click()
        page.get_by_label('Capture text').fill('Another'); page.locator('#capture-form button[type=submit]').click()
        assert S(page)['priorityReview']['lastRun'] == ran, 'a capture must not run the engine'
        nav(page, 'map'); open_stream(page, w, 'market'); expand(page, w, 'pricing')
        page.locator('[data-toggle-pin="pricing"]').click()
        nav(page, 'focus')
        card = page.locator('.suggest-card'); assert 'pinned' in card.inner_text().lower() or 'You pinned it' in card.inner_text()
        assert now_ids(S(page)) == ['registration', 'market-select', 'backend'], 'suggestion must not change Now'
        page.locator('[data-priority-ignore]').click()
        page.locator('[data-review-priorities]').click()
        assert page.locator('.suggest-card').count() == 0, 'an ignored suggestion is not repeated'
        nav(page, 'map'); open_stream(page, w, 'market'); expand(page, w, 'pricing')
        page.locator('[data-edit-outcome="pricing"]').click(); page.locator('#outcome-form [name=deadline]').fill('2027-01-15'); page.locator('#outcome-form [name=effort]').fill('about 3 hours')
        page.get_by_role('button', name='Save details').click()
        nav(page, 'focus')
        assert page.locator('.suggest-card').count() == 1, 'changed facts bring the suggestion back'
        page.locator('[data-priority-apply]').click(); page.locator('[data-priority-confirm]').click()
        d = S(page); assert 'pricing' in now_ids(d) and len(now_ids(d)) == 3 and d['audit'][-1]['type'] == 'priority-apply'
        assert d['priorityReview']['suggestion'] is None
        # ---- dependencies: legacy data migrates; cycles/self rejected; unconfirmed blocks nothing
        legacy = json.loads(json.dumps(before)); legacy['relationships'] = [r for r in legacy['relationships'] if r['to'] != 'locations-site' or r['kind'] != 'blocks']
        for r in legacy['relationships']: r.pop('id', None); r.pop('confirmed', None)
        for t in legacy['tasks']:
            if t['id'] == 'locations-site': t['blockedBy'] = ['market-shortlist']
        for c in legacy['captures']: c.pop('taskId', None)
        page.evaluate('([k,v])=>localStorage.setItem(k,v)', [STORE, json.dumps(legacy)]); page.reload()
        d = S(page)
        assert not any('blockedBy' in t for t in d['tasks'])
        assert any(r['from'] == 'market-shortlist' and r['to'] == 'locations-site' and r['kind'] == 'blocks' and r['confirmed'] for r in d['relationships'])
        assert all('id' in r and r['confirmed'] is True for r in d['relationships'])
        assert next(c for c in d['captures'] if c['id'] == 'original-16')['taskId'] == 'locations-site'
        assert '3 blocked' in status(page)
        nav(page, 'map')
        def add_rel(frm, to, kind='blocks', suggestion=False):
            page.locator('[data-add-relationship]').click(); f = page.locator('#relationship-form')
            f.locator('[name=from]').select_option(frm); f.locator('[name=to]').select_option(to); f.locator('[name=kind]').select_option(kind)
            if suggestion: f.locator('[name=suggestion]').check()
            f.locator('button[type=submit]').click()
        open_stream(page, w, 'partners')
        add_rel('hiring-backend', 'hiring-process'); assert 'loop' in page.locator('#relationship-error').inner_text(); page.keyboard.press('Escape')
        page.locator('[data-add-relationship]').click(); f = page.locator('#relationship-form')
        f.locator('[name=from]').select_option('hiring'); f.locator('[name=to]').select_option('hiring'); f.locator('button[type=submit]').click()
        assert 'itself' in page.locator('#relationship-error').inner_text(); page.keyboard.press('Escape')
        n0 = len(S(page)['relationships']); b0 = page.evaluate("document.querySelectorAll('.pill.red').length")
        add_rel('hiring-backend', 'seo-base', 'blocks', True)
        d = S(page); assert len(d['relationships']) == n0 + 1 and d['relationships'][-1]['confirmed'] is False
        nav(page, 'focus'); assert '3 blocked' in status(page), 'a suggestion must not count as blocked'
        nav(page, 'map'); open_stream(page, w, 'partners')
        page.locator('[data-rel-confirm]').first.click(); assert S(page)['relationships'][-1]['confirmed'] is True
        page.locator('[data-rel-remove]').last.click(); assert len(S(page)['relationships']) == n0
        # ---- decisions: new, edit, options, evidence, resolve with chosen option, log, follow-up
        nav(page, 'decisions')
        page.locator('[data-new-decision]').click(); page.locator('#decision-form [name=name]').fill('Which CRM should we use?'); page.locator('#decision-form button[type=submit]').click()
        page.locator('[data-edit-decision]').click(); page.locator('#decision-form [name=name]').fill('Which CRM do we use?'); page.locator('#decision-form button[type=submit]').click()
        for o in ['HubSpot', 'Pipedrive']:
            page.locator('[data-add-option]').click(); page.locator('#option-form [name=option]').fill(o); page.locator('#option-form button[type=submit]').click()
        page.locator('[data-edit-option]').nth(1).click(); page.locator('#option-edit-form [name=option]').fill('Pipedrive CRM'); page.get_by_role('button', name='Save option').click()
        page.get_by_label('Evidence', exact=True).fill('HubSpot free tier checked'); page.reload()
        assert page.get_by_label('Evidence', exact=True).input_value() == 'HubSpot free tier checked'
        dec = S(page)['decisions'][-1]; assert dec['options'] == ['HubSpot', 'Pipedrive CRM'] and dec['status'] == 'open'
        # a confirmed block from this decision to a task: resolving only SUGGESTS follow-up
        data0 = S(page); data0['relationships'].append({'id': 'rel-test', 'from': dec['id'], 'to': 'seo-base', 'kind': 'blocks', 'description': '', 'confirmed': True, 'source': 'user'})
        page.evaluate('([k,v])=>localStorage.setItem(k,v)', [STORE, json.dumps(data0)]); page.reload()
        tasks0 = json.dumps(S(page)['tasks']); focus0 = json.dumps(S(page)['focusAssignments'])
        page.locator('[data-resolve]').click(); page.locator('[data-resolve-option]').select_option('HubSpot')
        assert page.locator('#resolve-form [name=conclusion]').input_value() == 'HubSpot'
        page.locator('#resolve-form [name=rationale]').fill('Cheapest to start'); page.get_by_role('button', name='Confirm decision').click()
        dec = S(page)['decisions'][-1]
        assert dec['status'] == 'resolved' and dec['chosenOption'] == 'HubSpot' and dec['rationale'] == 'Cheapest to start' and dec['resolvedAt']
        assert 'Suggested follow-up' in page.locator('.followup').inner_text() and 'nothing' in page.locator('.followup').inner_text().lower() or 'Nothing has been changed' in page.locator('.followup').inner_text()
        assert json.dumps(S(page)['tasks']) == tasks0 and json.dumps(S(page)['focusAssignments']) == focus0, 'resolving must not change work or Now'
        page.locator('[data-edit-option]').first.click(); page.locator('[data-remove-option]').click()
        assert 'chosen option' in page.locator('#option-error').inner_text(), page.locator('#modal-root').inner_text(); page.keyboard.press('Escape')
        page.get_by_role('button', name='Reopen decision', exact=True).click()
        assert [l['type'] for l in S(page)['decisions'][-1]['log']] == ['created', 'edited', 'edited', 'resolved', 'reopened'], [l['type'] for l in S(page)['decisions'][-1]['log']]
        # ---- outcome completion and task edit (SEO has two steps)
        nav(page, 'map'); open_stream(page, w, 'growth'); expand(page, w, 'seo')
        page.locator('[data-edit-task="seo-base"]').click(); page.locator('#task-edit-form [name=name]').fill('Audit on-page SEO'); page.get_by_role('button', name='Save step').click()
        assert next(t for t in S(page)['tasks'] if t['id'] == 'seo-base')['name'] == 'Audit on-page SEO'
        page.locator('[data-edit-task="seo-base"]').click(); page.locator('[data-task-move=down]').click()
        order = [t['id'] for t in S(page)['tasks'] if t['outcome'] == 'seo']; assert order == ['seo-images', 'seo-base'], order
        page.keyboard.press('Escape')
        page.locator('[data-edit-task="seo-images"]').click(); page.locator('#task-edit-form [name=outcome]').select_option('reviews'); page.get_by_role('button', name='Save step').click()
        assert next(t for t in S(page)['tasks'] if t['id'] == 'seo-images')['outcome'] == 'reviews'
        page.locator('[data-edit-task="seo-base"]').click(); page.locator('[data-task-archive]').click()
        assert page.locator('[data-edit-task="seo-base"]').count() == 0 and page.locator('[data-restore-task="seo-base"]').count() == 1
        page.locator('[data-restore-task="seo-base"]').click()
        page.locator('[data-task-check="seo-base"]').filter(visible=True).first.click()
        page.get_by_role('heading', name='All steps are done').wait_for()
        page.get_by_role('button', name='Not yet').click()
        assert next(o for o in S(page)['outcomes'] if o['id'] == 'seo').get('doneAt') is None, 'finishing all steps must not complete the outcome'
        # complete a Now outcome by confirmation: frees the slot, nothing moves in
        nav(page, 'map'); open_stream(page, w, 'foundation'); expand(page, w, 'registration')
        nowb = now_ids(S(page)); assert 'registration' in nowb
        page.locator('[data-complete-outcome="registration"]').click(); page.locator('[data-confirm-complete="registration"]').click()
        d = S(page); assert next(o for o in d['outcomes'] if o['id'] == 'registration')['doneAt'] and 'registration' not in now_ids(d)
        assert len(now_ids(d)) == len(nowb) - 1, 'no replacement is auto-filled'
        nav(page, 'focus'); assert 'slot is open' in page.locator('.mission-suggest').inner_text()
        nav(page, 'map'); open_stream(page, w, 'foundation'); expand(page, w, 'registration')
        page.locator('[data-reopen-outcome="registration"]').click()
        assert next(o for o in S(page)['outcomes'] if o['id'] == 'registration')['doneAt'] is None
        assert not errors, errors
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (w, 'overflow')
        ctx.close(); print(f'PASS {w}px: nav, status/badges, Next & Later, engine, dependencies, decisions, completion, task edit')
    browser.close()
