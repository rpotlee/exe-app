"""New app, extra checks: keyboard + safe areas, a large workspace, accessibility with dialogs open, and screenshots.
Needs the dev server on :5173, EXE_CHROMIUM, AXE_PATH. BROWSER=webkit skips the Chromium-only safe-area check."""
import os, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
URL = 'http://127.0.0.1:5173/?local=1'; KEY = 'exe-v2:local'
OUT = Path(__file__).resolve().parents[1] / 'docs/screenshots/new-app'; OUT.mkdir(parents=True, exist_ok=True)
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
NOW = '2027-01-01T00:00:00.000Z'
def uid(n): return f'00000000-0000-4000-8000-{n:012d}'
def big():
    base = lambda i: {'id': uid(i), 'owner_id': 'local', 'created_at': NOW, 'updated_at': NOW, 'revision': 1}
    ws = {k: [] for k in ['folders', 'outcomes', 'focus', 'tasks', 'captures', 'decisions', 'decisionOptions', 'decisionLog', 'ideas', 'relationships']}; ws['settings'] = None
    n = 1
    for f in range(20):
        ws['folders'].append({**base(n), 'name': f'Folder {f}', 'description': '', 'icon': 'folder', 'position': f}); fid = uid(n); n += 1
        for o in range(15):
            ws['outcomes'].append({**base(n), 'folder_id': fid, 'name': f'Outcome {f}-{o} about pricing and plans', 'description': 'Definition of done', 'pinned': False, 'deadline': None, 'effort': None, 'done_at': None, 'last_worked_at': None, 'sources': []}); oid = uid(n); n += 1
            ws['focus'].append({**base(n), 'outcome_id': oid, 'lane': 'now' if len([x for x in ws['focus'] if x['lane'] == 'now']) < 3 else ('next' if o % 2 else 'later'), 'position': n}); n += 1
            for t in range(5):
                ws['tasks'].append({**base(n), 'outcome_id': oid, 'name': f'Step {t} of {f}-{o}', 'notes': '', 'done_at': None, 'archived_at': None, 'deadline': None, 'effort': None, 'position': t, 'sources': []}); n += 1
    for c in range(2000):
        ws['captures'].append({**base(n), 'text': f'Captured thought number {c} about pricing, plumber and venue', 'edited_text': None, 'source': 'Inbox', 'folder_id': None, 'batch_id': None, 'batch_text': None, 'completed_at': None, 'archived_at': None, 'status': 'organized' if c % 3 else 'pending', 'organized_as': None, 'review_state': None, 'review_at': None, 'rejected_fingerprints': [], 'task_id': None, 'merged_into': None}); n += 1
    for d in range(200):
        ws['decisions'].append({**base(n), 'folder_id': None, 'name': f'Decision {d}?', 'description': '', 'status': 'open', 'evidence': '', 'notes': '', 'chosen_option': '', 'conclusion': '', 'rationale': '', 'resolved_at': None, 'sources': []}); n += 1
    return ws
with sync_playwright() as p:
    WK = os.environ.get('BROWSER') == 'webkit'
    b = p.webkit.launch() if WK else p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    # ---- keyboard and safe areas (phone)
    for w in [320, 390, 430]:
        ctx = b.new_context(viewport={'width': w, 'height': 800}, reduced_motion='reduce', **({'has_touch': True, 'is_mobile': True} if WK else {})); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(URL); pg.evaluate('localStorage.clear()'); pg.reload()
        if not WK:
            cdp = ctx.new_cdp_session(pg); cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {'top': 20, 'bottom': 34, 'left': 0, 'right': 0}})
            assert float(pg.locator('.mobile-dock').evaluate('e=>parseFloat(getComputedStyle(e).bottom)')) == 46, 'dock sits above the home indicator'
        pg.locator('.dock-capture').click(); pg.get_by_label('Capture text').fill('Typing with the keyboard open')
        pg.set_viewport_size({'width': w, 'height': 380})                       # the on-screen keyboard leaves little room
        save = pg.locator('.modal-sheet button[type=submit]'); save.scroll_into_view_if_needed(); box = save.bounding_box()
        assert box and box['y'] >= 0 and box['y'] + box['height'] <= 380, ('Save must stay reachable with the keyboard open', box)
        save.click(); pg.set_viewport_size({'width': w, 'height': 800}); pg.locator('[data-nav=inbox]').filter(visible=True).first.click()
        expect(pg.locator('.raw-row')).to_have_count(1)
        dock = pg.locator('.mobile-dock').bounding_box(); plus = pg.locator('.dock-capture').bounding_box()
        cx = plus['x'] + plus['width'] / 2; assert abs(cx - (dock['x'] + dock['width'] / 2)) <= 2 and plus['width'] >= 44 and dock['x'] >= 0 and dock['x'] + dock['width'] <= w   # the + is centered in the dock (revamp)
        assert not errs, errs; ctx.close(); print(f'PASS {w}px keyboard-open capture, safe-area dock, + centered in the dock')
    # ---- a large workspace stays fast
    ws = big(); sizes = {k: len(v) for k, v in ws.items() if isinstance(v, list)}
    for w in [390, 1280]:
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce'); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', arguments[0])" if False else "(d)=>localStorage.setItem('exe-v2:local', d)", json.dumps(ws)); t0 = time.time(); pg.reload(); pg.locator('#status-line').wait_for(); load = time.time() - t0
        times = {}
        for r, title in [('inbox', 'List'), ('map', 'Map'), ('decisions', 'Decisions'), ('review', 'AI Assistant'), ('focus', 'Mission Status')]:
            t = time.time(); (pg.evaluate(f"location.hash = '#/{r}'") if r in ('map', 'decisions', 'lanes') else pg.locator(f'[data-nav={r}]').filter(visible=True).first.click()); pg.locator('#view h1', has_text=title).wait_for(); pg.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'); times[r] = time.time() - t
        t = time.time(); pg.keyboard.press('/'); pg.get_by_label('Search all work').fill('plumber 1999'); pg.locator('.search-result').first.wait_for(); times['search'] = time.time() - t
        assert load < 5 and all(v < 2.5 for v in times.values()), (w, load, times)
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f'PASS {w}px large workspace {sizes}: load {load:.2f}s, ' + ', '.join(f'{k} {v:.2f}s' for k, v in times.items())); ctx.close()
    # ---- accessibility with dialogs open, then screenshots
    for w in [390, 1280]:
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', **({'has_touch': True, 'is_mobile': True} if (WK and w < 761) else {})); pg = ctx.new_page(); pg.goto(URL); pg.evaluate('localStorage.clear()'); pg.reload()
        def axe(label):
            pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, (label, [(x['id'], [n['target'] for n in x['nodes']]) for x in v])
        nav = lambda r: (pg.evaluate(f"location.hash = '#/{r}'") if r in ('map', 'decisions', 'lanes') else pg.locator(f'[data-nav={r}]').filter(visible=True).first.click())
        shot = lambda name: pg.screenshot(path=str(OUT / f"{'webkit-' if WK else ''}{w}-{name}.png"))
        shot('empty-focus')
        pg.locator('.dock-capture, .top-capture').filter(visible=True).last.click(); pg.locator('.modal-sheet').wait_for(); axe('capture dialog')   # dialogs load on demand now; pg.keyboard.press('Escape')
        pg.keyboard.press('Control+k'); pg.get_by_label('Capture text').fill('Order balloons for the party\nOrder the balloons for party\nBook the caterer'); pg.locator('.modal-sheet button[type=submit]').click()
        nav('map'); pg.get_by_role('button', name='New folder').click(); pg.locator('#modal-root input[name=name]').fill('Home'); axe('folder dialog'); pg.get_by_role('button', name='Create folder').click()
        pg.get_by_role('button', name='Add outcome').click(); pg.locator('#modal-root input[name=name]').fill('Plan the reunion'); axe('outcome dialog'); pg.locator('#modal-root button[type=submit]').click()
        pg.get_by_role('button', name='Make active').first.click(); pg.get_by_role('button', name='Add step').first.click(); pg.locator('#modal-root input[name=task]').fill('Pick a date'); pg.locator('#modal-root button[type=submit]').click(); shot('map')
        nav('focus'); shot('focus'); pg.get_by_role('button', name='Enter Focus Mode').click(); axe('focus mode'); shot('focus-mode'); pg.keyboard.press('Escape')
        nav('inbox'); shot('inbox'); nav('review'); axe('review'); pg.locator('.review-item').first.get_by_role('button', name='Preview merge').click(); axe('merge preview'); shot('merge-preview'); pg.keyboard.press('Escape'); shot('review')
        nav('decisions'); pg.get_by_role('button', name='New decision').click(); axe('decision dialog'); pg.keyboard.press('Escape'); shot('decisions')
        pg.keyboard.press('/'); pg.get_by_label('Search all work').fill('reunion'); axe('search dialog'); shot('search'); pg.keyboard.press('Escape')
        (pg.get_by_role('button', name='Settings') if w > 760 else pg.get_by_role('button', name='Account and settings')).filter(visible=True).first.click(); axe('settings dialog'); shot('settings'); pg.keyboard.press('Escape')
        print(f'PASS {w}px accessibility with dialogs open (capture, folder, outcome, focus mode, review, merge preview, decision, search, settings) + screenshots'); ctx.close()
    b.close()
