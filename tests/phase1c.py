"""Folders (DEC-001) and the empty first run (DEC-002). Serve the repo on :8000 and set EXE_CHROMIUM."""
import os
import json
from playwright.sync_api import sync_playwright
STORE = 'exe-v1-local-workspace'
def S(page): return json.loads(page.evaluate(f"localStorage.getItem('{STORE}')"))
def nav(page, route): page.locator(f'[data-nav="{route}"]').filter(visible=True).first.click()
def pick(page, w, stream):
    if w < 761 and not page.locator(f'[data-stream="{stream}"]').is_visible(): page.locator('[data-picker] .active').click()
    page.locator(f'[data-stream="{stream}"]').click()
def expand(page, w, outcome):
    if w < 761:
        h = page.locator(f'[data-toggle-outcome="{outcome}"]')
        if h.get_attribute('aria-expanded') != 'true': h.click()
def cap(page, text):
    page.locator('[data-capture]').filter(visible=True).last.click(); page.get_by_label('Capture text').fill(text); page.locator('#capture-form button[type=submit]').click()
def new_folder(page, name):
    page.locator('[data-new-folder]').click(); page.locator('#folder-form [name=name]').fill(name); page.locator('#folder-form button[type=submit]').click()
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    for w in [320, 375, 390, 430, 768, 1024, 1280, 1440]:
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce'); page = ctx.new_page(); errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:8000/'); page.evaluate('localStorage.clear()'); page.reload()
        # ---- empty first run: nothing the owner tested with is shown to a regular user
        d = S(page); assert d['example'] is False and all(not d[k] for k in ['workstreams', 'outcomes', 'tasks', 'decisions', 'ideas', 'captures', 'relationships', 'focusAssignments'])
        assert ' '.join(page.locator('#status-line').inner_text().split()) == 'Nothing here yet.'
        assert 'Acme' not in page.locator('body').inner_text() and 'Acme' not in page.content().split('<script src')[0].split('</head>')[-1]
        assert page.locator('.empty-state h2').inner_text() == 'Nothing here yet'
        for r in ['inbox', 'review', 'map', 'decisions', 'focus']:
            nav(page, r); assert 'Acme' not in page.locator('#view').inner_text() and page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        nav(page, 'inbox'); assert 'Nothing captured yet' in page.locator('.raw-list').inner_text()
        nav(page, 'map'); assert page.locator('[data-stream]').count() == 1 and 'No outcomes here yet' in page.locator('.map-detail').inner_text()
        if os.environ.get('AXE_PATH'):
            page.add_script_tag(path=os.environ['AXE_PATH']); assert not page.evaluate(RUN)['violations']
        # ---- folders: create, rename, outcomes, filing
        new_folder(page, 'Home'); new_folder(page, 'Work')
        ids = {f['name']: f['id'] for f in S(page)['workstreams']}; assert set(ids) == {'Home', 'Work'}
        pick(page, w, ids['Home']); page.locator(f'[data-rename-folder="{ids["Home"]}"]').click(); page.locator('#folder-form [name=name]').fill('Home life'); page.locator('#folder-form button[type=submit]').click()
        assert next(f for f in S(page)['workstreams'] if f['id'] == ids['Home'])['name'] == 'Home life'
        page.locator(f'[data-add-outcome="{ids["Home"]}"]').click(); page.locator('#outcome-new-form [name=name]').fill('Plan the family reunion'); page.locator('#outcome-new-form [name=description]').fill('Venue, date and invites are settled')
        page.locator('#outcome-new-form button[type=submit]').click()
        d = S(page); o = d['outcomes'][0]; assert o['stream'] == ids['Home'] and [a for a in d['focusAssignments'] if a['outcome'] == o['id']] == [{'outcome': o['id'], 'lane': 'later'}]
        pick(page, w, 'all'); page.locator('[data-add-outcome="all"]').click(); page.locator('#outcome-new-form [name=name]').fill('Something unfiled'); page.locator('#outcome-new-form button[type=submit]').click()
        assert S(page)['outcomes'][1]['stream'] == '' and 'Something unfiled' in page.locator('.map-detail').inner_text() and 'Plan the family reunion' in page.locator('.map-detail').inner_text()
        # a decision filed in Home, a capture filed in Home
        nav(page, 'decisions'); page.locator('[data-new-decision]').click(); page.locator('#decision-form [name=name]').fill('Which weekend?'); page.locator('#decision-form [name=stream]').select_option(ids['Home']); page.locator('#decision-form button[type=submit]').click()
        assert S(page)['decisions'][0]['stream'] == ids['Home']
        cap(page, 'Email Aunt May about the reunion'); nav(page, 'inbox')
        cid = S(page)['captures'][0]['id']; assert S(page)['captures'][0].get('folder', '') == ''
        page.locator(f'[data-row-more="{cid}"]').click(); page.locator(f'[data-file-capture="{cid}"]').select_option(ids['Home']); assert S(page)['captures'][0]['folder'] == ids['Home']
        nav(page, 'map'); pick(page, w, ids['Home']); assert 'Email Aunt May' in page.locator('.map-detail').inner_text()
        pick(page, w, 'all'); assert 'Email Aunt May' not in page.locator('.map-detail').inner_text()
        # ---- delete a folder that holds items: never silent, nothing lost, user chooses the destination
        pick(page, w, ids['Home']); page.locator(f'[data-delete-folder="{ids["Home"]}"]').click()
        msg = page.locator('#modal-root .helper').inner_text(); assert '1 outcome' in msg and '1 decision' in msg and '1 capture' in msg and 'Nothing is deleted' in msg
        before = {k: len(S(page)[k]) for k in ['outcomes', 'decisions', 'captures', 'tasks']}
        page.locator('#folder-delete-form [name=to]').select_option(ids['Work']); page.locator('#folder-delete-form button[type=submit]').click()
        d = S(page); assert ids['Home'] not in [f['id'] for f in d['workstreams']] and {k: len(d[k]) for k in before} == before
        assert d['outcomes'][0]['stream'] == ids['Work'] and d['decisions'][0]['stream'] == ids['Work'] and d['captures'][0]['folder'] == ids['Work'] and d['audit'][-1]['type'] == 'folder-delete'
        pick(page, w, ids['Work']); page.locator(f'[data-delete-folder="{ids["Work"]}"]').click(); page.locator('#folder-delete-form [name=to]').select_option(''); page.locator('#folder-delete-form button[type=submit]').click()
        d = S(page); assert d['workstreams'] == [] and d['outcomes'][0]['stream'] == '' and d['captures'][0]['folder'] == ''
        new_folder(page, 'Empty one'); fid = S(page)['workstreams'][0]['id']; page.locator(f'[data-delete-folder="{fid}"]').click()
        assert 'is empty' in page.locator('#modal-root .helper').inner_text() and page.locator('#folder-delete-form [name=to]').count() == 0
        page.locator('#folder-delete-form button[type=submit]').click(); assert S(page)['workstreams'] == []
        # ---- AI Review (simulation): a Task with no outcome stays loose; no silent 'Unsorted work'
        cap(page, 'Buy balloons'); nav(page, 'review')
        card = page.locator('.review-item').filter(has_text='Buy balloons'); card.locator('[data-review-field=type]').select_option('Task'); card.locator('[data-approve]').click(); page.locator('#placement-form [name=choice]').select_option('loose'); page.locator('#placement-form button[type=submit]').click()
        d = S(page); assert not any(o['name'] == 'Unsorted work' for o in d['outcomes'])
        t = next(t for t in d['tasks'] if t['name'] == 'Buy balloons'); assert t['outcome'] == '' and next(c for c in d['captures'] if c['text'] == 'Buy balloons')['taskId'] == t['id']
        nav(page, 'map'); pick(page, w, 'all'); assert 'Steps with no outcome' in page.locator('.map-detail').inner_text()
        page.locator(f'[data-edit-task="{t["id"]}"]').click(); page.locator('#task-edit-form [name=outcome]').select_option(d['outcomes'][0]['id']); page.get_by_role('button', name='Save step').click()
        assert next(x for x in S(page)['tasks'] if x['id'] == t['id'])['outcome'] == d['outcomes'][0]['id']
        # ---- outcome edit: name, definition of done, folder
        new_folder(page, 'Garden'); gid = S(page)['workstreams'][0]['id']; pick(page, w, 'all'); expand(page, w, d['outcomes'][0]['id'])
        page.locator(f'[data-edit-outcome="{d["outcomes"][0]["id"]}"]').click(); f = page.locator('#outcome-form'); f.locator('[name=name]').fill('Plan the reunion'); f.locator('[name=stream]').select_option(gid); page.get_by_role('button', name='Save details').click()
        o = S(page)['outcomes'][0]; assert o['name'] == 'Plan the reunion' and o['stream'] == gid and o['description'] == 'Venue, date and invites are settled'
        # ---- workspace name comes from the user; no example reset for a regular user
        if w > 760:
            page.locator('.workspace-switch').filter(visible=True).click(); assert page.get_by_role('button', name='Reset to initial Acme example').count() == 0
            page.locator('#workspace-name-form [name=name]').fill('Taylor home'); page.get_by_role('button', name='Save name').click()
            assert S(page)['workspaceName'] == 'Taylor home' and page.locator('.workspace-switch strong').inner_text() == 'Taylor home'; page.keyboard.press('Escape')
        # ---- ?example=1 never overwrites real data, and fills an empty workspace
        page.goto('http://127.0.0.1:8000/?example=1'); assert len(S(page)['captures']) >= 2 and S(page)['example'] is False
        page.evaluate('localStorage.clear()'); page.reload(); d = S(page); assert d['example'] is True and len(d['captures']) == 18 and d['workspaceName'] == 'Acme Workspace'
        assert not errors, errors
        ctx.close(); print(f'PASS {w}px: empty first run, folders (create/rename/delete/move), All notes, filing, loose steps, outcome edit, workspace name, ?example=1')
    b.close()
