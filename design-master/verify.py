"""Render only the isolated design master; record actual component geometry."""
from pathlib import Path
import json,hashlib,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
SELECTORS={'brand':'.brand','heading':'.screen-heading h1','status':'.status-line','currentPriority':'.priority-card','priorityTitle':'.priority-copy h2','progressRing':'.progress-ring','actionableStep':'.priority-step','focusButton':'.focus-button','otherPriorities':'.other-priorities','secondaryCard':'.secondary-priority','dock':'.glass-dock','quickCapture':'.capture-button','filters':'.filters','inlineAdd':'.inline-add','firstInboxRow':'.checklist-row','sidebar':'.sidebar'}
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for screen,width,height in [('mobile-focus',390,760),('mobile-inbox',390,760),('desktop-focus',1280,840)]:
  page=b.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce')
  requests=[];errors=[];page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:8000/design-master/{screen}.html')
  page.evaluate('document.fonts.ready');assert page.evaluate('document.fonts.check("750 19px \\\"Exe Inter\\\"")')
  page.wait_for_timeout(100)
  assert not errors
  assert all('/design-master/' in u for u in requests),requests
  assert page.locator('input[type=checkbox]:checked').count()==0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if screen!='mobile-inbox':
   assert page.locator('.progress-ring strong').inner_text()=='0%'
   assert all(t.inner_text()=='0%' for t in page.locator('.small-progress > strong').all())
  if width==390:
   assert page.locator('.dock-item').count()==5
   plus=page.locator('.capture-button').bounding_box()
   view=page.locator('.mobile-content').bounding_box()
   assert view['y']+view['height']<=plus['y']-5
   if screen=='mobile-focus':
    last=page.locator('.secondary-priority').last.bounding_box()
    assert last['y']+last['height']<=view['y']+view['height']
   for item in page.locator('.dock-item').all():
    box=item.bounding_box();assert box['width']>=44 and box['height']>=44
    assert box['y']>=plus['y']+plus['height']
  metrics={}
  for name,sel in SELECTORS.items():
   node=page.locator(sel).first
   if node.count():
    metrics[name]={'bounds':node.bounding_box(),'computed':node.evaluate('e=>{const c=getComputedStyle(e);return {font:c.fontFamily,fontSize:c.fontSize,lineHeight:c.lineHeight,weight:c.fontWeight,color:c.color,background:c.backgroundColor,radius:c.borderRadius,border:c.border,shadow:c.boxShadow}}')}
  page.screenshot(path=str(ROOT/'evidence'/f'{screen}.png'),animations='disabled')
  if screen=='mobile-inbox':
   page.locator('.checklist-row').last.locator('summary').scroll_into_view_if_needed()
   page.locator('.checklist-row').last.locator('summary').click()
   assert page.locator('.checklist-row').last.locator('.action-panel').is_visible()
   page.locator('.checklist-row').last.locator('input').check()
   assert page.locator('input:checked').count()==1
  results.append({'screen':screen,'viewport':{'width':width,'height':height},'components':metrics,'runtimeRequests':requests})
  page.close()
 b.close()
(ROOT/'evidence/measurements.json').write_text(json.dumps(results,indent=2)+'\n')
lines=['# Browser-measured component geometry','', 'CSS pixels at device scale factor 1; generated from actual DOM bounds. Full computed styles: `evidence/measurements.json`.','']
for screen in results:
 lines+=['## '+screen['screen'],'',f"Viewport: {screen['viewport']['width']} × {screen['viewport']['height']}",'','| Component | x | y | width | height |','| --- | ---: | ---: | ---: | ---: |']
 for name,c in screen['components'].items():
  box=c['bounds'];lines.append('| '+name+' | '+' | '.join(str(round(box[k],2)) for k in ['x','y','width','height'])+' |')
 lines.append('')
(ROOT/'MEASUREMENTS.md').write_text('\n'.join(lines)+'\n')
font=ROOT/'fonts/InterVariable.ttf'
(ROOT/'evidence/font-sha256.txt').write_text(hashlib.sha256(font.read_bytes()).hexdigest()+'  fonts/InterVariable.ttf\n')
changed=subprocess.check_output(['git','-C',str(ROOT.parent),'diff','--name-only','399359e','--','.',':!design-master'],text=True).strip()
assert not changed,changed
print('PASS 3 master screens; local font loaded; zero progress; five destinations; touch and scroll clearance; native checkbox/disclosure; app untouched.')
