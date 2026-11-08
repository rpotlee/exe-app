"""Build labeled UI-only side-by-side evidence, without device/frame comparison."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'docs/visual-conformance/implementation-final/comparisons';out.mkdir(parents=True,exist_ok=True)
# Coordinates are documented approximations of visible flat UI areas. No artwork is used by the app.
crops={
 'floating-focus':('approved-floating-capture-and-inbox.webp',(615,260,970,922)),
 'glass-focus':('approved-light-glass-navigation.webp',(640,118,1037,892)),
 'glass-inbox':('approved-light-glass-navigation.webp',(1092,118,1489,892)),
 'floating-desktop':('approved-floating-capture-and-inbox.webp',(45,118,577,755)),
}
for name,(file,box) in crops.items():
 Image.open(ROOT/'assets/design-reference'/file).crop(box).save(out/f'{name}-reference.png')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name in ['floating-focus','glass-focus','glass-inbox']:
  reference=Image.open(out/f'{name}-reference.png');height=round(reference.height/reference.width*390)
  page=b.new_page(viewport={'width':390,'height':height},reduced_motion='reduce');page.goto('http://127.0.0.1:8000')
  if name.endswith('inbox'):page.locator('.mobile-dock [data-nav=inbox]').click()
  page.evaluate('document.fonts.ready');page.wait_for_timeout(100);page.screenshot(path=str(out/f'{name}-actual.png'),animations='disabled');page.close()
 # Visible left desktop region only: the phone occludes the rest in the reference.
 Image.open(ROOT/'docs/visual-conformance/implementation-final/1280-focus.png').crop((0,0,756,900)).save(out/'floating-desktop-actual.png')
 blocks=[]
 for name in crops:
  blocks.append(f'''<section class="{"desktop" if name.endswith("desktop") else "mobile"}" id="{name}"><h2>{name.replace('-',' ').title()}</h2><p>Reference UI crop (left) · actual HTML/CSS rendering (right). Mobile UI width / desktop sidebar scale normalized; viewport, real text and progress differences are documented in REPORT.md.</p><div class="pair"><figure><img src="{name}-reference.png" alt="Approved reference UI crop"><figcaption>Approved reference · illustrative data</figcaption></figure><figure><img src="{name}-actual.png" alt="Actual rendered Exe UI"><figcaption>Actual app · real 0% initial progress</figcaption></figure></div></section>''')
 html='''<!doctype html><meta charset="utf-8"><title>Exe UI conformance comparisons</title><style>body{font:16px system-ui;margin:0;background:#fff;color:#101426}section{padding:24px;width:900px;box-sizing:border-box;border-bottom:1px solid #dde1ee}h2{margin:0 0 8px}p{font-size:14px;color:#455169;line-height:1.5}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #dde1ee;box-sizing:border-box}figcaption{font-size:13px;padding-top:8px;color:#455169}section.desktop{width:1160px}section.desktop .pair{grid-template-columns:532px 574px}</style>'''+''.join(blocks)
 (out/'index.html').write_text(html)
 page=b.new_page(viewport={'width':1180,'height':1000});page.goto('http://127.0.0.1:8000/docs/visual-conformance/implementation-final/comparisons/index.html')
 for name in crops:page.locator('#'+name).screenshot(path=str(out/f'{name}-comparison.png'))
 b.close()
print('Created 4 labeled UI-only comparisons:',out)
