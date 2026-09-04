import * as store from '../lib/store.js';
import { money, esc, dayMon, invoiceStatus } from '../lib/format.js';

const CHIP = { paid: 'paid', partial: 'partial', unpaid: 'due', overdue: 'over', draft: 'draft', cancelled: 'draft' };
const paidOf = (i) => (i.payments || []).reduce((s, p) => s + (+p.amount || 0), 0);

export function render(root) {
  const list = [...store.invoices()].sort((a, b) => b.date.localeCompare(a.date));
  root.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${list.length} invoices</div><h1>Invoices</h1></div>
      <div class="desktop-actions"><a class="btn btn-primary" href="#/invoice/new"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg> New invoice</a></div>
    </div>
    <div class="card" style="overflow:hidden">
      <div class="lhead inv"><span>Client · Invoice</span><span class="r">Amount</span></div>
      <ul class="ledger table inv">${list.map(row).join('') || empty()}</ul>
    </div>`;
}

function row(i) {
  const st = invoiceStatus(i);
  const { day, mon } = dayMon(i.date);
  const bal = i.total - paidOf(i);
  const due = bal > 0 ? `<div class="meta" style="color:${st === 'overdue' ? 'var(--over)' : 'var(--due)'};font-weight:600">${money(bal, i.currency)} due</div>` : '';
  return `<li>
    <a href="#/invoice/${encodeURIComponent(i.number)}" style="display:contents">
      <div class="dateblock s-${CHIP[st]}"><b>${day}</b><span>${mon}</span></div>
      <div><div class="who">${esc(i.client.name)}</div><div class="meta">${esc(i.number)}</div></div>
      <div class="amt" style="align-self:center"><div class="num">${money(i.total, i.currency)}</div>${due}</div>
      <div class="statusbar s-${CHIP[st]}"><b>${st}</b></div>
    </a></li>`;
}

function empty() {
  return `<li style="display:block;padding:0;cursor:default"><div class="empty"><div class="em"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 3h10l3 3v15H4V6z"/></svg></div><h3>No invoices yet</h3><p>Create your first invoice to see it here.</p></div></li>`;
}
