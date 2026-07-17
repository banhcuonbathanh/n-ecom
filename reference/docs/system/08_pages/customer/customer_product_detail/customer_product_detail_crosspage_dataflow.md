# Customer Product Detail — Cross-Page Data Flow

> **TL;DR:** ✅ implemented · what `/menu/product/:id` hands off and how that data lives across the
> pages that outlive it. This page has **no BE write** — its only durable output is a single
> `CartItem` appended to the in-memory `useCartStore`. That line is read later by the `/menu`
> CartDrawer and the `/checkout` order builder, and is finally folded into `POST /orders` **from
> those pages, not from here**. Critical durability fact: cart `items[]` is **session-memory only**
> — `partialize` persists nothing but `orderNote` + `activeOrderId`, so an added line is **wiped by
> a full page reload (F5)**.
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(shop)/menu/product/[id]/page.tsx` · `fe/src/store/cart.ts` ·
> `fe/src/types/cart.ts` · `fe/src/lib/order-payload.ts` · `fe/src/lib/storage-keys.ts`.
>
> Siblings: page → [customer_product_detail.md](customer_product_detail.md) ·
> BE → [customer_product_detail_be.md](customer_product_detail_be.md) ·
> loading → [customer_product_detail_loading.md](customer_product_detail_loading.md) ·
> scenario → [SCENARIO_PRODUCT_ADD.md](SCENARIO_PRODUCT_ADD.md).
> Order-level cross-page/device machinery (SSE, order cache, multi-device) is **not** here — it
> begins once `POST /orders` fires on `/menu`/`/checkout`: see
> [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).

---

## 0. The whole picture on one diagram

```
  ┌──────────────────────── ONE BROWSER TAB (session memory) ────────────────────────┐
  │                                                                                   │
  │  /menu/product/:id                useCartStore.items[]            /menu (CartDrawer)│
  │  ┌───────────────┐   addItem()    ┌──────────────────┐   reads   ┌───────────────┐ │
  │  │ pick toppings │ ─────────────▶ │ CartItem          │ ────────▶ │ cart rows +   │ │
  │  │ + qty, tap    │   (Zustand)    │ id=product_<id>_  │           │ total/itemCount│ │
  │  │ "Thêm vào giỏ"│                │   <toppingIds>    │           └───────────────┘ │
  │  └───────────────┘                │ type/price/qty/   │   reads   /checkout         │
  │        router.back()              │ toppings[]        │ ────────▶ order builder      │
  │                                   └──────────────────┘                              │
  │                                            │ buildOrderItemsPayload(items)          │
  │                                            ▼                                        │
  │                            (only on /menu or /checkout) ── POST /orders ──▶ THE WIRE │
  └───────────────────────────────────────────────────────────────────────────────────┘
        F5 / reload  ✗  items[] gone (not persisted) — only orderNote + activeOrderId survive
```

There is **no server hub** for this page: the product detail screen never writes to the backend.
The only hub is the in-tab Zustand store.

---

## 1. The moment of handoff — what this page leaves behind

`handleAddToCart` (`page.tsx:33-46`) is the single handoff. It builds one `CartItem` and calls
`useCartStore.addItem`:

| Field | Value on this page | Source |
|---|---|---|
| `id` | `` `product_${product.id}_${toppingKey \|\| 'plain'}` `` where `toppingKey` = selected topping ids sorted + joined with `-` | `page.tsx:35-37` |
| `type` | `'product'` (this page never produces combos) | `page.tsx:38` |
| `product_id` | `product.id` | `page.tsx:39` |
| `name` | `product.name` | `page.tsx:40` |
| `quantity` | local `qty` stepper (min 1) | `page.tsx:41` |
| `price` | `unitPrice` = `product.price + Σ selected topping.price` (FE-computed) | `page.tsx:30,42` |
| `toppings` | the selected `Topping[]` objects | `page.tsx:28,43` |

`CartItem` shape → `fe/src/types/cart.ts:11-21`. The line is **priced client-side**; the server
re-snapshots name/price/toppings only at order-create time elsewhere (see
[customer_product_detail_be.md](customer_product_detail_be.md) Flag 1).

After `addItem`, the page calls `router.back()` (`page.tsx:45`) — it does **not** navigate to the
cart; it returns to `/menu`, where the new line is already visible.

---

## 2. The dedup key — why "add twice" merges

`addItem` (`cart.ts:50-60`) keys on `CartItem.id`. Because the id encodes the **sorted** selected
topping ids (`page.tsx:35`), adding the *same product with the same toppings* twice **increments
quantity** on the existing line rather than creating a duplicate. Adding the same product with a
*different* topping set produces a *different* id → a separate line. "No toppings" collapses to the
suffix `_plain`.

> This is the same merge rule the `/menu` ProductCard quick-add relies on, so a line added from the
> detail page and a line added from the menu card stack into one row iff their topping selection
> matches.

---

## 3. Downstream surface 1 — `/menu` (CartDrawer)

The CartDrawer on `/menu` reads `useCartStore` selectors (`items`, `total()`, `itemCount()`,
`cart.ts:124-125`) live. Because Zustand is a shared in-memory singleton, the line written here is
visible the instant `router.back()` lands on `/menu` — no refetch, no prop passing. The bottom-nav
cart badge (`itemCount`) also updates (the detail page itself reads `itemCount()` at `page.tsx:18`).

## 4. Downstream surface 2 — `/checkout` (order builder)

`/checkout` (and the `/menu` table-confirm path) turn the same `items[]` into the order request via
the single builder `buildOrderItemsPayload(items)` (`order-payload.ts:27-58`). For a standalone
product line it emits `{ product_id, combo_id:null, quantity, topping_ids: toppings.map(t=>t.id) }`
(`order-payload.ts:46-54`). This page's line therefore flows untouched into `POST /orders`. The
builder is the **only** cart→order translation — this page must not (and does not) build a payload
itself.

> Everything past `POST /orders` — the order row, SSE/WS fan-out, the `order_cache_*` localStorage
> snapshot, multi-device tracking — is documented once, at
> [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).
> This page contributes a cart line and nothing more.

---

## 5. Reload (F5) behavior

| What | Survives reload? | Why |
|---|---|---|
| The `CartItem` added here | **✗ No** | `partialize` (`cart.ts:153`) persists only `{ orderNote, activeOrderId }`; `items[]` is session-memory only |
| `orderNote` | ✓ Yes | in `partialize` |
| `activeOrderId` | ✓ Yes | in `partialize` |
| `tableId` / `tableName` | ✗ No | not in `partialize` |

Persistence target: localStorage key `cart-config-v3` (`STORAGE_KEYS.CART_CONFIG`,
`storage-keys.ts:6`), Zustand `persist` version 5 (`cart.ts:129`). The store comment is explicit:
*"canh items live in items[] but items is NOT persisted (session-only). Only orderNote and
activeOrderId survive page reload."* (`cart.ts:151-153`).

**Implication / Flag:** a diner who customizes a product, adds it, then reloads the tab (or whose
tab is evicted) loses the cart silently. There is no rehydration of `items[]`.

---

## 6. Multi-device / cross-tab

**None.** The cart is in-memory Zustand (with only the two scalar fields mirrored to localStorage).
There is no BE cart, no SSE, no `BroadcastChannel`. A second tab or device shares **nothing** of the
in-progress cart — they would only converge after an order is actually created on the server.

---

## Durability matrix

| Layer | Holds | Scope | Lost when |
|---|---|---|---|
| Zustand memory | `items[]` (incl. this page's line), `tableId/Name` | one tab, one session | reload, tab close, navigation away from app |
| localStorage `cart-config-v3` | `orderNote`, `activeOrderId` only | one browser | manual clear / key version bump |
| Server (MySQL) | nothing from this page | — | this page never writes |

---

## Source & rule map

- Handoff write: `fe/src/app/(shop)/menu/product/[id]/page.tsx:33-46`
- Store + merge + persistence: `fe/src/store/cart.ts:50-60, 124-125, 127-154`
- CartItem shape: `fe/src/types/cart.ts:11-21`
- Cart→order builder: `fe/src/lib/order-payload.ts:27-58`
- Storage key: `fe/src/lib/storage-keys.ts:6`
- Order-level cross-page flow (downstream of `POST /orders`):
  [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md)
