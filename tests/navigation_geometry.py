"""Guard the actual dock's reference-calibrated details, not only open ports/routes."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  page=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce');page.goto('http://127.0.0.1:8000');page.evaluate('document.fonts.ready')
  dock=page.locator('.mobile-dock');r=dock.bounding_box();plus=page.locator('.mobile-capture').bounding_box()
  assert r['height']==84 and r['width']==width-8
  assert plus['width']==68 and plus['height']==68
  assert plus['y']+plus['height']-r['y']==18
  assert 'blur(18px)' in dock.evaluate('e=>getComputedStyle(e).backdropFilter')
  for route in ['focus','inbox','review','map','decisions']:
   button=page.locator(f'.dock-item[data-nav={route}]');button.click()
   assert button.get_attribute('aria-current')=='page'
   assert button.evaluate('e=>getComputedStyle(e,"::before").width')=='50px'
   assert button.locator('small').evaluate('e=>getComputedStyle(e).fontSize')=='11px'
   assert button.locator('svg').evaluate('e=>getComputedStyle(e).width')=='24px'
   box=button.bounding_box();assert box['width']>=44 and box['height']>=44 and box['y']>=plus['y']+plus['height']
  print(f'PASS {width}px reference geometry, compact selected highlight, type/icon scale, glass, target clearance and all routes')
  page.close()
 b.close()
