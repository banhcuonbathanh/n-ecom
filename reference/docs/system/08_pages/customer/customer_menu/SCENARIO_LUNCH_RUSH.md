# Scenario — A Full Lunch Rush (Orders · Staff · Tables · Ingredients)

> **What this is:** one busy lunch hour told as a *story*, using the **real seed data**
> ([MENU_CATALOG.md](MENU_CATALOG.md)) so you can *picture* how the object models move together.
> It is not a spec — it just animates the schemas. Field shapes live in their home files:
> [Order](OBJECT_MODEL_ORDER.md) · [Staff](OBJECT_MODEL_STAFF.md) · [Table](OBJECT_MODEL_TABLE.md) ·
> [Ingredient](OBJECT_MODEL_INGREDIENT.md) · [Combo](OBJECT_MODEL_COMBO.md) · index → [OBJECT_MODELS.md](OBJECT_MODELS.md).
>
> Money in VND (₫). Order numbers follow `ORD-YYYYMMDD-NNN`. Date: 2026-06-13.

---

## 👥 The cast (Staff — from the seed)

| Who | Username | Role | Job this hour |
|---|---|---|---|
| **Phạm Thu Ngân** | `cashier1` | cashier | Seats guests, runs the QR/POS, takes payment, works the waitlist |
| **Lê Đầu Bếp** | `chef1` | chef | Cooks on the KDS, increments `qty_served` per dish |
| **Trần Quản Lý** | `manager1` | manager | Watches stock, records ingredient movements |

## 🪑 The floor (Tables — from the seed)

| Table | Capacity |
|---|---|
| Bàn 01 | 4 |
| Bàn 02 | 4 |
| Bàn 03 | 6 |
| Bàn 04 | 2 |
| Bàn 05 | 4 |
| Bàn VIP | 8 |

Every table starts `available`. The order lifecycle flips it to `occupied`, and payment / cancel
flips it back to `available` — staff don't set this by hand.

---

## ⏱️ The timeline

### 11:40 — 1 guest sits at Bàn 01

A solo guest scans the **Bàn 01** QR and orders **1× Suất Giò** (₫25,000 — 1 Giò · 4 Bánh Cuốn · 1 Canh).

```jsonc
// orders row
{ "order_number": "ORD-20260613-014", "table_id": "Bàn 01",
  "source": "qr", "status": "pending", "total_amount": 25000,
  "created_by": null }                 // customer self-ordered → no staff
```

→ **Bàn 01: `available → occupied`.**

#### 🔌 Behind the screen — the data flow for this one order

The `orders row` above is the **DB end-state**. It is not what crosses the wire. Here is the full
round trip the guest's phone actually drives — every shape below is the real code, not a sketch.

**① FE → BE — the create request** (`POST /api/v1/orders`)
Built in [TableConfirmModal.tsx](../../../../fe/src/features/menu/components/TableConfirmModal.tsx) from the
cart. *Suất Giò* is a **combo**, so its line is shaped by
[`buildOrderItemsPayload`](../../../../fe/src/lib/order-payload.ts) — the single source that turns the
cart into the order payload:

Say the guest picks **nhân thịt** for the bánh and a **Canh có rau**. *Suất Giò* = `1× Giò · 4× Bánh
Cuốn · 1× Canh`, but the **canh never travels inside the combo** — the builder strips it out and emits it
as a standalone product row. The combo's `nhân` rides on each remaining sub-item via `topping_ids`:

```jsonc
{
  "customer_name":  "",                 // QR flow sends no name/phone
  "customer_phone": "",
  "note":           null,               // or the "Ghi chú cho bếp" text
  "table_id":       "<uuid Bàn 01>",
  "source":         "qr",
  "items": [
    { "product_id": null,               // ── combo line → product_id is null
      "combo_id":   "<uuid Suất Giò>",
      "quantity":   1,
      "topping_ids": [],                 // toppings live on the sub-items, not the header
      "combo_items": [                   // per-dish overrides; canh is NOT here
        { "product_id": "<uuid Giò>",       "quantity": 1, "topping_ids": ["<uuid Nhân thịt>"] },
        { "product_id": "<uuid Bánh Cuốn>", "quantity": 4, "topping_ids": ["<uuid Nhân thịt>"] }
      ] },
    { "product_id": "<uuid Canh>",       // ── canh split out as its OWN standalone row
      "combo_id":   null,
      "quantity":   1,
      "topping_ids": ["<uuid Rau mùi tàu>"] }   // "có rau"; "không rau" → topping_ids: []
  ]
}
```

> The FE **never** sends `order_number`, `status`, `total_amount`, `unit_price`, or `created_by` —
> those are the BE's to compute. A plain dish (no combo) sends `product_id` set + `combo_id: null`,
> the same shape as the canh row above. `nhân` (thịt / mộc nhĩ) rides on the bánh; `Rau mùi tàu` rides
> on the canh — all as `topping_ids` (every topping is ₫0, so none of them move `total_amount`).

**② BE → DB** — the single JSON request above is **not** what gets stored. It crosses two BE objects
first, then explodes into rows.

**② a — the JSON binds into a Go struct.** `c.ShouldBindJSON(&req)`
([order_handler.go](../../../../be/internal/handler/order_handler.go)) unmarshals the body into
`createOrderReq`, populated for this order:

```go
createOrderReq{                          // handler/order_handler.go:59
    TableID:       "<uuid Bàn 01>",
    Source:        "qr",                 // binding:"required,oneof=online qr pos"
    CustomerName:  "", CustomerPhone: "",
    Note:          "",                   // JSON null → Go "" (field is plain string, not *string)
    Items: []createOrderItemReq{
        {                                // ── combo line
            ProductID:  "",              // JSON null → "" (empty string, NOT nil)
            ComboID:    "<uuid Suất Giò>",
            Quantity:   1,               // binding:"required,min=1"
            ToppingIDs: []string{}, Note: "",
            ComboItems: []comboItemOverrideReq{
                {ProductID: "<uuid Giò>",       Quantity: 1, ToppingIDs: []string{"<uuid Nhân thịt>"}},
                {ProductID: "<uuid Bánh Cuốn>", Quantity: 4, ToppingIDs: []string{"<uuid Nhân thịt>"}},
            },
        },
        {                                // ── standalone canh
            ProductID:  "<uuid Canh>", ComboID: "",
            Quantity:   1,
            ToppingIDs: []string{"<uuid Rau mùi tàu>"},
        },
    },
}
```

**② b — the handler maps it to the service input**, injecting `CreatedBy` from the JWT (the client can't
send it):

```go
service.CreateOrderInput{                // service/order_service.go
    TableID: "<uuid Bàn 01>", Source: "qr",
    CustomerName: "", CustomerPhone: "", Note: "",
    CreatedBy: "",                       // role == "customer" → callerID forced to "" → NULL created_by
    Items: []service.CreateOrderItemInput{
        {ComboID: "<uuid Suất Giò>", Quantity: 1, ToppingIDs: []string{},
         ComboItems: []service.ComboItemOverrideInput{
             {ProductID: "<uuid Giò>",       Quantity: 1, ToppingIDs: []string{"<uuid Nhân thịt>"}},
             {ProductID: "<uuid Bánh Cuốn>", Quantity: 4, ToppingIDs: []string{"<uuid Nhân thịt>"}},
         }},
        {ProductID: "<uuid Canh>", Quantity: 1, ToppingIDs: []string{"<uuid Rau mùi tàu>"}},
    },
}
```

> **FE-JSON → BE-struct, the gotchas:**
> - **`null` becomes a zero value, not nil.** Fields are plain `string`/`[]string`, so `"product_id": null`
>   → `ProductID: ""` and an absent `note` → `""`. The "exactly one of product_id/combo_id" rule is then a
>   `== ""` comparison (handler:80–88).
> - **The client can't set server fields.** `createOrderReq` has no `order_number`, `status`, `total_amount`,
>   or `created_by` — they aren't bindable. `CreatedBy` is injected from `claims` (customer → `""`).
> - **Validation = `binding:` tags:** `Source` required+oneof · every `Quantity` required+min=1 · `Items`
>   required+min=1 · each combo override's `ProductID` required.
> - **Two-hop mapping:** `comboItemOverrideReq` → `service.ComboItemOverrideInput` via `toComboOverrides`
>   (handler:42).

**② c — the service explodes it into rows** and writes them in **one transaction**
([order_repo.go](../../../../be/internal/repository/order_repo.go)) — **one `orders` row + four
`order_items` rows**. The persisted shapes are the sqlc models
[`db.Order`](../../../../be/internal/db/models.go) + [`db.OrderItem`](../../../../be/internal/db/models.go),
backed by table [`005_orders.sql`](../../../../be/migrations/005_orders.sql).

The combo **explodes**: a ₫0 header + its sub-items (carrying the real prices), and canh as its own
standalone row. Each `<uuid …>` in the request is resolved to a stored product/combo/topping; the
server fills in everything the FE left out:

```jsonc
// ── orders (1 row) ────────────────────────────────────────────────
{ "id":            "<uuid>",            // server-generated
  "order_number":  "ORD-20260613-014",  // ← BE assigns (Redis seq), NOT from FE
  "table_id":      "<uuid Bàn 01>",
  "status":        "pending",           // ← BE default
  "source":        "qr",
  "customer_name": null, "customer_phone": null,  // ← "" empty string → NULL via nullStr()
  "note":          null,
  "total_amount":  25000,               // ← DERIVED, see below — never sent by FE
  "created_by":    null,                // ← QR = no staff
  "group_id":      null,                // standalone (no multi-table split)
  "created_at":    "2026-06-13T11:40:…", "updated_at": "…", "deleted_at": null }

// ── order_items (4 rows) — unit_price DECIMAL(10,0), qty_served starts 0 ──
// Row type is enforced by the chk_oi_item_type CHECK: exactly ONE of these 3 shapes.
[
  { "id": "<u1>",  "order_id": "<uuid>",
    "product_id":  null,                 // ┐
    "combo_id":    "<uuid Suất Giò>",     // ├ COMBO HEADER  (product_id NULL, combo_id set, combo_ref_id NULL)
    "combo_ref_id": null,                // ┘
    "name": "Suất Giò", "unit_price": 0,  // ← header price is 0 → avoids double-count
    "quantity": 1, "qty_served": 0,
    "toppings_snapshot": [],             // toppings live on the children, not the header
    "note": null },

  { "id": "<u2>",  "order_id": "<uuid>",
    "product_id":  "<uuid Giò>",          // ┐
    "combo_id":    null,                 // ├ COMBO SUB-ITEM (product_id set, combo_ref_id → header)
    "combo_ref_id": "<u1>",              // ┘
    "name": "Giò", "unit_price": 9000,    // ← real template price (server-side, never client)
    "quantity": 1, "qty_served": 0,
    "toppings_snapshot": [ { "id": "<uuid Nhân thịt>", "name": "Nhân thịt", "price": 0 } ] },

  { "id": "<u3>",  "order_id": "<uuid>",
    "product_id":  "<uuid Bánh Cuốn>",
    "combo_id":    null,
    "combo_ref_id": "<u1>",              // COMBO SUB-ITEM
    "name": "Bánh Cuốn", "unit_price": 4000,
    "quantity": 4, "qty_served": 0,       // 4× per combo, ×1 combo = 4
    "toppings_snapshot": [ { "id": "<uuid Nhân thịt>", "name": "Nhân thịt", "price": 0 } ] },

  { "id": "<u4>",  "order_id": "<uuid>",
    "product_id":  "<uuid Canh>",         // ┐
    "combo_id":    null,                 // ├ STANDALONE PRODUCT (product only) — canh is NEVER inside the combo
    "combo_ref_id": null,                // ┘
    "name": "Canh", "unit_price": 0,
    "quantity": 1, "qty_served": 0,
    "toppings_snapshot": [ { "id": "<uuid Rau mùi tàu>", "name": "Rau mùi tàu", "price": 0 } ] }
]
```

> **`total_amount` is derived, then denormalized.** The header carries no price; right after insert the BE
> runs `RecalculateTotalAmount` = `SUM(unit_price × quantity)` over every row →
> `0·1 + 9 000·1 + 4 000·4 + 0·1 =` **₫25,000**, written onto `orders.total_amount`. It is re-run after
> *every* item mutation or the stored total drifts (the OC-epic bug: a priced header double-counted).
> Note there is **no `status`, no `flagged`, no `filling`** column on `order_items` — item status is derived
> from `qty_served` (0 = pending, `=quantity` = done) and nhân lives in `toppings_snapshot`.

*Physically, in MySQL* — the same data as a `SELECT *` view (real column types):

**`orders` — 1 row**

| column (type) | stored value | from where |
|---|---|---|
| `id` CHAR(36) | `7f3a…` (UUID) | server-generated |
| `order_number` VARCHAR(30) | `ORD-20260613-014` | Redis seq |
| `table_id` CHAR(36) | `<uuid Bàn 01>` | FE |
| `status` ENUM | `pending` | BE default |
| `source` ENUM | `qr` | FE |
| `customer_name` VARCHAR(100) | **`NULL`** | `""` → NULL via `nullStr()` |
| `customer_phone` VARCHAR(20) | **`NULL`** | `""` → NULL |
| `note` TEXT | `NULL` | `""` → NULL |
| `total_amount` DECIMAL(10,0) | `25000` | derived (see above) |
| `created_by` CHAR(36) | `NULL` | customer = no staff |
| `group_id` CHAR(36) | `NULL` | standalone order |
| `created_at`/`updated_at` DATETIME | `2026-06-13 11:40:…` | `CURRENT_TIMESTAMP` |
| `deleted_at` DATETIME | `NULL` | not soft-deleted |

**`order_items` — 4 rows** (`toppings_snapshot` = `JSON` column, stored as literal JSON text; `unit_price` = `DECIMAL(10,0)`, integer — VND has no cents):

| id | order_id | product_id | combo_id | combo_ref_id | name | unit_price | qty | qty_served | toppings_snapshot (JSON text) |
|---|---|---|---|---|---|---|---|---|---|
| `u1` | `7f3a…` | `NULL` | `<Suất Giò>` | `NULL` | Suất Giò | `0` | 1 | 0 | `[]` |
| `u2` | `7f3a…` | `<Giò>` | `NULL` | `u1` | Giò | `9000` | 1 | 0 | `[{"id":"<Nhân thịt>","name":"Nhân thịt","price":0}]` |
| `u3` | `7f3a…` | `<Bánh Cuốn>` | `NULL` | `u1` | Bánh Cuốn | `4000` | 4 | 0 | `[{"id":"<Nhân thịt>","name":"Nhân thịt","price":0}]` |
| `u4` | `7f3a…` | `<Canh>` | `NULL` | `NULL` | Canh | `0` | 1 | 0 | `[{"id":"<Rau mùi tàu>","name":"Rau mùi tàu","price":0}]` |

The storage-level facts that matter:
- **Empty string → NULL.** Every `""` from the bind struct (`customer_name`, `phone`, `note`, `created_by`)
  is converted by `nullStr()` and stored as SQL `NULL`, never an empty string.
- **`toppings_snapshot` is a frozen JSON copy, not a foreign key.** The topping's name+price at order time is
  baked in, so renaming/repricing a topping later never rewrites a past order. The combo header stores `[]`.
- **The combo is a self-referencing tree.** Sub-items point at the header via `combo_ref_id` (FK back to
  `order_items.id`, `ON DELETE CASCADE`). Each sub-item's `quantity` is already multiplied out (`4× × 1 = 4`).
- **`total_amount` is denormalized, written by a 3rd statement** — `UPDATE orders SET total_amount =
  (SELECT SUM(unit_price × quantity) FROM order_items …)` → `0 + 9000 + 16000 + 0 = 25000`. Re-run after
  every item change.
- **No `status`/`flagged`/`filling` columns** on `order_items` — `chk_oi_item_type` enforces the 3 row shapes;
  item progress is just `qty_served` vs `quantity`.

That `orders` row (trimmed) is the one shown at the top of this beat.

**③ BE → FE — the create response**, then the full read.
`POST /orders` returns `{ data: { id, table_busy? } }`. The modal immediately calls
`GET /orders/:id` for the **full [`Order`](../../../../fe/src/types/order.ts) object** (header + every
`items[]` row with `qty_served`, `unit_price`, `toppings_snapshot`) and caches it in `localStorage`
under `order_cache_<id>`, then `router.replace('/order/<id>')`.

**④ BE → FE — realtime** (`GET /orders/:id/events`, SSE via
[useOrderSSE](../../../../fe/src/hooks/useOrderSSE.ts)). The page seeds from the cache + REST snapshot,
then patches itself live from these events:

| SSE event | Payload | Effect on the tracking page |
|---|---|---|
| `order_init` | full `Order` | replace state |
| `order_status_changed` | `{ status, eta? }` | update badge; toast on `confirmed`/`ready`/`cancelled` |
| `item_progress` | `{ item_id, qty_served }` | bump that dish's served count → progress bar |
| `order_cancelled` | — | mark `cancelled`, close stream |
| `order_completed` | — | mark `delivered`, close stream |

#### 🗂️ What the FE keeps — cross-page vs. per-page state

| Where it lives | Key / store | Persists? | Holds |
|---|---|---|---|
| Zustand cart ([store/cart.ts](../../../../fe/src/store/cart.ts)) | `cart-config-v3` | **partial** | `items[]` are **session-only (in-memory)**; only `{ orderNote, activeOrderId }` survive a reload |
| localStorage | `order_cache_<id>` | yes | full `Order` snapshot → instant tracking render before SSE connects |
| Zustand auth | — | yes | `accessToken` → `Bearer` on the SSE request |

- **Menu page** — owns the cart: `tableId` / `tableName` (set from the QR scan), `items[]`, `total()`,
  and the "Tổng số món" preview. On confirm it builds payload ①, then `clearCart()`.
- **Order / tracking page** (`/order/[id]`) — owns no cart; it reads the live `Order` from `useOrderSSE`
  and offers cancel-item / cancel-order mutations. The cart is already empty by the time it renders.
- **Cross-page handoff** — the only thing carried from menu → tracking is the **order `id`** (in the URL)
  plus the `order_cache_<id>` snapshot; `activeOrderId` in the cart store lets other pages know an order
  is in flight.

#### 🥢 How the system manages **Canh** and **Nhân (toppings)**

These two are the trickiest part of the menu, because neither behaves like a normal "add product to cart"
line. Here is the whole mechanism, end to end.

**Nhân (thịt / mộc nhĩ) is a *topping*, not a field.**
There is no `filling` column. (Migration `016` briefly added one; migration `017` dropped it — the **TOP
epic** made nhân a topping instead.) So nhân travels the same path as any topping:

1. **Cart** — the chosen nhân sits in a `CartItem.toppings[]` (a `Topping` = `{ id, name, price }`).
2. **Payload** — [`buildOrderItemsPayload`](../../../../fe/src/lib/order-payload.ts) flattens those to
   `topping_ids: string[]` on the standalone product, **or** onto each combo sub-item (a combo applies its
   nhân to every non-canh dish).
3. **BE** — [`buildToppingsSnapshot`](../../../../fe/src/lib/order-payload.ts) *(be/internal/service/order_service.go)*
   resolves each id → `{ id, name, price }` and freezes it into the row's `toppings_snapshot` JSON. Unknown
   ids are skipped; the combo **header** row always gets an empty snapshot (toppings live on the children).
4. **Read views** — the tracking page / KDS / POS read `toppings_snapshot` to label the dish ("+ Nhân thịt").
   Because it is a **snapshot**, renaming a topping later never rewrites a past order.

> All three toppings are **₫0** (price baked into the dish), so nhân/rau choices never change `total_amount`.
> Prices always come from the **server-side template**, never from the client.

**Canh is a real ₫0 product that is *never* inside a combo.**
Every suất "includes 1 Canh", but canh is split out so the guest can choose **có rau / không rau** and adjust
quantity independently:

| Aspect | How it works |
|---|---|
| Cart identity | Stable ids via `canhCartId()`: `canh_<id>_rau` ("có rau" → carries the *Rau mùi tàu* topping) and `canh_<id>_plain` ("không rau" → `toppings: []`). Same logical bowl ⇒ same key. |
| Mutation | [`setCanhQty`](../../../../fe/src/store/cart.ts) upserts the row; `qty === 0` removes it. Price is always `0`. |
| Stripped from combos | In the payload, canh is filtered out of `combo_items` (the `isSoupName` check) and emitted as its **own** standalone product row. |
| Why the strip holds on BE | When a combo line carries `combo_items` overrides, the BE treats them as the **complete** sub-item list — overrides *replace* the canonical template. Omitting canh means BE never expands a canh child. *(If the FE sent a combo with **no** overrides, BE would fall back to the template and the canh **would** reappear — so the FE must always send overrides.)* |
| Persistence | Canh lives in `items[]`, which is **session-only** — `partialize` never writes canh counts to `localStorage`, and the store `migrate` flushes any legacy canh counter. |

So in the `POST /orders` body above, the **two bánh** ride inside the combo with `topping_ids: ["<Nhân thịt>"]`,
while the **canh** is the standalone row with `topping_ids: ["<Rau mùi tàu>"]` — exactly the two things that
were missing from a naive "just list the combo" payload.

### 11:48 — 5 guests arrive for Bàn 02

A party of **5** is seated at **Bàn 02 (capacity 4)**. Phạm Thu Ngân pulls up a stool.

> ⚠️ **FLAG — no capacity enforcement.** The system never checks headcount vs. `Table.capacity`;
> seating 5 at a 4-seat table is a staff decision, not a system rule. `capacity` is display/planning
> only — see [Table home](OBJECT_MODEL_TABLE.md).

They order **5× Suất Đầy Đủ Trứng Chín** (5 × ₫30,000 = **₫150,000**). Each combo explodes into a
header + child rows — the price lives **only** on the order total, children sit at `unit_price = 0`:

| name | unit_price | qty | row type |
|---|---|---|---|
| Suất Đầy Đủ Trứng Chín | **₫0** | 5 | combo **header** (the ₫30k×5 is in `total_amount`, not here) |
| Bánh Trứng Chín | ₫0 | 5 | sub-item |
| Giò | ₫0 | 5 | sub-item |
| Bánh Cuốn | ₫0 | 15 | sub-item |
| Canh | ₫0 | 5 | sub-item |

→ **Bàn 02: occupied.** `ORD-20260613-015`, total **₫150,000**.

> 💡 If this party had been split across **two** tables (say 3 at Bàn 02 + 2 at Bàn 05), each table
> gets its *own* order, and a shared **`group_id`** links them so the cashier can settle **one bill**.
> Here they fit one table, so no `group_id` is needed.

### 11:55 — 6 more guests fill the remaining tables

Three small parties walk in together and take the **last four tables**, so every table is now occupied:

| Table | Guests | Order | Items | Total |
|---|---|---|---|---|
| Bàn 03 (6) | 2 | `…-016` qr | 2× Suất Đầy Đủ Trứng Tái | ₫60,000 |
| Bàn 04 (2) | 1 | `…-017` qr | 3× Giò (nhân thịt) | ₫27,000 |
| Bàn 05 (4) | 2 | `…-018` qr | 2× Giò *(cancels at 12:05 — see below)* | ₫18,000 |
| Bàn VIP (8) | 1 | `…-019` qr | 1× Suất Đầy Đủ Trứng Tái | ₫30,000 |

→ **All 6 tables `occupied`.** The stall is full.

### 12:01 & 12:03 — 2 online orders (no table)

Two takeaway customers order from the website. `source: "online"`, **`table_id: null`** — these are
independent of the floor and never touch a table's status:

```jsonc
// ORD-20260613-020 — online
{ "table_id": null, "source": "online", "status": "pending",
  "total_amount": 60000 }              // 2× Suất Đầy Đủ Trứng Chín

// ORD-20260613-021 — online
{ "table_id": null, "source": "online", "status": "pending",
  "total_amount": 12000 }              // 1× Bánh Chay
```

### 12:02 — 3 guests arrive, but no table → ⏳ waitlist

A party of **3** walks in. Every table is `occupied`, and **the QR flow needs a free table to start an
order** — there is no "ghost table." So they **wait**. Phạm Thu Ngân tells them Bàn 01 is closing out
in a few minutes.

> ⚠️ **FLAG — the waitlist lives in the cashier's head, not the DB.** There is no `waitlist` object;
> a guest with no table simply cannot create an order yet. Staff manage the queue manually until a
> table frees.

### 12:05 — Bàn 05 orders 2 dishes, then cancels

The 2 guests at **Bàn 05** decide to leave. Their order (`…-018`, 2× Giò = ₫18,000) is **cancelled
before the chef starts cooking**:

```jsonc
// orders row — Bàn 05, before
{ "order_number": "ORD-20260613-018", "table_id": "Bàn 05",
  "status": "pending", "total_amount": 18000 }   // items: 2× Giò @ 9,000

// after cancel
{ "order_number": "ORD-20260613-018", "table_id": "Bàn 05",
  "status": "cancelled", "total_amount": 18000 }  // amount kept for audit, NOT billed
```

What happens:
- `status: pending → cancelled` (the `orders` enum includes `cancelled`).
- **Cancellation is allowed at any status** — this is an owner decision (the *cancel-anytime* drift),
  not a per-status gate. See the Decision Log in [LOGIC_INDEX](../../07_business_logic/LOGIC_INDEX.md).
- No payment is created; the order is **excluded from the day's revenue** (the `total_amount` row stays
  only as history).
- **Bàn 05: `occupied → available`.**

### 12:08 — The floor recovers

Two tables free up almost at once:
- The solo guest at **Bàn 01** pays ₫25,000 (cashier closes the bill) → `status → paid` → **Bàn 01 available**.
- **Bàn 05** is already free from the cancel.

Phạm Thu Ngân seats the **waiting party of 3 at Bàn 01** (the table they were promised). Bàn 05 stays
open for the next walk-in.

---

## 📸 Peak snapshot — 12:04 (the busiest moment)

| Table / channel | Cap | Guests | Status | Order | Total | Dish state (KDS) |
|---|---|---|---|---|---|---|
| Bàn 01 | 4 | 1 | occupied | `…-014` qr | ₫25,000 | ready (about to pay) |
| Bàn 02 | 4 | **5** ⚠️ | occupied | `…-015` qr | ₫150,000 | preparing |
| Bàn 03 | 6 | 2 | occupied | `…-016` qr | ₫60,000 | preparing |
| Bàn 04 | 2 | 1 | occupied | `…-017` qr | ₫27,000 | pending |
| Bàn 05 | 4 | 2 | occupied | `…-018` qr | ₫18,000 | pending *(cancels in 1 min)* |
| Bàn VIP | 8 | 1 | occupied | `…-019` qr | ₫30,000 | pending |
| 🌐 online | — | — | — | `…-020` | ₫60,000 | preparing |
| 🌐 online | — | — | — | `…-021` | ₫12,000 | pending |
| ⏳ waitlist | — | **3** | *waiting — no table* | — | — | — |

**Open orders on the kitchen screen: 8.** Lê Đầu Bếp works them by incrementing each item's
`qty_served`; when every item on an order reaches `qty_served == quantity`, that order flips to `ready`.

**Day revenue from this rush** (everyone pays except the Bàn 05 cancel):
`21k + 150k + 60k + 27k + 0 + 30k + 60k + 12k = ` **₫360,000**.

---

## 🥢 Behind the dishes — the ingredient thread

All that food drew down raw stock. After the rush, **Trần Quản Lý** does a quick stock-take and records
the flour used as an **`out`** movement:

```jsonc
// stock_movements row — end-of-lunch stock-take
{ "ingredient_id": "Bột bánh cuốn", "type": "out",
  "quantity": 6.5, "note": "Tiêu thụ trưa 13/06", "created_by": "manager1" }
```

That drops the ingredient toward its threshold:

```jsonc
// ingredients row — "Bột bánh cuốn" after the stock-take
{ "name": "Bột bánh cuốn", "unit": "kg",
  "quantity": 6.0,             // current_stock: 12.5 → 6.0
  "warningThreshold": 5.0,     // min_stock
  "expiryDate": "2026-07-01",
  "status": "in_stock" }       // 6.0 > 5.0 — but one more rush will trip "low_stock"
```

> ⚠️ Two real-world facts worth keeping in mind (both are existing system flags):
> 1. **Stock is not auto-decremented when food is cooked.** `current_stock` only changes when a staff
>    member records a movement. The recipe link (`product_ingredients`) exists in DB but **nothing reads
>    it during the order flow** — see [Ingredient §3](OBJECT_MODEL_INGREDIENT.md). The manager keeps
>    stock honest by hand.
> 2. **`out` can't go negative** — it floors at `GREATEST(0, current_stock - qty)`; over-draw is silently
>    clamped, no error.

If flour ever hits `0` → `status: out_of_stock`; within 7 days of `expiryDate` → `expiring_soon`;
at/under `5.0` → `low_stock`. Those badges light up on the admin ingredients page.

---

---

## 🔧 Under the hood — how the data actually moves (this rush, end to end)

> Everything below is the *concrete* version of this lunch rush. The **rules** live in their home
> docs (linked); this section only shows how those rules play out for these 8 orders. Sources traced:
> `fe/src/lib/api-client.ts` · `fe/src/lib/providers.tsx` · `fe/src/store/cart.ts` ·
> `fe/src/lib/order-payload.ts` · `fe/src/lib/storage-keys.ts` · the SSE/WS hooks ·
> [`monitoring/`](../../../../monitoring/).

### A. What the FE shares **across components** (one page, many widgets)

While the Bàn 02 party builds its order, three widgets on the **same `/menu` page** must agree — the
`ProductCard` grid, the `CartBottomBar` total, and the "Tổng số món" preview. They are **not** wired
by prop-drilling; they all read **one Zustand store**, `useCartStore` (a module singleton):

```
ProductCard.addItem() ─┐
                        ├─▶  useCartStore (Zustand, in-memory)  ─▶  CartBottomBar total
ToppingModal (nhân) ───┘                                        └─▶  "Tổng số món" preview
```

- Adding "1× Suất Đầy Đủ Trứng Chín" calls `addItem()` → **instant** local update, no network wait
  (this is the only "optimistic" update in the app — see [LOADING_PATTERNS §Optimistic](../../04_fe/LOADING_PATTERNS.md)).
- `cart.total()` / `cart.itemCount()` are selectors recomputed from `items` — every subscribed widget
  re-renders in lockstep, so the preview can **never** disagree with the bottom-bar total.
- **Rule home:** [STATE_MANAGEMENT §Layer 2 — Zustand](../../04_fe/STATE_MANAGEMENT.md).

> Single-widget state (e.g. "is the topping modal open?") stays in local `useState` — it never goes
> in the store. Server lists (products, combos) come from TanStack Query, not Zustand. Three layers,
> no mixing.

### B. What the FE carries **across pages** (the QR journey)

The Bàn 02 guest crosses four pages — `/table/:id` → `/menu` → `/checkout` → `/order/:id`. State
survives each navigation through **Zustand + a couple of localStorage keys**, never via the URL or props:

| Travels across pages | Mechanism | Survives F5? |
|---|---|---|
| Cart `items`, `tableId`, `tableName` | `useCartStore` (memory) | ❌ items are session-only |
| `orderNote`, `activeOrderId` | `useCartStore` **persisted** → `STORAGE_KEYS.CART_CONFIG` (`cart-config-v3`) | ✅ |
| Table label, customer name | `useSettingsStore` → `STORAGE_KEYS.CUSTOMER_SETTINGS` | ✅ |
| Last-seen `Order` (instant paint on `/order/:id`) | `STORAGE_KEYS.ORDER_CACHE` + orderId | ✅ |
| Guest access token | `useAuthStore` — **memory only, never localStorage** (XSS rule) | ❌ → restored by `GET /auth/me` |

- After the POST succeeds, the menu page sets `activeOrderId` and **clears the cart**. That
  `activeOrderId` is why the menu later offers **"Đặt thêm món"** (add-to-order) instead of a brand-new
  order — it's the same flow Bàn 04 would use to add a 4th Giò.
- **Rule homes:** page-to-page keys → [DATA_COMMUNICATION §Page-to-Page](../../04_fe/DATA_COMMUNICATION.md);
  every key string is defined **once** in [`storage-keys.ts`](../../../../fe/src/lib/storage-keys.ts) (never inline).

### C. How the FE **sends** data to the BE (the Bàn 02 order)

When the party taps "Đặt hàng", exactly one HTTP call leaves the browser, through the **single Axios
instance** `api` ([`api-client.ts`](../../../../fe/src/lib/api-client.ts)) — never a raw `fetch`:

```jsonc
POST /api/v1/orders            // baseURL from NEXT_PUBLIC_API_URL; withCredentials: true
Authorization: Bearer <guest JWT>   // ← request interceptor injects it from useAuthStore
{
  "table_id": "Bàn 02", "source": "qr",
  "items": [ /* built ONLY by buildOrderItemsPayload(cart.items) */
    { "combo_id": "<Suất Đầy Đủ Trứng Chín>", "quantity": 5,
      "topping_ids": [], "combo_items": [ /* overrides; canh stripped to its own row */ ] }
  ]
}
```

Three things make this safe and consistent:
1. **No prices, no names on the wire.** The body carries ids + quantities; the BE re-snapshots name +
   price server-side, so a guest can never set their own price. (Combo header → `unit_price = 0`.)
2. **One builder, three callers.** `buildOrderItemsPayload()` is the *only* thing that turns the cart
   into `items[]` — used by the table-confirm modal, online checkout, and add-to-order alike, so all
   three produce byte-identical payloads. Building `items[]` inline in a page is forbidden.
3. **Auth is automatic.** The request interceptor reads the token from `useAuthStore` and sets the
   `Bearer` header; the guest never handles it. The **cancel** (Bàn 05) and **add-to-order** go out the
   same client — e.g. `addItemsToOrder(orderId, items)` → `POST /orders/:id/items`.
- **Rule home:** [DATA_COMMUNICATION §API Client + §Order Payload Builder](../../04_fe/DATA_COMMUNICATION.md);
  payload field shapes → [OBJECT_MODEL_ORDER §2.3](OBJECT_MODEL_ORDER.md).

### D. What the FE **receives** back — and how it stays live

Two very different return paths, and the scenario uses both:

**(1) The HTTP response** to the POST is the created order (`orderJSON`) — the menu page reads
`data.data.id`, stores it as `activeOrderId`, caches the order under `ORDER_CACHE+id`, and routes to
`/order/:id`. That cached copy paints **instantly**, before any network — no spinner.

**(2) Realtime push** keeps `/order/:id` live *without polling*. As **Lê Đầu Bếp** cooks, the BE pushes
events that bypass HTTP entirely:

| Audience | Transport | Hook | What this rush sends |
|---|---|---|---|
| Bàn 02 guest's tracking page | **SSE** (`Authorization: Bearer` header) | `useOrderSSE` → `GET /orders/:id/events` | `item_progress` (qty_served ↑), `order_status_changed`, `order_completed` |
| Bàn 05 guest after the cancel | SSE | same | `order_cancelled` → stream closes, page shows "Đã huỷ" |
| Chef on the KDS + cashier on Admin Overview | **WebSocket** (`?token=` query param) | `useOverviewWS` → `ws/kds` | `new_order` (×8), `item_progress`, `order_cancelled` |

- SSE patches a local `useState<Order>` (the progress bar = `served/total` of all items). The WS path is
  cleverer: `useOverviewWS` calls `queryClient.setQueryData(['orders','live'], …)` to patch the **shared
  TanStack Query cache in place** — every admin widget subscribed to that key updates with **no network
  round-trip**. The 8 cards on the floor screen move the instant the chef taps a dish.
- If the stream drops: 5 reconnect attempts, exponential backoff 1s→30s, `<ConnectionErrorBanner>` after
  the 3rd. **Rule homes:** [DATA_COMMUNICATION §Realtime](../../04_fe/DATA_COMMUNICATION.md) ·
  [LOADING_PATTERNS §SSE Reconnect](../../04_fe/LOADING_PATTERNS.md).

### E. Loading strategy + caching (why the rush feels instant despite 8+ tabs)

The menu **catalog** (categories/products/combos) is the same for all 6 tables, so it is cached at three
levels and almost never re-fetched during the rush:

```
Browser tab                          BE (Go/Gin)                MySQL
─────────────                        ───────────                ─────
L1 TanStack Query  ──HTTP (no────▶   L2 Redis cache-aside  ──▶  L3 source of truth
   staleTime 5min      Cache-Control)   catalog keys, 5min TTL,     (always authoritative)
   for catalog                          fail-open
```

- **First paint = zero spinner.** `/menu` uses ISR (`export const revalidate = 300`) + a
  `HydrationBoundary`, so the page ships **pre-rendered** with catalog data already in it. None of the 6
  tables sees a loading flash on the menu.
- **L1 (browser):** default `staleTime` 60 s, `retry: 1`; **catalog overridden to 5 min** to match the
  Redis TTL. Six tables hitting `/products` within 5 min mostly read their own warm L1 cache.
- **L2 (Redis):** catalog reads are cache-aside (miss → DB → backfill); writes `DEL` the keys. Orders,
  payments, and live floor state are **never** Redis-cached — that's deliberate.
- **Orders bypass caching entirely.** The 8 live orders are *pushed* (SSE/WS), not cached — money and
  live state are never stale.
- **There is no HTTP cache** (Caddy/BE set no `Cache-Control`), so a stale L1 query is a real BE request.
  Worst-case catalog staleness = L1 5 min + Redis 5 min ≈ **10 min** — acceptable for a menu, never for orders.
- **Rule homes:** [10_caching/CACHING_INDEX.md](../../10_caching/CACHING_INDEX.md) (cross-layer) ·
  [STATE_MANAGEMENT §Layer 1](../../04_fe/STATE_MANAGEMENT.md) (staleTime) · [LOADING_PATTERNS](../../04_fe/LOADING_PATTERNS.md).

### F. Monitoring this rush in Grafana

While the floor fills, the burst of `POST /orders` (×8) + the online orders + all the SSE/WS traffic is
visible to **Trần Quản Lý** (or the on-call dev) on the monitoring stack — which ships **inside the same
`docker-compose.yml`**, nothing extra to install:

```
be:8080 ──/metrics──▶ Prometheus :9090 ──rules──▶ alerts
   every 15s                │
all containers ──logs──▶ Promtail ──▶ Loki :3100
                                │           │
                                └────┬──────┘
                                     ▼
                              Grafana :3001  ·  dashboard "BanhCuon — API Monitoring"
```

- **Dashboard (`:3001`), 5 panels:** Request Rate (req/s) — spikes at 12:04; 5xx Error Rate (%);
  p95 Response Time (ms); Active Alerts; Container Logs (from Loki).
- **The only two alerts** (kept deliberately minimal): `HighErrorRate` (5xx > **5%** over 5 min → critical)
  and `SlowResponseTime` (**p95 > 500 ms** over 5 min → warning). If the combo-heavy Bàn 02 order made the
  BE slow, `SlowResponseTime` is what would warn.
- **Triage order when something breaks:** Grafana panels → Container Logs (or `docker compose logs -f be`)
  → Prometheus `:9090 → Alerts`. On the VPS the monitoring ports are firewalled — tunnel with
  `ssh -L 3001:localhost:3001 …`.
- **Rule home:** [09_devops/MONITORING.md](../../09_devops/MONITORING.md); live configs in
  [`monitoring/`](../../../../monitoring/) (edit there, never in the doc).

### Putting A–F on one timeline (Bàn 02's combo)

```
tap "Đặt hàng"
  → addItem already in useCartStore (A: instant, cross-component)
  → buildOrderItemsPayload(cart.items)                              (C: one builder)
  → api.post('/orders')  + Bearer guest token (interceptor)        (C: one client)
  → BE snapshots price/name, writes orders + order_items (combo split, header=0)
  → 201 { order } → setActiveOrderId, clearCart, cache ORDER_CACHE  (B: cross-page)
  → router.push('/order/:id') → instant paint from cache           (E: no spinner)
  → useOrderSSE opens /orders/:id/events                            (D: realtime in)
  → chef increments qty_served → item_progress SSE → progress bar moves
  → WS new_order also patched ['orders','live'] on Admin Overview   (D: setQueryData)
  → the whole burst shows as req/s + p95 on Grafana :3001           (F: monitoring)
```

---

## 🧠 The one-line mental model

> **Staff** *act on* → **Orders** *(each pinned to a Table via QR, or to no table when `online`; combos
> split into a 0-priced header + children; cancel-anytime; prices/toppings snapshotted at order time)* →
> while **Ingredients** track the raw stock behind the dishes, **moved by hand** via the stock ledger —
> never auto-deducted.

## Flags surfaced by this scenario

| # | Flag | Where it bites |
|---|---|---|
| 1 | **No table-capacity enforcement** | 5 guests seated at a 4-seat Bàn 02 — staff judgment, not a system rule |
| 2 | **No waitlist object** | The party of 3 with no free table can't create an order; the queue is manual |
| 3 | **Cancel allowed at any status** | Bàn 05's cancel — owner *cancel-anytime* decision; excluded from revenue |
| 4 | **Combo price only on the order total** | Combo child rows are `unit_price = 0` — never sum the children |
| 5 | **Stock is manual, never auto-deducted** | Cooking 35+ bánh cuốn doesn't move `current_stock`; the manager does |
