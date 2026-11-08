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
    WK = os.environ.get('BROWSER') == 'webkit'   # BROWSER=webkit runs it in Safari's engine
    b = p.webkit.launch() if WK else p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    for w in ([int(x) for x in os.environ['W'].split(',')] if os.environ.get('W') else [320, 375, 390, 430, 768, 1024, 1280, 1440]):
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', **({'has_touch': True, 'is_mobile': True} if (w < 761 and WK) else {})); page = ctx.new_page(); errors = []
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
        page.keyboard.press('Escape'); page.wait_for_timeout(150)
        if page.get_by_role('heading', name='All steps are done').count(): page.get_by_role('button', name='Not yet').click()   # leaving Focus Mode on a finished outcome asks again; it never decides
        expect(page.get_by_role('dialog')).to_have_count(0)
        # completion by confirmation frees the slot; delete folder asks where things go
        nav(page, 'map'); blk = outcome_block(page, w, 'Plan reunion'); blk.get_by_role('button', name='Mark outcome done…').click(); page.get_by_role('button', name='Yes, it’s done').click()
        d = S(page); assert next(o for o in d['outcomes'] if o['name'] == 'Plan reunion')['done_at'] and len([f for f in d['focus'] if f['lane'] == 'now']) == 2
        page.get_by_role('button', name='Delete folder').click(); expect(page.locator('#modal-root .helper')).to_contain_text('Nothing is deleted with the folder')
        page.get_by_role('button', name='Delete folder').last.click()
        assert S(page)['folders'] == [] and len(S(page)['outcomes']) == 5
        # AI Review (a simulation): duplicates are proposed, merge keeps both, undo restores, reject is remembered, not now keeps it
        cap(page, 'Order balloons for the party'); cap(page, 'Order the balloons for party'); nav(page, 'review')
        def card(text): return page.locator('.review-item').filter(has=page.locator('.review-original', has_text=text))
        expect(card('Order balloons')).to_contain_text('Possible duplicate')
        card('Order balloons').get_by_role('button', name='Preview merge').click(); expect(page.locator('#modal-root')).to_contain_text('Nothing is deleted')
        page.get_by_role('button', name='Cancel').click(); assert all(c['status'] == 'pending' for c in S(page)['captures'])
        card('Order balloons').get_by_role('button', name='Preview merge').click(); page.locator('#modal-root').get_by_role('button', name='Merge', exact=True).click()
        page.get_by_role('heading', name='Where does this step go?').wait_for(); page.locator('#modal-root').get_by_role('button', name='Approve', exact=True).click()
        d = S(page); ca = next(c for c in d['captures'] if c['text'] == 'Order balloons for the party'); cb = next(c for c in d['captures'] if c['text'] == 'Order the balloons for party')
        assert cb['merged_into'] == ca['id'] and ca['organized_as'] == 'Task' and sorted(next(t for t in d['tasks'] if t['name'] == 'Order balloons for the party')['sources']) == sorted([ca['id'], cb['id']])
        page.get_by_role('button', name='Undo approval: Order balloons for the party').click()
        d = S(page); assert not any(t['name'].startswith('Order balloons') for t in d['tasks']) and all(c['status'] == 'pending' for c in d['captures'] if c['text'].startswith('Order'))
        card('Order balloons').get_by_role('button', name='Reject').click(); expect(card('Order balloons')).to_have_count(0)
        page.get_by_role('button', name='Review again: Order balloons for the party').click()
        expect(card('Order balloons')).to_contain_text('rejected this exact suggestion'); expect(card('Order balloons').get_by_role('button', name='Approve & organize')).to_be_disabled()
        card('Order balloons').locator('select').first.select_option('Idea'); expect(card('Order balloons').get_by_role('button', name='Approve & organize')).to_be_enabled()
        card('Order balloons').get_by_role('button', name='Approve & organize').click(); assert len(S(page)['ideas']) == 1
        card('Order the balloons').get_by_role('button', name='Not now').click(); expect(page.locator('.review-aside', has_text='Set aside')).to_contain_text('Not now')
        page.get_by_role('button', name='Review again: Order the balloons for party').click()
        card('Order the balloons').locator('select').first.select_option('Note'); card('Order the balloons').get_by_role('button', name='Approve & organize').click()
        assert next(c for c in S(page)['captures'] if c['text'] == 'Order the balloons for party')['organized_as'] == 'Note'
        # decisions: create, options, evidence, resolve with a chosen option, dated log, reopen; nothing else changes
        nav(page, 'decisions'); page.get_by_role('button', name='New decision').click(); page.locator('#modal-root input[name=name]').fill('Which CRM?'); page.get_by_role('button', name='Add decision').click()
        for o in ['HubSpot', 'Pipedrive']:
            page.get_by_role('button', name='Add option').click(); page.locator('#modal-root input[name=option]').fill(o); page.get_by_role('button', name='Add option').last.click()
        page.get_by_role('button', name='Add option').click(); page.locator('#modal-root input[name=option]').fill(' hubspot '); page.get_by_role('button', name='Add option').last.click()
        expect(page.locator('#modal-root .form-error')).to_contain_text('already exists'); page.keyboard.press('Escape')
        page.get_by_label('Evidence', exact=True).fill('Free tier checked'); page.get_by_label('Research notes').click()
        tasks_before = json.dumps(S(page)['tasks']); focus_before = json.dumps(S(page)['focus'])
        page.get_by_role('button', name='Mark resolved').click(); page.locator('#modal-root select').select_option('HubSpot')
        assert page.locator('#modal-root input[placeholder="What did you decide?"]').input_value() == 'HubSpot'
        page.get_by_role('button', name='Confirm decision').click()
        d = S(page); dec = d['decisions'][0]
        assert dec['status'] == 'resolved' and dec['chosen_option'] == 'HubSpot' and dec['evidence'] == 'Free tier checked' and dec['resolved_at']
        assert json.dumps(d['tasks']) == tasks_before and json.dumps(d['focus']) == focus_before, 'resolving changes no work and no lanes'
        page.get_by_role('button', name='Edit option: HubSpot (chosen)').click(); page.get_by_role('button', name='Remove option').click()
        expect(page.locator('#modal-root .form-error')).to_contain_text('chosen option'); page.keyboard.press('Escape')
        page.get_by_role('button', name='Reopen decision').click()
        expect(page.locator('.decision-log li')).to_have_count(3)
        assert [l['type'] for l in sorted(S(page)['decisionLog'], key=lambda x: x['at'])] == ['created', 'resolved', 'reopened']
        # break it down: typed/pasted steps, list markers stripped, duplicates ignored; nothing created until Add
        nav(page, 'map'); pick(page, w, 'All notes')
        blk = outcome_block(page, w, 'Fix garage'); n0 = len(S(page)['tasks'])
        blk.get_by_role('button', name='Break it down').click(); expect(page.locator('#modal-root')).to_contain_text('Nothing is created until you press Add')
        page.get_by_label('Steps, one per line').fill('- Sweep the floor\n2) Sort the tools\n\nSweep the floor\nBuy shelf brackets')
        assert len(S(page)['tasks']) == n0, 'typing creates nothing'
        page.get_by_role('button', name='Add steps').click(); d = S(page); gar = next(o for o in d['outcomes'] if o['name'] == 'Fix garage')
        assert sorted(t['name'] for t in d['tasks'] if t['outcome_id'] == gar['id']) == ['Buy shelf brackets', 'Sort the tools', 'Sweep the floor']
        # a step's own estimate, then "I have 20 minutes"
        blk = outcome_block(page, w, 'Fix garage'); blk.get_by_label('Edit step: Sweep the floor').click(); page.locator('#modal-root input[name=effort]').fill('15 min'); page.get_by_role('button', name='Save step').click()
        assert next(t for t in S(page)['tasks'] if t['name'] == 'Sweep the floor')['effort'] == '15 min'
        nav(page, 'focus'); page.locator('#minutes').select_option('20'); expect(page.locator('.quick-win-result')).to_contain_text('Sweep the floor'); expect(page.locator('.quick-win-result')).to_contain_text('fits in 20')
        lanes_before = json.dumps(S(page)['focus']); page.locator('#minutes').select_option('10'); page.wait_for_timeout(100); assert json.dumps(S(page)['focus']) == lanes_before, 'a suggestion changes no lane'
        page.locator('#minutes').select_option('0')
        # ideas: create, edit, archive, restore, promote (explicit) -> an outcome in Later, idea kept archived
        nav(page, 'map'); pick(page, w, 'All notes'); page.get_by_role('button', name='Add idea').click(); page.locator('#modal-root input[name=name]').fill('Offer Spanish materials'); page.get_by_role('button', name='Save idea').click()
        mine = [i for i in S(page)['ideas'] if i['name'] == 'Offer Spanish materials']; assert len(mine) == 1 and mine[0]['folder_id'] is None and not mine[0]['archived_at']
        page.get_by_label('Edit idea: Offer Spanish materials').click(); page.locator('#modal-root input[name=name]').fill('Offer Spanish-language materials'); page.locator('#modal-root textarea[name=notes]').fill('after launch'); page.get_by_role('button', name='Save idea').click()
        page.get_by_label('Archive idea: Offer Spanish-language materials').click(); expect(page.get_by_label('Restore idea: Offer Spanish-language materials')).to_have_count(0); expect(page.get_by_label('Promote idea: Offer Spanish-language materials')).to_have_count(0)
        page.get_by_role('button', name='Show archived ideas').click(); page.get_by_label('Restore idea: Offer Spanish-language materials').click()
        n_out = len(S(page)['outcomes']); page.get_by_label('Promote idea: Offer Spanish-language materials').click(); expect(page.locator('#modal-root')).to_contain_text('never in Now'); page.get_by_role('button', name='Create the outcome').click()
        d = S(page); promoted = next(o for o in d['outcomes'] if o['name'] == 'Offer Spanish-language materials'); idea = next(i for i in d['ideas'] if i['name'] == 'Offer Spanish-language materials')
        assert len(d['outcomes']) == n_out + 1 and next(f for f in d['focus'] if f['outcome_id'] == promoted['id'])['lane'] == 'later' and idea['archived_at'] and promoted['sources'] == [idea['id']]
        # prompt after a change: resolving a decision that was holding a step up says so; "Later" is remembered
        nav(page, 'map'); pick(page, w, 'All notes'); page.get_by_role('button', name='Add relationship').click(); f = page.locator('#relationship-form') if False else page.locator('#modal-root')
        f.locator('select[name=from]').select_option(label='Which CRM?'); f.locator('select[name=to]').select_option(label='Buy shelf brackets'); f.locator('select[name=kind]').select_option('blocks'); f.get_by_role('button', name='Add relationship').click()
        nav(page, 'decisions'); page.get_by_role('button', name='Mark resolved').click(); page.locator('#modal-root input[placeholder="What did you decide?"]').fill('Use HubSpot'); page.get_by_role('button', name='Confirm decision').click()
        nav(page, 'focus'); expect(page.locator('.prompt-card', has_text='Which CRM?')).to_contain_text('Nothing was changed')
        tasks_before = json.dumps(S(page)['tasks']); page.locator('.prompt-card', has_text='Which CRM?').get_by_role('button', name='Later').click()
        expect(page.locator('.prompt-card', has_text='Which CRM?')).to_have_count(0); assert json.dumps(S(page)['tasks']) == tasks_before; page.reload()
        page.locator('.mission-extras').wait_for(); expect(page.locator('.prompt-card', has_text='Which CRM?')).to_have_count(0)
        # weekly review: optional, real numbers, skipping/finishing hides it for the week
        expect(page.locator('.prompt-card', has_text='weekly review')).to_have_count(1); page.get_by_role('button', name='Open').click()
        expect(page.locator('#modal-root')).to_contain_text('Still open'); expect(page.locator('#modal-root')).to_contain_text('captured'); page.get_by_role('button', name='Done').click()
        expect(page.locator('.prompt-card', has_text='weekly review')).to_have_count(0); page.reload(); page.locator('.mission-extras').wait_for(); expect(page.locator('.prompt-card', has_text='weekly review')).to_have_count(0)
        # persistence: a reload keeps everything
        before = S(page); page.reload(); nav(page, 'inbox'); expect(page.locator('.raw-row')).to_have_count(6); assert S(page)['outcomes'] == before['outcomes']
        # search: plain matching across kinds; picking a result goes there
        page.locator('[aria-label="Search"], .sidebar-search:has-text("Search")').filter(visible=True).first.click()
        page.get_by_label('Search all work').fill('reunion'); expect(page.locator('.search-result').first).to_contain_text('Plan reunion')
        page.get_by_label('Search all work').fill('zzzz'); expect(page.locator('#modal-root')).to_contain_text('No matches found')
        page.get_by_label('Search all work').fill('reunion'); page.locator('.search-result', has_text='Outcome').first.click()
        expect(page.get_by_role('heading', name='Map', exact=True)).to_be_visible()
        # restore / import: the prototype's own export, previewed first, added without touching what is there
        (page.get_by_role('button', name='Settings') if not mobile else page.get_by_role('button', name='Account and settings')).filter(visible=True).first.click()
        page.get_by_label('Backup file').set_input_files(os.path.join(os.path.dirname(__file__), '..', 'docs', 'baseline-example.json'))
        expect(page.locator('#modal-root')).to_contain_text('from the old prototype'); expect(page.locator('#modal-root')).to_contain_text('18 captures')
        n_before = len(S(page)['captures']); o_before = len(S(page)['outcomes']); page.get_by_role('button', name='Cancel').click(); assert len(S(page)['captures']) == n_before, 'a preview changes nothing'
        page.get_by_label('Backup file').set_input_files(os.path.join(os.path.dirname(__file__), '..', 'docs', 'baseline-example.json'))
        page.get_by_role('button', name='Add to my workspace').click(); page.wait_for_timeout(200)
        d = S(page); assert len(d['captures']) == n_before + 18 and len(d['outcomes']) == o_before + 12 and len([f for f in d['focus'] if f['lane'] == 'now']) <= 3
        assert any(c['text'] == 'Register the business in NYC' for c in d['captures']) and all(c['owner_id'] == 'local' for c in d['captures'])
        page.keyboard.press('Escape')
        # accessibility and layout
        if os.environ.get('AXE_PATH'):
            for r in ['focus', 'inbox', 'map', 'decisions', 'review']:
                nav(page, r); page.add_script_tag(path=os.environ['AXE_PATH']); v = page.evaluate(RUN)['violations']; assert not v, (r, [(x['id'], [n['target'] for n in x['nodes']]) for x in v])
        for r in ['focus', 'inbox', 'review', 'map', 'decisions']:
            nav(page, r); assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (w, r)
        assert not errors, errors
        ctx.close(); print(f'PASS {w}px: new app: empty start, capture, folders, outcomes, Now cap, steps, engine, lanes, Focus Mode, completion, folder delete, persistence, axe')
    b.close()
