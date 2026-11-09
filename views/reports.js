import * as store from '../lib/store.js';
import { stats, aging, revenueByFy, topClients } from '../lib/domain.js';
import { money, esc, fyOf } from '../lib/format.js';

const initials = (n) => (n || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function render(root) {
  const invs = store.invoices();
  const fyStart = store.settings().invoicing.fyStartMonth || 4;
  const fy = fyOf(new Date(), fyStart);
  const s = stats(invs);
  const rev = revenueByFy(invs, fy.start, fyStart);
  const max = Math.max(...rev.map((m) => m.total), 1);
  const ag = aging(invs);
  const agMax = Math.max(ag.d0 + ag.d30 + ag.d60, 1);
  const top = topClients(invs, 3);

  root.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">FY ${esc(fy.label)}</div><h1>Reports</h1></div></div>
    <section class="kpis compact">
      <div class="card kpi feature" style="grid-column:auto"><div class="label">Invoiced</div><div class="value num">${money(s.invoiced)}</div></div>
      <div class="card kpi"><div class="label"><span class="dot" style="background:var(--paid)"></span> Collected</div><div class="value num">${money(s.collected)}</div></div>
      <div class="card kpi"><div class="label"><span class="dot" style="background:var(--due)"></span> Outstanding</div><div class="value num">${money(s.outstanding)}</div></div>
      <div class="card kpi"><div class="label"><span class="dot" style="background:var(--over)"></span> Overdue</div><div class="value num">${money(s.overdue)}</div></div>
    </section>
    <div class="split">
      <div>
        <section class="section" style="margin-top:20px">
          <div class="section-head"><h2>Revenue by month</h2><span class="period-note">FY ${esc(fy.label)}</span></div>
          <div class="card card-pad"><div class="chart year">${rev.map((m) => `<div class="bar"><div class="col" style="height:100%"><span class="${m.total ? '' : 'empty'}" style="height:${Math.max(m.total / max * 100, m.total ? 6 : 3)}%"></span></div><div class="m">${m.label}</div></div>`).join('')}</div></div>
        </section>
      </div>
      <div>
        <section class="section" style="margin-top:20px">
          <div class="section-head"><h2>Outstanding aging</h2></div>
          <div class="card card-pad"><div class="aging">
            ${agBar('0–30 days', ag.d0, agMax, 'var(--c-green)')}
            ${agBar('31–60 days', ag.d30, agMax, 'var(--due)')}
            ${agBar('60+ days', ag.d60, agMax, 'var(--over)')}
          </div></div>
        </section>
        <section class="section">
          <div class="section-head"><h2>Top clients</h2><a href="#/clients">All →</a></div>
          <div class="card"><ul class="clients">${top.map((c) => `<li><span class="ini">${initials(c.name)}</span><span class="grow"><span class="nm">${esc(c.name)}</span></span><span class="bal num">${money(c.invoiced)}</span></li>`).join('') || '<li style="cursor:default"><div class="meta" style="padding:12px 16px">No data yet.</div></li>'}</ul></div>
        </section>
      </div>
    </div>`;
}

function agBar(label, val, max, color) {
  return `<div class="r"><div class="rt"><span>${label}</span><span class="num">${money(val)}</span></div><div class="track"><div class="fill" style="width:${val / max * 100}%;background:${color}"></div></div></div>`;
}
