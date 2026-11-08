import { setCapturePriority } from '../../src/domain/commands';
import type { Level } from '../../src/domain/mission';
import { useApp } from '../app/context';

const LABEL: Record<Level, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** A priority label: the AI's suggestion (dashed, marked) until you pick one; tapping opens the choices. Your pick always wins. */
export function PriorityChip({ captureId, level, fromAi, why, text }: { captureId: string; level: Level | null; fromAi: boolean; why: string; text: string }) {
  const { api } = useApp();
  return (
    <span className={`prio-chip ${level ? `prio-${level}` : 'prio-none'} ${fromAi ? 'ai' : ''}`} title={why || undefined}>
      <span className="dot" aria-hidden="true" />{fromAi ? '✦ ' : ''}{level ? LABEL[level] : 'Priority'}
      <select aria-label={`Priority: ${text}${fromAi ? ' (suggested by AI)' : ''}`} value={fromAi ? '' : (level ?? '')} onChange={e => api.run(w => setCapturePriority(w, captureId, (e.target.value || null) as Level | null))}>
        <option value="">{fromAi ? `Keep AI suggestion (${level ? LABEL[level] : ''})` : 'No label'}</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
    </span>
  );
}
