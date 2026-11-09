import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DueReminders } from '../ui/DueReminders';
import { currentFocusId, emptyWorkspace } from '../../src/domain/model';
import type { Store } from '../../src/store/store';
import { QueuedStore, type QueueState } from '../../src/store/queued';
import { Modal } from '../ui/Modal';
import type { AiApi } from './ai';
import { useAssist, type AssistClient } from './useAssist';
import * as C from '../../src/domain/commands';
import type { AiEventInput } from '../../src/domain/activity';

import { Icon } from '../ui/Icon';
import { Ctx, type AppCtx, type ModalState, type Page } from './context';
import { ALL, validScope, type Scope } from '../../src/domain/scope';
import type { PriorityMode } from '../../src/domain/mission';
const Dialogs = lazy(() => import('./Dialogs').then(m => ({ default: m.Dialogs })));   // opened on demand, not part of the first load
import { useWorkspace } from './useWorkspace';
import { Focus } from '../screens/Focus';
import { Mission } from '../screens/Mission';
import { EntryAssistant } from '../ui/EntryAssistant';
import { demoAdapter, type Adapter } from './assistantApi';
import { TaskScreen } from '../screens/TaskScreen';
const Lanes = lazy(() => import('../screens/Lanes').then(m => ({ default: m.Lanes })));
import { List } from '../screens/Inbox';
const MapScreen = lazy(() => import('../screens/Map').then(m => ({ default: m.MapScreen })));
const Later = lazy(() => import('../screens/Later').then(m => ({ default: m.Later })));
const Decisions = lazy(() => import('../screens/Decisions').then(m => ({ default: m.Decisions })));
const Activity = lazy(() => import('../screens/Activity').then(m => ({ default: m.Activity })));
const Review = lazy(() => import('../screens/Review').then(m => ({ default: m.Review })));

const PAGES: Page[] = ['focus', 'approvals', 'priorities', 'tasks', 'group', 'lanes', 'inbox', 'review', 'map', 'decisions'];
// New names for the three primary screens; the old hashes still work and land on the same screens (revamp spec §2.3).
const HASH_TO_PAGE: Record<string, Page> = { list: 'inbox', executables: 'inbox', status: 'focus', mission: 'focus', assistant: 'review', activity: 'review' };
const PAGE_TO_HASH: Record<Page, string> = { inbox: 'list', focus: 'status', review: 'activity', approvals: 'approvals', priorities: 'priorities', tasks: 'tasks', group: 'group', lanes: 'lanes', map: 'map', decisions: 'decisions' };
const fromHash = (): Page => { const h = location.hash.replace(/^#\/?/, '').replace(/^group\/.*/, 'group'); return HASH_TO_PAGE[h] ?? (PAGES.includes(h as Page) ? (h as Page) : 'inbox'); };
const PAGE_NAME: Record<Page, string> = { approvals: 'Approvals', priorities: 'Priorities', tasks: 'All tasks', group: 'Group', focus: 'Status', lanes: 'Next & Later', inbox: 'List', review: 'Activity Log', map: 'Map', decisions: 'Decisions' };
// The primary destinations. Map, Decisions and Next & Later are reached from Status ("Explore work"), so Mission stays highlighted for them.
const TABS: { page: Page; label: string; icon: string }[] = [
  { page: 'inbox', label: 'List', icon: 'list-checks' }, { page: 'focus', label: 'Status', icon: 'target' }, { page: 'review', label: 'Activity Log', icon: 'history' },
];
const MOBILE_ICON: Record<string, string> = { 'list-checks': 'mobile-list', target: 'mobile-status', history: 'mobile-activity' };
const SCOPE_KEY = 'exe-scope', PRIO_KEY = 'exe-priority-mode';
const loadPrio = (): PriorityMode => { try { const v = localStorage.getItem(PRIO_KEY); if (v === 'mine' || v === 'off') return v; } catch { /* default */ } return 'ai'; };
const loadScope = (): Scope => { try { const j = JSON.parse(localStorage.getItem(SCOPE_KEY) ?? ''); if (j?.kind === 'folder' && typeof j.id === 'string') return j; } catch { /* All */ } return ALL; };

export function Shell({ store, where, onSignOut, ai = null, fakeAi = null, assistantApi = null }: { store: Store; where: string; onSignOut?: () => void; ai?: AiApi | null; fakeAi?: AssistClient | null; assistantApi?: Adapter | null }) {
  const assistantAdapter = fakeAi ? demoAdapter : assistantApi;
  const assist = useMemo<AssistClient | null>(() => fakeAi ?? (ai ? { settings: () => ai.settings(), assist: ids => ai.assist(ids) } : null), [ai, fakeAi]);
  const api = useWorkspace(store);
  const logAi = useCallback((events: AiEventInput[]) => { api.run((w, c) => C.logAiEvents(w, c, events)); }, [api]);
  const [entryOpen, openEntry] = useState<string | null>(null);
  const assistState = useAssist(assist, api.ws ?? emptyWorkspace(), logAi, store.owner);   // one explicit review controller for the whole app
  const [page, setPage] = useState<Page>(fromHash);
  const [priorityMode, setPriorityModeRaw] = useState<PriorityMode>(loadPrio);
  const setPriorityMode = useCallback((m: PriorityMode) => { setPriorityModeRaw(m); try { localStorage.setItem(PRIO_KEY, m); } catch { /* convenience only */ } }, []);
  const [rawScope, setRawScope] = useState<Scope>(loadScope);
  const setScope = useCallback((sc: Scope) => { setRawScope(sc); try { localStorage.setItem(SCOPE_KEY, JSON.stringify(sc)); } catch { /* convenience only */ } }, []);
  const [decisionSel, setDecisionSel] = useState('');
  const [stack, setStack] = useState<ModalState[]>([]);
  // the same dialog is never stacked on itself (a double tap while it loads must not open two)
  const setModal = useCallback((m: ModalState | null) => setStack(s => (m ? (JSON.stringify(s[s.length - 1]) === JSON.stringify(m) ? s : [...s, m]) : s.slice(0, -1))), []);
  useEffect(() => { const h = () => setPage(fromHash()); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  const go = useCallback((p: Page) => { location.hash = `#/${PAGE_TO_HASH[p]}`; window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { document.body.classList.toggle('page-is-focus', page === 'focus'); document.title = 'Exe — ' + PAGE_NAME[page]; }, [page]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setModal({ kind: 'capture' }); }
      else if (e.key === '/' && !(e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) && !document.getElementById('root')?.hasAttribute('inert')) { e.preventDefault(); setModal({ kind: 'search' }); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [setModal]);

  const queue = store instanceof QueuedStore ? store : null;
  const [qs, setQs] = useState<QueueState | null>(queue ? queue.state() : null);
  useEffect(() => {
    if (!queue) return;
    const off = queue.subscribe(() => setQs(queue.state())), on = () => void queue.flush().catch(() => undefined);
    window.addEventListener('online', on); void queue.flush().catch(() => undefined);
    return () => { off(); window.removeEventListener('online', on); };
  }, [queue]);
  const ws = api.ws;
  const scope = ws ? validScope(ws, rawScope) : rawScope, folderSel = scope.kind === 'folder' ? scope.id : 'all';
  const setFolderSel = useCallback((v: string) => setScope(v === 'all' ? ALL : { kind: 'folder', id: v }), [setScope]);
  const landed = useRef(false);   // a first visit opens the list; someone with active priorities opens Focus
  useEffect(() => { if (ws && !landed.current) { landed.current = true; if (!location.hash && ws.focus.some(f => f.lane === 'now')) setPage('focus'); } }, [ws]);
  const awaiting = ws ? ws.captures.filter(c => c.status === 'pending' && !c.review_state).length : 0;
  const value = useMemo<AppCtx | null>(() => (ws ? { api: { ...api, ws }, page, go, modal: setModal, awaitingReview: awaiting, where, folderSel, setFolderSel, decisionSel, setDecisionSel, ai, assist, assistState, assistantDemo: !!fakeAi, assistantAdapter, openEntry, scope, setScope, priorityMode, setPriorityMode, signOut: onSignOut ?? null } : null), [api, ws, page, go, awaiting, where, setModal, folderSel, setFolderSel, decisionSel, ai, assist, assistState, fakeAi, assistantAdapter, scope, setScope, priorityMode, setPriorityMode, onSignOut]);

  if (api.loadError) return <main className="auth-page"><div className="card auth-card"><h1>Could not load your workspace</h1><p className="form-error" role="alert">{api.loadError}</p><button className="primary-button" onClick={() => location.reload()}>Try again</button></div></main>;
  if (!ws || !value) return <p className="auth-note" role="status">Loading your workspace…</p>;

  const navPage: Page = ['lanes', 'map', 'decisions', 'priorities', 'tasks', 'group'].includes(page) ? 'focus' : page === 'approvals' ? 'review' : page;   // Map, Decisions and Next & Later live under Mission
  const scopeName = scope.kind === 'folder' ? (ws.folders.find(f => f.id === scope.id)?.name ?? 'All') : 'All';
  const name = ws.settings?.workspace_name || 'My workspace';
  const save = qs?.conflict ? 'Needs your attention' : qs && qs.pending > 0 ? (qs.offline ? 'Saved on this device, not synced' : 'Saving…') : api.state === 'saving' ? 'Saving…' : api.state === 'error' ? 'Not saved' : store.kind === 'local' ? 'Saved on this device' : 'Saved';
  const screen = page === 'focus' ? <Mission /> : page === 'priorities' ? <Focus /> : page === 'tasks' ? <TaskScreen /> : page === 'group' ? <TaskScreen groupId={decodeURIComponent(location.hash.replace(/^#\/?group\//, ''))} /> : page === 'lanes' ? <Lanes /> : page === 'inbox' ? <List /> : page === 'map' ? <MapScreen /> : page === 'decisions' ? <Decisions /> : page === 'review' ? <Activity /> : page === 'approvals' ? <Review /> : <Later which={page} />;
  const badge = (_p: Page) => 0;   // the AI tab is a log now (DEC-018): nothing is waiting on you there, so no count
  const bubble = (n: number) => (n ? <span className="dock-bubble" aria-label={`${n} items for the AI Assistant`}>{n > 99 ? '99+' : n}</span> : null);

  return (
    <Ctx.Provider value={value}>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Primary navigation">
          <button className="brand" onClick={() => go('focus')} aria-label="Exe home"><span className="brand-symbol" aria-hidden="true"><i></i><i></i></span><span>Exe</span></button>
                    <nav className="sidebar-menu">{TABS.map(t => (
            <button key={t.page} className={`nav-link ${navPage === t.page ? 'active' : ''}`} aria-current={navPage === t.page ? 'page' : undefined} onClick={() => go(t.page)} data-nav={t.page}>
              <Icon name={t.icon} /><span>{t.page === 'focus' ? 'Status' : t.label}</span>{badge(t.page) > 0 && <span className="nav-count" aria-label={`${badge(t.page)} items for the AI Assistant`}>{badge(t.page)}</span>}</button>))}
            <button className="nav-link" aria-haspopup="dialog" onClick={() => setModal({ kind: 'folders' })} data-nav="folders"><Icon name="folder" /><span>Folders</span><span className="nav-scope">{scopeName}</span></button></nav>
          <div className="sidebar-bottom">
            <button className="nav-link sidebar-search" onClick={() => setModal({ kind: 'search' })}><Icon name="search" /><span>Search</span></button>
            <a className="nav-link sidebar-search" href="/support/index.html" target="_blank" rel="noopener"><Icon name="circle-help" /><span>Help</span></a>
            <button className="nav-link sidebar-search" onClick={() => setModal({ kind: 'settings' })}><Icon name="settings" /><span>Settings</span></button>
            {onSignOut && <button className="nav-link sidebar-search" onClick={onSignOut}><Icon name="lock" /><span>Sign out</span></button>}
            <button className="workspace-switch" onClick={() => setModal({ kind: 'settings' })}><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong></span><Icon name="chevron-down" /></button>
          </div>
        </aside>
        <main className="main" id="main" tabIndex={-1}>
          <header className="desktop-topbar">
            <div className="breadcrumb"><button className="crumb-scope" onClick={() => setModal({ kind: 'folders' })} aria-haspopup="dialog">{scopeName}</button> <span>/</span> <b>{PAGE_NAME[page]}</b></div>
            <div className="top-actions">
              <span className="saved-indicator" role="status"><Icon name="cloud" /> {save}</span>
              <button className="top-capture" aria-label="Capture task, note or reminder" onClick={() => setModal({ kind: 'capture' })}><Icon name="plus" /> Capture <kbd>⌘ K</kbd></button>
              <span className="desktop-avatar">{name.slice(0, 1).toUpperCase()}</span>
            </div>
          </header>
          <section id="view" className="view"><DueReminders /><Suspense fallback={<p className="auth-note" role="status">Loading…</p>}>{screen}</Suspense></section>
        </main>
      </div>
      <div className="mobile-navigation">
        <nav className="mobile-dock" aria-label="Mobile primary navigation">
          {TABS.slice(0, 2).map(t => (
            <button key={t.page} className={`dock-item ${navPage === t.page ? 'active' : ''}`} aria-label={t.label} aria-current={navPage === t.page ? 'page' : undefined} onClick={() => go(t.page)} data-nav={t.page}>
              <Icon name={t.icon} mobileName={MOBILE_ICON[t.icon]} /><small>{t.label}</small></button>))}
          <button className="dock-capture" aria-label="Capture task, note or reminder" onClick={() => setModal({ kind: 'capture' })}><Icon name="plus" mobileName="mobile-plus" /></button>
          {TABS.slice(2).map(t => (
            <button key={t.page} className={`dock-item ${navPage === t.page ? 'active' : ''}`} aria-label={t.label} aria-current={navPage === t.page ? 'page' : undefined} onClick={() => go(t.page)} data-nav={t.page}>
              <Icon name={t.icon} mobileName={MOBILE_ICON[t.icon]} /><small>Activity</small>{bubble(badge(t.page))}</button>))}
          <button className="dock-item" aria-label={`Folders, showing ${scopeName}`} aria-haspopup="dialog" onClick={() => setModal({ kind: 'folders' })} data-nav="folders"><Icon name="folder" mobileName="mobile-folder" /><small>Folders</small></button>
        </nav>
        <button className="mobile-capture-action" aria-label="Capture task, note or reminder" onClick={() => setModal({ kind: 'capture' })}><Icon name="mobile-plus" /></button>
      </div>
      {entryOpen && <EntryAssistant id={entryOpen} onClose={() => openEntry(null)} />}
      <div className={`toast ${api.toast ? 'show' : ''}`} role="status" aria-live="polite">{api.toast}</div>
      <Suspense fallback={null}>{stack.map((m, i) => <Dialogs key={i} m={m} />)}</Suspense>
      {queue && qs?.conflict && <ConflictDialog queue={queue} entries={qs.conflict} reload={api.reload} />}
    </Ctx.Provider>
  );
}
export { currentFocusId };

/** Another device changed the same thing. Nothing was overwritten; the unsent changes are kept and can be downloaded. */
function ConflictDialog({ queue, entries, reload }: { queue: QueuedStore; entries: { writes: unknown[] }[]; reload: () => Promise<void> }) {
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })); a.download = 'exe-unsent-changes.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 800); };
  const n = entries.reduce((s, e) => s + e.writes.length, 0);
  return (
    <Modal title="This changed on another device" onClose={() => undefined}>
      <p className="helper">Something you changed was also changed somewhere else. To protect your work, <strong>nothing was overwritten</strong>. {n} unsent {n === 1 ? 'change was' : 'changes were'} set aside, and newer changes on this device are waiting.</p>
      <p className="small-note">Download your unsent changes if you want to keep a copy, then use the latest version. You can redo anything you still want.</p>
      <div className="capture-foot"><button className="quiet-button" onClick={download}>Download my unsent changes</button>
        <button className="primary-button" onClick={() => { queue.resolveConflict(); void reload(); }}>Use the latest version</button></div>
    </Modal>
  );
}
