// Local-first store: an in-memory cache (so views read synchronously) backed by
// IndexedDB (lib/db.js). On first run it seeds sample data and persists it; afterwards it
// hydrates from IndexedDB. Writes update the cache + persist. Phase 3 also enqueues to the
// sync outbox.
import * as db from './db.js';

const state = { settings: null, clients: [], items: [], invoices: [] };

// ---------- seed (first run only) ----------
function seed() {
  const settings = {
    business: { name: 'Bansari Tech', gstin: '24AABCB1234Z1Z5', address: '402, Silver Business Point, Surat, Gujarat 395006', email: 'hello@bansaritech.in', phone: '+91 98250 00000' },
    invoicing: { taxLabel: 'GST', taxMode: 'invoice', defaultTax: { type: 'pct', value: 18 }, defaultDiscount: { type: 'amount', value: 0 }, defaultCurrency: 'INR', numberFormat: 'INV-{YYYY}-{###}', paymentTerms: 'net15', fyStartMonth: 4 },
    branding: { appIcon: { type: 'preset', preset: 'rupee' } }
  };
  const clients = [
    { id: 'cl_ns', name: 'Northstar Supplies', gstin: '24AAB…1Z5', email: 'accounts@northstar.in', phone: '+91 98250 11223', terms: 'net15', preferredCurrency: 'INR' },
    { id: 'cl_ac', name: 'Acme Traders', gstin: '24AAC…9Z2', terms: 'net15', preferredCurrency: 'INR' },
    { id: 'cl_mf', name: 'Meridian Foods', gstin: '27AAD…4Z8', terms: 'net30', preferredCurrency: 'INR' },
    { id: 'cl_bs', name: 'Bluebird Studio', terms: 'net15', preferredCurrency: 'INR' },
    { id: 'cl_st', name: 'Sunrise Textiles', terms: 'net15', preferredCurrency: 'INR' },
    { id: 'cl_ph', name: 'Patel Hardware', terms: 'net15', preferredCurrency: 'INR' }
  ];
  const items = [
    { id: 'it_co', name: 'Consulting', type: 'service', rate: 2500 },
    { id: 'it_dw', name: 'Design work', type: 'service', rate: 1800 },
    { id: 'it_wm', name: 'Website maintenance', type: 'service', rate: 12000 },
    { id: 'it_ho', name: 'Hosting (annual)', type: 'product', rate: 6000 },
    { id: 'it_ld', name: 'Logo design', type: 'service', rate: 15000 }
  ];
  const invoices = [
    inv('INV-2026-042', 'cl_ac', 'Acme Traders', '2026-09-02', 88500, [{ id: 'p1', amount: 44250, date: '2026-09-02', method: 'upi' }]),
    inv('INV-2026-041', 'cl_ns', 'Northstar Supplies', '2026-08-31', 124000, []),
    inv('INV-2026-040', 'cl_bs', 'Bluebird Studio', '2026-08-29', 36900, [{ id: 'p2', amount: 36900, date: '2026-08-30', method: 'upi' }]),
    inv('INV-2026-039', 'cl_mf', 'Meridian Foods', '2026-08-27', 52300, [], 'draft'),
    inv('INV-2026-038', 'cl_st', 'Sunrise Textiles', '2026-08-24', 71600, [{ id: 'p3', amount: 71600, date: '2026-08-26', method: 'bank' }]),
    inv('INV-2026-037', 'cl_ph', 'Patel Hardware', '2026-08-21', 18900, [])
  ];
  return { settings, clients, items, invoices };
}
function inv(number, clientId, clientName, date, total, payments, status) {
  const due = new Date(date); due.setDate(due.getDate() + 15);
  return {
    number, clientId, client: { name: clientName }, currency: 'INR', date,
    dueDate: due.toISOString().slice(0, 10),
    lines: [{ name: 'Services', qty: 1, rate: total }],
    taxMode: 'invoice', tax: { type: 'pct', value: 0 }, discount: { type: 'amount', value: 0 },
    subtotal: total, taxAmount: 0, discountAmount: 0, total,
    payments: payments || [], status: status || 'final'
  };
}

// ---------- init / hydrate ----------
export async function init() {
  await db.open();
  const seeded = await db.getMeta('seeded');
  if (!seeded) {
    const s = seed();
    await db.put('settings', { key: 'app', data: s.settings });
    await db.bulkPut('clients', s.clients);
    await db.bulkPut('items', s.items);
    await db.bulkPut('invoices', s.invoices);
    await db.setMeta('seeded', true);
  }
  state.settings = (await db.get('settings', 'app'))?.data || seed().settings;
  state.clients = await db.getAll('clients');
  state.items = await db.getAll('items');
  state.invoices = await db.getAll('invoices');
}

// ---------- pub/sub ----------
const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { subs.forEach((fn) => fn(state)); }

// ---------- reads (synchronous, from cache) ----------
export function get() { return state; }
export const settings = () => state.settings;
export const clients = () => state.clients;
export const items = () => state.items;
export const invoices = () => state.invoices;
export const clientById = (id) => state.clients.find((c) => c.id === id);
export const invoiceByNumber = (no) => state.invoices.find((i) => i.number === no);

// ---------- writes (cache + persist; Phase 3 also enqueues to outbox) ----------
function replace(list, key, val) { const i = list.findIndex((x) => x[key] === val[key]); i >= 0 ? list[i] = val : list.push(val); }

export function upsertClient(c) { replace(state.clients, 'id', c); emit(); db.put('clients', c); }
export function upsertItem(it) { replace(state.items, 'id', it); emit(); db.put('items', it); }
export function upsertInvoice(v) { replace(state.invoices, 'number', v); emit(); db.put('invoices', v); }
export function saveSettings(s) { state.settings = s; emit(); db.put('settings', { key: 'app', data: s }); }
export function removeInvoice(no) { state.invoices = state.invoices.filter((i) => i.number !== no); emit(); db.del('invoices', no); }
export function removeItem(id) { state.items = state.items.filter((x) => x.id !== id); emit(); db.del('items', id); }
export function removeClient(id) { state.clients = state.clients.filter((x) => x.id !== id); emit(); db.del('clients', id); }
