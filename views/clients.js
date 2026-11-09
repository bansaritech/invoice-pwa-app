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
    <div class="page-head"><div><div class="eyebrow">${store.clients().length} clients</div><h1>Clients</h1></div>
      <div class="page-actions"><button class="btn btn-primary" id="add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5v15m7.5-7.5h-15"/></svg> Add client</button></div>
    </div>
    <div class="kpis compact" style="grid-template-columns:repeat(2,1fr)">
      <div class="card kpi"><div class="label">Total receivable</div><div class="value num">${money(receivable)}</div></div>
      <div class="card kpi"><div class="label">Clients with dues</div><div class="value num">${rows.filter((r) => r.outstanding > 0).length}</div></div>
    </div>
    <div class="card striped" style="overflow:hidden;margin-top:6px"><ul class="clients striped">${rows.map(row).join('') || '<li style="padding:14px 16px;color:var(--ink-3)">No clients yet — add your first.</li>'}</ul></div>
    ${drawer()}`;

  root.querySelector('#add').addEventListener('click', () => {
    ['ac-name', 'ac-gstin', 'ac-phone', 'ac-email'].forEach((id) => { root.querySelector('#' + id).value = ''; });
    window.openDrawer('drawer-addclient');
  });
  root.querySelector('#ac-save').addEventListener('click', () => {
    const name = root.querySelector('#ac-name').value.trim();
    if (!name) { window.closeDrawer(); return; }
    store.upsertClient({
      id: 'cl_' + Date.now(), name,
      gstin: root.querySelector('#ac-gstin').value.trim(),
      phone: root.querySelector('#ac-phone').value.trim(),
      email: root.querySelector('#ac-email').value.trim(),
      terms: 'net15', preferredCurrency: 'INR'
    });
    window.closeDrawer();
  });
}

function drawer() {
  return `<aside class="drawer" id="drawer-addclient" role="dialog" aria-label="Add client">
    <div class="drawer-head"><div><h3>Add client</h3></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body">
      <label class="field"><span class="lab">Business / party name</span><input class="input" id="ac-name" placeholder="e.g. Acme Traders" /></label>
      <label class="field"><span class="lab">GSTIN</span><input class="input num" id="ac-gstin" placeholder="Optional" /></label>
      <div class="grid-2"><label class="field"><span class="lab">Phone</span><input class="input num" id="ac-phone" /></label><label class="field"><span class="lab">Email</span><input class="input" id="ac-email" /></label></div>
    </div>
    <div class="drawer-foot"><button class="btn btn-ghost" onclick="closeDrawer()">Cancel</button><button class="btn btn-primary" id="ac-save" style="flex:1;justify-content:center">Add client</button></div>
  </aside>`;
}

function row({ c, count, outstanding, sc, label }) {
  return `<li><a href="#/client/${encodeURIComponent(c.id)}" style="display:contents">
    <span class="ini s-${sc}">${initials(c.name)}</span>
    <span class="grow"><span class="nm">${esc(c.name)}</span><span class="sub">${count} ${count === 1 ? 'invoice' : 'invoices'}</span></span>
    <span class="bal num" style="color:${outstanding > 0 ? (sc === 'over' ? 'var(--over)' : 'var(--due)') : 'var(--ink-3)'}">${money(outstanding)}</span>
    <div class="statusbar s-${sc}"><b>${label}</b></div></a></li>`;
}
