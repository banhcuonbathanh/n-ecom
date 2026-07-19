# Admin Combos Page — Consolidated FE + BE Build Plan (F-28)

> **TL;DR:** One plan, one folder, for the manager-facing combo ("suất") builder
> (`/admin/combos`) — the page where products are composed into the bundles the
> customer menu sells. It is planned **on top of** the product contract:
> `plans/admin_products/admin_products_PLAN.md` owns products, and this file
> **cross-links it rather than re-deriving it** (the picker, the retail sum, and
> every chip name come from `GET /products/all`). Visual companions:
> [`admin_combos_plan.html`](admin_combos_plan.html),
> [`admin_combos_how-it-works.html`](admin_combos_how-it-works.html),
> [`admin_combos_mockup-1.html`](admin_combos_mockup-1.html).
> Source: `reference/docs/system/08_pages/admin/admin_combos/` (8 docs, incl. a
> source-traced BE walk, a 4-bug register and two doc-vs-code audits) + the older
> `fe/wireframes/admin_main/admin_main_combos/` draft — digested 2026-07-19 by an
> Explore agent — reconciled with `DB_SCHEMA.md §4.1`, `BE_STATE.md`, `FE_STATE.md`.
> **One fact one home:** this file owns the admin-combos page's scope, contract and
> task mapping — rules stay in their owning docs (§2), products stay in F-27.

> **⚠️ Two sources, one wins.** The `08_pages/admin/admin_combos/*` set is a
> source-trace of the running reference code (the audit found **zero** doc-vs-code
> contradictions). The `fe/wireframes/admin_main_combos/*` set is a 2026-05-26 draft
> that was **never built** — it specifies components, endpoints, fields and copy that
> do not exist. Where they disagree, the traced set is reality; §6 lists what the
> draft invented so nobody builds against it by accident.

---

## 1. What the page is

The manager's combo builder. In this restaurant a combo is called a **"Suất"**.

- **Entry:** `/admin/combos` in the admin shell tab nav (`Tổng quan · Tổng kết ·
  Sản phẩm · Combo · Danh mục …`). Manager+ only. No `:id` route, no deep link —
  create/edit is a **modal**, not a page.
- **Core loop:** list → create (modal) → edit (same modal, prefilled) → delete
  (admin only). Every write DELs `combos:list`, which the customer menu reads.
- **How a combo is composed:** tick products in a picker → each ticked row gets a
  `[−] n [+]` quantity stepper → the form shows `Tổng giá lẻ` (Σ product price ×
  qty, computed client-side) → the manager **types the combo price manually**; the
  system only *suggests* 90 % of retail rounded to 1.000 đ → save.
- **Shape:** a header (`Combo (N)` + `+ Thêm combo`) over a **table** — columns
  `Tên combo · Sản phẩm trong combo (chips) · Giá combo · Giá lẻ · Tiết kiệm ·
  hành động`. `Giá lẻ` and `Tiết kiệm` are **derived on the client**, never stored.
- **In/out links:** no navigation out. The real coupling is **data-level and
  one-directional**: this page cannot render correctly without the products
  contract (F-27 §3.1 #1) — product names, retail prices and the whole picker come
  from it. That dependency is this page's defining risk (§4.2, §6).

## 2. Alignment — what governs this page (read, don't restate)

| Concern | Owning doc |
|---|---|
| **The product contract this page consumes** | `plans/admin_products/admin_products_PLAN.md §3.1 #1, §3.5` |
| Tables/columns, field-name law, soft delete | `harness/DB_SCHEMA.md §1–2, §4.1` |
| BE layering, **tx policy**, error-code enum, validation tiers | `harness/BE_STATE.md` |
| goose+sqlc workflow, migration checklist | `harness/BE_PLAYBOOK.md` |
| FE state kinds, cache map, loading tiers, hard rules 1–14 | `harness/FE_STATE.md` |
| Design tokens + table/modal/form components | `harness/diagrams/design-system.html` (F-7) |
| The combo **read** contract (customer side) | `plans/customer_menu/PLAN.md §3.1 #3, §3.5` |
| Combo→order expansion (₫0 header + child rows) | `harness/DB_SCHEMA.md §4.3` |

Admin surface ⇒ **F-7 neutral tokens**, not the customer dark/orange shell.

## 3. BE plan

### 3.1 Endpoints the page consumes (all under `/api/v1`)

| # | Route | Auth | Phase/Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /combos/all` | **manager+** | AD-C1 | **New in our build.** The management read — *all* non-deleted combos incl. `is_active=0`. Uncached, mirroring `GET /products/all`. The reference had no such route: its admin table reused the public available-only endpoint, so a hidden combo became invisible *and* uneditable (§6 bug 1). |
| 2 | `GET /combos` | public | C-3 | The customer read — active only, cached `combos:list`. Contract owned by `plans/customer_menu/PLAN.md §3.1 #3`. |
| 3 | `GET /products/all` | manager+ | AD-P1 | The picker + the name/price join. **Owned by F-27** — not re-specced here. |
| 4 | `POST /combos` | manager+ | AD-C2 | Create. `{name, description, price, sort_order, category_id, image_path, is_active, items[]}`. **In one transaction** with its `combo_items` (§3.4). Returns the **full combo object**, 201. |
| 5 | `PATCH /combos/:id` | manager+ | AD-C2 | Update. Items are **replace-all** (delete + re-insert) inside the same tx. **Omitted fields are preserved** — the ref NULLed `image_path`/`category_id` on every edit (§6 bug 2). Returns the full object. |
| 6 | `PATCH /combos/:id/active` | manager+ | AD-C3 | **New in our build.** Hide/show a combo — the reference had *no way at all* to take a combo off the menu (§7 ⚠). Body `{is_active: bool}` only. |
| 7 | `DELETE /combos/:id` | **admin+** | AD-C3 | Soft delete. **Existence check** (404 on unknown id — the ref returned 204 for anything) + **in-use guard** → `409 COMBO_IN_USE` when on an active order. 204 otherwise. |
| 8 | `POST /files/upload` | manager+ | AD-P4 | Combo image. Same endpoint and rules as products — **owned by F-27 §3.1 #8**. |

Validation is **one shared validator** for create and update: `name` required,
`price` ≥ 1, `items` required **min 2**, each item `quantity` ≥ 1. The reference let
create and update drift (`min=0`/no item minimum vs `min=1`/`min=2`), so the API
accepted a price-0, zero-item combo that it would then refuse to edit (§6 bug 4).

### 3.2 Schema this page writes (no new tables — `DB_SCHEMA.md §4.1`)

- **`combos`** — same shape as `products` (`name`, `description`, `price` NOT NULL =
  what the customer pays, `image_path`, `sort_order`, std timestamps + `deleted_at`)
  with one difference: `category_id CHAR(36) NULL FK→categories SET NULL`.
- **`combo_items`** — `{id, combo_id FK→combos CASCADE, product_id FK→products
  RESTRICT, quantity INT CHECK > 0}`, no soft delete (template rows, hard-replaced
  on every edit).

**No column is added.** In particular there is **no `retail_sum`, no `savings`, no
`old_price` column** — retail and savings are derived, never stored (`DB_SCHEMA.md
§1`: derived facts get no column). The wireframe draft's strikethrough "old price"
required a price-history field that does not exist and was never built (§6).

**⚠️ Field-name ruling — `is_active`, not `is_available`.** `DB_SCHEMA.md §4.1`
currently describes the combos flag as `is_available` (inherited from "same shape as
products"), but `plans/customer_menu/PLAN.md §3.5` already publishes
`"is_active": true` in the `GET /combos` wire shape — and both pages consume the
**same endpoint**, so they cannot disagree. **Ruling: `is_active`**, matching the
harness-wide convention (`categories`, `staff`, `tables` all use `is_active`).
`DB_SCHEMA.md §4.1` gets corrected in AD-C1's scope contract (CLAUDE.md rule 5 —
docs drift is a bug, fixed in the same task).

`combo_items.product_id` is **RESTRICT**: a product referenced by a combo cannot be
hard-deleted. That is the DB's only protection today and it is not surfaced as a
friendly error — §3.3 and §6 fix that.

### 3.3 Cache map (the AD-C2/C3 acceptance criterion)

| Write | DEL keys |
|---|---|
| combo create / update / delete / active-toggle | `combos:list` |
| **product** create / update / delete / availability (F-27) | `products:list`, `categories:list`, `product:<id>`, **+ `combos:list`** |

The second row is **new and load-bearing.** The reference invalidated `combos:list`
only from combo writes, reasoning that a combo write changes no product row — true,
but the inverse is false: a **product** price or name change alters what every combo
containing it displays and what it is worth. The two lists therefore drifted apart
until their own TTLs lapsed. Our rule: **a product write also DELs `combos:list`.**
This is an addition to F-27 §3.3 and is recorded in both plans.

Cache-aside in services only, 5-min TTL, fail-open (`BE_STATE.md §7`).
`GET /combos/all` and `GET /products/all` are uncached by design.

### 3.4 Not adopted from the reference BE (decided here)

- ❌ **Non-transactional item writes.** The ref inserted the combo header, then
  looped item inserts, `slog.Warn`-ing and continuing on failure — so a bad
  `product_id` produced a `201` for a combo with missing items, and a failed *edit*
  left the combo with **fewer items than it started with** (items are deleted before
  re-insert). Ours wraps header + items in **one transaction** (`BE_STATE.md §3`);
  an item failure rolls the whole write back and returns a mapped 400/409.
- ❌ **`{data:{id}}` / `{message}` responses.** Writes return the full object.
- ❌ **Available-only read for the management table** (§3.1 #1).
- ❌ **`PATCH` that NULLs omitted fields** (§6 bug 2).
- ❌ **The `🎲 Random combo` button** and its 3 parallel POSTs. It is a demo
  affordance whose success toast ("Đã tạo 3 combo ngẫu nhiên!") fired even when 2 of
  the 3 writes failed, because `Promise.allSettled` never rejects. Seeding belongs
  in C-1 SQL, not in a production UI button.
- ❌ **`window.confirm()`** for delete — a real dialog (§4.4 B7).
- ❌ **Client-side de-dup of the picker by `name`** (§6).

### 3.5 Wire shapes (the FE↔BE object gallery)

> Frozen by curl receipts at build time (gate 8). Nullable columns serialize as real
> `null` (F-16).

**`GET /combos/all` → 200** — management read. **Items carry `product_name` and
`unit_price`, server-joined** — this is a deliberate divergence from the customer
endpoint's ids-only shape, and it kills a whole bug class (§6):

```json
[ { "id": "cb1…36", "name": "Suất Đầy Đủ Trứng Chín", "description": null,
    "price": 28000, "image_path": null, "category_id": null,
    "is_active": true, "sort_order": 1,
    "retail_total": 30000,
    "items": [
      { "id": "ci1…", "product_id": "p9…36", "product_name": "Bánh Trứng Chín",
        "unit_price": 9000, "quantity": 1, "product_deleted": false },
      { "id": "ci2…", "product_id": "p4…36", "product_name": "Bánh Cuốn Thịt",
        "unit_price": 4000, "quantity": 3, "product_deleted": false } ] } ]
```

`retail_total` and `product_deleted` are **computed, not columns** — the server is
the one place that can compute them correctly even when a product has been
soft-deleted. `savings` is deliberately *not* sent: it is `retail_total − price`,
one subtraction, and `FE_STATE.md` rule 11 says derived values stay derived.

**`POST /combos` request:**

```json
{ "name": "Suất Đầy Đủ Trứng Chín", "description": null, "price": 28000,
  "sort_order": 1, "category_id": null, "image_path": null, "is_active": true,
  "items": [ { "product_id": "p9…36", "quantity": 1 },
             { "product_id": "p4…36", "quantity": 3 },
             { "product_id": "pg…36", "quantity": 1 } ] }
```

→ **201**: the full combo object (same shape as a `GET /combos/all` row).

**`PATCH /combos/:id`** — same body; **omitted scalar fields are preserved**, and
`items` when present is replace-all. **`PATCH /combos/:id/active`** — `{"is_active":
false}` only. Both → 200 + the full object.

**`DELETE /combos/:id`** → 204, or:

```json
{ "error": { "code": "COMBO_IN_USE",
             "message": "Combo đang có trong đơn hàng đang xử lý, không thể xoá",
             "details": [ { "field": "id", "issue": "active_order_items=2" } ] } }
```

**Deleting a product still used by a combo** (raised by F-27's `DELETE /products/:id`,
specified here because this page owns the relationship):

```json
{ "error": { "code": "PRODUCT_IN_USE",
             "message": "Sản phẩm đang nằm trong 2 combo, không thể xoá",
             "details": [ { "field": "id", "issue": "combos=2" } ] } }
```

**Validation failure — one envelope:**

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Dữ liệu không hợp lệ",
             "details": [ { "field": "items", "issue": "min=2" } ] } }
```

## 4. FE plan

### 4.1 Route + file map (extends `FE_STATE.md §8`)

The reference was **one 552-line `page.tsx`** with everything inline. Ours is
decomposed — and the wireframe draft's component names are *not* a guide (they were
never built, §6):

```
fe/src/app/(admin)/admin/combos/
  page.tsx                  # RSC: prefetch combos + products → HydrationBoundary
  loading.tsx               # table-shaped skeleton
  error.tsx                 # segment retry
components/admin/combos/
  CombosHeader.tsx          # "Combo (5)" + "+ Thêm combo"
  CombosTable.tsx           # 5 named render branches (§4.3)
  ComboItemChips.tsx        # per-item chips — name ×qty, deleted-product warning state
  ComboSavingsCell.tsx      # Giá lẻ + Tiết kiệm, incl. the "no longer saves" warning
  ActiveBadge.tsx           # the is_active toggle (new — ref had none)
  ComboFormModal.tsx        # RHF + Zod scalars; hosts the picker
  ProductPicker.tsx         # search + list + per-row qty stepper; own loading branch
  ComboSummaryPanel.tsx     # "Các món đã chọn", Tổng giá lẻ, price suggestion, savings hint
  DeleteComboDialog.tsx     # typed confirm (replaces window.confirm)
queries/admin-combos.ts     # useAdminCombos / useCreate / useUpdate / useToggleActive / useDelete
lib/combo-schema.ts         # THE one Zod schema — mirrors the server's shared validator
```

Not ported: the `🎲 Random combo` button (§3.4), the wireframe's strikethrough
old-price column, and the duplicated `RawCombo`/`ComboRaw` wire types (one shared
type in `lib/api/types.ts`).

### 4.2 State ownership (instance of `FE_STATE.md §1`)

| Data | Kind | Owner |
|---|---|---|
| combo list | server | Query `['admin','combos']`, `staleTime` 30 s |
| product list (picker + join) | server | Query `['admin','products']` — **the same key F-27's page uses**, one fetch, one source of truth |
| picker search text | URL (`?pq=`) | FE rule 2 |
| combo list search | URL (`?q=`) | FE rule 2 |
| scalar form fields (name, price, description, sort_order) | form | RHF + Zod |
| **selected items** (`product_id → quantity`) | form | a `Record<string, number>` map held in the modal — **not `useFieldArray`** (see below) |
| modal open / edit target | local | `useState` |

**Why a `Record` and not `useFieldArray`.** The reference kept items in
`useState<Record<product_id, quantity>>` outside RHF, and that call is *correct* and
is kept: toggling and de-duping are O(1), and **duplicate `product_id`s become
structurally impossible**. `useFieldArray` would buy per-row RHF validation at the
cost of needing an explicit duplicate guard. We keep the map, and validate it at
submit against the same Zod schema the server mirrors (`lib/combo-schema.ts`).

**KEY: how the builder gets products — and the dependency's sharp edge.** The picker
reads `['admin','products']` (`GET /products/all`, F-27 §3.1 #1). The reference let
that query default to `[]` **with no loading or error guard**, so before it settled
the table rendered **raw UUID chips** and `Giá lẻ`/`Tiết kiệm` as `—`. Our fix is
two-layered:

1. **Server-side (the real fix):** `GET /combos/all` returns `product_name` +
   `unit_price` + `retail_total` per §3.5, so the management table **never depends
   on the products query to render correctly**. The picker still needs products; the
   table does not.
2. **Client-side:** the picker has its own explicit loading / error / empty branches
   (§4.3) instead of silently rendering a blank box.

**KEY: what happens when a referenced product changes.** This was the reference's
biggest hole — there was no linkage in either direction. Our rules:

| Event | Behavior |
|---|---|
| Product **renamed** | Chips follow automatically (server joins the name at read). |
| Product **price changed** | The combo's own `price` is untouched (correct — it's independent). But `retail_total` moves, so a combo can silently stop saving money. **We surface it:** when `price ≥ retail_total`, `ComboSavingsCell` renders a warning state instead of a bare `—` (§4.4 B5). The product write also DELs `combos:list` (§3.3) so the change is visible promptly. |
| Product **soft-deleted** | `combo_items` survives (no cascade on soft delete). The server marks that item `product_deleted: true` and excludes it from `retail_total`; the chip renders in a **warning state naming the problem**, not a raw UUID. Opening the combo for edit shows the dead item explicitly so the manager can remove it — the reference made it *invisible in the modal and silently re-saved it*. |
| Product **hard-deleted** | Blocked by `combo_items.product_id` RESTRICT — surfaced as `409 PRODUCT_IN_USE` with the combo count (§3.5), not a raw FK error. |

**Cross-page:** purely server-side (MySQL + Redis eviction), pull-only, no SSE. Two
managers in two tabs do not see each other's edits until their own `staleTime`
lapses. Downstream, at order time the combo template **expands** into `order_items`:
one header row (`combo_id`, `unit_price = 0`) + N child rows via `combo_ref_id`
carrying server-snapshotted prices — so a later combo edit or delete **never**
rewrites a placed order (`DB_SCHEMA.md §4.3`). That snapshot is why this whole page
can be cache-based rather than realtime.

### 4.3 Loading strategy (`FE_STATE.md §4–5` — three tiers, never stacked)

**Tier 1 — route:** RSC prefetches both queries → `HydrationBoundary`.
`loading.tsx` is a **table-shaped skeleton** (the ref used a bare
`<p>Đang tải...</p>` that collapsed the table to one line, plus a fully blank screen
while auth resolved).

**Tier 2 — component. Five named branches** (the ref had three, and **no error
branch at all** — a failed fetch rendered "Chưa có combo nào", telling the manager
they had no combos when the request had actually failed):

| Branch | When | UI |
|---|---|---|
| loading | `isPending`, no cached data | skeleton rows |
| **error** | query failed | inline retry: "Không tải được danh sách combo" + Thử lại |
| empty | 0 combos | "Chưa có combo nào. Nhấn + Thêm combo để bắt đầu." + CTA |
| filtered-empty | `?q=` matches nothing | "Không tìm thấy combo phù hợp" + clear filter |
| data | default | the table |

The **product picker owns the same five branches independently** — loading, error,
empty ("Chưa có sản phẩm nào — thêm sản phẩm trước"), filtered-empty ("Không tìm
thấy sản phẩm phù hợp"), data. The reference had none: opening the modal early gave
a blank bordered box with no explanation.

**Tier 3 — mutation: pessimistic** (FE rule 4). Save → disabled + "Đang lưu…";
active-toggle → that row's badge disabled + spinner; delete → dialog confirm
disabled + "Đang xoá…" (the ref had **no** delete pending state → double-click
hazard). Errors map by status: 409 → the in-use message, `VALIDATION_FAILED` →
field-mapped, everything else → the envelope message. The reference showed one
generic "Lưu combo thất bại. Vui lòng thử lại." for all three mutations and never
distinguished 403/404/409.

### 4.4 Page behaviors (the spec the AC will test)

1. **Manager builds and edits; only admin deletes.** The `Xoá` action is hidden or
   disabled-with-reason below admin. Below manager: "Không có quyền truy cập trang này".
2. **A combo needs ≥ 2 items** — enforced client-side (Save disabled + inline
   message "Combo phải có ít nhất 2 sản phẩm") **and** server-side on *both* create
   and update by the shared validator (§3.1). The ref enforced it on update only.
3. **The picker is searchable** (`?pq=`), lists the full catalog, shows each row's
   price, and **de-duplicates by `id`, never by `name`** — the ref de-duped by name,
   so two real products sharing a name meant only the first was ever pickable.
4. **Unavailable products are visibly marked in the picker** (and still selectable,
   with a warning) — the ref offered them indistinguishably from sellable ones, so a
   manager could unknowingly build a combo out of dishes that aren't for sale.
5. **Price is manual; the system advises.** The form shows `Tổng giá lẻ`, suggests
   `round(retail × 0.9 / 1000) × 1000` inline in the price label, and renders a green
   `✓ Tiết kiệm …` hint when `savings > 0`. When `price ≥ retail_total` the row and
   the form show a **warning**, not silence — see §7 for why this matters on our seed.
6. **Active toggle** hides a combo from the customer menu in one click — a capability
   the reference simply did not have (§7 ⚠).
7. **Delete is guarded twice** — a typed dialog naming the combo and stating the
   consequence, plus the server's `409 COMBO_IN_USE`. Deleting an unknown id is a
   **404**, not a cheerful 204.
8. **Edit is replace-all for items, preserve-all for omitted scalars.** Editing only
   the name must not erase the image or category (the ref's bug 2, which would have
   detonated the moment an image field existed).
9. **Chips tell the truth.** Each shows `Tên sản phẩm ×qty` from the server join; a
   deleted product renders a warning chip naming the problem, never a raw UUID.
10. **Prices display via `formatVND()`** in one house format — the corpus is
    inconsistent (`70.000đ` vs `160.000 ₫` vs `₫22.000`); we normalise to the menu
    plan's `30.000 đ`.
11. **VN-first copy**, one constants file, the reference's real strings kept:
    "Combo", "+ Thêm combo", "Tên combo *", "Sản phẩm trong combo *", "(N món đã
    chọn)", "Bỏ chọn tất cả", "Các món đã chọn", "Tổng giá lẻ", "Giá combo *",
    "Thứ tự", "Huỷ bỏ", "Lưu combo", "Đang lưu…", "Đã tạo combo", "Đã cập nhật
    combo", "Đã xoá combo", "Giá lẻ", "Tiết kiệm".
12. **Worked example everywhere** (§7): **Suất Đầy Đủ Trứng Chín** — 1 Bánh Trứng
    Chín (9.000) + 3 Bánh Cuốn Thịt (4.000) + 1 Giò (9.000) + 1 Canh có rau (0) →
    `Giá lẻ` 30.000 · `Giá combo` 28.000 · `Tiết kiệm` 2.000.

## 5. Task mapping

Admin is the **AD phase** (`OVERALL_PLAN.md §8`); rows get registered when the phase
opens, and this section is the registration source. AD-P* rows belong to F-27.

| Proposed row | This plan's slice | Receipt type |
|---|---|---|
| C-1 (existing) | `combos` + `combo_items` + the seed suất set | migrate up/down + seed counts |
| **AD-P1…P4** (F-27) | the product contract this page consumes | — (owned by F-27) |
| AD-C1 | §3.1 #1 `GET /combos/all` incl. the server-side join (`product_name`, `unit_price`, `retail_total`, `product_deleted`) + the `is_active` rename in `DB_SCHEMA.md` | curl: manager 200 / cashier 403; a row with a soft-deleted product still renders correctly |
| AD-C2 | §3.1 #4–5 create + update **in one tx** + the shared validator + §3.3 invalidation | curl: create→201 full object; forced item failure rolls back; PATCH name-only preserves image; DEL proof |
| AD-C3 | §3.1 #6–7 active toggle + guarded delete + `PRODUCT_IN_USE` on the product side | curl: toggle removes it from `GET /combos`; delete 409 on active order; unknown id → 404 |
| AD-C4 | §4.1 FE table + chips + savings cell + 5 branches | screenshots per branch, incl. the deleted-product warning |
| AD-C5 | §4.1 FE modal + product picker + summary panel + delete dialog | screenshots + a ≥2-item validation round-trip |

## 6. Reference defects designed out

| Ref finding | Our countermeasure |
|---|---|
| 🟠 Management table reads the **available-only** endpoint; the unfiltered query exists but has zero callers — a hidden combo would be invisible *and* uneditable | `GET /combos/all` (manager+), mirroring products (§3.1 #1) |
| 🟠 `PATCH` **NULLs `image_path` + `category_id`** on every edit (handler lacks the fields, SQL sets them unconditionally) — latent only because the form had no image field | omitted scalars are preserved; regression AC: PATCH name-only, assert image survives (§3.1 #5) |
| 🟡 Item inserts are **non-transactional** and swallow errors — a failed item yields `201` with items missing; on edit, items are deleted *before* re-insert, so a failure **loses items** | header + items in one tx; item errors returned, not `slog.Warn`-ed (§3.4) |
| 🟡 Create and update validation **disagree** (`price min=0`/no item min vs `min=1`/`min=2`) — the API accepts a price-0, zero-item combo it then refuses to edit | one shared validator, both paths (§3.1) |
| **No availability toggle exists at all** — SQL hardcodes it on insert, never updates it; no route, no UI. `is_available` is a dead response field | `PATCH /combos/:id/active` + a real toggle (§3.1 #6) |
| `DELETE` has **no existence check** (unknown id → 204) and **no in-use guard** | 404 + `409 COMBO_IN_USE` (§3.1 #7) |
| Product deleted under a combo → **raw UUID chips**, under-counted `Giá lẻ`, wrong `Tiết kiệm`, item invisible in the modal and silently re-saved | server join + `product_deleted` flag + warning chip + explicit removal in the modal (§4.2) |
| Product price change silently turns a combo into a **non-saving** combo; `Tiết kiệm` just renders `—` | server sends `retail_total`; UI warns when `price ≥ retail_total` (§4.4 B5) |
| Product writes never invalidated `combos:list` → the two lists drift apart | product writes DEL `combos:list` (§3.3) |
| Picker **de-dups by `name`** → a same-named product is unpickable ("❓ unverified whether intentional") | de-dup by `id` (§4.4 B3) |
| Picker offers unavailable products indistinguishably | marked with a warning (§4.4 B4) |
| **No error branch on either query** — a failed fetch renders "Chưa có combo nào", a lie | explicit error branch, both queries + the picker (§4.3) |
| Products query **ungated** → UUID chips and `—` prices during load | table no longer depends on it (server join); picker has its own branches (§4.2) |
| Bare `<p>Đang tải...</p>`; blank screen while auth resolves | table-shaped skeletons (§4.3) |
| Delete has **no pending UI** → double-click hazard | per-row pending + disabled (§4.3) |
| One generic error toast for all three mutations; no 403/404/409 distinction | status-mapped errors (§4.3) |
| `window.confirm()`; custom SVG checkbox instead of a real `<input>` (a11y) | design-system dialog + real form controls (§4.1) |
| `🎲 Random combo` toasts "Đã tạo 3 combo!" even when 2 of 3 failed (`allSettled` never rejects) | not ported; seeding is C-1 SQL (§3.4) |
| Duplicate `RawCombo` / `ComboRaw` wire types | one shared type (§4.1) |
| **Wireframe draft inventions** — `_components/*` files, `useAdminCombos` hook, `types/combo.ts`, picker search, strikethrough old price, `retail_sum`/`savings`/`unit_price`/`product_name` as *stored* fields, `/api/v1/admin/combos` paths, `PUT` instead of `PATCH`, a 409 on duplicate name, `RoleGuard allowedRoles:["admin"]` | **none of it exists** — recorded here so nobody builds against the draft (§ preamble) |

## 7. Decisions + flags

- ✅ **Management read carries a server-side join** (`product_name`, `unit_price`,
  `retail_total`, `product_deleted`) even though the **customer** `GET /combos` stays
  **ids-only**. The two endpoints serve different jobs: the customer page already has
  the full product list cached to join against; the admin table must stay correct
  even when a product is *gone*. This is a deliberate, documented divergence from
  `plans/customer_menu/PLAN.md §3.1 #3` — not drift.
- ✅ **Combo price stays manual**, with a 90 %-of-retail suggestion. Auto-pricing
  would silently change what customers pay when a product price moves.
- ✅ **Items map, not `useFieldArray`** (§4.2) — duplicates become impossible.
- ✅ **Delete = admin+, everything else manager+** (reference's split, kept).
- ⚠️ **FLAG — `is_active` vs `is_available` naming collision.** `DB_SCHEMA.md §4.1`
  says `is_available` for combos; `plans/customer_menu/PLAN.md §3.5` already ships
  `is_active` on the same endpoint. **Ruling: `is_active`** (§3.2), with `DB_SCHEMA`
  corrected in AD-C1. Flagging because it edits a doc this plan does not own.
- 🚨 **RISK — the savings feature is invisible on our own seed data.** In
  `reference/…/03_be/SEED_DATA.md` every suất is priced **exactly at its retail sum**
  (30.000 = 9.000 + 3×4.000 + 9.000; 25.000 = 9.000 + 4×4.000). So on the canonical
  dataset `Tiết kiệm` is 0 for every row, every savings hint is hidden, and the
  page's headline feature ("Minh bạch giá cả") renders as a column of `—`. **Decide
  one:** (a) seed at least one genuinely discounted combo — this plan's default, and
  the reason the worked example prices Suất Đầy Đủ Trứng Chín at **28.000** against a
  30.000 retail; or (b) accept `—` as the normal state and drop the savings column.
  Needs an owner call before AD-C4 builds the cell.
- ⚠️ **FLAG — worked-example inconsistency across plans.**
  `plans/customer_menu/PLAN.md §3.5` illustrates a combo as `"Suất đầy đủ"` at
  **55.000**, but the seed catalog has **Suất Đầy Đủ Trứng Chín / Trứng Tái at
  30.000** and no 55.000 combo exists. One of the two must move; this plan uses the
  seed-faithful name and price. Recommend correcting the menu plan's illustrative
  JSON in its next touch — noting it here rather than editing a plan I don't own.
- 💡 **SUGGESTION — no per-id combo endpoint exists.** `/menu/combo/:id` pulls the
  whole `GET /combos` list and finds the combo client-side. Fine at 5 combos, wasteful
  later. Out of scope here; belongs to the C-5 detail-page task.
- ❓ **CLARIFY — combo images.** The reference never built them (`image_path` is
  written by nothing and NULLed by every edit). Our contract accepts `image_path` and
  reuses the products uploader, but nobody has decided whether combos *should* have
  their own photos or inherit a composed look. Default: support it, leave it optional.

## 8. Verify plan (receipts logged in `harness/VERIFICATION.md`)

- **BE:** role matrix (manager vs admin vs cashier); create/update inside a tx with a
  **forced item failure proving rollback**; PATCH-name-only preserving `image_path`;
  the shared validator rejecting `items < 2` on **both** create and update; active
  toggle removing the combo from `GET /combos`; delete 409 on an active order and 404
  on an unknown id; `PRODUCT_IN_USE` when deleting a product inside a combo; DEL
  proof for `combos:list` on **product** writes (§3.3's new rule).
- **FE:** screenshots per render branch (table **and** picker), the deleted-product
  warning chip, the `price ≥ retail_total` warning, and a ≥2-item validation round-trip.
- **Cross-page:** one transcript proving a combo edit here changes what `GET /combos`
  serves the customer menu after invalidation.
- **This plan itself (F-28):** folder holds the 4 docs, MD complete, all three HTML
  render both themes — receipt row dated 2026-07-19.

---

*Written by F-28 (2026-07-19) from an Explore-agent digest of the reference
admin_combos corpus (8 traced docs + a never-built wireframe draft, distinguished in
the preamble). Task status lives in `TASKS.md`; rules live in the docs in §2; the
product contract lives in `plans/admin_products/admin_products_PLAN.md` and is
cross-linked, never re-derived.*
