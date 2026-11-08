"""Acceptance regressions for compact Inbox rows and unobscured floating controls."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    for width in [320,375,390,430,1280,1440]:
        page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
        page.goto('http://127.0.0.1:8000')
        page.locator('[data-nav=inbox]').filter(visible=True).first.click()
        assert page.locator('.raw-detail-panel:visible').count()==0
        assert page.locator('[data-edit-capture]:visible').count()==0
        assert page.locator('[data-capture-check]').count()==18
        # A long list with long words wraps; all commands remain reachable at the tail.
        long_text='Long wrapping checklist description '+('wordwithoutspaces'*20)
        for i in range(12):
            page.get_by_label('Add a to-do',exact=True).fill(f'{i}: {long_text}')
            page.get_by_label('Add a to-do',exact=True).press('Enter')
        row=page.locator('.raw-row').last
        row.locator('[data-row-more]').click()
        more=row.locator('[data-row-more]')
        assert more.get_attribute('aria-expanded')=='true'
        assert row.locator('.raw-meta').is_visible()
        assert row.locator('.raw-check').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=16
        page.keyboard.press('Escape');assert more.get_attribute('aria-expanded')=='false'
        more.focus();page.keyboard.press('Enter')
        row.get_by_role('button',name='Edit',exact=True).click()
        page.locator('#capture-edit textarea').fill(long_text+' edited')
        page.get_by_role('button',name='Save changes').click()
        assert row.locator('[data-row-more]').get_attribute('aria-expanded')=='true'
        # Completion preserves the action disclosure and AI state.
        row.locator('[data-capture-check]').click()
        data=json.loads(page.evaluate("localStorage.getItem('exe-v1-local-workspace')"))
        assert data['captures'][-1]['status']=='pending' and data['captures'][-1]['completedAt']
        assert not any(t['done'] for t in data['tasks'])
        assert row.locator('.raw-original').inner_text().endswith(long_text)
        assert page.locator('#view').evaluate('e=>e.scrollWidth<=e.clientWidth'),width
        if width<761:
            # The clipped scroll region is entirely above both fixed controls.
            for fraction in [0,.5,1]:
                page.locator('#view').evaluate('(e,f)=>e.scrollTop=(e.scrollHeight-e.clientHeight)*f',fraction)
                view=page.locator('#view').bounding_box();plus=page.locator('.mobile-capture').bounding_box();dock=page.locator('.mobile-dock').bounding_box()
                assert plus['y']+plus['height']<=dock['y']  # separate button above the dock
            # Last checkbox, disclosure and actions can all be scrolled into the clear region.
            page.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)')  # end of list: the clearance leaves it above the + button
            for selector in ['[data-capture-check]','[data-row-more]','[data-edit-capture]','[data-archive-capture]']:
                control=row.locator(selector);control.scroll_into_view_if_needed();box=control.bounding_box()
                assert box['y']+box['height']<=plus['y']
                assert control.evaluate('e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}')
            # Capture sheet stays inside a smaller visual viewport with simulated keyboard offset.
            page.locator('.mobile-capture').click()
            page.set_viewport_size({'width':width,'height':420})
            page.get_by_label('Capture text').fill('Reduced visual viewport')
            page.wait_for_timeout(100)
            page.evaluate("document.documentElement.style.setProperty('--visual-height','300px');document.documentElement.style.setProperty('--visual-top','20px')")
            save=page.locator('#capture-form button[type=submit]');save.scroll_into_view_if_needed()
            box=save.bounding_box();assert box['y']>=20 and box['y']+box['height']<=320,box
            save.click();page.set_viewport_size({'width':width,'height':900})
        if os.environ.get('AXE_PATH'):
            # Include expanded metadata/actions and edited originals, not just collapsed rows.
            page.add_script_tag(path=os.environ['AXE_PATH'])
            result=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
            assert not result['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in result['violations']]
        print(f'PASS {width}px: expandable actions, long-list wrapping, independent completion'+(', unobscured scroll region and reduced visual viewport' if width<761 else '')+(', expanded-state axe' if os.environ.get('AXE_PATH') else ''))
        page.close()
    browser.close()
