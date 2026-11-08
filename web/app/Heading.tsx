import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { useApp } from './context';

export function MobileTopline() {
  const { go, awaitingReview, modal } = useApp();
  return (
    <div className="mobile-topline">
      <button className="brand brand-mobile" onClick={() => go('focus')} aria-label="Exe home"><span className="brand-symbol" aria-hidden="true"><i></i><i></i></span><span>Exe</span></button>
      <div className="topline-actions">
        <button className="icon-button bell-button" onClick={() => go('review')} aria-label={awaitingReview ? `AI Review, ${awaitingReview} awaiting review` : 'AI Review'}><Icon name="bell" />{awaitingReview > 0 && <span className="bell-dot"></span>}</button>
        <button className="mobile-workspace" aria-label="Account and settings" aria-haspopup="dialog" onClick={() => modal({ kind: 'settings' })}><span className="avatar" aria-hidden="true">A</span></button>
      </div>
    </div>
  );
}
export function PageHeading({ label, title, sub, extra }: { label: string; title: string; sub: string; extra?: ReactNode }) {
  return (<><MobileTopline /><div className="page-heading"><div><div className="eyebrow">{label}</div><h1>{title}<span className="period" aria-hidden="true">.</span></h1><p className="page-sub">{sub}</p></div>{extra}</div></>);
}
