// The Exe help center. Plain language, one page per feature. `npm run build:support` turns this into web/public/support/*.html.
// Every button name below is the exact label in the app. If a label changes in the app, change it here (a test checks the key ones).
const tip = t => `<div class="callout tip"><strong>Tip.</strong> ${t}</div>`;
const note = t => `<div class="callout note"><strong>Good to know.</strong> ${t}</div>`;
const warn = t => `<div class="callout warn"><strong>Careful.</strong> ${t}</div>`;
const steps = list => `<ol class="steps">${list.map(s => `<li>${s}</li>`).join('')}</ol>`;
const b = t => `<span class="btn">${t}</span>`;           // a button as it appears in the app
const k = t => `<kbd>${t}</kbd>`;

export const pages = [
{ slug: 'index', title: 'Help center', nav: 'Home', summary: 'Everything you need to use Exe.', body: `
<p class="lead">Exe is a simple list that quietly helps. Write things down, tick them off, and, if you choose, let AI suggest priorities, groups and drafts. Nothing changes without you.</p>
<div class="cards">
  <a class="card-link" href="getting-started.html"><strong>Getting started</strong><span>Your first 10 minutes, step by step.</span></a>
  <a class="card-link" href="list.html"><strong>The List</strong><span>Tasks, notes and reminders, with no AI needed.</span></a>
  <a class="card-link" href="status-and-tasks.html"><strong>Status and All tasks</strong><span>What to work on, grouped.</span></a>
  <a class="card-link" href="faq.html"><strong>Questions and fixes</strong><span>Plain answers, and what to do when something looks wrong.</span></a>
</div>
<h2>The five tabs</h2>
<ul class="topic-list">
  <li><strong>Status</strong>: your top tasks and your groups.</li>
  <li><strong>List</strong>: everything you save. Quick, checkable, always works.</li>
  <li><strong>Activity</strong> (<strong>Activity Log</strong> on a computer): a timeline of what the AI did and what you decided.</li>
</ul>
<h2>All the topics</h2>
<ul class="topic-list">
  <li><a href="getting-started.html">Getting started</a></li>
  <li><a href="list.html">The List: tasks, notes and reminders</a></li>
  <li><a href="reminders.html">Reminders</a></li>
  <li><a href="status-and-tasks.html">Status, All tasks and groups</a></li>
  <li><a href="assistant.html">The AI assistant for a task</a></li>
  <li><a href="activity-log.html">Activity Log</a></li>
  <li><a href="folders.html">Folders</a></li>
  <li><a href="ai-setup.html">Turning on AI with your own key</a></li>
  <li><a href="backup-and-settings.html">Settings, backup and restore</a></li>
  <li><a href="account-and-privacy.html">Your account, saving and privacy</a></li>
  <li><a href="faq.html">Questions, fixes and glossary</a></li>
</ul>` },

{ slug: 'getting-started', title: 'Getting started', nav: 'Getting started', summary: 'Your first 10 minutes with Exe.', body: `
<p class="lead">Follow these steps once and you will know how everything fits together.</p>
<h2>1. Sign in</h2>
${steps([
 'Open Exe in your browser. On a phone you can add it to your home screen: in Safari tap Share, then <em>Add to Home Screen</em>.',
 'Choose <strong>Create an account</strong>, enter your email and a password of at least 8 characters, then press <strong>Create account</strong>.',
 'If you are asked to confirm your email, open the message we sent and follow the link. Then return and press <strong>Sign in</strong>.'])}
${note('Your workspace is private to you.')}
<h2>2. Save your first thoughts</h2>
${steps([
 `Press the blue ${b('+')} button (on a computer you can also press ${k('Ctrl')}+${k('K')}, or ${k('⌘')}+${k('K')} on a Mac).`,
 'Type or paste anything on your mind. To add several tasks at once, put each on its own line:<pre>Call the plumber\nBook flights\nRenew passport</pre>',
 'Press <strong>Save</strong>. Each line becomes its own task in your List.'])}
<h2>3. Use your List</h2>
<p>Open <strong>List</strong>. Tick the round box to finish a task. Use the three dots on a row to change its type, move it to a folder, set a priority, edit or archive it. Details are in <a href="list.html">The List</a>.</p>
<h2>4. See what to work on</h2>
<p>Open <strong>Status</strong>. The <strong>All tasks</strong> card shows your top tasks, high priority first. Press <strong>View all tasks</strong> to see everything. Below it, <strong>Groups</strong> collects related tasks. See <a href="status-and-tasks.html">Status, All tasks and groups</a>.</p>
<h2>5. Optional: turn on AI</h2>
<p>Exe works fully without AI. If you want suggestions and drafts, follow <a href="ai-setup.html">Turning on AI with your own key</a>.</p>` },

{ slug: 'list', title: 'The List: tasks, notes and reminders', nav: 'List', summary: 'Save things fast and keep them in order.', body: `
<p class="lead">The List is where everything you save lives. It never needs AI, and it is always fast.</p>
<h2>Three types</h2>
<table class="table"><tbody>
<tr><th scope="row">Task</th><td>Something to do. It has a round checkbox. Pasting a list makes one task per line.</td></tr>
<tr><th scope="row">Note</th><td>A thought or some info. It is never split up and has no checkbox.</td></tr>
<tr><th scope="row">Reminder</th><td>Something to be reminded of at a time you choose. See <a href="reminders.html">Reminders</a>.</td></tr>
</tbody></table>
<h2>Add something</h2>
${steps(['Type in the box at the top. The small button on its left shows the type (<strong>Task</strong>, <strong>Note</strong> or <strong>Reminder</strong>); press it to change.', 'Press the arrow (or Enter for a task).'])}
<h2>Change or organize an entry</h2>
<p>Press the three dots on a row. You can change its <strong>Type</strong>, move it to a <strong>Folder</strong>, set a <strong>Priority</strong> (tasks), set <strong>Remind me</strong>, <strong>Edit</strong> it, or <strong>Archive</strong> it. Your original words are always kept.</p>
<h2>Priority</h2>
<p>Priority is shown as a small colored dot: red is High, orange is Medium, yellow is Low. A filled dot is one you chose. A ring is the AI’s suggestion. Your choice always wins. In Settings, <strong>Priority labels</strong> lets you show AI suggestions, only your own, or none.</p>
<h2>Finding things</h2>
<p>Use the filter at the top (All, Tasks, Notes, Reminders). Finished tasks move to <strong>Done</strong> at the bottom of the list; tap it to open. <strong>View archived</strong> shows what you archived, and <strong>Restore</strong> brings it back. Very long lists show 200 at a time (<strong>Show 200 more</strong>).</p>
<h2>AI help on entries</h2>
<p>With AI turned on, Exe looks at new entries in the background (a few at a time, never while you type) and shows a small label when it can help: <strong>Draft ready</strong>, <strong>Answer ready</strong>, <strong>Research available</strong>, <strong>Can help break this down</strong> or <strong>Preparation available</strong>. Tap the label to see it, copy or edit a draft, or <strong>Dismiss</strong> it. Routine entries like chores are skipped. To ask about any entry, open its three dots and press <strong>Ask Exe</strong>. Drafts are never sent, research only runs when you ask, and suggested searches are not verified sources.</p>
` },

{ slug: 'reminders', title: 'Reminders', nav: 'Reminders', summary: 'Be reminded inside Exe at a time you choose.', body: `
<p class="lead">A reminder shows a banner at the top of Exe when its time comes.</p>
<h2>Set one</h2>
${steps([
 'Press the type button in the List and choose <strong>Reminder</strong> (or choose Reminder in the capture box).',
 'Write what to be reminded about. Pick <strong>Remind me at</strong>, or press a quick time such as <strong>Tomorrow morning</strong>.',
 'Press the arrow. Reminders need a time, so the button stays off until you pick one.'])}
<p>A task can have a reminder too: open its three dots and use <strong>Remind me</strong>.</p>
<h2>When it is due</h2>
<p>A banner appears with <strong>1 hour</strong> and <strong>Tomorrow</strong> to snooze it, and <strong>Dismiss</strong> to clear it. Dismissing only clears the reminder; the entry stays in your List.</p>
${warn('Reminders show only while Exe is open. Exe does not send notifications, texts, emails or calendar invitations. If you have the page open or come back to it, a due reminder appears within about 30 seconds.')}` },

{ slug: 'status-and-tasks', title: 'Status, All tasks and groups', nav: 'Status', summary: 'See what to work on, grouped.', body: `
<p class="lead">Status is your home screen.</p>
<h2>All tasks</h2>
<p>The large card shows your top tasks (3 on a phone, 5 on a computer), high priority first. Press <strong>View all tasks</strong> to open the full screen: tasks sorted into High, Medium, Low and No priority, with a <strong>Done</strong> section you can open.</p>
<h2>The AI mark</h2>
<p>A small sparkle on a task means the AI has looked at it. Filled means it has a question for you. Press it to open details and the assistant. Tapping the task text just shows its details.</p>
<h2>Groups</h2>
<p>Under the card, <strong>Groups</strong> collects related tasks. Each group shows how many tasks it has and how many are High, Medium and Low. Tasks that are not in a group wait in <strong>Not grouped yet</strong>. Open a group to see its tasks and the AI help for each.</p>
<p>The AI can suggest a group name for tasks that belong together. It only becomes a group when you accept it.</p>
${note('Everything on these screens is real. If you have no tasks, Status says so instead of showing examples.')}` },

{ slug: 'assistant', title: 'The AI assistant for a task', nav: 'AI assistant', summary: 'Ask for a draft, an answer or a next step.', body: `
<p class="lead">Open a task’s details to restore its saved help. Opening Exe, importing entries, browsing and opening task details do not generate AI work. To ask for new help, press <strong>Prepare help</strong> or type a question. It needs AI turned on (<a href="ai-setup.html">AI setup</a>).</p>
<p>A list review runs only when you press <strong>Review next</strong>. It analyzes up to four entries once, suggests priorities and relationships, and stops. It does not prepare drafts for every entry. Drafts and answers are prepared for the individual task you ask about.</p>
<p>If your provider reaches a limit, Exe pauses AI and shows a countdown. Your entries and typed question are kept. When the countdown ends, you choose whether to try again; Exe does not restart a background sweep.</p>
<h2>What it does</h2>
<ul>
  <li>Asks <strong>one question at a time</strong> when it needs to (for example whether a message should be a text or an email).</li>
  <li>Offers at most <strong>three</strong> suggested actions, with the rest under <strong>More</strong>.</li>
  <li>Produces drafts, checklists or short answers, and keeps earlier versions when you refine one (“Shorter”, “More formal”).</li>
  <li>Remembers the conversation for that task.</li>
</ul>
<h2>What it never does</h2>
<ul>
  <li>It never sends anything. <strong>Copy</strong> puts a draft on your clipboard, and you send it yourself.</li>
  <li>It does not book, call, buy, look things up live or complete anything for you.</li>
  <li>Links it gives are searches you open yourself.</li>
</ul>
${warn('AI can be wrong. Check facts, names, dates and amounts before you use a draft.')}
<p>Each thing it prepares is logged in the <a href="activity-log.html">Activity Log</a>.</p>` },

{ slug: 'activity-log', title: 'Activity Log', nav: 'Activity Log', summary: 'A timeline of what the AI did and what you decided.', body: `
<p class="lead">Open <strong>Activity</strong> (called <strong>Activity Log</strong> on a computer) to see, newest first and grouped by day, what the AI suggested or prepared and what you chose to do with it.</p>
<ul>
  <li><strong>AI</strong> lines are things it did: priorities suggested, a group suggested, a draft prepared, a failure.</li>
  <li><strong>You</strong> lines are choices you made from its suggestions, for example accepting a group or changing a priority.</li>
</ul>
<p>The log stores small facts only, never your full text or drafts. It is for review; nothing here can be changed.</p>` },

{ slug: 'folders', title: 'Folders', nav: 'Folders', summary: 'Keep areas of your life separate.', body: `
<p class="lead">Folders are separate workspaces. <strong>All</strong> shows everything together.</p>
${steps(['Press the folder name at the top (computer) or open the folders control on your phone.', 'Choose <strong>All</strong> or a folder, or press <strong>New folder</strong>, name it, and press <strong>Create folder</strong>.'])}
<p>While a folder is chosen, the List, Status and Activity show only that folder, and new entries go into it. In All, new entries are unfiled. You can move an entry from its three dots. <strong>Delete folder</strong> keeps everything inside it (it becomes unfiled).</p>` },

{ slug: 'ai-setup', title: 'Turning on AI with your own key', nav: 'AI setup', summary: 'Optional, private, and under your control.', body: `
<p class="lead">Exe works fully without AI. For suggestions and drafts, you connect your own account with an AI company and pay them directly. Exe has no AI bill and never sends anything on its own.</p>
<h2>What AI can and cannot do</h2>
<ul>
  <li><strong>Can:</strong> suggest priorities and groups, notice what depends on what, and prepare drafts, checklists and answers for a task.</li>
  <li><strong>Cannot:</strong> delete, complete, send, or change your priorities. Everything is a suggestion you accept.</li>
  <li>Every answer is checked against a strict format. If the AI answers badly, Exe ignores it.</li>
</ul>
<h2>Set it up</h2>
${steps([
 'Sign in (AI needs an account, because your key is stored encrypted on the server).',
 'Get an API key from <strong>Anthropic</strong>, <strong>OpenAI</strong>, <strong>Google Gemini</strong> or <strong>Groq</strong>, and note the <strong>model name</strong> your provider gives you.',
 'Open <strong>Settings → AI (your own key)</strong>. Choose the provider, type the model name, paste the key, and press <strong>Save key</strong>.',
 'Read the notice, then press <strong>I understand, turn on AI</strong>.',
 'Press <strong>Test connection</strong>. It sends only a tiny test message, no personal text.'])}
${warn('Your key is shown only as its last 4 characters after you save it. Treat it like a password. If you lose track of it, press <strong>Remove key</strong> and make a new one with your provider.')}
<h2>Which provider?</h2>
<p>OpenAI and Anthropic need prepaid credit. Groq has a free plan with usage limits (try the model <code>openai/gpt-oss-20b</code>). Gemini’s free tier is not available in every region or account. Free plans may keep or use your prompts, so check the provider’s privacy terms before sending anything personal.</p>
<h2>What is sent</h2>
<p>Only when you ask (or open the assistant on a task), Exe sends that task’s text, or for suggestions the text of your open tasks and your folder names, to your provider. Nothing is sent otherwise.</p>
<h2>Turning it off</h2>
<p><strong>Turn off</strong> stops all AI. <strong>Remove key</strong> deletes the stored key. <strong>Replace key</strong> saves a new one.</p>
${note('If you see “AI is not set up on the server yet”, the site owner has not finished setup. Everything else still works.')}` },

{ slug: 'backup-and-settings', title: 'Settings, backup and restore', nav: 'Settings & backup', summary: 'Keep your work safe and bring in old data.', body: `
<p class="lead">Open Settings from the left menu (computer) or by tapping your initial at the top right (phone).</p>
<h2>Workspace name</h2>
<p>Type a name and press <strong>Save name</strong>. It appears in the menu.</p>
<h2>Download a backup</h2>
<p>Press <strong>Download JSON backup</strong>. You get a file containing your folders, tasks, notes, reminders and everything else you saved. <strong>Please do this now and then.</strong> It is your safety copy.</p>
<h2>Restore or import</h2>
${steps([
 'In Settings, under <strong>Restore or import</strong>, choose a backup file. It can be one downloaded from this version, or the file exported by the original Exe prototype.',
 'Exe shows what is inside (counts of each kind) and any warnings. <strong>Nothing has changed yet.</strong>',
 'Pick how to add it: <strong>Add to what I have</strong> keeps everything already here (recommended), or <strong>Replace everything with this backup</strong>.',
 'For Replace, press <strong>Download a copy of my current workspace</strong> first, so you can go back. Then press the final button.'])}
<ul>
  <li>Original wording is kept, and nothing is marked done that was not.</li>
    <li>Relationships that could not be kept (a missing item, a loop or a duplicate) are skipped and counted in the warnings.</li>
  <li>Files that are not backups, or are too large, are refused without changing anything.</li>
</ul>
<h2 id="history">History</h2>
<p><strong>Open history</strong> lists, in plain words, what you approved, applied or undid. For what the AI did, see the <a href="activity-log.html">Activity Log</a>.</p>
<h2>Priority labels</h2>
<p>Choose whether to show the AI’s suggested priorities, only the ones you set, or none.</p>
<h2>AI</h2>
<p>See <a href="ai-setup.html">Turning on AI with your own key</a>.</p>
<h2>Signing out</h2>
<p>Open Settings and press <strong>Sign out</strong> (on a computer it is also in the left menu). Closing the browser tab does not sign you out. If you are using Exe on a shared computer, sign out when you finish.</p>` },

{ slug: 'account-and-privacy', title: 'Your account, saving and privacy', nav: 'Account & privacy', summary: 'Offline use, other devices, conflicts and what is private.', body: `
<h2>Is my work private?</h2>
<ul>
  <li>Yes. Each account has its own private workspace. The database enforces that every row belongs to one owner, so other accounts cannot read yours.</li>
  <li>Exe does not sell or share your data and does not send anything to an AI company unless you turn AI on and press a button (see <a href="ai-setup.html">AI setup</a>).</li>
  <li>Your AI key is stored encrypted on the server and is never sent back to your browser.</li>
</ul>
<h2>How saving works</h2>
<p>The status at the top right (computer) tells you where things stand:</p>
<table class="table"><tbody>
<tr><th scope="row">Saved</th><td>Your latest changes are stored in your account.</td></tr>
<tr><th scope="row">Saving…</th><td>A change is being sent.</td></tr>
<tr><th scope="row">Saved on this device, not synced</th><td>You are offline. Your changes are kept on this device and sent automatically, in order, when the connection returns. Retries never create duplicates.</td></tr>
<tr><th scope="row">Needs your attention</th><td>Another device changed the same thing. See below.</td></tr>
</tbody></table>
<h2>Using more than one device</h2>
<p>Sign in with the same account on each. Open Exe and your latest saved work is there. Exe does not update live while it is open, so <strong>refresh the page</strong> to see changes made on another device.</p>
<h2>When two devices change the same thing</h2>
<p>Exe never silently overwrites. It shows <strong>This changed on another device</strong>, and nothing was overwritten. Your unsent changes are set aside and newer changes wait. Press <strong>Download my unsent changes</strong> to keep a copy, then <strong>Use the latest version</strong>. Redo anything you still want.</p>
<h2>Your data and the free plan</h2>
<p>Keep a <a href="backup-and-settings.html">backup</a>. Some hosting plans have no automatic backups, and a service that is not used for a while may pause until its owner resumes it. A backup file keeps your work safe either way.</p>` },


{ slug: 'faq', title: 'Questions, fixes and glossary', nav: 'FAQ', summary: 'Plain answers and what to do when something looks wrong.', body: `
<h2>Questions</h2>
<h3>Why does Status say “Nothing to work on yet”?</h3><p>A new Exe starts empty. Add a task with the blue + button.</p>
<h3>Can the AI change my work?</h3><p>No. It suggests; you decide. It never deletes, completes, sends or reprioritizes on its own.</p>
<h3>Why is a priority dot a ring?</h3><p>A ring is the AI’s suggestion. Set a priority yourself and it becomes a filled dot. Yours always wins.</p>
<h3>Does AI cost money?</h3><p>Exe does not charge for AI. If you add your own key, your AI company bills you for what you use.</p>
<h3>Will I get a notification for a reminder?</h3><p>No. Reminders appear inside Exe while it is open. See <a href="reminders.html">Reminders</a>.</p>
<h3>How do I undo something?</h3><p>Archived entries have <strong>Restore</strong>. A checked task can be unchecked. Changing a type or priority can be changed back from the same menu.</p>
<h3>Can I delete something for good?</h3><p>Exe prefers archiving. Deleting a folder keeps everything inside.</p>
<h2>Fixes</h2>
<table class="table"><thead><tr><th scope="col">If you see…</th><th scope="col">Try this</th></tr></thead><tbody>
<tr><th scope="row">Nothing happens when I save text</th><td>Refresh the page and try again. If it keeps happening, download a backup, then tell whoever runs your Exe.</td></tr>
<tr><th scope="row">“Saved on this device, not synced”</th><td>You are offline or the service is unreachable. Keep working; it sends itself when the connection returns.</td></tr>
<tr><th scope="row">“This changed on another device”</th><td>See <a href="account-and-privacy.html">Your account, saving and privacy</a>.</td></tr>
<tr><th scope="row">Another device’s changes are missing</th><td>Refresh the page. Exe does not update live.</td></tr>
<tr><th scope="row">Cannot sign in or the confirmation email never arrived</th><td>Check your spam folder. Then try <strong>Create an account</strong> again with the same email, or ask whoever runs your Exe.</td></tr>
<tr><th scope="row">“AI is not set up on the server yet”</th><td>The site owner has not finished AI setup. Everything else works.</td></tr>
<tr><th scope="row">“Your provider rejected the key” / “does not know that model name”</th><td>Open Settings, check the key and the model name exactly as your provider shows them, and save again.</td></tr>
<tr><th scope="row">The assistant says it couldn’t prepare help</th><td>Press retry. If it repeats, check your key in Settings. The attempt is logged in the Activity Log.</td></tr>
<tr><th scope="row">The page looks old or out of date</th><td>Close the tab and open it again, or hard refresh (${k('Ctrl')}/${k('⌘')}+${k('Shift')}+${k('R')}).</td></tr>
</tbody></table>
<h2>Shortcuts</h2>
<table class="table"><tbody>
<tr><th scope="row">${k('Ctrl')}/${k('⌘')}+${k('K')}</th><td>Quick Capture, from anywhere.</td></tr>
<tr><th scope="row">${k('Esc')}</th><td>Close the open box.</td></tr>
<tr><th scope="row">${k('Tab')}</th><td>Move between buttons and fields. Everything in Exe can be used with a keyboard.</td></tr>
<tr><th scope="row">${k('Enter')}</th><td>In <em>Add a task</em>, adds it to your List.</td></tr>
</tbody></table>
<h2>Glossary</h2>
<dl class="glossary">
<dt>Capture</dt><dd>Anything you saved, exactly as you wrote it. Never removed by Exe or AI.</dd>
<dt>Task, Note, Reminder</dt><dd>The three types of entry in the List.</dd>
<dt>Group</dt><dd>Related tasks collected together on Status.</dd>
<dt>Priority</dt><dd>High, Medium or Low, shown as a colored dot.</dd>
<dt>Suggestion</dt><dd>Something the AI proposes. It does nothing until you accept it.</dd>
<dt>Activity Log</dt><dd>The timeline of what the AI did and what you chose.</dd>
</dl>` },
];
