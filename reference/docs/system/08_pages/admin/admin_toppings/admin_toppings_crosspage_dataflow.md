# Admin Toppings — Cross-Page Data Flow

> **TL;DR:** ✅ implemented · How a topping write on `/admin/toppings` lives across the other
> pages/devices that outlive it. There is **no realtime push** — a topping create/edit/delete only
> mutates the single `toppings` DB row + Dels two shared Redis caches (`toppings:list`,
> `products:list`); every downstream consumer (customer `/menu`, product detail, POS, the product
> form) sees the change **on its next fetch**, bounded by the 5-min Redis TTL + each client's
> TanStack `staleTime`. The two admin-side TanStack caches (`['admin','toppings']`,
> `['admin','products']`) are **browser-local** — not shared cross-device.
> Traced from source on branch `experience_claude.md_system_1`.
>
> Sources: `fe/src/app/(dashboard)/admin/toppings/page.tsx` ·
> `fe/src/app/(dashboard)/admin/toppings/_components/ToppingFormModal.tsx` ·
> `fe/src/features/admin/admin.api.ts` · `be/internal/service/product_service.go`.
>
> **Siblings:** [admin_toppings.md](admin_toppings.md) · [admin_toppings_be.md](admin_toppings_be.md) ·
> [admin_toppings_loading.md](admin_toppings_loading.md) ·
> [SCENARIO_TOPPING_CRUD.md](SCENARIO_TOPPING_CRUD.md)

---

## 0. The whole picture on one diagram

```
        ADMIN BROWSER (this page)                 SERVER HUB                    OTHER BROWSERS / DEVICES
 ┌──────────────────────────────────┐                                       ┌───────────────────────────┐
 │ TanStack caches (browser-local): │                                       │  customer phones / POS /  │
 │  ['admin','toppings'] (60s stale)│                                       │  other admin tabs         │
 │  ['admin','products'] (60s stale)│                                       └───────────────────────────┘
 └───────────────┬──────────────────┘                                                    ▲
                 │ POST/PATCH/DELETE /toppings*                                           │ next fetch only
                 ▼                              ┌──────────────────────────┐              │ (no SSE/WS push)
        ───────── THE WIRE ──────────────────▶ │  toppings  DB row (1)    │              │
                                                │  (soft-delete, snapshot- │              │
                                                │   safe for past orders)  │              │
                                                ├──────────────────────────┤              │
        invalidateToppingCaches  ────────────▶ │  Redis: Del              │ ────────────▶│
        (product_service.go:719-721)           │   toppings:list          │   served on   │
                                                │   products:list          │   next read   │
                                                │   (NOT product:<id>) ⚠️   │               │
                                                └──────────────────────────┘
```

The durable hub is **one `toppings` table row + two shared Redis list caches**. No Redis pub/sub,
no SSE, no WebSocket touches topping data — the orders WS/SSE channels carry order events only
(see [../../03_be/REALTIME_SSE.md](../../03_be/REALTIME_SSE.md)). So topping changes propagate by
**pull**, never push.

---

## 1. The data this page leaves behind

A topping write on `/admin/toppings` produces exactly one durable artifact and two cache deletions:

| Action | Endpoint | DB effect | Cache effect |
|---|---|---|---|
| Create | `POST /toppings` | new `toppings` row, `is_available=1` | Del `toppings:list` + `products:list` |
| Edit | `PATCH /toppings/:id` | `name`/`price` UPDATE (+ `is_available` raw-SQL UPDATE if sent) | Del `toppings:list` + `products:list` |
| Delete | `DELETE /toppings/:id` | soft delete (`deleted_at=NOW()`) | Del `toppings:list` + `products:list` |

All three go through `invalidateToppingCaches` (`be/internal/service/product_service.go:719-721` →
`rdb.Del("toppings:list", "products:list")`). Full per-endpoint trace →
[admin_toppings_be.md](admin_toppings_be.md). Field names → [../../02_spec/DB_SCHEMA.md](../../02_spec/DB_SCHEMA.md).

**Snapshot safety:** editing or deleting a topping never rewrites history — past orders carry their
own `order_items.toppings_snapshot` copied at order time (business rule →
[../../02_spec/BUSINESS_RULES.md §2](../../02_spec/BUSINESS_RULES.md)). So the cross-page fan-out
below only affects **live catalog reads**, not existing orders.

---

## 2. Downstream surface — who reads what this page wrote

Both Redis keys this page Dels are read by other pages. After invalidation, the next reader on each
page rebuilds the cache from MySQL and sees the change:

### 2.1 `toppings:list` consumers

- **This page itself** (`GET /toppings`, `toppings/page.tsx:19-23`) — the admin list re-reads it on
  the `['admin','toppings']` invalidation fired by every local mutation
  (`page.tsx:46`, `ToppingFormModal.tsx:50`).
- That is the **only** page that lists raw toppings; customers see toppings *embedded in products*,
  via `products:list` (next section).

### 2.2 `products:list` consumers (toppings ride inside each product's JSON)

Topping edits Del `products:list` because every product's serialized JSON embeds its toppings
(`productJSON`, see [admin_products_be.md](../admin_products/admin_products_be.md)). So a topping
price/name/availability change reaches, on next fetch:

- **Customer `/menu` (C1)** — `GET /products` reads `products:list`
  ([customer_menu_be.md](../../customer/customer_menu/customer_menu_be.md)).
- **POS `/pos` (S4)** — same `GET /products`
  ([staff_pos_be.md](../../staff/staff_pos/staff_pos_be.md)).
- **The product form on `/admin/products` (A3)** — its topping picker reads the topping list to
  attach/detach toppings ([admin_products_be.md](../admin_products/admin_products_be.md)).

### 2.3 ⚠️ The stale outlier — customer product detail (C4)

`invalidateToppingCaches` Dels `toppings:list` + `products:list` but **never** `product:<id>`
(`product_service.go:719-721`). The customer **product-detail** page (`/menu/product/:id`, the only
reader of `product:<id>`) therefore serves a **stale topping price/availability for up to 5 min**
(Redis TTL) plus the FE 5-min `staleTime`. This asymmetry is logged as a standing Cross-Page
Concern (C4) — see [../../08_pages/BE_DOC_TRACKER.md (Cross-Page Concerns)](../BE_DOC_TRACKER.md#cross-page-concerns)
and [admin_toppings_be.md Flag 2](admin_toppings_be.md). A topping write on **this** page is one of
the two write-sources (the other is the topping picker on A3) that trigger this staleness on C4.

---

## 3. Multi-device sync — one edit, N screens

There is **no multi-device push**. A manager editing a topping on one device does not move any
other screen in real time:

- Another open `/admin/toppings` tab keeps its cached list until its own `staleTime` (60s) lapses or
  it refetches (focus/remount) — it does **not** receive the first tab's invalidation (TanStack
  caches are per-browser, `toppings/page.tsx:22`).
- Customer phones already on `/menu` keep their 5-min-`staleTime` snapshot; they pick up the change
  on the next refetch or navigation.

The only shared coordination point is the server (DB + Redis). Cross-device "sync" = "everyone
re-reads the same row eventually."

---

## 4. Reverse / delete flow

`DELETE /toppings/:id` is **soft delete** with **no in-use guard** (`product_service.go:486-492`;
[admin_toppings_be.md Flag 3](admin_toppings_be.md)). After the Del:

- The topping disappears from `GET /toppings` and from every product's embedded topping list (all
  reads filter `deleted_at IS NULL`), so it vanishes from `/menu`, product detail, POS, and the A3
  picker on their next fetch.
- The `product_toppings` junction rows for that topping **remain** in the DB (the FK `ON DELETE
  CASCADE` fires only on a hard delete) — harmless because the join filters out soft-deleted
  toppings.
- No undo / restore path exists in the UI or BE.

---

## 5. Reload (F5) behavior

| Page | On F5 |
|---|---|
| `/admin/toppings` (this page) | Re-runs both `useQuery`s cold → `GET /toppings` + `GET /products/all`; `staleTime 60s` means a fast remount within 60s may serve cache. No client-persisted state (no Zustand/localStorage here). |
| Customer `/menu`, `/pos`, `/admin/products` | Re-fetch their own catalog queries; pick up any topping change committed before the fetch (subject to the 5-min Redis TTL). |
| Customer `/menu/product/:id` (C4) | Re-fetch `GET /products/:id`; **still** served from a stale `product:<id>` for up to 5 min after a topping edit (§2.3). |

---

## 6. Durability matrix

| Datum | Lives in | Survives admin F5? | Survives cross-device? | Pushed live? |
|---|---|---|---|---|
| Topping row (name/price/is_available) | MySQL `toppings` | ✅ | ✅ (one source of truth) | ❌ pull-only |
| `toppings:list` / `products:list` | Redis (5-min TTL) | ✅ (until TTL/Del) | ✅ shared | ❌ |
| `product:<id>` detail | Redis (5-min TTL) | ✅ | ✅ shared | ❌ — **not invalidated by topping writes** ⚠️ |
| `['admin','toppings']` / `['admin','products']` | TanStack (browser memory) | ❌ refetch | ❌ per-browser | ❌ |
| Past-order topping price | `order_items.toppings_snapshot` | ✅ | ✅ | n/a — frozen at order time |

---

## 7. Source & rule map

- Topping write + invalidation: `be/internal/service/product_service.go:452,467,486,719-721`;
  per-endpoint detail → [admin_toppings_be.md](admin_toppings_be.md).
- FE mutations + query keys: `fe/src/app/(dashboard)/admin/toppings/page.tsx:19-50`,
  `_components/ToppingFormModal.tsx:44-62`; API paths `fe/src/features/admin/admin.api.ts:54-66`.
- Caches: [../../03_be/REDIS_CACHE.md](../../03_be/REDIS_CACHE.md) (`toppings:list`, `products:list`).
- Snapshot rule: [../../02_spec/BUSINESS_RULES.md §2](../../02_spec/BUSINESS_RULES.md).
- Standing cross-page concern (C4 stale `product:<id>`):
  [../BE_DOC_TRACKER.md (Cross-Page Concerns)](../BE_DOC_TRACKER.md#cross-page-concerns).
