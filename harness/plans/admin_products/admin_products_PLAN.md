# Admin Products Page — Consolidated FE + BE Build Plan (F-27)

> **TL;DR:** One plan, one folder, for the manager-facing product catalog CRUD screen
> (`/admin/products`) — the write side of the catalog whose read side the customer
> menu consumes. FE and BE are planned together because this page is where catalog
> **mutations** originate: every write here fans out through Redis invalidation to
> `/menu`, `/pos`, and the combo builder. Visual companions:
> [`admin_products_plan.html`](admin_products_plan.html) (the plan),
> [`admin_products_how-it-works.html`](admin_products_how-it-works.html) (runtime
> walkthrough) and [`admin_products_mockup-1.html`](admin_products_mockup-1.html) (UI).
> Source: `reference/docs/system/08_pages/admin/admin_products/` (8 docs incl. a
> source-traced BE walk + a 3-bug register, digested 2026-07-19) reconciled with
> `DB_SCHEMA.md §4.1`, `BE_STATE.md`, `FE_STATE.md` and the F-7 design system.
> **One fact one home:** this file owns the admin-products page's scope, contract,
> and task mapping — rules stay in their owning docs (linked in §2).

---

## 1. What the page is

The manager's catalog console. One route, one table, one modal:

- **Entry:** `/admin/products` inside the admin shell (tab nav). Reached only by
  `manager` or above — the whole `/admin/*` group is role-gated.
- **Core loop:** list every product (including hidden ones) → create / edit /
  toggle availability / delete → the write invalidates caches → downstream
  surfaces rebuild on their next fetch.
- **In/out links:** siblings in the admin shell — `/admin/categories` (a product
  needs a category), `/admin/toppings` (a product allows N toppings),
  `/admin/combos` (a combo is built from these products → `plans/admin_combos/`).
- **Shape:** a header (`Sản phẩm (24)` + `+ Thêm sản phẩm`) over a **table** —
  columns `ảnh · tên · danh mục · giá · toppings · còn hàng · hành động` — with a
  form **modal** overlay for create/edit (tên, danh mục ▾, giá, mô tả, thứ tự,
  ảnh upload, topping checkboxes, công tắc còn hàng).

This is the catalog's **write** surface; `plans/customer_menu/PLAN.md` is its read
surface. The two share one schema slice and one cache map — this plan owns the
mutation half of both.

## 2. Alignment — what governs this page (read, don't restate)

| Concern | Owning doc |
|---|---|
| Tables/columns, field-name law, soft delete | `harness/DB_SCHEMA.md §1–2, §4.1` |
| BE layering, tx policy, error-code enum, validation tiers | `harness/BE_STATE.md` |
| goose+sqlc workflow, migration checklist, Go/Gin gotchas | `harness/BE_PLAYBOOK.md` |
| FE state kinds, cache map, loading tiers, hard rules 1–14 | `harness/FE_STATE.md` |
| Design tokens + form/table/modal components | `harness/diagrams/design-system.html` (F-7) |
| Product scope, phase roadmap, lessons register | `harness/OVERALL_PLAN.md` (F-9) |
| Redis policy | `harness/ARCHITECTURE.md §4` + `OVERALL_PLAN.md §3.6` |
| The catalog **read** contract this page writes into | `plans/customer_menu/PLAN.md §3` |

Reference docs are the **what**; the harness rules are the **how**. Where they
conflict the harness wins (F-9 pattern) — recorded in §3.4 / §7.

**Admin surface = F-7 neutral tokens.** The customer dark/orange shell
(`plans/customer_menu/PLAN.md §7`) stops at the customer surface; admin uses the
neutral design system (PAGE_PLAN_GUIDE §7).

## 3. BE plan

### 3.1 Endpoints the page consumes (all under `/api/v1`)

| # | Route | Auth | Phase/Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /products/all` | **manager+** | AD-P1 | The admin table's read. **Uncached by design** — a manager must see their own write immediately, not within a 5-min TTL. Returns *all* non-deleted rows incl. `is_available=0`. Toppings joined in **one batched query**, never N+1 (§3.4). |
| 2 | `GET /categories` | public | C-2 | Form dropdown. Shared with the customer menu — same `categories:list` cache. |
| 3 | `GET /toppings` | public | C-3 | Form checkboxes. Shared cache `toppings:list`. Returns all non-deleted (not availability-filtered) so a manager can still see a paused topping. |
| 4 | `POST /products` | manager+ | AD-P2 | Create. Body `{category_id, name, description, price, image_path, sort_order, topping_ids[], is_available}` — **`is_available` is honored** (ref dropped it, §6). Attaches toppings, then invalidates (§3.3). Returns the **full product object**, 201. |
| 5 | `PATCH /products/:id` | manager+ | AD-P2 | Update. `topping_ids` omitted = leave the join untouched; `[]` = clear it. 404-guard before write. Returns the **full updated object**. |
| 6 | `PATCH /products/:id/availability` | manager+ | AD-P3 | **Its own handler**, binding only `{is_available: bool}` — the ref pointed this route at the full-update handler, which made the toggle a permanent 400 (§6 bug 1). Returns the full object. |
| 7 | `DELETE /products/:id` | **admin+** | AD-P3 | Soft delete (`deleted_at = NOW()`). **Pre-flight guard**: product on an active order → `409 PRODUCT_IN_USE` (§7 ⚠). 204 on success. |
| 8 | `POST /files/upload` | manager+ | AD-P4 | Image. multipart field `file`, ≤ 10 MB, content-type sniffed from the first 512 bytes, allow `image/jpeg|png|webp` only. Returns `{id, object_path}` → the modal sends `object_path` as `image_path`. **Fails loudly if storage is unconfigured** (ref discarded the bytes silently, §6). |

Errors ride the Session-0 envelope; codes from `BE_STATE.md §4`. **Success
responses are never wrapped** — the reference's `{data:{…}}` / `{message}` shapes
are not adopted (§3.4).

Role split is deliberate and matches FE rule 13: **manager** can create/edit/toggle,
only **admin** can delete. The page itself is manager-gated, so the delete button
renders disabled-with-reason for a manager rather than 403-ing on click.

### 3.2 Schema this page writes (C-1 migration scope — no new tables)

This page mutates the catalog slice already specced in `harness/DB_SCHEMA.md §4.1`:

- `products` — `category_id` (NOT NULL, RESTRICT), `name`, `description`, `price`
  DECIMAL(10,0), `image_path` (relative, law §2), `is_available`, `sort_order`,
  timestamps + `deleted_at`.
- `product_toppings` — the junction this page rewrites on every save.
- `categories` / `toppings` — read-only here (their own admin pages own the writes).
- `file_attachments` — `DB_SCHEMA.md §4.7` stub; the upload writes a row with
  `is_orphan = 1`. **This plan promotes one rule:** the row flips to `is_orphan = 0`
  when a product save references its `object_path` (§6 — the ref never un-orphaned,
  so every uploaded image stayed orphan-flagged forever and no cleanup was safe).

No column is added for this page. `filling` never returns (law §2).

### 3.3 Cache map (the AD-P2/P3 acceptance criterion)

| Write | DEL keys |
|---|---|
| product create / update / delete | `products:list`, `categories:list`, `product:<id>` |
| product availability toggle | same — a hidden product must leave `products:list` |
| topping write (sibling page) | `toppings:list`, `products:list` (+ every `product:<id>` joined to it) |
| category write (sibling page) | `categories:list`, `products:list` |

Cache-aside in services only, 5-min TTL, fail-open to MySQL (`BE_STATE.md §7`).
`GET /products/all` participates in **none** of these keys — it is the uncached
read (§3.1 #1). Combos cache (`combos:list`) is invalidated by the **combo** page,
but a product write that changes a name/price a combo displays must also DEL
`combos:list` → see `plans/admin_combos/PLAN.md` (cross-page invalidation).

### 3.4 Not adopted from the reference BE (decided here)

- ❌ **`{data:{id}}` / `{message}` response wrappers.** Our writes return the full
  object, unwrapped (lesson 7 — thin DTOs caused "Đơn #undefined"; the same class
  of bug makes an admin table refetch just to learn what it already wrote).
- ❌ **One handler for two routes.** `PATCH /:id` and `PATCH /:id/availability` get
  separate handlers with separate request structs — the shared handler *was* bug 1.
- ❌ **Bearer tokens.** Cookie JWT (F-5) everywhere.
- ❌ **N+1 topping resolution** (ref looped `GetToppingsByProductID` per product and
  swallowed the errors). One batched join query; a topping-join failure is an error,
  not a silent empty list.
- ❌ **Silent image discard** when the storage path is unconfigured — startup
  validates the storage config; upload 500s loudly rather than writing a DB row that
  points at nothing.
- ❌ **Seed-only write endpoints** (`POST /categories|/toppings|/staff` fired from a
  `🌱 Dữ liệu mẫu` button). Seeding is a migration/SQL concern (C-1), not a
  production endpoint reachable from a UI button.

### 3.5 Wire shapes (the FE↔BE object gallery)

> Field spellings get **frozen by curl receipts** when these rows build (gate 8:
> `fe/src/lib/api/types.ts` is written from receipts, never guessed). Nullable
> columns serialize as real `null` (F-16), never `""`.

**`GET /products/all` → 200** — all rows, toppings pre-joined, `category_name`
denormalized for the table's Danh mục column:

```json
[ { "id": "p12…36", "name": "Bánh cuốn trứng", "description": "…",
    "price": 35000, "image_path": "uploads/9f2…c1.jpg",
    "category_id": "c1a2…36", "category_name": "BÁNH CUỐN",
    "is_available": true, "sort_order": 5,
    "toppings": [ { "id": "t1…", "name": "Nhân thịt", "price": 0 } ] } ]
```

**`POST /products` request** — `image_path` is the `object_path` returned by #8:

```json
{ "category_id": "c1a2…36", "name": "Bánh cuốn trứng vịt lộn",
  "description": "Bánh cuốn đặc biệt nhân trứng vịt lộn",
  "price": 55000, "sort_order": 5,
  "image_path": "uploads/9f2…c1.jpg",
  "topping_ids": ["t7…36"], "is_available": true }
```

→ **201**: the full product object (same shape as a `GET /products/all` row).

**`PATCH /products/:id/availability` request** — the whole body, nothing else:

```json
{ "is_available": false }
```

→ **200**: the full product object. This is the shape the ref documented and never
implemented (§6 bug 1).

**`POST /files/upload` → 201**

```json
{ "id": "f3a…36", "object_path": "uploads/9f2…c1.jpg" }
```

**`DELETE /products/:id`** → `204` — or, when the product sits on an active order:

```json
{ "error": { "code": "PRODUCT_IN_USE",
             "message": "Sản phẩm đang có đơn hàng đang xử lý, không thể xoá",
             "details": [ { "field": "id", "issue": "active_order_items=3" } ] } }
```

**Validation failure — one envelope, every endpoint:**

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Dữ liệu không hợp lệ",
             "details": [ { "field": "price", "issue": "gt=0" } ] } }
```

`client.ts` turns the envelope into a thrown `ApiError{status, code, message,
details}`; the form maps `details[].field` onto the matching input (§4.4 B7).

## 4. FE plan

### 4.1 Route + file map (extends `FE_STATE.md §8` — exact paths)

```
fe/src/app/(admin)/admin/products/
  page.tsx                 # RSC: prefetch products/categories/toppings → HydrationBoundary
  loading.tsx              # table-shaped skeleton (header + 8 placeholder rows)
  error.tsx                # segment retry
components/admin/products/
  ProductsHeader.tsx       # "Sản phẩm (24)" count + "+ Thêm sản phẩm"
  ProductsToolbar.tsx      # client search (?q=) + category filter (?cat=) — URL-owned
  ProductsTable.tsx        # 5 named render branches (§4.3); row = image, name, category,
                           #   price, topping chips, availability badge, actions
  AvailabilityBadge.tsx    # the toggle — pending/disabled state per row (ref had none)
  ProductRowActions.tsx    # ✎ edit · 🗑 delete (delete disabled-with-reason for manager)
  ProductFormModal.tsx     # RHF + Zod; create/edit; server-error → field mapping
  ProductImageField.tsx    # upload → preview → object_path; own pending + error state
  ToppingCheckboxes.tsx    # topping multi-select, own loading branch (ref had none)
  DeleteProductDialog.tsx  # typed confirm, shows what will happen (not window.confirm)
queries/admin-products.ts  # useAdminProducts / useCreate / useUpdate / useToggle / useDelete
lib/product-schema.ts      # THE one Zod schema — form + payload builder share it
```

Not ported: the `🌱 Dữ liệu mẫu` seed button and its three write endpoints (§3.4);
`window.confirm()` for delete (replaced by a real dialog).

### 4.2 State ownership (instance of `FE_STATE.md §1` — no new kinds)

| Data | Kind | Owner |
|---|---|---|
| product list | server | TanStack Query `['admin','products']`, `staleTime` 30 s |
| categories / toppings | server | Query `['categories']` / `['toppings']`, `staleTime` 60 s — shared with the customer menu's cache |
| search text, category filter | URL (`?q=`, `?cat=`) | FE rule 2 — shareable, survives reload |
| form values | form | RHF + Zod (`lib/product-schema.ts`) |
| uploaded `image_path` (pre-save) | form | RHF field, set by `ProductImageField` on upload success |
| modal open / edit target | local | `useState` in `page.tsx` |
| staff session + role | session | httpOnly cookie + server verify — no auth store |

**How state crosses components:** only the Query cache and the form. The modal's
category/topping dropdowns read the *same* query keys the customer menu uses — one
fetch, one source of truth, no props threaded. There is **no Zustand store on this
page**: nothing here is client state that outlives a route (FE rule 1's decision
flow lands on Query/URL/RHF for every row above).

**How state crosses pages:** purely server-side — MySQL row + Redis eviction (§3.3).
There is no SSE push and no localStorage handoff; `/menu`, `/pos`, and
`/admin/combos` pick up a change on their next fetch. Worst-case staleness =
their `staleTime` + the 5-min TTL. Two consequences this plan accepts:

1. A manager's own writes are instant on this page (uncached `GET /products/all` +
   `invalidateQueries(['admin','products'])`).
2. A customer's menu can lag a price change by up to ~5 min. That is the designed
   bound, and it is safe because **orders snapshot `name`/`unit_price` at
   order-create time** (`DB_SCHEMA.md §4.3`) — a catalog edit never rewrites a
   placed order. This durability boundary is the reason the whole page can be
   cache-invalidation-based instead of realtime.

### 4.3 Loading strategy (instance of `FE_STATE.md §4–5` — three tiers, never stacked)

**Tier 1 — route:** RSC `page.tsx` prefetches the three queries → `HydrationBoundary`
→ zero-spinner first paint. `loading.tsx` is a **table-shaped skeleton** (header row
+ 8 placeholder rows at real column widths). Deliberate upgrade: the reference
shipped a bare `<p>Đang tải...</p>` that collapsed the table area to one line and
shifted the layout when data landed, plus a blank null-render while auth resolved.

**Tier 2 — component. Five render branches, all named, all built:**

| Branch | When | UI |
|---|---|---|
| loading | `isPending`, no cached data | skeleton rows (no layout shift) |
| error | query failed | inline retry panel: "Không tải được danh sách sản phẩm" + Thử lại |
| empty | 0 products | `EmptyState` — "Chưa có sản phẩm nào" + a create CTA |
| filtered-empty | `?q=`/`?cat=` matches nothing | "Không tìm thấy sản phẩm phù hợp" + clear-filter action (**distinct from empty** — the ref conflated them) |
| data | default | the table |

The modal's two sub-queries get their **own** loading branches (the ref degraded
them silently to empty text, so "no categories yet" and "categories still loading"
looked identical and the Save button was mysteriously disabled).

**Tier 3 — mutation: pessimistic, every write** (FE rule 4 — optimistic is
cart-only). Each mutation owns visible pending state:

| Mutation | Pending UI |
|---|---|
| Save (create/update) | submit disabled + "Đang lưu…"; modal stays open on error |
| Toggle availability | **that row's badge** disabled + spinner (ref left it clickable → double-fire) |
| Delete | dialog's confirm disabled + "Đang xoá…" |
| Image upload | field-local "Đang tải ảnh…"; the form stays usable |

On error the envelope message renders in place (field-mapped when `details` name a
field) — never a toast that disappears before it is read, never a full-page overlay.

### 4.4 Page behaviors (the spec the AC will test)

1. **Role gating is visible, not just enforced.** Page requires manager+; the
   delete action renders **disabled with a reason tooltip** for a manager instead of
   firing a 403. Below manager: "Không có quyền truy cập trang này".
2. **The table shows everything**, including `is_available=0` rows (dimmed) — this is
   the one surface where hidden products must be visible.
3. **Availability toggles in one click** and the row reflects it — the single most
   important fix on this page (§6 bug 1). Optimism is **not** used; the badge shows
   pending, then the server's truth.
4. **Create is two-step, decoupled:** upload the image first (own progress + errors),
   then submit the form. A failed upload never blocks filling the form; a product can
   be saved with no image.
5. **Edit pre-fills every field**, including current toppings; omitting `topping_ids`
   leaves the join alone, sending `[]` clears it (explicit, not inferred).
6. **Delete is guarded twice** — a typed confirm dialog naming the product on the FE,
   and the active-order `409` on the BE. The dialog states the consequence: the dish
   leaves the menu; existing orders are unaffected.
7. **Server validation maps onto fields.** `409` name-conflict → inline
   "Tên sản phẩm đã tồn tại" on the name input; `VALIDATION_FAILED` details map by
   `field`. One Zod schema (`lib/product-schema.ts`) is the client half.
8. **Search + category filter are client-side and URL-owned** (`?q=`, `?cat=`) —
   the catalog is ~tens of items; one fetch + client filter beats param plumbing
   (same call as the customer menu, and the ref shipped no search at all).
9. **Prices display via `formatVND()`** in the house format (`35.000 đ`), and are
   **entered** as a plain integer with a `đ` affix — one formatter, FE rule 12.
10. **Images use relative `image_path` + `buildImageURL()`** (FE rule 14); the table
    renders a fixed-aspect thumb so rows never reflow.
11. **VN-first copy**, one constants file, the reference's strings kept: "Sản phẩm",
    "+ Thêm sản phẩm", "Đang tải…", "Chưa có sản phẩm nào", "Đã thêm sản phẩm",
    "Đang lưu…", "Chọn ảnh"/"Đổi ảnh", "Còn hàng"/"Hết hàng", "Xoá".
12. **Worked example everywhere** (docs, seeds, screenshots): "Bánh cuốn trứng vịt
    lộn" · danh mục BÁNH CUỐN · 55.000 đ · thứ tự 5 · topping "Hành phi" — the
    reference's canonical create example, kept so numbers match across every doc.

## 5. Task mapping — where this plan lands in TASKS.md

The admin surface is the **AD phase** (`OVERALL_PLAN.md §8`); `TASKS.md` currently
carries admin as one deferred Phase-4 row. This plan proposes the split below —
**rows get registered when the AD phase opens** (CLAUDE.md: register before work),
and this section is the registration source.

| Proposed row | This plan's slice | Receipt type |
|---|---|---|
| C-1 (existing) | §3.2 catalog tables + seed incl. the worked example | migrate up/down + seed counts |
| AD-P1 | §3.1 #1 `GET /products/all` (role-scoped, uncached, batched topping join) | curl: manager 200 / cashier 403; N+1 absent from query log |
| AD-P2 | §3.1 #4–5 create + update + §3.3 invalidation | curl: create→200 full object, DEL proof, topping replace |
| AD-P3 | §3.1 #6–7 availability toggle + guarded delete | curl: toggle flips the column; delete 409 on active order, 204 otherwise |
| AD-P4 | §3.1 #8 upload + the `is_orphan` flip | curl: 10 MB reject, bad-type reject, orphan→referenced |
| AD-P5 | §4.1 FE table + toolbar + 5 branches | screenshots per branch |
| AD-P6 | §4.1 FE form modal + image field + delete dialog | screenshots + a validation round-trip |

Sizing: AD-P5/P6 are the biggest and may split again at registration (table/toolbar
vs modal/upload), per the 1-session rule.

## 6. Reference defects designed out

| Ref finding | Our countermeasure |
|---|---|
| 🔴 Availability toggle is a permanent 400 — route pointed at the full-update handler, which also never wrote the column; the correct query existed but was wired to nothing | dedicated route + handler + service method binding only `{is_available}` (§3.1 #6); AC flips the column and the customer menu drops the dish |
| 🟡 `POST /products` silently drops `is_available` (INSERT hardcodes 1) | `is_available` is a real create field, threaded to SQL (§3.1 #4) |
| 🟠 `DELETE` has no active-order guard; the FE's 409 branch was dead code | BE emits `409 PRODUCT_IN_USE`; the FE branch that handles it is now reachable (§3.1 #7) |
| N+1 topping resolution, topping errors silently swallowed | one batched join; join failure is a real error (§3.4) |
| Image bytes discarded when storage env unset — `image_path` pointed at nothing | storage config validated at startup; upload fails loudly (§3.4) |
| Uploaded files stay `is_orphan=1` forever → no safe cleanup | the flag flips on reference (§3.2) |
| Bare `<p>Đang tải...</p>`, no skeleton → layout shift | table-shaped skeleton (§4.3) |
| Blank null render while auth resolves | route-level skeleton covers the auth window (§4.3) |
| Delete/toggle mutations had no pending UI → double-click re-fires | per-row pending + disabled (§4.3 tier 3) |
| Modal sub-queries had no loading branch → "loading" and "none exist" looked identical | explicit branches (§4.3) |
| `window.confirm()` for a destructive action | real dialog stating the consequence (§4.4 B6) |
| Empty vs filtered-empty conflated | two distinct branches (§4.3) |
| Seed-write endpoints reachable from a UI button | not adopted; seeding is C-1 SQL (§3.4) |

## 7. Decisions + flags

- ✅ **Admin list stays uncached** — a manager must see their own write instantly.
  The cost is one full read per 30 s per manager; the catalog is small.
- ✅ **Writes are pessimistic** (FE rule 4). The availability toggle is the tempting
  optimistic case and is deliberately not — a silently-reverted toggle is exactly
  the failure the reference already shipped.
- ✅ **Delete = admin+, everything else manager+** (reference's split, kept) — with
  the button disabled-with-reason rather than a 403 on click.
- ✅ **Client-side search/filter, URL-owned** — consistent with the menu plan's call.
- ⚠️ **FLAG — delete guard is a business decision.** The reference left this open
  ("owner decision needed"). **Plan default: guard + `409 PRODUCT_IN_USE`**, because
  the FE was already written for it and a dish vanishing mid-service is worse than a
  blocked delete. Historical orders are safe either way (snapshot). Say so before
  AD-P3 if delete-anytime should win.
- ⚠️ **FLAG — `file_attachments` is still a `DB_SCHEMA.md §4.7` stub.** AD-P4 needs
  its columns promoted to full spec (`object_path`, `is_orphan`, `uploaded_by`,
  `mime_type`, `size_bytes`). Doing that is part of AD-P4's scope contract, per the
  "stub → promoted in the same task" rule.
- 💡 **SUGGESTION — bulk availability.** Service reality is "we're out of X and Y";
  a multi-select + bulk toggle would be one endpoint and a real time-saver. Out of
  scope for v1; revisit after AD-P3 ships and the single toggle is proven.
- ❓ **CLARIFY — image cleanup job.** Flipping `is_orphan` makes cleanup *possible*;
  nobody has decided *who deletes* the orphans (cron? manual?). Deferred to the OPS
  phase; the flag is correct regardless.

## 8. Verify plan (per-task receipts, logged in `harness/VERIFICATION.md`)

- **BE rows:** curl transcripts incl. role matrix (manager vs admin vs cashier),
  cache DEL proof after each write, the availability column actually flipping, the
  `409` on a guarded delete, and upload rejects (size + type).
- **FE rows:** screenshots per render branch (§4.3) + a create→edit→toggle→delete
  round-trip + one server-validation-to-field mapping.
- **Cross-page:** one transcript proving a toggle here removes the dish from
  `GET /products` (the customer menu's read) after invalidation.
- **This plan itself (F-27):** folder holds the 4 docs, MD complete, all three HTML
  render both themes — receipt row dated 2026-07-19.

---

*Written by F-27 (2026-07-19) from the reference admin_products corpus (8 docs,
incl. a source-traced BE walk and its 3-bug register). Task status lives in
`TASKS.md`; rules live in the docs in §2; this file owns only the admin-products
page's scope, contract, and mapping. The combo page builds on this contract —
`plans/admin_combos/admin_combos_PLAN.md` cross-links it rather than re-deriving it.*
