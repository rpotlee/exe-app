import { useEffect, useState } from 'react';
import { dismissReminder, dueReminders, reminderChoices, snoozeReminder } from '../../src/domain/commands';
import { useApp } from '../app/context';
import { Icon } from './Icon';

/** Reminders that are due now, shown inside the app. There is no push, email or text delivery. Checked every 30 seconds and when the tab is shown again. */
export function DueReminders() {
  const { api } = useApp();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now()), t = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const due = dueReminders(api.ws, now);
  if (!due.length) return null;
  const nextDay = () => reminderChoices(new Date()).find(c => c.label === 'Tomorrow morning')!.at.toISOString();
  return (
    <section className="due-reminders" aria-label="Reminders due now">
      {due.slice(0, 3).map(c => { const text = c.edited_text ?? c.text; return (
        <div className="due-row" key={c.id} role="status">
          <Icon name="bell" className="due-icon" />
          <div className="due-body"><strong>{text}</strong><small>Due {new Date(c.remind_at!).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</small></div>
          <div className="due-actions">
            <button className="mini-button" aria-label={`Snooze ${text} for 1 hour`} onClick={() => api.run((w, cx) => snoozeReminder(w, cx, c.id, new Date(Date.now() + 3600_000).toISOString()))}>1 hour</button>
            <button className="mini-button" aria-label={`Snooze ${text} until tomorrow`} onClick={() => api.run((w, cx) => snoozeReminder(w, cx, c.id, nextDay()))}>Tomorrow</button>
            <button className="mini-button" aria-label={`Dismiss reminder: ${text}`} onClick={() => api.run((w, cx) => dismissReminder(w, cx, c.id, new Date().toISOString()))}>Dismiss</button>
          </div>
        </div>); })}
      {due.length > 3 && <p className="small-note">and {due.length - 3} more due</p>}
    </section>
  );
}
