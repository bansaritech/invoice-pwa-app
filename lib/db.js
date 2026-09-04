// IndexedDB wrapper for the local mirror (ledger-db).
// Object stores per ARCHITECTURE.md; the outbox holds pending changes for upload.

const DB_NAME = 'ledger-db';
const VERSION = 1;

let dbp;
export function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('clients')) db.createObjectStore('clients', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('invoices')) db.createObjectStore('invoices', { keyPath: 'number' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

const reqP = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
const os = async (store, mode = 'readonly') => (await open()).transaction(store, mode).objectStore(store);

export async function get(store, key) { return reqP((await os(store)).get(key)); }
export async function getAll(store) { return reqP((await os(store)).getAll()); }
export async function count(store) { return reqP((await os(store)).count()); }
export async function put(store, value) { return reqP((await os(store, 'readwrite')).put(value)); }
export async function del(store, key) { return reqP((await os(store, 'readwrite')).delete(key)); }

export async function bulkPut(store, arr) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    arr.forEach((v) => s.put(v));
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

// meta helpers (flags, lastSync, manifest, …)
export const getMeta = async (key) => (await get('meta', key))?.value;
export const setMeta = (key, value) => put('meta', { key, value });
