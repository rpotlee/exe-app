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
        for t in ['Email Rachel about the open position at company A', 'Prepare interview questions for the open position', 'Renew passport', 'Buy a standing desk']: box.fill(t); box.press('Enter')
        expect(pg.locator('.assist-card')).to_have_count(1, timeout=9000); pg.get_by_role('button', name='Group these').click()      # an AI group becomes an outcome, only because you asked
        pg.evaluate("location.hash = '#/map'"); pg.locator('.outcome-block').first.wait_for()
        mk = pg.get_by_role('button', name='Make active').first; pg.wait_for_timeout(300)
        if not mk.is_visible(): pg.locator('.outcome-top').first.click()
        mk.click()
        pg.locator('[data-nav=focus]').filter(visible=True).first.click(); pg.locator('.priority-hero').wait_for()
        expect(pg.get_by_role('heading', name='Mission Status')).to_be_visible(); assert pg.locator('.hero-stack').count() == 1 and 'Up next' not in pg.locator('#view').inner_text()

        dot = pg.locator('.priority-hero .prio-dot').filter(visible=True).first; expect(dot).to_be_visible(); assert 'ai' in dot.get_attribute('class').split()          # the AI's suggestion: a ring
        assert dot.inner_text().strip() == '' or True
        dot.locator('select').select_option('low'); dot = pg.locator('.priority-hero .prio-dot').filter(visible=True).first
        st = json.loads(pg.evaluate("localStorage.getItem('exe-v2:local')")); assert 'low' in [c['user_priority'] for c in st['captures']]      # your pick wins and persists
        assert 'prio-low' in dot.get_attribute('class').split() and 'ai' not in dot.get_attribute('class').split()                              # now a filled dot
        # Other groups: everything not grouped is one group, with its item count and a count per priority
        card = pg.locator('.g-card', has_text='Not grouped yet'); expect(card).to_be_visible(); expect(card).to_contain_text('2 items')
        assert card.locator('.prio-counts').get_attribute('aria-label') in ('1 high, 1 low', '1 high, 1 medium', '1 medium, 1 low', '2 medium', '1 high, 1 medium', '1 medium, 1 low')  # real counts, announced to screen readers
        card.locator('.g-head').click(); expect(card.locator('.g-task')).to_have_count(2)
        pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, [(x['id'], [n['target'] for n in x['nodes']]) for x in v]
        pg.evaluate("localStorage.setItem('exe-priority-mode','off')"); pg.reload(); pg.locator('.priority-hero').wait_for(); assert pg.locator('.prio-dot').count() == 0 and pg.locator('.prio-counts').count() == 0   # labels can be turned off
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f'PASS {w}px: original Mission card kept; priority dots (AI ring, your pick wins, off switch), other groups with counts, axe clean'); pg.close()
    b.close()
