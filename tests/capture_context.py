"""Quick Capture preserves unfinished inline text, scroll and expanded steps."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    for width in [320,390,430,1280]:
        page=b.new_page(viewport={'width':width,'height':900})
        page.goto('http://127.0.0.1:8000/?example=1')
        page.locator('[data-nav=inbox]').filter(visible=True).first.click()
        page.get_by_label('Add a to-do',exact=True).fill('Unfinished draft')
        page.evaluate('document.querySelector("#view").scrollTop=250' if width<761 else 'scrollTo(0,250)');before=page.evaluate('document.querySelector("#view").scrollTop' if width<761 else 'scrollY')
        page.keyboard.press('Control+k')
        page.get_by_label('Capture text').fill('A separate interruption')
        page.locator('#capture-form button[type=submit]').click()
        assert page.get_by_label('Add a to-do',exact=True).input_value()=='Unfinished draft'
        assert abs(page.evaluate('document.querySelector("#view").scrollTop' if width<761 else 'scrollY')-before)<2
        page.locator('[data-nav=focus]').filter(visible=True).first.click()
        if width<761:
            page.locator('[data-toggle-steps]').click()
            page.locator('.dock-capture').click()
            page.get_by_label('Capture text').fill('Another thought')
            page.locator('#capture-form button[type=submit]').click()
            assert page.locator('[data-toggle-steps]').get_attribute('aria-expanded')=='true'
            assert page.locator('[data-task-check]').filter(visible=True).count()==3
        page.locator('[data-focus-mode]').click()
        page.set_viewport_size({'width':width,'height':420})
        page.locator('.focus-layer').evaluate('e=>e.scrollTop=200')
        focus_scroll=page.locator('.focus-layer').evaluate('e=>e.scrollTop')
        page.keyboard.press('Control+k')
        page.get_by_label('Capture text').fill('Focus interruption')
        page.locator('#capture-form button[type=submit]').click()
        assert abs(page.locator('.focus-layer').evaluate('e=>e.scrollTop')-focus_scroll)<2
        page.keyboard.press('Control+k')
        page.keyboard.press('Escape')
        assert abs(page.locator('.focus-layer').evaluate('e=>e.scrollTop')-focus_scroll)<2
        page.set_viewport_size({'width':width,'height':900})
        page.get_by_role('dialog',name='Focus Mode').wait_for()
        page.keyboard.press('Escape')
        assert page.locator('[data-focus-mode]').evaluate('e=>e===document.activeElement')
        print(f'PASS {width}px capture context and focus restoration')
        page.close()
    b.close()
