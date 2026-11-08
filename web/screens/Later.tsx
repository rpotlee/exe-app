import { PageHeading } from '../app/Heading';
import type { Page } from '../app/context';

/** Screens not yet moved from the prototype. Said plainly, so nothing pretends to work. */
export function Later({ which }: { which: Page }) {
  const title = which === 'review' ? 'AI Review' : 'Decisions';
  return (
    <>
      <PageHeading label={title.toUpperCase()} title={title} sub="Not moved to the new app yet." />
      <div className="empty-state"><h2>Coming next</h2><p>{which === 'review' ? 'AI Review' : 'Decisions'} still works in the prototype. It has not been ported to this version, and nothing here is saved for it.</p></div>
    </>
  );
}
