# Combo Detail — `/menu/combo/:id` · Cross-Page Data Flow

> **TL;DR:** ✅ implemented · this page is **read-only on the BE** and its only handoff is **one
> combo cart item written to the cart store**. That item then rides the same cart→order pipeline as
> any menu item. **Critically, the cart `items[]` are NOT persisted** — the cart store's
> `partialize` keeps only `orderNote` + `activeOrderId`, so a combo added here **does not survive an
> F5** and is lost if the browser is reloaded before submitting on `/menu`.
> Sources: `fe/src/app/(shop)/menu/combo/[id]/page.tsx:58-71` (handoff) ·
> `fe/src/store/cart.ts` (store + `partialize:153`) · `fe/src/lib/storage-keys.ts:6` ·
> `fe/src/lib/order-payload.ts` (downstream consumer) · `fe/src/types/cart.ts`.
>
> Siblings → [page](customer_combo_detail.md) · [BE](customer_combo_detail_be.md) ·
> [loading](customer_combo_detail_loading.md) · [scenario](SCENARIO_COMBO_ADD.md) ·
> the fuller cart→order story it links into →
> [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md)

---

## 0. The whole picture on one diagram

```
  /menu/combo/:id  (this page)                 BROWSER HUB                      SERVER
  ──────────────────────────────               ───────────                     ──────
  handleAddToCart()                                                            (no write)
   └─ useCartStore.addItem({                ┌─ cart store (Zustand) ─┐
        id: combo_<id>, type:'combo',  ───▶ │  items[]  ← session-only│
        combo_id, name, qty, price,         │  (NOT persisted)        │
        combo_items:[{product_id,           │  orderNote, activeOrder │──persist──▶ localStorage
          product_name, qty, unit_price}] }) │   Id  → localStorage    │            'cart-config-v3'
   └─ router.back()  →  /menu                └────────────┬───────────┘
                                                          │
                       downstream (NOT on this page):     ▼
                       /menu CartDrawer ─ buildOrderItemsPayload() ─▶ POST /orders ─▶ MySQL
                       /checkout (online path) ────────────────────▶ POST /orders
```

This page never touches THE WIRE. Its entire cross-page footprint is the single `addItem` call.

## 1. The status lifecycle this page renders against

None. This page renders against the **combo catalog** (static-ish, 5-min cached), not against any
order/entity status. It has no SSE/WS, no order id, no live state. The order status lifecycle begins
only **after** the cart is submitted downstream — see
[../customer_menu/customer_menu_crosspage_dataflow.md §1](../customer_menu/customer_menu_crosspage_dataflow.md).

## 2. The moment of handoff — what this page leaves behind

`handleAddToCart` (`page.tsx:58-71`) writes exactly one `CartItem` of `type:'combo'`:

| Field | Value | Why it matters downstream |
|---|---|---|
| `id` | `` `combo_${combo.id}` `` | Dedup key — adding the same combo again increments `quantity` (`cart.ts:50-60`), it does not duplicate the row. |
| `combo_id` | `combo.id` | Becomes `combo_id` on the `POST /orders` row (`order-payload.ts:40`). |
| `quantity` | stepper value | Number of whole combos. |
| `price` | `combo.price` | FE display/total only — **BE re-snapshots price at order time** (header `unit_price=0` + sub-item rows); client price is never trusted. |
| `combo_items[]` | `{product_id, product_name, quantity, unit_price}` per sub-item | The payload builder turns the non-canh sub-items into `combo_items` overrides (`order-payload.ts:31-44`). `product_id` is the field that must survive. |
| `toppings` | `[]` | This page sends no toppings; the builder still maps `item.toppings → topping_ids` on each override (`order-payload.ts:36`). |

After the write, `router.back()` returns to `/menu`. The page holds **no other state** that outlives
it.

## 3. Downstream surface — `/menu` (CartDrawer → `POST /orders`)

The cart item is consumed on `/menu`, never here:

- `buildOrderItemsPayload(items)` (`order-payload.ts:27-58`) is the **single** cart→order converter.
  For a combo row it emits `{ product_id:null, combo_id, quantity, topping_ids:[], combo_items? }`
  where `combo_items` overrides are the **non-canh** sub-items (`order-payload.ts:34-36`) — canh is
  stripped because canh lives as standalone cart items, never inside a combo.
- The BE then **expands the combo** at write time (header line `unit_price=0` + priced sub-item
  rows). Rule home: [../../02_spec/BUSINESS_RULES.md §2.5 Combo Expansion](../../02_spec/BUSINESS_RULES.md) ·
  pipeline: [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md).
  Do not re-read those rules here — this page only *produces the input* to them.

## 4. Downstream surface — `/checkout` (online path)

Same cart, same `buildOrderItemsPayload` — the online checkout form reuses the identical builder, so
a combo added here is submittable through either path with no shape difference. Detail lives in
[../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).

## 5. Reload (F5) behavior on this page

| What | Survives F5? | Why |
|---|---|---|
| The combo being viewed | re-fetched | Both `GET /combos` + `GET /products` re-run (TanStack cache may serve them within 5-min `staleTime`). |
| A combo just added to cart | **NO** | `cart.ts` `partialize:153` persists only `orderNote` + `activeOrderId`; `items[]` is session-only (in-memory). A reload before submitting on `/menu` **drops the combo**. |
| `orderNote`, `activeOrderId` | yes | The only two persisted keys (localStorage `cart-config-v3`). |

## Durability matrix

| Data | Where it lives | Survives nav to /menu | Survives F5 | Survives tab close |
|---|---|---|---|---|
| Combo cart item (`combo_<id>`) | cart store `items[]` (memory) | ✅ (SPA nav keeps the store) | ❌ | ❌ |
| `orderNote` / `activeOrderId` | localStorage `cart-config-v3` | ✅ | ✅ | ✅ |
| Combo catalog data | TanStack Query cache | ✅ (shared `['combos']`/`['products-all']` keys) | re-fetched | ❌ |

## Source & rule map

- Handoff: `fe/src/app/(shop)/menu/combo/[id]/page.tsx:58-71`
- Cart store + persistence boundary: `fe/src/store/cart.ts:40-156` (`partialize:153`, `addItem:50-60`)
- Storage key: `fe/src/lib/storage-keys.ts:6` (`CART_CONFIG = 'cart-config-v3'`)
- Cart→order conversion: `fe/src/lib/order-payload.ts:27-58`
- Cart item shape: `fe/src/types/cart.ts:11-21`
- Combo expansion rule (downstream, not restated): `../../02_spec/BUSINESS_RULES.md` §2.5 ·
  `../../02_spec/object/OBJECT_MODEL_ORDER.md`

> ⚠️ **Drift note:** the storage key constant is named `CART_CONFIG = 'cart-config-v3'`
> (`storage-keys.ts:6`) while the Zustand persist `version` is `5` (`cart.ts:129`). The `v3` in the
> key string is now just a frozen literal, not the live schema version — harmless but mismatched.
