"""axe (WCAG 2 A/AA) on the Phase 1b surfaces. Needs AXE_PATH and EXE_CHROMIUM; serve the repo on :8000."""
import os, json
from playwright.sync_api import sync_playwright
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
def check(page, label):
    page.add_script_tag(path=os.environ['AXE_PATH'])
    v = page.evaluate(RUN)['violations']
    assert not v, (label, [(x['id'], [n['target'] for n in x['nodes']]) for x in v])
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    for w in [320, 390, 1280]:
        pg = b.new_page(viewport={'width': w, 'height': 900}, reduced_motion='reduce'); pg.goto('http://127.0.0.1:8000'); pg.evaluate('localStorage.clear()'); pg.reload()
        d = json.loads(pg.evaluate("localStorage.getItem('exe-v1-local-workspace')")); next(o for o in d['outcomes'] if o['id'] == 'pricing')['pinned'] = True
        pg.evaluate('v=>localStorage.setItem("exe-v1-local-workspace",v)', json.dumps(d)); pg.reload()
        pg.locator('[data-review-priorities]').click(); check(pg, 'focus + suggestion card')
        pg.locator('[data-priority-apply]').click(); check(pg, 'confirm dialog'); pg.keyboard.press('Escape')
        pg.locator('[data-nav=lanes]').click(); check(pg, 'next and later')
        pg.locator('[data-nav=map]').filter(visible=True).first.click(); check(pg, 'map with relationships')
        pg.locator('[data-add-relationship]').click(); check(pg, 'relationship dialog'); pg.keyboard.press('Escape')
        pg.locator('[data-nav=decisions]').filter(visible=True).first.click(); check(pg, 'decisions')
        pg.locator('[data-new-decision]').click(); check(pg, 'decision dialog'); pg.keyboard.press('Escape')
        print(f'PASS {w}px axe: suggestion card, dialogs, Next & Later, Map relationships, Decisions'); pg.close()
    b.close()
