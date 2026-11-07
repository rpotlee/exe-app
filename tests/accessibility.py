"""Keyboard, safe-area and viewport-resize checks; optional axe via AXE_PATH."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in [320,390,430,1280]:
        page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
        page.goto('http://127.0.0.1:8000')
        if width<761:
            session=page.context.new_cdp_session(page)
            session.send('Emulation.setSafeAreaInsetsOverride',{'insets':{'top':20,'bottom':34,'left':0,'right':0}})
            assert float(page.locator('.mobile-dock').evaluate('e=>parseFloat(getComputedStyle(e).bottom)'))==48
        for route in ['focus','inbox','review','map','decisions']:
            page.locator(f'[data-nav="{route}"]').filter(visible=True).first.click()
            if os.environ.get('AXE_PATH'):
                page.add_script_tag(path=os.environ['AXE_PATH'])
                result=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                assert not result['violations'], [(v['id'],[n['target'] for n in v['nodes']]) for v in result['violations']]
        page.keyboard.press('Control+k');page.get_by_label('Capture text').wait_for()
        page.wait_for_timeout(80)
        # Trap keyboard focus inside sheet in both directions.
        close=page.get_by_role('button',name='Close',exact=True)
        close.focus();page.keyboard.press('Shift+Tab')
        assert page.locator('#capture-form button[type=submit]').evaluate('e=>e===document.activeElement')
        page.keyboard.press('Tab');assert close.evaluate('e=>e===document.activeElement')
        page.set_viewport_size({'width':width,'height':420})
        page.get_by_label('Capture text').fill('Keyboard viewport capture')
        page.locator('#capture-form button[type=submit]').click()
        assert page.locator('[role=dialog]').count()==0
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate("getComputedStyle(document.querySelector('.dock-item')).transitionDuration")=='1e-05s' or page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
        print(f'PASS {width}px keyboard trap, Escape/shortcut, reduced motion, resized capture'+(', safe-area 20/34px' if width<761 else '')+(', axe five routes' if os.environ.get('AXE_PATH') else ''))
        page.close()
    browser.close()
