// Quick Capture segmentation (master §5.4, DEC-006). Deterministic and reversible.
// A block is a task list, one capture per line, when it has 2+ non-empty lines and either every line is short
// (<= 100 characters) or any line starts with a list marker. Otherwise it is ONE capture with its line breaks kept.
const MARKER = /^([-*•]|\d+[.)])\s+/;
export const SHORT_LINE = 100;

export function segmentCapture(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n');
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  if (lines.length === 1) return [lines[0] as string];
  const isList = lines.some(l => MARKER.test(l)) || lines.every(l => l.length <= SHORT_LINE);
  return isList ? lines.map(l => l.replace(MARKER, '')) : [raw.trim()];
}
