// Secure store for the data-source connection: repo/branch + an AES-GCM encrypted token
// (non-extractable key), mirroring the original app's model. Kept separate from ledger-db.

const dbp = new Promise((res, rej) => {
  const r = indexedDB.open('ledger-secure', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = async (mode) => (await dbp).transaction('kv', mode).objectStore('kv');
const reqP = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

async function getKV(key) { return reqP((await tx('readonly')).get(key)); }
async function setKV(key, val) { return reqP((await tx('readwrite')).put(val, key)); }

async function cryptoKey() {
  let key = await getKV('crypto-key');
  if (!key) { key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await setKV('crypto-key', key); }
  return key;
}
export async function saveToken(token) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(), new TextEncoder().encode(token));
  await setKV('github-token', { iv: [...iv], encrypted });
}
export async function readToken() {
  const stored = await getKV('github-token');
  if (!stored) return '';
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(stored.iv) }, await cryptoKey(), stored.encrypted);
  return new TextDecoder().decode(decrypted);
}

export async function saveConnection({ repo, branch, token }) {
  await setKV('repo', repo);
  await setKV('branch', branch || 'main');
  if (token) await saveToken(token);
}
export async function getConnection() {
  return { repo: await getKV('repo'), branch: await getKV('branch') };
}
export async function hasConnection() {
  return Boolean(await getKV('repo') && await getKV('branch') && await getKV('github-token'));
}
export async function clearConnection() {
  for (const k of ['repo', 'branch', 'github-token']) await reqP((await tx('readwrite')).delete(k));
}
