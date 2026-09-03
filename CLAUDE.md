# CLAUDE.md

Guidance for working in this repository.

## What this is

**Invoice Simple** — a static, offline-friendly invoicing PWA (single-page app) with
no build step. It runs directly from static files and is deployed to GitHub Pages.
Currency and number formatting are India-focused (`en-IN` / INR).

It is used by **multiple users** — each installs the PWA and connects their own GitHub
token and data repo. Do not make changes that assume a single user or hardcode any
one user's repo/credentials.

## Architecture

The entire app is three files plus PWA scaffolding:

- `index.html` — all markup and inline styles. Tailwind is loaded from the CDN
  (`cdn.tailwindcss.com`); there is no compiled CSS. Uses a `<template id="lineTemplate">`
  for invoice line rows. Three top-level views toggled by class: `#invoiceView`,
  `#dashboardView`, `#settingsView`.
- `app.js` — all logic, written as a single ES module (`<script type="module">`).
  Uses top-level `await`. No framework, no bundler, no dependencies. DOM is queried
  via the `$` helper (`document.querySelector`). Event handling is mostly delegated
  from `document` (`click`/`input`/`change` listeners).
- `data.json` — seed/reference data: `parties` (array of names) and `items`
  (`{name, rate}`). This is the fallback data source when no GitHub connection exists.
- `sw.js` — service worker. Cache-first for the fixed `ASSETS` list, but **network-first
  for `data.json`** (it is user data — stale copies must not be pinned). `activate`
  deletes old caches and `install` calls `skipWaiting`. **Bump the `CACHE` version
  constant (`invoice-simple-vN`) whenever cached assets change**, or clients keep serving
  stale files.
- `manifest.webmanifest`, `icons/` — PWA install metadata and icons (SVG).

## Data model & storage

The active data source is decided by **whether a GitHub connection is configured**
(`hasConnection`), **not** by `installed`. The Settings and Dashboard views are always
visible (in a plain browser tab too), so the connected experience can be used/tested
without installing the PWA.

- **No connection configured:** data comes from `localStorage` (`invoice-simple-data`),
  falling back to `data.json`. Edits (parties, items, GST) are allowed and persist to
  `localStorage`. Note `localStorage` **shadows** the `data.json` file once written.
- **Connection configured:** data comes from a **GitHub repo** via the GitHub Contents
  API (`getRemoteData`). This is the real backend. API reads use `cache: 'no-store'`.

`installed` (standalone display-mode) now only affects minor PWA-specific UX (e.g. the
first-run "set up a data source" prompt), not data access.

**Sync state:** local edits set a `dataDirty` flag (`setDirty`), which shows an
"Unsynced changes" badge next to the Save buttons. It clears on a successful `commitData`
or a fresh `loadData`. Editing is decoupled from committing — the "Save parties/items"
buttons commit to GitHub (still require a connection).

GitHub connection details are stored in **IndexedDB** (`invoice-simple-secure` DB,
`settings` store): `github-repo`, `github-branch`, `github-token`. The token is
encrypted with AES-GCM using a **non-extractable** `crypto-key` (also in IndexedDB)
before storage — it is never displayed again, only replaced. See `saveToken`/`readToken`.

Data layout in the connected GitHub repo:
- `data.json` — parties, items, a global `gstRate` (default 0), and asset paths
  (`invoiceLogoPath`, `appLogoPath`, `qrPath`). Each item may carry an optional
  `gstRate` that overrides the global rate for that item.
- `assets/{invoiceLogo,appLogo,qr}.{ext}` — uploaded images (committed via API).
- `invoices/<year>/<invoice-number>.json` — one file per invoice, storing `subtotal`,
  `gstRate` (null when line items mix rates), `gstAmount`, and a tax-inclusive `total`.
  Older invoices saved before GST may lack these fields.
- `invoices/<year>/index.json` — lightweight per-year list of invoice **summaries**
  (`number, party, date, total, status, paidAmount, paymentDate, path`). The dashboard
  reads this **one file per year** instead of one request per invoice.
- `invoices/balances.json` — rolling `{ year: { party: net } }` where `net` = Σ`total` −
  Σ paid for that year. A selected year's **opening balance** = sum of all prior years'
  nets, so prior years are never re-fetched.

**Index maintenance:** `saveInvoice` writes the invoice file, then `updateInvoiceIndexes`
rewrites that year's `index.json` and `balances.json[year]` (recomputed from the index,
so edits stay correct). This means a save is ~3 commits. Missing index/balances files are
**auto-backfilled** on dashboard load (`ensureYearIndex` / `ensureBalances` /
`buildYearIndex`) from the raw invoice files and committed. `openInvoice` fetches the full
invoice JSON (summaries omit `items`/`notes`). Helpers `readJson` / `putFile` /
`jsonBase64` centralize GitHub Contents reads/writes.

## Key functions in app.js

- `loadData` / `getRemoteData` — resolve the active data source.
- `saveConnection` — validates repo/branch/token, can create a private repo if missing.
- `commitData` / `uploadAsset` — write `data.json` and images back to GitHub.
- `saveInvoice` / `openInvoice` — persist/load individual invoice JSON files.
- `loadDashboard` / `renderDashboard` — fetch invoices per year, compute stats and
  party balances (opening + invoiced − paid).
- `requireConnection` — guards GitHub-writing actions (commit, asset upload, invoice
  save, dashboard). In-memory edits (add/edit/remove party & item, default GST) are NOT
  gated and persist to `localStorage` via `saveData`.
- `invoiceAmounts` / `lineGstRate` — compute subtotal, GST (per-line rate resolution),
  and tax-inclusive total.
- `setDirty` — toggles the unsynced-changes badge.

## Conventions

- Keep the framework-free, single-module style. Prefer the existing `$` helper and
  delegated event listeners.
- Amounts are formatted through the shared `currency` Intl formatter (INR).

## Hard rules (do not break)

- **No build tools or dependencies.** Never introduce a bundler, npm packages, a
  package manager, or a build step. This stays plain static files (HTML + one ES module
  + CDN Tailwind).
- **Always bump the service-worker cache.** Any change to a cached asset requires
  bumping the `CACHE` constant (`invoice-simple-vN`) in `sw.js`, or clients serve stale
  files.
- **Always escape untrusted strings.** Never inject user- or data-supplied values into
  HTML without `escapeHtml`.
- **Never weaken the token security model.** Keep the AES-GCM, non-extractable
  `crypto-key` storage. Never display the stored token or make it extractable; it can
  only be replaced.

## Testing

There is no build/test/lint tooling and no automated tests. Since Settings/Dashboard and
the connected flow now work in a normal browser tab, changes can be tested locally
(serve the folder — the service worker does not work over `file://`). Final verification
is still done against the **live GitHub Pages deployment** after pushing to `master`.
`node --check app.js` catches syntax errors quickly.

When testing stale-data issues, remember: an old service worker + old caches +
`localStorage` may mask changes — use DevTools → Application → **Clear site data** and
unregister the SW to reset.

## Known issues / TODOs

- Invoice numbering (`nextInvoiceNumber`) derives the next `INV-<year>-<seq>` from the
  highest number in the year's `index.json`, and `saveInvoice` blocks overwriting a
  different existing invoice. The number stays user-editable, so a small race remains if
  two devices save the *same manually-kept* number between the freshness check and the
  write — the second save is blocked rather than silently overwriting.
- Saving an invoice makes ~3 sequential commits (invoice + year index + balances); a
  failure partway can leave the index/balances briefly out of sync until the next save or
  dashboard backfill.

## Deployment

`.github/workflows/static.yml` deploys the whole repo to GitHub Pages on push to
`master` (or manual dispatch). No build step — the repo root is the site.
