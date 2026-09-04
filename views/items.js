import * as store from '../lib/store.js';
import { money, esc } from '../lib/format.js';

let editId = null;

export function render(root) {
  root.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Catalog · ${store.items().length} items</div><h1>Items</h1></div>
      <div class="desktop-actions"><button class="btn btn-primary" id="add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg> Add item</button></div>
    </div>
    <div class="card items-card" style="overflow:hidden">
      <div class="lhead items"><span>Item</span><span class="r">Rate</span></div>
      <ul class="ledger items" id="itemlist">${store.items().map(row).join('') || '<li style="cursor:default"><div class="meta" style="padding:14px 16px">No items yet.</div></li>'}</ul>
    </div>
    ${drawer()}`;

  root.querySelector('#add').addEventListener('click', () => open(null));
  root.querySelector('#itemlist').addEventListener('click', (e) => { const li = e.target.closest('li[data-id]'); if (li) open(li.dataset.id); });
  root.querySelector('#it-save').addEventListener('click', save);
  root.querySelector('#it-del').addEventListener('click', del);
}

function row(it) {
  const s = it.type === 'product' ? 's-product' : 's-service';
  return `<li data-id="${esc(it.id)}" style="cursor:pointer"><div><div class="who">${esc(it.name)}</div></div><div class="amt num" style="align-self:center">${money(it.rate)}</div><div class="statusbar ${s}"><b>${it.type === 'product' ? 'Product' : 'Service'}</b></div></li>`;
}

function drawer() {
  return `<aside class="drawer" id="drawer-item" role="dialog" aria-label="Item">
    <div class="drawer-head"><div><h3 id="it-h">Add item</h3></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body">
      <label class="field"><span class="lab">Item name</span><input class="input" id="it-name" placeholder="e.g. Consulting" /></label>
      <label class="field"><span class="lab">Type</span><select class="input" id="it-type"><option value="service">Service</option><option value="product">Product</option></select></label>
      <label class="field" style="margin:0"><span class="lab">Rate (₹)</span><input class="input num" id="it-rate" placeholder="0.00" /></label>
    </div>
    <div class="drawer-foot"><button class="btn btn-ghost" id="it-del" style="color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Delete</button><button class="btn btn-primary" id="it-save" style="flex:1;justify-content:center">Save</button></div>
  </aside>`;
}

function open(id) {
  editId = id;
  const it = id ? store.items().find((x) => x.id === id) : null;
  document.getElementById('it-h').textContent = it ? 'Edit item' : 'Add item';
  document.getElementById('it-del').style.display = it ? '' : 'none';
  document.getElementById('it-name').value = it ? it.name : '';
  document.getElementById('it-type').value = it ? it.type : 'service';
  document.getElementById('it-rate').value = it ? it.rate : '';
  window.openDrawer('drawer-item');
}
function save() {
  const name = document.getElementById('it-name').value.trim(); if (!name) { window.closeDrawer(); return; }
  store.upsertItem({ id: editId || 'it_' + Date.now(), name, type: document.getElementById('it-type').value, rate: +document.getElementById('it-rate').value || 0 });
  window.closeDrawer();
}
function del() { if (editId) store.removeItem(editId); window.closeDrawer(); }
