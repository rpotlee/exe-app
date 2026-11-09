"""Mission Status (DEC-017): an All tasks card with the top few (high priority first) and a Show all button, groups below that open to their tasks, priority dots
(AI ring, your pick wins, off switch), List keeps priority and type but shows no AI help. Fake AI. Dev server :5173, EXE_CHROMIUM, AXE_PATH."""
import os, json
from playwright.sync_api import sync_playwright, expect
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    for w in [390, 1280]:
        pg = b.new_page(viewport={'width': w, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:5173/?local=1&fakeai=1'); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload()
        box = pg.get_by_label('Add a to-do')
        for t in ['Email Rachel about the open position at company A', 'Prepare interview questions for the open position', 'Buy a standing desk', 'Renew passport', 'Pay electric bill']: box.fill(t); box.press('Enter')
        # List: priority and type stay; no AI help
        row = pg.locator('.raw-row', has_text='Pay electric bill'); expect(row.locator('.prio-dot')).to_be_visible(timeout=9000)
        row.get_by_role('button', name='More actions').click(); expect(row.get_by_label('Type: Pay electric bill')).to_be_visible(); assert pg.locator('.assist-help').count() == 0
        pg.locator('[data-nav=focus]').filter(visible=True).first.click(); expect(pg.get_by_role('heading', name='Mission Status')).to_be_visible()
        card = pg.locator('.all-tasks'); expect(card).to_contain_text('ALL TASKS'); expect(card.locator('.prio-dot.ai').first).to_be_visible(timeout=9000)   # wait for the AI's labels; expect(card).to_contain_text('5 open tasks')
        rows = card.locator('.check-row'); n = 3 if w < 761 else 5; expect(rows).to_have_count(n)
        expect(rows.first).to_contain_text('Pay electric bill')                                                   # high priority first (Fake AI: bill/passport are high)
        if n < 5: expect(card.locator('.m-more')).to_contain_text('more')
        dot = rows.first.locator('.prio-dot'); assert 'ai' in dot.get_attribute('class').split(), (dot.get_attribute('class'), rows.first.inner_text())                  # the AI's suggestion: a ring
        dot.locator('select').select_option('low'); st = json.loads(pg.evaluate("localStorage.getItem('exe-v2:local')")); assert 'low' in [c['user_priority'] for c in st['captures']]   # your pick wins
        expect(pg.locator('.g-head', has_text='Hiring')).to_contain_text('2 items'); expect(pg.locator('.g-head', has_text='Not grouped yet')).to_be_visible()
        pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, [(x['id'], [n['target'] for n in x['nodes']]) for x in v]
        card.get_by_role('button', name='Show all').click(); expect(pg.get_by_role('heading', name='All tasks')).to_be_visible(); expect(pg.locator('.t-row')).to_have_count(5)
        pg.locator('.back-link').click(); expect(pg.locator('.all-tasks')).to_be_visible()
        pg.evaluate("localStorage.setItem('exe-priority-mode','off')"); pg.reload(); pg.locator('.all-tasks').wait_for(); assert pg.locator('.prio-dot').count() == 0 and pg.locator('.prio-counts').count() == 0
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f'PASS {w}px: Mission All tasks card + groups, task screens, priority dots, List has no AI help, labels off, axe clean'); pg.close()
    b.close()
