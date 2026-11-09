import * as store from '../lib/store.js';
import * as sync from '../lib/sync.js';
import * as secure from '../lib/secure.js';
import { esc, formatNumber } from '../lib/format.js';
import { DEFAULT_TEMPLATE, printInvoice } from '../lib/invoice-template.js';

const g = (id) => document.getElementById(id);
function save(mut) { const s = JSON.parse(JSON.stringify(store.settings())); mut(s); store.saveSettings(s); }

function svg(path) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`; }
const ICON_PATHS = {
  invoice: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  ledger: 'M4 20V11M10 20V4M16 20v-6M20 20H4',
  paid: 'M5 13l4 4L19 7'
};
const ICON_BG = { rupee: 'var(--ink)', invoice: 'var(--primary)', ledger: 'var(--accent)', paid: '#7C3A63' };
const iconGlyph = (key) => key === 'rupee' ? '<span style="font-weight:800;font-size:16px">₹</span>' : svg(ICON_PATHS[key] || ICON_PATHS.invoice);
function iconThumbInner(ai) {
  if (ai && ai.type === 'custom' && ai.data) return `<img src="${ai.data}" style="width:100%;height:100%;object-fit:cover;border-radius:10px" />`;
  return iconGlyph((ai && ai.preset) || 'rupee');
}
const thumbBg = (ai) => ai && ai.type === 'custom' ? 'transparent' : (ICON_BG[(ai && ai.preset) || 'rupee'] || 'var(--ink)');
const thumbColor = (ai) => ((ai && ai.preset) || 'rupee') === 'rupee' ? 'var(--pop)' : '#fff';

export function render(root) {
  const s = store.settings();
  const inv = s.invoicing;
  root.innerHTML = `
    <div class="page-head" style="max-width:760px;margin:0 auto"><div><div class="eyebrow">${esc(s.business.name)}</div><h1>Settings</h1></div></div>
    <div style="max-width:760px;margin:0 auto">
      <button class="card card-pad" onclick="openDrawer('drawer-profile')" style="display:flex;align-items:center;gap:16px;width:100%;text-align:left;cursor:pointer;color:var(--ink)">
        <span class="avatar" style="width:56px;height:56px;border-radius:16px;font-size:20px">${esc((s.business.name || 'B')[0])}</span>
        <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px">${esc(s.business.name)}</div><div class="period-note">${esc(s.business.gstin || 'No GSTIN')} · ${esc(s.business.address || '')}</div></div>
        <span class="chev" style="color:var(--ink-3)">›</span>
      </button>

      <div class="card card-pad" style="margin-top:14px;background:color-mix(in srgb,var(--primary) 5%,transparent);border-color:color-mix(in srgb,var(--primary) 22%,transparent)">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span style="width:42px;height:42px;border-radius:12px;background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);display:grid;place-items:center;flex-shrink:0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/></svg></span>
          <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:14.5px;display:flex;align-items:center;gap:8px">Data source <span class="chip" id="src-chip" style="height:20px"></span></div><div class="period-note" id="src-meta" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">…</div></div>
          <button class="btn btn-ghost" id="btn-manage" style="height:36px;padding:0 12px">Manage</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn btn-ghost" id="btn-sync" style="flex:1;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v5h-5"/></svg> Sync</button>
          <button class="btn btn-primary" id="btn-upload" style="flex:1;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21V9m0 0l-4 4m4-4l4 4M5 3h14"/></svg> Upload</button>
        </div>
      </div>

      <div class="setgroup">Invoicing</div>
      <div class="card">
        <ul class="set-list">
          ${row('numbering', 'Invoice numbering', 'Format of new invoice numbers', esc(inv.numberFormat))}
          ${row('taxmode', 'Tax applied on', 'Per line item or whole invoice', inv.taxMode === 'item' ? 'Item' : 'Invoice')}
          ${row('taxlabel', 'Tax label', 'Name shown for tax', esc(inv.taxLabel))}
          ${row('tax', 'Default tax', 'Pre-filled on new invoices', inv.defaultTax.type === 'pct' ? inv.defaultTax.value + '%' : '₹' + inv.defaultTax.value)}
          ${row('discount', 'Default discount', 'Pre-filled on new invoices', inv.defaultDiscount.type === 'pct' ? inv.defaultDiscount.value + '%' : '₹' + inv.defaultDiscount.value)}
          ${row('currency', 'Default currency', 'For new invoices', esc(inv.defaultCurrency))}
        </ul>
      </div>

      <div class="setgroup">Branding</div>
      <div class="card">
        <ul class="set-list">
          <li class="set-row tap" data-open="appicon"><span class="ic" id="appicon-thumb" style="background:${thumbBg(s.branding.appIcon)};color:${thumbColor(s.branding.appIcon)}">${iconThumbInner(s.branding.appIcon)}</span><span class="grow"><span class="t">App icon</span><span class="s">Installed app &amp; header mark</span></span><span class="chev">›</span></li>
          <li class="set-row tap" data-open="logo"><span class="ic">${s.branding.logo ? `<img src="${s.branding.logo}" style="width:100%;height:100%;object-fit:contain;border-radius:8px" />` : svg('M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6')}</span><span class="grow"><span class="t">Logo</span><span class="s">Shown on invoices</span></span>${s.branding.logo ? '<span class="chip paid" style="height:22px">Set</span>' : '<span class="chev">›</span>'}</li>
          <li class="set-row tap" data-open="qr"><span class="ic">${s.branding.qr ? `<img src="${s.branding.qr}" style="width:100%;height:100%;object-fit:contain;border-radius:8px" />` : svg('M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3z')}</span><span class="grow"><span class="t">Payment QR</span><span class="s">Attached to the invoice</span></span>${s.branding.qr ? '<span class="chip paid" style="height:22px">Set</span>' : '<span class="chev">›</span>'}</li>
          <li class="set-row tap" data-open="template"><span class="ic">${svg('M9 12h6M9 16h6M9 8h2M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5')}</span><span class="grow"><span class="t">Invoice template</span><span class="s">Layout used for printing</span></span>${s.branding.invoiceTemplate ? '<span class="chip paid" style="height:22px">Custom</span>' : '<span class="chev">›</span>'}</li>
        </ul>
      </div>

      <div class="setgroup">Preferences</div>
      <div class="card">
        <ul class="set-list">
          <li class="set-row"><span class="ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-theme-icon></svg></span><span class="grow"><span class="t" data-theme-label>Dark mode</span><span class="s">Appearance</span></span><button class="switch" id="themeSwitch" onclick="toggleTheme();this.classList.toggle('on',document.documentElement.getAttribute('data-theme')==='dark')"></button></li>
        </ul>
      </div>

      <a href="#/welcome" class="btn btn-ghost" id="signout" style="width:100%;justify-content:center;margin-top:20px;color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent);text-decoration:none">Sign out</a>
      <button class="btn btn-ghost" id="cleardata" style="width:100%;justify-content:center;margin-top:10px;color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Clear data</button>
      <p class="period-note" style="text-align:center;margin:6px 0 0">Empties all invoices, items &amp; clients. Company profile &amp; settings are kept.</p>
      <button class="btn btn-ghost" id="resetapp" style="width:100%;justify-content:center;margin-top:14px;color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Reset app</button>
      <p class="period-note" style="text-align:center;margin:6px 0 0">Clears local data &amp; disconnects this device. Your repo data is untouched.</p>
      <p style="text-align:center;color:var(--ink-3);font-family:var(--mono);font-size:11px;margin:16px 0 0">Ledger · v1.0.0</p>
    </div>
    ${drawers(s)}`;

  g('themeSwitch').classList.toggle('on', document.documentElement.getAttribute('data-theme') === 'dark');
  renderSourceStatus();
  sync.onStatus(renderSourceStatus);
  loadConnection();

  root.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => window.openDrawer('drawer-' + el.dataset.open)));
  g('btn-sync').addEventListener('click', () => sync.pull());
  g('btn-upload').addEventListener('click', () => sync.upload());
  g('btn-manage').addEventListener('click', () => window.openDrawer('drawer-source'));
  g('ds-save').addEventListener('click', async () => {
    const repo = g('ds-repo').value.trim(), branch = g('ds-branch').value.trim() || 'main', token = g('ds-token').value.trim();
    const err = g('ds-err');
    if (!/^[^/]+\/[^/]+$/.test(repo) || !branch) { err.textContent = 'Enter a valid repository (owner/name) and branch.'; err.style.display = ''; return; }
    const btn = g('ds-save'); btn.disabled = true; btn.textContent = 'Saving…';
    await store.connect({ repo, branch, token }); // token blank keeps the existing one
    window.closeDrawer();
    loadConnection();
    sync.pull();
  });
  g('signout').addEventListener('click', (e) => { e.preventDefault(); store.disconnect().then(() => { location.hash = '#/welcome'; }); });
  g('cleardata').addEventListener('click', () => {
    if (!confirm('Clear all invoices, items and clients? Your company profile and settings are kept. This cannot be undone.')) return;
    store.clearData().then(() => { location.hash = '#/'; });
  });
  g('resetapp').addEventListener('click', () => {
    if (!confirm('Reset the app? This clears all local data and disconnects this device. Data already synced to your repo is not deleted.')) return;
    store.resetApp().then(() => { location.hash = '#/welcome'; location.reload(); });
  });

  // drawer saves
  g('pf-save').addEventListener('click', () => { save((x) => { x.business.name = g('pf-name').value.trim(); x.business.gstin = g('pf-gstin').value.trim(); x.business.phone = g('pf-phone').value.trim(); x.business.email = g('pf-email').value.trim(); x.business.address = g('pf-addr').value.trim(); }); window.closeDrawer(); });
  g('tl-save').addEventListener('click', () => { save((x) => x.invoicing.taxLabel = g('tl-sel').value); window.closeDrawer(); });
  g('tm-save').addEventListener('click', () => { save((x) => x.invoicing.taxMode = g('tm-sel').value); window.closeDrawer(); });
  g('dt-save').addEventListener('click', () => { save((x) => x.invoicing.defaultTax = { type: g('dt-type').value, value: +g('dt-val').value || 0 }); window.closeDrawer(); });
  g('dd-save').addEventListener('click', () => { save((x) => x.invoicing.defaultDiscount = { type: g('dd-type').value, value: +g('dd-val').value || 0 }); window.closeDrawer(); });
  g('cu-save').addEventListener('click', () => { save((x) => x.invoicing.defaultCurrency = g('cu-sel').value); window.closeDrawer(); });
  g('nb-save').addEventListener('click', () => { save((x) => x.invoicing.numberFormat = g('nb-input').value.trim() || 'INV-{YYYY}-{###}'); window.closeDrawer(); });
  ['nb-input'].forEach((id) => g(id).addEventListener('input', nbPreview));
  g('nb-presets').addEventListener('click', (e) => { const b = e.target.closest('[data-fmt]'); if (b) { g('nb-input').value = b.dataset.fmt; nbPreview(); } });
  nbPreview();

  // Branding — app icon
  let aiSel = JSON.parse(JSON.stringify(s.branding.appIcon || { type: 'preset', preset: 'rupee' }));
  const markIcon = () => document.querySelectorAll('#iconpick .tile[data-key]').forEach((t) => t.classList.toggle('sel', aiSel.type === 'preset' && t.dataset.key === aiSel.preset));
  markIcon();
  g('iconpick').addEventListener('click', (e) => { const t = e.target.closest('.tile[data-key]'); if (!t) return; aiSel = { type: 'preset', preset: t.dataset.key }; document.querySelectorAll('#iconpick .tile').forEach((x) => x.classList.toggle('sel', x === t)); });
  g('iconfile').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== img.height) { alert('Please choose a square (1:1) image.'); e.target.value = ''; return; }
        aiSel = { type: 'custom', data: r.result };
        const tile = e.target.closest('.tile'); tile.style.background = `center/cover url("${r.result}")`; tile.textContent = '';
        document.querySelectorAll('#iconpick .tile').forEach((x) => x.classList.toggle('sel', x === tile));
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  });
  g('ai-save').addEventListener('click', () => { save((x) => x.branding.appIcon = aiSel); window.closeDrawer(); });

  // Branding — logo & QR
  let logoData = s.branding.logo || null, qrData = s.branding.qr || null;
  const bindImg = (fileId, dropId, set) => g(fileId).addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { set(r.result); g(dropId).innerHTML = `<img src="${r.result}" />`; }; r.readAsDataURL(f);
  });
  bindImg('logo-file', 'logo-drop', (v) => logoData = v);
  bindImg('qr-file', 'qr-drop', (v) => qrData = v);
  g('lg-save').addEventListener('click', () => { save((x) => x.branding.logo = logoData); window.closeDrawer(); });
  g('qr-save').addEventListener('click', () => { save((x) => x.branding.qr = qrData); window.closeDrawer(); });
  g('lg-remove').addEventListener('click', () => { save((x) => x.branding.logo = null); window.closeDrawer(); });
  g('qr-remove').addEventListener('click', () => { save((x) => x.branding.qr = null); window.closeDrawer(); });

  // Branding — invoice print template
  g('tpl-save').addEventListener('click', () => { const v = g('tpl-input').value.trim(); save((x) => x.branding.invoiceTemplate = v || null); window.closeDrawer(); });
  g('tpl-reset').addEventListener('click', () => { g('tpl-input').value = DEFAULT_TEMPLATE; });
  g('tpl-preview').addEventListener('click', () => {
    const inv = store.invoices()[0];
    if (!inv) { alert('Add an invoice first to preview the template.'); return; }
    const s2 = JSON.parse(JSON.stringify(store.settings()));
    s2.branding.invoiceTemplate = g('tpl-input').value;
    printInvoice(inv, s2);
  });
}

function renderSourceStatus() {
  const chip = g('src-chip'); if (!chip) return;
  const st = sync.getStatus(), n = sync.pending();
  const dirty = n > 0;
  chip.className = 'chip ' + (st === 'error' ? 'over' : st === 'uploading' || st === 'syncing' ? 'draft' : dirty ? 'due' : 'paid');
  chip.textContent = st === 'error' ? 'Error' : st === 'uploading' ? 'Uploading…' : st === 'syncing' ? 'Syncing…' : dirty ? n + ' to upload' : 'Synced';
}
async function loadConnection() {
  const c = await secure.getConnection();
  const meta = g('src-meta');
  if (meta) meta.textContent = c.repo ? `${c.repo} · ${c.branch || 'main'}` : 'Not connected';
  if (g('ds-repo')) { g('ds-repo').value = c.repo || ''; g('ds-branch').value = c.branch || 'main'; }
}

function nbPreview() {
  g('nb-preview').textContent = formatNumber(g('nb-input').value || '', new Date('2026-09-04'), 43, store.settings().invoicing.fyStartMonth || 4);
}

function row(key, title, sub, val) {
  return `<li class="set-row tap" data-open="${key}"><span class="ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg></span><span class="grow"><span class="t">${title}</span><span class="s">${sub}</span></span><span class="val">${val}</span></li>`;
}

const typeSel = (id, cur) => `<select class="input" id="${id}"><option value="pct" ${cur === 'pct' ? 'selected' : ''}>Percentage (%)</option><option value="amount" ${cur !== 'pct' ? 'selected' : ''}>Fixed amount (₹)</option></select>`;
function drawerShell(id, title, body) {
  return `<aside class="drawer" id="drawer-${id}" role="dialog"><div class="drawer-head"><div><h3>${title}</h3></div><button class="drawer-x" onclick="closeDrawer()">×</button></div><div class="drawer-body">${body}</div><div class="drawer-foot"><button class="btn btn-ghost" onclick="closeDrawer()">Cancel</button><button class="btn btn-primary" id="${id}-save" style="flex:1;justify-content:center">Save</button></div></aside>`;
}
function drawers(s) {
  const i = s.invoicing, b = s.business;
  const opt = (v, cur) => `<option ${v === cur ? 'selected' : ''}>${v}</option>`;
  return `
  <aside class="drawer" id="drawer-source" role="dialog" aria-label="Data source">
    <div class="drawer-head"><div><h3>Data source</h3><div class="sub">Private repository that stores your data</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body">
      <label class="field"><span class="lab">Repository</span><input class="input num" id="ds-repo" placeholder="owner/repository" /></label>
      <label class="field"><span class="lab">Branch</span><input class="input num" id="ds-branch" value="main" /></label>
      <label class="field"><span class="lab">Access token</span><input class="input" id="ds-token" type="password" placeholder="Enter a new token to replace" /><span class="s" style="display:block;margin-top:6px;color:var(--ink-3);font-size:12px">A token is saved and encrypted. Enter a new one only to replace it.</span></label>
      <p id="ds-err" style="color:var(--over);font-size:13px;margin:4px 0 0;display:none"></p>
    </div>
    <div class="drawer-foot"><button class="btn btn-ghost" onclick="closeDrawer()">Cancel</button><button class="btn btn-primary" id="ds-save" style="flex:1;justify-content:center">Validate &amp; save</button></div>
  </aside>

  <aside class="drawer" id="drawer-appicon" role="dialog" aria-label="App icon">
    <div class="drawer-head"><div><h3>App icon</h3><div class="sub">Square icons only (1:1)</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body"><div class="iconpick" id="iconpick">
      <button class="tile" data-key="rupee" style="background:var(--ink);color:var(--pop)">₹</button>
      <button class="tile" data-key="invoice" style="background:var(--primary)">${svg(ICON_PATHS.invoice)}</button>
      <button class="tile" data-key="ledger" style="background:var(--accent)">${svg(ICON_PATHS.ledger)}</button>
      <button class="tile" data-key="paid" style="background:#7C3A63">${svg(ICON_PATHS.paid)}</button>
      <label class="tile upload"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"/></svg><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" id="iconfile" /></label>
    </div><p class="note" style="font-size:12.5px;color:var(--ink-3);margin-top:14px">Pick a preset or upload a <b>square</b> image. Used for the installed app icon and header mark.</p></div>
    <div class="drawer-foot"><button class="btn btn-ghost" onclick="closeDrawer()">Cancel</button><button class="btn btn-primary" id="ai-save" style="flex:1;justify-content:center">Save</button></div>
  </aside>

  <aside class="drawer" id="drawer-logo" role="dialog" aria-label="Logo">
    <div class="drawer-head"><div><h3>Logo</h3><div class="sub">Shown on invoices</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body"><label class="imgdrop"><span id="logo-drop">${s.branding.logo ? `<img src="${s.branding.logo}" />` : 'Drop an image or browse<br><span class="period-note">PNG, JPG, SVG</span>'}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" id="logo-file" /></label></div>
    <div class="drawer-foot"><button class="btn btn-ghost" id="lg-remove" style="color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Remove</button><button class="btn btn-primary" id="lg-save" style="flex:1;justify-content:center">Save</button></div>
  </aside>

  <aside class="drawer" id="drawer-qr" role="dialog" aria-label="Payment QR">
    <div class="drawer-head"><div><h3>Payment QR</h3><div class="sub">Attached to the invoice</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body"><label class="imgdrop"><span id="qr-drop">${s.branding.qr ? `<img src="${s.branding.qr}" />` : 'Drop an image or browse<br><span class="period-note">PNG, JPG, SVG</span>'}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" id="qr-file" /></label></div>
    <div class="drawer-foot"><button class="btn btn-ghost" id="qr-remove" style="color:var(--over);border-color:color-mix(in srgb,var(--over) 30%,transparent)">Remove</button><button class="btn btn-primary" id="qr-save" style="flex:1;justify-content:center">Save</button></div>
  </aside>

  <aside class="drawer drawer-wide" id="drawer-template" role="dialog" aria-label="Invoice template">
    <div class="drawer-head"><div><h3>Invoice template</h3><div class="sub">HTML used when printing · stored in your data repo</div></div><button class="drawer-x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body">
      <p class="note" style="font-size:12px;color:var(--ink-3);margin:0 0 10px">Tokens: <b>{{business.name}}</b>, <b>{{business.address}}</b>, <b>{{business.gstin}}</b>, <b>{{client.name}}</b>, <b>{{invoice.number}}</b>, <b>{{invoice.date}}</b>, <b>{{total}}</b>, <b>{{balance}}</b> · logo &amp; QR via <b>{{{logoImg}}}</b> / <b>{{{qrImg}}}</b> · line items in <b>{{#lines}}…{{/lines}}</b>. Leave empty to use the built-in default.</p>
      <label class="field" style="margin:0"><span class="lab">Template HTML</span><textarea class="input num" id="tpl-input" style="min-height:300px;font-size:12px;line-height:1.5;white-space:pre">${esc(s.branding.invoiceTemplate || DEFAULT_TEMPLATE)}</textarea></label>
    </div>
    <div class="drawer-foot"><button class="btn btn-ghost" id="tpl-reset">Reset to default</button><button class="btn btn-ghost" id="tpl-preview">Preview</button><button class="btn btn-primary" id="tpl-save" style="flex:1;justify-content:center">Save</button></div>
  </aside>
  ${drawerShell('profile', 'Business profile',
    `<label class="field"><span class="lab">Business name</span><input class="input" id="pf-name" value="${esc(b.name || '')}" /></label>
     <label class="field"><span class="lab">GSTIN</span><input class="input num" id="pf-gstin" value="${esc(b.gstin || '')}" /></label>
     <div class="grid-2"><label class="field"><span class="lab">Phone</span><input class="input num" id="pf-phone" value="${esc(b.phone || '')}" /></label><label class="field"><span class="lab">Email</span><input class="input" id="pf-email" value="${esc(b.email || '')}" /></label></div>
     <label class="field" style="margin:0"><span class="lab">Address</span><textarea class="input" id="pf-addr">${esc(b.address || '')}</textarea></label>`).replace('id="profile-save"', 'id="pf-save"')}
  ${drawerShell('taxlabel', 'Tax label', `<label class="field" style="margin:0"><span class="lab">Label</span><select class="input" id="tl-sel">${['GST', 'VAT', 'TAX', 'Sales Tax'].map((v) => opt(v, i.taxLabel)).join('')}</select></label>`).replace('id="taxlabel-save"', 'id="tl-save"')}
  ${drawerShell('taxmode', 'Tax applied on', `<label class="field" style="margin:0"><span class="lab">Mode</span><select class="input" id="tm-sel"><option value="invoice" ${i.taxMode !== 'item' ? 'selected' : ''}>Whole invoice</option><option value="item" ${i.taxMode === 'item' ? 'selected' : ''}>Each item</option></select></label>`).replace('id="taxmode-save"', 'id="tm-save"')}
  ${drawerShell('tax', 'Default tax', `<label class="field"><span class="lab">Type</span>${typeSel('dt-type', i.defaultTax.type)}</label><label class="field" style="margin:0"><span class="lab">Value</span><input class="input num" id="dt-val" value="${i.defaultTax.value}" /></label>`).replace('id="tax-save"', 'id="dt-save"')}
  ${drawerShell('discount', 'Default discount', `<label class="field"><span class="lab">Type</span>${typeSel('dd-type', i.defaultDiscount.type)}</label><label class="field" style="margin:0"><span class="lab">Value</span><input class="input num" id="dd-val" value="${i.defaultDiscount.value}" /></label>`).replace('id="discount-save"', 'id="dd-save"')}
  ${drawerShell('currency', 'Default currency', `<label class="field" style="margin:0"><span class="lab">Currency</span><select class="input" id="cu-sel">${['INR', 'USD', 'EUR', 'GBP', 'AED'].map((v) => opt(v, i.defaultCurrency)).join('')}</select></label>`).replace('id="currency-save"', 'id="cu-save"')}
  ${drawerShell('numbering', 'Invoice numbering',
    `<label class="field"><span class="lab">Format</span><input class="input num" id="nb-input" value="${esc(i.numberFormat)}" /></label>
     <div class="field"><span class="lab">Quick presets</span><div class="filter-row" id="nb-presets" style="flex-wrap:wrap;overflow:visible">
       ${['INV-{YYYY}-{###}', 'INV/{FY}/{###}', '{YY}{MM}-{###}', '{YYYY}/{####}'].map((f) => `<button class="fchip num" data-fmt="${f}">${f}</button>`).join('')}
     </div></div>
     <div class="card card-pad" style="background:var(--paper-2);display:flex;justify-content:space-between"><span class="period-note">Preview</span><span class="num" style="font-weight:700" id="nb-preview"></span></div>
     <p class="note" style="font-size:12px;color:var(--ink-3);margin-top:10px">Tokens: <b>{YYYY}</b> year · <b>{YY}</b> 2-digit year · <b>{FY}</b> financial year · <b>{MM}</b> month · <b>{MMM}</b> month name · <b>{DD}</b> day · <b>{#}…{####}</b> sequence (padding). Other text is kept as-is.</p>`).replace('id="numbering-save"', 'id="nb-save"')}`;
}
