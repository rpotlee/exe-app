import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { Workspace } from '../../src/domain/model';
import type { AiEventInput } from '../../src/domain/activity';
import { onAiSettingsChanged } from './aiRequests';
import { AssistEngine, type HelpClient } from './assistEngine';

/** One assistance engine per signed-in account. It reads saved entries; it never writes them. */
export function useHelp(client: HelpClient | null, ws: Workspace, log: (events: AiEventInput[]) => void, owner: string) {
  const logRef = useRef(log); logRef.current = log;
  const engine = useMemo(() => new AssistEngine(client, typeof localStorage === 'undefined' ? undefined : localStorage, undefined,
    (id, kind) => logRef.current([{ action: 'ai-help', entityType: 'capture', entityId: id, after: { kind } }])), [client, owner]);
  useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  useEffect(() => {
    let active = true, n = 0;
    if (!client) { engine.configure(owner, null); return; }
    const refresh = () => { const mine = ++n; engine.deactivate(); client.settings().then(s => { if (active && mine === n) engine.configure(owner, s); }).catch(() => { if (active && mine === n) engine.configure(owner, null); }); };
    const off = onAiSettingsChanged(owner, refresh); refresh();
    return () => { active = false; off(); engine.deactivate(); };
  }, [client, owner, engine]);
  useEffect(() => {
    engine.update(ws.captures.filter(c => !c.archived_at && !c.completed_at).map(c => ({ id: c.id, text: c.edited_text ?? c.text, kind: c.kind ?? 'todo' })));
  }, [engine, ws.captures]);
  useEffect(() => { (window as unknown as { __exeHelpDiag?: () => unknown }).__exeHelpDiag = () => engine.status(); }, [engine]);   // developer diagnostics
  return engine;
}
