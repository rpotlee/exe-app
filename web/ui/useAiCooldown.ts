import { useEffect, useState } from 'react';

/** A display-only clock. Expiry enables an explicit retry; it never starts an AI request. */
export function useAiCooldown(retryAt: number | null | undefined): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!retryAt || retryAt <= Date.now()) return;
    const timer = setInterval(() => { const t = Date.now(); setNow(t); if (t >= retryAt) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  return retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
}
