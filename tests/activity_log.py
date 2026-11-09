"""Activity Log is a plain log of what the AI did and how you answered it (DEC-018), with the fake AI. Dev server :5173, EXE_CHROMIUM, AXE_PATH."""
import os, json
from playwright.sync_api import sync_playwright, expect
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    for w in [390, 1280]:
        pg = b.new_page(viewport={'width': w, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:5173/?local=1&fakeai=1'); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload()
        pg.locator('[data-nav=review]').filter(visible=True).first.click(); expect(pg.get_by_role('heading', name='Activity Log')).to_be_visible()
        expect(pg.get_by_text('Nothing yet')).to_be_visible()                                                # an honest empty state: no invented history
        pg.locator('[data-nav=inbox]').filter(visible=True).first.click(); box = pg.get_by_label('Add a to-do')
        for t in ['Email Rachel about the open position at company A', 'Prepare interview questions for the open position', 'Renew passport', 'What is the capital of Australia?']: box.fill(t); box.press('Enter')
        pg.wait_for_timeout(4500)
        pg.locator('[data-nav=review]').filter(visible=True).first.click()
        rows = pg.locator('.tl-entry'); expect(rows.first).to_be_visible(timeout=9000)
        txt = pg.locator('#view').inner_text()
        assert 'Prepared an email draft for “Email Rachel about the open position at company…”' in txt, txt
        assert 'Answered the question in' in txt and 'Suggested priorities for 4 to-dos' in txt and 'Suggested grouping 2 to-dos as “Hiring”' in txt and 'may depend on' in txt, txt
        assert str(__import__('datetime').date.today().year) in txt and 'Hi Rachel' not in txt                                                    # grouped by day; generated text is not copied into the log
        st = json.loads(pg.evaluate("localStorage.getItem('exe-v2:local')")); assert not st['outcomes'] and all(e['actor'] == 'ai' for e in st['audit'])   # the AI changed nothing; its events are marked as the AI's
        pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, [(x['id'], [n['target'] for n in x['nodes']]) for x in v]
        # what you do with its suggestions is logged too
        pg.evaluate("location.hash = '#/mission'"); pg.locator('.g-head', has_text='Hiring').click(); pg.get_by_role('button', name='Group these').click()
        pg.evaluate("location.hash = '#/tasks'"); pg.get_by_label('Priority of Renew passport: High priority, suggested by AI').select_option('low')
        pg.locator('[data-nav=review]').filter(visible=True).first.click(); expect(pg.get_by_role('heading', name='Activity Log')).to_be_visible(); expect(pg.locator('.tl-entry', has_text='Set “Renew passport”')).to_have_count(1); txt = pg.locator('#view').inner_text()
        assert 'Grouped 2 to-dos as “Hiring” from the AI’s suggestion' in txt and 'Set “Renew passport” to Low priority (the AI suggested High)' in txt, txt
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f'PASS {w}px: Activity Log (help, priorities, groups, dependencies, your answers), nothing changed by the AI, no generated text copied, axe clean'); pg.close()
    b.close()
