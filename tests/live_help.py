"""Live help (fake AI): the List shows NO AI help (owner direction DEC-017); the All tasks screen shows it under each task: email draft, sources, answer.
A suggested group appears on Mission; opening it shows its tasks, and Group these creates the outcome only when asked. Dev server :5173, EXE_CHROMIUM, AXE_PATH."""
import os, json
from playwright.sync_api import sync_playwright, expect
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    for w in [390, 1280]:
        pg = b.new_page(viewport={'width': w, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:5173/?local=1&fakeai=1'); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload()
        expect(pg.get_by_role('heading', name='List')).to_be_visible()                                       # a first visit opens the list
        box = pg.get_by_label('Add a task')
        for t in ['Email Rachel about the open position at company A', 'Prepare interview questions for the open position', 'Research how to register a business in New York City', 'What is the capital of Australia?', 'Buy a standing desk']:
            box.fill(t); box.press('Enter')
        pg.wait_for_timeout(4500)
        assert pg.locator('.assist-help, .assist-card, .assist-note').count() == 0                         # no AI help on the List
        pg.evaluate("location.hash = '#/tasks'"); expect(pg.get_by_role('heading', name='All tasks')).to_be_visible()
        expect(pg.locator('.assist-help')).to_have_count(3, timeout=9000)                                    # email, research, answer
        assert pg.locator('.assist-help[open]').count() == 0 and not pg.get_by_role('button', name='Copy').is_visible()   # closed until opened
        for i in range(pg.locator('.assist-help summary').count()): pg.locator('.assist-help summary').nth(i).click()
        expect(pg.get_by_role('button', name='Copy')).to_be_visible(); expect(pg.get_by_text('Send this today')).to_be_visible()
        href = pg.get_by_role('link', name='NY Department of State').get_attribute('href'); assert href.startswith('https://www.google.com/search?q=site%3Ados.ny.gov')
        expect(pg.get_by_text('The capital of Australia is Canberra.')).to_be_visible()
        pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, [(x['id'], [n['target'] for n in x['nodes']]) for x in v]
        pg.evaluate("location.hash = '#/mission'"); pg.locator('.g-head', has_text='Hiring').click()          # a group the AI named
        expect(pg.get_by_role('heading', name='Hiring')).to_be_visible(); expect(pg.locator('.t-row')).to_have_count(2)
        st = json.loads(pg.evaluate("localStorage.getItem('exe-v2:local')")); assert not st['outcomes'] and all(c['status'] == 'pending' for c in st['captures'])   # suggestions changed nothing
        pg.get_by_role('button', name='Group these').click()
        st = json.loads(pg.evaluate("localStorage.getItem('exe-v2:local')")); o = [x for x in st['outcomes'] if x['name'] == 'Hiring']; assert len(o) == 1 and sum(1 for t in st['tasks'] if t['outcome_id'] == o[0]['id']) == 2
        assert [r['confirmed'] for r in st['relationships']] == [False]
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f'PASS {w}px: List has no AI help; All tasks shows it; AI group opens; Group these only on request; axe clean'); pg.close()
    b.close()
