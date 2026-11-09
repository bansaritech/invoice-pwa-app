# Ledger — Data architecture (proposal)

How data is stored, where it lives, and how it syncs. Builds on the current app
(GitHub private repo as the backend + IndexedDB for the encrypted token).

## Principles

1. **Local-first.** Every read and write hits a local database first, so the UI is
   instant and works offline. The repo is the shared source of truth, reached in the
   background.
2. **The repo is the system of record.** Anything shared between users/devices lives in
   the GitHub repo as JSON. Device-only preferences never leave the device.
3. **Small, independent files.** One file per invoice, plus per-year indexes, so a change
   touches the smallest possible file and syncs cheaply (and multi-user conflicts stay
   localized).

## Three storage tiers

| Tier | Tech | Holds | Scope |
|------|------|-------|-------|
| **Remote (source of truth)** | GitHub repo (Contents API) | settings, clients, items, invoices, payments, assets, indexes | shared, synced |
| **Local mirror** | IndexedDB (`ledger-db`) | a copy of everything above + an outbox of pending changes | per device, instant/offline |
| **Secure** | IndexedDB (`invoice-simple-secure`) | repo, branch, encrypted token, non-extractable crypto key | per device |
| **Preferences** | localStorage | theme, last active view, UI-only prefs | per device |

> Business settings (tax label, tax mode, defaults, numbering) belong in the **repo**
> (`settings.json`), not localStorage. In the mockup we used localStorage for `ledger-taxmode`
> only to demo cross-page behavior — in the real app that reads from synced settings.

## Repo file layout

```
/settings.json                     # business profile + invoicing config (see below)
/clients.json                      # all clients (array)
/items.json                        # catalogue (array)
/assets/logo.<ext>                 # branding
/assets/qr.<ext>
/invoices/<FY>/index.json          # lightweight summaries for the year (dashboard/list)
/invoices/<FY>/<number>.json       # full invoice, incl. its payments[]
/balances.json                     # derived cache: opening balances per party per FY
/manifest.json                     # path -> {sha, updatedAt} for fast sync
```

`<FY>` = financial year folder (e.g. `2026-27` for Apr–Mar India, or calendar year —
configurable in settings). Numbering derives from the year's `index.json` (max + 1),
matching the current app.

### settings.json
```json
{
  "business": { "name": "Bansari Tech", "gstin": "…", "address": "…", "email": "…", "phone": "…" },
  "invoicing": {
    "taxLabel": "GST",
    "taxMode": "invoice",            // "invoice" | "item"
    "defaultTax": { "type": "pct", "value": 18 },
    "defaultDiscount": { "type": "amount", "value": 0 },
    "defaultCurrency": "INR",
    "numberFormat": "INV-{YYYY}-{###}",   // token reference below; sequence resets each FY
    "paymentTerms": "net15",              // drives auto due date (editable per invoice)
    "fyStartMonth": 4               // 4 = April
  },
  "branding": {
    "logoPath": "assets/logo.png", "qrPath": "assets/qr.png",
    "appIcon": { "type": "preset", "preset": "ink" }   // or { "type":"custom", "path":"assets/app-icon.png" }
  }
}
```

**App icon** — the user picks from a few built-in **square** presets, or uploads a custom
**square (1:1)** image (validated; non-square rejected/cropped). Stored in
`branding.appIcon`; used for the in-app logo mark and the PWA icon/favicon (custom icon is
written to `assets/app-icon.png` and referenced from the manifest/favicon at runtime).

### clients.json  (array)
```json
{ "id": "cl_ac…", "name": "Acme Traders", "gstin": "…", "email": "…", "phone": "…",
  "address": "…", "terms": "net15", "preferredCurrency": "INR", "createdAt": "…" }
```

### items.json  (array)
```json
{ "id": "it_co…", "name": "Consulting", "type": "service", "rate": 2500, "tax": 18, "notes": "" }
```
`tax` is used only when `taxMode = item`; ignored in invoice mode.

### invoices/<FY>/<number>.json  (payments embedded)
```json
{
  "number": "INV-2026-042", "clientId": "cl_ac…",
  "client": { "name": "Acme Traders", "gstin": "…", "address": "…" },  // snapshot at save
  "currency": "INR",
  "date": "2026-09-02", "dueDate": "2026-09-18",
  "lines": [ { "itemId": "it_co…", "name": "Consulting", "qty": 10, "rate": 2500, "tax": 18 } ],
  "taxMode": "invoice",             // snapshot of mode at creation
  "tax": { "type": "pct", "value": 18 },      // invoice-level (when taxMode=invoice)
  "discount": { "type": "amount", "value": 0 },
  "notes": "…",
  "subtotal": 47800, "taxAmount": 8604, "discountAmount": 0, "total": 56404,
  "payments": [ { "id": "pay_…", "amount": 2968, "date": "2026-09-02", "method": "upi", "ref": "…" } ],
  "paid": 2968, "balance": 53436, "status": "partial",   // derived, stored for the index
  "updatedAt": "…"
}
```
**Payments live inside the invoice** (authoritative, and `status` derives from them). The
Payments screen and dashboard read the **year index**, which carries payment summary
fields — so neither has to open every invoice file.

### invoices/<FY>/index.json  (one row per invoice)
```json
{ "number": "INV-2026-042", "client": "Acme Traders", "clientId": "cl_ac…",
  "date": "2026-09-02", "total": 56404, "paid": 2968, "balance": 53436,
  "status": "partial", "path": "invoices/2026-27/INV-2026-042.json" }
```

## Local mirror — IndexedDB (`ledger-db`) object stores

- `settings` (singleton) · `clients` · `items`
- `invoices` (keyed by path; includes full doc) · `indexes` (per-FY summaries) · `balances`
- `meta` — `{ lastSync, manifest }`
- `outbox` — queue of pending changes to upload: `{ op, path, payload, baseSha, ts }`

All screens read from these stores → instant. Writes update the store **and** append to
`outbox`.

## Write path (local-first + background upload)

1. User saves (invoice/client/item/payment) → write to IndexedDB → **UI updates instantly**.
2. Recompute affected derived data locally (invoice totals/status, year index row,
   balances) and stage those files too.
3. Append the changed file(s) to the **outbox**.
4. **Background uploader** (debounced, when online) drains the outbox → commits to GitHub.
   The manual **Upload** button flushes it on demand. Outbox length = the "N to upload"
   indicator in Settings.

## Upload (push) — per file
- `GET` the file to read its current `sha` (or use the cached manifest sha).
- `PUT` new content with that `sha`.
- On success: update local manifest sha, remove from outbox.
- On `409/412` (sha mismatch = someone else changed it): **conflict** → pull that file,
  re-apply the local change if safe, else surface it. (See conflict policy.)

## Sync (pull) — always available
- `GET /manifest.json` (or list dirs) → compare remote `sha`s with local manifest.
- Fetch only changed files (conditional `If-None-Match` / ETag) → update IndexedDB.
- Rebuild any local derived caches. Update `lastSync`.
- Missing indexes/balances are **auto-backfilled** from raw files (as the current app does).

## Conflict policy (multi-user)
- Files are small and mostly per-invoice, so real conflicts are rare.
- Default **last-write-wins per file**, but **pull-before-push**: if the remote sha moved,
  re-pull and, for invoices, merge at the field level where possible (e.g., appended
  payments) or warn before overwriting.
- `settings.json`, `clients.json`, `items.json` are the only "hot" shared files → keep them
  small; consider splitting clients/items into per-record files later if teams grow.

## Migration from the current app
- Current `data.json` (`parties`, `items`, `gstRate`) → split into `settings.json`,
  `clients.json` (from `parties`, upgraded to objects), `items.json`.
- Existing `invoices/<year>/*.json`, `index.json`, `balances.json` map over directly;
  add `clientId`, payment summary, and `payments[]` fields (backfilled).
- One-time migration on first load if old-format files are detected.

## Decisions (locked)
1. **Payments**: embedded inside the invoice JSON, with a payment summary duplicated into
   the year `index.json` (so the Payments list / dashboard / reports render without
   opening each invoice). Single source of truth; status derives from `payments[]`.
2. **Conflicts**: per-file `sha`, **pull-before-push**, **last-write-wins + warn**. When
   both sides only appended payments to an invoice, merge by union of payment ids;
   otherwise warn before overwriting.
3. **Sync**: **manifest + ETag incremental** — `manifest.json` maps `path → {sha, updatedAt}`;
   pull compares shas and fetches only changed files (conditional `If-None-Match`).
4. **Year model**: **financial year Apr–Mar**, configurable via `settings.invoicing.fyStartMonth`
   (default `4`). Folders like `invoices/2026-27/`.

## Planning decisions (locked)

**Repo & tenancy** — Separate **private data repo** (app on public Pages stays separate);
**one business per repo**. Connect via **fine-grained PAT** (Contents R/W); app can
**auto-create** the private repo. **Fresh start** — no legacy migration.

**Local-first before connect** — the app is fully usable offline against IndexedDB before
any repo is connected; connecting later uploads the existing local data.

**Invoices** — snapshot **client** (name/gstin/address) and **item** (name/rate) onto the
invoice at save. **Drafts** are savable. **Void/cancel** keeps the record (no hard delete
of finalized invoices; drafts may be deleted). Statuses: `draft | unpaid | partial | paid
| cancelled`; **overdue is derived live** from `dueDate` (not stored). **Due date** auto =
date + terms, editable.

**Tax** — simple **single tax line** (no CGST/SGST/HSN in v1), but modelled so GST detail
can be added later. Applied **per-item or per-invoice** (Settings `taxMode`). Rounding:
**keep paise (2 decimals)**.

**Multi-currency** — per-invoice `currency` (default in Settings, client may have a
preferred one). Reports/Dashboard are **per-currency (no conversion)** — figures grouped
by currency; no exchange rates.

**Payment methods** — fixed list: UPI, Bank transfer, Cash, Cheque, Card.

**Reports (v1)** — minimal: KPIs, revenue by month, top clients, aging (per currency).

### Invoice number tokens (`numberFormat`)
Literal text passes through; tokens are replaced:

| Token  | Meaning                        | Example (2026-09-04, seq 42) |
|--------|--------------------------------|------------------------------|
| `{YYYY}` | 4-digit year                 | `2026` |
| `{YY}`   | 2-digit year                 | `26` |
| `{FY}`   | financial-year label         | `2026-27` |
| `{MM}`   | 2-digit month                | `09` |
| `{MMM}`  | 3-letter month               | `Sep` |
| `{DD}`   | 2-digit day                  | `04` |
| `{#}` … `{####}` | sequence, zero-padded to the number of `#` | `{####}` → `0042` |

Example: `INV-{FY}/{####}` → `INV-2026-27/0042`. Sequence **resets each FY**, derived from
the year `index.json` max + 1.

### Sharing an invoice
- **Self-contained link**: the invoice JSON is compressed + base64-encoded into the URL
  **hash fragment** (`#/view#<payload>`) so it is never sent to a server. A public
  **viewer** page decodes and renders it (read-only, print-capable). Anyone with the link
  can view; it carries no token/credentials.
- **WhatsApp**: open `https://wa.me/?text=…` (or the share sheet on mobile) prefilled with
  the link/summary; the user taps send. **PDF share** is deferred (print for now; a chosen
  template later).

## Implementation notes that follow from these
- The **outbox** stages every changed file (invoice + its year index row + balances) as one
  logical commit unit; the uploader commits them, then updates the local `manifest` shas.
- `manifest.json` is itself committed on every push so other devices can diff cheaply.
- A tiny **migration step** writes `manifest.json` + splits `data.json` on first run.
- Payment-merge on conflict is the only field-level merge; everything else is whole-file
  last-write-wins with a warning toast.
