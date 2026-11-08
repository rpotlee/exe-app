"""Documentation only: compare approved UI crops with actual master screenshots."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'evidence/comparisons';OUT.mkdir(parents=True,exist_ok=True)
SOURCES=ROOT.parent/'assets/design-reference'
CASES=[
 ('mobile-focus','approved-light-glass-navigation.webp',(640,118,1037,892),'mobile-focus'),
 ('mobile-inbox','approved-light-glass-navigation.webp',(1092,118,1489,892),'mobile-inbox'),
 ('desktop-focus','approved-floating-capture-and-inbox.webp',(45,118,577,755),'desktop-focus'),
 ('floating-focus','approved-floating-capture-and-inbox.webp',(615,260,970,922),'mobile-focus'),
]
for name,source,box,actual in CASES:
 Image.open(SOURCES/source).crop(box).save(OUT/f'{name}-reference.png')
 master=Image.open(ROOT/'evidence'/f'{actual}.png')
 if name=='desktop-focus':master=master.crop((0,0,722,840))
 master.save(OUT/f'{name}-actual.png')
blocks=[]
for name,source,box,actual in CASES:
 cls='desktop' if name=='desktop-focus' else 'mobile'
 note='Desktop normalized by the visible sidebar (157 raster px to 208 CSS px).' if cls=='desktop' else 'Mobile UI areas normalized to the same width; no device frame or browser chrome.'
 blocks.append(f'<section class="{cls}" id="{name}"><h1>{name.replace("-"," ").title()}</h1><p>{note} Real text and zero progress retained.</p><div class="pair"><figure><img src="{name}-reference.png" alt="Approved UI crop"><figcaption>Approved reference · illustrative data</figcaption></figure><figure><img src="{name}-actual.png" alt="Actual HTML/CSS design master"><figcaption>Coded design master · initial zero progress</figcaption></figure></div></section>')
html='''<!doctype html><meta charset="utf-8"><title>Exe design master comparisons</title><style>body{margin:0;color:#101426;background:white;font:16px Arial,sans-serif}section{width:860px;padding:24px;box-sizing:border-box}h1{margin:0 0 10px;font-size:24px}p{font-size:13px;color:#42485d;line-height:1.5}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0}img{width:100%;height:auto;display:block;border:1px solid #dcdeed;box-sizing:border-box}figcaption{font-size:12px;padding-top:8px;color:#42485d}.desktop{width:1150px}.desktop .pair{grid-template-columns:532px 545px}</style>'''+''.join(blocks)
(OUT/'index.html').write_text(html)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1160,'height':1000})
 page.goto('http://127.0.0.1:8000/design-master/evidence/comparisons/index.html')
 for name,*_ in CASES:page.locator('#'+name).screenshot(path=str(OUT/f'{name}.png'))
 b.close()
print('Created four labeled reference/master UI-only comparisons.')
