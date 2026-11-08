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
<p class="lead">Exe helps you get things out of your head, decide what matters, and start the next useful step. It never changes your work behind your back.</p>
<div class="cards">
  <a class="card-link" href="getting-started.html"><strong>Getting started</strong><span>Your first 10 minutes, step by step.</span></a>
  <a class="card-link" href="focus.html"><strong>Focus and your priorities</strong><span>The home screen, up to three active priorities, Focus Mode.</span></a>
  <a class="card-link" href="faq.html"><strong>Questions and fixes</strong><span>Plain answers, and what to do when something looks wrong.</span></a>
</div>
<h2>The five ideas behind Exe</h2>
<ol class="steps">
  <li><strong>Capture</strong> anything, instantly, without sorting it. Use the blue ${b('+')} button.</li>
  <li><strong>Review</strong> it when you are ready. Exe can suggest what each thought is. You approve or reject.</li>
  <li><strong>Map</strong> your work into folders, outcomes (results you want) and small steps.</li>
  <li><strong>Decide</strong> open questions in one place, and see what each one is holding up.</li>
  <li><strong>Focus</strong> on at most three things at a time, and start with one clear step.</li>
</ol>
<h2>All the topics</h2>
<ul class="topic-list">
  <li><a href="getting-started.html">Getting started</a>: a guided first session.</li>
  <li><a href="capture-and-inbox.html">Capture and Inbox</a>: save thoughts fast, keep a simple to-do list.</li>
  <li><a href="ai-review.html">AI Review</a>: approve, reject, merge, split and undo suggestions.</li>
  <li><a href="map.html">Map: folders, outcomes, steps and dependencies</a>: organize real work.</li>
  <li><a href="decisions.html">Decisions</a>: options, evidence, comparing, resolving.</li>
  <li><a href="focus.html">Focus, priorities and Focus Mode</a>: the home screen and how it suggests what to do next.</li>
  <li><a href="ideas-and-search.html">Ideas and Search</a>: keep possibilities without committing.</li>
  <li><a href="ai-setup.html">Turning on AI with your own key</a>: optional, private, and under your control.</li>
  <li><a href="backup-and-settings.html">Settings, backup and restore</a>: keep your work safe, bring in the old prototype's data.</li>
  <li><a href="account-and-privacy.html">Your account, saving and privacy</a>: offline use, other devices, conflicts.</li>
  <li><a href="faq.html">Questions, fixes and glossary</a>.</li>
</ul>` },

{ slug: 'getting-started', title: 'Getting started', nav: 'Getting started', summary: 'Your first 10 minutes with Exe.', body: `
<p class="lead">Follow these steps once and you will know how everything fits together. Each step links to a longer page if you want more.</p>
<div class="toc"><strong>On this page</strong><ol>
<li><a href="#s1">Sign in</a></li><li><a href="#s2">Capture your first thoughts</a></li><li><a href="#s3">Look at your Inbox</a></li><li><a href="#s4">Make a folder and an outcome</a></li><li><a href="#s5">Add steps and choose what is active</a></li><li><a href="#s6">See your focus and start</a></li><li><a href="#s7">Optional: AI</a></li><li><a href="#s8">Back up your work</a></li></ol></div>

<h2 id="s1">1. Sign in</h2>
${steps([
 'Open Exe in your browser. On a phone you can add it to your home screen: in Safari tap Share, then <em>Add to Home Screen</em>; in Chrome open the menu, then <em>Add to Home screen</em>.',
 'Choose <strong>Create an account</strong>, enter your email and a password of at least 8 characters, then press <strong>Create account</strong>.',
 'If you are asked to confirm your email, open the message we sent and follow the link. Then return and press <strong>Sign in</strong>.',
 'You land on <strong>Mission Status</strong>. It says <em>Nothing here yet</em>. That is correct: a new Exe is empty, and nothing is added for you.'])}
${note('Your workspace is private to you. If Exe was set up to run <strong>on this device only</strong>, there is no sign-in and your data stays in this browser.')}

<h2 id="s2">2. Capture your first thoughts</h2>
<p>Capturing is the one thing Exe wants to be effortless. You do not have to say what a thought is, where it belongs, or when it is due.</p>
${steps([
 `Press the blue ${b('+')} button (on a computer you can also press ${k('Ctrl')}+${k('K')}, or ${k('⌘')}+${k('K')} on a Mac).`,
 'Type or paste anything on your mind. To add several at once, put each one on its own line:<pre>Call the plumber\nBook flights\nRenew passport</pre>',
 'Press <strong>Save</strong>. Each line becomes its own to-do in your Inbox. A long paragraph stays as one item.'])}
${tip('If you close the box before saving, your text is kept as a draft and is there when you reopen it (as long as this browser tab stays open).')}

<h2 id="s3">3. Look at your Inbox</h2>
<p>Open <strong>Inbox</strong> in the bottom bar (phone) or the left menu (computer). It is a plain checklist: newest first, with <strong>All</strong>, <strong>Active</strong> and <strong>Done</strong> filters. Tick a box to mark a to-do done. That changes nothing else. See <a href="capture-and-inbox.html">Capture and Inbox</a>.</p>

<h2 id="s4">4. Make a folder and an outcome</h2>
<p>An <strong>outcome</strong> is a result you want, like “Book the venue”. A <strong>folder</strong> groups related things, like Home or Work.</p>
${steps([
 'Open <strong>Map</strong>, then press <strong>New folder</strong>. Name it and press <strong>Create folder</strong>.',
 'Press <strong>Add outcome</strong>. Write the result you want. In <em>Definition of done</em>, say how you will know it is finished (optional but helpful). Press <strong>Add outcome</strong>.',
 'The new outcome starts in <strong>Later</strong>. You choose what becomes active.'])}

<h2 id="s5">5. Add steps and choose what is active</h2>
${steps([
 'On your outcome press <strong>Add step</strong> and write one small action. Or press <strong>Break it down</strong> and type several steps, one per line.',
 'Press <strong>Make active</strong> to make this outcome one of your <strong>active priorities</strong>. You can have at most <strong>three</strong>. If three are already active, Exe asks which one to replace.'])}
${note('The limit of three is on purpose. Exe is built to help you finish a few things, not to hold everything at once.')}

<h2 id="s6">6. See your focus and start</h2>
<p>Go to <strong>Focus</strong>. The big card is your <strong>Current Priority</strong>: its progress, its next step, and a button <strong>Enter Focus Mode</strong>. Focus Mode hides everything else so you can work on one outcome. Tick steps as you finish them. When every step is done, Exe asks whether the outcome is finished. That is always your decision. See <a href="focus.html">Focus, priorities and Focus Mode</a>.</p>

<h2 id="s7">7. Optional: AI</h2>
<p>Open <strong>AI Review</strong> to look at your new thoughts. Without AI, Exe makes simple word-based guesses and tells you so. You can <strong>approve</strong>, <strong>reject</strong> or put a suggestion aside with <strong>Not now</strong>. To get real AI suggestions, you add your own key in Settings. See <a href="ai-setup.html">Turning on AI</a>. Nothing is sent anywhere until you turn it on and ask.</p>

<h2 id="s8">8. Back up your work</h2>
<p>Open <strong>Settings</strong> and press <strong>Download JSON backup</strong>. Save the file somewhere safe. Do this now and then. See <a href="backup-and-settings.html">Settings, backup and restore</a>.</p>

<h2>You are set</h2>
<p>That is the whole loop: capture, review, map, decide, focus. Everything else in Exe is a way to make one of those steps easier. Questions? See <a href="faq.html">Questions and fixes</a>.</p>` },

{ slug: 'capture-and-inbox', title: 'Capture and Inbox', nav: 'Capture & Inbox', summary: 'Save thoughts fast and keep a simple to-do list.', body: `
<p class="lead">Capture first, organize later. The Inbox is a normal checklist that works with no AI at all.</p>
<h2>Quick Capture</h2>
<ul>
  <li>Tap the <strong>Capture something</strong> bar above the tab bar (always visible on a phone) or ${k('Ctrl')}/${k('⌘')}+${k('K')} on a computer. It works from every screen, including inside Focus Mode, and returns you to where you were.</li>
  <li><strong>Several thoughts at once:</strong> put each on its own line. If there are two or more lines and each is short (up to about 100 characters), or any line starts with <code>-</code>, <code>*</code>, <code>•</code> or a number like <code>1.</code>, each line becomes its own to-do and the list markers are removed.</li>
  <li><strong>One long thought:</strong> a paragraph, or lines that are long, stays as one item with its line breaks.</li>
  <li>Empty text cannot be saved. If you close the box, your unsaved text is kept as a draft while this browser tab stays open.</li>
</ul>
<h2>The Inbox</h2>
<ul>
  <li><strong>Add a to-do</strong> at the top adds one quickly without the capture box. Press ${k('Enter')} to add it and keep typing. Paste a whole list and each line becomes its own to-do. Use ${k('Shift')}+${k('Enter')} for a line break inside one to-do.</li>
  <li><strong>All / Active / Done</strong> filter the list, each with a count. Newest items are first. In Done, the most recently finished is first. Very long lists show 200 at a time with <strong>Show 200 more</strong>.</li>
  <li><strong>Tick the circle</strong> to mark a to-do done. This is only a checkmark on that to-do. It does not complete any step, decision or priority.</li>
  <li><strong>The ⋯ button</strong> on a row opens its details: when and how it was captured, whether it awaits review, and its folder.</li>
</ul>
<h3>Row actions</h3>
<ul>
  <li><strong>Folder</strong>: put it in a folder (or leave it <em>Unfiled</em>).</li>
  <li><strong>Edit</strong>: change the text. Your original wording is always kept and shown as <em>Original capture</em>.</li>
  <li><strong>Archive</strong> hides it without deleting. <strong>View archived</strong> at the bottom shows archived items, where <strong>Restore</strong> brings one back.</li>
</ul>
<h2>Help while you build your list</h2>
<p>If you have turned on AI (see <a href="ai-setup.html">Turning on AI</a>), Exe looks at new to-dos a few seconds after you stop typing and quietly adds suggestions. Every one is labeled <em>AI</em>, none of it changes your list by itself, and you can ignore all of it. Without AI, the list simply works as a checklist. If AI is off, a small <strong>Turn on AI help</strong> link appears above the list.</p>
<ul>
  <li><strong>Things that go together.</strong> A card named for the group lists the related to-dos and, when it spots one, a possible order (what to do first). <strong>Group these</strong> makes an outcome in <em>Later</em> with those to-dos as its steps. The suggested order is saved as an unconfirmed link: it does not hold anything up until you confirm it in Map. <strong>Not now</strong> hides the card. Your original to-dos stay in the Inbox.</li>
  <li><strong>Email drafts.</strong> When a to-do is about writing to someone, an <strong>Email draft</strong> appears under it. Open it, read it, fill in any [brackets], then <strong>Copy</strong> it or choose <strong>Open in email</strong>. Exe never sends anything.</li>
  <li><strong>Where to look.</strong> For research to-dos, such as how to register a business, Exe names a few official sources. Each link opens a search on that organization's own website, so you land on real pages rather than an address the AI guessed.</li>
  <li><strong>Quick answers.</strong> For simple facts, such as the capital of Australia, a short answer appears labeled <em>AI answer</em> with a link to check a source. Anything uncertain, recent, legal, medical or financial is sent to <em>Where to look</em> instead of answered. AI can be wrong, so check the source for anything important.</li>
  <li>If AI cannot be reached, a short <strong>AI help paused</strong> message appears with <strong>Try again</strong>. Your list is never affected.</li>
</ul>
<p>What is sent: only the text of your active to-dos, to the AI company you chose, using your own key. See <a href="account-and-privacy.html">Account and privacy</a>.</p>
${note('Exe never deletes a capture for you, and AI can never delete one.')}
<p>Next: <a href="ai-review.html">AI Review</a> turns captures into tasks, outcomes, decisions or ideas, only with your approval.</p>` },

{ slug: 'ai-review', title: 'AI Review', nav: 'AI Review', summary: 'Approve, reject, merge, split and undo suggestions.', body: `
<p class="lead">AI Review is where new captures get sorted. Exe suggests; you decide. Nothing is organized until you press an approve button, and reviewing is always optional.</p>
${note('Until you turn on AI with your own key (<a href="ai-setup.html">see how</a>), the suggestions come from simple word-matching rules, not an AI model. The screen says so. With AI on, a <strong>Get AI suggestions</strong> button appears.')}
<h2>What you see on each card</h2>
<ul>
  <li>Your <strong>original capture</strong>, exactly as written.</li>
  <li><strong>Suggested type</strong>: Task, Outcome, Decision, Idea, or <em>Just a note</em>. Change it if the guess is wrong.</li>
  <li><strong>Suggested folder</strong>. Exe only suggests a folder whose name appears in your text.</li>
  <li>A short reason, and (with AI on) what the AI was unsure about.</li>
</ul>
<h2>What you can do</h2>
<table class="table"><thead><tr><th scope="col">Button</th><th scope="col">What it does</th></tr></thead><tbody>
<tr><th scope="row">Approve &amp; organize</th><td>Creates the item (a step, outcome, decision or idea). Your capture is kept and marked organized. A step with no matching outcome asks where it goes (see below).</td></tr>
<tr><th scope="row">Not now</th><td>Moves it to <strong>Set aside</strong>. Nothing is lost, and there is no timer. <strong>Review again</strong> brings it back.</td></tr>
<tr><th scope="row">Reject</th><td>Does not apply the suggestion and never changes your capture. Exe remembers, so the same suggestion is not offered again unless you change the type or folder.</td></tr>
<tr><th scope="row">Split…</th><td>Turns one capture into several items. Edit the pieces, pick a type for each, press <strong>Split</strong>. The original stays whole.</td></tr>
<tr><th scope="row">Preview merge</th><td>Appears when two waiting captures look alike. You see both and the result. <strong>Merge</strong> makes one item; both captures are kept and linked to it.</td></tr>
<tr><th scope="row">Approve selected (n)</th><td>Tick the box on several cards, then press this. A preview lists exactly what will be created before you confirm.</td></tr>
<tr><th scope="row">Approve all</th><td>Approves every waiting capture with its current suggestion. Anything you rejected before is skipped, and steps with no matching outcome stay loose.</td></tr>
</tbody></table>
<h2>Where does this step go?</h2>
<p>If a task has no matching outcome, Exe never invents one. It asks: <em>leave it loose</em> (no outcome), <em>add it to an existing outcome</em>, or <em>create a new outcome</em> for it. Loose steps are listed in <strong>Map → All notes</strong>, and you can attach them later with the pencil button.</p>
<h2>Undo</h2>
<p><strong>Recently approved</strong> lists your last approvals with an <strong>Undo</strong> button. Undo removes only what the approval created, and only while you have not worked on it (for example, a step you ticked, or an outcome that now has steps, cannot be undone). The original capture always returns to the review list. Undone approvals appear in <a href="backup-and-settings.html#history">History</a>.</p>
${tip('With many captures waiting, the list shows 30 at a time. Use <strong>Show 30 more</strong>.')}` },

{ slug: 'map', title: 'Map: folders, outcomes, steps and dependencies', nav: 'Map', summary: 'Organize real work: folders, outcomes, steps and what depends on what.', body: `
<p class="lead">The Map answers “how does my work fit together?”. You can use Exe without ever opening it, but it is where you build the structure that Focus uses.</p>
<h2>The pieces</h2>
<table class="table"><tbody>
<tr><th scope="row">Folder</th><td>A group, like Home or Work. Optional.</td></tr>
<tr><th scope="row">Outcome</th><td>A result you want, for example “Confirm business registration”. Outcomes are what you make active.</td></tr>
<tr><th scope="row">Step</th><td>One small action that moves an outcome forward. A step can also be <em>loose</em> (no outcome).</td></tr>
<tr><th scope="row">Relationship</th><td>A link between two things, such as “this must finish before that”.</td></tr>
</tbody></table>
<h2>Folders</h2>
<ul>
  <li><strong>All notes</strong> (top of the list) shows everything, including items not yet filed. On a phone, tap the highlighted folder to open the list.</li>
  <li><strong>New folder</strong> creates one. <strong>Rename</strong> changes its name.</li>
  <li><strong>Delete folder</strong> never deletes what is inside. If it holds items, Exe asks where they should go: another folder, or <em>All notes (not filed)</em>.</li>
</ul>
<h2>Outcomes</h2>
<ul>
  <li><strong>Add outcome</strong>: name it, and (optionally) write the <em>Definition of done</em>.</li>
  <li><strong>Edit outcome</strong>: change the name, definition of done, folder, <strong>deadline</strong> and <strong>effort</strong>. Deadline and effort are your own entries. Exe never makes up a date.</li>
  <li><strong>Pin as priority</strong> tells the priority suggestions to keep it ahead. <strong>Unpin</strong> removes that.</li>
  <li><strong>Make active</strong>, <strong>Move to Next</strong> and <strong>Move to Later</strong> choose where it sits. At most three can be active. See <a href="focus.html#lanes">Next &amp; Later</a>.</li>
  <li><strong>Mark outcome done…</strong> asks you to confirm using your own definition of done. Finishing every step only <em>asks</em>; it never marks the outcome done by itself. Completing frees an active slot, and nothing is moved in automatically. <strong>Reopen outcome</strong> puts it back in Later.</li>
  <li>An outcome with no steps shows <em>Not measured</em>, never 0%.</li>
</ul>
<h2>Steps</h2>
<ul>
  <li><strong>Add step</strong>: one action. <strong>Break it down</strong>: type or paste several, one per line (see <a href="focus.html#breakdown">Break it down</a>).</li>
  <li><strong>Tick</strong> a step when it is done. This records the step and when you last worked on the outcome.</li>
  <li>The <strong>pencil</strong> opens <strong>Edit step</strong>: rename it; move it to another outcome (or make it loose); give it an <strong>Effort</strong> estimate such as <code>20 min</code> or <code>about 2 hours</code>; a <strong>Deadline</strong>; and <strong>Notes</strong>. <strong>Move up</strong> / <strong>Move down</strong> reorder; <strong>Archive step</strong> hides it from progress (a <strong>Restore</strong> button appears under <em>Archived steps</em>).</li>
</ul>
<h2>Relationships and dependencies</h2>
<p>Press <strong>Add relationship</strong>, choose <em>From</em>, the kind, and <em>To</em>.</p>
<table class="table"><thead><tr><th scope="col">Kind</th><th scope="col">Meaning</th></tr></thead><tbody>
<tr><th scope="row">blocks</th><td>The “from” item must be finished first. Only a <strong>confirmed</strong> block holds anything up.</td></tr>
<tr><th scope="row">informs</th><td>Useful context. It never holds anything up.</td></tr>
<tr><th scope="row">related</th><td>Connected, with no order.</td></tr>
</tbody></table>
<ul>
  <li>Tick <strong>Save as a suggestion only</strong> if you are not sure. It is labeled <em>Suggestion</em> and blocks nothing until you press <strong>Confirm</strong>. <strong>Remove</strong> deletes only the link, never the items.</li>
  <li>Exe refuses a link to itself and any <strong>loop</strong> (A blocks B blocks A), and tells you why.</li>
  <li>Items held up by a confirmed block show a red <em>Blocked</em> label. Red is used <strong>only</strong> for confirmed blocks.</li>
</ul>
<h2>Also in a folder</h2>
<p>Ideas (<a href="ideas-and-search.html">see Ideas</a>) and captures you filed there are listed at the bottom.</p>` },

{ slug: 'decisions', title: 'Decisions', nav: 'Decisions', summary: 'Options, evidence, comparing, and resolving.', body: `
<p class="lead">A decision is an unresolved question, like “Which city should we launch in?”. Keeping decisions apart from tasks shows you which unanswered questions are slowing you down.</p>
<h2>The list</h2>
<ul>
  <li>Open decisions come first, ranked by how much <strong>confirmed, unfinished work they are holding up</strong>, then by the earliest deadline you entered on that work, then newest. Each row says <em>holding up N</em>. Resolved decisions are listed last.</li>
  <li>It is never ranked by how convincing the text sounds.</li>
</ul>
<h2>Working on a decision</h2>
<ul>
  <li><strong>New decision</strong> writes a question (optionally with context and a folder). <strong>Edit question</strong> changes it later.</li>
  <li><strong>Add option</strong> adds a possible answer. Click an option to edit it, or remove it.</li>
  <li><strong>Evidence</strong> is for facts and sources you checked. Keep it separate from guesses. <strong>Research and notes</strong> is free space for thinking.</li>
  <li><strong>What matters to you (criteria)</strong>: write the things you care about (budget, time, risk).</li>
  <li><strong>Comparing options:</strong> open an option and write <em>What is good about it</em> and <em>What is not so good</em>. Once two or more options have notes, a <strong>Side by side</strong> table appears. Exe lays out your own words and <strong>never scores or ranks options</strong> for you.</li>
</ul>
<h2>Resolving</h2>
<ol class="steps"><li>Press <strong>Mark resolved</strong>.</li><li>Pick the <em>Chosen option</em> (or write something else), write <em>Your decision</em>, and optionally <em>Why</em>.</li><li>Press <strong>Confirm decision</strong>.</li></ol>
<ul>
  <li>Resolving records your choice and the date. It <strong>never</strong> completes tasks, removes blockers or moves priorities. If the decision was holding things up, Exe shows <em>Suggested follow-up</em> and a prompt on Focus. You review those yourself.</li>
  <li>You can <strong>Reopen decision</strong> any time. The previous conclusion stays visible.</li>
  <li>The <strong>Decision log</strong> shows each change with its date.</li>
</ul>
${tip('To say a decision is holding something up, add a <em>blocks</em> relationship in the Map from the decision to the step or outcome, and confirm it.')}` },

{ slug: 'focus', title: 'Focus, priorities and Focus Mode', nav: 'Focus', summary: 'The home screen, up to three active priorities, and how Exe suggests what to do next.', body: `
<p class="lead">Focus is your home screen, called <strong>Mission Status</strong>. It shows what you are working on now, and quietly offers help choosing what to do next. Nothing on it changes unless you press a button.</p>
<h2>The status line</h2>
<p>Under the heading you see something like <em>1 current focus of up to 3 active. 2 for the AI Assistant. 3 blocked.</em> Parts that are zero are left out. <em>Awaiting AI Review</em> is a link. <em>Blocked</em> counts only blocks you confirmed.</p>
<h2>Current Priority</h2>
<ul>
  <li>The large card is your <strong>current</strong> outcome: its folder, progress (real steps done, never invented), a checklist, and <strong>Enter Focus Mode</strong>.</li>
  <li>On a phone the card shows your first three steps; press <strong>More</strong> to see the rest.</li>
  <li>If something you confirmed is holding it up, a red <strong>Blocked</strong> notice names the blocker and gives a link such as <em>Open the decision</em> or <em>Review in Map</em>.</li>
</ul>
<h2>Other active priorities</h2>
<p>Up to two more active outcomes appear below. Tap one to make it the current one.</p>
<h2 id="lanes">Active, Next and Later</h2>
<p>Every outcome sits in one of three places: <strong>active</strong> (at most three), <strong>Next</strong>, or <strong>Later</strong>. The <strong>Next &amp; Later</strong> row at the bottom of Focus opens a screen listing the outcomes that are not active, with <strong>Make active</strong> and <strong>Move to Next / Later</strong>. If you already have three active, Exe asks which to replace, and does it as one change. Nothing moves by itself.</p>
<h2>Priority suggestions</h2>
<p>Exe can suggest changing which outcomes are active. It follows fixed rules, in this order, and shows the rule that decided: <strong>1)</strong> you pinned it, <strong>2)</strong> it is not blocked by a confirmed blocker, <strong>3)</strong> the earliest deadline you entered, <strong>4)</strong> it unlocks the most confirmed work, <strong>5)</strong> it has a ready step, <strong>6)</strong> you worked on it most recently. There is no secret score.</p>
<ul>
  <li><strong>Apply…</strong> shows before and after and asks you to confirm. <strong>Ignore</strong> makes it go away until the facts change. <strong>Defer</strong> hides it for now.</li>
  <li>A suggestion can also point out an open active slot, with a reason.</li>
</ul>
<h2>I have … minutes</h2>
<p>Choose 10, 20, 30 or 60. Exe suggests <strong>one</strong> ready step that fits: not blocked, and not known to take longer. It prefers your active priorities and explains why. It uses the <strong>effort</strong> you typed on steps (like <code>15 min</code>). A step with no estimate may be suggested but is labeled “may not fit”. It never guesses an estimate, never looks at your calendar, and never changes your priorities. <strong>Start in Focus Mode</strong> takes you to that outcome.</p>
<h2>Prompts after changes</h2>
<p>Up to three notes may appear: a resolved decision that was holding things up, a finished step that cleared the way for another, or an outcome whose steps are all done (asking whether it is finished). <strong>Review</strong> takes you there; <strong>Later</strong> hides it and it does not come back. They never change anything.</p>
<h2>Weekly review (optional)</h2>
<p>Once a week a card says your review is ready. <strong>Open</strong> shows the last 7 days from real dates: steps done per outcome, outcomes finished, decisions resolved, thoughts captured, and what is still open. There are no streaks or scores. <strong>Skip this week</strong> or <strong>Done</strong> hides it until next week.</p>
<h2 id="breakdown">Break it down</h2>
<p>For a vague step, press <strong>Break it down</strong> (in Focus Mode, or on an outcome in the Map). Type or paste one small step per line; list dashes and numbers are removed and duplicates ignored. Nothing is created until you press <strong>Add steps</strong>. If AI is on, <strong>Suggest steps with AI</strong> fills the box with ideas you can edit or delete first.</p>
<h2>Focus Mode</h2>
<p>Press <strong>Enter Focus Mode</strong> on the Current Priority card. You see only that outcome and its checklist.</p>
<ul>
  <li>Tick steps as you finish. Progress is real.</li>
  <li><strong>Capture thought</strong> opens Quick Capture over Focus Mode and brings you back afterwards. New thoughts go to the Inbox, not into your active work.</li>
  <li><strong>Break it down</strong> adds steps. <strong>Return to Exe</strong> or <strong>Finish session</strong> (or ${k('Esc')}) leaves. If every step is done, Exe asks whether the outcome is finished.</li>
</ul>` },

{ slug: 'ideas-and-search', title: 'Ideas and Search', nav: 'Ideas & Search', summary: 'Keep possibilities without committing, and find anything fast.', body: `
<h2>Ideas</h2>
<p>An <strong>idea</strong> is a possibility, not a commitment. It does not appear in your priorities and is never turned into work unless you say so. Ideas live in the <strong>Map</strong> under <em>Ideas worth keeping</em>.</p>
<ul>
  <li><strong>Add idea</strong>: write it, add notes, choose a folder. Approving a capture as an <em>Idea</em> in AI Review also creates one.</li>
  <li><strong>Edit</strong> changes it. <strong>Archive</strong> hides it, and <strong>Show archived ideas</strong> then <strong>Restore</strong> brings it back.</li>
  <li><strong>Promote</strong> asks you to confirm, then creates an <strong>outcome in Later</strong> (never active). The idea is kept, archived, and linked to the outcome.</li>
</ul>
<h2>Search</h2>
<ul>
  <li>On a phone tap the <strong>magnifier</strong> at the top. On a computer use <strong>Search</strong> in the left menu, or press ${k('/')} when you are not typing in a box.</li>
  <li>It searches captures (archived ones are labeled), steps, outcomes, decisions (including evidence and notes), ideas and folders. Type one or more words; every word must match.</li>
  <li>It is plain text matching. It never guesses what you meant. Results that start with your words come first.</li>
  <li>Pick a result to jump to it.</li>
</ul>` },

{ slug: 'ai-setup', title: 'Turning on AI with your own key', nav: 'AI setup', summary: 'Optional, private, and under your control.', body: `
<p class="lead">Exe works fully without AI. If you want real suggestions, you connect your own account with an AI company and pay them directly. Exe itself has no AI bill and never sends anything on its own.</p>
<h2>What AI can and cannot do</h2>
<ul>
  <li><strong>Can:</strong> suggest what a capture is (AI Review), and suggest steps to break a goal down.</li>
  <li><strong>Cannot:</strong> delete, complete, resolve, move priorities or create dependencies. Every suggestion is only a proposal on a card. You approve it.</li>
  <li>Every answer is checked against a strict format. If the AI answers badly, Exe ignores it and you organize by hand.</li>
</ul>
<h2>Set it up</h2>
${steps([
 'Sign in (AI settings need an account, because your key is stored encrypted on the server).',
 'Get an API key from <strong>Anthropic</strong>, <strong>OpenAI</strong> or <strong>Google Gemini</strong>, and note the <strong>model name</strong> your provider gives you. Exe does not choose a model for you.',
 'Open <strong>Settings → AI (your own key)</strong>. Choose the provider, type the model name, paste the key, and press <strong>Save key</strong>.',
 'Read the notice, then press <strong>I understand, turn on AI</strong>.',
 'Press <strong>Test connection</strong>. It sends only a tiny test message, no personal text.'])}
${warn('Your key is shown only as its last 4 characters after you save it. Treat it like a password. If you ever lose track of it, press <strong>Remove key</strong> and make a new one with your provider.')}
<h2>Using it</h2>
<ul>
  <li><strong>AI Review → Get AI suggestions</strong> sends the text of up to 20 waiting captures, plus your folder and outcome names, to your provider. Suggestions fill the cards, marked with who made them and what they were unsure about.</li>
  <li><strong>Break it down → Suggest steps with AI</strong> sends that outcome's name, definition and step names.</li>
  <li>Nothing is sent until you press one of those buttons.</li>
</ul>
<h2>Turning it off</h2>
<p><strong>Turn off</strong> stops all AI. <strong>Remove key</strong> deletes the stored key. <strong>Replace key</strong> saves a new one, which asks you to accept the notice again.</p>
${note('If you see “AI is not set up on the server yet”, the site owner has not finished setup. Everything else still works.')}` },

{ slug: 'backup-and-settings', title: 'Settings, backup and restore', nav: 'Settings & backup', summary: 'Keep your work safe and bring in old data.', body: `
<p class="lead">Open Settings from the left menu (computer) or by tapping your initial at the top right (phone).</p>
<h2>Workspace name</h2>
<p>Type a name and press <strong>Save name</strong>. It appears at the top of the home screen and in the menu.</p>
<h2>Download a backup</h2>
<p>Press <strong>Download JSON backup</strong>. You get a file containing your folders, outcomes, steps, captures, decisions, ideas and relationships. <strong>Please do this now and then.</strong> It is your safety copy.</p>
<h2>Restore or import</h2>
${steps([
 'In Settings, under <strong>Restore or import</strong>, choose a backup file. It can be one downloaded from this version, or the file exported by the original Exe prototype.',
 'Exe shows what is inside (counts of each kind) and any warnings. <strong>Nothing has changed yet.</strong>',
 'Pick how to add it: <strong>Add to what I have</strong> keeps everything already here (recommended), or <strong>Replace everything with this backup</strong>.',
 'For Replace, press <strong>Download a copy of my current workspace</strong> first, so you can go back. Then press the final button.'])}
<ul>
  <li>Original wording is kept, and nothing is marked done that was not.</li>
  <li>The limit of three active priorities is respected. Extras are moved to Next, and you are told.</li>
  <li>Relationships that could not be kept (a missing item, a loop or a duplicate) are skipped and counted in the warnings.</li>
  <li>Files that are not backups, or are too large, are refused without changing anything.</li>
</ul>
<h2 id="history">History</h2>
<p><strong>Open history</strong> lists, in plain words, what you approved, applied or undid: priority suggestions you applied, outcomes you finished, folders you deleted, undone approvals, promoted ideas. Nothing is recorded that you did not do.</p>
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
<h3>Why can I only have three active priorities?</h3><p>On purpose. Exe is built to help you finish a few things, not to track everything at once. Everything else waits in Next or Later, and nothing is lost.</p>
<h3>Why does “Mission Status” say “Nothing here yet”?</h3><p>A new Exe starts empty and nothing is added for you. Capture a thought with the blue + button, or make a folder and an outcome in the Map.</p>
<h3>I ticked every step, but the outcome is not done.</h3><p>That is by design. Only you finish an outcome. Press <strong>Mark outcome done…</strong>, or answer the question Exe asks when the last step is ticked.</p>
<h3>I ticked a to-do in the Inbox, but my step is not done.</h3><p>An Inbox tick only marks that to-do. Steps, decisions and priorities are separate on purpose.</p>
<h3>What does “Blocked” mean, and why is it red?</h3><p>Something you <em>confirmed</em> must be finished first. Red is used only for that. A suggested relationship blocks nothing.</p>
<h3>Can the AI change my work?</h3><p>No. It can only make suggestions on cards, which you approve. It cannot delete, complete, resolve, or move priorities.</p>
<h3>Does AI cost money?</h3><p>Exe does not charge for AI. If you add your own key, your AI company bills you for what you use.</p>
<h3>How do I undo something?</h3><p>Approvals in AI Review have an <strong>Undo</strong> button under <em>Recently approved</em>. Archived items have <strong>Restore</strong>. A finished outcome has <strong>Reopen outcome</strong>. A resolved decision has <strong>Reopen decision</strong>.</p>
<h3>Can I delete something for good?</h3><p>Exe prefers archiving. Deleting a folder keeps everything inside. Deleting a link keeps both items.</p>
<h2>Fixes</h2>
<table class="table"><thead><tr><th scope="col">If you see…</th><th scope="col">Try this</th></tr></thead><tbody>
<tr><th scope="row">Nothing happens when I save text</th><td>Refresh the page and try again. If it keeps happening, download a backup, then tell whoever runs your Exe.</td></tr>
<tr><th scope="row">“Saved on this device, not synced”</th><td>You are offline or the service is unreachable. Keep working; it sends itself when the connection returns.</td></tr>
<tr><th scope="row">“This changed on another device”</th><td>See <a href="account-and-privacy.html">Your account, saving and privacy</a>.</td></tr>
<tr><th scope="row">Another device’s changes are missing</th><td>Refresh the page. Exe does not update live.</td></tr>
<tr><th scope="row">Cannot sign in or the confirmation email never arrived</th><td>Check your spam folder. Then try <strong>Create an account</strong> again with the same email, or ask whoever runs your Exe.</td></tr>
<tr><th scope="row">“AI is not set up on the server yet”</th><td>The site owner has not finished AI setup. Everything else works.</td></tr>
<tr><th scope="row">“Your provider rejected the key” / “does not know that model name”</th><td>Open Settings, check the key and the model name exactly as your provider shows them, and save again.</td></tr>
<tr><th scope="row">The page looks old or out of date</th><td>Close the tab and open it again, or hard refresh (${k('Ctrl')}/${k('⌘')}+${k('Shift')}+${k('R')}).</td></tr>
</tbody></table>
<h2>Shortcuts</h2>
<table class="table"><tbody>
<tr><th scope="row">${k('Ctrl')}/${k('⌘')}+${k('K')}</th><td>Quick Capture, from anywhere.</td></tr>
<tr><th scope="row">${k('/')}</th><td>Search (when you are not typing in a box).</td></tr>
<tr><th scope="row">${k('Esc')}</th><td>Close the open box, or leave Focus Mode.</td></tr>
<tr><th scope="row">${k('Tab')}</th><td>Move between buttons and fields. Everything in Exe can be used with a keyboard.</td></tr>
<tr><th scope="row">${k('Enter')}</th><td>In <em>Add a to-do…</em>, adds it to your Inbox.</td></tr>
</tbody></table>
<h2>Glossary</h2>
<dl class="glossary">
<dt>Capture</dt><dd>A thought you saved, exactly as you wrote it. It is never removed by Exe or AI.</dd>
<dt>Outcome</dt><dd>A result you want. Outcomes are what you make active.</dd>
<dt>Step</dt><dd>One small action that moves an outcome forward. It can also be loose.</dd>
<dt>Folder</dt><dd>An optional group for related outcomes, decisions, ideas and captures.</dd>
<dt>Decision</dt><dd>An unresolved question you settle yourself.</dd>
<dt>Idea</dt><dd>A possibility, not a commitment.</dd>
<dt>Relationship</dt><dd>A link between two things: blocks, informs or related.</dd>
<dt>Active priority</dt><dd>An outcome you are working on now. At most three. Also called “Now”.</dd>
<dt>Next / Later</dt><dd>Outcomes waiting their turn. Next is sooner, Later is parked.</dd>
<dt>Current Priority</dt><dd>The one active outcome shown in the big card on Focus.</dd>
<dt>Suggestion</dt><dd>Something Exe or AI proposes. It does nothing until you approve it.</dd>
</dl>` },
];
