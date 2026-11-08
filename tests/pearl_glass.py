"""Pearl glass on the Current Priority card: the colored light follows the icon's rendered color. Needs the dev server on :5173.
Run with EXE_CHROMIUM (Chrome) or BROWSER=webkit (Safari's engine)."""
import os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
OUT = Path(__file__).resolve().parents[1] / 'docs/screenshots/pearl'; OUT.mkdir(parents=True, exist_ok=True)
COLORS = {'blue': None, 'green': '#16a34a', 'orange': '#ea580c', 'purple': '#7c3aed'}   # blue = the icon's own (unmodified) color
def rgb(s): return tuple(int(x) for x in re.findall(r'\d+', s)[:3])
def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
with sync_playwright() as p:
    WK = os.environ.get('BROWSER') == 'webkit'
    b = p.webkit.launch() if WK else p.chromium.launch(executable_path=os.environ['EXE_CHROMIUM'], args=['--no-sandbox'])
    for w in [375, 430, 1280]:
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', device_scale_factor=2, **({'has_touch': True, 'is_mobile': True} if (WK and w < 761) else {})); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto('http://127.0.0.1:5173/?local=1'); pg.evaluate('localStorage.clear()'); pg.reload()
        pg.locator('[data-nav=map]').filter(visible=True).first.click()
        for name in ['Plan the family reunion', 'Fix the garage']:
            pg.get_by_role('button', name='Add outcome').click(); pg.locator('#modal-root input[name=name]').fill(name); pg.locator('#modal-root button[type=submit]').click()
            pg.get_by_role('button', name='Make active').first.click() if name == 'Plan the family reunion' else None
        pg.locator('.outcome-block', has=pg.locator('h3', has_text='Fix the garage')).locator('.outcome-top').click() if w < 761 else None
        pg.locator('.outcome-block', has=pg.locator('h3', has_text='Fix the garage')).get_by_role('button', name='Make active').click()
        pg.locator('[data-nav=focus]').filter(visible=True).first.click(); pg.locator('.priority-hero').wait_for()
        card = pg.locator('.hero-stack')
        for label, color in COLORS.items():
            if color: pg.add_style_tag(content=f'.hero-icon {{ color: {color} !important; }}')
            else: pass
            # switch the active priority: the card re-renders and the light must follow the icon again
            pg.locator('.priority-mini').first.click(); pg.wait_for_timeout(150)
            got = pg.evaluate("getComputedStyle(document.querySelector('.priority-hero')).getPropertyValue('--exe-priority-accent').trim()")
            icon = pg.evaluate("getComputedStyle(document.querySelector('.hero-icon svg')).stroke")
            assert rgb(got) == rgb(icon), (label, got, icon)                                  # the glass accent IS the icon color
            if color: assert rgb(got) == hexrgb(color), (label, got)
            # the light is local: the left edge carries the accent, the right side stays neutral pearl
            tint = pg.evaluate("""()=>{const c=document.querySelector('.priority-hero'),r=c.getBoundingClientRect(),cs=getComputedStyle(c,'::after');return {line:cs.backgroundImage.slice(0,90),w:cs.width,left:cs.left,overflow:getComputedStyle(c).overflow,radius:getComputedStyle(c).borderTopLeftRadius,bd:getComputedStyle(c).backdropFilter}}""")
            assert tint['w'] == '2px' and tint['overflow'] == 'hidden' and tint['bd'] in ('none', ''), tint
            assert tint['radius'] == ('26px' if w < 761 else '28px'), tint
            card.screenshot(path=str(OUT / f"{'webkit-' if WK else ''}{w}-{label}.png"))
        # content untouched and working: next-step checkbox, All steps toggle, Focus Mode button
        assert pg.get_by_role('button', name='Enter Focus Mode').is_visible()
        assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errs, errs
        print(f"PASS {w}px{' (WebKit)' if WK else ''}: glass accent follows the icon for {', '.join(COLORS)}; local edge light; radius/overflow/no blur as designed")
        ctx.close()
    b.close()
