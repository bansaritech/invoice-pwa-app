# Ledger — Implementation plan

Porting the approved design + data architecture into the real PWA. See
`ARCHITECTURE.md` for the data model and `design/` for the UI.

## Ground rules (unchanged constraints)
- **No build step, no dependencies.** Static files only — plain HTML + ES modules + CDN
  Tailwind is *not* used here (the design ships its own `ledger.css`). Browser-native
  `import` lets us split JS into modules with **no bundler**.
- **Bump the SW cache** (`invoice-simple-vN`) on any cached-asset change.
- **Escape all untrusted strings**; keep the AES-GCM non-extractable token model.
- Verified against the **live GitHub Pages** deploy; do the whole port on a **branch**,
  preview, then merge (it replaces `index.html` + `app.js`).

## Target file structure
```
index.html                     # shell + view container, loads app.js (module)
app.js                         # entry: boot, router, hydrate store, first render
assets/ledger.css              # design system (from design/)
assets/theme.js  drawer.js  shell.js  menu.js
lib/
  db.js         # IndexedDB wrapper (ledger-db): stores, get/put/getAll/tx
  secure.js     # existing secure store: repo/branch/encrypted token/crypto key
  repo.js       # GitHub Contents API: read/write file, sha, base64, ETag
  manifest.js   # read/diff/write manifest.json
  sync.js       # pull (incremental) + conflict handling
  outbox.js     # enqueue changes, background uploader (push)
  migrate.js    # one-time: split legacy data.json, write manifest
  store.js      # in-memory state hydrated from db + pub/sub re-render
  format.js     # inr, dates, fy helpers, escapeHtml
  domain.js     # numbering, totals/tax, status, balances, aging, reports
router.js
views/          # one module per screen, export render(root, state)
  dashboard.js invoices.js editor.js invoice-detail.js clients.js
  client-detail.js items.js payments.js reports.js settings.js
  welcome.js setup.js
sw.js  manifest.webmanifest  icons/
```
Views are pure render functions over `store` state; the router maps `#/route` → view.

## Phases (each independently testable)

### Phase 0 — Shell & routing
- Bring `ledger.css` + `theme.js`/`drawer.js`/`shell.js`/`menu.js` into the app.
- Hash router (`#/`, `#/invoices`, `#/invoices/:no`, `#/clients`, …), a `<main id="view">`
  container, sidebar/bottom-nav via `shell.js`.
- Boot sequence: apply theme → open DBs → hydrate store → render route.
- **Ships:** navigable empty shell in light/dark. SW cache bumped.

### Phase 1 — Local data layer (`db.js`, `store.js`)
- `ledger-db` object stores: `settings, clients, items, invoices, indexes, balances,
  meta, outbox` (per `ARCHITECTURE.md`).
- `store` hydrates from IndexedDB, exposes getters, notifies views on change.
- Seed with local sample data so views can be built before sync exists.
- **Ships:** views render from IndexedDB; fully offline.

### Phase 2 — Repo client + migration (`repo.js`, `manifest.js`, `migrate.js`)
- Port existing GitHub read/write helpers (`readJson`, `putFile`, base64, `no-store`,
  sha). Add ETag support and `manifest.json` read/write.
- Migration: detect legacy `data.json` → write `settings.json`, `clients.json` (parties →
  objects), `items.json`, and an initial `manifest.json`. Idempotent.
- **Ships:** connect a repo, first sync creates the new file layout.

### Phase 3 — Sync + Upload (`sync.js`, `outbox.js`)
- **Pull:** diff local vs remote `manifest`; fetch changed files (`If-None-Match`) into
  IndexedDB; auto-backfill missing indexes/balances.
- **Outbox:** every write enqueues the changed file(s) (invoice + year index row +
  balances) as one unit.
- **Uploader:** drains outbox → commit per file with sha → update local manifest.
  Debounced background run when online + online/offline listeners. Manual **Upload**
  flushes; **Sync** pulls. Outbox length = the "N to upload" indicator.
- **Conflicts:** sha mismatch → pull that file; union-merge appended `payments[]`, else
  last-write-wins + warning toast.
- **Ships:** the sync/upload behavior designed in Settings, working across two devices.

### Phase 4 — Domain logic (`domain.js`)
- Invoice numbering (max of year index + 1), totals with tax (item vs invoice mode) +
  discount (₹/%), status derivation from payments, per-party balances + aging, dashboard
  KPIs (month/year), reports (revenue, GST summary, aging, top clients).
- Unit-checkable pure functions (no DOM) so they're easy to verify.
- **Ships:** correct numbers everywhere.

### Phase 5 — Screens (port `views/*`)
Reuse the design markup; wire to `store` + drawers. Suggested order (value first):
1. Dashboard 2. Invoices list (filters/sort/group/search) 3. Invoice editor (drawers,
tax modes, discount) 4. Invoice detail (payments record/edit) 5. Clients + Client detail
6. Items 7. Payments 8. Reports 9. Settings (profile, tax, data source + Sync/Upload)
10. Welcome + Setup wizard 11. States wired into real empty/error/loading.
- **Ships:** one screen at a time, each backed by real data.

### Phase 6 — PWA & polish
- SW: cache the **app shell** (network-first for `manifest.json` only; data now lives in
  IndexedDB, not fetched files). Offline fallback, install prompt, icons.
- Toasts, focus management in drawers, keyboard nav, `prefers-reduced-motion`, a11y labels.
- **Ships:** installable, offline-capable app.

### Phase 7 — QA & rollout
- Multi-device sync + conflict scenarios; migration from an existing real repo; large-data
  sanity (many invoices); light/dark; mobile/desktop.
- Merge branch → deploy to Pages → smoke test → done.

## Sequencing & dependencies
- 0 → 1 unlock UI work; 2 → 3 unlock real sync. **4 (domain)** can proceed in parallel with
  1/5. **5 (screens)** depends on 1 (store) and 4 (domain); can start on Dashboard/Invoices
  before sync (3) is finished, using seeded local data.
- Critical path: **0 → 1 → 2 → 3** (data/sync spine), with **4 + 5** layered on top.

## Risks & mitigations
- **GitHub API limits / latency** → local-first hides it; batch commits; incremental sync.
- **Conflicts on hot files** (`clients.json`, `items.json`) → keep small now; split into
  per-record files if teams grow.
- **Token security** → unchanged AES-GCM model; never log/display; least-privilege token.
- **No test tooling** → keep `domain.js` pure and add a tiny `node --check`-able test file
  run manually; verify flows on live Pages.
- **Big-bang risk** → phased, branch-based; the current app keeps working until merge.
