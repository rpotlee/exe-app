import { ICONS } from './icons';

/** Stroke icon from the shared set. The path strings are constants in this repo, never user input. */
export function Icon({ name, className, size = 20 }: { name: string; className?: string; size?: number }) {
  return <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] ?? ICONS['circle-help'] ?? '' }} />;
}
