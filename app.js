// Entry: hash router that mounts views into #view. Reuses the design system
// (ledger.css, theme.js, drawer.js). Phase 0 uses a seeded in-memory store;
// Phase 1 swaps in IndexedDB + sync.
import * as store from './lib/store.js';
import * as sync from './lib/sync.js';
import { render as dashboard } from './views/dashboard.js';
import { render as invoices } from './views/invoices.js';
import { render as editor } from './views/editor.js';
import { render as invoiceDetail } from './views/invoice-detail.js';
import { render as clients } from './views/clients.js';
import { render as items } from './views/items.js';
import { render as payments } from './views/payments.js';
import { render as reports } from './views/reports.js';
import { render as welcome } from './views/welcome.js';
import { render as setup } from './views/setup.js';
import { render as settings } from './views/settings.js';
import { render as clientDetail } from './views/client-detail.js';

const routes = [
  { pattern: /^#\/welcome$/, view: welcome, nav: '', onboarding: true },
  { pattern: /^#\/setup$/, view: setup, nav: '', onboarding: true },
  { pattern: /^#?\/?$/, view: dashboard, nav: 'overview' },
  { pattern: /^#\/invoices$/, view: invoices, nav: 'invoices' },
  { pattern: /^#\/invoice\/new$/, view: editor, nav: 'invoices' },
  { pattern: /^#\/invoice\/.+\/edit$/, view: editor, nav: 'invoices' },
  { pattern: /^#\/invoice\/[^/]+$/, view: invoiceDetail, nav: 'invoices' },
  { pattern: /^#\/clients$/, view: clients, nav: 'clients' },
  { pattern: /^#\/client\/.+$/, view: clientDetail, nav: 'clients' },
  { pattern: /^#\/items$/, view: items, nav: 'items' },
  { pattern: /^#\/payments$/, view: payments, nav: 'payments' },
  { pattern: /^#\/reports$/, view: reports, nav: 'reports' },
  { pattern: /^#\/settings$/, view: settings, nav: 'settings' }
];

const viewEl = () => document.getElementById('view');

function route() {
  const hash = location.hash || '#/';
  const match = routes.find((r) => r.pattern.test(hash)) || routes[0];

  // Gate: no data source connected → force onboarding before any inside page.
  document.body.classList.toggle('onboarding', !!match.onboarding);
  if (!store.connected() && !match.onboarding) { location.hash = '#/welcome'; return; }
  if (store.connected() && match.onboarding) { location.hash = '#/'; return; }

  match.view(viewEl(), hash);
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === match.nav));
  window.scrollTo(0, 0);
}

function showError(err) {
  const el = viewEl();
  if (el) el.innerHTML = `<div class="page-head"><h1>Something went wrong</h1></div>
    <div class="card card-pad"><pre style="white-space:pre-wrap;color:var(--over);font-size:12px;margin:0">${String(err && err.stack || err)}</pre></div>`;
  console.error(err);
}
window.addEventListener('error', (e) => showError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

window.addEventListener('hashchange', route);
// Re-render current route when the store changes.
store.subscribe(route);

// Sync status indicator (sidebar + top bar).
const SYNC_LABEL = { synced: 'Synced', dirty: (n) => n + ' to upload', uploading: 'Uploading…', syncing: 'Syncing…', error: 'Sync error', idle: '' };
sync.onStatus((s, n) => {
  const txt = typeof SYNC_LABEL[s] === 'function' ? SYNC_LABEL[s](n) : (SYNC_LABEL[s] || '');
  document.querySelectorAll('.syncpill').forEach((el) => { el.textContent = txt; });
});

// Ask the browser to keep our IndexedDB data from being evicted — otherwise a restart
// could wipe the connection/data and force onboarding again. Best-effort; ignore failures.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persisted().then((p) => { if (!p) navigator.storage.persist(); }).catch(() => {});
}

// Hydrate the local database (seeds on first run), then render.
try {
  await store.init();
  await sync.initSync();
  route(); // module scripts run after the DOM is parsed, so #view exists
  if (store.connected()) { if (sync.pending()) sync.flush(); else sync.pull(); }
} catch (err) {
  showError(err);
}

if ('serviceWorker' in navigator) {
  // Auto-reload once when a new service worker takes control, so installed devices pick up
  // new code (and the current data layout) instead of running stale cached assets.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js');
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || window.__swReloaded) return; // skip first install; reload once
    window.__swReloaded = true;
    location.reload();
  });
}
