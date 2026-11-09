import { ICONS } from './icons';

/** Optically balanced mobile symbols, sharing a 24px grid and rounded 1.8px strokes. */
const MOBILE_ICONS: Record<string, string> = {
  'mobile-list': '<rect x="4" y="3.5" width="16" height="17" rx="4"/><path d="m7.5 8.2 1.2 1.2 2-2.2M13 8.5h3.5m-9 5 1.2 1.2 2-2.2M13 13.8h3.5M7.5 17.5h9"/>',
  'mobile-status': '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" stroke="none"/>',
  'mobile-activity': '<path d="M4.5 7.5A8.2 8.2 0 1 1 3.8 14M4.5 3.5v4.8H9"/><path d="M12 7.5v5l3.3 2"/>',
  'mobile-folder': '<path d="M3 7.5V6A2.5 2.5 0 0 1 5.5 3.5H9l2.5 3H19A2.5 2.5 0 0 1 21.5 9v8.5A2.5 2.5 0 0 1 19 20H5.5A2.5 2.5 0 0 1 3 17.5z"/><path d="M3.5 9.5h17.5"/>',
  'mobile-search': '<circle cx="10.6" cy="10.6" r="6.6"/><path d="m15.5 15.5 4.5 4.5"/>',
  'mobile-bell': '<path d="M6 9a6 6 0 0 1 12 0v3.3c0 1.5.6 2.8 1.5 3.9.5.6.1 1.3-.7 1.3H5.2c-.8 0-1.2-.7-.7-1.3A6.1 6.1 0 0 0 6 12.3zM10 20.5h4"/>',
  'mobile-plus': '<path d="M12 5v14M5 12h14"/>',
  'mobile-note': '<rect x="4" y="3.5" width="16" height="17" rx="3.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
};

/** Stroke icon from the shared set. The path strings are constants in this repo, never user input. */
export function Icon({ name, mobileName, className, size = 20 }: { name: string; mobileName?: string; className?: string; size?: number }) {
  if (mobileName) return <><Icon name={name} className={`${className ?? ''} icon-standard`} size={size} /><Icon name={mobileName} className={`${className ?? ''} icon-mobile-light`} size={size} /></>;
  return <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOBILE_ICONS[name] ?? ICONS[name] ?? ICONS['circle-help'] ?? '' }} />;
}
