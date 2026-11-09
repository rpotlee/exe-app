"""Settings > Appearance: Light/Dark/Match device, remembered across reloads."""
import os
from playwright.sync_api import sync_playwright, expect
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'])
    for w, h in ((390, 844), (1280, 800)):
        ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme='light'); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:5173/?local=1&fakeai=1#/list'); pg.wait_for_timeout(700)
        theme = lambda: pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme() == 'light'
        pg.keyboard.press('Escape')
        pg.evaluate("location.hash='#/list'")
        # open Settings through the app's own control
        btn = pg.get_by_role('button', name='Settings')
        if btn.count(): btn.first.click()
        else: pg.locator('.mobile-avatar, .avatar').first.click()
        dlg = pg.get_by_role('dialog')
        dlg.get_by_label('Dark').check(); assert theme() == 'dark'
        pg.reload(); pg.wait_for_timeout(500); assert theme() == 'dark', 'remembered'
        if btn.count(): btn.first.click()
        else: pg.locator('.mobile-avatar, .avatar').first.click()
        pg.get_by_role('dialog').get_by_label('Match this device').check(); assert theme() == 'light'
        assert not errs, errs
        print(f'PASS {w}px: appearance Light/Dark/Match device, remembered')
        ctx.close()
    b.close()
