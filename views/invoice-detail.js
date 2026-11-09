import * as store from '../lib/store.js';
import { paidOf, balanceOf } from '../lib/domain.js';
import { money, esc, fmtDate, invoiceStatus } from '../lib/format.js';
import { printInvoice } from '../lib/invoice-template.js';

const CHIP = { paid: 'paid', partial: 'partial', unpaid: 'due', overdue: 'over', draft: 'draft', cancelled: 'draft' };
let current, curBal;

export function render(root, hash) {
  const number = decodeURIComponent(hash.split('/').pop());
  const inv = store.invoiceByNumber(number);
  if (!inv) { root.innerHTML = '<div class="page-head"><h1>Invoice not found</h1></div>'; return; }
  current = inv;
  const st = invoiceStatus(inv);
  const cur = inv.currency || 'INR';
  const bal = balanceOf(inv);
  curBal = bal;
  const biz = store.settings().business;
  const clientName = (inv.client && inv.client.name) || '';
  const clientGstin = (inv.client && inv.client.gstin) || '';

  const lineRows = (inv.lines || []).map((l) => {
    const amt = (l.qty || 0) * (l.rate || 0);
    return '<tr><td>' + esc(l.name) + '</td><td class="r num">' + l.qty + '</td><td class="r num">' + money(l.rate, cur) + '</td><td class="r num">' + money(amt, cur) + '</td></tr>';
  }).join('');

  const discRow = inv.discountAmount
    ? '<div class="row"><span class="k">Discount</span><span class="v num">− ' + money(inv.discountAmount, cur) + '</span></div>'
    : '';

  root.innerHTML = `
    <div class="page-head">
      <div><div class="eyebrow"><a href="#/invoices" style="color:var(--accent)">← Invoices</a></div><h1 style="font-size:28px">${esc(inv.number)}</h1>
        <div class="period-note" style="margin-top:4px"><span class="chip ${CHIP[st]}" style="height:22px">${st}</span></div></div>
      <div class="page-actions"><button class="btn btn-ghost" id="del" style="color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Delete</button><button class="btn btn-ghost" id="print">Print / PDF</button><a class="btn btn-primary" href="#/invoice/${encodeURIComponent(inv.number)}/edit">Edit invoice</a></div>
    </div>
    <div class="split">
      <div>
        <div class="doc">
          <div class="doc-top">
            <div><div class="biz">${esc(biz.name)}</div><div class="muted">${esc(biz.address || '')}<br>GSTIN ${esc(biz.gstin || '')}</div></div>
            <div class="doc-title"><div class="big">INVOICE</div><div class="muted num">${esc(inv.number)}<br>Date · ${fmtDate(inv.date)}<br>Due · ${inv.dueDate ? fmtDate(inv.dueDate) : '—'}</div></div>
          </div>
          <div class="doc-parties">
            <div><div class="lbl">Billed to</div><div style="font-weight:700">${esc(clientName)}</div><div class="muted">${esc(clientGstin)}</div></div>
            <div><div class="lbl">Status</div><div class="muted">${st} · ${money(bal, cur)} balance</div></div>
          </div>
          <table class="doc-table">
            <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
            <tbody>${lineRows}</tbody>
          </table>
          <div class="doc-sum"><div class="totals">
            <div class="row"><span class="k">Subtotal</span><span class="v num">${money(inv.subtotal, cur)}</span></div>
            ${discRow}
            <div class="row"><span class="k">${esc(store.settings().invoicing.taxLabel)}</span><span class="v num">${money(inv.taxAmount, cur)}</span></div>
            <div class="row grand"><span class="k">Total</span><span class="v num">${money(inv.total, cur)}</span></div>
            <div class="row"><span class="k">Paid</span><span class="v num" style="color:var(--paid)">− ${money(paidOf(inv), cur)}</span></div>
            <div class="row"><span class="k" style="color:var(--over)">Balance due</span><span class="v num" style="color:var(--over)">${money(bal, cur)}</span></div>
          </div></div>
        </div>
      </div>
      <div>
        <section class="section" style="margin-top:0">
          <div class="section-head"><h2>Payments</h2><button class="btn btn-ghost" style="height:34px;padding:0 12px;font-size:13px" id="rec">+ Record</button></div>
          <div class="card"><ul class="ledger" id="paylist">${payRows(inv, cur)}</ul></div>
        </section>
      </div>
    </div>
    ${payDrawer(inv, cur, bal)}`;

  root.querySelector('#rec').addEventListener('click', () => openPay('new', null));
  root.querySelector('#print').addEventListener('click', () => printInvoice(current, store.settings()));
  root.querySelector('#del').addEventListener('click', () => {
    if (!confirm(`Delete invoice ${current.number}? This cannot be undone.`)) return;
    location.hash = '#/invoices';
    store.removeInvoice(current.number);
  });
  root.querySelector('#paylist').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    openPay('edit', current.payments.find((x) => x.id === li.dataset.id));
  });
  root.querySelector('#pay-save').addEventListener('click', savePay);
  root.querySelector('#pay-del').addEventListener('click', delPay);
}

function payRows(inv, cur) {
  if (!inv.payments || !inv.payments.length) return '<li style="cursor:default"><div class="meta" style="padding:6px 0">No payments recorded.</div></li>';
  return inv.payments.map((p) =>
    '<li data-id="' + esc(p.id) + '" style="cursor:pointer"><div><div class="who num">' + money(p.amount, cur) + '</div><div class="meta">' + fmtDate(p.date) + ' · ' + esc(p.method) + '</div></div><div class="chip-wrap"><span class="chip paid">Received</span></div></li>'
  ).join('');
}

function payDrawer(inv, cur, bal) {
  const sub = esc(inv.number) + ' · ' + esc((inv.client && inv.client.name) || '');
  return `<aside class="drawer" id="drawer-pay" role="dialog" aria-label="Payment">
    <div class="drawer-head"><div><h3 id="pay-h">Record payment</h3><div class="sub">${sub}</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body">
      <div class="card card-pad" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;background:var(--paper-2)"><span class="period-note">Balance due</span><span class="num" style="font-weight:600;color:var(--over)">${money(bal, cur)}</span></div>
      <div class="grid-2">
        <label class="field"><span class="lab">Amount</span><input class="input num" id="pay-amount" /></label>
        <label class="field"><span class="lab">Date</span><input class="input" type="date" id="pay-date" /></label>
      </div>
      <label class="field"><span class="lab">Method</span><select class="input" id="pay-method"><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option></select></label>
      <label class="field" style="margin:0"><span class="lab">Reference</span><input class="input" id="pay-ref" placeholder="UTR / txn id" /></label>
    </div>
    <div class="drawer-foot"><button class="btn btn-ghost" id="pay-del" style="color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Delete</button><button class="btn btn-primary" id="pay-save" style="flex:1;justify-content:center">Save</button></div>
  </aside>`;
}

let payMode = 'new', payId = null;
function openPay(mode, p) {
  payMode = mode; payId = (p && p.id) || null;
  document.getElementById('pay-h').textContent = mode === 'edit' ? 'Edit payment' : 'Record payment';
  document.getElementById('pay-del').style.display = mode === 'edit' ? '' : 'none';
  document.getElementById('pay-save').textContent = mode === 'edit' ? 'Save changes' : 'Save payment';
  document.getElementById('pay-amount').value = p ? p.amount : '';
  document.getElementById('pay-amount').placeholder = curBal.toFixed(2);
  document.getElementById('pay-date').value = p ? p.date : new Date().toISOString().slice(0, 10);
  document.getElementById('pay-method').value = p ? p.method : 'upi';
  document.getElementById('pay-ref').value = p ? (p.ref || '') : '';
  window.openDrawer('drawer-pay');
}
function savePay() {
  const amount = +document.getElementById('pay-amount').value || 0;
  if (!amount) { window.closeDrawer(); return; }
  const rec = { id: payId || 'pay_' + Date.now(), amount, date: document.getElementById('pay-date').value, method: document.getElementById('pay-method').value, ref: document.getElementById('pay-ref').value.trim() };
  current.payments = current.payments || [];
  if (payMode === 'edit') { const i = current.payments.findIndex((x) => x.id === payId); if (i >= 0) current.payments[i] = rec; }
  else current.payments.push(rec);
  window.closeDrawer();
  store.upsertInvoice(current);
}
function delPay() {
  current.payments = (current.payments || []).filter((x) => x.id !== payId);
  window.closeDrawer();
  store.upsertInvoice(current);
}
