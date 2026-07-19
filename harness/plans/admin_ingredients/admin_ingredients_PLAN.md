# Admin Ingredients — Consolidated FE + BE Build Plan (F-21)

> **TL;DR.** `/admin/ingredients` — "Kho nguyên liệu" — is the admin surface's
> inventory master: a searchable ingredient table with CRUD plus a stock-movement
> modal (Nhập / Xuất / Điều chỉnh). It is the **only** page allowed to move stock,
> and `stock_movements` is the append-only ledger of record. This plan reconciles the
> reference implementation with `DB_SCHEMA.md §4.6` + its mismatch rulings 6/7/8,
> `BE_STATE.md` transaction policy, and `FE_STATE.md` admin rules.
>
> Visual companions (snapshots — this file wins on any conflict):
> [`admin_ingredients_plan.html`](admin_ingredients_plan.html) ·
> [`admin_ingredients_how-it-works.html`](admin_ingredients_how-it-works.html) ·
> [`admin_ingredients_mockup-1.html`](admin_ingredients_mockup-1.html)
>
> **Source digested** 2026-07-19 from `reference/docs/system/08_pages/admin/admin_ingredients/`
> (`admin_ingredients.md` FE view · `admin_ingredients_be.md` BE trace of the old
> system's handler→service→repo→SQL, incl. its 5 self-declared flags).
>
> **One fact, one home:** the rules this plan obeys live in the docs named in §2 —
> this plan **links** them, never restates them.

---

## 1. What the page is

- **Route:** `/admin/ingredients` · title "Kho nguyên liệu" · admin shell (top tab-nav
  today; `ADMIN_BOTTOM_NAV.md` proposes a mobile bottom bar — 🔮 not in this scope).
- **Audience:** `manager` + `admin` only. `chef` / `cashier` / `staff` never reach it.
- **Core loop:** *see stock → correct stock*. An operator scans the table for
  low/expiring rows, then either edits the ingredient's metadata or posts a stock
  movement. Everything else on the page serves that loop.
- **In-links:** admin shell nav ("Thêm" sheet → Kho nguyên liệu) ·
  `/admin/summary` low-stock banner (deep-links here).
- **Out-links:** none today. `/admin/storage` (🔮 PLANNED) will extend this data with
  usage forecasting — **that page owns the forecast, not this one** (§7 D-6).
- **Non-goals:** recipes/BOM editing (`product_ingredients` is read-only here),
  purchase orders, suppliers, cost reporting.

## 2. Alignment — concern → owning doc (READ, don't restate)

| Concern | Owning doc |
|---|---|
| `ingredients` / `stock_movements` / `product_ingredients` columns | `DB_SCHEMA.md §4.6` |
| Schema conventions, field-name law, mismatch rulings 6/7/8 | `DB_SCHEMA.md §1, §2, §6` |
| Transaction policy (stock mutates only inside a locked tx) | `BE_STATE.md` (tx policy) |
| Error-code enum + envelope shape | `BE_STATE.md §4` · `PLAN.md` (error envelope) |
| goose+sqlc workflow, migration checklist | `BE_PLAYBOOK.md §1–2` |
| Query keys, cache/invalidation map, loading tiers | `FE_STATE.md §1–§8` |
| FE hard rules (DTO-exact naming ×10, no re-derived state ×11, role-scoped ×13) | `FE_STATE.md §9` |
| Redis policy — **inventory is never cached** | `OVERALL_PLAN.md §Redis` · `ARCHITECTURE.md §4` |
| Admin surface palette = neutral F-7 tokens | `diagrams/design-system.html` |
| AD-phase position in the roadmap | `OVERALL_PLAN.md §Phases (AD)` |

---

## 3. BE plan

### 3.1 Endpoints

All under `/api/v1/admin`, all behind `authMW` + `AtLeast("manager")`.
**DELETE additionally requires `AtLeast("admin")`** (nested sub-group).

| # | Route | Auth | Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /admin/ingredients` | manager+ | AD-INV-2 | All non-deleted, `ORDER BY name ASC`. Each row carries derived `expiry_date` + `status`. |
| 2 | `GET /admin/ingredients/low-stock` | manager+ | AD-INV-2 | `current_stock <= min_stock * 1.2`, most-critical first. **Consumed by `/admin/summary`, not by this page** — listed because it shares the handler. |
| 3 | `GET /admin/ingredients/:id` | manager+ | AD-INV-2 | Single row or 404 `INGREDIENT_NOT_FOUND`. |
| 4 | `POST /admin/ingredients` | manager+ | AD-INV-3 | Creates the ingredient **and**, when `initial_stock > 0`, its opening `type:'in'` movement — one tx (§6 D-1). 201. |
| 5 | `PATCH /admin/ingredients/:id` | manager+ | AD-INV-3 | Partial update of metadata only. **Cannot touch `current_stock`** (§6 D-2). |
| 6 | `DELETE /admin/ingredients/:id` | **admin only** | AD-INV-3 | Soft delete. 422 `INGREDIENT_IN_USE` when referenced by a recipe (§6 D-4). |
| 7 | `POST /admin/stock-movements` | manager+ | AD-INV-4 | Appends a movement **and** updates `current_stock` in one locked tx (§6 D-1). 201. |
| 8 | `GET /admin/ingredients/:id/movements` | manager+ | AD-INV-5 | Ledger tail, newest first, `LIMIT 50`. Powers the history drawer (💡 optional slice, §7 D-7). |

### 3.2 Schema depended on

Full column specs: **`DB_SCHEMA.md §4.6`** — not repeated here. What this page relies on:

- **`ingredients`** — `id, name, unit, import_date, shelf_days, current_stock,
  min_stock, cost_per_unit` + timestamps + `deleted_at`.
  - `current_stock DECIMAL(10,3)` is **derived via movements, never written directly**
    (DB_SCHEMA §4.6). Only endpoint 4 and 7 move it, and only inside a tx.
  - `expiry_date` and `status` are **derived facts with no column** (DB_SCHEMA §1).
- **`stock_movements`** — append-only ledger; `type ENUM('in','out','adjustment')`,
  `quantity` always **positive** (direction lives in `type`), `created_by` FK→staff.
  No UPDATE, no DELETE, ever.
- **`product_ingredients`** — read-only here; consulted **only** by the delete guard.

**⚠ Schema amendment this plan requests (owner/DB_SCHEMA to ratify — §7 F-1):**
`UNIQUE(name)` on `ingredients`, with the soft-delete rename rule from
`DB_SCHEMA.md §4.4` applied (`name → "<name>#deleted-<id>"` on soft delete). Without
it the 409 duplicate-name path below can never fire.

**Derived `status`** — computed by BE, priority order (first match wins):

| # | Condition | `status` |
|---|---|---|
| 1 | `current_stock == 0` | `out_of_stock` |
| 2 | `expiry_date < today + 7d` | `expiring_soon` |
| 3 | `current_stock <= min_stock` | `low_stock` |
| 4 | else | `in_stock` |

An item can be both expiring and low — it reports `expiring_soon`. The FE renders
this value and **never re-derives it** (`FE_STATE.md §9` rule 11).

### 3.3 Cache map

**Nothing here is cached server-side.** `OVERALL_PLAN.md §Redis` lists inventory under
"never cached", and `ARCHITECTURE.md §4` scopes Redis to catalog + auth rate-limit
only. No `platform/cache` import belongs in the ingredient service.

FE-side invalidation is the whole cache story:

| Write | Invalidates |
|---|---|
| POST / PATCH / DELETE `/admin/ingredients` | `['admin','ingredients']` |
| POST `/admin/stock-movements` | `['admin','ingredients']` + `['admin','ingredients',id,'movements']` |

### 3.4 Not adopted (reference choices rejected, with reasons)

| # | Reference did | We do | Why |
|---|---|---|---|
| 1 | Renamed on the wire: `current_stock→quantity`, `min_stock→warningThreshold`, `import_date→importDate`, `shelf_days→shelfDays` | **DB names, snake_case**, end to end | `DB_SCHEMA.md §6` ruling 6 kills the renames; `FE_STATE.md §9` rule 10 is DTO-exact naming. Renaming layers is where the old system's type lies started |
| 2 | Wrapped success in `{"data": […]}` | **Bare JSON**; only errors ride the envelope | Matches `plans/customer_menu/PLAN.md §3.5` — one response convention project-wide |
| 3 | `initial_stock` written straight into `current_stock`, no movement row | Opening `type:'in'` movement inside the create tx | Reference flag #1: `Σ movements` ≠ stock, so the ledger lies from day one (§6 D-1) |
| 4 | Movement INSERT + stock UPDATE, **no transaction** | One tx, row locked | Reference flag #2; `DB_SCHEMA.md §4.6` says "updated atomically in the same tx" (§6 D-1) |
| 5 | `out` silently clamps: `GREATEST(0, stock - qty)` | **Reject** with `VALIDATION_FAILED` | `DB_SCHEMA.md §6` ruling 8 — silent clamps hide miscounts (§7 F-2: owner may flip while AD is open) |
| 6 | `created_by` scanned but omitted from movement JSON | **Serialized** | Reference flag #3 — a ledger without an author is not an audit trail (§6 D-5) |
| 7 | `cost_per_unit` stored but never on the wire | **Exposed** on this page's endpoints | `DB_SCHEMA.md §6` ruling 7: exposure is a deliberate manager+ decision at AD. Every endpoint here is already manager+ gated, so the condition is met (§7 D-3) |
| 8 | FE showed 🗑 to all manager+, BE 403'd managers | Button **hidden** unless role is `admin` | `FE_STATE.md §9` rule 13 (role-scoped); a button that always fails is a bug (§6 D-3) |
| 9 | `avg_daily_usage` / `total_imported` / run-out forecast (🔮 STOR) | **Deferred to `/admin/storage`** | That page owns forecasting; adding it here would split one feature across two plans (§7 D-6) |

### 3.5 Wire shapes

> Field spellings get **frozen by curl receipts** at AD-INV-2/3/4 (gate 8:
> `fe/src/lib/api/types.ts` is written from receipts, never guessed).
> Success is unwrapped; errors use `{"error":{code,message,details}}`.

**`GET /admin/ingredients` → 200** — `current_stock`/`min_stock` are decimal strings
(`DECIMAL(10,3)`, never floated through JS); `cost_per_unit` is a bare VND integer:

```json
[ { "id": "ing1…36", "name": "Bột gạo", "unit": "kg",
    "import_date": "2026-07-12", "shelf_days": 90,
    "expiry_date": "2026-10-10",
    "current_stock": "25.500", "min_stock": "10.000",
    "cost_per_unit": 18000, "status": "in_stock",
    "created_at": "2026-07-12T08:00:00Z", "updated_at": "2026-07-19T09:14:02Z" } ]
```

**`POST /admin/ingredients`** — `initial_stock` is a *command input*, not a column
mirror: it seeds the opening movement, it does not write `current_stock` directly.

```json
{ "name": "Mộc nhĩ", "unit": "kg", "import_date": "2026-07-19",
  "shelf_days": 120, "initial_stock": "5.000", "min_stock": "2.000",
  "cost_per_unit": 95000 }
```
→ **201** with the full ingredient object (shape above, `current_stock: "5.000"`).

**`PATCH /admin/ingredients/:id`** — all optional; the set is metadata only:

```json
{ "name": "Mộc nhĩ khô", "unit": "kg", "import_date": "2026-07-19",
  "shelf_days": 150, "min_stock": "3.000", "cost_per_unit": 98000 }
```
→ **200** with the full object. `current_stock` is **not** an accepted key — sending
it is a `VALIDATION_FAILED` (§6 D-2), not a silent ignore.

**`POST /admin/stock-movements`** — `quantity` always positive:

```json
{ "ingredient_id": "ing1…36", "type": "out",
  "quantity": "2.500", "note": "Hỏng do ẩm" }
```
→ **201**:

```json
{ "id": "mv1…36", "ingredient_id": "ing1…36", "type": "out",
  "quantity": "2.500", "note": "Hỏng do ẩm",
  "created_by": "stf1…36", "created_at": "2026-07-19T09:14:02Z",
  "resulting_stock": "23.000" }
```

`resulting_stock` is returned so the FE can confirm the new figure without a refetch
race — it is the value the tx actually committed.

**`GET /admin/ingredients/:id/movements` → 200** — newest first, `LIMIT 50`:

```json
[ { "id": "mv1…36", "ingredient_id": "ing1…36", "type": "out",
    "quantity": "2.500", "note": "Hỏng do ẩm",
    "created_by": "stf1…36", "created_by_name": "Ngọc (quản lý)",
    "created_at": "2026-07-19T09:14:02Z" } ]
```

**Errors** (`BE_STATE.md §4` enum):

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | bad bind, bad `import_date`, `quantity <= 0`, bad `type`, `current_stock` in a PATCH |
| 400 | `VALIDATION_FAILED` | `out` movement would drive stock below zero (ruling 8) — `details` carries `current_stock` + `requested` |
| 404 | `INGREDIENT_NOT_FOUND` | unknown / soft-deleted id |
| 409 | `INGREDIENT_NAME_TAKEN` | duplicate `name` (needs the §3.2 UNIQUE amendment) |
| 422 | `INGREDIENT_IN_USE` | DELETE while `product_ingredients` references it |
| 403 | `FORBIDDEN` | manager calling DELETE; non-manager calling anything |
| 401 | `UNAUTHENTICATED` | missing/invalid JWT |

---

## 4. FE plan

### 4.1 Route + file map

```
fe/src/app/(dashboard)/admin/ingredients/
  page.tsx                          RSC shell: prefetch + HydrationBoundary
  _components/
    IngredientsClient.tsx           'use client' — owns search + which modal is open
    StoragePageHeader.tsx           title · search box · [+ Thêm nguyên liệu]
    IngredientTable.tsx             rows, status badges, per-row actions
    IngredientStatusBadge.tsx       status enum → token colors (pure)
    IngredientFormModal.tsx         RHF+Zod, add/edit (dynamic import)
    StockMoveModal.tsx              RHF+Zod, Nhập/Xuất/Điều chỉnh (dynamic import)
    MovementHistoryDrawer.tsx       💡 optional slice — AD-INV-5 (§7 D-7)
fe/src/lib/api/
  admin-ingredients.api.ts          listIngredients · createIngredient ·
                                    updateIngredient · deleteIngredient ·
                                    postStockMovement · listMovements
fe/src/lib/queries/
  admin-ingredients.keys.ts         query-key factory (FE_STATE §3)
```

`StockMoveModal` is **its own component file**, not inlined in `page.tsx` as the
reference did — it holds a Zod schema and a cross-field rule (§6 D-8).

### 4.2 State ownership

| Data | Kind | Owner |
|---|---|---|
| Ingredient list | server cache | TanStack Query `['admin','ingredients']`, `staleTime: 60s` |
| Movement tail | server cache | `['admin','ingredients',id,'movements']` |
| Search text | ephemeral UI | `useState` in `IngredientsClient` — client-side filter, **not** a URL param |
| Which modal is open + its target row | ephemeral UI | `useState` in `IngredientsClient` |
| Form fields | form state | RHF inside each modal |
| Caller's role (gates the 🗑 button) | session | auth context (`FE_STATE.md §1`) |

Search stays local because the list is one unpaged fetch of a small table — no ghost
URL params for a filter the server never sees (same call as the menu plan).

### 4.3 Loading strategy

Per `FE_STATE.md` 3-tier policy:

- **Route tier** — `page.tsx` RSC-prefetches `['admin','ingredients']` and hydrates,
  so first paint is data, not a spinner.
- **Component tier** — five named branches, never conflated (§6 D-6):

  | Branch | Render |
  |---|---|
  | `loading` | 5 pulsing skeleton rows matching the real row height |
  | `error` | error card + Thử lại, `ApiError.code` in a details line |
  | `empty` (no ingredients at all) | "Chưa có nguyên liệu nào" + primary [+ Thêm] CTA |
  | `no-match` (search miss) | "Không tìm thấy nguyên liệu nào" + Xoá tìm kiếm |
  | `ready` | the table |

- **Mutation tier** — **pessimistic**, no optimistic UI. Stock is money-adjacent and
  the server is the arbiter (a rejected over-draw must never flash as success).
  Modal keeps its spinner until 201, then closes and invalidates.

### 4.4 Page behaviors (numbered → these become the AC)

1. Page loads with the ingredient list already rendered from RSC hydration.
2. Rows sort by `name ASC`; each shows name, unit, `current_stock`, `min_stock`,
   `expiry_date`, and a status badge from the BE `status` value.
3. Typing in search filters rows client-side by name (diacritic-insensitive).
4. A search that matches nothing shows the `no-match` branch — distinct from `empty`.
5. **+ Thêm nguyên liệu** opens the form modal in add mode.
6. Submitting add posts `POST /admin/ingredients`; on 201 the modal closes, list
   invalidates, toast "Đã thêm nguyên liệu".
7. A duplicate name returns 409 → inline field error "Nguyên liệu này đã tồn tại",
   modal stays open with input preserved.
8. Row **✎** opens the same modal in edit mode, pre-filled; submits `PATCH`.
9. The edit form exposes **no stock field** — stock is only movable via movements.
10. Row **🗑** is rendered **only for `admin`**; managers never see it.
11. Delete asks for confirmation, then `DELETE`; on 204 list invalidates + toast.
12. Deleting an ingredient used by a recipe returns 422 → "Nguyên liệu đang được sử
    dụng trong công thức" and the row stays.
13. Row **Nhập/Xuất** opens `StockMoveModal` for that ingredient, showing the current
    stock as context.
14. The modal takes type (Nhập +/ Xuất −/ Điều chỉnh), a positive quantity in the
    ingredient's unit, and an optional note.
15. Quantity ≤ 0 is blocked client-side by Zod before any request.
16. An `out` larger than `current_stock` is rejected by the server with
    `VALIDATION_FAILED` → "Không đủ tồn kho (còn 23.000 kg)"; **stock is unchanged**.
17. On 201 the modal closes, the list invalidates, and the row shows
    `resulting_stock`; toast names the delta ("Đã xuất 2.5 kg — còn 23 kg").
18. A movement never edits or deletes an earlier movement — corrections are new
    `adjustment` rows.
19. Status badges recolor automatically after any movement, because `status` comes
    from the refetched server value.
20. All six actions are keyboard reachable; modals trap focus and close on Esc.

---

## 5. Task mapping

AD-phase rows are **not yet allocated in `TASKS.md`** (Phase F is still open). These
register when AD opens — proposed ids, deps, and receipt types:

| Proposed row | Slice | Deps | Receipt |
|---|---|---|---|
| AD-INV-1 | Migration: `ingredients`, `stock_movements`, `product_ingredients` (+ the §3.2 UNIQUE amendment if ratified) | F-3 | `migrate up/down` clean; `\d ingredients` |
| AD-INV-2 | BE reads: endpoints 1, 2, 3 + `status`/`expiry_date` derivation | AD-INV-1 | curl: list, low-stock, detail, 404 |
| AD-INV-3 | BE writes: endpoints 4, 5, 6 + delete guard + 409 | AD-INV-2 | curl: create→201, patch, delete, 409 dup, 422 in-use, 403 as manager |
| AD-INV-4 | BE movements: endpoint 7 in a locked tx | AD-INV-2 | curl: in/out/adjustment; over-draw → 400; concurrent double-out leaves stock consistent |
| AD-INV-5 | BE endpoint 8 + FE history drawer (💡 optional, §7 D-7) | AD-INV-4 | curl: movement tail w/ `created_by_name` |
| AD-INV-6 | FE page: table, search, status badges, 5 branches | AD-INV-2 | screenshot: list + each branch |
| AD-INV-7 | FE modals: form + stock-move, all error paths | AD-INV-3, AD-INV-4, AD-INV-6 | screenshot: add, edit, over-draw rejection, 409, admin-only 🗑 |

---

## 6. Reference defects designed out

| # | Reference finding | Countermeasure |
|---|---|---|
| D-1 | Movement INSERT + stock UPDATE **not** in a tx (their flag #2); create wrote `current_stock` with no movement (their flag #1) — the ledger disagrees with the count | Both paths run one tx with the ingredient row locked: create inserts the opening `in` movement; every movement writes ledger + stock together. `Σ movements == current_stock` becomes an invariant a test can assert |
| D-2 | `current_stock` reachable as a plain update field | Not an accepted PATCH key; rejected with `VALIDATION_FAILED`. Stock has exactly one door |
| D-3 | 🗑 shown to managers, BE 403s them | Button gated on `role === 'admin'` (`FE_STATE.md §9` rule 13) |
| D-4 | Delete had no in-use guard; a `product_ingredients` FK would surface as MySQL 1451 → 500 `COMMON_002` | Service checks `product_ingredients` first → clean 422 `INGREDIENT_IN_USE`. ⚠ Note the FK is CASCADE in `DB_SCHEMA.md §4.6`, so **without this guard a delete silently destroys recipe rows** — the guard is load-bearing, not cosmetic |
| D-5 | `created_by` scanned but dropped from the JSON — no audit trail | Serialized, plus `created_by_name` joined for display |
| D-6 | Loading / empty / search-miss rendered through one conflated state | Five named branches (§4.3), each with its own copy and CTA |
| D-7 | 409 duplicate-name toast shown defensively for an error the BE could never emit (no UNIQUE on `name`) | Either the §3.2 UNIQUE amendment lands and 409 becomes real, or the toast is deleted. No UI for imaginary errors |
| D-8 | `StockMoveModal` inlined in `page.tsx` | Own file with its own Zod schema — the cross-field over-draw rule needs a testable home |
| D-9 | `cost_per_unit` stored but silently withheld (their flag #4) | Deliberately exposed at manager+ (ruling 7), or deliberately dropped — never accidentally invisible |

---

## 7. Decisions + flags

**✅ Decided**

- **D-1** Wire uses DB names in snake_case; success unwrapped (§3.4 rows 1–2).
- **D-2** `current_stock` moves only through movements, only inside a tx.
- **D-3** `cost_per_unit` is exposed on this page's endpoints — every one is manager+
  gated, which is exactly the condition `DB_SCHEMA.md §6` ruling 7 set for exposure.
- **D-4** Decimal quantities cross the wire as **strings**, not JS numbers
  (`DECIMAL(10,3)`; float rounding on stock is how counts drift).
- **D-5** Pessimistic mutations only — no optimistic stock UI.
- **D-6** The 🔮 STOR forecast (`avg_daily_usage`, `total_imported`, `days_remaining`,
  `runout_date`) is **deferred to the `/admin/storage` plan**, which owns it.
- **D-7** 💡 The movement-history drawer (endpoint 8 + `MovementHistoryDrawer`) is an
  **optional slice** — the reference page never called endpoint 8. Recommended to
  build, because D-5 makes the ledger auditable for the first time, but AD-INV-5/the
  drawer can be cut without touching the core loop.

**⚠️ FLAGS — for the boss**

- **F-1 — schema amendment requested.** `UNIQUE(name)` on `ingredients` + the
  `DB_SCHEMA.md §4.4` soft-delete rename rule. `DB_SCHEMA.md` owns tables, so this
  plan **requests** rather than declares it. Until ratified, behavior 7 and the 409
  path do not exist and the duplicate-name toast must be cut (D-7 above).
- **F-2 — over-draw default is flippable.** `DB_SCHEMA.md §6` ruling 8 rejects
  below-zero `out` with `VALIDATION_FAILED` and says "lock in when AD opens". This
  plan builds the reject. If real kitchen practice is "count later, log now", say so
  before AD-INV-4 and it becomes a clamp + warning instead.
- **F-3 — admin palette unresolved.** `ADMIN_BOTTOM_NAV.md` records that the live
  admin shell used orange/dark while the design tokens are neutral, and assumed
  migration to tokens. This plan's mockup uses the **neutral F-7 tokens** per
  `PAGE_PLAN_GUIDE.md §7`. Same open question as the other admin plans — one answer
  should cover all of them.

**❓ CLARIFY**

- **C-1** Is `import_date` per *batch* or per *ingredient*? The schema carries one
  date per ingredient row, so re-importing overwrites the batch date and silently
  moves `expiry_date` for stock that is physically older. Real batch tracking needs
  `stock_movements` to carry its own `import_date`/`expiry_date`. Out of scope here;
  worth a ruling before `/admin/storage` designs expiry reporting.

---

## 8. Verify plan

Receipts land in `harness/VERIFICATION.md`, one row per task:

| Task | Receipt |
|---|---|
| AD-INV-1 | `goose up` / `down` transcript; table + index listing |
| AD-INV-2 | curl transcripts: list (status values visible), low-stock ordering, detail, 404 envelope |
| AD-INV-3 | curl: 201 create, 200 patch, 204 delete, 409 dup, 422 in-use, 403 manager-DELETE |
| AD-INV-4 | curl: in/out/adjustment round-trip w/ `resulting_stock`; over-draw 400; **concurrency receipt** — two simultaneous `out` calls leave `Σ movements == current_stock` |
| AD-INV-5 | curl: movement tail incl. `created_by_name` |
| AD-INV-6 | screenshots: ready, loading, error, empty, no-match |
| AD-INV-7 | screenshots: add modal, edit modal, over-draw rejection, 409 inline error, 🗑 absent as manager / present as admin |

The AD-INV-4 concurrency receipt is the one that proves D-1 — it is the reason the
tx exists, so it is not optional.

---

## 9. Appendix — canonical seed data

Every mockup, screenshot, and curl example in this plan set uses **these five rows**,
so numbers stay consistent across docs. Reference date: **2026-07-19**.

| Name | Unit | `current_stock` | `min_stock` | `import_date` | `shelf_days` | `expiry_date` | `cost_per_unit` | `status` |
|---|---|---|---|---|---|---|---|---|
| Bột gạo | kg | 25.500 | 10.000 | 2026-07-12 | 90 | 2026-10-10 | 18000 | `in_stock` |
| Thịt heo xay | kg | 8.000 | 10.000 | 2026-07-18 | 3 | 2026-07-21 | 145000 | `expiring_soon` |
| Mộc nhĩ | kg | 2.300 | 2.000 | 2026-07-19 | 120 | 2026-11-16 | 95000 | `in_stock` |
| Nước mắm | lít | 4.000 | 5.000 | 2026-06-01 | 365 | 2027-06-01 | 60000 | `low_stock` |
| Hành lá | kg | 0.000 | 1.000 | 2026-07-15 | 7 | 2026-07-22 | 25000 | `out_of_stock` |

Two rows exist to prove the §3.2 precedence ladder:

- **Thịt heo xay** is *both* low (8 ≤ 10) *and* expiring — it reports `expiring_soon`,
  because rule 2 outranks rule 3.
- **Hành lá** is *both* empty *and* expiring — it reports `out_of_stock`, because
  rule 1 outranks everything.

**Worked example** (used in every walkthrough): operator posts
`{"ingredient_id": "<Bột gạo>", "type": "out", "quantity": "2.500", "note": "Hỏng do ẩm"}`
→ 201 with `resulting_stock: "23.000"`; the row re-renders at **23.000 kg**, status
stays `in_stock` (23.0 > 10.0).

---

*Written 2026-07-19 (F-21) from `reference/docs/system/08_pages/admin/admin_ingredients/`,
reconciled with `DB_SCHEMA.md §4.6/§6`, `BE_STATE.md`, `FE_STATE.md`, `OVERALL_PLAN.md`.
The rules this plan obeys live in the docs listed in §2 — this file links them, never
restates them. The three HTML companions are snapshots; **this file wins** on any conflict.*
