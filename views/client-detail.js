import * as store from '../lib/store.js';
import { paidOf, balanceOf, aging } from '../lib/domain.js';
import { money, esc, fmtDate, invoiceStatus } from '../lib/format.js';

const initials = (n) => (n || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const CHIP = { paid: 'paid', partial: 'partial', unpaid: 'due', overdue: 'over', draft: 'draft', cancelled: 'draft' };
let current;

export function render(root, hash) {
  const id = decodeURIComponent(hash.split('/').pop());
  const c = store.clientById(id);
  if (!c) { root.innerHTML = '<div class="page-head"><h1>Client not found</h1></div>'; return; }
  current = c;
  const invs = store.invoices().filter((i) => i.clientId === id && i.status !== 'cancelled');
  const active = invs.filter((i) => i.status !== 'draft');
  const outstanding = active.reduce((s, i) => s + balanceOf(i), 0);
  const lifetime = active.reduce((s, i) => s + i.total, 0);
  const ag = aging(active);
  const agMax = Math.max(ag.d0 + ag.d30 + ag.d60, 1);

  const statement = [...active].sort((a, b) => a.date.localeCompare(b.date));

  root.innerHTML = `
    <a href="#/clients" class="eyebrow" style="display:inline-block;color:var(--accent);font-weight:600;margin-bottom:8px">← All clients</a>
    <div class="page-head" style="align-items:center">
      <div style="display:flex;align-items:center;gap:14px">
        <span class="ini" style="width:56px;height:56px;border-radius:16px;font-size:20px;background:var(--paper-2);color:var(--accent);display:grid;place-items:center;font-weight:700">${initials(c.name)}</span>
        <div><h1 style="font-size:26px">${esc(c.name)}</h1><div class="period-note">${esc(c.gstin || 'No GSTIN')}</div></div>
      </div>
      <div class="desktop-actions"><button class="btn btn-ghost" id="edit">Edit</button><a class="btn btn-primary" href="#/invoice/new">New invoice</a></div>
    </div>

    <section class="kpis compact" style="grid-template-columns:repeat(2,1fr)">
      <div class="card kpi feature" style="grid-column:auto"><div class="label">Outstanding</div><div class="value num">${money(outstanding)}</div><div class="delta">${active.filter((i) => balanceOf(i) > 0).length} open</div></div>
      <div class="card kpi"><div class="label">Lifetime billed</div><div class="value num">${money(lifetime)}</div></div>
      <div class="card kpi"><div class="label">Invoices</div><div class="value num">${active.length}</div></div>
      <div class="card kpi"><div class="label">Terms</div><div class="value num" style="font-size:18px">${esc(c.terms || '—')}</div></div>
    </section>

    <div class="split">
      <div>
        <section class="section" style="margin-top:20px">
          <div class="section-head"><h2>Statement</h2></div>
          <div class="card"><ul class="ledger">${statement.map(stRow).join('') || emptyRow()}</ul></div>
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
          <div class="section-head"><h2>Contact</h2></div>
          <div class="card card-pad"><div class="totals">
            <div class="row"><span class="k">Email</span><span>${esc(c.email || '—')}</span></div>
            <div class="row"><span class="k">Phone</span><span class="num">${esc(c.phone || '—')}</span></div>
          </div></div>
        </section>
      </div>
    </div>
    ${editDrawer(c)}`;

  const editBtn = root.querySelector('#edit');
  if (editBtn) editBtn.addEventListener('click', () => window.openDrawer('drawer-editclient'));
  root.querySelector('#ec-save').addEventListener('click', () => {
    const upd = { ...current, name: root.querySelector('#ec-name').value.trim() || current.name, gstin: root.querySelector('#ec-gstin').value.trim(), phone: root.querySelector('#ec-phone').value.trim(), email: root.querySelector('#ec-email').value.trim() };
    window.closeDrawer(); store.upsertClient(upd);
  });
}

function stRow(i) {
  const st = invoiceStatus(i);
  const bal = balanceOf(i);
  return `<li><a href="#/invoice/${encodeURIComponent(i.number)}" style="display:contents"><div><div class="who">${esc(i.number)}</div><div class="meta">${fmtDate(i.date)} · paid ${money(paidOf(i), i.currency)}</div></div><div class="amt num">${money(i.total, i.currency)}</div><div class="chip-wrap"><span class="chip ${CHIP[st]}">${bal > 0 ? money(bal, i.currency) + ' due' : st}</span></div></a></li>`;
}
function agBar(label, val, max, color) {
  return `<div class="r"><div class="rt"><span>${label}</span><span class="num">${money(val)}</span></div><div class="track"><div class="fill" style="width:${val / max * 100}%;background:${color}"></div></div></div>`;
}
function emptyRow() { return '<li style="cursor:default"><div class="meta" style="padding:14px 16px">No invoices for this client yet.</div></li>'; }

function editDrawer(c) {
  return `<aside class="drawer" id="drawer-editclient" role="dialog"><div class="drawer-head"><div><h3>Edit client</h3><div class="sub">${esc(c.name)}</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body">
      <label class="field"><span class="lab">Business / party name</span><input class="input" id="ec-name" value="${esc(c.name || '')}" /></label>
      <label class="field"><span class="lab">GSTIN</span><input class="input num" id="ec-gstin" value="${esc(c.gstin || '')}" /></label>
      <div class="grid-2"><label class="field"><span class="lab">Phone</span><input class="input num" id="ec-phone" value="${esc(c.phone || '')}" /></label><label class="field"><span class="lab">Email</span><input class="input" id="ec-email" value="${esc(c.email || '')}" /></label></div>
    </div>
    <div class="drawer-foot"><button class="btn btn-ghost" onclick="closeDrawer()">Cancel</button><button class="btn btn-primary" id="ec-save" style="flex:1;justify-content:center">Save changes</button></div>
  </aside>`;
}
