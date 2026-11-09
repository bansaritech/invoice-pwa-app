import * as store from '../lib/store.js';
import { money, esc, dayMon } from '../lib/format.js';

const MCLASS = { upi: 'paid', bank: 'partial', cash: 'due', cheque: 'draft', card: 'over' };
const MLABEL = { upi: 'UPI', bank: 'Bank', cash: 'Cash', cheque: 'Cheque', card: 'Card' };

export function render(root) {
  const rows = [];
  store.invoices().forEach((inv) => (inv.payments || []).forEach((p) => rows.push({ p, inv })));
  rows.sort((a, b) => (b.p.date || '').localeCompare(a.p.date || ''));
  const total = rows.reduce((s, r) => s + (+r.p.amount || 0), 0);

  root.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${rows.length} ${rows.length === 1 ? 'payment' : 'payments'}</div><h1>Payments</h1></div></div>
    <div class="kpis compact" style="grid-template-columns:repeat(2,1fr)">
      <div class="card kpi feature" style="grid-column:auto"><div class="label">Collected</div><div class="value num">${money(total)}</div></div>
      <div class="card kpi"><div class="label">Payments</div><div class="value num">${rows.length}</div></div>
    </div>
    <div class="card" style="overflow:hidden;margin-top:6px">
      <div class="lhead inv"><span>Client · Invoice</span><span class="r">Amount</span></div>
      <ul class="ledger table inv">${rows.map(row).join('') || empty()}</ul>
    </div>`;
}

function row({ p, inv }) {
  const cls = MCLASS[p.method] || 'draft';
  const { day, mon } = dayMon(p.date);
  return `<li>
    <a href="#/invoice/${encodeURIComponent(inv.number)}" style="display:contents">
      <div class="dateblock s-${cls}"><b>${day}</b><span>${mon}</span></div>
      <div><div class="who">${esc(inv.client?.name || '')}</div><div class="meta">${esc(inv.number)}</div></div>
      <div class="amt num" style="align-self:center">${money(p.amount, inv.currency)}</div>
      <div class="statusbar s-${cls}"><b>${MLABEL[p.method] || p.method}</b></div>
    </a></li>`;
}
function empty() { return `<li style="display:block;padding:0;cursor:default"><div class="empty"><div class="em"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7h18v12H3zM3 11h18"/></svg></div><h3>No payments yet</h3><p>Record a payment from an invoice.</p></div></li>`; }
