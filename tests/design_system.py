"""Enforce the shared visual contracts independently of workflow regressions."""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'styles.css').read_text()+(ROOT/'design-tokens.css').read_text()
refs=set(re.findall(r'var\((--[\w-]+)',source));declared=set(re.findall(r'(--[\w-]+)\s*:',source))
assert refs-declared<={'--keyboard-inset','--visual-top','--visual-height'},refs-declared
assert 'Manrope' not in source and 'phase1-refinement.css' not in (ROOT/'index.html').read_text()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    for width in [320,375,390,430,1280,1440]:
        page=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
        page.goto('http://127.0.0.1:8000/?example=1')
        duplicate=page.evaluate('''()=>{const seen=new Set(),duplicates=[];function walk(rules,context){for(const r of rules){if(r.type===1){const key=context+'|'+r.selectorText;if(seen.has(key))duplicates.push(key);seen.add(key);}else if(r.cssRules)walk(r.cssRules,context+'|'+r.conditionText);}}walk(document.styleSheets[1].cssRules,'');return duplicates;}''')
        assert not duplicate,duplicate
        rgb=page.locator('.check-row input').filter(visible=True).first.evaluate('e=>getComputedStyle(e).borderColor')
        channels=[int(v)/255 for v in re.findall(r'\d+',rgb)[:3]]
        linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in channels]
        luminance=sum(v*w for v,w in zip(linear,[.2126,.7152,.0722]))
        assert 1.05/(luminance+.05)>=3,('checkbox boundary contrast',rgb)
        assert 'sans-serif' in page.locator('.hero-cap').evaluate('e=>getComputedStyle(e).fontFamily')
        for track in page.locator('.mini-progress-track').all():
            rect=track.bounding_box();assert rect['width']>=44 and 7<=rect['height']<=8
        if width>760:
            assert page.locator('.priority-hero').bounding_box()['width'] in (468,500)  # 500 in the two-column layout (>=1100px)
        else:
            targets=page.locator('.dock-item').all();plus=page.locator('.mobile-capture').bounding_box();dock=page.locator('.mobile-dock').bounding_box()
            assert plus['y']+plus['height']<=dock['y']  # Capture is separate: entirely above the dock
            assert page.locator('.mobile-dock .mobile-capture').count()==0
            for target in targets:
                r=target.bounding_box();assert r['width']>=44 and r['height']>=44
            for route in ['focus','inbox','review','map','decisions']:
                page.locator(f'.mobile-dock [data-nav={route}]').click()
                assert page.locator('.dock-item.active').count()==1
                assert page.locator('.dock-item.active').get_attribute('data-nav')==route
            page.locator('.mobile-dock [data-nav=inbox]').click()
        page.locator('[data-nav=inbox]').filter(visible=True).first.click()
        assert not page.locator('#inbox-add').evaluate('e=>e.checkValidity()')
        page.get_by_label('Add a to-do',exact=True).fill('Valid input')
        assert page.locator('#inbox-add').evaluate('e=>e.checkValidity()')
        button=page.locator('#inbox-add button');button.focus()
        # Keyboard modality must show the shared ring, not a browser-default outline.
        page.keyboard.press('Shift+Tab');page.keyboard.press('Tab')
        assert button.evaluate('e=>getComputedStyle(e).outlineStyle')=='solid'
        button.hover()
        page.mouse.down()
        assert button.evaluate('e=>getComputedStyle(e).filter')!='none'
        page.mouse.up()
        button.evaluate('e=>e.disabled=true');page.wait_for_timeout(500)  # let the opacity transition finish
        assert button.evaluate('e=>getComputedStyle(e).opacity')=='0.45'
        assert button.evaluate('e=>getComputedStyle(e).cursor')=='not-allowed'
        print(f'PASS {width}px shared tokens, unique CSS rules, ring font, progress geometry, touch/nav/validation/focus/disabled states')
        page.close()
    b.close()
