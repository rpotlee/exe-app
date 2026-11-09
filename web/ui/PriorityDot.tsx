import { setCapturePriority } from '../../src/domain/commands';
import type { Level } from '../../src/domain/mission';
import { useApp } from '../app/context';

export const LEVEL_NAME: Record<Level, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** A priority label as a colored dot: red high, orange medium, yellow low. A filled dot is yours; a ring is the AI's suggestion until you choose.
 *  Tapping opens the choices (a 44px tap area around the dot). The level is also its accessible name and tooltip. */
export function PriorityDot({ captureId, level, fromAi, why, text }: { captureId: string; level: Level | null; fromAi: boolean; why: string; text: string }) {
  const { api } = useApp();
  const name = level ? `${LEVEL_NAME[level]} priority${fromAi ? ', suggested by AI' : ''}` : 'No priority';
  return (
    <span className={`prio-dot ${level ? `prio-${level}` : 'prio-none'} ${fromAi ? 'ai' : ''}`} title={`${name}${why ? `: ${why}` : ''}`}>
      <select aria-label={`Priority of ${text}: ${name}`} value={fromAi ? '' : (level ?? '')} onChange={e => api.run(w => setCapturePriority(w, captureId, (e.target.value || null) as Level | null))}>
        <option value="">{fromAi ? `Keep AI suggestion (${level ? LEVEL_NAME[level] : ''})` : 'No label'}</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
    </span>
  );
}

/** The same colors as a row of counts: ●2 ●1 ●3. */
export function PriorityCounts({ high, medium, low, none }: { high: number; medium: number; low: number; none: number }) {
  const parts: [Level | 'none', number][] = [['high', high], ['medium', medium], ['low', low], ['none', none]];
  const spoken = [high && `${high} high`, medium && `${medium} medium`, low && `${low} low`, none && `${none} without a label`].filter(Boolean).join(', ');
  return <span className="prio-counts" role="img" aria-label={spoken || 'no tasks'}>{parts.filter(([, n]) => n > 0).map(([k, n]) => <span key={k} className="pc"><span className={`dotc prio-${k}`} aria-hidden="true" />{n}</span>)}</span>;
}
