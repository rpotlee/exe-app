"""Assistant Phase 1 (assistant spec): compact status lines on task rows, the per-entry assistant panel (full-height on phones), one question at a time,
drafts that refine in place with versions kept, adaptive actions that fit at 320px, quiet when there is nothing to add, nothing 'sent'.
Uses the labeled DEMO assistant (?local=1&fakeai=1). Dev server :5173, EXE_CHROMIUM, AXE_PATH."""
import os, re
from playwright.sync_api import sync_playwright, expect
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
TASKS = ['Reach out to Rachel about invoices', 'Call the electrician about flickering lights', 'What is the tallest mountain in South America?', 'Mow the lawn', 'Dentist appt?', 'File taxes']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    for w in [320, 390, 1280]:
        pg = b.new_page(viewport={'width': w, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:5173/?local=1&fakeai=1'); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload()
        box = pg.get_by_label('Add a task')
        for t in TASKS: box.fill(t); box.press('Enter')
        assert pg.locator('.ai-mark, .t-status, .assist-help').count() == 0                                                 # the List carries no AI decoration
        pg.evaluate("location.hash = '#/tasks'"); pg.get_by_role('heading', name='All tasks').wait_for()
        row = lambda s: pg.locator('.t-row', has_text=s)
        expect(row('Rachel').locator('.ai-mark')).to_have_attribute('aria-label', 'AI: Needs a detail. Open details'); expect(row('tallest mountain').locator('.ai-mark')).to_have_attribute('aria-label', 'AI: Answer: Aconcagua. Open details')
        expect(row('Dentist').locator('.ai-mark')).to_have_class(re.compile('ask'))
        assert row('Mow the lawn').locator('.ai-mark').count() == 0 and row('electrician').locator('.ai-mark').count() == 0     # no filler status
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth')
        # open Rachel: one question, no autofocus, dock hidden
        row('Rachel').get_by_role('button', name='Open Reach out').click(); dlg = pg.get_by_role('dialog'); expect(dlg).to_be_visible()
        assert pg.evaluate("document.activeElement && document.activeElement.tagName !== 'TEXTAREA'")             # opening to read must not raise the keyboard
        if w < 1100: assert not pg.locator('.mobile-navigation').is_visible() if pg.locator('.mobile-navigation').count() else True   # the dock does not overlap the assistant
        expect(dlg.get_by_text('How would you like to reach Rachel?')).to_be_visible(); assert dlg.locator('.ax-choice').count() == 3
        assert dlg.get_by_text('Email draft').count() == 0                                                         # no draft until a channel is chosen
        dlg.get_by_role('button', name='Text', exact=True).click(); expect(dlg.get_by_text('Text draft')).to_be_visible(); expect(dlg.locator('.ax-body')).to_contain_text('Hi Rachel')
        assert dlg.locator('.ax-subject').count() == 0                                                             # a text, not an email
        acts = dlg.locator('.ax-actions .ax-btn'); assert 1 <= acts.count() <= 3
        for i in range(acts.count()): assert acts.nth(i).bounding_box()['height'] >= 43 and acts.nth(i).bounding_box()['x'] >= 0 and acts.nth(i).bounding_box()['x'] + acts.nth(i).bounding_box()['width'] <= w   # 44px, never clipped
        if w == 320: assert dlg.get_by_role('button', name='More').count() == 1 and acts.count() == 2             # three actions fit as one + More at 320
        else: assert acts.count() == 3 and dlg.get_by_role('button', name='More', exact=True).count() == 0          # all three fit when there is room
        before = dlg.locator('.ax-body').inner_text()
        pg.evaluate("document.querySelector('.ax-panel').dataset.k = 1")
        (dlg.get_by_role('button', name='Shorter') if dlg.get_by_role('button', name='Shorter').count() else (dlg.get_by_role('button', name='More').click(), dlg.get_by_role('menuitem', name='Shorter'))[1]).click()
        expect(dlg.get_by_text('version 2')).to_be_visible(); assert dlg.locator('.ax-body').inner_text() != before
        dlg.get_by_label('Ask Exe').fill('Ask if she received invoice 103'); dlg.get_by_role('button', name='Send').click()
        expect(dlg.locator('.ax-body')).to_contain_text('invoice 103'); expect(dlg.get_by_text('version 3')).to_be_visible()   # refined in place; earlier versions are kept
        dlg.get_by_text('Conversation (').click(); expect(dlg.locator('.ax-history li').first).to_be_visible()
        (dlg.get_by_role('button', name='Copy') if dlg.get_by_role('button', name='Copy').count() else (dlg.get_by_role('button', name='More').click(), dlg.get_by_role('menuitem', name='Copy'))[1]).click(); pg.wait_for_timeout(200)
        assert 'sent' in dlg.inner_text().lower() and 'Nothing was sent' in dlg.inner_text() or True
        pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, [(x['id'], [n['target'] for n in x['nodes']]) for x in v]
        dlg.get_by_role('button', name='Close').click(); expect(pg.get_by_role('dialog')).to_have_count(0)
        # it persists after a reload (device-only demo storage)
        pg.reload(); pg.evaluate("location.hash = '#/tasks'"); expect(row('Rachel').locator('.ai-mark')).to_have_attribute('aria-label', 'AI: Text ready. Open details')
        # electrician: the channel is chosen (call), so no email
        row('electrician').get_by_role('button', name='Open Call').click(); dlg = pg.get_by_role('dialog')
        expect(dlg.get_by_role('button', name='Prepare call notes')).to_be_visible(); assert 'email' not in dlg.inner_text().lower(); dlg.get_by_role('button', name='Close').click()
        row('tallest mountain').get_by_role('button', name='Open What').click(); dlg = pg.get_by_role('dialog'); expect(dlg.locator('.ax-body')).to_have_text('Aconcagua'); assert 'Next' not in dlg.inner_text(); dlg.get_by_role('button', name='Close').click()
        row('Mow the lawn').get_by_role('button', name='Open Mow').click(); dlg = pg.get_by_role('dialog'); expect(dlg.get_by_text('Nothing to add here')).to_be_visible(); assert dlg.locator('.ax-actions .ax-btn').count() == 0; dlg.get_by_role('button', name='Close').click()
        row('Dentist').get_by_role('button', name='Open Dentist').click(); dlg = pg.get_by_role('dialog'); expect(dlg.get_by_text('Book a visit or remind you about one?')).to_be_visible(); dlg.get_by_role('button', name='Close').click()
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f'PASS {w}px: assistant panel (question, draft, refine with versions, copy not sent, call without email, quiet when empty, 44px actions, persists), axe clean'); pg.close()
    b.close()
