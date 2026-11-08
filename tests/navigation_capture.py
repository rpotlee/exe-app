"""Same-state close-up: approved crop, previous actual CSS, current actual CSS."""
from pathlib import Path
import subprocess
from PIL import Image
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];O=R/'docs/navigation-correction'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for version in ['before','after']:
  page=b.new_page(viewport={'width':390,'height':900},reduced_motion='reduce');page.goto('http://127.0.0.1:8000');page.locator('.mobile-dock [data-nav=focus]').click()
  if version=='before':
   page.evaluate('document.querySelectorAll("link[rel=stylesheet]").forEach(e=>e.disabled=true)')
   for file in ['design-tokens.css','styles.css']:
    page.add_style_tag(content=subprocess.check_output(['git','-C',str(R),'show',f'e9be4ae:{file}'],text=True))
  page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
  dock=page.locator('.mobile-dock').bounding_box();plus=page.locator('.mobile-capture').bounding_box()
  page.screenshot(path=str(O/f'{version}-dock.png'),clip={'x':dock['x'],'y':plus['y'],'width':dock['width'],'height':dock['y']+dock['height']-plus['y']},animations='disabled');page.close()
 Image.open(R/'assets/design-reference/approved-floating-capture-and-inbox.webp').crop((610,792,969,924)).save(O/'reference-five-destinations.png')
 Image.open(R/'assets/design-reference/approved-light-glass-navigation.webp').crop((640,779,1037,892)).save(O/'reference-glass.png')
 html='''<!doctype html><meta charset="utf-8"><title>Actual dock comparison</title><style>body{font:14px Arial;margin:20px;color:#101426;background:white}h1{font-size:22px}section{width:1194px;display:grid;grid-template-columns:repeat(3,382px);gap:24px}figure{margin:0}img{width:382px;height:auto;display:block}figcaption{margin:12px 0;font-weight:bold}p{max-width:1150px;line-height:1.5;color:#455169}</style><h1>Reference → previous actual application → corrected actual application</h1><p>Focus selected in every actual-app capture. Width-normalized UI-only crops; original native proportions retained.</p><section><figure><img src="reference-five-destinations.png"><figcaption>Approved five-destination composition</figcaption><img src="reference-glass.png"><figcaption>Latest approved glass treatment</figcaption></figure><figure><img src="before-dock.png"><figcaption>Actual application before correction</figcaption></figure><figure><img src="after-dock.png"><figcaption>Actual application after correction</figcaption></figure></section>'''
 (O/'index.html').write_text(html)
 page=b.new_page(viewport={'width':1234,'height':480});page.goto('http://127.0.0.1:8000/docs/navigation-correction/index.html');page.screenshot(path=str(O/'comparison.png'),full_page=True);b.close()
print('Captured same-state reference/before/after actual dock comparison.')
