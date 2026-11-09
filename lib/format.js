// Formatting + safety helpers.

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Currency map for the multi-currency model (symbol only; per-currency, no conversion).
const SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };

export function money(n, currency = 'INR') {
  return `<span class="rupee">${SYMBOL[currency] || ''}</span>${inr.format(Math.round((+n || 0) * 100) / 100)}`;
}
export function amount(n) { return inr.format(Math.round((+n || 0) * 100) / 100); }

export function fmtDate(iso) {
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
}
export function dayMon(iso) {
  const d = new Date(iso);
  return { day: String(d.getDate()).padStart(2, '0'), mon: MON[d.getMonth()] };
}
export function monthKey(iso) { return String(iso).slice(0, 7); }

// Financial year helpers (India default: April start).
export function fyOf(iso, startMonth = 4) {
  const d = new Date(iso), y = d.getFullYear();
  const a = (d.getMonth() + 1) >= startMonth ? y : y - 1;
  return { start: a, label: a + '-' + String(a + 1).slice(-2) };
}

// Escape untrusted strings before injecting into HTML.
export function esc(v) {
  const el = document.createElement('div');
  el.textContent = v == null ? '' : String(v);
  return el.innerHTML;
}

// Invoice number template → concrete string (tokens documented in ARCHITECTURE.md).
export function formatNumber(fmt, date, seq, fyStartMonth = 4) {
  const d = new Date(date), y = d.getFullYear(), m = d.getMonth();
  const fy = fyOf(date, fyStartMonth);
  const rep = {
    '{YYYY}': String(y), '{YY}': String(y).slice(-2), '{FY}': fy.label,
    '{MM}': String(m + 1).padStart(2, '0'), '{MMM}': MON[m], '{DD}': String(d.getDate()).padStart(2, '0')
  };
  let out = fmt;
  for (const k in rep) out = out.split(k).join(rep[k]);
  return out.replace(/\{(#+)\}/g, (_, h) => String(seq).padStart(h.length, '0'));
}

// Invoice status derived from payments + due date (overdue is never stored).
export function invoiceStatus(inv, today = new Date()) {
  if (inv.status === 'draft' || inv.status === 'cancelled') return inv.status;
  const paid = (inv.payments || []).reduce((s, p) => s + (+p.amount || 0), 0);
  if (paid >= inv.total) return 'paid';
  const overdue = inv.dueDate && new Date(inv.dueDate) < today;
  if (paid > 0) return overdue ? 'overdue' : 'partial';
  return overdue ? 'overdue' : 'unpaid';
}
