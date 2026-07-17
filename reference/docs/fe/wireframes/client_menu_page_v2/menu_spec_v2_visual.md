---
page: Menu (Ordering Experience) — VISUAL SHORT SPEC
route: /(shop)/menu/page.tsx
created: 2026-06-08
status: companion to menu_spec.md (canonical) — diagram-first summary
reads_with: ./menu_spec.md   # full as-built detail lives there
---

# Menu Page — v2 Visual Spec (the short one)

> **Read this to *understand* the page in 5 minutes.** For exact classes, props, line
> numbers and payloads → [menu_spec.md](./menu_spec.md) (canonical).
>
> **What the page is:** a mobile-first **catalog + cart builder**. Customer arrives by QR
> scan (or URL), browses combos / món lẻ, customizes (nhân, canh, note), places ONE order.
> It **creates** an order — it never reads order status back.

---

## 1 · Component Map

`page.tsx` is just a shell. `MenuContent` is the brain: it runs the 4 BE queries, holds
page state, and hands data down to dumb zone components. **Zones never talk to each other.**

```
MenuPage (page.tsx)                  ← <Suspense> shell only
└── MenuContent                      ← BRAIN: 4 queries + page state, composes all zones
    │
    ├─ MenuHeader ............ A      ❤ fav · ⚙ settings · 📋 đơn hàng · 🛒 cart
    ├─ MiniCartStrip ......... A'     item chips  (auto-hides when cart empty)
    ├─ RestaurantBanner ...... ─      hero image (404 → gradient)
    ├─ AddToOrderBanner ...... ─      only if ?add_to_order=<id>
    ├─ SearchBar ............. B      debounce 300ms
    ├─ CategoryTabs .......... C      Tất cả · Bánh Cuốn · Canh · Combo
    ├─ FavouritesRail ........ D      only when no category + favs>0
    │   └─ FavCard ×N
    ├─ ComboSection .......... E      only when no category + combos>0
    │   └─ ComboCard ×N              nhân pills + qty stepper
    ├─ ProductList ........... F      <main> content
    │   ├─ ProductCard ×N    (<sm)   mobile list   ─┐
    │   └─ ProductGridCard ×N (≥sm)  desktop grid   ┘→ ToppingModal
    ├─ OrderSummary .......... I      live preview (null when empty) + canh + note
    ├─ CartBottomBar ......... J      auto-hides when cart empty → onCheckout
    ├─ CartDrawer ............ modal  slide-in cart list
    └─ TableConfirmModal ..... modal  QR checkout → POST /orders  (the ONE write)
```

**The golden rule:** a card writes to a **store**; every component subscribed to that store
re-renders automatically. No zone-to-zone calls, no event bus, no context.

```
   ProductCard / ComboCard
            │ addItem()
            ▼
      ┌─────────────┐   set() re-renders ALL subscribers in one tick
      │ useCartStore│ ─────────────────────────────────────────────┐
      └─────────────┘                                               │
        │        │            │             │            │          │
        ▼        ▼            ▼             ▼            ▼          ▼
   OrderSummary MiniCartStrip CartBottomBar MenuHeader  CartDrawer (preview live)
```

---

## 2 · Shared Components (reuse before you build)

> Registry: [`../shared/_INDEX_SHARING_COMPONENT.md`](../shared/_INDEX_SHARING_COMPONENT.md)

```
ALREADY SHARED (used here)          OWNED here but reusable           SHOULD reuse (drift)
┌────────────────────────┐         ┌────────────────────────┐       ┌──────────────────────┐
│ Button   (ui atom)     │         │ ProductCard            │       │ QuantityStepper      │
│ EmptyState (shared)    │         │ ComboCard · CategoryTabs│       │  (custom -/+ steppers│
└────────────────────────┘         │ CartDrawer · ToppingModal│      │   duplicate it)      │
                                    └────────────────────────┘       │ Badge (for "Hết"/    │
                                                                     │  filling pills)      │
                                                                     └──────────────────────┘
```

⚠️ Menu feature components use **raw Tailwind**, no design-system atoms. Adopting
`QuantityStepper` + `Badge` would unify touch-targets + a11y.

---

## 3 · Loading Strategy

```
COLD VISIT (Pattern B = full client — no server HTML)

  blank ──► skeleton ──► content
            (animate-pulse)
            mobile  5× h-24
            tablet+ 8× aspect-square

  inside <main>, 3 mutually-exclusive branches:
  ┌──────────────────────────────────────────────┐
  │ isError  → "⚠ Kết nối mạng yếu" + [Thử lại]   │
  │ loading  → skeletons                           │
  │ empty    → <EmptyState>                         │
  │ else     → ComboSection + ProductList          │
  └──────────────────────────────────────────────┘
```

🚨 **DRIFT:** the shared index claims **Pattern A (ISR + RSC prefetch)** but the code is
**Pattern B (full client)** → every QR landing shows a loading flash. Fix = add an RSC shell
that `prefetchQuery` → `dehydrate` → `<HydrationBoundary>`, keep `MenuContent` as the client child.

---

## 4 · Local Data Management (in-page state)

Two layers only. **Global mutable → Zustand. Page-local UI → `useState` in `MenuContent`, props down.**

```
GLOBAL (Zustand, any zone subscribes directly)
┌────────────────┬──────────────────────────────────────────────┐
│ useCartStore   │ items (incl. canh CartItems) · tableId ·      │
│                │ orderNote · activeOrderId                       │
│ useFavourites  │ items (heart badge + Zone D rail)              │
│ useSettings    │ customerName · tableLabel (header subtitle)    │
└────────────────┴──────────────────────────────────────────────┘

PAGE-LOCAL (useState in MenuContent → passed by props)
┌────────────────┬──────────────────────┬───────────────────────┐
│ selectedCategory│ filter + D/E visibility│ Tabs, Combo, ProductList│
│ searchQuery    │ products query        │ SearchBar, ProductList │
│ cartOpen       │ CartDrawer open       │ Header, BottomBar      │
│ confirmOpen    │ TableConfirmModal open│ BottomBar, CartDrawer  │
│ hasOrders      │ "Đơn hàng" dot        │ MenuHeader             │
│ canhShakeKey   │ shake canh on block   │ OrderSummary           │
│ addToOrderId   │ ?add_to_order mode    │ Banner, CartDrawer     │
└────────────────┴──────────────────────┴───────────────────────┘
```

No RHF/Zod on this page — the only text input (note) writes straight to `useCartStore`.

### 4a · Inside `useCartStore` — the cart's local data (the most important store)

A product/combo is only ONE part of the store — it becomes a line in `items[]`.
Canh, table and note live in their OWN fields, NOT as cart items.

```
useCartStore  (store/cart.ts)
├── items: CartItem[] ........ the cart lines            ← cards + setCanhQty write here
│         canh lines are CartItems with id canh_<productId>_rau / canh_<productId>_plain
├── tableId / tableName ...... which table (QR scan)
├── activeOrderId ........... an in-progress order, if any
├── paymentMethod ........... chosen later at checkout
└── orderNote: string ....... free-text note to kitchen
```

### 4b · What a card GIVES to `addItem()` — one `CartItem`

Tap **+** → the card builds a full, self-describing `CartItem` and passes it in.
The card computes `id` and `price` ITSELF — the store does not.

```jsonc
{
  "id":         "product_<id>_<toppingKey>"  // or "combo_<id>_<filling>"  ← LINE IDENTITY
  "type":       "product" | "combo",
  "product_id": "uuid",          // products only
  "combo_id":   "uuid",          // combos only
  "name":       "Bánh Cuốn",
  "quantity":   1,
  "price":      4000,            // UNIT price = base + Σ selected toppings (pre-summed)
  "toppings":   [ {id,name,price} ],
  "combo_items":[ {product_id,product_name,quantity,unit_price} ]  // combos only
}
```

Two values the card decides BEFORE calling the store:
- **`id`** = the line's identity. Different toppings/nhân → different `id` → a SEPARATE line.
- **`price`** = unit price with toppings already added (`base + Σ topping.price`).

### 4c · What `addItem` DOES with it — dedup by `id` only (cart.ts:42-52)

The store is deliberately dumb: no pricing, no validation — just merge by `id`.

```
addItem(item):
   line with this exact id already exists?
   ├─ YES → bump it:  existing.quantity += item.quantity
   └─ NO  → append the whole item as a new line

  Tap + on "Bánh Cuốn nhân thịt"     → id product_X_thit   → NEW line, qty 1
  Tap + again (same)                 → same id              → qty 2
  Tap + on "Bánh Cuốn nhân mộc nhĩ"  → id product_X_mocnhi  → DIFFERENT line, qty 1
```

| Who | Does what |
|---|---|
| **the card** | builds the full `CartItem` — decides `id` (identity) + final unit `price` |
| **`addItem`** | only merges by `id` (existing → +qty · new → append) |
| **`total()` / `itemCount()`** | derived on READ (`Σ price×quantity`) — never stored |

⚠️ Because the store trusts whatever `id` the card gives it, two surfaces that build the `id`
differently (the `filling`-vs-topping issue, IMP-1) create DUPLICATE lines for the same dish.
⚠️ `items` is NOT persisted (see §5) — everything you add lives in memory until the order is placed.

### 4d · Canh as a normal `CartItem` (CANH epic, 2026-06-08)

Canh (broth) lives in `items[]` exactly like any other product — two possible lines:

```
cartId canh_<canhProductId>_rau    → product_id: <canhId>, toppings:[RauTopping]   (có rau)
cartId canh_<canhProductId>_plain  → product_id: <canhId>, toppings:[]              (không rau)
```

`drinkConfig` is **gone**. Both the FE cart and the BE `order_items` table model canh the same way.

**Lifecycle:**

```
① LIVES in items[] — session-only (items is NOT persisted)
   persist v5 migration deletes any legacy drinkConfig key (store/cart.ts migrate)
   → always resets to 0 on reload; a stale order's canh count never resurfaces

② SET via steppers — setCanhQty(productId, rauTopping, 'rau'|'plain', qty)
   OrderSummary canh block −/+ → setCanhQty() (store/cart.ts:79-100)
   DrinkCustomize (Zone G, shown only when hasCombo || hasNuocDung) also uses setCanhQty
   qty === 0 → removes the CartItem; qty > 0 → upserts it

③ GATES checkout
   canhMissing = !items.some(i => i.id.startsWith('canh_'))   (page.tsx)
   tap Thanh toán while no canh items → BLOCK + toast + bump canhShakeKey → OrderSummary shakes
   (canh = 0 is the ONLY thing that can stop an order)

④ PASSES THROUGH order-payload.ts unchanged
   buildOrderItemsPayload(items) — canh CartItems are plain product rows, no special handling
   ONLY exception: combo sub-items named 'canh' are still stripped (isSoupName filter keeps combos
   clean); the canh quantity the customer chose is expressed via the canh CartItems in items[].
   ⇒ canh is ALWAYS 1–2 standalone rows (one per kind), NEVER inside a combo

⑤ PREVIEW stays honest
   OrderSummary "Tổng số món" EXCLUDES canh items from the main aggregation (isSoupName skip),
   then RE-ADDS from the rauCount / plainCount derived from canh CartItems (OrderSummary.tsx)
   → on-screen preview == POST payload, exactly
```

Two non-obvious bits:
- The canh **product id** + **Rau topping** are discovered dynamically: first from existing canh
  CartItems in `items[]`, else from combo sub-items that include canh. Never hardcoded.
- "Có rau" carries rau as a **`topping_id`** on the CartItem (and thus in the payload), NOT a note.

**Live-verified** (the 5-bowl example, §6f): adding 2 rau + 3 plain canh items → BE stores exactly
two canh rows — `qty 2` with the Rau topping snapshot + `qty 3` empty, both `unit_price 0`.

**In one line:** canh = two optional CartItems in `items[]` (`canh_*_rau` / `canh_*_plain`), edited
via steppers, blocking checkout when absent, passed through `order-payload.ts` like any product —
FE and BE now use the identical model.

---

## 5 · Cross-Page Data (what survives, what doesn't)

State split by **lifetime** across 3 stores + localStorage:

```
┌────────────┬──────────────────┬─────────────────────────────────────────┐
│ store      │ localStorage      │ persisted?                                │
├────────────┼──────────────────┼─────────────────────────────────────────┤
│ cart       │ cart-config (v5)  │ PARTIAL → orderNote + activeOrderId only  │
│            │                   │ items / tableId = MEMORY (session-only)   │
│ settings   │ customer-settings │ FULL (name, tableLabel)                   │
│ favourites │ favourites        │ FULL                                      │
└────────────┴──────────────────┴─────────────────────────────────────────┘
```

⚠️ Why canh (now ordinary CartItems in `items[]`) is NOT persisted: `items` is session-only —
migration v5 drops any legacy `drinkConfig` remnant so a previous order's canh count never resurfaces.

**Handoff Menu → Order (no shared route state — via localStorage cache):**

```
TableConfirmModal: POST /orders ✓
   │ GET /orders/:id
   ▼
localStorage["order_cache_<id>"] ──read──► /order/:id  page
   │
   └─ on next /menu mount: any order_cache_* key exists → "Đơn hàng" dot lights
```

Auth token = **Zustand memory only** (never localStorage) → checkout uses `router.replace`
(not full nav) so the token survives navigation.

---

## 6 · Backend — Load · Send · Receive · Errors

**Every call goes through ONE axios instance** (`lib/api-client.ts`) — never `fetch` directly.
It auto-attaches the token on the way out and auto-handles 401 on the way back.

```
            ┌──────────────────────── lib/api-client.ts (axios) ─────────────────────────┐
component → │ REQUEST interceptor:  add  Authorization: Bearer <token from useAuthStore> │ → BE
            │ RESPONSE interceptor: on 401 → refresh / redirect (see §6d)                │ ← BE
            └────────────────────────────────────────────────────────────────────────────┘
```

### 6a · LOADING (reads) — TanStack Query, 4× GET, staleTime 5min

```
       useQuery(queryKey, queryFn)                       queryFn = api.get(...).then(r => r.data.data)
┌──────────────────────────────────────┐                          └─ BE wraps payload in { data: ... }
│ ['categories']      always            │
│ ['products-all']    always (enrich)   │   enabled flag = WHEN it runs:
│ ['combos']          always            │     ['products', cat, q] only fires when q===0 OR q>=2
│ ['products',cat,q]  enabled q=0 or ≥2 │     (so a 1-char search makes NO network call)
└──────────────────────────────────────┘

  WHAT EACH QUERY DOES on every render:
  1st time / stale  → fetch → isLoading=true → skeletons     (cache empty or older than 5min)
  cached & fresh    → return cache instantly, no network      (<5min since last fetch)
  same key reused   → de-duped — one request shared by all subscribers

  combo_items from BE carry only product_id + quantity
        │ useMemo joins ['products-all']  →  resolves name + unit_price
        ▼  (⚠️ IMP-2: this join should live on the BE so the catalog isn't downloaded twice)
  enriched combos rendered by ComboSection
```

`refetch()` (returned by the products query) is what the error-state **[Thử lại]** button calls.

### 6b · SENDING (the one write) — `useMutation` → POST /orders

```
TableConfirmModal  → submitOrder.mutate()
        │ body assembled HERE (TableConfirmModal.tsx:19-27):
        ▼
  POST /orders {
     customer_name:'', customer_phone:'',          ← always empty (QR flow)
     note: <modal note>.trim() || null,
     table_id: cart.tableId,
     source: 'qr',
     items: buildOrderItemsPayload(cart.items)      ← lib/order-payload.ts
  }                                                  2 rules:
                                                     1. combo → combo_items overrides
                                                        (canh sub-item stripped from combo)
                                                     2. nhân → topping_ids on products/sub-items
                                                     canh CartItems pass through like any product
```

> Invariant: OrderSummary preview == POST payload **exactly** — canh CartItems are excluded
> from the main dish aggregation (isSoupName), then re-added from the canh items directly.
> ONE builder (`buildOrderItemsPayload`) feeds all 3 checkout paths (menu / checkout /
> add-to-order) so they can never drift.

### 6c · RECEIVING + error handling (mutation callbacks)

```
                         ┌─ onSuccess(data) ──────────────────────────────────────────┐
                         │  GET /orders/:id  → full order                              │
  POST /orders ──────────┤    └─ cache to localStorage["order_cache_<id>"]            │
                         │       (GET fails? cache the create response instead)        │
                         │  cart.clearCart()                                           │
                         │  router.replace('/order/:id')   ← replace keeps token alive │
                         └─────────────────────────────────────────────────────────────┘
                         ┌─ onError(err) ─────────────────────────────────────────────┐
                         │  read err.response.data.{error,message,details}            │
                         │  ├─ error === TABLE_HAS_ACTIVE_ORDER                        │
                         │  │     toast.info + router.replace('/order/<active_id>')    │
                         │  └─ anything else                                           │
                         │        toast.error(message ?? 'Đặt hàng thất bại')         │
                         └─────────────────────────────────────────────────────────────┘
```

Note the **nested try/catch** in onSuccess: even if the follow-up `GET /orders/:id` fails,
the order still succeeds — it just caches the leaner create-response so the flow never breaks.

### 6d · 401 / auth errors — handled globally, not per-page (api-client.ts:19-59)

The page never writes auth-error code; the response interceptor does it for everyone:

```
response 401 (not an /auth/* endpoint)
   │
   ├─ token.sub === 'guest'        → clearAuth → window.location = '/menu'   (guests can't log in)
   ├─ tableId set (QR context)     → refresh fails → '/menu'  (rescan QR)
   └─ normal user                  → POST /auth/refresh
                                       success → retry the original request once (_retry guard)
                                       fail    → clearAuth → '/login'
```

So on `/menu` a dropped/expired guest token quietly bounces back to `/menu` — the customer
just re-lands on the catalog instead of hitting a login wall.

### 6e · Three error surfaces — don't confuse them

| Where | Trigger | What the user sees |
|---|---|---|
| **Query error** (read) | products/categories/combos fetch fails | `<main>` → "⚠ Kết nối mạng yếu" + **[Thử lại]** (`refetch`) |
| **Mutation error** (write) | POST /orders fails | **toast** (info for active-order redirect, error otherwise) |
| **401 anywhere** | expired/invalid token | interceptor refresh or redirect — no in-page UI |

### 6f · Worked Example — full round-trip (verified against FE + BE code)

**Cart:** 3 combos + 4 món lẻ + 2 canh CartItems (2 có rau / 3 không rau).
Real seed IDs: nhân thịt `bbbb…0001` · nhân mộc nhĩ `bbbb…0002` · rau `bbbb…0003` · canh product `cccc…0006`.

| Cart line | id | Qty | Nhân |
|---|---|---|---|
| Combo Suất Đầy Đủ Trứng Chín (`dddd…0001`) | `combo_dddd…0001_thit` | 1 | thịt |
| Combo Suất Giò (`dddd…0003`) | `combo_dddd…0003_mocnhi` | 1 | mộc nhĩ |
| Combo Suất Trứng Bánh Không (`dddd…0004`) | `combo_dddd…0004_thit` | 1 | thịt |
| Giò (`cccc…0001`) | `product_cccc…0001_thit` | 1 | thịt |
| Bánh Cuốn (`cccc…0005`) | `product_cccc…0005_mocnhi` | 2 | mộc nhĩ |
| Bánh Trứng Tái (`cccc…0002`) | `product_cccc…0002_thit` | 1 | thịt |
| Bánh Trứng Chín (`cccc…0003`) | `product_cccc…0003_mocnhi` | 1 | mộc nhĩ |
| Canh có rau | `canh_cccc…0006_rau` | 2 | rau (`bbbb…0003`) |
| Canh không rau | `canh_cccc…0006_plain` | 3 | — |

**9 total cart lines** — canh is now two ordinary CartItems, not a separate counter.

#### FE SENDS → `POST /orders` (built by `order-payload.ts` — canh stripped from combos, nhân = topping_ids)

9 rows: 3 combos + 4 món lẻ + 2 canh.

```jsonc
{
  "customer_name": "", "customer_phone": "", "note": null,
  "table_id": "<tableId>", "source": "qr",
  "items": [
    // 3 combos — canh removed, nhân pushed onto every sub-item
    { "product_id": null, "combo_id": "dddd…0001", "quantity": 1, "topping_ids": [],
      "combo_items": [
        { "product_id": "cccc…0003", "quantity": 1, "topping_ids": ["bbbb…0001"] },   // Bánh Trứng Chín · thịt
        { "product_id": "cccc…0001", "quantity": 1, "topping_ids": ["bbbb…0001"] },   // Giò · thịt
        { "product_id": "cccc…0005", "quantity": 3, "topping_ids": ["bbbb…0001"] } ]}, // Bánh Cuốn ×3 · thịt
    { "product_id": null, "combo_id": "dddd…0003", "quantity": 1, "topping_ids": [],
      "combo_items": [
        { "product_id": "cccc…0001", "quantity": 1, "topping_ids": ["bbbb…0002"] },
        { "product_id": "cccc…0005", "quantity": 3, "topping_ids": ["bbbb…0002"] } ]},
    { "product_id": null, "combo_id": "dddd…0004", "quantity": 1, "topping_ids": [],
      "combo_items": [
        { "product_id": "cccc…0004", "quantity": 1, "topping_ids": ["bbbb…0001"] },
        { "product_id": "cccc…0005", "quantity": 3, "topping_ids": ["bbbb…0001"] } ]},
    // 4 món lẻ — nhân = topping_ids
    { "product_id": "cccc…0001", "combo_id": null, "quantity": 1, "topping_ids": ["bbbb…0001"] },
    { "product_id": "cccc…0005", "combo_id": null, "quantity": 2, "topping_ids": ["bbbb…0002"] },
    { "product_id": "cccc…0002", "combo_id": null, "quantity": 1, "topping_ids": ["bbbb…0001"] },
    { "product_id": "cccc…0003", "combo_id": null, "quantity": 1, "topping_ids": ["bbbb…0002"] },
    // canh — global, split (NEVER inside a combo)
    { "product_id": "cccc…0006", "combo_id": null, "quantity": 2, "topping_ids": ["bbbb…0003"] }, // 2 CÓ rau
    { "product_id": "cccc…0006", "combo_id": null, "quantity": 3, "topping_ids": [] }             // 3 KHÔNG rau
  ]
}
```

FE sends **no prices** — BE computes all money from its own catalog.

#### BE returns from `POST /orders` → ONLY the id

```jsonc
{ "data": { "id": "6c39ea8a-1a0c-4e78-b325-c3a39e70ed0f" } }
```

The FE then immediately does `GET /orders/:id` to fetch the full order and cache it.

#### BE SENDS BACK → `GET /orders/:id` (cached to `localStorage["order_cache_<id>"]`)

BE flattens each combo into a **header row + child rows** linked by `combo_ref_id`
(`order_service.go expandCombo`). Critical rule (OC epic): **combo header `unit_price = 0`;
the children carry the money** (server template prices) → so summing all rows isn't double-counted.

> ⚠️ **Items come back UNORDERED** — sorted by item UUID, so combo headers and their children are
> **interleaved**, NOT grouped. The ONLY thing that ties a combo together is `combo_ref_id` (child)
> → matching a header row's `id`. Read views (order page, KDS, admin) reconstruct the grouping from
> that link; never rely on array order.

**Real captured response** (live run 2026-06-08, Bàn 2 — IDs are real, abridged to representative
rows; full order = 16 item rows: 3 combo headers + 8 combo children + 3 món lẻ + 2 canh):

```jsonc
{ "data": {
  "id": "6c39ea8a-1a0c-4e78-b325-c3a39e70ed0f",
  "order_number": "ORD-20260608-0001",      // format ORD-YYYYMMDD-NNNN (Redis daily seq)
  "status": "pending",                       // BE-assigned; FE never sends status
  "source": "qr",
  "table_id": "8fd570c2-66c9-4284-a93d-9e49faaafea8", "table_name": "Bàn 2",
  "customer_name": "", "customer_phone": "", "note": "",
  "created_by": "", "created_at": "2026-06-08T08:14:19Z", "updated_at": "2026-06-08T08:14:19Z",
  "total_amount": 107000,                    // BE-computed sum of every row
  "items": [
    // ── combo HEADER (unit_price 0 — just a grouping label) ──
    { "id":"14c2e47e-…","combo_id":"dddddddd-…0001","product_id":null,"combo_ref_id":null,
      "name":"Suất Đầy Đủ Trứng Chín","unit_price":0,"quantity":1,"qty_served":0,
      "item_status":"pending","toppings_snapshot":[],"note":"" },
    // ── its CHILDREN carry the money + nhân, linked by combo_ref_id = the header id ──
    { "id":"941b3ee0-…","product_id":"cccc…0003","combo_ref_id":"14c2e47e-…","name":"Bánh Trứng Chín",
      "unit_price":9000,"quantity":1,"qty_served":0,"item_status":"pending",
      "toppings_snapshot":[{"id":"bbbb…0001","name":"Nhân thịt","price":0}],"note":"" },
    { "id":"e092a821-…","product_id":"cccc…0001","combo_ref_id":"14c2e47e-…","name":"Giò",
      "unit_price":9000,"quantity":1,"toppings_snapshot":[{"id":"bbbb…0001","name":"Nhân thịt","price":0}], … },
    { "id":"e3c52fc6-…","product_id":"cccc…0005","combo_ref_id":"14c2e47e-…","name":"Bánh Cuốn",
      "unit_price":4000,"quantity":3,"toppings_snapshot":[{"id":"bbbb…0001","name":"Nhân thịt","price":0}], … },
    //  … (combo 2 "Suất Giò" + combo 3 "Suất Trứng Bánh Không" same shape — header 0 + children) …
    //  … interleaved in the real array by UUID; shown grouped here for readability …

    // ── 4 MÓN LẺ (combo_ref_id: null) ──
    { "id":"0cbeb82d-…","product_id":"cccc…0001","combo_ref_id":null,"name":"Giò","unit_price":9000,"quantity":1,
      "toppings_snapshot":[{"id":"bbbb…0001","name":"Nhân thịt","price":0}], … },
    { "id":"12a66be9-…","product_id":"cccc…0005","combo_ref_id":null,"name":"Bánh Cuốn","unit_price":4000,"quantity":2,
      "toppings_snapshot":[{"id":"bbbb…0002","name":"Nhân thịt mộc nhĩ","price":0}], … },
    { "id":"9e83f699-…","product_id":"cccc…0002","combo_ref_id":null,"name":"Bánh Trứng Tái","unit_price":9000,"quantity":1,
      "toppings_snapshot":[{"id":"bbbb…0001","name":"Nhân thịt","price":0}], … },
    { "id":"e893ef7b-…","product_id":"cccc…0003","combo_ref_id":null,"name":"Bánh Trứng Chín","unit_price":9000,"quantity":1,
      "toppings_snapshot":[{"id":"bbbb…0002","name":"Nhân thịt mộc nhĩ","price":0}], … },

    // ── 2 CANH rows (unit_price 0; có rau carries the Rau topping, không rau is empty) ──
    { "id":"3610bd23-…","product_id":"cccc…0006","combo_ref_id":null,"name":"Canh","unit_price":0,"quantity":2,
      "toppings_snapshot":[{"id":"bbbb…0003","name":"Rau mùi tàu","price":0}], … },
    { "id":"f66c998f-…","product_id":"cccc…0006","combo_ref_id":null,"name":"Canh","unit_price":0,"quantity":3,
      "toppings_snapshot":[], … }
  ]
} }
```

**total_amount math** (all rows, combo headers = 0):
`(9000+9000+4000×3) + (9000+4000×3) + (9000+4000×3) + 9000 + 4000×2 + 9000 + 9000 + 0`
`= 30000 + 21000 + 21000 + 9000 + 8000 + 9000 + 9000 = ` **107 000 ₫** ✅ matches live `total_amount`.

**What BE ADDS that FE never sent:** `id` per row · `order_number` · `status` · `total_amount` ·
per-line `unit_price` · `qty_served` (0 = not cooked) · `item_status` · `combo_ref_id` linkage ·
`toppings_snapshot` (frozen name+price copy, so the order stays correct if a topping changes later) ·
`created_by` / `created_at` / `updated_at`.

> ✅ **Verified live** 2026-06-08: `docker compose` stack → `POST /auth/guest` (Bàn 2 QR token) →
> `POST /orders` (id `6c39ea8a…`, `order_number` ORD-20260608-0001) → `GET /orders/:id`.
> FE send shape from `lib/order-payload.ts`; BE behaviour from `order_service.go` (`expandCombo`,
> `buildProductRow`, `generateOrderNumber`) + `order_handler.go`. Note: the FE `OrderItem` type
> declares a `flagged` field but the GET handler does **not** emit it (FE/BE drift).

---

## 7 · Top Risks (full list → menu_spec.md §Concerns / §Improvement Strategy)

```
🚨 IMP-1  "Nhân" double-modeled: menu card uses `filling`, detail page uses topping
          → same dish = duplicate cart lines + inconsistent data to kitchen.
🚨 IMP-3  Pattern B on the QR landing page → loading flash every cold visit.
🚨 IMP-4  Toppings invisible in OrderSummary (item.toppings rendered nowhere).
🚨 IMP-5  ProductCard (<sm) hardcodes hasToppings=false → ToppingModal is dead code.
⚠️ IMP-2  products-all fetched only to enrich combos client-side (move to BE).
⚠️ IMP-6  orderNote persists but items don't → half-built cart wiped, orphan note survives.
```

---

*Short visual companion to the canonical [menu_spec.md](./menu_spec.md). Diagrams summarize;
the canonical file is the line-traced source of truth.*
