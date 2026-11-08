"""Mission Status keeps its original card design; steps in the current-priority card show priority labels (owner direction DEC-016):
the AI's suggestion is marked (dashed, ✦), your pick wins and persists, and labels can be turned off. Uses the fake AI. Dev server :5173, EXE_CHROMIUM, AXE_PATH."""
import os, json
from playwright.sync_api import sync_playwright, expect
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    for w in [390, 1280]:
        pg = b.new_page(viewport={'width': w, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:5173/?local=1&fakeai=1'); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload()
        box = pg.get_by_label('Add a to-do')
        for t in ['Email Rachel about the open position at company A', 'Prepare interview questions for the open position', 'Renew passport']: box.fill(t); box.press('Enter')
        expect(pg.locator('.assist-card')).to_have_count(1, timeout=9000); pg.get_by_role('button', name='Group these').click()      # an AI group becomes an outcome, only because you asked
        pg.evaluate("location.hash = '#/map'"); pg.locator('.outcome-block').first.wait_for()
        mk = pg.get_by_role('button', name='Make active').first; pg.wait_for_timeout(300)
        if not mk.is_visible(): pg.locator('.outcome-top').first.click()
        mk.click()
        pg.locator('[data-nav=focus]').filter(visible=True).first.click(); pg.locator('.priority-hero').wait_for()
        expect(pg.get_by_role('heading', name='Mission Status')).to_be_visible(); assert pg.locator('.hero-stack').count() == 1 and 'Up next' not in pg.locator('#view').inner_text()
        pg.locator('.priority-hero .show-steps').click() if pg.locator('.priority-hero .show-steps').count() and w < 761 else None
        chip = pg.locator('.priority-hero .prio-chip').filter(visible=True).first; expect(chip).to_be_visible(); assert 'ai' in chip.get_attribute('class').split()          # the AI's suggestion, marked
        name = chip.locator('select').get_attribute('aria-label')
        chip.locator('select').select_option('low'); chip = pg.locator('.priority-hero .prio-chip').filter(visible=True).first
        st = json.loads(pg.evaluate("localStorage.getItem('exe-v2:local')")); assert 'low' in [c['user_priority'] for c in st['captures']]      # your pick wins and persists
        expect(chip).to_contain_text('Low'); assert 'ai' not in chip.get_attribute('class').split()
        pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, [(x['id'], [n['target'] for n in x['nodes']]) for x in v]
        pg.evaluate("localStorage.setItem('exe-priority-mode','off')"); pg.reload(); pg.locator('.priority-hero').wait_for(); assert pg.locator('.prio-chip').count() == 0   # labels can be turned off
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f'PASS {w}px: original Mission card kept; step priority labels (AI marked, your pick wins, off switch), axe clean'); pg.close()
    b.close()
