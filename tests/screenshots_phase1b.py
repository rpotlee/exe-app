"""Regenerates docs/screenshots/phase1b/*.png from the running app (serve the repo on :8000, set EXE_CHROMIUM)."""
import os, json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT = Path(__file__).resolve().parents[1] / 'docs/screenshots/phase1b'; OUT.mkdir(parents=True, exist_ok=True)
KEY = 'exe-v1-local-workspace'
def go(pg, route): pg.locator(f'[data-nav="{route}"]').filter(visible=True).first.click(); pg.wait_for_timeout(350)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    for w, h in [(320, 640), (375, 812), (390, 844), (430, 932), (768, 1024), (1280, 860)]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 500 else 1, reduced_motion='reduce')
        pg = ctx.new_page(); pg.goto('http://127.0.0.1:8000/?example=1'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
        shot = lambda name: pg.screenshot(path=str(OUT / f'{w}-{name}.png'))
        shot('focus')
        pg.locator('[data-nav=lanes]').click(); pg.wait_for_timeout(350); shot('next-and-later')
        go(pg, 'focus'); go(pg, 'inbox'); shot('inbox')
        go(pg, 'map'); shot('map')
        go(pg, 'decisions'); shot('decisions')
        # state with a pending capture and a suggestion (pricing pinned by the test data): shows badges + engine card
        d = json.loads(pg.evaluate(f"localStorage.getItem('{KEY}')")); next(o for o in d['outcomes'] if o['id'] == 'pricing')['pinned'] = True
        pg.evaluate('([k,v])=>localStorage.setItem(k,v)', [KEY, json.dumps(d)]); pg.reload(); go(pg, 'focus')
        pg.locator('[data-capture]').filter(visible=True).last.click(); pg.get_by_label('Capture text').fill('Call the insurance broker'); pg.locator('#capture-form button[type=submit]').click()
        pg.locator('[data-review-priorities]').click(); pg.wait_for_timeout(300)
        pg.wait_for_timeout(2700); pg.locator('.suggest-card').scroll_into_view_if_needed(); pg.wait_for_timeout(300); shot('focus-suggestion')
        ctx.close()
        # regular first run (no example data) and folders
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 500 else 1, reduced_motion='reduce')
        pg = ctx.new_page(); pg.goto('http://127.0.0.1:8000/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
        pg.screenshot(path=str(OUT / f'{w}-first-run-focus.png'))
        go(pg, 'map'); pg.locator('[data-new-folder]').click(); pg.locator('#folder-form [name=name]').fill('Home'); pg.locator('#folder-form button[type=submit]').click()
        pg.locator('[data-add-outcome]').first.click(); pg.locator('#outcome-new-form [name=name]').fill('Plan the family reunion'); pg.locator('#outcome-new-form button[type=submit]').click()
        pg.wait_for_timeout(2700); shot_name = f'{w}-folders.png'; pg.screenshot(path=str(OUT / shot_name))
        # AI Review with a duplicate pair, a set-aside item and a recent approval
        for t in ['Order balloons for the party', 'Order the balloons for party', 'Look into a new phone plan', 'Book the caterer']:
            pg.locator('[data-capture]').filter(visible=True).last.click(); pg.get_by_label('Capture text').fill(t); pg.locator('#capture-form button[type=submit]').click(); pg.wait_for_timeout(200)
        go(pg, 'review'); pg.locator('.review-item').filter(has=pg.locator('.review-original', has_text='phone plan')).locator('[data-defer]').click()
        c = pg.locator('.review-item').filter(has=pg.locator('.review-original', has_text='caterer')); c.locator('[data-review-field=type]').select_option('Idea'); pg.locator('.review-item').filter(has=pg.locator('.review-original', has_text='caterer')).locator('[data-approve]').click()
        pg.wait_for_timeout(2700); pg.screenshot(path=str(OUT / f'{w}-ai-review.png'))
        ctx.close()
    b.close()
print('done')
