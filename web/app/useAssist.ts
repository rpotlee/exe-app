import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { Workspace } from '../../src/domain/model';
import type { AiEventInput } from '../../src/domain/activity';
import { AssistReview, type AssistClient } from './assistReview';
import { onAiSettingsChanged } from './aiRequests';
export type { AssistClient } from './assistReview';

/** Restore suggestions for browsing; generate only when the user requests one bounded review. */
export function useAssist(ai: AssistClient | null, ws: Workspace, log?: (events: AiEventInput[]) => void, owner = 'local') {
  const review = useMemo(() => new AssistReview(ai, typeof localStorage === 'undefined' ? undefined : localStorage), [ai, owner]);
  useSyncExternalStore(review.subscribe, review.getVersion, review.getVersion);
  const logger = useRef(log); logger.current = log;
  useEffect(() => {
    let active = true, generation = 0;
    if (!ai) { review.configure(owner, null); return; }
    const refresh = () => {
      const request = ++generation; review.deactivate();
      ai.settings().then(s => { if (active && request === generation) review.configure(owner, s); }).catch(() => { if (active && request === generation) review.configure(owner, null); });
    };
    const off = onAiSettingsChanged(owner, refresh); refresh();
    return () => { active = false; off(); review.deactivate(); };
  }, [ai, owner, review]);
  useEffect(() => {
    review.update(ws.captures.filter(c => !c.archived_at && !c.completed_at && (c.edited_text ?? c.text).trim().length >= 6)
      .map(c => ({ id: c.id, text: c.edited_text ?? c.text, kind: c.kind ?? 'todo' })));
  }, [review, ws.captures]);
  const again = useCallback(async () => {
    const r = await review.run(); if (!r) return;
    const events: AiEventInput[] = r.items.map(it => ({ action: 'ai-help', entityType: 'capture', entityId: it.captureId, after: { kind: it.kind } }));
    const ps = r.priorities ?? [];
    if (ps.length) events.push({ action: 'ai-priorities', after: { total: ps.length, high: ps.filter(p => p.level === 'high').length, medium: ps.filter(p => p.level === 'medium').length, low: ps.filter(p => p.level === 'low').length } });
    for (const g of r.groups) events.push({ action: 'ai-group', after: { name: g.name, ids: g.ids } });
    for (const d of r.dependencies) events.push({ action: 'ai-depends', after: { before: d.before, after: d.after } });
    if (events.length) logger.current?.(events);
  }, [review]);
  return { ...review.view(), dismiss: review.dismiss, again };
}
