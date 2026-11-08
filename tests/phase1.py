"""Phase 1 browser regressions. Start the static server, then run this file."""
import os
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
STORE = 'exe-v1-local-workspace'
def state(page):
    return json.loads(page.evaluate(f"localStorage.getItem('{STORE}')"))
def nav(page, route):
    page.locator(f'[data-nav="{route}"]').filter(visible=True).first.click()
def capture(page):
    page.locator('[data-capture]').filter(visible=True).last.click()
    page.get_by_label('Capture text').fill('First interruption\nSecond interruption')
    page.locator('#capture-form button[type=submit]').click()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM','/usr/bin/chromium'), args=['--no-sandbox'])
    for width in [320,375,390,430,768,1024,1280,1440]:
        context = browser.new_context(viewport={'width':width,'height':900}, reduced_motion='reduce')
        page = context.new_page(); errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:8000/?example=1')
        before=state(page)
        assert len(before['captures'])==18 and not any(t['done'] for t in before['tasks'])
        for route in ['focus','inbox','review','map','decisions']:
            nav(page,route)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,route,'overflow')
            capture(page)
            assert state(page)['page']==route
            assert page.locator('[role=dialog]').count()==0
        nav(page,'focus')
        page.locator('[data-focus-mode]').click();capture(page)
        page.get_by_role('dialog',name='Focus Mode').wait_for()
        page.keyboard.press('Escape')
        nav(page,'inbox')
        assert page.locator('[data-capture-check]').count()==30
        page.get_by_label('Add a to-do',exact=True).fill('Test raw item')
        page.get_by_label('Add a to-do',exact=True).press('Enter')
        c=state(page)['captures'][-1]; cid=c['id']
        check=page.locator(f'[data-capture-check="{cid}"]')
        check.focus();page.keyboard.press('Space')
        after=state(page)
        assert after['captures'][-1]['completedAt'] and after['captures'][-1]['status']=='pending'
        assert after['tasks']==before['tasks'] and after['focusAssignments']==before['focusAssignments']
        page.locator('[data-inbox-filter=active]').click();assert page.locator(f'[data-capture-check="{cid}"]').count()==0
        page.locator('[data-inbox-filter=done]').click();page.locator(f'[data-capture-check="{cid}"]').click()
        assert state(page)['captures'][-1]['completedAt'] is None
        page.locator('[data-inbox-filter=all]').click()
        page.locator(f'[data-row-more="{cid}"]').click()
        page.locator(f'[data-edit-capture="{cid}"]').click()
        page.locator('#capture-edit textarea').fill('Edited raw item')
        page.get_by_role('button',name='Save changes',exact=True).click()
        assert state(page)['captures'][-1]['text']=='Test raw item'
        assert state(page)['captures'][-1]['checklistText']=='Edited raw item'
        page.locator(f'[data-archive-capture="{cid}"]').click()
        assert page.locator(f'[data-capture-check="{cid}"]').count()==0
        page.locator('[data-show-archived]').click();page.get_by_role('button',name='Restore',exact=True).click()
        page.locator('[data-show-archived]').click();page.reload()
        assert page.locator(f'[data-capture-check="{cid}"]').count()==1
        assert [c['text'] for c in state(page)['captures'][:18]]==[c['text'] for c in before['captures']]
        # Search and Settings are desktop-only now: the approved mobile mockups show no entry point for them.
        nav(page,'focus')
        if width>760:
            page.get_by_role('button',name='Search workspace',exact=True).filter(visible=True).click()
            page.get_by_label('Search all work').fill('pricing');assert page.locator('.search-result').count()>0
            page.keyboard.press('Escape')
            page.locator('.workspace-switch').filter(visible=True).click()
            page.get_by_role('button',name='Download JSON backup').wait_for()
            page.get_by_role('button',name='Import backup',exact=True).wait_for()
            page.keyboard.press('Escape')
        # Existing task and decision actions remain reachable at every size.
        nav(page,'focus')
        page.locator('[data-task-check="reg-route"]').filter(visible=True).first.click()
        assert state(page)['tasks'][0]['done']
        if width<761:
            page.locator('[data-toggle-steps]').click()
        page.locator('[data-task-check="reg-route"]').filter(visible=True).first.click()
        if width<761:
            page.locator('[data-toggle-steps]').click()
            assert page.locator('[data-task-check]').filter(visible=True).count()==3
        nav(page,'map')
        for stream in ['market','partners','technology','growth','foundation']:
            if width<761: page.locator('[data-picker] .active').click()  # the mobile picker is collapsed until opened
            page.locator(f'[data-stream="{stream}"]').click()
            assert state(page)['selectedStream']==stream
        if width<761: page.locator('[data-toggle-outcome="insurance"]').click()  # outcomes are collapsed on phones
        page.locator('[data-set-lane="insurance"][data-lane="now"]').click()
        page.get_by_role('heading',name='Keep focus to three').wait_for()
        page.keyboard.press('Escape')
        assert len([a for a in state(page)['focusAssignments'] if a['lane']=='now'])==3
        nav(page,'decisions')
        if width<761: page.locator('[data-picker] .active').click()
        page.locator('[data-decision="decision-backend"]').click()
        page.get_by_label('Research notes').fill('Regression note')
        page.reload();assert page.get_by_label('Research notes').input_value()=='Regression note'
        page.get_by_role('button',name='Mark resolved',exact=True).click()
        page.get_by_placeholder('What did you decide?').fill('Regression conclusion')
        page.get_by_role('button',name='Confirm decision',exact=True).click()
        assert state(page)['decisions'][1]['status']=='resolved'
        page.get_by_role('button',name='Reopen decision',exact=True).click()
        assert state(page)['decisions'][1]['status']=='open'
        nav(page,'focus')
        if width<761:
            assert page.locator('.mobile-dock [data-nav]').count()==5
            dock=page.locator('.mobile-dock').bounding_box();plus=page.locator('.mobile-capture').bounding_box()
            assert plus['y']+plus['height']<=dock['y']  # Capture is a separate button above the dock
            assert page.locator('.mobile-dock .mobile-capture').count()==0
            for item in page.locator('.mobile-dock small').all(): assert item.is_visible()  # labels are drawn
            assert page.locator('.mobile-dock [aria-current=page]').count()==1
        assert not errors,errors
        if width in [390,1280]:
            name='mobile' if width==390 else 'desktop'
            # Clean example screenshots: do not present test completions as sample progress.
            page.evaluate('localStorage.clear()');page.reload()
            page.screenshot(path=str(ROOT/'docs/screenshots'/f'after-{name}-focus.png'),full_page=True)
            nav(page,'inbox');page.screenshot(path=str(ROOT/'docs/screenshots'/f'after-{name}-inbox.png'),full_page=True)
        context.close()
        print(f'PASS {width}px: navigation/context, raw CRUD/filter/persistence, independent completion, search/settings, geometry')
    browser.close()
