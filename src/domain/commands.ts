// Every user action as a pure function: (workspace, context, input) -> writes, or an explanation of why not.
// Nothing here touches storage. The same writes run against the in-memory workspace, local storage, or Supabase.
import { relationshipError, entityType } from './blocking';
import { segmentCapture } from './capture';
import { activeIds, applySuggestion, type Suggestion } from './engine';
import { currentFocusId, MAX_NOW, type Lane, type RelationshipKind, type Workspace } from './model';
import { byPosition, stepsOf } from './progress';
import { type Proposal } from './review';
import { baseRow, type Ctx, type Row, type Table, type Write } from './writes';

export type Result = { ok: true; writes: Write[]; note?: string } | { ok: false; error: string; needsSwap?: boolean };
const fail = (error: string, extra: { needsSwap?: boolean } = {}): Result => ({ ok: false, error, ...extra });
const done = (writes: Write[], note?: string): Result => ({ ok: true, writes, ...(note ? { note } : {}) });
const ins = (table: Table, row: Row): Write => ({ table, op: 'insert', row });
const upd = (table: Table, existing: { id: string; revision: number }, changes: Row): Write => ({ table, op: 'update', row: { id: existing.id, revision: existing.revision, ...changes } });
const audit = (ctx: Ctx, action: string, entityType: string | null, entityId: string | null, before: unknown = null, after: unknown = null): Write =>
  ins('audit_events', { id: ctx.id(), owner_id: ctx.owner, at: ctx.now(), actor: 'user', action, entity_type: entityType, entity_id: entityId, proposal_id: null, before, after, undo_of: null });

/** The settings row is created the first time something needs it. */
function settingsWrite(ws: Workspace, ctx: Ctx, changes: Row): Write {
  if (ws.settings) return { table: 'user_settings', op: 'update', row: { owner_id: ctx.owner, revision: ws.settings.revision, ...changes } };
  return ins('user_settings', { owner_id: ctx.owner, workspace_name: '', current_focus_outcome_id: null, priority_dismissed: [], research_opt_in: false, created_at: ctx.now(), updated_at: ctx.now(), revision: 1, ...changes });
}
const trimmed = (s: string): string => s.trim();

// ------------------------------------------------------------------ captures
export function addCaptures(ws: Workspace, ctx: Ctx, text: string, source = 'Quick Capture'): Result {
  void ws;
  const lines = segmentCapture(text);
  if (!lines.length) return fail('Write something first.');
  const batch = lines.length > 1 ? ctx.id() : null;
  return done(lines.map(line => ins('captures', {
    ...baseRow(ctx), text: line, edited_text: null, source, folder_id: null, batch_id: batch, batch_text: batch ? text : null, completed_at: null, archived_at: null,
    status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null })),
  lines.length === 1 ? 'Saved to Inbox.' : `${lines.length} thoughts saved to Inbox.`);
}
const capture = (ws: Workspace, id: string) => ws.captures.find(c => c.id === id);
/** Raw completion is independent: it never touches tasks, decisions, the Focus board or AI review state. */
export function setCaptureDone(ws: Workspace, ctx: Ctx, id: string, isDone: boolean): Result {
  const c = capture(ws, id); if (!c) return fail('That capture no longer exists.');
  return done([upd('captures', c, { completed_at: isDone ? ctx.now() : null })]);
}
export function editCapture(ws: Workspace, id: string, text: string): Result {
  const c = capture(ws, id); if (!c) return fail('That capture no longer exists.');
  const t = trimmed(text); if (!t) return fail('Write something first.');
  return done([upd('captures', c, { edited_text: t })]);
}
export function archiveCapture(ws: Workspace, ctx: Ctx, id: string, archived: boolean): Result {
  const c = capture(ws, id); if (!c) return fail('That capture no longer exists.');
  return done([upd('captures', c, { archived_at: archived ? ctx.now() : null })]);
}
export function fileCapture(ws: Workspace, id: string, folderId: string | null): Result {
  const c = capture(ws, id); if (!c) return fail('That capture no longer exists.');
  return done([upd('captures', c, { folder_id: folderId })]);
}

// ------------------------------------------------------------------ folders
export function createFolder(ws: Workspace, ctx: Ctx, name: string, description = ''): Result {
  const n = trimmed(name); if (!n) return fail('Give the folder a name.');
  return done([ins('folders', { ...baseRow(ctx), name: n, description: trimmed(description), icon: 'folder', position: ws.folders.length })]);
}
export function renameFolder(ws: Workspace, id: string, name: string, description: string): Result {
  const f = ws.folders.find(x => x.id === id); if (!f) return fail('That folder no longer exists.');
  const n = trimmed(name); if (!n) return fail('Give the folder a name.');
  return done([upd('folders', f, { name: n, description: trimmed(description) })]);
}
export const folderContents = (ws: Workspace, id: string) => ({
  outcomes: ws.outcomes.filter(o => o.folder_id === id), decisions: ws.decisions.filter(d => d.folder_id === id),
  ideas: ws.ideas.filter(i => i.folder_id === id), captures: ws.captures.filter(c => c.folder_id === id),
});
/** Never silent: the caller shows what is inside and where it goes. Nothing inside is deleted; it moves to `moveTo` or becomes unfiled. */
export function deleteFolder(ws: Workspace, ctx: Ctx, id: string, moveTo: string | null): Result {
  const f = ws.folders.find(x => x.id === id); if (!f) return fail('That folder no longer exists.');
  if (moveTo === id || (moveTo && !ws.folders.some(x => x.id === moveTo))) return fail('Choose another folder, or All notes.');
  const c = folderContents(ws, id), moved = c.outcomes.length + c.decisions.length + c.ideas.length + c.captures.length;
  const writes: Write[] = [
    ...c.outcomes.map(o => upd('outcomes', o, { folder_id: moveTo })), ...c.decisions.map(d => upd('decisions', d, { folder_id: moveTo })),
    ...c.ideas.map(i => upd('ideas', i, { folder_id: moveTo })), ...c.captures.map(x => upd('captures', x, { folder_id: moveTo })),
    { table: 'folders', op: 'delete', row: { id } }, audit(ctx, 'folder-delete', 'folder', id, { name: f.name, moved }, { moved_to: moveTo }),
  ];
  return done(writes, moved ? `Folder deleted. ${moved} ${moved === 1 ? 'item' : 'items'} moved.` : 'Folder deleted.');
}

// ------------------------------------------------------------------ focus and outcomes
const assignment = (ws: Workspace, outcomeId: string) => ws.focus.find(f => f.outcome_id === outcomeId);
const laneWrite = (ws: Workspace, ctx: Ctx, outcomeId: string, lane: Lane): Write => {
  const a = assignment(ws, outcomeId);
  return a ? upd('focus_assignments', a, { lane }) : ins('focus_assignments', { ...baseRow(ctx), outcome_id: outcomeId, lane, position: ws.focus.length });
};
const focusWrite = (ws: Workspace, ctx: Ctx, outcomeId: string | null): Write => settingsWrite(ws, ctx, { current_focus_outcome_id: outcomeId });

export function addOutcome(ws: Workspace, ctx: Ctx, input: { folderId: string | null; name: string; description?: string }): Result {
  const name = trimmed(input.name); if (!name) return fail('Say what you want to achieve.');
  const row = { ...baseRow(ctx), folder_id: input.folderId, name, description: trimmed(input.description ?? ''), pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [] };
  return done([ins('outcomes', row), ins('focus_assignments', { ...baseRow(ctx), outcome_id: row.id, lane: 'later', position: ws.focus.length })], 'Outcome added to Later.');
}
export function updateOutcome(ws: Workspace, id: string, input: { name: string; description: string; folderId: string | null; deadline: string | null; effort: string | null }): Result {
  const o = ws.outcomes.find(x => x.id === id); if (!o) return fail('That outcome no longer exists.');
  const name = trimmed(input.name); if (!name) return fail('Say what you want to achieve.');
  return done([upd('outcomes', o, { name, description: trimmed(input.description), folder_id: input.folderId, deadline: input.deadline || null, effort: trimmed(input.effort ?? '') || null })]);
}
export function togglePin(ws: Workspace, id: string): Result {
  const o = ws.outcomes.find(x => x.id === id); if (!o) return fail('That outcome no longer exists.');
  return done([upd('outcomes', o, { pinned: !o.pinned })]);
}
/** Asks to swap when Now is full (never exceeds three). Making an outcome Now also makes it the current focus. */
export function setLane(ws: Workspace, ctx: Ctx, id: string, lane: 'now' | 'next' | 'later'): Result {
  const o = ws.outcomes.find(x => x.id === id); if (!o || o.done_at) return fail('That outcome is not available.');
  const now = activeIds(ws), inNow = now.includes(id);
  if (lane === 'now' && !inNow && now.length >= MAX_NOW) return fail('Keep focus to three. Choose which active priority to replace.', { needsSwap: true });
  const writes = [laneWrite(ws, ctx, id, lane)];
  if (lane === 'now') writes.push(focusWrite(ws, ctx, id));
  else if (currentFocusId(ws) === id) writes.push(focusWrite(ws, ctx, now.find(x => x !== id) ?? null));
  return done(writes);
}
/** One transaction: the replaced outcome goes to Next and the new one becomes Now and current. */
export function swapNow(ws: Workspace, ctx: Ctx, replaceId: string, withId: string): Result {
  const now = activeIds(ws);
  if (!now.includes(replaceId) || now.includes(withId)) return fail('That swap is out of date.');
  return done([laneWrite(ws, ctx, replaceId, 'next'), laneWrite(ws, ctx, withId, 'now'), focusWrite(ws, ctx, withId)]);
}
export function selectCurrentFocus(ws: Workspace, ctx: Ctx, id: string): Result {
  if (!activeIds(ws).includes(id)) return fail('The current focus must be one of your active priorities.');
  return done([focusWrite(ws, ctx, id)]);
}
/** Only the user, on confirmation, finishes an outcome. Its Now slot is freed and nothing is moved into it. */
export function completeOutcome(ws: Workspace, ctx: Ctx, id: string): Result {
  const o = ws.outcomes.find(x => x.id === id); if (!o || o.done_at) return fail('That outcome is not available.');
  const was = assignment(ws, id)?.lane ?? null, writes: Write[] = [upd('outcomes', o, { done_at: ctx.now() }), laneWrite(ws, ctx, id, 'done')];
  if (currentFocusId(ws) === id) writes.push(focusWrite(ws, ctx, activeIds(ws).find(x => x !== id) ?? null));
  writes.push(audit(ctx, 'outcome-done', 'outcome', id, { lane: was }));
  return done(writes, 'Outcome done. Its Now slot is free; nothing was moved in.');
}
export function reopenOutcome(ws: Workspace, ctx: Ctx, id: string): Result {
  const o = ws.outcomes.find(x => x.id === id); if (!o || !o.done_at) return fail('That outcome is not done.');
  return done([upd('outcomes', o, { done_at: null }), laneWrite(ws, ctx, id, 'later')], 'Outcome reopened and placed in Later.');
}

// ------------------------------------------------------------------ steps
export function addTask(ws: Workspace, ctx: Ctx, outcomeId: string | null, name: string): Result {
  const n = trimmed(name); if (!n) return fail('Write the step first.');
  const mates = ws.tasks.filter(t => t.outcome_id === outcomeId), position = mates.reduce((m, t) => Math.max(m, t.position + 1), 0);
  return done([ins('tasks', { ...baseRow(ctx), outcome_id: outcomeId, name: n, notes: '', done_at: null, archived_at: null, deadline: null, effort: null, position, sources: [] })], 'Step added.');
}
/** Checking a step records only the step (and when its outcome was last worked on). It never finishes the outcome. */
export function setTaskDone(ws: Workspace, ctx: Ctx, id: string, isDone: boolean): Result {
  const t = ws.tasks.find(x => x.id === id); if (!t) return fail('That step no longer exists.');
  const writes = [upd('tasks', t, { done_at: isDone ? ctx.now() : null })], o = ws.outcomes.find(x => x.id === t.outcome_id);
  if (isDone && o) writes.push(upd('outcomes', o, { last_worked_at: ctx.now() }));
  return done(writes);
}
/** True when every step of the outcome is done, so the app can ASK whether the outcome is done (it never decides). */
export const allStepsDone = (ws: Workspace, outcomeId: string): boolean => {
  const steps = stepsOf(ws, outcomeId), o = ws.outcomes.find(x => x.id === outcomeId);
  return !!o && !o.done_at && steps.length > 0 && steps.every(t => t.done_at !== null);
};
export function editTask(ws: Workspace, id: string, input: { name: string; outcomeId: string | null; effort?: string | null; notes?: string; deadline?: string | null }): Result {
  const t = ws.tasks.find(x => x.id === id); if (!t) return fail('That step no longer exists.');
  const n = trimmed(input.name); if (!n) return fail('Write the step first.');
  const changes: Row = { name: n };
  if (input.effort !== undefined) changes.effort = trimmed(input.effort ?? '').slice(0, 60) || null;     // the user's own estimate; never invented
  if (input.notes !== undefined) changes.notes = input.notes;
  if (input.deadline !== undefined) changes.deadline = input.deadline && /^\d{4}-\d{2}-\d{2}$/.test(input.deadline) ? input.deadline : null;
  if (input.outcomeId !== t.outcome_id) {
    if (input.outcomeId && ws.relationships.some(r => (r.from_id === id && r.to_id === input.outcomeId) || (r.to_id === id && r.from_id === input.outcomeId)))
      return fail('This step has a relationship with that outcome. Remove the relationship first.');
    changes.outcome_id = input.outcomeId;
    changes.position = ws.tasks.filter(x => x.outcome_id === input.outcomeId).reduce((m, x) => Math.max(m, x.position + 1), 0);
  }
  return done([upd('tasks', t, changes)]);
}
export function moveTask(ws: Workspace, id: string, dir: 'up' | 'down'): Result {
  const t = ws.tasks.find(x => x.id === id); if (!t) return fail('That step no longer exists.');
  const mates = ws.tasks.filter(x => x.outcome_id === t.outcome_id && !x.archived_at).sort(byPosition), i = mates.findIndex(x => x.id === id), j = i + (dir === 'up' ? -1 : 1);
  if (j < 0 || j >= mates.length) return fail('It is already at the end.');
  [mates[i], mates[j]] = [mates[j] as typeof t, mates[i] as typeof t];
  return done(mates.flatMap((m, p) => (m.position === p ? [] : [upd('tasks', m, { position: p })])));
}
export function archiveTask(ws: Workspace, ctx: Ctx, id: string, archived: boolean): Result {
  const t = ws.tasks.find(x => x.id === id); if (!t) return fail('That step no longer exists.');
  return done([upd('tasks', t, { archived_at: archived ? ctx.now() : null })], archived ? 'Step archived. Restore it from the outcome.' : 'Step restored.');
}

// ------------------------------------------------------------------ relationships
export function addRelationship(ws: Workspace, ctx: Ctx, input: { from: string; to: string; kind: RelationshipKind; description?: string; confirmed: boolean }): Result {
  const err = relationshipError(ws, input); if (err) return fail(err);
  return done([ins('relationships', { ...baseRow(ctx), from_type: entityType(ws, input.from), from_id: input.from, to_type: entityType(ws, input.to), to_id: input.to, kind: input.kind, description: trimmed(input.description ?? ''), confirmed: input.confirmed, source: 'user' })], 'Relationship added.');
}
export function confirmRelationship(ws: Workspace, id: string): Result {
  const r = ws.relationships.find(x => x.id === id); if (!r) return fail('That relationship no longer exists.');
  return done([upd('relationships', r, { confirmed: true })], 'Relationship confirmed.');
}
export function removeRelationship(ws: Workspace, id: string): Result {
  if (!ws.relationships.some(x => x.id === id)) return fail('That relationship no longer exists.');
  return done([{ table: 'relationships', op: 'delete', row: { id } }], 'Relationship removed. No tasks or outcomes were changed.');
}

// ------------------------------------------------------------------ Priority Engine: the user applies or ignores
export function applyPriority(ws: Workspace, ctx: Ctx, s: Suggestion): Result {
  const r = applySuggestion(ws, s); if (!r) return fail('That suggestion is out of date. Nothing was changed.');
  const before = activeIds(ws), writes: Write[] = [...r.demoted.map(id => laneWrite(ws, ctx, id, 'next')), ...s.changes.map(c => laneWrite(ws, ctx, c.add, 'now'))];
  const focus = currentFocusId(ws);
  if (!focus || !r.now.includes(focus)) writes.push(focusWrite(ws, ctx, r.now[0] ?? null));
  writes.push(audit(ctx, 'priority-apply', null, null, { now: before }, { now: r.now, why: s.changes.map(c => c.why) }));
  return done(writes, 'Priorities updated. Recorded in history.');
}
export function ignoreSuggestion(ws: Workspace, ctx: Ctx, fingerprint: string): Result {
  const dismissed = ws.settings?.priority_dismissed ?? [];
  return done([settingsWrite(ws, ctx, { priority_dismissed: [...dismissed, fingerprint] })], 'Ignored. It will not come back unless the facts change.');
}
export function setWorkspaceName(ws: Workspace, ctx: Ctx, name: string): Result {
  return done([settingsWrite(ws, ctx, { workspace_name: trimmed(name).slice(0, 60) })], 'Name saved.');
}

// ------------------------------------------------------------------ decisions
const decision = (ws: Workspace, id: string) => ws.decisions.find(d => d.id === id);
const logRow = (ctx: Ctx, decisionId: string, type: 'created' | 'edited' | 'resolved' | 'reopened', text = ''): Write =>
  ins('decision_log', { id: ctx.id(), owner_id: ctx.owner, decision_id: decisionId, type, text, at: ctx.now() });
export const optionsOf = (ws: Workspace, decisionId: string) => ws.decisionOptions.filter(o => o.decision_id === decisionId).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

export function createDecision(ws: Workspace, ctx: Ctx, input: { name: string; description?: string; folderId: string | null }): Result {
  void ws;
  const name = trimmed(input.name); if (!name) return fail('Write the question first.');
  const row = { ...baseRow(ctx), folder_id: input.folderId, name, description: trimmed(input.description ?? ''), status: 'open', evidence: '', notes: '', chosen_option: '', conclusion: '', rationale: '', resolved_at: null, sources: [] };
  return done([ins('decisions', row), logRow(ctx, row.id, 'created')], 'Decision added.');
}
export function editDecision(ws: Workspace, ctx: Ctx, id: string, input: { name: string; description: string; folderId: string | null }): Result {
  const d = decision(ws, id); if (!d) return fail('That decision no longer exists.');
  const name = trimmed(input.name); if (!name) return fail('Write the question first.');
  return done([upd('decisions', d, { name, description: trimmed(input.description), folder_id: input.folderId }), logRow(ctx, id, 'edited', 'Question or context updated.')], 'Decision updated.');
}
/** Evidence (facts you checked) and notes are kept apart on purpose. */
export function setDecisionText(ws: Workspace, id: string, field: 'evidence' | 'notes', value: string): Result {
  const d = decision(ws, id); if (!d) return fail('That decision no longer exists.');
  return done([upd('decisions', d, { [field]: value })]);
}
export function addOption(ws: Workspace, ctx: Ctx, decisionId: string, text: string): Result {
  const d = decision(ws, decisionId); if (!d) return fail('That decision no longer exists.');
  const t = trimmed(text); if (!t) return fail('Write the option first.');
  const mine = optionsOf(ws, decisionId);
  if (mine.some(o => o.text.trim().toLowerCase() === t.toLowerCase())) return fail('That option already exists.');
  return done([ins('decision_options', { ...baseRow(ctx), decision_id: decisionId, text: t, position: mine.length })], 'Option added.');
}
export function renameOption(ws: Workspace, ctx: Ctx, optionId: string, text: string): Result {
  const o = ws.decisionOptions.find(x => x.id === optionId); if (!o) return fail('That option no longer exists.');
  const t = trimmed(text); if (!t) return fail('Write the option first.');
  if (optionsOf(ws, o.decision_id).some(x => x.id !== optionId && x.text.trim().toLowerCase() === t.toLowerCase())) return fail('That option already exists.');
  const d = decision(ws, o.decision_id), writes: Write[] = [upd('decision_options', o, { text: t })];
  if (d && d.chosen_option === o.text) writes.push(upd('decisions', d, { chosen_option: t }));
  if (t !== o.text) writes.push(logRow(ctx, o.decision_id, 'edited', `Renamed option “${o.text}” to “${t}”.`));
  return done(writes, 'Option saved.');
}
export function removeOption(ws: Workspace, ctx: Ctx, optionId: string): Result {
  const o = ws.decisionOptions.find(x => x.id === optionId); if (!o) return fail('That option no longer exists.');
  const d = decision(ws, o.decision_id);
  if (d && d.status === 'resolved' && d.chosen_option === o.text) return fail('This is the chosen option. Reopen the decision before removing it.');
  return done([{ table: 'decision_options', op: 'delete', row: { id: optionId } }, logRow(ctx, o.decision_id, 'edited', `Removed option “${o.text}”.`)], 'Option removed.');
}
/** Only the user resolves a decision. Resolving records the choice and date; it changes no tasks, blockers or Focus lanes. */
export function resolveDecision(ws: Workspace, ctx: Ctx, id: string, input: { chosenOption: string; conclusion: string; rationale: string }): Result {
  const d = decision(ws, id); if (!d) return fail('That decision no longer exists.');
  if (d.status === 'resolved') return fail('This decision is already resolved.');
  const conclusion = trimmed(input.conclusion); if (!conclusion) return fail('Record what you decided.');
  const chosen = trimmed(input.chosenOption);
  return done([upd('decisions', d, { status: 'resolved', resolved_at: ctx.now(), chosen_option: chosen, conclusion, rationale: trimmed(input.rationale) }),
    logRow(ctx, id, 'resolved', chosen ? `Chose “${chosen}”. ${conclusion}` : conclusion)], 'Decision recorded. Priorities unchanged.');
}
export function reopenDecision(ws: Workspace, ctx: Ctx, id: string): Result {
  const d = decision(ws, id); if (!d) return fail('That decision no longer exists.');
  if (d.status !== 'resolved') return fail('This decision is already open.');
  return done([upd('decisions', d, { status: 'open', resolved_at: null }), logRow(ctx, id, 'reopened')], 'Decision reopened.');
}
/** Items a resolved decision was holding up through a confirmed block: shown as a SUGGESTION to review, never applied. */
export function followUpsOf(ws: Workspace, decisionId: string): string[] {
  return ws.relationships.filter(r => r.kind === 'blocks' && r.confirmed && r.from_id === decisionId).map(r => r.to_id);
}

// ------------------------------------------------------------------ AI Review actions (simulation; DEC-002)
export interface Approval { type: Proposal['type']; folderId: string | null; outcomeId: string | null; newOutcomeName?: string; title: string }
function approveWrites(ws: Workspace, ctx: Ctx, c: { id: string; folder_id: string | null; revision: number }, a: Approval, mergedWith: string[] = []): { writes: Write[]; itemId: string | null } {
  const writes: Write[] = [], sources = [c.id, ...mergedWith], at = ctx.now();
  let itemId: string | null = null, taskId: string | null = null, outcomeId = a.outcomeId;
  if (a.type === 'Task') {
    if (a.newOutcomeName) {
      const oid = ctx.id(); outcomeId = oid;
      writes.push(ins('outcomes', { ...baseRow(ctx), id: oid, folder_id: a.folderId, name: trimmed(a.newOutcomeName), description: 'Created from an approved capture.', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources }));
      writes.push(ins('focus_assignments', { ...baseRow(ctx), outcome_id: oid, lane: 'later', position: ws.focus.length }));
    }
    taskId = itemId = ctx.id();
    const position = ws.tasks.filter(t => t.outcome_id === outcomeId).reduce((m, t) => Math.max(m, t.position + 1), 0);
    writes.push(ins('tasks', { ...baseRow(ctx), id: itemId, outcome_id: outcomeId ?? null, name: trimmed(a.title), notes: '', done_at: null, archived_at: null, deadline: null, effort: null, position, sources }));
  } else if (a.type === 'Outcome') {
    itemId = ctx.id();
    writes.push(ins('outcomes', { ...baseRow(ctx), id: itemId, folder_id: a.folderId, name: trimmed(a.title).slice(0, 200), description: 'Created from an approved capture.', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources }));
    writes.push(ins('focus_assignments', { ...baseRow(ctx), outcome_id: itemId, lane: 'later', position: ws.focus.length }));
  } else if (a.type === 'Decision') {
    itemId = ctx.id();
    writes.push(ins('decisions', { ...baseRow(ctx), id: itemId, folder_id: a.folderId, name: trimmed(a.title).slice(0, 200), description: 'Newly captured decision; add evidence and options.', status: 'open', evidence: '', notes: '', chosen_option: '', conclusion: '', rationale: '', resolved_at: null, sources }), logRow(ctx, itemId, 'created', 'Approved from a capture.'));
  } else if (a.type === 'Idea') {
    itemId = ctx.id();
    writes.push(ins('ideas', { ...baseRow(ctx), id: itemId, folder_id: a.folderId, name: trimmed(a.title).slice(0, 200), notes: 'Approved from the Inbox.', archived_at: null, sources }));
  }
  writes.push({ table: 'captures', op: 'update', row: { id: c.id, revision: c.revision, status: 'organized', organized_as: a.type, task_id: taskId, review_state: null, review_at: null, folder_id: c.folder_id ?? a.folderId } });
  void at;
  return { writes, itemId };
}
export function approveCapture(ws: Workspace, ctx: Ctx, captureId: string, a: Approval): Result {
  const c = capture(ws, captureId); if (!c || c.status !== 'pending') return fail('That capture is not waiting for review.');
  if (!trimmed(a.title)) return fail('The capture has no text.');
  if (a.newOutcomeName !== undefined && !trimmed(a.newOutcomeName)) return fail('Name the new outcome, or choose another option.');
  return done(approveWrites(ws, ctx, c, a).writes, 'Capture organized. Original preserved.');
}
/** Merge two look-alike captures: one item, both captures kept and linked to it, undoable. Proposed first; the user confirms. */
export function mergeCaptures(ws: Workspace, ctx: Ctx, primaryId: string, otherId: string, a: Approval): Result {
  const p = capture(ws, primaryId), o = capture(ws, otherId);
  if (!p || !o || p.status !== 'pending' || o.status !== 'pending') return fail('Both captures must still be waiting for review.');
  const r = approveWrites(ws, ctx, p, a, [o.id]);
  return done([...r.writes, upd('captures', o, { status: 'organized', organized_as: 'Merged', merged_into: p.id, review_state: null, review_at: null })], 'Merged. Both captures are kept and linked. You can undo this.');
}
export function deferCapture(ws: Workspace, ctx: Ctx, id: string): Result {
  const c = capture(ws, id); if (!c) return fail('That capture no longer exists.');
  return done([upd('captures', c, { review_state: 'deferred', review_at: ctx.now() })], 'Set aside. Find it under Set aside whenever you want.');
}
export function rejectCapture(ws: Workspace, ctx: Ctx, id: string, fingerprint: string): Result {
  const c = capture(ws, id); if (!c) return fail('That capture no longer exists.');
  return done([upd('captures', c, { review_state: 'rejected', review_at: ctx.now(), rejected_fingerprints: [...c.rejected_fingerprints, fingerprint] })], 'Rejected. Your capture is untouched and the same suggestion will not be repeated.');
}
export function reviewAgain(ws: Workspace, id: string): Result {
  const c = capture(ws, id); if (!c) return fail('That capture no longer exists.');
  return done([upd('captures', c, { review_state: null, review_at: null })], 'Back in the review list.');
}
/** Undo removes only what the approval created, and only while it is still untouched. The original capture always stays. */
export function undoApproval(ws: Workspace, ctx: Ctx, captureId: string): Result {
  const c = capture(ws, captureId); if (!c || c.status !== 'organized' || !c.organized_as || c.merged_into) return fail('Nothing to undo.');
  const type = c.organized_as, mine = (s: string[]) => s.includes(c.id);
  const related = (id: string) => ws.relationships.some(r => r.from_id === id || r.to_id === id);
  let removeTable: Table | null = null, removeId: string | null = null;
  if (type === 'Task' && c.task_id) { const t = ws.tasks.find(x => x.id === c.task_id); if (t) { if (t.done_at || related(t.id)) return fail('You have worked on that step since, so it was not removed.'); removeTable = 'tasks'; removeId = t.id; } }
  // a Task approval that also created an outcome takes that outcome back too, but only while nothing else is in it
  let alsoOutcome: string | null = null;
  if (type === 'Task') { const o = ws.outcomes.find(x => mine(x.sources)); if (o && !o.done_at && !o.pinned && !o.deadline && !related(o.id) && ws.tasks.filter(t => t.outcome_id === o.id && t.id !== c.task_id).length === 0) alsoOutcome = o.id; }
  if (type === 'Outcome') { const o = ws.outcomes.find(x => mine(x.sources)); if (o) { if (ws.tasks.some(t => t.outcome_id === o.id) || related(o.id) || o.done_at || o.pinned || o.deadline) return fail('You have worked on that outcome since, so it was not removed.'); removeTable = 'outcomes'; removeId = o.id; } }
  if (type === 'Decision') { const d = ws.decisions.find(x => mine(x.sources)); if (d) { if (d.status !== 'open' || d.evidence || d.notes || related(d.id) || ws.decisionOptions.some(o => o.decision_id === d.id) || ws.decisionLog.filter(l => l.decision_id === d.id).length > 1) return fail('You have worked on that decision since, so it was not removed.'); removeTable = 'decisions'; removeId = d.id; } }
  if (type === 'Idea') { const i = ws.ideas.find(x => mine(x.sources)); if (i) { removeTable = 'ideas'; removeId = i.id; } }
  const back = [c, ...ws.captures.filter(x => x.merged_into === c.id)];
  const writes: Write[] = [];
  // captures first: deleting the item makes the database edit capture.task_id itself, which would make a later write look stale
  for (const x of back) writes.push({ table: 'captures', op: 'update', row: { id: x.id, revision: x.revision, status: 'pending', organized_as: null, task_id: null, merged_into: null, review_state: null, review_at: null } });
  if (removeTable && removeId) writes.push({ table: removeTable, op: 'delete', row: { id: removeId } });
  if (alsoOutcome) writes.push({ table: 'outcomes', op: 'delete', row: { id: alsoOutcome } });
  writes.push(audit(ctx, 'approval-undo', 'capture', c.id, { type }));
  return done(writes, 'Approval undone. The capture is back in the review list.');
}

// ------------------------------------------------------------------ several steps at once (typed, pasted, or accepted AI suggestions)
export function addTasks(ws: Workspace, ctx: Ctx, outcomeId: string | null, names: string[]): Result {
  const clean = names.map(n => trimmed(n).slice(0, 200)).filter(Boolean);
  if (!clean.length) return fail('Write at least one step.');
  if (outcomeId && !ws.outcomes.some(o => o.id === outcomeId)) return fail('That outcome no longer exists.');
  const taken = new Set(ws.tasks.filter(t => t.outcome_id === outcomeId && !t.archived_at).map(t => t.name.trim().toLowerCase()));
  const fresh = clean.filter((n, i) => !taken.has(n.toLowerCase()) && clean.findIndex(x => x.toLowerCase() === n.toLowerCase()) === i);
  if (!fresh.length) return fail('Those steps are already there.');
  const start = ws.tasks.filter(t => t.outcome_id === outcomeId).reduce((m, t) => Math.max(m, t.position + 1), 0);
  return done(fresh.map((name, i) => ins('tasks', { ...baseRow(ctx), outcome_id: outcomeId, name, notes: '', done_at: null, archived_at: null, deadline: null, effort: null, position: start + i, sources: [] })),
    fresh.length === 1 ? 'Step added.' : `${fresh.length} steps added.`);
}

// ------------------------------------------------------------------ prompts and the weekly review: dismissals are remembered by id
export function dismissPrompt(ws: Workspace, ctx: Ctx, id: string): Result {
  const list = ws.settings?.priority_dismissed ?? [];
  if (list.includes(id)) return done([]);
  return done([settingsWrite(ws, ctx, { priority_dismissed: [...list, id].slice(-300) })]);
}

// ------------------------------------------------------------------ ideas: capture a possibility without committing to it
const idea = (ws: Workspace, id: string) => ws.ideas.find(i => i.id === id);
export function createIdea(ws: Workspace, ctx: Ctx, input: { name: string; notes?: string; folderId: string | null }): Result {
  void ws;
  const name = trimmed(input.name).slice(0, 200); if (!name) return fail('Write the idea first.');
  return done([ins('ideas', { ...baseRow(ctx), folder_id: input.folderId, name, notes: input.notes ?? '', archived_at: null, sources: [] })], 'Idea saved. It is not a commitment.');
}
export function editIdea(ws: Workspace, id: string, input: { name: string; notes: string; folderId: string | null }): Result {
  const i = idea(ws, id); if (!i) return fail('That idea no longer exists.');
  const name = trimmed(input.name).slice(0, 200); if (!name) return fail('Write the idea first.');
  return done([upd('ideas', i, { name, notes: input.notes, folder_id: input.folderId })], 'Idea updated.');
}
export function archiveIdea(ws: Workspace, ctx: Ctx, id: string, archived: boolean): Result {
  const i = idea(ws, id); if (!i) return fail('That idea no longer exists.');
  return done([upd('ideas', i, { archived_at: archived ? ctx.now() : null })], archived ? 'Idea archived. Restore it any time.' : 'Idea restored.');
}
/** Promoting is always the user's explicit act. It creates an outcome in Later, links it back to the idea, and keeps the idea (archived). */
export function promoteIdea(ws: Workspace, ctx: Ctx, id: string): Result {
  const i = idea(ws, id); if (!i) return fail('That idea no longer exists.');
  const oid = ctx.id();
  return done([
    ins('outcomes', { ...baseRow(ctx), id: oid, folder_id: i.folder_id, name: trimmed(i.name).slice(0, 200), description: i.notes.slice(0, 600), pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [i.id] }),
    ins('focus_assignments', { ...baseRow(ctx), outcome_id: oid, lane: 'later', position: ws.focus.length }),
    upd('ideas', i, { archived_at: ctx.now(), notes: `${i.notes}${i.notes ? '\n' : ''}Promoted to an outcome.` }),
    audit(ctx, 'idea-promoted', 'idea', i.id, null, { outcome: oid }),
  ], 'Promoted to an outcome in Later. The idea is kept, archived.');
}
