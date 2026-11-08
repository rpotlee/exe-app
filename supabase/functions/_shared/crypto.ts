// The user's AI key is encrypted (AES-256-GCM) before it is stored, with a secret that lives only in the server environment.
const b64 = (u: Uint8Array): string => btoa(String.fromCharCode(...u));
const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function key(secretB64: string): Promise<CryptoKey> {
  const raw = unb64(secretB64); if (raw.length !== 32) throw new Error('EXE_KEY_SECRET must be 32 bytes, base64 encoded');
  return crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptKey(secretB64: string, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, await key(secretB64), new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length); return b64(out);
}
export async function decryptKey(secretB64: string, packed: string): Promise<string> {
  const all = unb64(packed), iv = all.slice(0, 12), ct = all.slice(12);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, await key(secretB64), ct as BufferSource));
}
