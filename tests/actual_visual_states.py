"""Actual app states in disposable browser contexts; never changes seed or user data."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parents[1]/'docs/visual-conformance/implementation-final';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [390,1280]:
  context=b.new_context(viewport={'width':width,'height':900});page=context.new_page();page.goto('http://127.0.0.1:8000');page.evaluate('document.fonts.ready')
  assert page.locator('.icon-tone-blue svg path').first.get_attribute('d').startswith('m12 2 10')
  assert page.locator('.icon-tone-violet').evaluate('e=>getComputedStyle(e).color')!=page.locator('.icon-tone-blue').evaluate('e=>getComputedStyle(e).color')
  state=json.loads(page.evaluate("localStorage.getItem('exe-v1-local-workspace')"))
  assert not any(t['done'] for t in state['tasks'])
  for outcome in ['registration','market-select']:
   next(t for t in state['tasks'] if t['outcome']==outcome)['done']=True
  state['captures'][0]['completedAt']='2026-01-01T00:00:00Z'
  page.evaluate('(s)=>localStorage.setItem("exe-v1-local-workspace",JSON.stringify(s))',state);page.reload();page.evaluate('document.fonts.ready')
  def shot(name):
   page.evaluate('''()=>{document.querySelector('.fixture-label')?.remove();const e=document.createElement('div');e.className='fixture-label';e.textContent='ISOLATED TEST FIXTURE · NOT USER PROGRESS';e.style='position:fixed;top:0;right:0;z-index:999;background:#fff5e2;color:#805000;font:10px Arial;padding:3px';document.body.append(e)}''')
   page.wait_for_timeout(100);page.screenshot(path=str(OUT/f'{width}-{name}.png'),animations='disabled')
  assert '33%' in page.locator('.ring-text').inner_text();shot('fixture-progress')
  page.locator('[data-nav=inbox]').filter(visible=True).first.click();shot('fixture-completed-inbox')
  page.locator('[data-nav=map]').filter(visible=True).first.click();page.locator('[data-stream=partners]').click();page.locator('.pill.red').first.scroll_into_view_if_needed();shot('fixture-blocked')
  context.close()
 fresh=b.new_context();page=fresh.new_page();page.goto('http://127.0.0.1:8000');clean=json.loads(page.evaluate("localStorage.getItem('exe-v1-local-workspace')"));assert not any(t['done'] for t in clean['tasks']);assert not any(c.get('completedAt') for c in clean['captures']);fresh.close();b.close()
print('PASS isolated actual-app nonzero ring/bar, completed/incomplete Inbox, blocker styling; fresh baseline remains zero.')
