"""AI Review actions (DEC-002): reject, not now, merge preview, undo, task placement, just a note. This is a simulation
(local keyword rules). Serve the repo on :8000 and set EXE_CHROMIUM."""
import os
import json
from playwright.sync_api import sync_playwright
STORE = 'exe-v1-local-workspace'
def S(page): return json.loads(page.evaluate(f"localStorage.getItem('{STORE}')"))
def nav(page, route): page.locator(f'[data-nav="{route}"]').filter(visible=True).first.click()
def cap(page, text):
    page.locator('[data-capture]').filter(visible=True).last.click(); page.get_by_label('Capture text').fill(text); page.locator('#capture-form button[type=submit]').click()
def card(page, text): return page.locator('.review-item').filter(has=page.locator('.review-original', has_text=text))
def aside(page, text): return page.locator('.review-aside .aside-row').filter(has_text=text)
def capt(page, text): return next(c for c in S(page)['captures'] if c['text'] == text)
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('EXE_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    for w in [320, 375, 390, 430, 768, 1024, 1280, 1440]:
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce'); page = ctx.new_page(); errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:8000/'); page.evaluate('localStorage.clear()'); page.reload()
        badge = lambda: page.locator('[data-dock-count]').filter(visible=True).inner_text() if page.locator('[data-dock-count]').filter(visible=True).count() else '0'
        # ---- duplicates are only proposed; preview changes nothing; merge keeps both captures and links them; undo restores both
        A, B = 'Order balloons for the party', 'Order the balloons for party'
        cap(page, A); cap(page, B); nav(page, 'review')
        assert 'Possible duplicate' in card(page, A).inner_text()
        card(page, A).locator('[data-merge-preview]').click()
        dialog = page.locator('#modal-root').inner_text(); assert A in dialog and B in dialog and 'Nothing is deleted' in dialog
        page.get_by_role('button', name='Cancel').click(); assert badge() == '2' and all(c['status'] == 'pending' for c in S(page)['captures'])
        card(page, A).locator('[data-merge-preview]').click(); page.locator('[data-merge-confirm]').click()
        page.locator('#placement-form [name=choice]').select_option('loose'); page.locator('#placement-form button[type=submit]').click()
        d = S(page); ca, cb = capt(page, A), capt(page, B)
        assert len(d['captures']) == 2 and ca['text'] == A and cb['text'] == B, 'neither original is deleted'
        assert cb['mergedInto'] == ca['id'] and ca['mergedWith'] == [cb['id']] and len(d['tasks']) == 1 and sorted(d['tasks'][0]['sources']) == sorted([ca['id'], cb['id']])
        assert badge() == '0'
        page.locator('[data-undo-approval]').click()
        d = S(page); assert d['tasks'] == [] and all(c['status'] == 'pending' and 'approval' not in c and 'mergedInto' not in c for c in d['captures']) and badge() == '2'
        # ---- reject: capture untouched, leaves the queue, same suggestion not repeated
        cap(page, 'Think about a garden shed'); nav(page, 'review')
        before = capt(page, 'Think about a garden shed')['text']
        card(page, 'garden shed').locator('[data-reject]').click()
        c = capt(page, 'Think about a garden shed'); assert c['text'] == before and c['review']['state'] == 'rejected' and c['rejectedFps'] and c['status'] == 'pending'
        assert card(page, 'garden shed').count() == 0 and 'Rejected' in aside(page, 'garden shed').inner_text()
        aside(page, 'garden shed').locator('[data-review-again]').click()
        assert 'rejected this exact suggestion' in card(page, 'garden shed').inner_text() and card(page, 'garden shed').locator('[data-approve]').is_disabled()
        card(page, 'garden shed').locator('[data-review-field=type]').select_option('Idea'); assert card(page, 'garden shed').locator('[data-approve]').is_enabled()
        card(page, 'garden shed').locator('[data-approve]').click()
        assert len(S(page)['ideas']) == 1 and S(page)['ideas'][0]['sources'] == [capt(page, 'Think about a garden shed')['id']]
        # ---- not now: leaves the queue, keeps everything, comes back with no penalty
        cap(page, 'Look into a new phone plan'); nav(page, 'review')
        card(page, 'phone plan').locator('[data-defer]').click()
        assert 'Not now' in aside(page, 'phone plan').inner_text() and 'review' in capt(page, 'Look into a new phone plan')
        aside(page, 'phone plan').locator('[data-review-again]').click(); assert card(page, 'phone plan').count() == 1 and 'rejected' not in card(page, 'phone plan').inner_text().lower()
        # ---- just a note: kept as a note, nothing created
        counts = {k: len(S(page)[k]) for k in ['tasks', 'outcomes', 'decisions', 'ideas']}
        card(page, 'phone plan').locator('[data-review-field=type]').select_option('Note'); card(page, 'phone plan').locator('[data-approve]').click()
        assert {k: len(S(page)[k]) for k in counts} == counts and capt(page, 'Look into a new phone plan')['organizedAs'] == 'Note'
        # ---- a step with no matching outcome asks; nothing is created silently
        cap(page, 'Book the caterer'); cap(page, 'Hire a photographer'); nav(page, 'review')
        card(page, 'caterer').locator('[data-approve]').click(); assert 'Where does this step go' in page.locator('#modal-root').inner_text()
        page.locator('#placement-form [name=choice]').select_option('create'); page.locator('#placement-form [name=name]').fill('Event vendors'); page.locator('#placement-form button[type=submit]').click()
        d = S(page); o = next(o for o in d['outcomes'] if o['name'] == 'Event vendors'); t = next(t for t in d['tasks'] if t['name'] == 'Book the caterer')
        assert t['outcome'] == o['id'] and [a['lane'] for a in d['focusAssignments'] if a['outcome'] == o['id']] == ['later'] and not any(x['name'] == 'Unsorted work' for x in d['outcomes'])
        card(page, 'photographer').locator('[data-approve]').click(); page.locator('#placement-form [name=choice]').select_option('existing'); page.locator('#placement-form [name=outcome]').select_option(o['id']); page.locator('#placement-form button[type=submit]').click()
        assert next(t for t in S(page)['tasks'] if t['name'] == 'Hire a photographer')['outcome'] == o['id'] and len(S(page)['outcomes']) == 1
        # ---- undo is refused once the work has moved on, and says why
        d = S(page); next(t for t in d['tasks'] if t['name'] == 'Hire a photographer')['done'] = True
        page.evaluate('([k,v])=>localStorage.setItem(k,v)', [STORE, json.dumps(d)]); page.reload(); nav(page, 'review')
        page.locator('.aside-row').filter(has_text='photographer').locator('[data-undo-approval]').click()
        assert 'worked on' in page.locator('#toast').inner_text() and any(t['name'] == 'Hire a photographer' for t in S(page)['tasks'])
        if os.environ.get('AXE_PATH'):
            cap(page, 'Plan the menu for friday'); cap(page, 'Plan menu for the friday'); nav(page, 'review'); card(page, 'menu').first.locator('[data-defer]').click()
            page.add_script_tag(path=os.environ['AXE_PATH']); v = page.evaluate(RUN)['violations']; assert not v, [(x['id'], [n['target'] for n in x['nodes']]) for x in v]
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errors, errors
        ctx.close(); print(f'PASS {w}px: AI Review reject, not now, merge preview/confirm, undo, placement prompt, just a note, axe')
    b.close()
