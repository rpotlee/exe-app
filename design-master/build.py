"""Build three independent semantic HTML reference screens from shared partials."""
from pathlib import Path
from string import Template
from html import escape
ROOT=Path(__file__).resolve().parent

def icon(name):
    return f'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="icons.svg#{name}"></use></svg>'

def partial(name,**values):
    values.update({f'{n}_icon':icon(n) for n in ['building','focus','chevron','layers','plus']})
    return Template((ROOT/'partials'/f'{name}.html').read_text()).substitute(values)

TASKS=['Verify registration path and filing status','Record the applicable publication deadline after verifying effective date','Review filing and publication requirements']
CAPTURES=[
'Have Claude optimize Altr’s site for SEO. Example: Rename images and alt captions',
'Register the business in NYC',
'Understand nyc publication requirements and how long I have to do get this done. Is it immediate?',
'SEO optimization',
'Look into insurance coverage for business',
'Figure out the phone system. Do I need twilio',
'Perform a full code scan on the entire app',
'Create a reviews section.',
'Figure out the area in ny that will be our first service area.',
'Create a list of competitor pricing','Finalize pricing / pricing strategy','Design hiring process',
'Design and create backend component that will support hiring process','Sign up for thumbtack pro',
'What should the most basic version of our backend do right now?','Add service locations to website',
'Think of creative ways to incentivize partners.',
'It may be worthwhile to provide Spanish-language recruitment materials and onboarding support, alongside English-language options.']
NAV=[('focus','Focus'),('inbox','Inbox'),('review','AI Review'),('map','Map'),('decisions','Decisions')]

def navigation(selected):
    items=[]
    for key,label in NAV:
        attrs=f'class="dock-item {"selected" if key==selected else ""}"'
        if key==selected:attrs+=' aria-current="page"'
        if key in ['focus','inbox']:
            item=f'<a {attrs} href="mobile-{key}.html">{icon(key)}<span>{label}</span></a>'
        else:item=f'<button type="button" {attrs} title="Reference control; no screen is implemented here">{icon(key)}<span>{label}</span></button>'
        items.append(item)
    return partial('navigation',navigation_items=''.join(items))

def focus_content(desktop=False):
    steps=''.join(f'<label class="priority-step"><input type="checkbox" aria-label="{escape(t)}"><span>{escape(t)}</span></label>' for t in (TASKS if desktop else TASKS[:1]))
    if not desktop:steps+=f'<button class="step-disclosure" type="button" aria-label="Show checklist steps">{icon("chevron")}</button>'
    heading='<header class="screen-heading"><p class="workspace-eyebrow">ALTR WORKSPACE</p><h1>Mission Status</h1><p class="status-line">1 in focus · 3 active · 0 awaiting AI Review.</p></header>'
    return heading+partial('current-priority',priority_steps=steps,progress=0)+partial('secondary-priorities')

def header():
    return f'<header class="mobile-header">{partial("brand")}<button class="bell-button" type="button" aria-label="AI Review, 0 pending">{icon("bell")}</button></header>'

focus_body=f'<div class="mobile-canvas">{header()}<main class="mobile-content" id="main">{focus_content()}</main>{navigation("focus")}</div>'
(ROOT/'mobile-focus.html').write_text(partial('screen',title='Mobile Focus',screen_class='mobile-screen',body=focus_body))
rows=[]
for i,text in enumerate(CAPTURES,1):
    rows.append(f'<li class="checklist-row" data-component="inbox-row"><label><input type="checkbox" aria-label="Complete {escape(text)}"><span>{escape(text)}</span></label><details class="row-actions"><summary aria-label="Actions for {escape(text)}">{icon("more")}</summary><div class="action-panel"><p>Original capture · Organized<br>Checklist completion is independent.</p><button type="button">Edit</button><button type="button">Archive</button></div></details></li>')
inbox_heading='<header class="screen-heading inbox-heading"><h1>Inbox</h1><p class="status-line">Raw ideas, tasks, and reminders.</p></header>'
filters='<div class="filters" role="group" aria-label="Filter to-dos"><button type="button" class="selected" aria-pressed="true">All <span>18</span></button><button type="button" aria-pressed="false">Active <span>18</span></button><button type="button" aria-pressed="false">Done <span>0</span></button></div>'
add=f'<form class="inline-add" onsubmit="return false">{icon("plus")}<input aria-label="Add a to-do" placeholder="Add a to-do…"><button type="button" aria-label="Add to-do">{icon("enter")}</button></form>'
inbox_body=f'<div class="mobile-canvas">{header()}<main class="mobile-content" id="main">{inbox_heading}{filters}{add}<ul class="checklist">{"".join(rows)}</ul></main>{navigation("inbox")}</div>'
(ROOT/'mobile-inbox.html').write_text(partial('screen',title='Mobile Inbox',screen_class='mobile-screen',body=inbox_body))
links=''.join(f'<button class="sidebar-link {"selected" if key=="focus" else ""}" type="button">{icon(key)}<span>{"Project Map" if key=="map" else label}</span></button>' for key,label in NAV)
sidebar=f'<aside class="sidebar">{partial("brand")}<nav class="sidebar-navigation" aria-label="Primary navigation">{links}</nav><div class="sidebar-footer"><button type="button" class="sidebar-link">{icon("search")}<span>Search</span></button><button type="button" class="sidebar-link">{icon("settings")}<span>Settings</span></button><button type="button" class="workspace-switch"><span class="avatar">A</span><span>Altr Workspace</span>{icon("down")}</button></div></aside>'
desktop_body=f'<div class="desktop-canvas">{sidebar}<main class="desktop-content" id="main">{focus_content(True)}</main></div>'
(ROOT/'desktop-focus.html').write_text(partial('screen',title='Desktop Focus',screen_class='desktop-screen',body=desktop_body))
print('Built 3 standalone HTML screens; all initial progress is zero.')
