// Sync engine. Push: writes mark repo files dirty (outbox); a debounced uploader commits
// them. Pull: read repo files into the store. Conflict = last-write-wins (refetch sha, retry).
// File model (v1): settings.json, clients.json, items.json, invoices/<FY>.json.
import * as store from './store.js';
import * as repo from './repo.js';
import * as db from './db.js';
import { fyOf } from './format.js';

let dirty = new Set();
let shas = {};
let timer = null, uploading = false, status = 'idle';
const listeners = new Set();

export function onStatus(fn) { listeners.add(fn); fn(status, dirty.size); }
function setStatus(s) { status = s; listeners.forEach((fn) => fn(s, dirty.size)); }
export const pending = () => dirty.size;
export const getStatus = () => status;

export async function initSync() {
  dirty = new Set(await db.getMeta('dirty') || []);
  shas = await db.getMeta('shas') || {};
  store.onWrite((path) => { dirty.add(path); persist(); setStatus('dirty'); schedule(); });
  window.addEventListener('online', () => flush());
  setStatus(dirty.size ? 'dirty' : 'synced');
}
async function persist() { await db.setMeta('dirty', [...dirty]); await db.setMeta('shas', shas); }
function schedule() { if (!store.connected()) return; clearTimeout(timer); timer = setTimeout(flush, 3000); }

function fyLabel(iso) { return fyOf(iso, store.settings().invoicing.fyStartMonth || 4).label; }
function contentFor(path) {
  if (path === 'settings.json') return store.settings();
  if (path === 'clients.json') return store.clients();
  if (path === 'items.json') return store.items();
  if (path.startsWith('invoices/')) { const fy = path.slice(9, -5); return store.invoices().filter((i) => fyLabel(i.date) === fy); }
  return null;
}

export async function flush() {
  if (uploading || !store.connected() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  uploading = true; setStatus('uploading');
  try {
    for (const path of [...dirty]) {
      try {
        shas[path] = await repo.writeJson(path, contentFor(path), shas[path]);
        dirty.delete(path);
      } catch (e) {
        if (e.status === 409 || e.status === 422) { try { const cur = await repo.readJson(path); shas[path] = cur && cur.sha; } catch (_) {} }
        else { console.error('upload failed', path, e); }
      }
    }
    await persist();
  } finally {
    uploading = false;
    setStatus(dirty.size ? 'dirty' : 'synced');
    if (dirty.size) schedule();
  }
}
export const upload = flush;

export async function pull() {
  if (!store.connected()) return null;
  setStatus('syncing');
  try {
    const out = {};
    for (const [f, key] of [['settings.json', 'settings'], ['clients.json', 'clients'], ['items.json', 'items']]) {
      const r = await repo.readJson(f); if (r) { out[key] = r.data; shas[f] = r.sha; }
    }
    const dir = await repo.listDir('invoices');
    let all = [];
    for (const e of dir) {
      if (e.type === 'file' && e.name.endsWith('.json')) { const r = await repo.readJson('invoices/' + e.name); if (r) { all = all.concat(r.data); shas['invoices/' + e.name] = r.sha; } }
    }
    if (dir.length) out.invoices = all;
    if (Object.keys(out).length) await store.applyRemote(out);
    await persist();
    setStatus(dirty.size ? 'dirty' : 'synced');
    return out;
  } catch (e) { console.error('pull failed', e); setStatus('error'); return null; }
}

// On first connect: pull; if the repo has no data yet, push all local data up.
export async function initialSync() {
  const remote = await pull();
  if (!remote || !remote.settings) {
    ['settings.json', 'clients.json', 'items.json'].forEach((p) => dirty.add(p));
    new Set(store.invoices().map((i) => 'invoices/' + fyLabel(i.date) + '.json')).forEach((p) => dirty.add(p));
    await persist();
    await flush();
  }
}
