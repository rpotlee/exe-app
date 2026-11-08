"""Existing workflow regression checks; run with python3 tests/baseline.py."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width, name in [(1280, 'desktop'), (390, 'mobile')]:
        context = browser.new_context(viewport={'width': width, 'height': 900})
        page = context.new_page()
        page.goto('http://127.0.0.1:8000')
        page.get_by_role('heading', name='Mission Status', exact=True).wait_for()
        state = json.loads(page.evaluate("localStorage.getItem('exe-v1-local-workspace')"))
        assert len(state['captures']) == 18
        assert not any(t['done'] for t in state['tasks'])
        assert len([a for a in state['focusAssignments'] if a['lane'] == 'now']) == 3
        for nav in ['inbox', 'review', 'map', 'decisions', 'focus']:
            page.locator(f'[data-nav="{nav}"]').filter(visible=True).first.click()
            assert page.locator('#view').inner_text().strip()
        if '--record' in sys.argv:
            page.screenshot(path=str(ROOT / 'docs/screenshots' / f'before-{name}.png'), full_page=True)
        if name == 'desktop' and '--record' in sys.argv:
            (ROOT / 'docs/baseline-example.json').write_text(json.dumps(state, indent=2) + '\n')
        context.close()
    browser.close()
print('PASS baseline: 2 viewports, five routes, 18 captures, three Now priorities, no completed seed tasks')
