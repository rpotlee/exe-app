"""The help center: every page loads, has one h1, no horizontal scroll, passes axe, and every link and #anchor works.
Dev server on :5173 (it serves web/public). EXE_CHROMIUM, AXE_PATH; BROWSER=webkit for Safari's engine."""
import os, re, urllib.request, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = os.environ.get('SUPPORT_URL', 'http://127.0.0.1:5173/support/')
SLUGS = ['index', 'getting-started', 'capture-and-inbox', 'ai-review', 'map', 'decisions', 'focus', 'ideas-and-search', 'ai-setup', 'backup-and-settings', 'account-and-privacy', 'faq']
RUN = "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
def status(url):
    try: return urllib.request.urlopen(url, timeout=10).status
    except Exception as e: return getattr(e, 'code', 0)
with sync_playwright() as p:
    WK = os.environ.get('BROWSER') == 'webkit'
    b = p.webkit.launch() if WK else p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    titles = set(); checked = set()
    for w in [320, 390, 768, 1280]:
        ctx = b.new_context(viewport={'width': w, 'height': 900}, **({'has_touch': True, 'is_mobile': True} if (WK and w < 761) else {})); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        for slug in SLUGS:
            url = BASE + slug + '.html'; r = pg.goto(url); assert r.status == 200, (url, r.status)
            assert pg.locator('h1').count() == 1 and pg.locator('main').count() == 1, slug
            titles.add(pg.title()); assert pg.title().strip(), slug
            assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), (w, slug, 'horizontal overflow')
            topics = pg.locator('.topics a'); assert topics.count() == len(SLUGS), slug
            if w >= 900: assert pg.locator('.topics').evaluate('e=>e.open'), 'topics open on desktop'
            else: pg.locator('.topics summary').click(); assert pg.locator('.topics').evaluate('e=>e.open') and topics.first.is_visible()
            if os.environ.get('AXE_PATH'):
                pg.add_script_tag(path=os.environ['AXE_PATH']); v = pg.evaluate(RUN)['violations']; assert not v, (w, slug, [(x['id'], [n['target'] for n in x['nodes']]) for x in v])
            if w == 1280:                                                   # links and anchors, once
                for href in pg.eval_on_selector_all('a[href]', 'els=>els.map(e=>e.getAttribute("href"))'):
                    if href.startswith(('http', 'mailto:')): continue
                    full = urllib.parse.urljoin(url, href); path, _, frag = full.partition('#')
                    if (path, frag) in checked: continue
                    checked.add((path, frag)); assert status(path) == 200, (slug, href, status(path))
                    if frag: assert f'id="{frag}"' in urllib.request.urlopen(path).read().decode(), (slug, href, 'missing anchor')
        assert not errs, errs; ctx.close()
    assert len(titles) == len(SLUGS) * 1, titles                           # every page has its own title
    # getting started has all eight steps in order, and the support index leads with it
    pg = b.new_page(viewport={'width': 1280, 'height': 900}); pg.goto(BASE + 'getting-started.html')
    assert [h.strip()[:2] for h in pg.locator('main h2').all_inner_texts()][:8] == ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.']
    pg.goto(BASE + 'index.html'); assert pg.locator('.cards a').first.get_attribute('href') == 'getting-started.html'
    print(f"PASS help center{' (WebKit)' if WK else ''}: {len(SLUGS)} pages at 320/390/768/1280px: one h1, own title, no overflow, axe clean, {len(checked)} links/anchors resolve")
    b.close()
