# Customer Menu — Cross-Component Data Flow (the 11:40 order, in depth)

> **What this is:** a deep zoom on **one beat** of the lunch rush —
> *[SCENARIO_LUNCH_RUSH.md](../../../02_spec/object/SCENARIO_LUNCH_RUSH.md) → "11:40 — 1 guest sits at Bàn 01"* —
> told from the **`/menu` page's point of view**. It answers one question:
> **how do the widgets on this single page share the data for this order, without prop-drilling?**
>
> It is the on-page (cross-**component**) companion to two existing docs:
> - [customer_menu.md](customer_menu.md) — the page's zones, wireframe, object model.
> - [customer_menu_be.md](customer_menu_be.md) — what crosses the wire to the BE.
> - The scenario's §A–§D cover the same flow more briefly; this file is the long version of **§A**.
>
> Traced from source on branch `experience_claude.md_system_1_test_iphon2_change_code`:
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/lib/order-payload.ts`](../../../../../fe/src/lib/order-payload.ts) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts).

---

## 0. The order, in one line

> A solo guest scans the **Bàn 01** QR and orders **1× Suất Giò** (₫25,000) — bánh with **nhân thịt**,
> plus a **Canh có rau**. *Suất Giò* = `1 Giò · 4 Bánh Cuốn · 1 Canh`, but the canh is chosen separately.

Everything below is how the `/menu` page assembles *that* selection on screen before a single byte leaves
the browser.

### The whole picture on one screen

```
                         /menu  page  (Bàn 01)
┌──────────────────────────────────────────────────────────────────┐
│  A  MenuHeader      [photo banner] "Quán Bánh Cuốn"  (no table)   │
├──────────────────────────────────────────────────────────────┬──┤
│  🛒 MiniCartStrip         "1 món · 25.000đ"  [Xem giỏ →]  ◀────┤  │
├──────────────────────────────────────────────────────────────┼──┤
│  E  ComboSection   ┌────────────────────────────┐             │  │
│                    │ Suất Giò   25.000đ    [+]──┼──writes──┐  │  │
│                    └────────────────────────────┘          │  │  │
│  F  ProductList    ┌────────────────────────────┐          │  │  │
│                    │ Canh (có rau)         [+]──┼──writes─┐│  │  │
│                    └────────────────────────────┘         ││  │  │
│  ▢  ToppingModal   nhân thịt ✓ ──────────writes──────────┐││  │  │
├──────────────────────────────────────────────────────────┼┼┼─┼──┤
│  I  OrderSummary   ◉ Bàn 01 (pill)  "1× Suất Giò + …" ◀───┼┼┼─┤  │
│                     (shakes if no canh)                   │││ │  │
├──────────────────────────────────────────────────────────┼┼┼─┼──┤
│  J  Floating pills      🛒 1  (count badge, no total)  ◀──┼┼┼─┤  │
│     (bottom-right)       [ Thanh toán ]  (dims if no canh)│┼┼─┤  │
└──────────────────────────────────────────────────────────┼┼┼─┼──┘
                                                            ▼▼▼ ▲
                    ┌───────────────────────────────────────────────┐
                    │            useCartStore  (Zustand)            │
                    │            ── one module singleton ──         │
                    │   items[] · tableId · tableName · orderNote   │
                    │   total() · itemCount()   ← selectors         │
                    └───────────────────────────────────────────────┘
                       ▲ writes (taps)        reads (renders) ▲
                       └──────────  no props pass between widgets
```

**Read it like this:** taps flow *down* into the store (`writes`); renders flow *up* out of the store
(`reads`). No arrow ever goes widget-to-widget — the store is the only hub.

---

## 1. The cast of components (this order only)

From [customer_menu.md → Zones](customer_menu.md#zones), the widgets that touch **this** order and what
each one binds to. Note the right column: almost every one reads the **same store**.

| Zone | Component | Reads / writes for the 11:40 order | Data source |
|---|---|---|---|
| A Header | `MenuHeader` | static photo banner — **no table label** (the "Bàn 01" pill moved to zone I) | static asset (no store read) |
| Mini cart | `MiniCartStrip` | reads **"1 món · 25.000đ"** | `useCartStore` (selectors) |
| E Combos | `ComboSection` | writes Suất Giò → `addItem()` | `GET /combos` (read) + `useCartStore` (write) |
| F Products | `ProductList` | writes the canh row | catalog (read) + `useCartStore` (write) |
| Topping modal | `ToppingModal` | picks **nhân thịt** | local `useState` → `useCartStore` on confirm |
| I Order summary | `OrderSummary` | renders **"Bàn 01" pill** + preview + canh-shake gate | `useCartStore` (tableName, items, note) |
| J Floating pills | `CartBottomBar` | floating cart pill (🛒 + count badge, **no total**) + Thanh toán (dims if no canh) | `useCartStore` (`itemCount()`) |
| Cart drawer | `CartDrawer` | edit qty / remove | `useCartStore`; submits via `order-payload.ts` |
| Confirm modal | `TableConfirmModal` | the actual `POST /orders` | builds payload from `useCartStore` |

**The pattern:** 9 widgets, **0 props passed between them**. They coordinate purely by subscribing to one
store. That is the whole answer to "how is data managed cross-component" — the rest of this file is *how*.

---

## 2. The single source: one Zustand store, a module singleton

`useCartStore` ([`cart.ts:40`](../../../../../fe/src/store/cart.ts)) is created **once** at module load
(`create<CartState>()(...)`). Every component that calls `useCartStore(...)` subscribes to that **same**
instance — there is no provider, no context, no prop tree. This is the project's [State Management Layer 2
rule](../../../04_fe/STATE_MANAGEMENT.md): **client state → Zustand, in memory.**

```
                  ❌ what we DON'T do            ✅ what we DO do
                  (prop-drilling tree)           (shared singleton)

                      <MenuPage>                   ComboSection ─┐
                     /    |    \                   ProductList ──┤
              Header  Combo   Cart                 ToppingModal ─┼─▶ useCartStore ─┐
                |       |       |  props…          OrderSummary ◀┤                 │
              Mini    Topping  Bottom              CartBottomBar ◀┘                 │
                |       |       |                  MiniCartStrip ◀──────────────────┘
              Summary  …       …
            (every level re-passes the cart)    (everyone reads/writes the hub directly)
```

### 2.1 The exact store shape (traced)

```ts
interface CartState {
  // ── data ───────────────────────────────────────────────
  items:         CartItem[]        // the cart lines  (session-only — see §6)
  tableId:       string | null     // set from the QR scan
  tableName:     string | null     // "Bàn 01"  → OrderSummary pill (zone I)
  activeOrderId: string | null     // set AFTER the order is created (cross-page handoff)
  paymentMethod: string | null
  orderNote:     string            // "Ghi chú cho bếp"

  // ── writers (mutations) ────────────────────────────────
  addItem / removeItem / updateQty / updateComboItem
  setCanhQty                       // canh-specific upsert/remove
  setTableId / setTableName / setActiveOrderId / setOrderNote
  clearCart

  // ── selectors (derived, recomputed from items) ─────────
  total()        // Σ price × quantity
  itemCount()    // Σ quantity
}
```

### 2.2 Why selectors are the key to "components never disagree"

`total()` and `itemCount()` are **not stored numbers** — they are computed on read from `items`
([`cart.ts:124-125`](../../../../../fe/src/store/cart.ts)):

```ts
total:     () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
```

So when the guest adds Suất Giò, the MiniCartStrip total, the OrderSummary preview total, and the floating
cart's count badge are **views of the same derived values** (`total()` / `itemCount()`). They cannot drift
apart, because none of them holds its own copy — they all recompute from the one `items` array. That is why
the [customer_menu.md interaction note](customer_menu.md#key-interactions) can promise the preview always
matches the floating cart.

---

## 3. The 11:40 order, step by step — who writes, who reads

> **Watch the store grow.** Each step shows the `useCartStore` snapshot *after* the action, so you can see
> exactly what every widget is reading at that moment.

### Step 1 — QR scan seeds the table (before any food)

Scanning the Bàn 01 QR routes through `/table/:id`, which calls `setTableId()` + `setTableName("Bàn 01")`.
Two effects, both via the store, no props:

```
setTableName("Bàn 01") ──▶ useCartStore ──▶ OrderSummary re-renders → "Bàn 01" pill (header is static)
setTableId(<uuid>)     ──▶ useCartStore ──▶ (decides the checkout branch later — see Step 6)
```

```
  STORE AFTER STEP 1
  ┌─────────────────────────────────────────┐
  │ tableId:    "<uuid Bàn 01>"              │
  │ tableName:  "Bàn 01"                     │
  │ items:      [ ]            ← empty        │
  │ total():    0      itemCount(): 0         │
  └─────────────────────────────────────────┘
```

### Step 2 — Add the combo (the one optimistic write in the app)

Tapping `[+]` on Suất Giò in `ComboSection` calls `addItem()` with a `CartItem` of `type: 'combo'`.
`addItem` ([`cart.ts:50`](../../../../../fe/src/store/cart.ts)) **dedups by `id`**: same id → bump
`quantity`, new id → append. The combo's cart id is `combo_<id>` (one combo = one line).

This is **instant** — no network wait. It is the *only* optimistic update in the app
([scenario §A](../../../02_spec/object/SCENARIO_LUNCH_RUSH.md), LOADING_PATTERNS §Optimistic).

```
  STORE AFTER STEP 2-3  (combo added, nhân chosen)
  ┌──────────────────────────────────────────────────────────────┐
  │ items: [                                                      │
  │   { id:"combo_<SuấtGiò>", type:"combo", quantity:1,          │
  │     price:25000,                                              │
  │     toppings:[ {Nhân thịt, ₫0} ],   ← nhân lives HERE         │
  │     combo_items:[ Giò×1, Bánh Cuốn×4, Canh×1 ] }              │
  │ ]                                                             │
  │ total(): 25000     itemCount(): 1                             │
  └──────────────────────────────────────────────────────────────┘
            │
            └─▶ canh gate: items.some(id startsWith "canh_") = FALSE
                ⇒ "Thanh toán" pill DIMMED, OrderSummary will SHAKE 🔴
```

### Step 3 — Nhân thịt is a **topping**, not a field

The guest picks **nhân thịt** in `ToppingModal`. The modal's open/closed flag stays in **local
`useState`** (single-widget state never enters the store). On confirm, the choice lands in the combo
`CartItem.toppings[]` as a `{ id, name, price: 0 }`. There is **no `filling` column** anywhere — nhân is
modelled as a ₫0 topping (the TOP epic; see [customer_menu.md §5](customer_menu.md#5--cart-objects-write-side--pointer-only)).

### Step 4 — Canh có rau is its **own** cart row (not inside the combo)

The guest sets the canh via `setCanhQty(productId, rauTopping, 'rau', 1)`
([`cart.ts:97`](../../../../../fe/src/store/cart.ts)). This upserts a **standalone** line with a stable id:

| Choice | Cart id (`canhCartId`) | `toppings` |
|---|---|---|
| Có rau | `canh_<productId>_rau` | `[Rau mùi tàu]` |
| Không rau | `canh_<productId>_plain` | `[]` |
| qty 0 | — | row removed |

Stable ids mean the *same logical bowl* is always the same line — re-selecting "có rau" updates the
existing row instead of creating a duplicate. Price is always `0`.

```
  STORE AFTER STEP 4  (canh có rau added)
  ┌──────────────────────────────────────────────────────────────┐
  │ items: [                                                      │
  │   { id:"combo_<SuấtGiò>",      … as above … },               │
  │   { id:"canh_<Canh>_rau", type:"product", quantity:1,        │
  │     price:0, toppings:[ {Rau mùi tàu, ₫0} ] }   ← NEW row     │
  │ ]                                                             │
  │ total(): 25000     itemCount(): 2                            │
  └──────────────────────────────────────────────────────────────┘
            │
            └─▶ canh gate: items.some(id startsWith "canh_") = TRUE
                ⇒ "Thanh toán" pill ENABLED ✅
```

### Step 5 — One write, every widget re-renders (the fan-out)

After Steps 2–4 the `items` array holds **two lines** (the combo + the canh). Each mutation triggered a
store update, and **every subscribed widget recomputed in lockstep**:

```
ComboSection.addItem() ───────┐
ToppingModal (nhân thịt) ──────┼──▶  useCartStore.items  ──┬──▶ MiniCartStrip   "1 món · 25.000đ"
ProductList / setCanhQty ──────┘     (Zustand singleton)   ├──▶ OrderSummary    preview + ghi chú
                                                           └──▶ Floating pills  🛒 1 (count) · [Thanh toán]
```

(`MenuHeader` does not re-render here — it is a static photo banner; `tableName` was already wired to the
OrderSummary pill back in Step 1.)

No widget told another widget anything. They all observed the store.

### Step 6 — The canh-required gate (a cross-component rule keyed off an id convention)

Before checkout, `CartBottomBar` dims and `OrderSummary` shakes unless the cart contains a canh. The check
is **not** a type field — it keys off the id convention from Step 4
([customer_menu.md §5](customer_menu.md#5--cart-objects-write-side--pointer-only)):

```ts
items.some(i => i.id.startsWith('canh_'))   // true here → gate open, Thanh toán enabled
```

Two separate components (the dim in J, the shake in I) read the **same `items`** and reach the **same
verdict** — again, no shared prop, just shared store.

### Step 7 — The checkout branch is decided by store state

Tapping **Thanh toán**, the page reads `tableId` from the store:

- `tableId` set (our QR case) → open **`TableConfirmModal`** (popup confirm only — no `/checkout`, no
  name/phone). ← this order.
- `tableId` null → `router.push('/checkout')`.

This is the [customer_menu.md Key Interaction](customer_menu.md#key-interactions) — the branch is **data**
(store state), not a separate route the component hard-codes.

### Step 8 — Cart → payload → POST (the one builder)

`TableConfirmModal` does **not** build `items[]` by hand. It calls the single builder
`buildOrderItemsPayload(cart.items)` ([`order-payload.ts:27`](../../../../../fe/src/lib/order-payload.ts)).
For our two cart lines it produces (traced from the code):

```jsonc
[
  { "product_id": null, "combo_id": "<Suất Giò>", "quantity": 1, "topping_ids": [],
    "combo_items": [                                  // canh stripped; nhân applied to each non-canh dish
      { "product_id": "<Giò>",       "quantity": 1, "topping_ids": ["<Nhân thịt>"] },
      { "product_id": "<Bánh Cuốn>", "quantity": 4, "topping_ids": ["<Nhân thịt>"] }
    ] },
  { "product_id": "<Canh>", "combo_id": null, "quantity": 1, "topping_ids": ["<Rau mùi tàu>"] }
]
```

The three transforms the builder performs, all visible in [`order-payload.ts`](../../../../../fe/src/lib/order-payload.ts):

1. **Combo → header + overrides.** A `type:'combo'` line becomes `product_id: null` + `combo_id` +
   `combo_items` overrides ([line 31–45](../../../../../fe/src/lib/order-payload.ts)).
2. **Canh stripped from the combo.** `isSoupName()` filters canh out of the overrides
   ([line 13, 35](../../../../../fe/src/lib/order-payload.ts)) — it travels only as its standalone row.
   *(The BE treats supplied `combo_items` as the **complete** sub-item list, so omitting canh means the BE
   never re-expands it.)*
3. **Toppings flattened to ids.** `item.toppings.map(t => t.id)` — the combo's nhân is applied to every
   non-canh sub-item; the standalone canh carries its own `Rau mùi tàu`
   ([line 36, 52](../../../../../fe/src/lib/order-payload.ts)).

> **Why one builder matters:** the same `buildOrderItemsPayload()` is used by the table-confirm modal,
> online checkout, and add-to-order — so all three produce byte-identical payloads **and** match the
> "Tổng số món" preview exactly. Building `items[]` inline in a page is forbidden (fe/CLAUDE.md).
> What happens to this payload server-side (combo explodes into a ₫0 header + priced children, `total_amount`
> derived) is [customer_menu_be.md](customer_menu_be.md) / [scenario §② ](../../../02_spec/object/SCENARIO_LUNCH_RUSH.md).

### Step 9 — Handoff and forget

On `201`, the page:
1. `clearCart()` ([`cart.ts:89`](../../../../../fe/src/store/cart.ts)) — empties only the **draft**
   (`items`, `paymentMethod`, `orderNote`) and **keeps the identity** (`tableId`, `tableName`,
   `activeOrderId`) so the order stays recoverable. **(Overrides the old Invariant 5 — owner-approved.)**
2. `setActiveOrderId(<id>)` — points the cleared cart at the new order so other pages (and the `/menu`
   recovery banner) know which order is in flight.
3. `router.replace('/order/<id>')`.

By the time `/order/[id]` paints, the cart's **items** are empty — but `tableId`/`activeOrderId` survive so
the customer can return to `/menu` and add more to the SAME order without re-scanning the QR. The **order id**
also crosses via the URL + the `order_cache_<id>` snapshot.

---

## 4. Three layers of state — what belongs where

The menu page deliberately mixes **three** state layers (fe/CLAUDE.md "Architecture (Strict)"). Knowing
which layer a piece of data lives in is the whole discipline:

| Data (this order) | Layer | Lives in | Why |
|---|---|---|---|
| Catalog (combos, products, toppings) | **Server state** | TanStack Query (`GET /combos`, `/products`) | shared, cacheable, never user-owned |
| Cart `items`, `tableId`, `tableName`, totals | **Client state** | `useCartStore` (Zustand, memory) | shared across many widgets on the page |
| "Is the ToppingModal open?" | **Local state** | component `useState` | single widget — never pollutes the store |

> **The rule of thumb:** if more than one widget needs it → store. If it's "this widget's UI right now" →
> `useState`. If it comes from the BE → TanStack Query. Mixing these is the most common menu-page bug.

---

## 5. Cross-**component** vs cross-**page** (don't confuse them)

This file is about cross-**component** (many widgets, one page). The scenario also covers cross-**page**
(many pages, one journey). They use different mechanisms:

| Scope | Mechanism | Survives F5? | For this order |
|---|---|---|---|
| **Cross-component** (`/menu` widgets) | `useCartStore` singleton + selectors | n/a (in-memory) | tableId/tableName, items, totals, canh gate |
| **Cross-page** (`/menu` → `/order/:id`) | URL param + `order_cache_<id>` + `activeOrderId` | ✅ (localStorage) | only the **order id** travels; cart is gone |

The store itself only **persists** two fields (`partialize` at [`cart.ts:153`](../../../../../fe/src/store/cart.ts)):

```ts
partialize: (s) => ({ orderNote: s.orderNote, activeOrderId: s.activeOrderId })
```

So `items` — including the canh and the combo — are **session-only**: a page reload mid-order empties the
cart by design. `STORAGE_KEYS.CART_CONFIG` (`cart-config-v3`) is `version: 5`, and the `migrate` step
flushes any legacy canh counter so old persisted carts can't reintroduce stale canh state.

---

## 6. Gotchas worth remembering

- **`items` is never persisted.** Reload during ordering = empty cart. Only `orderNote` + `activeOrderId`
  survive ([`cart.ts:153`](../../../../../fe/src/store/cart.ts)).
- **No `filling` field.** Nhân is a ₫0 topping inside `CartItem.toppings[]`, not a column. (Migration 016
  added one; 017 dropped it.)
- **Canh is identified by id prefix, not a type flag.** `canh_*` ids drive both the standalone-row logic
  and the canh-required gate. Renaming that convention breaks the gate silently.
- **The combo header carries no price.** `topping_ids: []` on the header; nhân rides the children. The
  combo's ₫25,000 is reconstructed server-side, never sent.
- **One builder, three callers.** Never build `items[]` in a page — always `buildOrderItemsPayload()`,
  or the saved order will drift from the on-screen preview.
- **`addItem` dedups by `id`.** Same logical line = same id = quantity bump, not a duplicate row
  ([`cart.ts:51`](../../../../../fe/src/store/cart.ts)).

---

## 7. The whole order on one timeline (sequence view)

```
 Guest        ComboSection /        useCartStore         OrderSummary /      TableConfirmModal      BE
  │           ProductList /          (singleton)          Floating pills       + order-payload
  │           ToppingModal               │                     │                    │              │
  ├─ scan QR ─────────────────────▶ setTableId/Name           │                    │              │
  │                                      │── tableName ───────▶│ OrderSummary pill: │              │
  │                                      │                     │      "Bàn 01"      │              │
  ├─ tap [+] Suất Giò ─▶ addItem ──▶ items:[combo]            │                    │              │
  │                                      │── total()/count ───▶│ Mini: 25.000đ ·    │              │
  │                                      │                     │ 🛒 1 · gate=FALSE→dim 🔴│         │
  ├─ pick nhân thịt ──▶ (local state)─▶ toppings:[Nhân thịt]   │                    │              │
  │                                      │                     │                    │              │
  ├─ canh "có rau" ───▶ setCanhQty ─▶ items:[combo, canh]     │                    │              │
  │                                      │── itemCount()=2 ───▶│ gate=TRUE → ✅      │              │
  │                                      │                     │                    │              │
  ├─ tap Thanh toán ─────────────────── reads tableId ≠ null ──┼──▶ open modal      │              │
  │                                      │                     │   buildOrderItems  │              │
  │                                      │── items ────────────┼──▶ Payload(items) ─┼─ POST /orders▶│
  │                                      │                     │                    │   201 {id}   │
  │                                      │◀── clearCart()  (items=[]; KEEPS table+id)┤              │
  │                                      │◀── setActiveOrderId(id) ─────────────────┤              │
  │                                                                                 └─ router.replace
  │                                                                                    /order/<id>
  ▼  (items empty — but tableId+activeOrderId survive for order-recovery on /menu)
```

---

## 8. Source & rule map

| Topic | Source of truth |
|---|---|
| Page zones / wireframe / object model | [customer_menu.md](customer_menu.md) |
| BE endpoints, auth, caching, errors | [customer_menu_be.md](customer_menu_be.md) |
| The full lunch-rush narrative (this beat = 11:40) | [SCENARIO_LUNCH_RUSH.md](../../../02_spec/object/SCENARIO_LUNCH_RUSH.md) |
| Cart store (fields, actions, persist) | [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) |
| Cart → order payload builder | [`fe/src/lib/order-payload.ts`](../../../../../fe/src/lib/order-payload.ts) |
| State layers (Query / Zustand / useState) | [04_fe/STATE_MANAGEMENT.md](../../../04_fe/STATE_MANAGEMENT.md) |
| Order payload + cart rules (business) | [07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) |
| localStorage key constants | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) |

---

> **One-line mental model:** on `/menu`, *one Zustand store is the single thing every widget subscribes to*
> — the QR scan seeds it, taps mutate it, selectors keep every total in sync, the canh gate reads it, the
> one payload builder drains it into the POST, and `clearCart()` empties it the instant the order is born.
