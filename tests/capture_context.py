"""Quick Capture preserves unfinished inline text, scroll and expanded steps."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in [320,390,430,1280]:
        page=b.new_page(viewport={'width':width,'height':900})
        page.goto('http://127.0.0.1:8000')
        page.locator('[data-nav=inbox]').filter(visible=True).first.click()
        page.get_by_label('Add a to-do',exact=True).fill('Unfinished draft')
        page.evaluate('scrollTo(0,250)');before=page.evaluate('scrollY')
        page.keyboard.press('Control+k')
        page.get_by_label('Capture text').fill('A separate interruption')
        page.locator('#capture-form button[type=submit]').click()
        assert page.get_by_label('Add a to-do',exact=True).input_value()=='Unfinished draft'
        assert abs(page.evaluate('scrollY')-before)<2
        page.locator('[data-nav=focus]').filter(visible=True).first.click()
        if width<761:
            page.locator('[data-toggle-steps]').click()
            page.locator('.mobile-capture').click()
            page.get_by_label('Capture text').fill('Another thought')
            page.locator('#capture-form button[type=submit]').click()
            assert page.locator('[data-toggle-steps]').get_attribute('aria-expanded')=='true'
            assert page.locator('[data-task-check]').filter(visible=True).count()==3
        page.locator('[data-focus-mode]').click()
        page.locator('[data-capture]').filter(visible=True).last.click()
        page.keyboard.press('Escape')
        page.get_by_role('dialog',name='Focus Mode').wait_for()
        page.keyboard.press('Escape')
        assert page.locator('[data-focus-mode]').evaluate('e=>e===document.activeElement')
        print(f'PASS {width}px capture context and focus restoration')
        page.close()
    b.close()
