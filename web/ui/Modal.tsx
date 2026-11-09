import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

const FOCUSABLE = 'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])';
let openDialogs = 0;
const closers: (() => void)[] = [];      // the last one is the top-most dialog
const onDocKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && closers.length) { e.stopPropagation(); closers[closers.length - 1]?.(); } };

/** Background inert while any dialog is open, focus trapped inside, Escape closes, focus returns to where it was. */
export function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void, opts: { focusFirst?: boolean; modal?: boolean } = {}) {
  const { focusFirst = true, modal = true } = opts;
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null, root = document.getElementById('root'), fn = () => close.current();
    if (openDialogs++ === 0) document.addEventListener('keydown', onDocKey, true);
    closers.push(fn); if (modal) { root?.setAttribute('inert', ''); document.body.style.overflow = 'hidden'; }
    (focusFirst ? (ref.current?.querySelector<HTMLElement>('textarea, input, select, button:not([data-close])') ?? ref.current) : ref.current)?.focus({ preventScroll: true });
    return () => {
      closers.splice(closers.lastIndexOf(fn), 1);
      if (--openDialogs === 0) { root?.removeAttribute('inert'); document.body.style.overflow = ''; document.removeEventListener('keydown', onDocKey, true); }
      else if (modal && closers.length === 0) { root?.removeAttribute('inert'); }
      before?.focus?.();
    };
  }, [ref]);
  return (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const nodes = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(n => n.getClientRects().length && !(n as HTMLButtonElement).disabled);
    const first = nodes[0], last = nodes[nodes.length - 1], active = document.activeElement as HTMLElement;
    if (e.shiftKey && (active === first || !nodes.includes(active))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (active === last || !nodes.includes(active))) { e.preventDefault(); first?.focus(); }
  };
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  const onKey = useDialog(sheet, onClose);
  return createPortal(
    <div className="modal-layer" data-overlay onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={onKey}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title} ref={sheet} tabIndex={-1}>
        <header><h2>{title}</h2><button type="button" className="close-button" data-close aria-label="Close" onClick={onClose}><Icon name="x" /></button></header>
        {children}
      </div>
    </div>, document.getElementById('modal-root') as HTMLElement);
}
