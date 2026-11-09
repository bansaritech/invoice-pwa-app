// Printable invoice template. A default standalone HTML document ships with the app;
// users may override it with a custom template stored in their data repo (synced as
// settings.branding.invoiceTemplate inside settings.json, so it stays per-user).
//
// Template syntax (a tiny mustache subset):
//   {{key}} / {{a.b}}   — escaped value (dotted paths supported)
//   {{{key}}}           — raw HTML (used for the logo / QR <img> tags)
//   {{#key}}…{{/key}}   — section: array → repeat; truthy → show once; falsy → hide
import { amount, fmtDate, invoiceStatus } from './format.js';
import { paidOf, balanceOf } from './domain.js';

const SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
const esc = (v) => { const d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; };
const money = (n, cur) => (SYMBOL[cur] || '') + amount(n);

// ---------- default template (full standalone document) ----------
export const DEFAULT_TEMPLATE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>{{invoice.number}}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; font-size: 13px; line-height: 1.5; }
  .sheet { max-width: 760px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 20px; border-bottom: 2px solid #111; }
  .biz-name { font-size: 20px; font-weight: 800; }
  .muted { color: #666; }
  .logo { max-height: 64px; max-width: 200px; object-fit: contain; }
  .title { text-align: right; }
  .title .big { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
  .meta { color: #555; font-size: 12px; margin-top: 6px; }
  .parties { display: flex; justify-content: space-between; gap: 24px; margin: 22px 0; }
  .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #999; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #999; padding: 8px 6px; border-bottom: 1.5px solid #333; }
  td { padding: 10px 6px; border-bottom: 1px solid #eee; }
  .r { text-align: right; }
  .foot { display: flex; justify-content: space-between; gap: 24px; margin-top: 24px; }
  .totals { margin-left: auto; min-width: 260px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 1.5px solid #333; border-bottom: 1.5px solid #333; font-weight: 800; font-size: 15px; padding: 8px 0; margin: 4px 0; }
  .totals .due { font-weight: 700; color: #b02a2a; }
  .qr { text-align: center; }
  .qr img { max-width: 140px; max-height: 140px; }
  .qr .cap { font-size: 11px; color: #777; margin-top: 6px; }
  .notes { margin-top: 28px; padding-top: 16px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  @media print { body { padding: 0; } @page { margin: 16mm; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="top">
    <div>
      {{#logoImg}}{{{logoImg}}}{{/logoImg}}
      <div class="biz-name">{{business.name}}</div>
      <div class="muted">{{business.address}}</div>
      {{#business.gstin}}<div class="muted">GSTIN {{business.gstin}}</div>{{/business.gstin}}
      {{#business.phone}}<div class="muted">{{business.phone}}</div>{{/business.phone}}
      {{#business.email}}<div class="muted">{{business.email}}</div>{{/business.email}}
    </div>
    <div class="title">
      <div class="big">INVOICE</div>
      <div class="meta">{{invoice.number}}<br>Date · {{invoice.date}}<br>Due · {{invoice.dueDate}}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="lbl">Billed to</div>
      <div style="font-weight:700">{{client.name}}</div>
      {{#client.gstin}}<div class="muted">GSTIN {{client.gstin}}</div>{{/client.gstin}}
    </div>
    <div style="text-align:right">
      <div class="lbl">Status</div>
      <div style="text-transform:capitalize">{{status}}</div>
    </div>
  </div>

  <table>
    <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>
      {{#lines}}<tr><td>{{name}}</td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>{{/lines}}
    </tbody>
  </table>

  <div class="foot">
    {{#qrImg}}<div class="qr">{{{qrImg}}}<div class="cap">Scan to pay</div></div>{{/qrImg}}
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>{{subtotal}}</span></div>
      {{#discount}}<div class="row"><span>Discount</span><span>− {{discount}}</span></div>{{/discount}}
      <div class="row"><span>{{taxLabel}}</span><span>{{tax}}</span></div>
      <div class="row grand"><span>Total</span><span>{{total}}</span></div>
      <div class="row"><span>Paid</span><span>− {{paid}}</span></div>
      <div class="row due"><span>Balance due</span><span>{{balance}}</span></div>
    </div>
  </div>

  {{#notes}}<div class="notes">{{notes}}</div>{{/notes}}
</div>
</body>
</html>`;

// ---------- tiny renderer ----------
function get(data, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
}
function render(tpl, data) {
  // sections first (so inner tokens resolve against the right scope)
  tpl = tpl.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    const v = get(data, key);
    if (Array.isArray(v)) return v.map((item) => render(inner, { ...data, ...item })).join('');
    return v ? render(inner, data) : '';
  });
  // raw (logo/QR img)
  tpl = tpl.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, k) => { const v = get(data, k); return v == null ? '' : String(v); });
  // escaped
  tpl = tpl.replace(/\{\{([\w.]+)\}\}/g, (_, k) => esc(get(data, k) ?? ''));
  return tpl;
}

// ---------- build the token data for one invoice ----------
export function buildData(inv, settings) {
  const cur = inv.currency || 'INR';
  const b = settings.business || {};
  const br = settings.branding || {};
  const logo = br.logo || '';
  const qr = br.qr || '';
  return {
    business: { name: b.name || '', address: b.address || '', gstin: b.gstin || '', phone: b.phone || '', email: b.email || '' },
    logoImg: logo ? `<img class="logo" src="${logo}" alt="logo">` : '',
    qrImg: qr ? `<img class="qr" src="${qr}" alt="payment qr">` : '',
    invoice: { number: inv.number || '', date: inv.date ? fmtDate(inv.date) : '', dueDate: inv.dueDate ? fmtDate(inv.dueDate) : '—' },
    client: { name: (inv.client && inv.client.name) || '', gstin: (inv.client && inv.client.gstin) || '' },
    status: invoiceStatus(inv),
    lines: (inv.lines || []).map((l) => ({
      name: l.name || '', qty: l.qty || 0,
      rate: money(l.rate, cur), amount: money((l.qty || 0) * (l.rate || 0), cur)
    })),
    subtotal: money(inv.subtotal, cur),
    discount: inv.discountAmount ? money(inv.discountAmount, cur) : '',
    taxLabel: (settings.invoicing && settings.invoicing.taxLabel) || 'Tax',
    tax: money(inv.taxAmount, cur),
    total: money(inv.total, cur),
    paid: money(paidOf(inv), cur),
    balance: money(balanceOf(inv), cur),
    notes: inv.notes || ''
  };
}

// Render the full HTML document for an invoice using the active template.
export function renderInvoice(inv, settings) {
  const tpl = (settings.branding && settings.branding.invoiceTemplate) || DEFAULT_TEMPLATE;
  return render(tpl, buildData(inv, settings));
}

// Print via a hidden iframe so the app chrome is never included.
export function printInvoice(inv, settings) {
  const html = renderInvoice(inv, settings);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.onload = () => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { console.error(e); }
    cleanup();
  };
  const doc = frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
}
