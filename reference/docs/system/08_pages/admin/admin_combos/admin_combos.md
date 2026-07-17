# Admin Combos — `/admin/combos`

> **TL;DR:** ✅ implemented · manager+ (delete: admin only) · Combo CRUD: header with count +
> "🎲 Random combo" + "+ Thêm combo" buttons; a table showing composition and price savings vs
> retail; and a single inline RHF modal for create/edit. No availability toggle exists on this page.
> BE view (endpoints, auth, caching, errors) → [admin_combos_be.md](admin_combos_be.md)
> Cross-component flow → [admin_combos_crosscomponent_dataflow.md](admin_combos_crosscomponent_dataflow.md)
> Loading states → [admin_combos_loading.md](admin_combos_loading.md)
> Scenario → [SCENARIO_COMBOS_CRUD.md](SCENARIO_COMBOS_CRUD.md)
> Known bugs → [COMBOS_BUGS.md](COMBOS_BUGS.md)

---

## ASCII Wireframe

Traced from `fe/src/app/(dashboard)/admin/combos/page.tsx:233-342`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ (admin shell: sidebar + tab nav)                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ B  Combo (3)              [🎲 Random combo]  [+ Thêm combo]              │ ← PageHeader (page.tsx:236-253)
├──────────────────────────────────────────────────────────────────────────┤
│ C  ┌────────────────────────────────────────────────────────────────┐    │ ← ComboTable (page.tsx:261-342)
│    │ Tên combo          Sản phẩm trong combo  Giá combo  Giá lẻ  Tiết kiệm    │
│    │ Combo Gia Đình     [BC thịt ×2][Canh ×1] 70.000đ  85.000đ  -15.000đ  [Sửa][Xóa] │
│    │ (description line) [                   ]                                          │
│    │ Combo Tiết Kiệm   [BC mọc nhi ×1]       42.000đ     —         —     [Sửa]        │
│    └────────────────────────────────────────────────────────────────┘    │
│    (empty → EmptyState icon="🍱" message="Chưa có combo nào…")           │
└──────────────────────────────────────────────────────────────────────────┘

Overlay (D): ComboFormModal — fixed inset-0, max-w-2xl, max-h-[92vh] (page.tsx:345-552)
┌──────────────────────────────────────────────────────────────┐
│ Thêm combo mới / Sửa combo                              [×]  │ ← modal header (page.tsx:349-359)
│ ┌──────────────────────┐ ┌───────────────────────────────┐   │
│ │ Tên combo *          │ │ Mô tả (tuỳ chọn)              │   │ ← grid 2-col (page.tsx:366-384)
│ └──────────────────────┘ └───────────────────────────────┘   │
│ Sản phẩm trong combo * (N món đã chọn)     [Bỏ chọn tất cả] │ ← product picker (page.tsx:387-473)
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [☐] Bánh cuốn thịt             35.000đ                   │ │ ← scrollable checkbox list
│ │ [☑] Canh mọc nhi               10.000đ   [−] 1 [+]       │ │   (uniqueProducts, page.tsx:411)
│ └──────────────────────────────────────────────────────────┘ │
│ ┌─ Các món đã chọn ────────────────────────────────────────┐ │ ← selected summary (page.tsx:477-495)
│ │ Bánh cuốn thịt ×1                              35.000đ   │ │
│ │ Tổng giá lẻ                                    45.000đ   │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────┐ ┌──────────────────────────┐  │
│ │ Giá combo * — gợi ý: Xđ   │ │ Thứ tự                   │  │ ← price + sort (page.tsx:498-529)
│ └────────────────────────────┘ └──────────────────────────┘  │
│ ✓ Tiết kiệm Xđ so với giá lẻ (Yđ)                           │ ← savings hint (page.tsx:515-519)
├──────────────────────────────────────────────────────────────┤
│                             [Huỷ bỏ]  [Lưu combo]           │ ← modal footer (page.tsx:533-548)
└──────────────────────────────────────────────────────────────┘
  (Lưu combo is disabled when selectedItems < 2 — page.tsx:543)
```

---

## Zones

Traced from `fe/src/app/(dashboard)/admin/combos/page.tsx`.

| Zone | Component | Data source | Source lines |
|---|---|---|---|
| B Header | inline JSX | `combos.length` count from `['admin','combos']` query | page.tsx:236-253 |
| B — 🎲 Random combo button | inline, calls `handleRandomCombos` | POSTs 3 × `createCombo` in parallel via `Promise.allSettled` | page.tsx:239-245, 194-228 |
| B — + Thêm combo button | inline, calls `openAdd` | opens modal in `'add'` mode | page.tsx:246-252, 78-84 |
| C ComboTable | inline `<table>` | `['admin','combos']` query (`listCombos` → `GET /combos`); product names resolved via `['admin','products']` query (`listProducts` → `GET /products/all`) | page.tsx:261-342 |
| C — Tên combo cell | inline `<td>` | `combo.name` + optional `combo.description` | page.tsx:282-287 |
| C — Sản phẩm cell | inline chips | `combo.items[]` resolved through `productMap` (id→Product lookup) | page.tsx:288-301 |
| C — Giá combo cell | inline `<td>` | `combo.price` via `formatVND` | page.tsx:302-305 |
| C — Giá lẻ cell | inline `<td>` | `rowRetail` = Σ(product.price × item.quantity) via productMap; renders "—" if 0 | page.tsx:275-279, 306-309 |
| C — Tiết kiệm cell | inline `<td>` | `rowSavings = rowRetail − combo.price`; green badge if >0, else "—" | page.tsx:279, 309-316 |
| C — Actions cell | inline `<div>` | "Sửa" always; "Xóa" only if `user.role === 'admin'` | page.tsx:318-335 |
| D ComboFormModal | inline `<form>` (RHF + Zod) | `createMut` / `editMut` mutations; product list from `['admin','products']` | page.tsx:344-552 |

---

## Key Interactions

Traced from `fe/src/app/(dashboard)/admin/combos/page.tsx`.

- **+ Thêm combo** (page.tsx:246) → `openAdd()` resets form to defaults and opens modal in `'add'` mode (page.tsx:78-84).
- **🎲 Random combo** (page.tsx:239) → `handleRandomCombos()`: guards require ≥2 unique products; builds 3 templates with different discount ratios (10%, 12%, 15%); fires `Promise.allSettled` with 3 parallel `POST /combos` calls; invalidates `['admin','combos']` on completion (page.tsx:194-228).
- **Sửa** (page.tsx:321) → `openEdit(combo)`: populates form fields and `selectedItems` from `combo.items`; opens modal in `'edit'` mode (page.tsx:86-99).
- **Xóa** (page.tsx:327, visible only when `isAdmin`) → `handleDelete`: `window.confirm` guard, then `DELETE /combos/:id`; invalidates `['admin','combos']` (page.tsx:163-170, 184-187).
- **Product checkbox** (page.tsx:419) → `toggleProduct`: adds product at qty=1 or removes it from `selectedItems`; clears `itemsError` (page.tsx:114-124).
- **Qty stepper** (page.tsx:451-465) → `setQty(id, qty)`: floors at 1 via `Math.max(1, qty)` (page.tsx:126-128).
- **Lưu combo** (page.tsx:542) → `onSubmit`: validates ≥2 selectedItems (page.tsx:173-176), then calls `createMut` or `editMut`; `toast.success` on success, `toast.error` on failure; invalidates `['admin','combos']`.
- **Price suggestion** (page.tsx:503-505): when `retailTotal > 0`, label shows `Math.round(retailTotal × 0.9 / 1000) × 1000` as a hint — 90% of retail rounded to nearest 1,000đ.
- **Savings hint** (page.tsx:515-519): green text under price field when `savings = retailTotal − watchedPrice > 0`.
- **Escape key** (page.tsx:106-111) → `closeModal()`.
- Successful create/edit/delete all call `qc.invalidateQueries({ queryKey: ['admin', 'combos'] })` — also invalidates menu-page combo cache because both use key `['admin','combos']` or are stale-while-revalidated.

---

## Business Logic Used

- Combo expansion at order time (header row `unit_price=0`, sub-items priced, total = combo price, no double-count) → [../../02_spec/BUSINESS_RULES.md §2.5](../../02_spec/BUSINESS_RULES.md#25-combo-expansion). The admin page creates the **static template** (`combos` + `combo_items` rows); the expansion rule applies at `POST /orders`.
- Random combo discount formula (10/12/15% off retail, rounded to nearest 1,000đ) → page.tsx:201-217 (inline, not a shared rule).
- Minimum 2 products per combo enforced FE-side → page.tsx:173. BE-side enforcement: ❓ UNVERIFIED (not traced in this file — see [admin_combos_be.md](admin_combos_be.md)).
- RBAC: manager+ can create/update; only `admin` role can delete → page.tsx:46-47, 326-334. Endpoint-level auth → [admin_combos_be.md](admin_combos_be.md).
- Admin combo list is **available-only** (BE filters `is_available=1`) → see [admin_combos_be.md](admin_combos_be.md) Flag 1 and [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 1.

---

## Object Model

> Traced from source on branch `experience_claude.md_system_1`.
> Sources: `fe/src/types/product.ts:27-59` · `fe/src/features/admin/admin.api.ts:111-155` ·
> `fe/src/app/(dashboard)/admin/combos/page.tsx`.
>
> **Scope:** the objects this page READS and WRITES. Full cross-layer field matrix (DB→Go→JSON→TS)
> lives in the shared combo object model → [../../02_spec/object/OBJECT_MODELS.md](../../02_spec/object/OBJECT_MODELS.md).
> Order-time expansion (combo → order_items) → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) §2.6.

```
READ:  GET /combos → RawCombo[] → listCombos() normalises combo_items → Combo[]
       GET /products/all → Product[] → productMap (id→Product) for name/price resolution in table + modal
WRITE: RHF FormValues + selectedItems (SelectedItems) → CreateComboInput → POST /combos or PATCH /combos/:id
       DELETE /combos/:id (admin only)
```

### §1 — Combo (FE enriched shape)

`GET /combos` (`admin.api.ts:128-146`). `listCombos` normalises the wire response: it reads `combo_items[]` from the raw API and maps them to `items: ComboItem[]` with `product_name: ''` (empty string — names are resolved on the fly via `productMap` in the component, not pre-populated, `page.tsx:63`).

| Attribute | FE wire `RawCombo` (`admin.api.ts:122-126`) | FE enriched `Combo` (`types/product.ts:49-59`) |
|---|---|---|
| `id` | `string` | `string` |
| `name` | `string` | `string` |
| `description` | `string \| null` | `string \| null` |
| `price` | `number` | `number` |
| `image_path` | `string \| null` | `string \| null` |
| `is_available` | `boolean` | `boolean` |
| `sort_order` | `number` | `number` |
| `category_id` | `string \| null` | `string \| null` |
| `combo_items` | `{ id, product_id, quantity }[]` | — (remapped to `items`) |
| `items` | — | `ComboItem[]` (see §2) |

### §2 — ComboItem (per-product line inside Combo)

`types/product.ts:27-33`. Populated by `listCombos()` normaliser (`admin.api.ts:140-145`); `product_name` is set to `''` and resolved at render time from `productMap` (`page.tsx:63, 291-293`).

| Attribute | Source | Notes |
|---|---|---|
| `product_id` | `string` | UUID; used as `productMap` key |
| `product_name` | `string` | Always `''` after listCombos; resolved via `productMap[item.product_id]?.name` at render |
| `quantity` | `number` | ≥1 |
| `unit_price?` | `number \| undefined` | Not populated on this page |
| `toppings?` | `Topping[] \| undefined` | Not populated on this page |

### §3 — CreateComboInput (WRITE payload)

`admin.api.ts:112-119`. Sent on `POST /combos` (create) and `PATCH /combos/:id` (update — same shape via `updateCombo`, `admin.api.ts:151-152`).

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | Required, min 1 char (Zod `page.tsx:18`) |
| `price` | `number` | Required, min 1 (Zod `page.tsx:19`) |
| `description?` | `string` | Optional |
| `sort_order?` | `number` (int) | Default 0 (Zod `page.tsx:21`) |
| `category_id?` | `string` | Optional; NOT present in the form — always omitted on create/edit from this page (`page.tsx:131-144`, `page.tsx:148-155`) |
| `items` | `{ product_id: string; quantity: number }[]` | Derived from `selectedItems` state (`page.tsx:137, 153`) |
| `image_path?` | — | NOT included in form or payload from this page |

### §4 — SelectedItems (local form state)

`page.tsx:25`. `Record<string, number>` — maps `product_id → quantity`. Not sent directly; converted to `items[]` in `onSubmit` via `Object.entries(selectedItems).map(([product_id, quantity]) => ({ product_id, quantity }))` (`page.tsx:137, 153`).

### §5 — Product (read-only, used for name/price resolution)

`admin.api.ts:39-40` calls `GET /products/all`. Full shape → [../../02_spec/object/OBJECT_MODELS.md](../../02_spec/object/OBJECT_MODELS.md). Used on this page only as a lookup map (`productMap`, `page.tsx:63`) to resolve product names in the table chips (`page.tsx:291-293`) and the product picker list in the modal (`page.tsx:411`).

`uniqueProducts` (page.tsx:190-193) de-duplicates by `product.name` (first-seen wins) before rendering the picker list — products with duplicate names appear only once.

### §6 — Flags / Known Mismatches

| # | Flag | Detail |
|---|---|---|
| 1 | **is_available always 1 — no toggle path** | The `Combo` type carries `is_available` (types/product.ts:55) and the `CreateComboInput` has no `is_available` field. There is no toggle in the UI. All combos created from this page are permanently available. The admin list is also filtered to available-only on the BE side (see [admin_combos_be.md](admin_combos_be.md) Flag 1 and [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 1). There is no hide/disable path for combos. |
| 2 | **PATCH wipes image_path and category_id** | `updateCombo` sends `CreateComboInput` which never includes `image_path` or `category_id` (page.tsx:148-155, admin.api.ts:112-119). If a combo had an image or category set externally, a PATCH from this page clears them. See [admin_combos_be.md](admin_combos_be.md) Flag 3 and [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 2. |
| 3 | **product_name always empty after listCombos** | `listCombos` normaliser sets `product_name: ''` for every ComboItem (admin.api.ts:143). Names are resolved via `productMap` at render — if `GET /products/all` is still loading or a product was deleted, names fall back to `item.product_id` (UUID) silently (page.tsx:291-293). |
| 4 | **uniqueProducts de-dups by name, not id** | `page.tsx:190-193` uses `product.name` equality to de-duplicate the picker list. If two products share the same name but different IDs (e.g. fillings vs base products), only the first one appears. ❓ UNVERIFIED whether this is intentional product-catalog design or a latent bug. |
| 5 | **category_id never set from this page** | `CreateComboInput.category_id` is optional and the form has no field for it (page.tsx:366-384, 498-529). Every combo created here will have `category_id = null`. |
