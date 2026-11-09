import * as store from '../lib/store.js';
import { computeTotals, nextInvoiceNumber } from '../lib/domain.js';
import { money, esc } from '../lib/format.js';

const TERMS_DAYS = { net15: 15, net30: 30, net45: 45, 'due-on-receipt': 0 };
let draft, rootRef, lineIdx = -1;

export function render(root, hash) {
  rootRef = root;
  const parts = hash.split('/');
  const editing = parts[2] !== 'new';
  const s = store.settings().invoicing;

  if (editing) {
    const inv = store.invoiceByNumber(decodeURIComponent(parts[2]));
    draft = JSON.parse(JSON.stringify(inv));
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(); due.setDate(due.getDate() + (TERMS_DAYS[s.paymentTerms] ?? 15));
    draft = {
      number: nextInvoiceNumber(store.invoices(), store.settings()), clientId: store.clients()[0]?.id,
      client: { name: store.clients()[0]?.name }, currency: s.defaultCurrency || 'INR',
      date: today, dueDate: due.toISOString().slice(0, 10), lines: [],
      taxMode: s.taxMode, tax: { ...s.defaultTax }, discount: { ...s.defaultDiscount }, notes: '', status: 'draft'
    };
  }
  paint();
}

function paint() {
  const s = store.settings().invoicing;
  const itemMode = draft.taxMode === 'item';
  rootRef.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${draft.status === 'draft' ? 'Draft' : 'Edit'}</div><h1>${esc(draft.number)}</h1></div>
      <div class="desktop-actions"><a class="btn btn-ghost" href="#/invoices">Cancel</a><button class="btn btn-primary" id="save"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12l5 5 9-11"/></svg> Save invoice</button></div>
    </div>
    <div class="editor-grid">
      <div>
        <div class="card card-pad">
          <label class="field"><span class="lab">Client</span>
            <select class="input" id="client">${store.clients().map((c) => `<option value="${c.id}" ${c.id === draft.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__new">+ New client…</option></select>
          </label>
          <div class="grid-2">
            <label class="field"><span class="lab">Invoice no.</span><input class="input num" id="number" value="${esc(draft.number)}" /></label>
            <label class="field"><span class="lab">Currency</span><select class="input" id="currency">${['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => `<option ${c === draft.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          </div>
          <div class="grid-2">
            <label class="field"><span class="lab">Invoice date</span><input class="input" type="date" id="date" value="${draft.date}" /></label>
            <label class="field"><span class="lab">Due date</span><input class="input" type="date" id="due" value="${draft.dueDate}" /></label>
          </div>
        </div>

        <div class="card card-pad" style="margin-top:14px">
          <div class="section-head" style="margin-bottom:10px"><h2>Items</h2><span class="period-note">${draft.lines.length} ${draft.lines.length === 1 ? 'line' : 'lines'}</span></div>
          <ul class="ledger" id="lineList" style="margin:0 -18px">${lineRows(itemMode)}</ul>
          <button class="btn btn-primary" id="addline" style="width:100%;justify-content:center;margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg> Add item</button>
        </div>

        <div class="card card-pad" style="margin-top:14px"><label class="field" style="margin:0"><span class="lab">Notes / terms</span><textarea class="input" id="notes">${esc(draft.notes || '')}</textarea></label></div>
      </div>

      <div class="aside">
        <div class="card card-pad"><div class="totals">
          <div class="row"><span class="k">Subtotal</span><span class="v num" id="t-subtotal">${money(0, draft.currency)}</span></div>
          <div class="row"><span style="display:flex;align-items:center;gap:7px"><span class="k">Discount</span>${unit('disc', draft.discount.type)}<input class="miniinput" id="disc-val" value="${draft.discount.value}" /></span><span class="v num" id="disc-amt" style="color:var(--ink-3)">${money(0, draft.currency)}</span></div>
          <div class="row"><span style="display:flex;align-items:center;gap:7px"><span class="k" id="t-taxlabel">${esc(s.taxLabel)}</span>${itemMode ? '' : unit('tax', draft.tax.type) + `<input class="miniinput" id="tax-val" value="${draft.tax.value}" />`}</span><span class="v num" id="t-tax">${money(0, draft.currency)}</span></div>
          <div class="row grand"><span class="k">Total</span><span class="v num" id="t-total">${money(0, draft.currency)}</span></div>
        </div></div>
      </div>
    </div>
    ${lineDrawer(itemMode, s.taxLabel)}`;

  rootRef.querySelector('#save').addEventListener('click', save);
  rootRef.querySelector('#addline').addEventListener('click', () => openLine('new'));
  rootRef.querySelector('#lineList').addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) openLine('edit', +li.dataset.i); });
  rootRef.querySelector('#client').addEventListener('change', (e) => {
    if (e.target.value === '__new') { e.target.value = draft.clientId; window.openDrawer('drawer-newclient'); return; }
    draft.clientId = e.target.value; draft.client = { name: store.clientById(e.target.value)?.name };
  });
  rootRef.querySelector('#currency').addEventListener('change', (e) => { draft.currency = e.target.value; paint(); });
  rootRef.querySelector('#number').addEventListener('input', (e) => draft.number = e.target.value);
  rootRef.querySelector('#date').addEventListener('change', (e) => {
    draft.date = e.target.value;
    const d = new Date(e.target.value); d.setDate(d.getDate() + (TERMS_DAYS[store.settings().invoicing.paymentTerms] ?? 15));
    draft.dueDate = d.toISOString().slice(0, 10); rootRef.querySelector('#due').value = draft.dueDate;
  });
  rootRef.querySelector('#due').addEventListener('change', (e) => draft.dueDate = e.target.value);
  rootRef.querySelector('#notes').addEventListener('input', (e) => draft.notes = e.target.value);
  rootRef.querySelector('#disc-val').addEventListener('input', (e) => { draft.discount.value = +e.target.value || 0; renderTotals(); });
  bindUnit('disc', (t) => { draft.discount.type = t; });
  if (!itemMode) {
    rootRef.querySelector('#tax-val').addEventListener('input', (e) => { draft.tax.value = +e.target.value || 0; renderTotals(); });
    bindUnit('tax', (t) => { draft.tax.type = t; });
  }
  rootRef.querySelector('#ln-save').addEventListener('click', saveLine);
  rootRef.querySelector('#ln-del').addEventListener('click', delLine);
  const nameSel = rootRef.querySelector('#ln-name');
  nameSel.addEventListener('change', () => { const it = store.items().find((x) => x.name === nameSel.value); if (it) { rootRef.querySelector('#ln-rate').value = it.rate; updateLineAmt(); } });
  ['ln-qty', 'ln-rate'].forEach((id) => rootRef.querySelector('#' + id).addEventListener('input', updateLineAmt));
  renderTotals();
}

function unit(pfx, type) {
  return `<span class="unit-toggle" data-unit="${pfx}"><button data-u="amt" class="${type !== 'pct' ? 'on' : ''}">${pfx === 'disc' ? '₹' : '₹'}</button><button data-u="pct" class="${type === 'pct' ? 'on' : ''}">%</button></span>`;
}
function bindUnit(pfx, set) {
  const wrap = rootRef.querySelector(`.unit-toggle[data-unit="${pfx}"]`); if (!wrap) return;
  wrap.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; set(b.dataset.u === 'pct' ? 'pct' : 'amount'); wrap.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); renderTotals(); });
}

function lineRows(itemMode) {
  if (!draft.lines.length) return '<li style="cursor:default"><div class="meta" style="padding:6px 0">No items yet — add your first line.</div></li>';
  return draft.lines.map((l, i) => {
    const sub = itemMode ? `${l.qty} × ${money(l.rate, draft.currency)} · ${l.tax || 0}%` : `${l.qty} × ${money(l.rate, draft.currency)}`;
    return `<li data-i="${i}" style="cursor:pointer"><div><div class="who">${esc(l.name || 'Untitled')}</div><div class="meta num">${sub}</div></div><div class="amt num">${money((l.qty || 0) * (l.rate || 0), draft.currency)}</div></li>`;
  }).join('');
}

function renderTotals() {
  const t = computeTotals(draft);
  rootRef.querySelector('#t-subtotal').innerHTML = money(t.subtotal, draft.currency);
  rootRef.querySelector('#disc-amt').innerHTML = '− ' + money(t.discountAmount, draft.currency);
  rootRef.querySelector('#t-tax').innerHTML = money(t.taxAmount, draft.currency);
  rootRef.querySelector('#t-total').innerHTML = money(t.total, draft.currency);
}

function lineDrawer(itemMode, taxLabel) {
  return `<aside class="drawer" id="drawer-line" role="dialog" aria-label="Line item">
    <div class="drawer-head"><div><h3 id="ln-h">Add item</h3><div class="sub">Line on this invoice</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body">
      <label class="field"><span class="lab">Item</span><select class="input" id="ln-name"><option value="">Select an item</option>${store.items().map((it) => `<option>${esc(it.name)}</option>`).join('')}</select></label>
      <div class="grid-2"><label class="field"><span class="lab">Quantity</span><input class="input num" id="ln-qty" value="1" /></label><label class="field"><span class="lab">Rate</span><input class="input num" id="ln-rate" value="" /></label></div>
      ${itemMode ? `<label class="field"><span class="lab">${esc(taxLabel)} %</span><input class="input num" id="ln-tax" value="0" /></label>` : ''}
      <div class="card card-pad" style="display:flex;justify-content:space-between;align-items:center;background:var(--paper-2)"><span class="period-note">Line amount</span><span class="num" id="ln-amt" style="font-weight:600;font-size:18px">${money(0, draft.currency)}</span></div>
    </div>
    <div class="drawer-foot"><button class="btn btn-ghost" id="ln-del" style="color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Delete</button><button class="btn btn-primary" id="ln-save" style="flex:1;justify-content:center">Add item</button></div>
  </aside>
  <aside class="drawer" id="drawer-newclient" role="dialog" aria-label="Add client">
    <div class="drawer-head"><div><h3>Add client</h3></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body"><label class="field" style="margin:0"><span class="lab">Business / party name</span><input class="input" id="nc-name" placeholder="e.g. Acme Traders" /></label></div>
    <div class="drawer-foot"><button class="btn btn-ghost" onclick="closeDrawer()">Cancel</button><button class="btn btn-primary" id="nc-save" style="flex:1;justify-content:center">Add client</button></div>
  </aside>`;
}

function updateLineAmt() {
  const q = +rootRef.querySelector('#ln-qty').value || 0, r = +rootRef.querySelector('#ln-rate').value || 0;
  rootRef.querySelector('#ln-amt').innerHTML = money(q * r, draft.currency);
}
function openLine(mode, i) {
  lineIdx = mode === 'edit' ? i : -1;
  const editing = lineIdx >= 0, l = editing ? draft.lines[i] : { name: '', qty: 1, rate: '', tax: 0 };
  rootRef.querySelector('#ln-h').textContent = editing ? 'Edit item' : 'Add item';
  rootRef.querySelector('#ln-save').textContent = editing ? 'Save item' : 'Add item';
  rootRef.querySelector('#ln-del').style.display = editing ? '' : 'none';
  rootRef.querySelector('#ln-name').value = l.name;
  rootRef.querySelector('#ln-qty').value = l.qty;
  rootRef.querySelector('#ln-rate').value = l.rate;
  if (rootRef.querySelector('#ln-tax')) rootRef.querySelector('#ln-tax').value = l.tax || 0;
  updateLineAmt();
  window.openDrawer('drawer-line');
}
function saveLine() {
  const l = { name: rootRef.querySelector('#ln-name').value.trim(), qty: +rootRef.querySelector('#ln-qty').value || 0, rate: +rootRef.querySelector('#ln-rate').value || 0 };
  if (rootRef.querySelector('#ln-tax')) l.tax = +rootRef.querySelector('#ln-tax').value || 0;
  if (lineIdx >= 0) draft.lines[lineIdx] = l; else draft.lines.push(l);
  window.closeDrawer(); paint();
}
function delLine() { if (lineIdx >= 0) draft.lines.splice(lineIdx, 1); window.closeDrawer(); paint(); }

function save() {
  const t = computeTotals(draft);
  Object.assign(draft, t);
  if (draft.status === 'draft') draft.status = 'final';
  store.upsertInvoice(draft);
  location.hash = '#/invoice/' + encodeURIComponent(draft.number);
}

// wire the tiny add-client drawer's save once per paint via delegation
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'nc-save') {
    const name = document.getElementById('nc-name').value.trim(); if (!name) { window.closeDrawer(); return; }
    const c = { id: 'cl_' + Date.now(), name, terms: 'net15', preferredCurrency: draft.currency };
    store.upsertClient(c); draft.clientId = c.id; draft.client = { name };
    window.closeDrawer(); paint();
  }
});
