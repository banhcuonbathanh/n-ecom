# Admin Combos — Cross-Page Data Flow — `/admin/combos`

> **TL;DR:** ✅ implemented · `/admin/combos` is a manager **catalog-editing** page whose writes
> barely render on itself — their real life is **downstream**. Every combo write
> (`POST`/`PATCH`/`DELETE /combos`) does two things: a local TanStack `invalidateQueries(['admin',
> 'combos'])` refetch, and — more importantly — a **server-side Del of the shared `combos:list`
> Redis key**. That single cache key is read by the customer **`/menu` ComboSection (C1)** and
> **combo-detail `/menu/combo/:id` (C5)**, and the combo template ultimately **expands into
> `order_items`** at order time. Propagation is **pull-only — no SSE/WS** on this page.
>
> **Sources (branch `experience_claude.md_system_1`):**
> `fe/src/app/(dashboard)/admin/combos/page.tsx:131-187` ·
> `fe/src/features/admin/admin.api.ts:128-155` ·
> `be/internal/service/product_service.go:21,497-577,588-625,723-725` ·
> `be/query/products.sql:112-147`.
>
> Siblings: [admin_combos.md](admin_combos.md) · [admin_combos_be.md](admin_combos_be.md) ·
> [admin_combos_loading.md](admin_combos_loading.md) ·
> [SCENARIO_COMBOS_CRUD.md](SCENARIO_COMBOS_CRUD.md) · [COMBOS_BUGS.md](COMBOS_BUGS.md).

---

## 0. The whole picture on one diagram

```
        BROWSER (manager tab)                 THE WIRE              SERVER
 ┌────────────────────────────────┐                      ┌──────────────────────────┐
 │ /admin/combos page.tsx         │   POST/PATCH/DELETE  │ product_handler.go       │
 │  createMut/editMut/deleteMut   │ ───────/combos──────▶│  → product_service.go    │
 │  (TanStack mutations)          │                      │     CreateCombo/Update/  │
 │                                │                      │     DeleteCombo          │
 │  onSuccess →                   │                      │       │                  │
 │  invalidateQueries(            │                      │       ├─ MySQL combos +  │
 │    ['admin','combos'])         │                      │       │   combo_items    │
 │       │                        │                      │       │   (source truth) │
 │       ▼ refetch GET /combos    │ ◀──── {data:[...]} ──│       └─ Del combos:list │  ← shared key
 └────────────────────────────────┘                      └───────────┬──────────────┘
                                                                      │ next read rebuilds
        OTHER BROWSERS (pull-only, no push)                           ▼
 ┌────────────────────────────────┐   GET /combos        ┌──────────────────────────┐
 │ customer /menu  ComboSection   │ ◀────(cached 5min)───│ combos:list (Redis)      │
 │ /menu/combo/:id detail         │      combos:list     │  = ListCombosAvailable   │
 │ order build → POST /orders     │                      │    (is_available=1 only) │
 └────────────────────────────────┘                      └──────────────────────────┘
```

Three hubs carry a combo's life across pages/devices:
1. **MySQL `combos` + `combo_items`** — the server source of truth (one row + N template rows).
2. **`combos:list` Redis cache** (String JSON, 5-min TTL, `productCacheTTL`
   [product_service.go:21](../../../../../be/internal/service/product_service.go#L21)) — the
   **shared** read path for this page *and* the customer catalog pages.
3. **`order_items`** — where a combo template goes to live after order time (header `unit_price=0`
   + N sub-items). Owned by [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md).

---

## 1. The status lifecycle every page renders against

Combos have **no order-style status machine** — their only cross-page state is `is_available`
(+ soft-delete `deleted_at`):

| State | Set by | Visible on /admin/combos? | Visible on /menu (C1/C5)? |
|-------|--------|---------------------------|----------------------------|
| `is_available=1` (only state ever produced today) | `CreateCombo` hardcodes `1` ([products.sql:130](../../../../../be/query/products.sql#L130)) | ✅ | ✅ |
| `is_available=0` | **no path** sets it (no toggle, `UpdateCombo` never touches the column) | ❌ (Bug 1 — list is available-only) | ❌ |
| `deleted_at` set | `DELETE`→`SoftDeleteCombo` ([products.sql:137](../../../../../be/query/products.sql#L137)) | gone | gone |

So in practice the lifecycle is binary: **exists-and-available** → **soft-deleted**. The
hypothetical "hidden" middle state is unreachable from the UI and, if reached, invisible everywhere
(see [COMBOS_BUGS.md Bug 1](COMBOS_BUGS.md)).

---

## 2. The moment of handoff — what this page leaves behind

A combo write leaves nothing in the browser that outlives the page (no localStorage, no persisted
store — see §Reload). What it leaves on the **server** is the durable handoff:

- **`CreateCombo`** ([product_service.go:534-569](../../../../../be/internal/service/product_service.go#L534)):
  inserts the `combos` header + N `combo_items`, then `invalidateComboCaches` Dels `combos:list`.
- **`UpdateCombo`** ([:588-623](../../../../../be/internal/service/product_service.go#L588)):
  replaces the header + **deletes & re-inserts all `combo_items`**, Dels `combos:list`.
- **`DeleteCombo`** ([:571-577](../../../../../be/internal/service/product_service.go#L571)):
  soft-deletes, Dels `combos:list`.

`invalidateComboCaches` ([:723-725](../../../../../be/internal/service/product_service.go#L723))
Dels **only `combos:list`** — not `products:list`, not any `product:<id>`. That is the single wire
along which the edit reaches every other page.

---

## 3. Downstream surface — customer `/menu` ComboSection (C1)

The customer menu reads combos through the **same `GET /combos`** endpoint and the **same
`combos:list` cache** this admin page reads. After a manager write Dels the key, the next `/menu`
fetch misses cache → rebuilds it from `ListCombosAvailable` → the new/edited/removed combo appears.
No realtime push: a customer already sitting on `/menu` sees the change only on their next refetch
(FE `staleTime` + the 5-min TTL). Endpoint/serialiser detail is owned by
[admin_combos_be.md](admin_combos_be.md) and the C1 menu BE doc
([../../customer/customer_menu/customer_menu_be.md](../../customer/customer_menu/customer_menu_be.md)).

> ⚠️ Cross-page caveat: because `/menu` reads `ListCombosAvailable` (`is_available=1`), a combo this
> page can't hide (Bug 1) is equally always-on at the customer menu — there is no "temporarily
> disable a combo" lever anywhere.

---

## 4. Downstream surface — combo detail `/menu/combo/:id` (C5)

C5 does **not** have a per-id combo endpoint — it over-fetches the whole `GET /combos` list and
finds the combo by id client-side (logged in the shared "no per-id combo endpoint" cross-page
concern in [../../BE_DOC_TRACKER.md](../../BE_DOC_TRACKER.md)). So a combo edited here propagates to
C5 by the identical `combos:list` path as C1. Item-name/price resolution on C5 likewise depends on
the shared product catalog. See [../../customer/customer_combo_detail/customer_combo_detail_be.md](../../customer/customer_combo_detail/customer_combo_detail_be.md).

---

## 5. Downstream surface — order-time combo expansion (`order_items`)

When a customer orders a combo, the template `combo_items` (the rows this page writes) are
**expanded** into `order_items`: one header row (`combo_id` set, `unit_price=0`) + N sub-item rows
(`combo_ref_id` = header id). The combo's `price` is charged once on the header's siblings — never
double-counted. This is the combo's life after the catalog. **One model, one home** — the rule and
field shapes live in [../../02_spec/BUSINESS_RULES.md §2.5](../../02_spec/BUSINESS_RULES.md) and
[../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md); not
restated here.

> Note: order_items snapshot the combo's name/price at order time, so a later `PATCH`/`DELETE` on
> this page does **not** rewrite historical orders — only future orders see the change.

---

## Multi-device sync — a non-event here

There is **no SSE/WS** on `/admin/combos`. Two managers editing combos on two devices do **not** see
each other's changes live — each sees the other's write only when its own `['admin','combos']` query
goes stale and refetches (TanStack default), or on manual reload. Contrast the order pages, which
push via SSE/WS. (Scenario Flag 5 / Flag 6.)

---

## Cancellation / reverse flows

The only reverse flow is **`DELETE /combos/:id`** (admin-only) → `SoftDeleteCombo`. It has **no
in-use guard** ([COMBOS_BUGS.md](COMBOS_BUGS.md) anchor Flag 6): a combo on a live order can be
soft-deleted; the live order is unaffected (snapshotted), but the combo vanishes from /menu and C5
immediately on their next pull. There is no "restore" path in the UI (the soft-deleted row is
filtered out by every wired read query).

---

## End-to-end timeline (all pages + devices)

```
t0  Manager edits combo price on /admin/combos      → PATCH /combos/:id
t1  BE: UpdateCombo writes header + re-inserts items → Del combos:list
t2  manager tab: invalidateQueries → refetch GET /combos (cache miss → rebuild) → table updates
t3  customer already on /menu: no change yet (holds its cached list)
t4  customer navigates/refetches /menu → cache miss → rebuilt list → new price shown
t5  customer opens /menu/combo/:id → same rebuilt combos:list → new price
t6  customer orders the combo → POST /orders → combo expands into order_items (price snapshotted)
t7  later DELETE on /admin/combos → combo gone from /menu & C5; the t6 order is untouched
```

---

## Reload (F5) behavior per page

- **/admin/combos**: holds **no** persisted client state — on F5 it re-runs `AuthGuard`+`RoleGuard`
  then refetches both queries (`['admin','combos']` + `['admin','products']`) from scratch. Open
  modal + selected items (local `useState`) are lost. See
  [admin_combos_loading.md](admin_combos_loading.md).
- **/menu, /menu/combo/:id**: re-fetch `GET /combos` (served from `combos:list` if still warm).

---

## Durability matrix — what survives what

| Datum | Survives page nav | Survives F5 | Survives across devices | Survives combos:list TTL expiry |
|-------|-------------------|-------------|--------------------------|----------------------------------|
| Combo header + items (MySQL) | ✅ | ✅ | ✅ | ✅ (source of truth) |
| `combos:list` cache | ✅ | ✅ | ✅ (shared) | ❌ (rebuilt on next read) |
| Open modal / selectedItems (local `useState`) | ❌ | ❌ | ❌ | n/a |
| order_items from a placed order | ✅ | ✅ | ✅ | ✅ (independent snapshot) |

---

## Source & rule map

| Claim | Source |
|-------|--------|
| Writes invalidate only `combos:list` | [product_service.go:723-725](../../../../../be/internal/service/product_service.go#L723) |
| `combos:list` TTL 5 min | [product_service.go:21,515](../../../../../be/internal/service/product_service.go#L21) |
| List rebuilt from `ListCombosAvailable` (available-only) | [product_service.go:505](../../../../../be/internal/service/product_service.go#L505) · [products.sql:112](../../../../../be/query/products.sql#L112) |
| UpdateCombo replaces all combo_items | [product_service.go:613-620](../../../../../be/internal/service/product_service.go#L613) |
| Soft-delete, no in-use guard | [product_service.go:571-577](../../../../../be/internal/service/product_service.go#L571) · [products.sql:137](../../../../../be/query/products.sql#L137) |
| FE invalidateQueries on each mutation | [combos/page.tsx:140,156,166](../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L140) |
| Combo expansion rule (header unit_price=0) | [../../02_spec/BUSINESS_RULES.md §2.5](../../02_spec/BUSINESS_RULES.md) · [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) |
| Shared `combos:list` cross-page concern | [../../BE_DOC_TRACKER.md](../../BE_DOC_TRACKER.md) · [../../03_be/REDIS_CACHE.md](../../03_be/REDIS_CACHE.md) |
