// Builds docs/test-data/exe-test-data.json: a large, deterministic Exe backup for exercising every feature.
// Import it in Settings > Restore or import (use "Add to what I have" or "Replace everything"). Run: node scripts/make-test-data.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
let seed = 20261108; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = a => a[Math.floor(rnd() * a.length)], chance = p => rnd() < p, int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
let n = 0; const id = p => `${p}-${String(++n).padStart(5, '0')}`;
const DAY = 86400000, TODAY = Date.UTC(2026, 10, 8, 18, 0, 0);
const at = (daysAgo, h = int(7, 21), m = int(0, 59)) => new Date(Date.UTC(2026, 10, 8, h, m) - daysAgo * DAY).toISOString();
const future = (days, h = 9, m = 0) => new Date(Date.UTC(2026, 10, 8, h, m) + days * DAY).toISOString();
const meta = (iso) => ({ owner_id: '', created_at: iso, updated_at: iso, revision: 1 });

const folderDefs = [['Home', 'House, errands and family', 'house'], ['Work', 'Job and clients', 'briefcase'], ['Health', 'Appointments, habits, fitness', 'heart'], ['Money', 'Bills, taxes, budgeting', 'wallet'], ['Travel', 'Trips and planning', 'plane'], ['Side project', 'The thing I build on weekends', 'lightbulb']];
const folders = folderDefs.map(([name, description, icon], i) => ({ id: id('fo'), ...meta(at(120)), name, description, icon, position: i }));
const F = Object.fromEntries(folders.map(f => [f.name, f.id]));

const POOL = {
  Home: { verbs: ['Fix', 'Replace', 'Order', 'Clean', 'Organize', 'Schedule', 'Buy', 'Return', 'Repair', 'Donate', 'Measure', 'Paint'], objs: ['the kitchen faucet', 'the garage shelves', 'smoke detector batteries', 'the guest room closet', 'a new vacuum filter', 'the porch light', 'curtains for the office', 'the broken fence gate', 'old paint cans', 'the basement boxes', 'a doormat', 'the dryer vent', 'the gutter', 'the hallway rug', 'spare keys', 'the water heater check'] },
  Work: { verbs: ['Send', 'Review', 'Prepare', 'Draft', 'Follow up on', 'Book', 'Finish', 'Update', 'Schedule', 'Escalate', 'Archive', 'Approve'], objs: ['the Q4 roadmap', 'Priya\'s contract notes', 'the vendor invoice', 'the onboarding doc', 'slides for Thursday', 'the budget spreadsheet', 'the security questionnaire', 'the hiring scorecard', 'the weekly status email', 'the client proposal', 'performance reviews', 'the demo script', 'the data export request', 'the retro notes', 'the license renewal'] },
  Health: { verbs: ['Book', 'Refill', 'Track', 'Stretch for', 'Ask about', 'Cancel', 'Prepare for', 'Buy'], objs: ['a dental cleaning', 'the allergy prescription', 'a 5k training plan', 'the annual physical', 'new running shoes', 'a sleep study', 'vitamin D', 'the physio appointment', 'blood test results', 'a flu shot', 'the eye exam', 'meal prep for the week'] },
  Money: { verbs: ['Pay', 'Compare', 'Cancel', 'File', 'Dispute', 'Review', 'Transfer for', 'Gather receipts for'], objs: ['the electric bill', 'the car insurance quote', 'an unused subscription', 'quarterly taxes', 'the bank fee', 'the credit card statement', 'the HSA claim', 'the rent', 'the charity receipt', 'the 401k allocation', 'the phone plan', 'the storage unit'] },
  Travel: { verbs: ['Book', 'Research', 'Pack for', 'Renew', 'Confirm', 'Plan', 'Print', 'Exchange money for'], objs: ['flights to Lisbon', 'a hotel in Porto', 'the passport', 'the rental car', 'travel insurance', 'the train to Sintra', 'a packing checklist', 'museum tickets', 'airport transfer', 'the visa form', 'an offline map', 'a travel adapter'] },
  'Side project': { verbs: ['Prototype', 'Fix', 'Write', 'Design', 'Deploy', 'Test', 'Refactor', 'Ship'], objs: ['the onboarding screen', 'the login bug', 'the README', 'the pricing page', 'the nightly backup job', 'dark mode colors', 'the analytics events', 'an export feature', 'the empty states', 'the changelog', 'the API rate limiter', 'the landing page copy'] },
};
const FIXED = [
  ['Text Rachel about Saturday', 'Home'], ['Email Priya the invoice follow-up', 'Work'], ['Call the dentist to reschedule my cleaning', 'Health'], ['Call the plumber about the leak under the sink', 'Home'],
  ['What is the tallest mountain in South America?', 'Travel'], ['What is the capital of Australia?', 'Travel'], ['Draft a thank-you note to Marcus for the intro', 'Work'], ['Make a packing checklist for Lisbon', 'Travel'],
  ['Email landlord about the broken window latch', 'Home'], ['Text Dad happy birthday', 'Home'], ['Ask Sam whether the 3pm moved', 'Work'], ['Find three options for a standing desk under $400', 'Work'],
  ['Write an email asking for a refund on order 88231', 'Money'], ['Call the bank about the duplicate fee', 'Money'], ['Draft a polite decline for the conference invite', 'Work'], ['Who won the 1989 World Series?', 'Side project'],
];
const EDGE = [
  ['Buy milk 🥛, eggs 🥚 & bread 🍞', 'Home'], ['اتصل بالطبيب لتحديد موعد', 'Health'], ['מייל למשרד בנוגע לחשבונית', 'Work'], ['明日までに請求書を送る', 'Work'], ['Réserver le restaurant pour l\'anniversaire — 20h', 'Home'],
  ['Fix <script>alert("hi")</script> in the template', 'Side project'], ['Check "quoted text" and it\'s apostrophes & ampersands', 'Side project'], ['Line one of a task that is pasted weirdly\twith a tab', 'Home'],
  ['a', 'Home'], ['Ñandú, naïve, Zürich, Ørsted, São Paulo', 'Travel'], ['Pay $1,234.56 to ACME Corp (PO #A-77/β)', 'Money'], ['https://example.com/a/very/long/link?with=query&and=more#fragment is the doc to read', 'Work'],
];
const LONG_TASK = ('Compile everything needed for the annual compliance filing, including the signed attestations from each department head, the vendor list with certificate expiry dates, the incident log, the training completion report, and the evidence screenshots. ').repeat(14).trim().slice(0, 3900);
const NOTES = [
  'Meeting notes 11/3:\n- Priya wants the invoice by Friday\n- Marcus is out next week\n- Revisit pricing after the demo\n- Action: send revised scope',
  'Gift ideas for Mom\n• A good umbrella\n• The cookbook she mentioned\n• Tickets to the botanical garden\n• Handwritten letter',
  'Wifi password for the rental: not the same as the router. Door code changes Sunday.',
  'Book recommendations: The Overstory, Piranesi, Braiding Sweetgrass, A Gentleman in Moscow, Educated.',
  'Idea for the app: let a task become a mini-project when it has more than five steps.',
  'Recipe tweak: 20% less sugar, add a pinch of salt, bake 8 minutes longer at 170C.',
  'Things I noticed on the trip: trains are punctual, cash is rarely needed, museums close Mondays.',
  'Reminder to self: breathe before replying to hard emails.',
  'Paint colors considered: Hale Navy, Pale Oak, Evergreen Fog, Sea Salt.',
  'Car: oil change at 62,400 miles, tires rotate at 65,000, registration due in March.',
];
const longNote = () => Array.from({ length: int(14, 28) }, (_, i) => `${i + 1}. ${pick(['Remember', 'Compare', 'Revisit', 'Ask about', 'Draft'])} ${pick(['the budget', 'the timeline', 'who owns this', 'the risks', 'the vendor terms', 'the first customer', 'a smaller version'])} — ${pick(['before Friday', 'after the demo', 'with Priya', 'when I have a quiet hour', 'if the numbers hold'])}.`).join('\n');
const REM = ['Take out the recycling', 'Renew library books', 'Call Mom', 'Water the plants', 'Submit expense report', 'Pick up the dry cleaning', 'Pay the parking ticket', 'Check in for the flight', 'Back up the laptop', 'Stand-up with design', 'Refill prescription', 'Send the invoice', 'Cancel the free trial', 'Take vitamins', 'Move the car for street cleaning', 'Order the birthday cake', 'Lock the greenhouse', 'Call the insurance agent', 'Rotate the tires', 'Plan next week'];

const captures = [];
const base = () => ({ id: id('ca'), owner_id: '', source: pick(['List', 'Quick Capture', 'List', 'Imported']), batch_id: null, batch_text: null, completed_at: null, archived_at: null, status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null, edited_text: null, display_title: null, user_priority: null, remind_at: null, remind_done_at: null, revision: 1 });
function add(over) {
  const created = over.created_at ?? at(int(0, 100)); const c = { ...base(), kind: 'todo', ...over, created_at: created, updated_at: created };
  if (c.kind === 'todo') {
    if (chance(.16)) c.user_priority = 'high'; else if (chance(.24)) c.user_priority = 'medium'; else if (chance(.2)) c.user_priority = 'low';
    if (chance(.3)) c.completed_at = new Date(Date.parse(created) + int(1, 20) * 3600000).toISOString();
  }
  if (chance(.05) && !over.keepOpen) c.archived_at = new Date(Date.parse(created) + int(1, 30) * DAY).toISOString();
  if (chance(.08) && c.kind !== 'note') c.edited_text = c.text.replace(/^(\w+)/, m => m + ' (reworded)').slice(0, 200);
  if (chance(.04)) { c.review_state = pick(['deferred', 'rejected']); }
  captures.push(c); return c;
}
// the assistant triggers, always open and recent so they land near the top
for (const [text, f] of FIXED) { const c = add({ text, folder_id: F[f], created_at: at(int(0, 3)), keepOpen: true }); c.completed_at = null; c.archived_at = null; c.edited_text = null; c.user_priority ??= pick(['high', 'medium', null]); }
for (const [text, f] of EDGE) add({ text, folder_id: F[f] });
add({ text: LONG_TASK, folder_id: F.Work }); add({ text: 'Duplicate task for merge testing', folder_id: F.Home }); add({ text: 'Duplicate task for merge testing', folder_id: F.Home }); add({ text: 'duplicate task for merge testing.', folder_id: null });
// a pasted batch of five that arrived together
const batch = 'batch-1'; for (const t of ['Call the plumber', 'Book flights', 'Renew passport', 'Buy a gift for Sam', 'Reply to the landlord']) add({ text: t, folder_id: F.Home, batch_id: batch, batch_text: 'Call the plumber\nBook flights\nRenew passport\nBuy a gift for Sam\nReply to the landlord', created_at: at(2), keepOpen: true });
// the bulk: tasks
const names = Object.keys(POOL);
for (let i = 0; i < 2800; i++) { const f = chance(.12) ? null : pick(names), p = POOL[f ?? pick(names)]; add({ text: `${pick(p.verbs)} ${pick(p.objs)}${chance(.3) ? ` ${pick(['today', 'this week', 'before Friday', 'by month end', '(urgent)', 'if there is time', 'again'])}` : ''}`, folder_id: f ? F[f] : null }); }
// notes
for (const t of NOTES) add({ kind: 'note', text: t, folder_id: pick(Object.values(F)) });
for (let i = 0; i < 260; i++) add({ kind: 'note', text: chance(.15) ? longNote() : `${pick(['Thought', 'Observation', 'Link to read', 'Quote', 'Idea'])}: ${pick(['simplicity is a feature', 'ask better questions', 'the best meetings are short', 'write it down once', 'batch the small stuff', 'protect the morning', 'name things plainly'])}. ${pick(['', 'Come back to this.', 'Worth a longer note.', 'Share with the team?'])}`.trim(), folder_id: chance(.2) ? null : pick(Object.values(F)) });
// reminders: due now (not dismissed), dismissed, snoozed-looking, and future
for (let i = 0; i < 9; i++) add({ kind: 'reminder', text: `${REM[i]} (due now)`, folder_id: pick(Object.values(F)), remind_at: at(int(0, 6), 9, 0), created_at: at(14), keepOpen: true });
for (let i = 0; i < 12; i++) { const r = at(int(7, 40), 9, 30); add({ kind: 'reminder', text: `${pick(REM)} (dismissed)`, folder_id: pick(Object.values(F)), remind_at: r, remind_done_at: new Date(Date.parse(r) + 600000).toISOString(), created_at: at(45), keepOpen: true }); }
for (let i = 0; i < 100; i++) add({ kind: 'reminder', text: `${pick(REM)}${chance(.4) ? ` #${int(1, 40)}` : ''}`, folder_id: chance(.2) ? null : pick(Object.values(F)), remind_at: future(int(0, 150), int(7, 20), pick([0, 15, 30, 45])), created_at: at(int(0, 20)), keepOpen: true });
for (let i = 0; i < 4; i++) add({ kind: 'reminder', text: `${REM[i + 9]} (no time set)`, folder_id: null, keepOpen: true });
// tasks that also carry a reminder, including one due now
for (const c of captures.filter(x => x.kind === 'todo' && !x.completed_at && !x.archived_at).slice(40, 80)) c.remind_at = future(int(1, 90), 10, 0);
const dueTask = captures.find(x => x.kind === 'todo' && !x.completed_at && !x.archived_at && !x.remind_at); dueTask.remind_at = at(1, 8, 0);

// Outcomes, steps, dependencies, and focus
const outcomeDefs = [
  ['Launch the personal site', 'Side project', 'now'], ['Pass the compliance audit', 'Work', 'now'], ['Lisbon trip, fully planned', 'Travel', 'now'],
  ['Get finances in order for tax time', 'Money', 'next'], ['Run a 5k in under 30 minutes', 'Health', 'next'], ['Renovate the guest room', 'Home', 'next'], ['Ship v2 of the app', 'Side project', 'next'],
  ['Hire a designer', 'Work', 'later'], ['Declutter the garage', 'Home', 'later'], ['Build an emergency fund', 'Money', 'later'], ['Learn Portuguese basics', 'Travel', 'later'], ['Annual health checkups', 'Health', 'later'],
  ['Migrate the old blog', 'Side project', 'later'], ['Finish the kitchen backsplash', 'Home', 'done'],
];
const STEPS = ['Decide scope', 'Collect what exists', 'Make the first draft', 'Get feedback', 'Fix the top three issues', 'Schedule the work', 'Do the main part', 'Double-check the details', 'Tell the people involved', 'Wrap up and archive'];
const outcomes = [], tasks = [], focus = [], relationships = [];
outcomeDefs.forEach(([name, f, lane], oi) => {
  const o = { id: id('ou'), ...meta(at(60 - oi)), folder_id: F[f], name, description: `${name}: done means everything below is finished and I can stop thinking about it.`, pinned: lane === 'now' && oi === 0, deadline: chance(.7) ? `2026-${pick(['12', '12', '12'])}-${String(int(1, 28)).padStart(2, '0')}` : null, effort: pick([null, '2 weeks', '1 month', 'a weekend', '10 hours']), done_at: lane === 'done' ? at(10) : null, last_worked_at: chance(.7) ? at(int(0, 15)) : null, sources: [] };
  outcomes.push(o); focus.push({ id: id('fa'), ...meta(at(30)), outcome_id: o.id, lane, position: focus.filter(x => x.lane === lane).length });
  const k = int(6, 10), mine = [];
  for (let s = 0; s < k; s++) { const t = { id: id('ta'), ...meta(at(40 - s)), outcome_id: o.id, name: `${STEPS[s]}${s > 3 ? ` for ${name.split(' ').slice(0, 2).join(' ')}` : ''}`, notes: chance(.3) ? 'Notes: keep it simple; ask for help if blocked.' : '', folder_id: null, done_at: (lane === 'done' || (s < 2 && chance(.7)) ) ? at(int(1, 20)) : null, archived_at: null, deadline: chance(.2) ? `2026-12-${String(int(1, 28)).padStart(2, '0')}` : null, effort: chance(.4) ? pick(['30 min', '1 hour', '2 hours', 'half a day']) : null, position: s, sources: [] }; tasks.push(t); mine.push(t); }
  mine.slice(1).forEach((t, i) => { if (chance(.55)) relationships.push({ id: id('re'), ...meta(at(20)), from_type: 'task', from_id: mine[i].id, to_type: 'task', to_id: t.id, kind: 'blocks', description: '', confirmed: chance(.7), source: 'user' }); });
});
// some outcome steps come from captures (so the assistant and rows see them)
for (const c of captures.filter(x => x.kind === 'todo' && !x.archived_at).slice(100, 160)) { const t = pick(tasks.filter(x => !x.done_at)); t.sources.push(c.id); c.task_id = t.id; c.status = 'organized'; c.organized_as = 'Task'; }
// loose tasks that live in a folder, not an outcome
for (let i = 0; i < 40; i++) { const f = pick(names), p = POOL[f]; tasks.push({ id: id('ta'), ...meta(at(int(0, 30))), outcome_id: null, name: `${pick(p.verbs)} ${pick(p.objs)}`, notes: '', folder_id: F[f], done_at: chance(.2) ? at(int(0, 10)) : null, archived_at: null, deadline: null, effort: null, position: i, sources: [] }); }
// cross relationships: decisions inform outcomes; related outcomes
const decDefs = [['Which airline for Lisbon?', 'Travel', ['TAP direct', 'Layover in Madrid via Iberia', 'Budget carrier with a bag fee'], false], ['Standing desk or sit-stand converter?', 'Work', ['Full standing desk', 'Converter', 'Keep the current desk'], false], ['Rent a car or use trains?', 'Travel', ['Rental', 'Trains and ride-shares'], true], ['Hire a freelance designer or an agency?', 'Work', ['Freelancer', 'Agency', 'Do it myself with templates'], false], ['Pay down the card or build the emergency fund first?', 'Money', ['Pay down the card', 'Emergency fund first', 'Split 50/50'], true], ['Which hosting for v2?', 'Side project', ['Netlify and Supabase', 'A single VPS', 'A managed platform'], false], ['Repaint or wallpaper the guest room?', 'Home', ['Paint', 'Wallpaper accent wall'], false], ['Run the 5k in spring or fall?', 'Health', ['Spring', 'Fall'], true]];
const decisions = [], decisionOptions = [], decisionLog = [];
decDefs.forEach(([name, f, opts, resolved], i) => {
  const chosen = resolved ? opts[0] : '';
  const d = { id: id('de'), ...meta(at(30 - i)), folder_id: F[f], name, description: 'A real choice with trade-offs.', status: resolved ? 'resolved' : 'open', evidence: 'Compared prices and read three reviews.', notes: '', chosen_option: chosen, conclusion: resolved ? 'Went with the simplest option.' : '', rationale: resolved ? 'Lowest effort, good enough.' : '', resolved_at: resolved ? at(3) : null, sources: [], criteria: 'cost, effort, risk' };
  decisions.push(d); opts.forEach((text, k) => decisionOptions.push({ id: id('do'), ...meta(at(29)), decision_id: d.id, text, position: k, pros: pick(['Cheaper', 'Simple', 'Familiar', 'Flexible']), cons: pick(['Slower', 'More effort', 'Riskier', 'Less flexible']) }));
  decisionLog.push({ id: id('dl'), owner_id: '', decision_id: d.id, type: 'created', text: 'Opened this decision.', at: at(30 - i) }); if (resolved) decisionLog.push({ id: id('dl'), owner_id: '', decision_id: d.id, type: 'resolved', text: `Chose ${chosen}.`, at: at(3) });
  relationships.push({ id: id('re'), ...meta(at(25)), from_type: 'decision', from_id: d.id, to_type: 'outcome', to_id: outcomes[i % 8].id, kind: 'informs', description: 'Outcome depends on this choice', confirmed: true, source: 'user' });
});
relationships.push({ id: id('re'), ...meta(at(20)), from_type: 'outcome', from_id: outcomes[0].id, to_type: 'outcome', to_id: outcomes[6].id, kind: 'related', description: '', confirmed: true, source: 'user' });
const ideas = Array.from({ length: 24 }, (_, i) => ({ id: id('id'), ...meta(at(int(0, 90))), folder_id: chance(.8) ? pick(Object.values(F)) : null, name: pick(['A weekend in the mountains', 'Weekly review ritual', 'Photo book of the year', 'Cook one new recipe a week', 'Try a no-meeting Wednesday', 'Read in the morning', 'Build a tiny habit tracker', 'Volunteer at the garden', 'Learn to fix a bike']) + ` #${i + 1}`, notes: chance(.5) ? 'Keep it light. No commitment yet.' : '', archived_at: chance(.12) ? at(5) : null, sources: [] }));

const out = { folders, outcomes, focus, tasks, captures, decisions, decisionOptions, decisionLog, ideas, relationships, settings: { owner_id: '', workspace_name: 'Large test workspace', current_focus_outcome_id: outcomes[0].id, priority_dismissed: [], research_opt_in: false, created_at: at(120), updated_at: at(0), revision: 1 } };
mkdirSync('docs/test-data', { recursive: true });
const text = JSON.stringify(out, null, 1); writeFileSync('docs/test-data/exe-test-data.json', text);
console.log({ bytes: text.length, captures: captures.length, todo: captures.filter(c => c.kind === 'todo').length, notes: captures.filter(c => c.kind === 'note').length, reminders: captures.filter(c => c.kind === 'reminder').length, outcomes: outcomes.length, tasks: tasks.length, relationships: relationships.length });
