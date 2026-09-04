import * as store from '../lib/store.js';
import { money, esc, fmtDate, invoiceStatus } from '../lib/format.js';

const CHIP = { paid: 'paid', partial: 'partial', unpaid: 'due', overdue: 'over', draft: 'draft', cancelled: 'draft' };
const paidOf = (i) => (i.payments || []).reduce((s, p) => s + (+p.amount || 0), 0);

export function render(root) {
  const invoices = store.invoices().filter((i) => i.status !== 'draft' && i.status !== 'cancelled');
  const invoiced = invoices.reduce((s, i) => s + i.total, 0);
  const collected = invoices.reduce((s, i) => s + paidOf(i), 0);
  const outstanding = invoiced - collected;
  const overdue = invoices.filter((i) => invoiceStatus(i) === 'overdue').reduce((s, i) => s + (i.total - paidOf(i)), 0);

  const recent = [...store.invoices()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  root.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Overview</div><h1>Dashboard</h1></div>
      <div class="desktop-actions"><a class="btn btn-primary" href="#/invoice/new"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg> New invoice</a></div>
    </div>
    <section class="kpis compact">
      <div class="card kpi feature" style="grid-column:auto"><div class="label">Invoiced</div><div class="value num">${money(invoiced)}</div></div>
      <div class="card kpi"><div class="label"><span class="dot" style="background:var(--due)"></span> Outstanding</div><div class="value num">${money(outstanding)}</div></div>
      <div class="card kpi"><div class="label"><span class="dot" style="background:var(--over)"></span> Overdue</div><div class="value num">${money(overdue)}</div></div>
      <div class="card kpi"><div class="label"><span class="dot" style="background:var(--paid)"></span> Collected</div><div class="value num">${money(collected)}</div></div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Recent invoices</h2><a href="#/invoices">View all →</a></div>
      <div class="card"><ul class="ledger">${recent.map(row).join('')}</ul></div>
    </section>`;
}

function row(i) {
  const st = invoiceStatus(i);
  const bal = i.total - paidOf(i);
  return `<li><a href="#/invoice/${encodeURIComponent(i.number)}" style="display:contents">
    <div><div class="who">${esc(i.client.name)}</div><div class="meta">${esc(i.number)} · ${fmtDate(i.date)}</div></div>
    <div class="amt num">${money(i.total, i.currency)}</div>
    <div class="chip-wrap"><span class="chip ${CHIP[st]}">${st}</span></div></a></li>`;
}
