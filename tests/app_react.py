"""The new React app (web/), in local mode. Start it with `npx vite --port 5173` and set EXE_CHROMIUM."""
import os
import json
from playwright.sync_api import sync_playwright, expect
URL = 'http://127.0.0.1:5173/?local=1'
KEY = 'exe-v2:local'
def S(page):
    page.wait_for_timeout(80)   # let the save chain flush
    return json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
def nav(page, route): page.locator(f'[data-nav="{route}"]').filter(visible=True).first.click()
def cap(page, text):
    page.locator('.mobile-capture, .top-capture').filter(visible=True).last.click(); page.get_by_label('Capture text').fill(text); page.locator('.modal-sheet button[type=submit]').click()
def status(page):
    page.locator('#status-line').wait_for(); page.wait_for_timeout(80)
    return ' '.join(page.locator('#status-line').inner_text().split())
def pick(page, w, label):
    if w < 761:
        row = page.locator('.stream-row', has_text=label)
        if not row.is_visible(): page.locator('.stream-row.active').click()
    page.locator('.stream-row', has_text=label).first.click()
def outcome_block(page, w, name):
    blk = page.locator('.outcome-block', has=page.locator('h3', has_text=name))
    if w < 761 and 'open' not in (blk.get_attribute('class') or ''): blk.locator('.outcome-top').click()
    return blk
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    for w in ([int(x) for x in os.environ['W'].split(',')] if os.environ.get('W') else [320, 375, 390, 430, 768, 1024, 1280, 1440]):
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce'); page = ctx.new_page(); errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and '404' not in m.text else None)
        page.goto(URL); page.evaluate('localStorage.clear()'); page.reload()
        mobile = w < 761
        # empty first run
        assert status(page) == 'Nothing here yet.' and page.get_by_role('heading', name='Nothing here yet').count() == 1
        labels = [t.strip() for t in (page.locator('.mobile-dock small') if mobile else page.locator('.sidebar-menu .nav-link span')).all_inner_texts() if t.strip()]
        assert labels == ['Focus', 'Inbox', 'AI Review', 'Map', 'Decisions'], labels
        # capture: a list splits, the badge shows, raw completion touches nothing else
        cap(page, 'Call the plumber\nBook flights\nRenew passport'); nav(page, 'inbox')
        expect(page.locator('.raw-row')).to_have_count(3); assert 'Renew passport' in page.locator('.raw-row').first.inner_text()      # newest first
        first = page.locator('.raw-row input[type=checkbox]').first; first.check()
        d = S(page); assert sum(1 for c in d['captures'] if c['completed_at']) == 1 and d['tasks'] == []
        page.locator('.inbox-filters button', has_text='Done').click(); expect(page.locator('.raw-row')).to_have_count(1)
        page.locator('.inbox-filters button', has_text='All').click()
        # folders and outcomes
        nav(page, 'map'); page.get_by_role('button', name='New folder').click(); page.locator('#modal-root input[name=name]').fill('Home'); page.get_by_role('button', name='Create folder').click()
        for name in ['Plan reunion', 'Fix garage', 'Book venue', 'Clean attic', 'Sort photos']:
            page.get_by_role('button', name='Add outcome').click(); page.locator('#modal-root input[name=name]').fill(name); page.locator('#modal-root button[type=submit]').click()
        assert len(S(page)['outcomes']) == 5 and all(o['folder_id'] for o in S(page)['outcomes'])
        for name in ['Plan reunion', 'Fix garage', 'Book venue']:
            outcome_block(page, w, name).get_by_role('button', name='Make active').click()
        assert len([f for f in S(page)['focus'] if f['lane'] == 'now']) == 3
        outcome_block(page, w, 'Clean attic').get_by_role('button', name='Make active').click()
        page.get_by_role('heading', name='Keep focus to three').wait_for(); page.keyboard.press('Escape')
        assert len([f for f in S(page)['focus'] if f['lane'] == 'now']) == 3, 'a 4th Now is never allowed'
        # steps: add, check, finishing the last asks (never decides)
        blk = outcome_block(page, w, 'Plan reunion')
        for step in ['Pick a date', 'Send invites']:
            blk.get_by_role('button', name='Add step').click(); page.locator('#modal-root input[name=task]').fill(step); page.locator('#modal-root button[type=submit]').click()
        blk = outcome_block(page, w, 'Plan reunion'); blk.get_by_label('Mark Pick a date complete').check(); blk.get_by_label('Mark Send invites complete').check()
        page.get_by_role('heading', name='All steps are done').wait_for()
        page.get_by_role('button', name='Not yet').click(); assert next(o for o in S(page)['outcomes'] if o['name'] == 'Plan reunion')['done_at'] is None
        # Focus: the current priority, progress from real steps, the state line
        nav(page, 'focus'); assert status(page).startswith('1 current focus of up to 3 active.') and '3 awaiting AI Review' in status(page)
        assert page.locator('.priority-hero').count() == 1 and page.locator('.priority-mini').filter(has_text='Fix garage').count() + page.locator('.priority-mini').filter(has_text='Book venue').count() >= 1
        # Priority Engine: pin a non-Now outcome -> suggestion, nothing changes until applied
        nav(page, 'map'); outcome_block(page, w, 'Sort photos').get_by_role('button', name='Pin as priority').click()
        nav(page, 'focus'); expect(page.locator('.suggest-card')).to_contain_text('You pinned it.')
        now_before = sorted(f['outcome_id'] for f in S(page)['focus'] if f['lane'] == 'now')
        page.get_by_role('button', name='Ignore').click(); expect(page.locator('.suggest-card')).to_have_count(0); assert S(page)['settings']['priority_dismissed']
        nav(page, 'map'); outcome_block(page, w, 'Sort photos').get_by_role('button', name='Edit outcome').click(); page.locator('#modal-root input[name=effort]').fill('2 hours'); page.get_by_role('button', name='Save details').click()
        nav(page, 'focus'); page.locator('.mission-suggest').wait_for(); expect(page.locator('.suggest-card')).to_have_count(0)
        nav(page, 'map'); outcome_block(page, w, 'Sort photos').get_by_role('button', name='Edit outcome').click(); page.locator('#modal-root input[name=deadline]').fill('2027-01-15'); page.get_by_role('button', name='Save details').click()
        nav(page, 'focus'); expect(page.locator('.suggest-card')).to_have_count(1)
        assert sorted(f['outcome_id'] for f in S(page)['focus'] if f['lane'] == 'now') == now_before
        page.get_by_role('button', name='Apply…').click(); expect(page.locator('#modal-root')).to_contain_text('NOW, BEFORE'); page.get_by_role('button', name='Apply change').click()
        d = S(page); sp = next(o for o in d['outcomes'] if o['name'] == 'Sort photos')
        assert {'now'} == {f['lane'] for f in d['focus'] if f['outcome_id'] == sp['id']} and len([f for f in d['focus'] if f['lane'] == 'now']) == 3
        # Next & Later screen
        page.locator('.lanes-link').click(); expect(page.get_by_role('heading', name='Next & Later')).to_have_count(1); expect(page.locator('.lane-item')).to_have_count(2)
        page.get_by_role('button', name='Back to Focus').click()
        # Focus Mode: capture opens over it and returns to it
        page.get_by_role('button', name='Enter Focus Mode').click(); page.get_by_role('dialog', name='Focus Mode').wait_for()
        page.get_by_role('button', name='Capture thought').click(); page.get_by_label('Capture text').fill('Interruption'); page.locator('.modal-sheet button[type=submit]').click()
        page.get_by_role('dialog', name='Focus Mode').wait_for(); assert any(c['text'] == 'Interruption' for c in S(page)['captures'])
        page.keyboard.press('Escape'); assert page.get_by_role('dialog').count() == 0
        # completion by confirmation frees the slot; delete folder asks where things go
        nav(page, 'map'); blk = outcome_block(page, w, 'Plan reunion'); blk.get_by_role('button', name='Mark outcome done…').click(); page.get_by_role('button', name='Yes, it’s done').click()
        d = S(page); assert next(o for o in d['outcomes'] if o['name'] == 'Plan reunion')['done_at'] and len([f for f in d['focus'] if f['lane'] == 'now']) == 2
        page.get_by_role('button', name='Delete folder').click(); expect(page.locator('#modal-root .helper')).to_contain_text('Nothing is deleted with the folder')
        page.get_by_role('button', name='Delete folder').last.click()
        assert S(page)['folders'] == [] and len(S(page)['outcomes']) == 5
        # persistence: a reload keeps everything
        before = S(page); page.reload(); nav(page, 'inbox'); expect(page.locator('.raw-row')).to_have_count(4); assert S(page)['outcomes'] == before['outcomes']
        # accessibility and layout
        if os.environ.get('AXE_PATH'):
            for r in ['focus', 'inbox', 'map']:
                nav(page, r); page.add_script_tag(path=os.environ['AXE_PATH']); v = page.evaluate(RUN)['violations']; assert not v, (r, [(x['id'], [n['target'] for n in x['nodes']]) for x in v])
        for r in ['focus', 'inbox', 'review', 'map', 'decisions']:
            nav(page, r); assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (w, r)
        assert not errors, errors
        ctx.close(); print(f'PASS {w}px: new app: empty start, capture, folders, outcomes, Now cap, steps, engine, lanes, Focus Mode, completion, folder delete, persistence, axe')
    b.close()
