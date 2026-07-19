# Admin Toppings — Consolidated FE + BE Build Plan (F-29)

> **TL;DR:** `/admin/toppings` is the back-office CRUD screen for **toppings** — the paid
> add-ons (chả quế, giò lụa, tôm tươi) *and* the **₫0 nhân fillings** that the customer menu
> renders as pills. One table, one modal, four endpoints. This plan reconciles the reference
> implementation against `DB_SCHEMA.md`, `BE_STATE.md`, `FE_STATE.md` and the customer-menu
> plan, and designs out the reference's six real defects — the biggest being an **N+1 whole-
> product-list fetch** used only to render one column, which this plan replaces with a single
> server-joined `GET /toppings/all`.
>
> Visual companions: [`admin_toppings_plan.html`](admin_toppings_plan.html) ·
> [`admin_toppings_how-it-works.html`](admin_toppings_how-it-works.html) ·
> [`admin_toppings_mockup-1.html`](admin_toppings_mockup-1.html)
>
> **Source digested:** `reference/docs/system/08_pages/admin/admin_toppings/` (8 files, incl.
> the code-traced `_be.md` and the `COMPARISON_DOC_VS_CODE_DETAILED.md` audit) +
> `reference/docs/fe/wireframes/admin_main/admin_main_topping/` (7 files incl. the v1
> wireframe and `recomment/`). Digest date **2026-07-19**.
>
> **One fact, one home:** this file is the only source of truth for the *page*. Every rule it
> obeys lives in the doc named in §2 — linked, never restated. The three HTML companions are
> snapshots; on any conflict **this file wins**.

---

## 1. What the page is

A desktop, manager-and-above back-office screen at `/admin/toppings` holding the entire
topping catalogue in one scrollable table plus one add/edit modal.

- **Entry paths:** the `AdminTopNav` "Topping" tab, from any other admin page. There is no
  deep link into a single topping — the modal is page-local state, not a route.
- **Core loop:** *open → scan the table → add / edit / retire a topping → the change is live
  on the customer menu on its next fetch.*
- **Who:** `admin` + `manager` only. Delete is **admin-only** (§3.1). Staff/servers have no
  access — the admin shell's role guard blocks them before this page mounts.
- **What a topping is:** a row in `toppings` (`name`, `price`, `is_available`) linked to N
  products through the `product_toppings` junction. Two populations share the table:
  - **paid add-ons** — chả quế +8.000đ, giò lụa +10.000đ, tôm tươi +15.000đ;
  - **₫0 nhân fillings** — "Nhân thịt mộc nhĩ" etc., price `0`, which the customer menu
    renders as the nhân pills. `price = 0` is a **valid, expected value**, not an error, and
    the customer surface never special-cases it — the real price is snapshotted at order time
    ([`DB_SCHEMA.md §4.3`](../../DB_SCHEMA.md), *never assume topping price is 0 in code*).
- **Out-links:** product↔topping **linking happens on `/admin/products`**, not here. This page
  shows the linkage read-only in the "Áp dụng cho sản phẩm" column and never edits it.

---

## 2. Alignment — concern → owning doc (READ, don't restate)

| Concern | Owning doc |
|---|---|
| `toppings` / `product_toppings` columns, soft-delete + UNIQUE law | [`DB_SCHEMA.md §4.1, §4.4`](../../DB_SCHEMA.md) |
| Transaction policy, error-code enum, validation tiers, handler/service split | [`BE_STATE.md`](../../BE_STATE.md) |
| goose + sqlc pipeline, migration checklist, Go/Gin gotcha rules | [`BE_PLAYBOOK.md §1–2`](../../BE_PLAYBOOK.md) |
| State ownership, cache/invalidation map, 3-tier loading, FE hard rules (incl. `formatVND()`, DTO-exact naming) | [`FE_STATE.md §1–§9`](../../FE_STATE.md) |
| Admin surface tokens + Button/Badge/Input/Modal specs | [`diagrams/design-system.html`](../../diagrams/design-system.html) — **neutral F-7 tokens, not the customer dark/orange shell** |
| Redis policy, alignment gates | [`ARCHITECTURE.md §4`](../../ARCHITECTURE.md) |
| Phase roadmap, lessons register | [`OVERALL_PLAN.md`](../../OVERALL_PLAN.md) |
| The shared catalog contract this page writes into | [`plans/customer_menu/customer_menu_PLAN.md §3`](../customer_menu/customer_menu_PLAN.md) |
| Product↔topping **linking** (the picker this page deliberately does not have) | [`plans/admin_products/admin_products_PLAN.md`](../admin_products/admin_products_PLAN.md) (F-27) |
| Page-plan format itself | [`PAGE_PLAN_GUIDE.md`](../PAGE_PLAN_GUIDE.md) |

---

## 3. BE plan

### 3.1 Endpoints

All under `/api/v1`. Topping CRUD lives **inside the products domain** (one
handler/service/repo trio) — adopted from the reference; a separate topping domain would
split the shared cache-invalidation logic across two services.

| # | Route | Auth | Phase/task | Behavior |
|---|---|---|---|---|
| 1 | `GET /toppings` | **public** | C-3 | Customer-facing read. **Available only** (`is_available=1`, `deleted_at IS NULL`), `ORDER BY name`. Redis `toppings:list`, 5-min TTL. |
| 2 | `GET /toppings/all` | manager+ | AD-TOP-1 | **This page's list.** Every non-deleted topping *including* `is_available=0`, each row carrying its linked products (`products:[{id,name}]`) **joined server-side in one query**. Uncached — managers want live data. |
| 3 | `POST /toppings` | manager+ | AD-TOP-1 | Create. Body `{name, price, is_available}`. `409 DUPLICATE` on a name collision (§3.4 ①). → cache fan-out §3.3. |
| 4 | `PATCH /toppings/:id` | manager+ | AD-TOP-1 | Update `name`, `price`, `is_available` in **one** statement. `404 NOT_FOUND` on a missing/soft-deleted id; `409 DUPLICATE` on a name collision. → cache fan-out §3.3. |
| 5 | `DELETE /toppings/:id` | **admin only** | AD-TOP-1 | Soft delete + junction purge, one tx (§3.4 ③). `204`. → cache fan-out §3.3. |

**Role split** (answers `conccern.md`'s open question): read public · create/update
**manager+** · delete **admin-only** — the same shape products and categories use. The FE
hides the Xóa button for `manager` rather than letting it 403.

**The `/toppings` vs `/toppings/all` split** mirrors `GET /products` vs `GET /products/all`
from the [menu plan §3.1](../customer_menu/customer_menu_PLAN.md) and satisfies
[`FE_STATE.md §9` rule 13](../../FE_STATE.md) (role-scoped endpoints). The reference served
**one public endpoint that leaked `is_available=0` toppings to customers** — see §3.4 ②.

### 3.2 Schema depended on

Two tables, both already specified — full column specs in
[`DB_SCHEMA.md §4.1`](../../DB_SCHEMA.md), **not repeated here**:

- **`toppings`** — `id`, `name`, `price DECIMAL(10,0) DEFAULT 0`, `is_available`, std
  timestamps + `deleted_at`.
- **`product_toppings`** — junction `(product_id, topping_id)` composite PK, both FKs
  `ON DELETE CASCADE`.

Endpoint 2's join is `toppings LEFT JOIN product_toppings ON … LEFT JOIN products ON …`,
filtered `t.deleted_at IS NULL AND p.deleted_at IS NULL`, aggregated per topping. `LEFT` so
that an unlinked topping still returns a row with an empty `products` array.

> ⚠️ **This plan proposes one schema addition** — a UNIQUE key on `toppings.name` — which
> `DB_SCHEMA.md` does not yet carry. See §7 ⚠️-1; it must be amended **there**, not here.

### 3.3 Cache map (the invalidation AC)

Every topping write Dels the same three key sets:

| Write | DEL keys |
|---|---|
| `POST` / `PATCH` / `DELETE /toppings*` | `toppings:list` · `products:list` · **every `product:<id>` joined to that topping** |

The third target is the fix for the reference's headline cache bug (§6 ⑤) and is **already
the standing rule** in the [menu plan §3.3 cache map](../customer_menu/customer_menu_PLAN.md)
— this page implements it, it does not re-decide it. The joined ids come free from the same
junction lookup the delete already performs.

Cache failures stay **non-fatal** (fail-open to MySQL) per
[`ARCHITECTURE.md §4`](../../ARCHITECTURE.md).

### 3.4 Not adopted (reference choices rejected + why)

| # | Reference did | We do | Why |
|---|---|---|---|
| ① | No unique constraint, no dup check — duplicate names insert silently; the FE's `409` branch is **dead code** | `UNIQUE(name)` + rename-on-soft-delete, real `409 DUPLICATE` | The reference's own audit calls the 409 branch unreachable. Two "Chả quế" rows are a data defect, not a feature. Pattern already exists — [`DB_SCHEMA.md §4.4`](../../DB_SCHEMA.md) soft-delete×UNIQUE (staff username). ⚠️ needs the §7-1 amendment. |
| ② | **One public `GET /toppings`** returning `is_available=0` rows too (the admin view, served to everyone) | Public endpoint = available-only; a manager-guarded `/toppings/all` carries the rest | Role-scoped endpoints, [`FE_STATE.md §9` rule 13](../../FE_STATE.md). The reference already had an unused `ListToppingsAvailable` twin — we make it the public one. |
| ③ | `is_available` **hardcoded `1`** in the INSERT; the modal's status toggle silently does nothing on create | Create honours `is_available` (default `true` when omitted) | A control that lies is worse than no control. The reference doc admits "the modal's status toggle only takes effect on edit". |
| ④ | Edit = **two writes** — sqlc `UpdateTopping` (name/price) then a raw `ExecContext` for availability | One sqlc statement setting all three columns | Raw SQL outside sqlc breaks the layer rule ([`BE_PLAYBOOK.md §1`](../../BE_PLAYBOOK.md)); two writes on one logical edit is a torn update. |
| ⑤ | The admin page fetches the **entire product list** (uncached, N+1 `GetToppingsByProductID` per product) purely to render one column | `GET /toppings/all` returns `products:[{id,name}]` joined server-side | The reference pulls every product and its toppings to display product *names*. Kills the N+1, the second query, and the column flash (§6 ②) in one move. |
| ⑥ | "Rau" topping doubles as the **canh có/không-rau variant marker** on KDS | **Rejected** — rau is not a topping | [`DB_SCHEMA.md §4.3`](../../DB_SCHEMA.md) rules that the canh choice is two separate *products*; only nhân is a topping. Reaching for a "rau" topping is the exact anti-pattern that ruling names. |
| ⑦ | Wire fields `extraPrice`, `isAvailable`, `productNames[]` (camelCase, invented names) | `price`, `is_available`, `products[]` — DB names | DTO-exact naming, [`FE_STATE.md §9` rule 10](../../FE_STATE.md) + `DB_SCHEMA.md` field-name law. `extraPrice` exists in no table. |
| ⑧ | Delete blocked/warned via JS `confirm()`; junction rows left orphaned forever | Real modal dialog; junction rows purged in the delete tx | `confirm()` is unstyleable and untestable; the FK CASCADE never fires on a *soft* delete, so orphans accumulate (the reference admits this). |

### 3.5 Wire shapes

**`GET /toppings` → 200** (public, available only)

```json
{ "data": [
  { "id": "t1a2…36", "name": "Nhân thịt mộc nhĩ", "price": 0,     "is_available": true },
  { "id": "t3c4…36", "name": "Chả quế",           "price": 8000,  "is_available": true }
] }
```

**`GET /toppings/all` → 200** (manager+ — this page; note the joined `products`)

```json
{ "data": [
  { "id": "t3c4…36", "name": "Chả quế", "price": 8000, "is_available": true,
    "products": [ { "id": "ccc-01", "name": "Bánh Cuốn Thịt" },
                  { "id": "ccc-07", "name": "Bánh Cuốn Tôm" } ] },
  { "id": "t5e6…36", "name": "Rau", "price": 0, "is_available": false,
    "products": [] }
] }
```

**`POST /toppings`** — request → `201`

```json
{ "name": "Tôm tươi", "price": 15000, "is_available": true }
```
```json
{ "data": { "id": "t7f8…36", "name": "Tôm tươi", "price": 15000,
            "is_available": true, "products": [] } }
```

> Returns the **full object**, not a thin `{id}` — [`OVERALL_PLAN.md §6` lesson 7](../../OVERALL_PLAN.md)
> (thin DTOs caused the "Đơn #undefined" class of bug). The FE writes it straight into the
> list cache with no refetch.

**`PATCH /toppings/:id`** — same body shape (all three fields), returns the same full object.
**`DELETE /toppings/:id`** → `204`, empty body.

**Errors** — the standard envelope, codes from
[`BE_STATE.md §4`](../../BE_STATE.md):

```json
{ "error": { "code": "DUPLICATE", "message": "Tên topping đã tồn tại",
             "details": { "field": "name" } } }
```

`VALIDATION_FAILED` (empty name, `price < 0`) · `DUPLICATE` (409, name collision) ·
`NOT_FOUND` (404, unknown/soft-deleted id) · `FORBIDDEN` (403, manager attempting delete).

---

## 4. FE plan

### 4.1 Route + file map

```
fe/src/app/(dashboard)/admin/toppings/
  page.tsx                        RSC — prefetch ['admin','toppings'] → HydrationBoundary
  loading.tsx                     table-shaped skeleton (the reference had none — §6 ③)
  _components/
    ToppingPageHeader.tsx         title + count badge + "+ Thêm topping"
    ToppingToolbar.tsx            name search + status filter (client-side, §4.4-8)
    ToppingTable.tsx              5 columns, row actions, the 4 named render branches
    ToppingRow.tsx                one row; owns its own delete-pending state
    ToppingFormModal.tsx          RHF + Zod add/edit modal (dynamic import, with fallback)
    ToppingDeleteDialog.tsx       real dialog, states the N linked products
fe/src/features/admin/
  toppings.api.ts                 the 5 calls in §3.1
  toppings.queries.ts             useToppings / useCreate / useUpdate / useDeleteTopping
  toppings.types.ts               Topping DTO — DB field names (§3.4 ⑦)
```

Components are **local to the route** (`_components/`) — nothing here is shared, matching the
reference's own reuse audit. `Button`, `Badge`, `Input`, `Label`, `Modal`, `EmptyState` come
from the shared kit ([`design-system.html`](../../diagrams/design-system.html)).

### 4.2 State ownership

An instance of [`FE_STATE.md §1`](../../FE_STATE.md) — kinds and rules live there.

| Data | Kind | Owner | Notes |
|---|---|---|---|
| Topping list (+ joined products) | server cache | TanStack `['admin','toppings']` | `staleTime 60s`; RSC-prefetched so first paint has data |
| Auth user / role | global client | Zustand `useAuthStore` | drives the guards + Xóa-button visibility |
| Modal open + edit target | local | `useState<Topping \| null>` in `page.tsx` | one modal, mode derived from whether a target is set |
| Delete-confirm target | local | `useState<Topping \| null>` | separate from the edit target — they are different dialogs |
| Form values | local | RHF + Zod inside `ToppingFormModal` | **never** lifted to Zustand; reset on every open (§6 ⑦) |
| Search text / status filter | local | `useState` in the page | client-side only — no URL params (§4.4-8) |

**Query-key note:** `['admin','toppings']` is deliberately **shared** with the topping picker
on `/admin/products`. A write here invalidates that picker too — intended, and the reason not
to invent a second key.

### 4.3 Loading strategy

The three tiers of [`FE_STATE.md §4`](../../FE_STATE.md), instantiated:

- **Route tier** — `page.tsx` is an RSC that prefetches `['admin','toppings']` and hands it
  over via `HydrationBoundary`, so the table paints with rows on first render. `loading.tsx`
  renders a **table-shaped skeleton** (header + 6 placeholder rows) during navigation, so the
  layout does not shift when data lands.
- **Component tier** — one query, so exactly **four named, mutually exclusive branches**
  (the reference conflated the first three):

  | Branch | Condition | Renders |
  |---|---|---|
  | `loading` | query pending, no cached data | skeleton rows |
  | `error` | query rejected | error panel + Thử lại (retry), **not** an empty state |
  | `empty` | resolved, `data.length === 0` | `EmptyState` "Chưa có topping nào — nhấn + Thêm topping để bắt đầu" |
  | `ready` | resolved, rows present | the table |

- **Mutation tier** — **pessimistic**, not optimistic: a create/edit writes the returned full
  object into the cache on success; the Lưu button disables and shows "Đang lưu…" while
  pending; the Xóa button of **that row** disables while its delete is in flight (§6 ④).
  Optimistic updates are cart-only per [`FE_STATE.md §5`](../../FE_STATE.md).

### 4.4 Page behaviors (numbered → these become the ACs)

1. **Guarded entry** — a non-manager never renders the page; the admin shell's role guard
   shows the access-denied panel. A logged-out user is redirected to login.
2. **Table renders 5 columns** — Tên topping · Áp dụng cho sản phẩm · Giá thêm · Trạng thái ·
   (actions, unlabelled header). Rows sorted by name.
3. **Count badge** is derived from the loaded list length (`Topping (23)`), never a stored
   number, and reads `0` only in the `empty` branch — not while loading.
4. **Price renders by value** — `price === 0` → "Miễn phí" in the success colour; otherwise
   `+8.000đ` via the single shared `formatVND()` ([`FE_STATE.md §9` rule 9](../../FE_STATE.md)).
   Never "+0đ".
5. **Status renders as a badge** — `is_available` → "Có sẵn" (success) / "Hết" (muted).
6. **Linked products render as chips** from the server-joined `products[]`; an empty array
   renders the muted "Chưa gắn sản phẩm". The column is **read-only** — no picker, no link
   editor (linking belongs to `/admin/products`).
7. **Long names truncate** with the full name in a title tooltip; the table scrolls
   horizontally inside its own box below ~900px, the page never scrolls sideways.
8. **Search + status filter are client-side** — typing filters by name, the filter chips
   narrow to Có sẵn / Hết. No refetch, no URL params, no pagination in v1 (same call as the
   [menu plan §4.4](../customer_menu/customer_menu_PLAN.md); the list is ~23 rows).
9. **"+ Thêm topping" opens the modal in add mode** — empty form, title "Thêm topping",
   status toggle defaulting to Có sẵn.
10. **"Sửa" opens the same modal in edit mode** — pre-filled, title "Sửa topping". The form
    **resets on every open**, so values never leak between sessions.
11. **Validation is inline** — name required and non-blank; `price ≥ 0` with `0` explicitly
    valid. Errors render under their field; the modal stays open.
12. **A duplicate name shows a field error** — the `409 DUPLICATE` maps to "Tên topping đã
    tồn tại" under the name input, modal stays open, nothing is lost.
13. **A successful save closes the modal**, writes the returned object into the cache, and the
    row appears/updates without a refetch flash.
14. **"Xóa" opens a real dialog** stating the linked-product count — *"Topping này đang áp
    dụng cho 2 sản phẩm. Xóa sẽ gỡ liên kết."* — with the count taken from the row's own
    `products[]`. Admin-only: the button is not rendered for `manager`.
15. **Delete is idempotent from the UI** — the row's Xóa disables while in flight, so a
    double-click cannot fire two deletes.
16. **Every write refreshes the linked surfaces** — the customer menu, POS and product-detail
    pages show the change on their next fetch (§3.3); past orders never change, because they
    carry their own `toppings_snapshot`.

---

## 5. Task mapping

The AD phase is not yet opened in [`TASKS.md`](../../TASKS.md); these are the rows to register
when it is (F-29 itself only produces this plan set).

| TASKS.md row | This plan's slice | Receipt type |
|---|---|---|
| C-1 (catalog schema + seed) | §3.2 `toppings` + `product_toppings` + the ₫0 nhân seed set | migrate up/down + seed counts |
| C-3 (BE catalog reads) | §3.1 #1 `GET /toppings` (public, available-only) | curl: list excludes an `is_available=0` row |
| **AD-TOP-1** (BE topping CRUD) | §3.1 #2–#5 + the §3.3 cache fan-out | curl: full create→edit→delete round-trip; 409 dup; 403 manager-delete; Redis keys gone |
| **AD-TOP-2** (FE toppings page) | §4.1–§4.4, behaviors 1–16 | screenshot: table, modal add + edit, delete dialog, empty + error branches |
| **AD-TOP-3** (product↔topping linking) | *not this page* — the picker on `/admin/products` | cross-linked, not re-derived here |

---

## 6. Reference defects designed out

| # | Finding (reference) | Countermeasure |
|---|---|---|
| ① | The page pulls the **entire product list**, uncached, with an N+1 topping query per product, purely to render the "Áp dụng cho sản phẩm" column | `GET /toppings/all` joins `products:[{id,name}]` server-side in one query (§3.1 #2) |
| ② | That second query has **no loading gate** — every row flashes "Chưa gắn sản phẩm" then snaps to real names on cold load | Only one query remains, so the flash cannot exist (§4.3) |
| ③ | Loading = a bare `<p>Đang tải…</p>`; the table collapses to one line and the layout jumps when data lands. No `loading.tsx` in the route | Table-shaped skeleton at both the route and component tier (§4.3) |
| ④ | The delete mutation's pending state is **never read** — the Xóa button doesn't disable, so double-clicks re-fire the delete | Per-row pending disables that row's Xóa (behavior 15) |
| ⑤ | Topping writes Del `toppings:list` + `products:list` but **never `product:<id>`** → customer product-detail serves a stale topping price for up to 5 min | Cache map Dels every joined `product:<id>` (§3.3) |
| ⑥ | The FE maps a `409` to "Tên topping đã tồn tại" that the BE **can never send** — dead branch, duplicates insert silently | Real `UNIQUE(name)` + `409 DUPLICATE` makes the branch live (§3.4 ①) |
| ⑦ | RHF modals retain stale values between open/close — the reference names this "the #1 modal bug in this project" | Form resets on every open, asserted by behavior 10 |
| ⑧ | Delete confirmation is a JS `confirm()` whose warning count is computed client-side from the products blob | Real dialog; count read from the row's own joined `products[]` (behavior 14) |
| ⑨ | Create hardcodes `is_available=1`, so the modal's status toggle silently does nothing | Create honours the field (§3.4 ③) |
| ⑩ | Soft delete leaves `product_toppings` rows orphaned forever (FK CASCADE never fires on a soft delete) | Junction rows purged in the same tx as the soft delete (§3.4 ⑧) |
| ⑪ | Availability is written by **raw `ExecContext`** outside sqlc — the only topping write bypassing the generated layer | One sqlc statement sets all three columns (§3.4 ④) |
| ⑫ | The blank-screen `AuthGuard` window renders `null` with no indicator on slow connections | Admin-shell concern, not page-local — carried as ⚠️-3 in §7 |

---

## 7. Decisions + flags

**✅ Decided**

- Topping CRUD stays **inside the products domain** (one handler/service/repo trio) — the
  cache-invalidation logic is shared with products and would otherwise be split in two.
- **Role split:** read public · create/update manager+ · **delete admin-only** — closes
  `conccern.md`'s first open question.
- **No pagination, no server-side search in v1** — client-side name search + status filter,
  matching the menu plan's call. Revisit past ~100 toppings.
- **"Áp dụng cho sản phẩm" is read-only here** — linking stays on `/admin/products`
  (`conccern.md` question 2). No picker on this page.
- **Delete unlinks rather than blocks** — retiring a topping is normal manager work;
  forcing N product edits first would be hostile. The dialog states the impact instead.
- **Query key `['admin','toppings']` is shared with the product form's picker** — deliberate;
  do not invent a second key.
- Wire fields use **DB names** (`price`, `is_available`), never the reference's invented
  `extraPrice` / `isAvailable`.

**⚠️ FLAG**

1. **`UNIQUE(name)` on `toppings` is a schema addition this plan does not own.**
   [`DB_SCHEMA.md §4.1`](../../DB_SCHEMA.md) currently specifies no unique key, and adding one
   pulls in the [§4.4 soft-delete×UNIQUE rule](../../DB_SCHEMA.md) (rename to
   `<name>#deleted-<id>` on delete, as `staff.username` does). **DB_SCHEMA.md must be amended
   in the C-1 migration task** — §3.4 ① is unimplementable until it is. Flagged rather than
   written here, per one-fact-one-home.
2. **`GET /toppings` changes meaning.** Making the public endpoint available-only is correct
   but is a **contract change** for any consumer expecting the full list. Only the customer
   menu reads it today, and it wants available-only — but any future reader must use
   `/toppings/all`.
3. **The admin shell's blank `AuthGuard` window** (reference defect ⑫) is a shell-level gap
   that every admin page inherits. It belongs to the admin-shell task, not here — recording it
   so it is not lost.

**💡 SUGGESTION**

- A **bulk status toggle** would help (`conccern.md` raises it): with 23+ toppings, marking a
  batch "Hết" when an ingredient runs out is one-by-one work today. Deferred out of v1 —
  cheap to add later once the row action exists.
- **Stock-driven availability** — toppings map to ingredients that `/admin/ingredients` (F-21)
  already tracks. Auto-flipping `is_available` when an ingredient hits zero would remove the
  manual toggle. Cross-plan concern; not v1.

**❓ CLARIFY**

- None blocking. `conccern.md`'s three open questions (delete role, linking on this page,
  pagination) are all answered above under ✅.

---

## 8. Verify plan

| Task | Receipt |
|---|---|
| C-1 | `migrate up/down` clean; seed contains the ₫0 nhân set + ≥ 2 paid toppings |
| C-3 | curl `GET /toppings` — an `is_available=0` topping is **absent** from the payload |
| AD-TOP-1 | curl transcript: create → 201 full object · duplicate name → 409 `DUPLICATE` · patch → 200 · patch unknown id → 404 · delete as manager → 403 · delete as admin → 204 · `redis-cli EXISTS` shows `toppings:list`, `products:list` and the joined `product:<id>` all gone |
| AD-TOP-2 | screenshots: ready table (chips, Miễn phí, Có sẵn/Hết badges) · add modal · edit modal pre-filled · duplicate-name field error · delete dialog with the linked count · empty branch · error branch |
| F-29 (this set) | all four files render in both themes, no horizontal page scroll → `VERIFICATION.md` |

Receipts land in [`VERIFICATION.md`](../../VERIFICATION.md); a task is not ✅ without one
(Hard Rule 1).

---

*Written 2026-07-19 by the engineer-in-charge (F-29), digested from
`reference/docs/system/08_pages/admin/admin_toppings/` (8 files) and
`reference/docs/fe/wireframes/admin_main/admin_main_topping/` (7 files).
Format per [`PAGE_PLAN_GUIDE.md`](../PAGE_PLAN_GUIDE.md); the rules this plan obeys live in
the docs named in §2. This file wins over its three HTML companions.*
