export const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
export const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
/** Postgres bytea <-> base64, so the encrypted key can travel through the REST API as a hex string. */
export const b64ToHex = (b64: string): string => '\\x' + [...Uint8Array.from(atob(b64), c => c.charCodeAt(0))].map(b => b.toString(16).padStart(2, '0')).join('');
export const hexToB64 = (hex: string): string => { const h = hex.replace(/^\\x/, ''); const bytes = new Uint8Array(h.length / 2); for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16); return btoa(String.fromCharCode(...bytes)); };
