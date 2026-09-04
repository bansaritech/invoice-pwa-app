// Entry: hash router that mounts views into #view. Reuses the design system
// (ledger.css, theme.js, drawer.js). Phase 0 uses a seeded in-memory store;
// Phase 1 swaps in IndexedDB + sync.
import * as store from './lib/store.js';
import { render as dashboard } from './views/dashboard.js';
import { render as invoices } from './views/invoices.js';
import { render as editor } from './views/editor.js';
import { render as invoiceDetail } from './views/invoice-detail.js';
import { render as clients } from './views/clients.js';
import { render as items } from './views/items.js';
import { render as payments } from './views/payments.js';
import { render as reports } from './views/reports.js';
import { make } from './views/placeholder.js';

const routes = [
  { pattern: /^#?\/?$/, view: dashboard, nav: 'overview' },
  { pattern: /^#\/invoices$/, view: invoices, nav: 'invoices' },
  { pattern: /^#\/invoice\/new$/, view: editor, nav: 'invoices' },
  { pattern: /^#\/invoice\/.+\/edit$/, view: editor, nav: 'invoices' },
  { pattern: /^#\/invoice\/[^/]+$/, view: invoiceDetail, nav: 'invoices' },
  { pattern: /^#\/clients$/, view: clients, nav: 'clients' },
  { pattern: /^#\/client\/.+$/, view: make('Client detail'), nav: 'clients' },
  { pattern: /^#\/items$/, view: items, nav: 'items' },
  { pattern: /^#\/payments$/, view: payments, nav: 'payments' },
  { pattern: /^#\/reports$/, view: reports, nav: 'reports' },
  { pattern: /^#\/settings$/, view: make('Settings'), nav: 'settings' }
];

const viewEl = () => document.getElementById('view');

function route() {
  const hash = location.hash || '#/';
  const match = routes.find((r) => r.pattern.test(hash)) || routes[0];
  match.view(viewEl(), hash);
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === match.nav));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
// Re-render current route when the store changes.
store.subscribe(route);

// Hydrate the local database (seeds on first run), then render.
await store.init();
route(); // module scripts run after the DOM is parsed, so #view exists

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
