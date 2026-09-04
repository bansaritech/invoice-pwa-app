import * as store from '../lib/store.js';
import { balanceOf } from '../lib/domain.js';
import { money, esc, invoiceStatus } from '../lib/format.js';

const initials = (n) => (n || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function render(root) {
  const rows = store.clients().map((c) => {
    const invs = store.invoices().filter((i) => i.clientId === c.id && i.status !== 'draft' && i.status !== 'cancelled');
    const outstanding = invs.reduce((s, i) => s + balanceOf(i), 0);
    const overdue = invs.some((i) => invoiceStatus(i) === 'overdue');
    const sc = outstanding <= 0 ? 'paid' : overdue ? 'over' : 'due';
    const label = outstanding <= 0 ? 'Settled' : overdue ? 'Overdue' : 'Owing';
    return { c, count: invs.length, outstanding, sc, label };
  });
  const receivable = rows.reduce((s, r) => s + r.outstanding, 0);

  root.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${store.clients().length} clients</div><h1>Clients</h1></div></div>
    <div class="kpis compact" style="grid-template-columns:repeat(2,1fr)">
      <div class="card kpi"><div class="label">Total receivable</div><div class="value num">${money(receivable)}</div></div>
      <div class="card kpi"><div class="label">Clients with dues</div><div class="value num">${rows.filter((r) => r.outstanding > 0).length}</div></div>
    </div>
    <div class="card striped" style="overflow:hidden;margin-top:6px"><ul class="clients striped">${rows.map(row).join('')}</ul></div>`;
}

function row({ c, count, outstanding, sc, label }) {
  return `<li><a href="#/client/${encodeURIComponent(c.id)}" style="display:contents">
    <span class="ini s-${sc}">${initials(c.name)}</span>
    <span class="grow"><span class="nm">${esc(c.name)}</span><span class="sub">${count} ${count === 1 ? 'invoice' : 'invoices'}</span></span>
    <span class="bal num" style="color:${outstanding > 0 ? (sc === 'over' ? 'var(--over)' : 'var(--due)') : 'var(--ink-3)'}">${money(outstanding)}</span>
    <div class="statusbar s-${sc}"><b>${label}</b></div></a></li>`;
}
