import { useCallback, useEffect, useMemo, useState } from 'react';
import { currentFocusId } from '../../src/domain/model';
import type { Store } from '../../src/store/store';
import { QueuedStore, type QueueState } from '../../src/store/queued';
import { Modal } from '../ui/Modal';
import type { AiApi } from './ai';

import { Icon } from '../ui/Icon';
import { Ctx, type AppCtx, type ModalState, type Page } from './context';
import { Dialogs } from './Dialogs';
import { useWorkspace } from './useWorkspace';
import { Focus } from '../screens/Focus';
import { Lanes } from '../screens/Lanes';
import { Inbox } from '../screens/Inbox';
import { MapScreen } from '../screens/Map';
import { Later } from '../screens/Later';
import { Decisions } from '../screens/Decisions';
import { Review } from '../screens/Review';

const PAGES: Page[] = ['focus', 'lanes', 'inbox', 'review', 'map', 'decisions'];
const fromHash = (): Page => { const p = location.hash.replace(/^#\/?/, '') as Page; return PAGES.includes(p) ? p : 'focus'; };
const TABS: { page: Page; label: string; icon: string; desktopIcon: string }[] = [
  { page: 'focus', label: 'Focus', icon: 'crosshair', desktopIcon: 'target' }, { page: 'inbox', label: 'Inbox', icon: 'inbox', desktopIcon: 'inbox' },
  { page: 'review', label: 'AI Review', icon: 'sparkles', desktopIcon: 'sparkles' }, { page: 'map', label: 'Map', icon: 'network', desktopIcon: 'network' },
  { page: 'decisions', label: 'Decisions', icon: 'git-branch', desktopIcon: 'git-branch' },
];

export function Shell({ store, where, onSignOut, ai = null }: { store: Store; where: string; onSignOut?: () => void; ai?: AiApi | null }) {
  const api = useWorkspace(store);
  const [page, setPage] = useState<Page>(fromHash);
  const [folderSel, setFolderSel] = useState('all');
  const [decisionSel, setDecisionSel] = useState('');
  const [stack, setStack] = useState<ModalState[]>([]);
  const setModal = useCallback((m: ModalState | null) => setStack(s => (m ? [...s, m] : s.slice(0, -1))), []);
  useEffect(() => { const h = () => setPage(fromHash()); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  const go = useCallback((p: Page) => { location.hash = `#/${p}`; window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { document.body.classList.toggle('page-is-focus', page === 'focus'); document.title = 'Exe — ' + ({ focus: 'Focus', lanes: 'Next & Later', inbox: 'Inbox', review: 'AI Review', map: 'Map', decisions: 'Decisions' })[page]; }, [page]);
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
  const awaiting = ws ? ws.captures.filter(c => c.status === 'pending' && !c.review_state).length : 0;
  const value = useMemo<AppCtx | null>(() => (ws ? { api: { ...api, ws }, page, go, modal: setModal, awaitingReview: awaiting, where, folderSel, setFolderSel, decisionSel, setDecisionSel, ai, signOut: onSignOut ?? null } : null), [api, ws, page, go, awaiting, where, setModal, folderSel, decisionSel, ai, onSignOut]);

  if (api.loadError) return <main className="auth-page"><div className="card auth-card"><h1>Could not load your workspace</h1><p className="form-error" role="alert">{api.loadError}</p><button className="primary-button" onClick={() => location.reload()}>Try again</button></div></main>;
  if (!ws || !value) return <p className="auth-note" role="status">Loading your workspace…</p>;

  const navPage = page === 'lanes' ? 'focus' : page;
  const name = ws.settings?.workspace_name || 'My workspace';
  const save = qs?.conflict ? 'Needs your attention' : qs && qs.pending > 0 ? (qs.offline ? 'Saved on this device, not synced' : 'Saving…') : api.state === 'saving' ? 'Saving…' : api.state === 'error' ? 'Not saved' : store.kind === 'local' ? 'Saved on this device' : 'Saved';
  const screen = page === 'focus' ? <Focus /> : page === 'lanes' ? <Lanes /> : page === 'inbox' ? <Inbox /> : page === 'map' ? <MapScreen /> : page === 'decisions' ? <Decisions /> : page === 'review' ? <Review /> : <Later which={page} />;
  const badge = (p: Page) => (p === 'inbox' || p === 'review') && awaiting > 0 ? awaiting : 0;
  const bubble = (n: number) => (n ? <span className="dock-bubble" aria-label={`${n} awaiting AI Review`}>{n > 99 ? '99+' : n}</span> : null);

  return (
    <Ctx.Provider value={value}>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Primary navigation">
          <button className="brand" onClick={() => go('focus')} aria-label="Exe home"><span className="brand-symbol" aria-hidden="true"><i></i><i></i></span><span>Exe</span></button>
          <div className="sidebar-label">WORKSPACE</div>
          <nav className="sidebar-menu">{TABS.map(t => (
            <button key={t.page} className={`nav-link ${navPage === t.page ? 'active' : ''}`} aria-current={navPage === t.page ? 'page' : undefined} onClick={() => go(t.page)} data-nav={t.page}>
              <Icon name={t.desktopIcon} /><span>{t.label}</span>{badge(t.page) > 0 && <span className="nav-count" aria-label={`${badge(t.page)} awaiting AI Review`}>{badge(t.page)}</span>}</button>))}</nav>
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
            <div className="breadcrumb">Workspace <span>/</span> <em className="crumb-name">{name}</em> <span>/</span> <b>{({ focus: 'Focus', lanes: 'Next & Later', inbox: 'Inbox', review: 'AI Review', map: 'Map', decisions: 'Decisions' })[page]}</b></div>
            <div className="top-actions">
              <span className="saved-indicator" role="status"><Icon name="cloud" /> {save}</span>
              <button className="top-capture" onClick={() => setModal({ kind: 'capture' })}><Icon name="plus" /> Quick capture <kbd>⌘ K</kbd></button>
              <span className="desktop-avatar">{name.slice(0, 1).toUpperCase()}</span>
            </div>
          </header>
          <section id="view" className="view">{screen}</section>
        </main>
      </div>
      <div className="mobile-navigation">
        <nav className="mobile-dock" aria-label="Mobile primary navigation">{TABS.map(t => (
          <button key={t.page} className={`dock-item ${navPage === t.page ? 'active' : ''}`} aria-label={t.label} aria-current={navPage === t.page ? 'page' : undefined} onClick={() => go(t.page)} data-nav={t.page}>
            <Icon name={t.icon} /><small>{t.label}</small>{bubble(badge(t.page))}</button>))}</nav>
        <button className="mobile-capture" aria-label="Quick Capture" onClick={() => setModal({ kind: 'capture' })}><span className="capture-label">Capture something</span><span className="capture-go" aria-hidden="true"><Icon name="plus" /></span></button>
      </div>
      <div className={`toast ${api.toast ? 'show' : ''}`} role="status" aria-live="polite">{api.toast}</div>
      {stack.map((m, i) => <Dialogs key={i} m={m} />)}
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
