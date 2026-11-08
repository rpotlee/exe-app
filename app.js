/* Exe — interaction-first local prototype. No external APIs, accounts, or AI calls. */
(() => {
  'use strict';
  const STORE = 'exe-v1-local-workspace';
  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const newId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const ICONS = {
    'target':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    'crosshair':'<circle cx="12" cy="12" r="6.6"/><circle cx="12" cy="12" r="2.1"/><path d="M12 2.4v3.2M12 18.4v3.2M2.4 12h3.2M18.4 12h3.2"/>',
    'inbox':'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
    'sparkles':'<path d="M12 5.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5Z"/>',
    'network':'<circle cx="12" cy="5" r="2.6"/><circle cx="5.2" cy="18.4" r="2.6"/><circle cx="18.8" cy="18.4" r="2.6"/><path d="m10.9 7.4-4.6 8.6m6.8-8.6 4.6 8.6"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>',
    'git-branch':'<circle cx="5.5" cy="5" r="2.4"/><circle cx="18.5" cy="5" r="2.4"/><path d="M5.5 7.4c0 4.2 6.5 3.6 6.5 8v4.6m6.5-12.6c0 4.2-6.5 3.6-6.5 8"/><circle cx="12" cy="21" r=".8" fill="currentColor"/>',
    'plus':'<path d="M12 5v14M5 12h14"/>','x':'<path d="M18 6 6 18M6 6l12 12"/>','chevron-down':'<path d="m6 9 6 6 6-6"/>','chevron-right':'<path d="m9 18 6-6-6-6"/>','chevron-left':'<path d="m15 18-6-6 6-6"/>',
    'chevrons-up-down':'<path d="m7 10 5-5 5 5m-10 4 5 5 5-5"/>','cloud':'<path d="M20 16.6A4.5 4.5 0 0 0 18 8a6 6 0 0 0-11.5 1.8A4.4 4.4 0 0 0 7 19h11"/>',
    'search':'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>','shield-check':'<path d="m12 22 8-4V6l-8-4-8 4v12l8 4Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    'briefcase':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
    'map-pin':'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
    'layers':'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    'bell':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',
    'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>','clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'alert-triangle':'<path d="m10.3 3.9-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5m0 4h.01"/>',
    'calendar-days':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    'arrow-right':'<path d="M5 12h14m-6-6 6 6-6 6"/>','arrow-left':'<path d="M19 12H5m6-6-6 6 6 6"/>',
    'lightbulb':'<path d="M9 18h6m-5 4h4m-5-5c0-3-4-4.2-4-8a7 7 0 0 1 14 0c0 3.8-4 5-4 8"/>',
    'edit-3':'<path d="M12 20h9M3 17 16 4a2.1 2.1 0 0 1 3 3L6 20H3v-3Z"/>',
    'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
    'check':'<path d="m5 12 4 4L19 6"/>','arrow-up-right':'<path d="M7 17 17 7M8 7h9v9"/>','link':'<path d="M10 13a5 5 0 0 0 7.8.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.8-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>',
    'rotate-ccw':'<path d="M3 11a9 9 0 1 1 2 6M3 4v7h7"/>', 'more-horizontal':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    'archive':'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>',
    'list-checks':'<path d="m3 7 2 2 3-3M12 7h9M3 17l2 2 3-3m4 1h9"/>',
    'check-check':'<path d="m3 12 4 4 7-8m0 7 2 2 5-5"/>',
    'circle-help':'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 4h.01"/>',
    'building':'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-4h4v4"/>',
    'users':'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1"/>',
    'chart':'<path d="M3 3v18h18M7 16l5-6 4 3 5-7"/>','code':'<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16"/>',
    'megaphone':'<path d="m3 11 13-6v14L3 13v-2ZM16 8a4 4 0 0 1 0 8M5 14l2 7h4l-2-6"/>',
    'settings':'<circle cx="12" cy="12" r="3"/><path d="M19.2 15.5 21 17l-2 3-2.4-1a8 8 0 0 1-3 1L13 22h-2l-.6-2a8 8 0 0 1-3-1L5 20l-2-3 1.8-1.5a8 8 0 0 1 0-7L3 7l2-3 2.4 1a8 8 0 0 1 3-1L11 2h2l.6 2a8 8 0 0 1 3 1L19 4l2 3-1.8 1.5a8 8 0 0 1 0 7Z"/>',
    'lock':'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    'info':'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    'alert-circle':'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5m0 3h.01"/>',
    'corner-down-left':'<path d="M20 5v7a3 3 0 0 1-3 3H5m5-5-5 5 5 5"/>'
  };
  function icon(name, attrs=''){ return `<svg ${attrs} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS['circle-help']}</svg>`; }
  function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
  const streams = [
    {id:'foundation',name:'Business foundation',icon:'building',description:'Formation, registration, compliance and coverage'},
    {id:'market',name:'Market & pricing',icon:'chart',description:'Service-area research, competitor pricing and economics'},
    {id:'partners',name:'Partner operations',icon:'users',description:'Recruitment, screening, onboarding and retention'},
    {id:'technology',name:'Technology',icon:'code',description:'Backend, communications and code quality'},
    {id:'growth',name:'Customer acquisition',icon:'megaphone',description:'Website SEO, reviews, locations and lead generation'}
  ];
  const outcomes = [
    {id:'registration',stream:'foundation',name:'Confirm New York business registration',description:'Verify filing status, applicable registration requirements and publication obligations.'},
    {id:'insurance',stream:'foundation',name:'Establish suitable insurance coverage',description:'Select coverage appropriate to actual services and operating footprint.'},
    {id:'market-select',stream:'market',name:'Determine first service area',description:'Choose a launch area using demand, provider supply, competition and economics.'},
    {id:'pricing',stream:'market',name:'Validate and finalize local pricing',description:'Use competitive intelligence and provider costs to set a defensible price.'},
    {id:'backend',stream:'technology',name:'Define Backend V1',description:'Specify the minimum end-to-end booking, matching, dispatch and completion process.'},
    {id:'security',stream:'technology',name:'Complete code and security review',description:'Assess the app before production deployment.'},
    {id:'communications',stream:'technology',name:'Design customer and contractor communications',description:'Determine phone, SMS and communication process requirements.'},
    {id:'hiring',stream:'partners',name:'Establish a partner hiring and onboarding process',description:'Recruit and validate service providers using a defined process and supporting backend.'},
    {id:'seo',stream:'growth',name:'Optimize Altr website SEO',description:'Foundational SEO with descriptive images and useful location content.'},
    {id:'locations',stream:'growth',name:'Publish service-area website content',description:'Add only confirmed operating areas.'},
    {id:'reviews',stream:'growth',name:'Create a reviews section',description:'Use authentic, permissioned customer testimonials when available.'},
    {id:'thumbtack',stream:'growth',name:'Evaluate Thumbtack Pro',description:'Consider lead costs when the business is able to fulfill bookings.'}
  ];
  const tasks = [
    {id:'reg-route',outcome:'registration',name:'Verify registration path and filing status',done:false},
    {id:'reg-deadline',outcome:'registration',name:'Record the applicable publication deadline after verifying effective date',done:false},
    {id:'reg-requirements',outcome:'registration',name:'Review filing and publication requirements',done:false},
    {id:'market-criteria',outcome:'market-select',name:'Define service-area selection criteria',done:false},
    {id:'market-shortlist',outcome:'market-select',name:'Shortlist candidate New York markets',done:false},
    {id:'market-compare',outcome:'market-select',name:'Compare provider supply, demand and potential profitability',done:false},
    {id:'backend-map',outcome:'backend',name:'Map booking intake through fulfillment',done:false},
    {id:'backend-match',outcome:'backend',name:'Define provider matching and dispatch requirements',done:false},
    {id:'backend-exceptions',outcome:'backend',name:'Define cancellation and exception handling',done:false},
    {id:'backend-manual',outcome:'backend',name:'Decide which steps are manual vs. automated',done:false},
    {id:'insurance-research',outcome:'insurance',name:'Research coverage relevant to Altr’s operating model',done:false},
    {id:'insurance-quotes',outcome:'insurance',name:'Compare insurance quotes and coverage terms',done:false},
    {id:'competitors',outcome:'pricing',name:'Create a competitor pricing list for candidate markets',done:false},
    {id:'pricing-final',outcome:'pricing',name:'Finalize prices and contribution-margin assumptions',done:false},
    {id:'hiring-process',outcome:'hiring',name:'Design partner screening and onboarding process',done:false},
    {id:'hiring-backend',outcome:'hiring',name:'Build backend support for the approved hiring process',done:false,blockedBy:['hiring-process']},
    {id:'communication-system',outcome:'communications',name:'Figure out the phone system and whether Twilio is necessary',done:false},
    {id:'code-scan',outcome:'security',name:'Run full app code and security scan',done:false},
    {id:'seo-base',outcome:'seo',name:'Audit and improve foundational on-page SEO',done:false},
    {id:'seo-images',outcome:'seo',name:'Rename images and add accurate descriptive alt text',done:false},
    {id:'locations-site',outcome:'locations',name:'Add confirmed service areas to the website',done:false,blockedBy:['market-shortlist']},
    {id:'reviews-site',outcome:'reviews',name:'Create a customer reviews section for genuine reviews',done:false},
    {id:'thumbtack-eval',outcome:'thumbtack',name:'Evaluate Thumbtack Pro costs and lead quality before signup',done:false}
  ];
  const decisions = [
    {id:'decision-market',stream:'market',name:'Which New York service area should Altr launch in first?',status:'open',description:'Compare demand, provider availability, competition and potential net profit.',options:['Candidate market A','Candidate market B','Candidate market C'],notes:'',selected:''},
    {id:'decision-backend',stream:'technology',name:'What is the minimum viable backend for launch?',status:'open',description:'Choose essential booking, partner matching, dispatch and support workflows.',options:['Manual-first with limited automation','More automated dispatch at launch'],notes:'',selected:''},
    {id:'decision-pricing',stream:'market',name:'What pricing structure produces healthy margins?',status:'open',description:'Use contractor costs and local competitor prices to evaluate options.',options:['Flat-rate tiers','Size-based pricing','Hybrid pricing'],notes:'',selected:''},
    {id:'decision-phone',stream:'technology',name:'Does Altr need Twilio or a simpler phone system?',status:'open',description:'Define calls, SMS dispatch, notifications, tracking and support needs before choosing technology.',options:['Business phone provider','Twilio-based messaging','Combination of both'],notes:'',selected:''},
    {id:'decision-partners',stream:'partners',name:'What incentives will attract and retain partners?',status:'open',description:'Assess partner earnings, payout reliability, schedule fit and recruitment needs.',options:['Predictable payouts','Volume-based incentives','Preferred-partner benefits'],notes:'',selected:''}
  ];
  const ideas = [
    {id:'spanish',stream:'partners',name:'Offer Spanish-language recruitment and onboarding materials',notes:'Preserve an accessible English option as well.'},
    {id:'incentives',stream:'partners',name:'Explore additional creative partner incentives',notes:'Evaluate cost and appeal before committing.'}
  ];
  const relationships = [
    {from:'market-select',to:'pricing',kind:'informs',description:'Local economics inform pricing'},
    {from:'market-select',to:'locations',kind:'blocks',description:'Confirm locations before publishing coverage'},
    {from:'hiring-process',to:'hiring-backend',kind:'blocks',description:'Approve the process before implementing it'},
    {from:'backend',to:'communications',kind:'informs',description:'Communication workflows inform provider selection'},
    {from:'decision-pricing',to:'pricing',kind:'related',description:'Pricing decision guides pricing work'}
  ];
  const raw = [
    'Have Claude optimize Altr’s site for SEO. Example: Rename images and alt captions',
    'Register the business in NYC',
    'Understand nyc publication requirements and how long I have to do get this done. Is it immediate?',
    'SEO optimization',
    'Look into insurance coverage for business',
    'Figure out the phone system. Do I need twilio',
    'Perform a full code scan on the entire app',
    'Create a reviews section.',
    'Figure out the area in ny that will be our first service area.',
    'Create a list of competitor pricing',
    'Finalize pricing / pricing strategy',
    'Design hiring process',
    'Design and create backend component that will support hiring process',
    'Sign up for thumbtack pro',
    'What should the most basic version of our backend do right now?',
    'Add service locations to website',
    'Think of creative ways to incentivize partners.',
    'It may be worthwhile to provide Spanish-language recruitment materials and onboarding support, alongside English-language options.'
  ];
  const seed = () => ({version:1,workstreams:streams,outcomes,tasks,decisions,ideas,relationships,
    captures:raw.map((text,i)=>({id:`original-${i+1}`,text,status:'organized',createdAt:'Imported example',source:'Altr brain dump'})),
    focusAssignments:[{outcome:'registration',lane:'now'},{outcome:'market-select',lane:'now'},{outcome:'backend',lane:'now'},
      ...['insurance','pricing','hiring','communications','security','seo','locations'].map(outcome=>({outcome,lane:'next'})),
      ...['reviews','thumbtack'].map(outcome=>({outcome,lane:'later'}))], currentPriority:'registration',selectedStream:'foundation',selectedDecision:'decision-market',page:'focus'});
  /* Fills fields added after a workspace was saved; never removes or renames user data. */
  function migrate(d){d.priorityReview=d.priorityReview||{suggestion:null,dismissed:[],lastRun:null};d.audit=d.audit||[];return d;}
  function load(){try{const v=JSON.parse(localStorage.getItem(STORE));if(v?.version===1&&Array.isArray(v.workstreams)&&Array.isArray(v.focusAssignments))return migrate(v);}catch{}return migrate(seed());}
  let data=load();let overlay=null;let flashTimer;let lastFocus=null;let returnToFocus=null;let inboxFilter='all';let showArchived=false;let focusOrigin=null;let captureContext=null;const expandedCaptures=new Set();
  const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(data));}catch{ /* storage may be disabled */ }};
  const byOutcome=id=>data.outcomes.find(o=>o.id===id);
  const byStream=id=>data.workstreams.find(w=>w.id===id);
  const getTasks=id=>data.tasks.filter(t=>t.outcome===id);
  const byTask=id=>data.tasks.find(t=>t.id===id);
  const laneOf=id=>data.focusAssignments.find(a=>a.outcome===id)?.lane||'later';
  const completed=id=>getTasks(id).filter(t=>t.done).length;
  const progress=id=>getTasks(id).length?Math.round(completed(id)/getTasks(id).length*100):0;
  const pending=()=>data.captures.filter(c=>c.status==='pending');
  const blocked=t=>!t.done&&!!t.blockedBy?.some(id=>!byTask(id)?.done);
  const blockedCount=()=>data.tasks.filter(blocked).length;
  /* an outcome is blocked only by a user-confirmed 'blocks' relationship whose source is still unfinished */
  const outcomeBlocker=id=>{const r=data.relationships.find(r=>r.kind==='blocks'&&r.confirmed!==false&&r.to===id&&!isDone(r.from));return r?(byTask(r.from)||byOutcome(r.from)||data.decisions.find(d=>d.id===r.from)):null;};
  const isDone=id=>{const t=byTask(id);if(t)return t.done;const d=data.decisions.find(d=>d.id===id);if(d)return d.status!=='open';return false;};
  /* A raw capture is shown as Blocked only when it maps to a task with a user-declared, unfinished blocker. */
  const CAPTURE_TASKS={'original-13':'hiring-backend','original-16':'locations-site'};
  const captureTask=c=>byTask(c.taskId||CAPTURE_TASKS[c.id]);
  const captureBlocker=c=>{const t=captureTask(c);return t&&blocked(t)?t.blockedBy.map(byTask).find(b=>b&&!b.done):null;};
  const liveCaptures=()=>data.captures.filter(c=>!c.archivedAt);
  const activeCaptureCount=()=>liveCaptures().filter(c=>!c.completedAt).length;
  const badgeText=n=>n>99?'99+':String(n);
  const activeIds=()=>data.focusAssignments.filter(a=>a.lane==='now').map(a=>a.outcome);
  const laneIds=lane=>data.focusAssignments.filter(a=>a.lane===lane).map(a=>a.outcome);
  const niceDate=date=>{if(!date||date==='Imported example')return 'Imported';try{return new Date(date).toLocaleDateString(undefined,{month:'short',day:'numeric'});}catch{return ''}};
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(flashTimer);flashTimer=setTimeout(()=>t.classList.remove('show'),2400);}
  function checkItem(t){return `<label class="check-row"><input type="checkbox" data-task-check="${esc(t.id)}" ${t.done?'checked':''} aria-label="Mark ${esc(t.name)} complete"/><span>${esc(t.name)}</span>${blocked(t)?`<span class="pill red" title="Blocked by an unfinished task">${icon('lock')} Blocked</span>`:''}</label>`;}
  /* Hero progress: one continuous track with a divider per step; the fill animates from its previous value. */

  /* True glass refraction (Chromium only). An SVG displacement map, generated to match the element's
     exact rounded shape, bends the backdrop along the edges like a lens bevel. It is applied as
     backdrop-filter: url(#...). Safari and Firefox cannot do this, so they keep the blur-only glass. */
  const REFRACT={
    on:/Chrome\//.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)&&!matchMedia('(prefers-reduced-transparency: reduce)').matches,
    scale:46, blur:5
  };
  function refractionMap(w,h,r,bevel){
    const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d'),img=cx.createImageData(w,h),d=img.data;
    const hw=w/2,hh=h/2,rr=Math.min(r,hw,hh);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const px=x+.5-hw,py=y+.5-hh,qx=Math.abs(px)-(hw-rr),qy=Math.abs(py)-(hh-rr);
      let nx,ny,dist;
      if(qx>0&&qy>0){const l=Math.hypot(qx,qy);nx=Math.sign(px)*qx/l;ny=Math.sign(py)*qy/l;dist=rr-l;}
      else if(qx>qy){nx=Math.sign(px);ny=0;dist=-qx;}
      else{nx=0;ny=Math.sign(py);dist=-qy;}
      let m=0;if(dist>=0&&dist<bevel){const t=1-dist/bevel;m=t*t;}
      const o=(y*w+x)*4;d[o]=Math.round(128-127*m*nx);d[o+1]=Math.round(128-127*m*ny);d[o+2]=128;d[o+3]=255;
    }
    cx.putImageData(img,0,0);return c.toDataURL('image/png');
  }
  function refractionDefs(){
    if(document.getElementById('exe-refraction-defs'))return;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('id','exe-refraction-defs');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none';
    const f=(id,blur)=>`<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="${REFRACT.scale}" xChannelSelector="R" yChannelSelector="G" result="bent"/><feGaussianBlur in="bent" stdDeviation="${blur}"/></filter>`;
    svg.innerHTML=`<defs>${f('exe-refract-hero',REFRACT.blur)}${f('exe-refract-edge',.6)}</defs>`;
    document.body.appendChild(svg);
  }
  function refractEl(el,id,bevel){
    if(!REFRACT.on||!el||!el.offsetParent&&getComputedStyle(el).position!=='fixed')return;
    const r=el.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);
    if(w<2||h<2)return;
    if(el.__rw===w&&el.__rh===h&&el.style.backdropFilter)return;
    el.__rw=w;el.__rh=h;
    const rad=parseFloat(getComputedStyle(el).borderTopLeftRadius)||parseFloat(getComputedStyle(el.parentElement).borderTopLeftRadius)||28,fi=document.getElementById(id).querySelector('feImage');
    fi.setAttribute('width',w);fi.setAttribute('height',h);fi.setAttribute('href',refractionMap(w,h,rad,bevel));
    el.style.backdropFilter='none';
    requestAnimationFrame(()=>{el.style.backdropFilter=id==='exe-refract-edge'?`url(#${id})`:`url(#${id}) saturate(190%)`;});
  }
  let refractObserver=null;
  function refreshRefraction(){
    if(!REFRACT.on)return;
    refractionDefs();
    const hero=document.querySelector('.priority-hero');
    const lens=document.querySelector('.hero-lens'),dark=document.documentElement.dataset.theme==='dark';
    if(dark)refractEl(hero,'exe-refract-hero',30);else if(hero&&hero.style.backdropFilter)hero.style.backdropFilter='';
    refractEl(lens,'exe-refract-edge',16);
    if(!refractObserver&&window.ResizeObserver){refractObserver=new ResizeObserver(()=>requestAnimationFrame(refreshRefraction));}
    if(refractObserver){refractObserver.disconnect();[hero,lens].forEach(e=>e&&refractObserver.observe(e));}
  }

  /* ---------- Priority Engine (DEC-003 P-07) ----------
     Suggestion-only. Fixed rule order, first rule that separates two outcomes wins, no numeric score:
     1 pinned by the user · 2 not blocked by a confirmed blocker · 3 earliest user-entered deadline
     4 unlocks the most confirmed dependent work · 5 has a ready next step · 6 most recently worked on.
     Runs only on meaningful events (task done, decision resolved, deadline/pin set, blocker confirmed or cleared)
     and when the user asks; never on a new capture. Ties keep the current Now outcomes in place. */
  const fmtDate=d=>{try{return new Date(d+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}catch{return d;}};
  const unlocksOf=id=>{const own=new Set([id,...getTasks(id).map(t=>t.id)]);return data.relationships.filter(r=>r.kind==='blocks'&&r.confirmed!==false&&own.has(r.from)&&!own.has(r.to)&&!(byTask(r.to)&&own.has(byTask(r.to).outcome))&&!(byTask(r.to)?.done)).length;};
  const hasReadyStep=id=>getTasks(id).some(t=>!t.done&&!blocked(t));
  const engineFacts=id=>{const o=byOutcome(id);return {id,pinned:!!o.pinned,blocked:!!outcomeBlocker(id),deadline:o.deadline||'',unlocks:unlocksOf(id),ready:hasReadyStep(id),worked:o.lastWorkedAt||''};};
  const ruleWords={
    pinned:()=>'You pinned it.',
    unblocked:()=>'It is not held up by a confirmed blocker; the other one is.',
    deadline:(w,l)=>l.deadline?`Its deadline (${fmtDate(w.deadline)}) comes before the other one's (${fmtDate(l.deadline)}).`:`It has a deadline you entered (${fmtDate(w.deadline)}); the other has none.`,
    unlocks:(w,l)=>`Finishing it unlocks ${w.unlocks} confirmed dependent ${w.unlocks===1?'item':'items'}; the other unlocks ${l.unlocks}.`,
    ready:()=>'It has a ready next step; the other does not.',
    worked:()=>'You worked on it more recently.'
  };
  /* returns {win:1|-1|0, rule} comparing facts a and b; higher is better on every rule */
  function compareFacts(a,b){
    const rules=[['pinned',+a.pinned,+b.pinned],['unblocked',+!a.blocked,+!b.blocked],['deadline',a.deadline?-Date.parse(a.deadline):-Infinity,b.deadline?-Date.parse(b.deadline):-Infinity],['unlocks',a.unlocks,b.unlocks],['ready',+a.ready,+b.ready],['worked',a.worked?Date.parse(a.worked):0,b.worked?Date.parse(b.worked):0]];
    for(const [rule,x,y] of rules)if(x!==y)return {win:x>y?1:-1,rule};
    return {win:0,rule:null};
  }
  const whyWins=(w,l)=>{const c=compareFacts(w,l);return c.rule?ruleWords[c.rule](w,l):'';};
  function rankOutcomes(){const now=new Set(activeIds());return data.outcomes.map((o,i)=>({f:engineFacts(o.id),i})).sort((x,y)=>{const c=compareFacts(x.f,y.f);if(c.win)return -c.win;const n=now.has(y.f.id)-now.has(x.f.id);return n||x.i-y.i;}).map(x=>x.f);}
  /* the reason an outcome deserves an open Now slot even when nothing else is being replaced */
  const openSlotReason=f=>f.blocked?'':f.pinned?'You pinned it.':f.deadline?`It has a deadline you entered (${fmtDate(f.deadline)}).`:f.unlocks?`Finishing it unlocks ${f.unlocks} confirmed dependent ${f.unlocks===1?'item':'items'}.`:'';
  function computeSuggestion(){
    const ranked=rankOutcomes(),top=ranked.slice(0,3).map(f=>f.id),now=activeIds();
    const enter=top.filter(id=>!now.includes(id)),leave=now.filter(id=>!top.includes(id)),facts=Object.fromEntries(ranked.map(f=>[f.id,f])),changes=[];
    enter.forEach(id=>{const out=leave.shift();if(out)changes.push({add:id,remove:out,why:whyWins(facts[id],facts[out])});else if(now.length+changes.filter(c=>!c.remove).length<3){const why=openSlotReason(facts[id]);if(why)changes.push({add:id,remove:null,why});}});
    if(!changes.length)return null;
    const fp=JSON.stringify(changes.map(c=>[c.add,c.remove,facts[c.add],c.remove&&facts[c.remove]]));
    return {changes,fp,at:new Date().toISOString()};
  }
  function runPriorityEngine(manual=false){
    const pr=data.priorityReview,next=computeSuggestion();
    pr.lastRun=new Date().toISOString();
    pr.suggestion=next&&!pr.dismissed.includes(next.fp)?next:null;
    pr.lastResult=pr.suggestion?'suggestion':next?'ignored':'none';
    return manual;
  }
  /* a stored suggestion is dropped when the board it was computed from no longer matches */
  function liveSuggestion(){const pr=data.priorityReview,sg=pr.suggestion;if(!sg||sg.deferred)return null;const now=activeIds();return sg.changes.every(c=>byOutcome(c.add)&&!now.includes(c.add)&&(!c.remove||now.includes(c.remove)))?sg:null;}
  function prioritySuggestionCard(){
    const sg=liveSuggestion(),pr=data.priorityReview;
    if(!sg){const note=!pr.lastRun?'':pr.suggestion?.deferred?'A suggestion is waiting. It returns after the next meaningful change.':pr.lastResult==='ignored'?'Nothing new since you ignored the last suggestion.':'No change suggested. Your active priorities already match the rules.';return `<section class="mission-suggest" aria-label="Priority suggestions"><div class="suggest-quiet"><button type="button" class="quiet-button" data-review-priorities>${icon('lightbulb')} Review priorities</button>${note?`<p class="small-note" role="status">${esc(note)}</p>`:''}</div></section>`;}
    const line=c=>`<li class="suggest-change"><p class="suggest-what">${c.remove?`Move <strong>${esc(byOutcome(c.add).name)}</strong> into Now, replacing <strong>${esc(byOutcome(c.remove).name)}</strong>.`:`Add <strong>${esc(byOutcome(c.add).name)}</strong> to an open Now slot.`}</p><p class="suggest-why"><span>Why:</span> ${esc(c.why)}</p></li>`;
    return `<section class="mission-suggest" aria-label="Priority suggestions"><div class="suggest-card card"><div class="overline">PRIORITY SUGGESTION</div><h2 class="suggest-title">A change to your active priorities</h2><ul class="suggest-list">${sg.changes.map(line).join('')}</ul><p class="small-note">Suggestion only. Nothing changes until you apply it. Rules, in order: pinned, not blocked, earliest deadline, unlocks the most work, has a ready step, most recently worked on.</p><div class="action-line"><button class="primary-button" data-priority-apply>${icon('check')} Apply…</button><button class="mini-button" data-priority-ignore>Ignore</button><button class="mini-button" data-priority-defer>Defer</button></div></div></section>`;
  }
  function showPriorityConfirm(){const sg=liveSuggestion();if(!sg)return;const before=activeIds(),after=before.filter(id=>!sg.changes.some(c=>c.remove===id)).concat(sg.changes.map(c=>c.add));const list=ids=>`<ul class="confirm-list">${ids.map(id=>`<li>${esc(byOutcome(id)?.name)}</li>`).join('')||'<li>(none)</li>'}</ul>`;showModal(`<header><h2>Apply this change?</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">Your active priorities will change as shown. Removed outcomes move to Next; their tasks and progress are kept.</p><div class="confirm-grid"><div><div class="eyebrow">NOW, BEFORE</div>${list(before)}</div><div><div class="eyebrow">NOW, AFTER</div>${list(after)}</div></div><div class="capture-foot"><button class="quiet-button" data-close>Cancel</button><button class="primary-button" data-priority-confirm>Apply change</button></div>`,'Confirm priority change');}
  function applyPriorityChange(){const sg=liveSuggestion();if(!sg)return false;const before=activeIds(),moves=sg.changes.slice();
    const after=before.filter(id=>!moves.some(c=>c.remove===id)).concat(moves.map(c=>c.add));if(after.length>3)return false;
    moves.forEach(c=>{if(c.remove){const old=data.focusAssignments.find(a=>a.outcome===c.remove);if(old)old.lane='next';}const a=data.focusAssignments.find(a=>a.outcome===c.add);if(a)a.lane='now';else data.focusAssignments.push({outcome:c.add,lane:'now'});});
    if(!activeIds().includes(data.currentPriority))data.currentPriority=activeIds()[0]||null;
    data.audit.push({at:new Date().toISOString(),type:'priority-apply',before,after:activeIds(),why:moves.map(c=>c.why)});
    data.priorityReview.suggestion=null;data.priorityReview.lastResult='applied';return true;}
  const heroPrev={};
  function heroStat(id){const total=getTasks(id).length,done=completed(id),pct=progress(id),prev=heroPrev[id]??0;heroPrev[id]=pct;
    const ticks=total>1&&total<=12?Array.from({length:total-1},(_,n)=>`<i class="tick" style="left:${((n+1)/total*100).toFixed(2)}%"></i>`).join(''):'';
    const cap=total?`<span>${done} of ${total} steps done</span><strong>${pct}%</strong>`:'<span>No steps yet</span>';
    return `<div class="hero-stat" role="img" aria-label="${pct}% complete, ${done} of ${total} steps"><div class="hero-ring" aria-hidden="true"><svg viewBox="0 0 44 44"><circle class="ring-track" cx="22" cy="22" r="19"/><circle class="ring-fill" cx="22" cy="22" r="19" style="stroke-dasharray:${(119.38*pct/100).toFixed(2)} 119.38"/></svg><strong>${total?`${done} of ${total}`:'—'}</strong></div><div class="hero-track" aria-hidden="true"><span class="fill" data-pct="${pct}" style="--pct:${prev};--pbg:${Math.max(pct,1)}"></span>${ticks}</div><div class="hero-cap">${cap}</div></div>`;}
  const nextItem=t=>checkItem(t).replace('class="check-row"','class="check-row is-next"');
  function priorityCard(o){const active=data.currentPriority===o.id;const pct=progress(o.id);return `<button type="button" class="priority-mini" data-select-priority="${esc(o.id)}" aria-pressed="${active}"><span class="mini-icon">${icon(o.stream==='market'?'crosshair':'layers')}</span><span class="mini-copy"><strong class="mini-title">${esc(o.name)}</strong><span class="mini-kicker">${esc(byStream(o.stream)?.name||'Project')}</span></span><span class="mini-progress">${pct?`<strong>${pct}%</strong><span class="mini-progress-track"><span style="width:${pct}%"></span></span>`:'<span class="mini-idle">Not started</span>'}</span>${icon('chevron-right','class="mini-arrow"')}</button>`;}
  const mobileTopline=()=>`<div class="mobile-topline"><button class="brand brand-mobile" data-nav="focus" aria-label="Exe home"><span class="brand-symbol" aria-hidden="true"><i></i><i></i></span><span>Exe</span></button><div class="topline-actions"><button class="icon-button bell-button" data-nav="review" data-review-bell aria-label="AI Review"><span data-icon="bell"></span><span class="bell-dot" data-review-dot hidden></span></button><button class="mobile-workspace" aria-label="Account: search, settings and backup" aria-haspopup="dialog"><span class="avatar" aria-hidden="true">A</span></button></div></div>`;
  function pageHeading(label,title,sub,extra=''){return `${mobileTopline()}<div class="page-heading"><div><div class="eyebrow">${label}</div><h1>${title}<span class="period" aria-hidden="true">.</span></h1><p class="page-sub">${sub}</p></div>${extra}</div>`;}
  /* State line: parts that are zero are omitted. "blocked" counts only user-confirmed blocks. */
  function statusLine(){const n=pending().length,k=blockedCount(),parts=[];if(data.currentPriority)parts.push('1 current focus of up to 3 active.');if(n)parts.push(`<button data-nav="review" class="mission-review">${n} awaiting AI Review ${icon('arrow-right')}</button>`);if(k)parts.push(`${k} blocked.`);return parts.join(' ');}
  function missionHeading(){return `${mobileTopline()}<div class="mission-heading"><div class="eyebrow mission-eyebrow">ALTR WORKSPACE</div><h1>Mission Status</h1><p class="mission-sub" id="status-line">${statusLine()}</p></div>`;}
  function renderFocus(){const ids=activeIds();if(!ids.includes(data.currentPriority))data.currentPriority=ids[0]||null;const primary=byOutcome(data.currentPriority);const others=ids.filter(id=>id!==data.currentPriority).map(byOutcome).filter(Boolean);const steps=primary?getTasks(primary.id):[];return `${missionHeading()}
    <div class="mission-layout">${primary?`<div class="hero-stack"><section class="priority-hero" aria-labelledby="current-priority-title"><div class="hero-head"><div class="hero-heading"><div class="hero-icon">${icon(primary.stream==='foundation'?'building':primary.stream==='market'?'map-pin':'layers')}</div><div class="hero-copy"><div class="overline">CURRENT PRIORITY</div><h2 id="current-priority-title">${esc(primary.name)}</h2><div class="type-label">${esc(byStream(primary.stream)?.name)}</div></div></div></div>${heroStat(primary.id)}<div class="hero-checks desktop-checks">${steps.map(t=>t.id===(steps.find(x=>!x.done)||{}).id?nextItem(t):checkItem(t)).join('')||`<p class="small-note">No checklist steps added yet.</p>`}</div><div class="hero-checks mobile-checks" id="mobile-steps">${steps.length?`<div class="step-eyebrow">${steps.every(t=>t.done)?'All steps done':'Next step'}</div>${nextItem(steps.find(t=>!t.done)||steps[0])}`:`<p class="small-note">No checklist steps added yet.</p>`}${steps.length>1?`<button class="show-steps" type="button" data-toggle-steps aria-expanded="false" aria-label="Show all checklist steps"><span>All steps</span><span class="step-count">${steps.length}</span>${icon('chevron-down')}</button><div class="mobile-more-steps">${steps.filter(t=>t.id!==(steps.find(s=>!s.done)||steps[0]).id).map(checkItem).join('')}</div>`:''}</div><div class="hero-bottom"><button class="primary-button" data-focus-mode="${esc(primary.id)}">${icon('crosshair')} Enter Focus Mode <span class="desktop-cta-arrow">${icon('chevron-right')}</span></button></div></section></div>`:`<div class="empty-state"><span class="empty-icon">${icon('target')}</span><h2>No active priorities</h2><p>Choose an outcome from Next when you're ready.</p></div>`}
    <section class="mission-other" aria-label="Other active priorities"><div class="mission-other-head"><div class="mission-other-heading">Other active priorities</div></div><div class="side-priorities">${others.map(priorityCard).join('')||'<p class="small-note">No other active priorities.</p>'}</div></section>${prioritySuggestionCard()}${inboxPreview()}${lanesLink()}</div>`;}
  const laneProgress=id=>{const n=getTasks(id).length;return n?`${completed(id)} of ${n} ${n===1?'step':'steps'} done`:'Not measured';};
  function lanesLink(){const nx=laneIds('next').length,lt=laneIds('later').length;return `<section class="mission-lanes" aria-label="Next and Later"><button type="button" class="priority-mini lanes-link" data-nav="lanes"><span class="mini-icon">${icon('layers')}</span><span class="mini-copy"><strong class="mini-title">Next &amp; Later</strong><span class="mini-kicker">${nx} next · ${lt} later</span></span>${icon('chevron-right','class="mini-arrow"')}</button></section>`;}
  function laneItem(id,lane){const o=byOutcome(id);if(!o)return '';return `<li class="lane-item"><div class="lane-copy"><strong>${esc(o.name)}</strong><span class="lane-meta">${esc(byStream(o.stream)?.name||'')} · ${laneProgress(id)}</span></div><div class="lane-actions"><button class="mini-button" data-set-lane="${esc(id)}" data-lane="now">Make active</button>${lane==='next'?`<button class="mini-button" data-set-lane="${esc(id)}" data-lane="later">Move to Later</button>`:`<button class="mini-button" data-set-lane="${esc(id)}" data-lane="next">Move to Next</button>`}</div></li>`;}
  function renderLanes(){const sec=(lane,label,note)=>{const ids=laneIds(lane);return `<section class="card lane-section" aria-label="${label}"><div class="row-between"><h2 class="section-heading">${label}</h2><span class="pill gray">${ids.length}</span></div><p class="small-note">${note}</p><ul class="lane-list">${ids.map(id=>laneItem(id,lane)).join('')||`<li class="lane-empty small-note">Nothing in ${label}.</li>`}</ul></section>`;};
    return `${pageHeading('FOCUS BOARD','Next &amp; Later','Outcomes that are not active right now. Nothing moves unless you move it.',`<div class="page-tools"><button class="quiet-button" data-nav="focus">${icon('arrow-left')} Back to Focus</button></div>`)}<div class="lanes-layout">${sec('next','Next','Up after an active priority is finished or swapped out.')}${sec('later','Later','Parked on purpose. Still saved.')}</div>`;}
  function inboxPreview(){const items=liveCaptures().filter(c=>!c.completedAt).slice(0,4);if(!items.length)return '';return `<section class="mission-inbox" aria-label="Inbox preview"><div class="mission-other-head"><div class="mission-other-heading">Inbox</div><button class="quiet-button next-later-link" data-nav="inbox">Open Inbox ${icon('chevron-right')}</button></div><ul class="inbox-peek">${items.map(c=>`<li>${esc(c.checklistText??c.text)}</li>`).join('')}</ul></section>`;}
  function renderInbox(){
    const scope=data.captures.filter(c=>!!c.archivedAt===showArchived);
    const counts={all:scope.length,active:scope.filter(c=>!c.completedAt).length,done:scope.filter(c=>!!c.completedAt).length};
    const entries=scope.filter(c=>inboxFilter==='all'||(inboxFilter==='done'?!!c.completedAt:!c.completedAt));
    const sub=showArchived?`${counts.all} archived`:`${liveCaptures().length} to-dos`;
    return `${pageHeading('CAPTURE','Inbox',sub,pending().length?`<button class="quiet-button" data-nav="review">Review ${pending().length} new</button>`:'')}
      <section class="raw-inbox" aria-label="Raw capture checklist">
        <div class="inbox-toolbar"><div class="inbox-filters" role="group" aria-label="Filter to-dos">${['all','active','done'].map(f=>`<button data-inbox-filter="${f}" aria-pressed="${inboxFilter===f}">${f[0].toUpperCase()+f.slice(1)} <span class="filter-count">${counts[f]}</span></button>`).join('')}</div></div>
        <form id="inbox-add" class="inbox-add"><span class="add-plus" aria-hidden="true">${icon('plus')}</span><input class="text-input" name="text" aria-label="Add a to-do" placeholder="Add a to-do…" required maxlength="4000"/><button class="add-submit" type="submit" aria-label="Add to-do">${icon('corner-down-left')}</button></form>
        <ul class="raw-list">${entries.map(c=>{
          const text=c.checklistText??c.text,open=expandedCaptures.has(c.id),blocker=c.completedAt?null:captureBlocker(c);
          return `<li class="raw-row ${c.completedAt?'is-complete':''} ${blocker?'is-blocked':''}">
            <label class="raw-check"><input type="checkbox" data-capture-check="${esc(c.id)}" ${c.completedAt?'checked':''} aria-label="${c.completedAt?'Reopen':'Complete'} ${esc(text)}"/><span class="raw-text">${esc(text)}</span>${blocker?`<span class="blocked-pill" title="Blocked by: ${esc(blocker.name)}">${icon('alert-circle')} Blocked</span>`:''}</label>
            <button class="raw-more" data-row-more="${esc(c.id)}" aria-label="More actions for ${esc(text)}" aria-expanded="${open}" aria-controls="capture-details-${esc(c.id)}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
            <div class="raw-detail-panel" id="capture-details-${esc(c.id)}" ${open?'':'hidden'}>
              <p class="raw-meta">${esc(niceDate(c.createdAt))} · ${esc(c.source||'Capture')} · ${c.status==='pending'?'Awaiting AI Review':'Organized'}${c.completedAt?' · Done':''}</p>
              ${c.checklistText&&c.checklistText!==c.text?`<p class="raw-original"><strong>Original capture</strong><br>${esc(c.text)}</p>`:''}
              <div class="raw-actions"><button class="mini-button" data-edit-capture="${esc(c.id)}">Edit</button><button class="mini-button" data-archive-capture="${esc(c.id)}">${c.archivedAt?'Restore':'Archive'}</button></div>
            </div>
          </li>`;
        }).join('')||'<li class="empty-state">No to-dos in this view.</li>'}</ul>
        <div class="inbox-footer"><button class="quiet-button" data-show-archived aria-pressed="${showArchived}">${showArchived?'Back to list':'View archived'}</button></div>
      </section>`;
  }
  function showCaptureEdit(id){const c=data.captures.find(c=>c.id===id);if(!c)return;showModal(`<header><h2>Edit to-do</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">The original capture and AI review proposal remain unchanged.</p><form id="capture-edit" data-id="${esc(id)}"><label class="form-field">To-do text<textarea name="text" class="text-input" required maxlength="4000">${esc(c.checklistText??c.text)}</textarea></label><button type="submit" class="primary-button">Save changes</button></form>`,'Edit to-do');}
  function captureCard(c){return `<article class="card capture-item"><span class="cap-icon">${icon(c.status==='pending'?'inbox':'check-circle')}</span><div class="capture-body"><p>${esc(c.text)}</p><div class="capture-meta"><span>${niceDate(c.createdAt)}</span><span class="pill ${c.status==='pending'?'blue':'gray'}">${c.status==='pending'?'Awaiting review':'Organized'}</span>${c.source?`<span>${esc(c.source)}</span>`:''}</div>${c.status==='pending'?`<div class="action-line"><button class="mini-button" data-nav="review">Review suggestion</button></div>`:''}</div></article>`;}
  function propose(text){const s=text.toLowerCase();let type='Task',stream='technology';if(/idea|maybe|worthwhile|explore|creative|consider|incentiv|possib/.test(s))type='Idea';else if(/\?|should we|do we need|figure out|which area|choose between|decide/.test(s))type='Decision';else if(/finaliz|establish|build a process|launch readiness/.test(s))type='Outcome';if(/insurance|llc|filing|register|publication|compliance/.test(s))stream='foundation';else if(/pricing|price|profit|competitor|service area|location|market/.test(s))stream='market';else if(/partner|hiring|recruit|cleaner|onboard|spanish/.test(s))stream='partners';else if(/seo|reviews|thumbtack|lead|website|image|alt text/.test(s))stream='growth';else if(/backend|phone|twilio|software|code|security|dispatch/.test(s))stream='technology';const near= s.includes('seo')?'seo':s.includes('insurance')?'insurance':s.includes('hiring')?'hiring':s.includes('phone')||s.includes('twilio')?'communications':s.includes('pricing')?'pricing':null;return {type,stream,title:text.trim(),related:near};}
  function renderReview(){const caps=pending();return `${pageHeading('AI REVIEW','AI Review','Approve organization deliberately. The prototype uses local rules, not a live AI model.',`<div class="page-tools">${caps.length?`<button class="primary-button" data-approve-all>${icon('check-check')} Approve all (${caps.length})</button>`:''}<button class="quiet-button" data-nav="inbox">Back to inbox</button></div>`)}<div class="review-layout"><section class="stack">${caps.length?caps.map(c=>{const proposal=c.proposal||propose(c.text);return `<article class="card review-item"><div class="row-between"><span class="review-tag">ORIGINAL CAPTURE</span><span class="pill blue">Unapproved</span></div><p class="review-original">${esc(c.text)}</p><div class="review-fields"><div class="form-field"><label for="type-${esc(c.id)}">Suggested type</label><select class="select" id="type-${esc(c.id)}" data-review-field="type" data-review-id="${esc(c.id)}">${['Task','Outcome','Decision','Idea'].map(t=>`<option value="${t}" ${proposal.type===t?'selected':''}>${t}</option>`).join('')}</select></div><div class="form-field"><label for="stream-${esc(c.id)}">Suggested workstream</label><select class="select" id="stream-${esc(c.id)}" data-review-field="stream" data-review-id="${esc(c.id)}">${data.workstreams.map(w=>`<option value="${esc(w.id)}" ${proposal.stream===w.id?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div></div><div class="review-reason">${icon('lightbulb')} <span>${proposal.related?'Possibly related to existing work. Review the relationship before consolidating.':'Initial classification inferred from keywords. Please verify before applying.'}</span></div><div class="action-line"><button class="primary-button" data-approve="${esc(c.id)}">${icon('check')} Approve & organize</button><button class="mini-button" data-defer="${esc(c.id)}">Keep in inbox</button></div></article>`;}).join(''):`<div class="empty-state"><span class="empty-icon">${icon('sparkles')}</span><h2>Nothing to review.</h2><p>New captures appear here for your approval. The app never silently rewrites your priorities.</p></div>`}</section><aside class="card review-summary"><h3>Designed to protect your focus</h3><p>The current prototype makes simple local suggestions and preserves originals. A production AI service and approval audit will be added when a backend is connected.</p><div class="recommendation"><span class="review-tag">REVIEW RULES</span><p>Classify → examine relationships → approve → place in Map. Nothing enters Now automatically.</p><span class="status-dots"><span class="dot"></span> Your three active priorities remain protected</span></div></aside></div>`;}
  function ensureOutcomeForStream(stream){const prior=data.outcomes.find(o=>o.stream===stream&&o.name==='Unsorted work');if(prior)return prior.id;const id=newId('outcome');data.outcomes.push({id,stream,name:'Unsorted work',description:'Newly approved tasks awaiting a more specific outcome.'});data.focusAssignments.push({outcome:id,lane:'later'});return id;}
  function accept(c){let p=c.proposal||propose(c.text);if(p.type==='Outcome'){const id=newId('outcome');data.outcomes.push({id,stream:p.stream,name:p.title,description:'Created from an approved capture.'});data.focusAssignments.push({outcome:id,lane:'later'});}else if(p.type==='Task'){const out=(p.related&&byOutcome(p.related)&&byOutcome(p.related).stream===p.stream)?p.related:ensureOutcomeForStream(p.stream);data.tasks.push({id:newId('task'),outcome:out,name:p.title,done:false});}else if(p.type==='Decision'){data.decisions.push({id:newId('decision'),stream:p.stream,name:p.title,status:'open',description:'Newly captured decision; add evidence and options.',options:[],notes:'',selected:''});}else if(p.type==='Idea'){data.ideas.push({id:newId('idea'),stream:p.stream,name:p.title,notes:'Approved from the Inbox.'});}c.status='organized';c.organizedAs=p.type;c.proposal=p;}
  const mapOpen=new Map();const isMobileLayout=()=>matchMedia('(max-width: 760px), ((pointer: coarse) and (max-height: 500px))').matches;
  function renderMap(){if(!data.workstreams.find(w=>w.id===data.selectedStream))data.selectedStream=data.workstreams[0].id;const w=byStream(data.selectedStream),os=data.outcomes.filter(o=>o.stream===w.id),ide=data.ideas.filter(i=>i.stream===w.id);return `${pageHeading('MAP','Map','Outcomes, actions, decisions and related work—without the noise.')}<div class="map-grid"><nav class="card workstream-list" data-picker aria-label="Workstreams">${data.workstreams.map(s=>`<button class="stream-row ${s.id===w.id?'active':''}" data-stream="${esc(s.id)}" aria-current="${s.id===w.id?'page':'false'}">${icon(s.icon)}<span><strong>${esc(s.name)}</strong><small>${data.outcomes.filter(o=>o.stream===s.id).length} outcomes</small></span>${icon('chevron-right','class="chevron"')}</button>`).join('')}</nav><section class="card map-detail"><div class="eyebrow">WORKSTREAM</div><h2 class="map-title">${esc(w.name)}</h2><p class="small-note">${esc(w.description)}</p><div class="divider"></div><div class="row-between"><h3 class="section-heading">Outcomes</h3><span class="pill gray">${os.length}</span></div>${os.map((o,i)=>{const open=mapOpen.has(o.id)?mapOpen.get(o.id):i===0,m=isMobileLayout();return `<article class="outcome-block ${open?'open':''}"><div class="outcome-top" data-toggle-outcome="${esc(o.id)}" ${m?`role="button" tabindex="0" aria-expanded="${open}"`:''}><div><h3>${esc(o.name)}</h3><p>${esc(o.description)}</p></div><span class="pill ${laneOf(o.id)==='now'?'blue':'gray'}">${laneOf(o.id).toUpperCase()}</span>${icon('chevron-down','class="outcome-chevron"')}</div><div class="outcome-tasks">${getTasks(o.id).map(checkItem).join('')||'<p class="small-note">No steps added yet.</p>'}<div class="action-line"><button class="mini-button" data-add-task="${esc(o.id)}">${icon('plus')} Add step</button>${laneOf(o.id)!=='now'?`<button class="mini-button" data-set-lane="${esc(o.id)}" data-lane="now">Make active</button>`:''}${laneOf(o.id)!=='next'?`<button class="mini-button" data-set-lane="${esc(o.id)}" data-lane="next">Move to Next</button>`:''}${laneOf(o.id)!=='later'?`<button class="mini-button" data-set-lane="${esc(o.id)}" data-lane="later">Move to Later</button>`:''}</div></div></article>`;}).join('')}${data.relationships.filter(r=>{const a=byOutcome(r.from)||byTask(r.from);const b=byOutcome(r.to)||byTask(r.to);return a?.stream===w.id||b?.stream===w.id||(a?.outcome&&byOutcome(a.outcome)?.stream===w.id);}).length?`<div class="divider"></div><h3 class="section-heading" style="margin-bottom:10px">Relationships</h3><div class="stack">${data.relationships.filter(r=>{const a=byOutcome(r.from)||byTask(r.from);const b=byOutcome(r.to)||byTask(r.to);return a?.stream===w.id||b?.stream===w.id||(a?.outcome&&byOutcome(a.outcome)?.stream===w.id);}).map(r=>`<div class="backlog-row"><span class="folder">${icon(r.kind==='blocks'?'lock':'link')}</span><strong>${esc(r.description)}</strong><small>${esc(r.kind)}</small></div>`).join('')}</div>`:''}${ide.length?`<div class="divider"></div><h3 class="section-heading" style="margin-bottom:10px">Ideas worth keeping</h3>${ide.map(i=>`<div class="backlog-row"><span class="folder">${icon('lightbulb')}</span><strong>${esc(i.name)}</strong></div>`).join('')}`:''}<p class="endnote">Dependencies and relationships are suggestions unless explicitly confirmed. Checkmarks represent demo activity only.</p></section></div>`;}
  function renderDecisions(){if(!data.decisions.some(d=>d.id===data.selectedDecision))data.selectedDecision=data.decisions[0]?.id;const d=data.decisions.find(d=>d.id===data.selectedDecision);return `${pageHeading('DECISION QUEUE','Decisions','Separate unresolved questions from executable work.',`<span class="pill blue">${data.decisions.filter(d=>d.status==='open').length} open</span>`)}<div class="decisions-layout"><nav class="card decision-list" data-picker aria-label="Decisions">${data.decisions.map(c=>`<button class="decision-item ${c.id===data.selectedDecision?'active':''}" data-decision="${esc(c.id)}" aria-pressed="${c.id===data.selectedDecision}"><strong>${esc(c.name)}</strong><small>${esc(byStream(c.stream)?.name||'Other')} · ${c.status==='open'?'Unresolved':'Resolved'}</small>${icon('chevron-right','class="chevron"')}</button>`).join('')}</nav><section class="card decision-detail">${d?`<div class="row-between"><div class="eyebrow">DECISION</div><span class="pill ${d.status==='open'?'amber':'green'}">${d.status==='open'?'Unresolved':'Resolved'}</span></div><h2>${esc(d.name)}</h2><p class="small-note">${esc(d.description)}</p><div class="detail-block"><h3>Options to consider</h3>${d.options.length?d.options.map(o=>`<span class="option-tag">${esc(o)}</span>`).join(''):'<p class="small-note">Add possibilities as you research.</p>'}<div class="action-line"><button class="mini-button" data-add-option="${esc(d.id)}">${icon('plus')} Add option</button></div></div><div class="detail-block"><h3>Research and notes</h3><textarea class="text-area" data-decision-notes="${esc(d.id)}" aria-label="Research notes" placeholder="What would help you decide?">${esc(d.notes)}</textarea><p class="small-note" style="margin-top:8px">Saved locally. Decisions never automatically reassign priorities.</p></div>${d.selected?`<div class="detail-block"><h3>Recorded conclusion</h3><p class="small-note">${esc(d.selected)}</p></div>`:''}<div class="detail-block"><h3>Decision status</h3><div class="button-row">${d.status==='open'?`<button class="primary-button" data-resolve="${esc(d.id)}">${icon('check-circle')} Mark resolved</button>`:`<button class="quiet-button" data-reopen="${esc(d.id)}">${icon('rotate-ccw')} Reopen decision</button>`}</div></div>`:'<div class="empty-state"><h2>No decisions yet</h2></div>'}</section></div>`;}
  function render(){const page=data.page||'focus';document.title='Exe — '+({focus:'Focus',lanes:'Next & Later',inbox:'Inbox',review:'AI Review',map:'Map',decisions:'Decisions'}[page]||'Focus');document.body.classList.toggle('page-is-focus',page==='focus');const navPage=page==='lanes'?'focus':page;const map={focus:renderFocus,lanes:renderLanes,inbox:renderInbox,review:renderReview,map:renderMap,decisions:renderDecisions};$('#view').innerHTML=(map[page]||renderFocus)();$('#crumb').textContent=({focus:'Focus',lanes:'Next & Later',inbox:'Inbox',review:'AI Review',map:'Map',decisions:'Decisions'})[page]||'Focus';document.querySelectorAll('[data-nav]').forEach(el=>{el.classList.toggle('active',el.dataset.nav===navPage);if(el.classList.contains('nav-link')||el.classList.contains('dock-item'))el.setAttribute('aria-current',el.dataset.nav===navPage?'page':'false');});document.querySelectorAll('[data-inbox-count]').forEach(el=>{const n=pending().length;el.hidden=n===0;el.textContent=badgeText(n);el.setAttribute('aria-label',`${n} awaiting AI Review`);});document.querySelectorAll('[data-dock-count]').forEach(el=>{const n=pending().length;el.hidden=n===0;el.textContent=badgeText(n);el.setAttribute('aria-label',`${n} awaiting review`);});document.querySelectorAll('[data-review-dot]').forEach(el=>{el.hidden=pending().length===0;});document.querySelectorAll('[data-review-bell]').forEach(el=>el.setAttribute('aria-label',pending().length?`AI Review, ${pending().length} awaiting review`:'AI Review'));hydrateIcons();persist();requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll('.hero-track .fill').forEach(f=>f.style.setProperty('--pct',f.dataset.pct))));requestAnimationFrame(refreshRefraction);}
  function navigate(p){data.page=p;render();window.scrollTo({top:0,behavior:'instant'});$('#view').scrollTop=0;}
  function setLane(id,lane){const existing=data.focusAssignments.find(a=>a.outcome===id);if(lane==='now'&&laneOf(id)!=='now'&&activeIds().length>=3){showSwap(id);return;}if(existing)existing.lane=lane;else data.focusAssignments.push({outcome:id,lane});if(lane==='now')data.currentPriority=id;else if(data.currentPriority===id)data.currentPriority=activeIds()[0]||null;render();toast(`${byOutcome(id)?.name||'Outcome'} moved to ${lane.toUpperCase()}.`);}
  function showSwap(toId){const o=byOutcome(toId);showModal(`<header><h2>Keep focus to three</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">Choose which active priority to move to Next before adding <strong>${esc(o.name)}</strong>.</p><div class="stack">${activeIds().map(id=>`<button class="search-result" data-swap-from="${esc(id)}" data-swap-to="${esc(toId)}"><strong>Replace: ${esc(byOutcome(id)?.name)}</strong><small>Move current priority to Next and activate ${esc(o.name)}</small></button>`).join('')}</div>`, 'swap');}
  function showModal(html,name){lastFocus=document.activeElement;overlay=name;document.querySelector('.app-shell').inert=true;document.querySelector('.mobile-dock').inert=true;document.querySelector('.mobile-capture').inert=true;$('#modal-root').innerHTML=`<div class="modal-layer" data-overlay><div class="modal-sheet" role="dialog" aria-modal="true" aria-label="${esc(name)}">${html}</div></div>`;hydrateIcons($('#modal-root'));document.body.style.overflow='hidden';setTimeout(()=>$('#modal-root').querySelector('textarea,input,button:not([data-close])')?.focus(),40);}
  function closeModal(){const closingFocus=overlay==='focus';const restore=overlay==='Quick Capture'?returnToFocus:null;returnToFocus=null;overlay=null;document.querySelector('.app-shell').inert=false;document.querySelector('.mobile-dock').inert=false;document.querySelector('.mobile-capture').inert=false;$('#modal-root').innerHTML='';document.body.style.overflow='';if(restore){showFocusMode(restore,true);if(captureContext)$('.focus-layer').scrollTop=captureContext.focusScroll;}else{(closingFocus?(focusOrigin?.isConnected?focusOrigin:$('[data-focus-mode]')):lastFocus)?.focus?.();}}
  function showCapture(){if(overlay==='Quick Capture')return;captureContext={scrollY:window.scrollY,viewScroll:$('#view').scrollTop,focusScroll:$('.focus-layer')?.scrollTop||0,inboxDraft:$('#inbox-add input')?.value,stepsExpanded:$('#mobile-steps')?.classList.contains('expanded')};returnToFocus=overlay==='focus'?data.currentPriority:null;showModal(`<header><h2>Quick Capture</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">What's on your mind?</p><form id="capture-form"><textarea id="capture-text" class="capture-textarea" aria-label="Capture text" required placeholder="Capture a thought, task, or idea…\nOr paste several thoughts."></textarea><div class="capture-foot"><span class="small-note">Saved to Inbox.</span><button class="primary-button" type="submit">Save ${icon('arrow-right')}</button></div></form>`, 'Quick Capture');}
  function showTaskForm(outcome){showModal(`<header><h2>Add a step</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">Add a concrete action under <strong>${esc(byOutcome(outcome)?.name||'Outcome')}</strong>.</p><form id="task-form" data-outcome="${esc(outcome)}"><label class="form-field"><span class="small-note">Task</span><input class="text-input" name="task" required maxlength="200" placeholder="What is the next action?"/></label><div class="capture-foot"><span class="small-note">This won't change your Focus Board placement.</span><button type="submit" class="primary-button">Add step</button></div></form>`, 'Add a step');}
  function showResolveDecision(id){const d=data.decisions.find(d=>d.id===id);if(!d)return;showModal(`<header><h2>Record your decision</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">${esc(d.name)}<br>Record what you chose before marking it resolved. No tasks or priorities will be changed automatically.</p><form id="resolve-form" data-decision="${esc(id)}"><label class="form-field"><span class="small-note">Your decision</span><input class="text-input" name="conclusion" value="${esc(d.selected||'')}" required maxlength="320" placeholder="What did you decide?"/></label><div class="capture-foot"><span class="small-note">This will not move any Focus Board items.</span><button type="submit" class="primary-button">Confirm decision</button></div></form>`, 'Resolve decision');}
  function showOptionForm(id){showModal(`<header><h2>Add an option</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">A possibility to consider when deciding.</p><form id="option-form" data-decision="${esc(id)}"><input class="text-input" name="option" required maxlength="160" placeholder="Option or approach"/><div class="capture-foot"><span></span><button type="submit" class="primary-button">Add option</button></div></form>`, 'Add option');}
  function showFocusMode(id,restoring=false){const o=byOutcome(id);if(!o)return;if(!overlay&&!restoring)focusOrigin=document.activeElement;overlay='focus';document.querySelector('.app-shell').inert=true;document.querySelector('.mobile-dock').inert=true;document.querySelector('.mobile-capture').inert=true;$('#modal-root').innerHTML=`<div class="focus-layer" role="dialog" aria-modal="true" aria-label="Focus Mode"><div class="focus-top"><button class="quiet-button" data-close-focus>${icon('arrow-left')} Return to Exe</button><button class="quiet-button" data-capture>${icon('plus')} Capture thought</button></div><div class="focus-body"><div class="focus-label">FOCUS MODE / ${esc(byStream(o.stream)?.name.toUpperCase())}</div><h1>${esc(o.name)}</h1><p class="lead">One priority. The next clear action. Everything else can wait.</p><div class="focus-panel"><div class="row-between"><h3 class="section-heading">Your checklist</h3><span class="pill blue">${completed(id)} of ${getTasks(id).length} done</span></div>${getTasks(id).map(checkItem).join('')||'<p class="small-note">No steps yet.</p>'}</div><div class="focus-actions"><span class="small-note">New thoughts go to Inbox, not your active work.</span><button class="quiet-button" data-close-focus>Finish session ${icon('check')}</button></div></div></div>`;document.body.style.overflow='hidden';hydrateIcons($('#modal-root'));$('#modal-root button')?.focus();}
  function showWorkspace(){showModal(`<header><h2>Altr Workspace</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">Exe V1 saves your work only in this browser. It does not yet synchronize between desktop and mobile.</p><div class="recommendation"><span class="review-tag">LOCAL PROTOTYPE</span><p>Use a JSON backup to move your prototype data manually or to keep a separate copy.</p><div class="button-row"><button class="primary-button" data-export>${icon('archive')} Download JSON backup</button><button class="quiet-button" data-import-trigger>${icon('file-text')} Import backup</button><input type="file" id="import-backup" accept="application/json,.json" hidden /></div></div><div class="divider"></div><button class="mini-button" data-reset-example>${icon('rotate-ccw')} Reset to initial Altr example</button><p class="small-note" style="margin-top:12px">Resetting replaces your current local example data. Download a backup first if you want to keep it.</p>`, 'Workspace settings');}
  function showAccountMenu(){showModal(`<header><h2>Altr Workspace</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><div class="stack"><button class="search-result" data-search><strong>Search</strong><small>Find outcomes, tasks, decisions and captures</small></button><button class="search-result" data-open-workspace><strong>Settings and backup</strong><small>Download or restore a JSON backup</small></button></div>`,'Account menu');}
  function exportBackup(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='exe-altr-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),800);toast('Backup download started.');}
    function showSearch(){showModal(`<header><h2>Search Exe</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">Find outcomes, tasks, decisions and original captures.</p><input id="workspace-search" class="text-input" placeholder="Try pricing, Twilio, hiring…" aria-label="Search all work"/><div class="search-results" id="search-results"></div>`, 'Search');renderSearch('');}
  function renderSearch(q){const root=$('#search-results');if(!root)return;const items=[...data.outcomes.map(o=>({id:o.id,name:o.name,kind:'Outcome',page:'map',stream:o.stream})),...data.tasks.map(t=>({id:t.id,name:t.name,kind:'Task',page:'map',stream:byOutcome(t.outcome)?.stream})),...data.decisions.map(d=>({id:d.id,name:d.name,kind:'Decision',page:'decisions',stream:d.stream})),...data.captures.map(c=>({id:c.id,name:c.text,kind:'Original capture',page:'inbox',stream:''}))].filter(i=>q&&i.name.toLowerCase().includes(q.toLowerCase())).slice(0,20);root.innerHTML=!q?`<p class="small-note">Start typing to search your work.</p>`:items.length?items.map(i=>`<button class="search-result" data-search-go="${esc(i.page)}" data-search-stream="${esc(i.stream)}" data-search-decision="${i.kind==='Decision'?esc(i.id):''}"><strong>${esc(i.name)}</strong><small>${i.kind} · ${esc(byStream(i.stream)?.name||'')}</small></button>`).join(''):`<p class="small-note">No matches found.</p>`;}
  function showFocusReview(){const active=activeIds(),next=laneIds('next');showModal(`<header><h2>Review your priorities</h2><button class="close-button" data-close aria-label="Close">${icon('x')}</button></header><p class="helper">You control what's active. The limit of three protects your attention, and no other work is moved automatically.</p><div class="eyebrow" style="margin:14px 0 8px">NOW</div><div class="stack">${active.map(id=>`<div class="card" style="padding:12px 14px"><div class="row-between"><span style="font-weight:750">${esc(byOutcome(id)?.name)}</span><button class="mini-button" data-set-lane="${esc(id)}" data-lane="next">Move to Next</button></div></div>`).join('')}</div><div class="eyebrow" style="margin:24px 0 8px">NEXT</div><div class="stack">${next.map(id=>`<div class="card" style="padding:12px 14px"><div class="row-between"><span style="font-weight:750">${esc(byOutcome(id)?.name)}</span><button class="mini-button" data-set-lane="${esc(id)}" data-lane="now">Move to Now</button></div></div>`).join('')}</div><div class="eyebrow" style="margin:24px 0 8px">LATER</div><div class="stack">${laneIds('later').map(id=>`<div class="card" style="padding:12px 14px"><div class="row-between"><span style="font-weight:750">${esc(byOutcome(id)?.name)}</span><button class="mini-button" data-set-lane="${esc(id)}" data-lane="next">Move to Next</button></div></div>`).join('')}</div><p class="small-note" style="margin-top:16px">All assignments require your action; suggestions never move items silently.</p>`,'Review focus');}
  function actionClick(e){const closest=sel=>e.target.closest(sel);if(closest('[data-close]')){closeModal();return;}if(closest('[data-close-focus]')){closeModal();render();$('[data-focus-mode]')?.focus();return;}if(e.target.matches('[data-overlay]')){closeModal();return;}
    if(closest('[data-row-more]')){const button=closest('[data-row-more]'),id=button.dataset.rowMore,open=!expandedCaptures.has(id);if(open)expandedCaptures.add(id);else expandedCaptures.delete(id);button.setAttribute('aria-expanded',String(open));document.getElementById(button.getAttribute('aria-controls')).hidden=!open;return;}
    if(closest('[data-inbox-filter]')){inboxFilter=closest('[data-inbox-filter]').dataset.inboxFilter;render();$(`[data-inbox-filter="${inboxFilter}"]`).focus();return;}
    if(closest('[data-show-archived]')){showArchived=!showArchived;render();$('[data-show-archived]').focus();return;}
    if(closest('[data-edit-capture]')){showCaptureEdit(closest('[data-edit-capture]').dataset.editCapture);return;}
    if(closest('[data-archive-capture]')){const c=data.captures.find(c=>c.id===closest('[data-archive-capture]').dataset.archiveCapture);c.archivedAt=c.archivedAt?null:new Date().toISOString();render();$('[data-show-archived]').focus();toast(c.archivedAt?'Archived. Restore from Archived.':'Restored to list.');return;}
    if(closest('[data-capture]')){showCapture();return;}
    if(closest('[data-nav]')){const page=closest('[data-nav]').dataset.nav;if(overlay)closeModal();navigate(page);return;}
    if(closest('.mobile-workspace')){showAccountMenu();return;}if(closest('.workspace-switch')||closest('[data-open-workspace]')){showWorkspace();return;}
    if(closest('[data-export]')){exportBackup();return;}
    if(closest('[data-import-trigger]')){$('#import-backup')?.click();return;}
    if(closest('[data-reset-example]')){if(confirm('Reset Exe to its original Altr example? This will replace changes stored on this device.')){data=seed();closeModal();render();toast('Example restored.');}return;}
    if(closest('[data-search]')||closest('#search-button')){showSearch();return;}
    if(closest('[data-toggle-steps]')){const el=closest('[data-toggle-steps]');const root=el.closest('.hero-checks');const expanded=root.classList.toggle('expanded');el.setAttribute('aria-expanded',String(expanded));el.setAttribute('aria-label',expanded?'Show only the next step':'Show all checklist steps');return;}
    if(closest('[data-select-priority]')){data.currentPriority=closest('[data-select-priority]').dataset.selectPriority;render();return;}
    if(closest('[data-focus-mode]')){showFocusMode(closest('[data-focus-mode]').dataset.focusMode);return;}
    if(closest('[data-review-focus]')){showFocusReview();return;}
    const pickerActive=closest('[data-picker] .active');if(pickerActive&&isMobileLayout()){const open=pickerActive.closest('[data-picker]').classList.toggle('open');pickerActive.setAttribute('aria-expanded',String(open));return;}
    const outcomeToggle=closest('[data-toggle-outcome]');if(outcomeToggle&&isMobileLayout()){const id=outcomeToggle.dataset.toggleOutcome,block=outcomeToggle.closest('.outcome-block'),open=!block.classList.contains('open');mapOpen.set(id,open);block.classList.toggle('open',open);outcomeToggle.setAttribute('aria-expanded',String(open));return;}
    if(closest('[data-stream]')){data.selectedStream=closest('[data-stream]').dataset.stream;render();return;}
    if(closest('[data-decision]')){data.selectedDecision=closest('[data-decision]').dataset.decision;render();return;}
    if(closest('[data-add-task]')){showTaskForm(closest('[data-add-task]').dataset.addTask);return;}
    if(closest('[data-add-option]')){showOptionForm(closest('[data-add-option]').dataset.addOption);return;}
    if(closest('[data-set-lane]')){const el=closest('[data-set-lane]');const wasOverlay=!!overlay;const toId=el.dataset.setLane,ln=el.dataset.lane;if(wasOverlay)closeModal();setLane(toId,ln);return;}
    if(closest('[data-swap-from]')){const el=closest('[data-swap-from]'),from=el.dataset.swapFrom,to=el.dataset.swapTo;closeModal();const old=data.focusAssignments.find(a=>a.outcome===from);old.lane='next';setLane(to,'now');return;}
    if(closest('[data-review-priorities]')){runPriorityEngine(true);render();$('[data-review-priorities]')?.focus();return;}
    if(closest('[data-priority-apply]')){showPriorityConfirm();return;}
    if(closest('[data-priority-confirm]')){const ok=applyPriorityChange();closeModal();render();toast(ok?'Priorities updated. Recorded in history.':'That suggestion is out of date. Nothing was changed.');return;}
    if(closest('[data-priority-ignore]')){const pr=data.priorityReview;if(pr.suggestion){pr.dismissed.push(pr.suggestion.fp);pr.suggestion=null;pr.lastResult='ignored';}render();toast('Ignored. It will not come back unless the facts change.');return;}
    if(closest('[data-priority-defer]')){const sg=data.priorityReview.suggestion;if(sg)sg.deferred=true;render();toast('Deferred until your next meaningful change.');return;}
    if(closest('[data-approve]')){const id=closest('[data-approve]').dataset.approve,c=data.captures.find(c=>c.id===id);if(c&&c.status==='pending'){accept(c);render();toast('Capture organized. Original preserved.');}return;}
    if(closest('[data-approve-all]')){const pendingCount=pending().length;pending().forEach(accept);render();toast(`${pendingCount} captures organized. Originals preserved.`);return;}
    if(closest('[data-defer]')){toast('Kept in Inbox for a later review.');return;}
    if(closest('[data-resolve]')){showResolveDecision(closest('[data-resolve]').dataset.resolve);return;}
    if(closest('[data-reopen]')){const d=data.decisions.find(d=>d.id===closest('[data-reopen]').dataset.reopen);if(d){d.status='open';runPriorityEngine();render();toast('Decision reopened.');}return;}
    if(closest('[data-search-go]')){const el=closest('[data-search-go]');data.selectedStream=el.dataset.searchStream||data.selectedStream;if(el.dataset.searchDecision)data.selectedDecision=el.dataset.searchDecision;closeModal();navigate(el.dataset.searchGo);return;}
  }
  document.addEventListener('click',actionClick);
  document.addEventListener('change',e=>{if(e.target.matches('[data-capture-check]')){const id=e.target.dataset.captureCheck,c=data.captures.find(c=>c.id===id);if(!c)return;c.completedAt=e.target.checked?new Date().toISOString():null;render();($(`[data-capture-check="${id}"]`)||$(`[data-inbox-filter="${inboxFilter}"]`)).focus();toast(c.completedAt?'To-do completed. Review and tasks unchanged.':'To-do reopened.');return;}if(e.target.matches('#import-backup')){const file=e.target.files?.[0];if(!file)return;file.text().then(source=>{let copy;try{copy=JSON.parse(source);}catch{toast('Not a valid JSON file.');return;}const required=['workstreams','outcomes','tasks','captures','decisions','ideas','relationships','focusAssignments'];if(copy?.version!==1||required.some(k=>!Array.isArray(copy[k]))){toast('Unsupported backup format.');return;}if(confirm('Replace the local Exe workspace with this backup?')){data=copy;closeModal();render();toast('Backup imported.');}}).catch(()=>toast('Could not read backup.'));return;}if(e.target.matches('[data-task-check]')){const t=byTask(e.target.dataset.taskCheck);if(!t)return;t.done=e.target.checked;if(t.done){const o=byOutcome(t.outcome);if(o)o.lastWorkedAt=new Date().toISOString();}runPriorityEngine();persist();const isFocus=overlay==='focus';const focusId=data.currentPriority;if(isFocus)showFocusMode(focusId);else render();toast(t.done?'Step completed.':'Step reopened.');return;}
    if(e.target.matches('[data-review-field]')){const c=data.captures.find(c=>c.id===e.target.dataset.reviewId);if(c){if(!c.proposal)c.proposal=propose(c.text);c.proposal[e.target.dataset.reviewField]=e.target.value;persist();}return;}
  });
  document.addEventListener('input',e=>{if(e.target.matches('[data-decision-notes]')){const d=data.decisions.find(d=>d.id===e.target.dataset.decisionNotes);if(d){d.notes=e.target.value;persist();}return;}if(e.target.matches('#workspace-search')){renderSearch(e.target.value);}});
  document.addEventListener('submit',e=>{if(e.target.matches('#inbox-add')){e.preventDefault();const text=new FormData(e.target).get('text')?.trim();if(!text)return;data.captures.push({id:newId('capture'),text,status:'pending',completedAt:null,createdAt:new Date().toISOString(),source:'Inbox',proposal:propose(text)});inboxFilter='all';showArchived=false;render();$('#inbox-add input').focus();return;}
    if(e.target.matches('#capture-edit')){e.preventDefault();const text=new FormData(e.target).get('text')?.trim(),c=data.captures.find(c=>c.id===e.target.dataset.id);if(c&&text){c.checklistText=text;closeModal();render();$(`[data-edit-capture="${c.id}"]`)?.focus();}return;}
    if(e.target.matches('#capture-form')){e.preventDefault();const textarea=$('#capture-text');const lines=textarea.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!lines.length){textarea.focus();return;}lines.forEach(text=>data.captures.push({id:newId('capture'),text,status:'pending',createdAt:new Date().toISOString(),source:'Quick Capture',proposal:propose(text)}));persist();closeModal();render();if(captureContext){if($('#inbox-add input')&&captureContext.inboxDraft!==undefined)$('#inbox-add input').value=captureContext.inboxDraft;if(captureContext.stepsExpanded){$('#mobile-steps')?.classList.add('expanded');const toggle=$('[data-toggle-steps]');toggle?.setAttribute('aria-expanded','true');toggle?.setAttribute('aria-label','Show only the next step');}window.scrollTo({top:captureContext.scrollY,behavior:'instant'});$('#view').scrollTop=captureContext.viewScroll;captureContext=null;}toast(`${lines.length} ${lines.length===1?'thought':'thoughts'} saved to Inbox.`);return;}
    if(e.target.matches('#task-form')){e.preventDefault();const name=new FormData(e.target).get('task')?.trim();if(name){data.tasks.push({id:newId('task'),outcome:e.target.dataset.outcome,name,done:false});closeModal();render();toast('Step added.');}return;}
    if(e.target.matches('#resolve-form')){e.preventDefault();const conclusion=new FormData(e.target).get('conclusion')?.trim();const d=data.decisions.find(d=>d.id===e.target.dataset.decision);if(conclusion&&d){d.selected=conclusion;d.status='resolved';runPriorityEngine();closeModal();render();toast('Decision recorded. Priorities unchanged.');}return;}
    if(e.target.matches('#option-form')){e.preventDefault();const name=new FormData(e.target).get('option')?.trim();const d=data.decisions.find(d=>d.id===e.target.dataset.decision);if(name&&d){d.options.push(name);closeModal();render();toast('Option added.');}return;}
  });
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-toggle-outcome][role=button]')){e.preventDefault();e.target.click();return;}if(e.key==='Escape'&&!overlay){const row=e.target.closest('.raw-row'),button=row?.querySelector('[data-row-more]');if(button?.getAttribute('aria-expanded')==='true'){button.click();button.focus();return;}}if(e.key==='Tab'&&overlay){const nodes=[...$('#modal-root').querySelectorAll('button,input,textarea,select,a[href]')].filter(el=>el.getClientRects().length&&!el.disabled);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||!nodes.includes(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!nodes.includes(document.activeElement))){e.preventDefault();first?.focus();}}if(e.key==='Escape'&&overlay){closeModal();return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();showCapture();}});
  function updateVisualViewport(){
    const viewport=window.visualViewport;
    document.documentElement.style.setProperty('--visual-height',`${viewport?.height||window.innerHeight}px`);
    document.documentElement.style.setProperty('--visual-top',`${viewport?.offsetTop||0}px`);
    document.documentElement.style.setProperty('--keyboard-inset',`${Math.max(0,window.innerHeight-(viewport?.height||window.innerHeight)-(viewport?.offsetTop||0))}px`);
  }
  window.visualViewport?.addEventListener('resize',updateVisualViewport);
  window.visualViewport?.addEventListener('scroll',updateVisualViewport);
  window.addEventListener('resize',updateVisualViewport);
  updateVisualViewport();
  hydrateIcons();render();
})();

