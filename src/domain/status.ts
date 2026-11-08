// The Mission Status state line (DEC-003): parts that are zero are omitted; "blocked" counts only confirmed blocks.
import { blockedCount } from './blocking';
import { currentFocusId, type Workspace } from './model';

export interface StatusParts { currentFocus: boolean; awaitingReview: number; blocked: number; empty: boolean }
export function statusParts(ws: Workspace, awaitingReview: number, captureCount: number): StatusParts {
  return { currentFocus: currentFocusId(ws) !== null, awaitingReview, blocked: blockedCount(ws), empty: ws.outcomes.length === 0 && captureCount === 0 };
}
export function statusText(p: StatusParts): string {
  if (p.empty) return 'Nothing here yet.';
  const parts: string[] = [];
  if (p.currentFocus) parts.push('1 current focus of up to 3 active.');
  if (p.awaitingReview) parts.push(`${p.awaitingReview} for the AI Assistant`);
  if (p.blocked) parts.push(`${p.blocked} blocked.`);
  return parts.join(' ') || 'Nothing active right now.';
}
