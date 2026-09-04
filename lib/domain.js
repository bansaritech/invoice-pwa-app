// Pure domain calculations (no DOM, no store) — easy to reason about and test.
import { fyOf, formatNumber, invoiceStatus, monthKey } from './format.js';

const round2 = (n) => Math.round((+n || 0) * 100) / 100;
const isActive = (i) => i.status !== 'draft' && i.status !== 'cancelled';

export const paidOf = (inv) => round2((inv.payments || []).reduce((s, p) => s + (+p.amount || 0), 0));
export const balanceOf = (inv) => round2((+inv.total || 0) - paidOf(inv));

// Totals for an invoice draft: handles per-item vs invoice-level tax and %/amount discount.
export function computeTotals(inv) {
  const subtotal = (inv.lines || []).reduce((s, l) => s + (+l.qty || 0) * (+l.rate || 0), 0);
  const disc = inv.discount || { type: 'amount', value: 0 };
  let discountAmount = disc.type === 'pct' ? subtotal * (+disc.value || 0) / 100 : (+disc.value || 0);
  discountAmount = Math.min(discountAmount, subtotal);
  const base = subtotal - discountAmount;

  let taxAmount;
  if (inv.taxMode === 'item') {
    taxAmount = (inv.lines || []).reduce((s, l) => s + (+l.qty || 0) * (+l.rate || 0) * (+l.tax || 0) / 100, 0);
  } else {
    const t = inv.tax || { type: 'pct', value: 0 };
    taxAmount = t.type === 'pct' ? base * (+t.value || 0) / 100 : (+t.value || 0);
  }
  return { subtotal: round2(subtotal), discountAmount: round2(discountAmount), taxAmount: round2(taxAmount), total: round2(base + taxAmount) };
}

// Next number from the settings template; sequence resets each FY (max trailing seq + 1).
export function nextInvoiceNumber(invoices, settings, date = new Date()) {
  const fyStart = settings.invoicing.fyStartMonth || 4;
  const fy = fyOf(date, fyStart).start;
  const seqs = invoices
    .filter((i) => i.date && fyOf(i.date, fyStart).start === fy)
    .map((i) => { const m = /(\d+)(?!.*\d)/.exec(i.number || ''); return m ? +m[1] : 0; });
  const seq = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return formatNumber(settings.invoicing.numberFormat, date, seq, fyStart);
}

// Aggregate stats over a set of invoices (optionally pre-filtered by the caller).
export function stats(invoices, today = new Date()) {
  const active = invoices.filter(isActive);
  const invoiced = round2(active.reduce((s, i) => s + (+i.total || 0), 0));
  const collected = round2(active.reduce((s, i) => s + paidOf(i), 0));
  const overdue = round2(active.filter((i) => invoiceStatus(i, today) === 'overdue').reduce((s, i) => s + balanceOf(i), 0));
  return { invoiced, collected, outstanding: round2(invoiced - collected), overdue, count: active.length };
}

// Per-client balances (opening not included here; add rolling balances in the sync phase).
export function partyBalances(invoices) {
  const map = {};
  invoices.filter(isActive).forEach((i) => {
    const k = i.client?.name || i.clientId;
    const b = (map[k] = map[k] || { name: k, invoiced: 0, paid: 0 });
    b.invoiced += (+i.total || 0);
    b.paid += paidOf(i);
  });
  return Object.values(map).map((x) => ({ ...x, invoiced: round2(x.invoiced), paid: round2(x.paid), outstanding: round2(x.invoiced - x.paid) }));
}

// Outstanding aging buckets by days past due.
export function aging(invoices, today = new Date()) {
  const b = { d0: 0, d30: 0, d60: 0 };
  invoices.filter(isActive).forEach((i) => {
    const bal = balanceOf(i);
    if (bal <= 0 || !i.dueDate) return;
    const days = Math.floor((today - new Date(i.dueDate)) / 86400000);
    if (days <= 30) b.d0 += bal; else if (days <= 60) b.d30 += bal; else b.d60 += bal;
  });
  return { d0: round2(b.d0), d30: round2(b.d30), d60: round2(b.d60) };
}

// Revenue by month for a financial year: array of { key, label, total }.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function revenueByFy(invoices, fyStartYear, fyStart = 4) {
  const months = [];
  for (let n = 0; n < 12; n++) {
    const m = (fyStart - 1 + n) % 12;
    const y = fyStartYear + (fyStart - 1 + n >= 12 ? 1 : 0);
    months.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, label: MON[m], total: 0 });
  }
  const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  invoices.filter(isActive).forEach((i) => { const k = monthKey(i.date); if (k in idx) months[idx[k]].total = round2(months[idx[k]].total + (+i.total || 0)); });
  return months;
}

export function topClients(invoices, limit = 5) {
  return partyBalances(invoices).sort((a, b) => b.invoiced - a.invoiced).slice(0, limit);
}
