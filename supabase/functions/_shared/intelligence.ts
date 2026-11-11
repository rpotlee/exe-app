// Pure request identity and freshness rules shared by the Edge function and workload tests.
export interface Source { id: string; revision: number; text: string }
export const INTELLIGENCE_VERSION = 1;
export function sourceRevisions(rows: Source[]): Record<string, number> {
  return Object.fromEntries(rows.map(r => [r.id, r.revision]));
}
export function sourcesCurrent(saved: Record<string, number>, rows: Source[]): boolean {
  return rows.length === Object.keys(saved).length && rows.every(r => saved[r.id] === r.revision);
}
export async function intelligenceKey(provider: string, model: string, rows: Source[]): Promise<string> {
  const source = JSON.stringify([INTELLIGENCE_VERSION, provider, model, rows.map(r => [r.id, r.revision]).sort((a,b) => String(a[0]).localeCompare(String(b[0])))]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('');
}
