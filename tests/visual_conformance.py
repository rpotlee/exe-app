"""Render real UI evidence and record measurable geometry; no synthetic progress."""
import os
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--pass-name',default='pass-2');args=parser.parse_args()
out=ROOT/'docs/visual-conformance'/args.pass_name;out.mkdir(parents=True,exist_ok=True)
metrics=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430,1280,1440]:
  page=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
  page.goto('http://127.0.0.1:8000')
  for route in ['focus','inbox']:
   page.locator(f'[data-nav={route}]').filter(visible=True).first.click()
   page.wait_for_timeout(100)
   page.screenshot(path=str(out/f'{width}-{route}.png'),animations='disabled')
   if route=='focus':
    metrics.append({'width':width,'card':page.locator('.priority-hero').bounding_box(),'ring':page.locator('.hero-stat').bounding_box(),'track':page.locator('.mini-progress-track').first.bounding_box(),'ringFont':page.locator('.ring-text strong').evaluate('e=>getComputedStyle(e).fontFamily')})
  if width<761:
   dock=page.locator('.mobile-dock').bounding_box();plus=page.locator('.mobile-capture').bounding_box()
   page.screenshot(path=str(out/f'{width}-dock.png'),clip={'x':dock['x'],'y':plus['y'],'width':dock['width'],'height':dock['y']+dock['height']-plus['y']},animations='disabled')
   page.locator('.mobile-capture').click();page.get_by_label('Capture text').fill('A captured interruption, not a new priority.')
   page.wait_for_timeout(100)
   page.screenshot(path=str(out/f'{width}-capture.png'),animations='disabled')
   page.keyboard.press('Escape')
  if width in [390,1280]:
   for route in ['review','map','decisions']:
    page.locator(f'[data-nav={route}]').filter(visible=True).first.click()
    page.wait_for_timeout(100)
   page.screenshot(path=str(out/f'{width}-{route}.png'),animations='disabled')
   page.locator('[data-nav=focus]').filter(visible=True).first.click();page.locator('[data-focus-mode]').click()
   page.screenshot(path=str(out/f'{width}-focus-mode.png'));page.keyboard.press('Escape')
   page.locator('.workspace-switch').filter(visible=True).click() if width>760 else None;page.screenshot(path=str(out/f'{width}-settings.png'))
  page.close()
 b.close()
(out/'geometry.json').write_text(json.dumps(metrics,indent=2)+'\n')
print('Captured Focus/Inbox at six widths; mobile capture/dock; other existing screens; geometry:',out)
