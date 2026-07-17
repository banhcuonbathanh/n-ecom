# Object Models — Index + The "One Source, One Home" Rule

> **TL;DR:** Every object model (Order, Product, Combo, …) has **exactly one home file** that
> shows its shape across **all layers — FE ⇄ BE ⇄ DB — side by side**, with a **real object
> example** at each layer so you can read it top-to-bottom and understand it. Every other doc that
> mentions the model **links here and does not re-describe its fields**. The worked reference is
> [OBJECT_MODEL_ORDER.md](OBJECT_MODEL_ORDER.md).
>
> **Looking for the actual menu data** (every product, combo, topping with prices)? That's the
> data catalog → [MENU_CATALOG.md](MENU_CATALOG.md). This file covers *schemas*, not instances.

---

## The Rule (one model = one home)

1. **One home per model.** Each model's fields live in **one** file: `OBJECT_MODEL_<NAME>.md`.
   That file is the single source of truth for the model's attributes at every layer.
2. **Everyone else points here.** Any other doc (API_SPEC, page docs, FE/BE summaries, flow docs)
   that needs to talk about the model **links to the home file** and shows at most a *key-fields*
   subset for its own purpose — it never re-lists the full field set. When in doubt, link, don't copy.
3. **Code wins.** Each home file is traced from source (TS types, Go DTOs, migrations), not from
   docs. When the home file and code disagree → fix the home file and log it in the
   [LOGIC_INDEX Decision Log](../../07_business_logic/LOGIC_INDEX.md#decision-log).
4. **Real example at every layer.** The home file must include a concrete object (real values) as
   it looks in FE (TS), on the wire (JSON), and in DB (a row) — so the reader sees the *same* object
   morph across layers, not just abstract field tables. See the example block below.
5. **Mismatches are flagged, not hidden.** Where layers disagree (null vs `""`, phantom fields,
   derived vs stored), the home file lists them in a "Flags / Known Mismatches" section.

> Why: a model field defined in five files drifts in five directions. One home means one edit when
> the shape changes, and one place to trust. This mirrors the other single-source homes in this
> handbook — see [README Non-Negotiable Rule #9](../../README.md#non-negotiable-rules-apply-to-every-page-every-endpoint).

---

## Model Index

Legend: ✅ home file exists · 🔲 home not written yet (create `OBJECT_MODEL_<NAME>.md` from the
[Order template](OBJECT_MODEL_ORDER.md) when that domain is next worked) · *FE-only* = no DB table.

| Model | Home file | FE type | BE DTO / serializer | DB table(s) | Status |
|---|---|---|---|---|---|
| **Order** (+ items) | [OBJECT_MODEL_ORDER.md](OBJECT_MODEL_ORDER.md) | `Order` / `OrderItem` (`fe/src/types/order.ts`), `CartItem` (`cart.ts`) | `createOrderReq` / `orderJSON` (`order_handler.go`) | `orders`, `order_items` | ✅ |
| **Product** | [OBJECT_MODEL_PRODUCT.md](OBJECT_MODEL_PRODUCT.md) | `Product` (`fe/src/types/product.ts`) | `productJSON` (`product_handler.go`) | `products`, `product_toppings` | ✅ |
| **Combo** | [OBJECT_MODEL_COMBO.md](OBJECT_MODEL_COMBO.md) | `Combo` / `ComboRaw` (`fe/src/types/product.ts`) | `ListCombos` serializer (`product_handler.go`) | `combos`, `combo_items` | ✅ |
| **Topping** | [OBJECT_MODEL_TOPPING.md](OBJECT_MODEL_TOPPING.md) | `Topping` (`fe/src/types/product.ts`) | nested in `productJSON` | `toppings`, `product_toppings` | ✅ |
| **Category** | [OBJECT_MODEL_CATEGORY.md](OBJECT_MODEL_CATEGORY.md) | `Category` (`fe/src/types/product.ts`) | `ListCategories` serializer (`product_handler.go`) | `categories` | ✅ |
| **Staff** | [OBJECT_MODEL_STAFF.md](OBJECT_MODEL_STAFF.md) | `Staff` (`fe/src/types/staff.ts`) | `toStaffJSON` (`staff_handler.go`) | `staff`, `refresh_tokens` | ✅ |
| **Table** | [OBJECT_MODEL_TABLE.md](OBJECT_MODEL_TABLE.md) | *(no FE type — inline)* | `ListTables` serializer (`table_handler.go`) | `tables` | ✅ |
| **Payment** | `OBJECT_MODEL_PAYMENT.md` | payment types | payment DTOs (`payment_handler.go`) | `payments` | 🔲 (no seed data) |
| **Ingredient** | [OBJECT_MODEL_INGREDIENT.md](OBJECT_MODEL_INGREDIENT.md) | `Ingredient` (`fe/src/features/admin/admin.api.ts`) | `toIngredientJSON` (`ingredient_handler.go`) | `ingredients`, `product_ingredients`, `stock_movements` | ✅ (STOR forecast planned 🔮) |

> **Cart** is *FE-only* (Zustand store, no DB table). Its shape is documented inside the Order home
> file (§2.1–2.2) because it only exists as the write-side of an order.

---

## What a Home File Must Contain (template)

Copy [OBJECT_MODEL_ORDER.md](OBJECT_MODEL_ORDER.md) and keep these sections:

1. **Header** — generated date, branch, and the exact source files traced (FE types, BE DTO,
   migrations). State "traced from source, NOT from docs."
2. **Pipeline line** — one line showing the write path and read path across layers.
3. **§1 Comparison Matrix** — every attribute as a row, one column per layer
   (FE type · FE→BE request · BE DTO · DB column · BE→FE response). `—` = absent at that layer,
   ⚠️ = mismatch.
4. **§2 Detail tables + real example** — per-layer field tables **and** one concrete object with
   real values shown at each layer (see below).
5. **§3 Flags / Known Mismatches** — every place the layers disagree.

### Real-object example (the part that makes it "easy to understand")

A home file must show the *same* object at each layer. For Order, that looks like:

```jsonc
// FE — CartItem in the Zustand cart store (fe/src/types/cart.ts)
{ "id": "product_abc_t1t2", "type": "product", "product_id": "abc",
  "name": "Bánh cuốn thịt", "quantity": 2, "price": 35000,
  "toppings": [{ "id": "t1", "name": "Thịt", "price": 0 }] }

// WIRE — POST /orders body item (built by order-payload.ts; no name, no price)
{ "product_id": "abc", "combo_id": null, "quantity": 2,
  "topping_ids": ["t1"], "note": "" }

// DB — order_items row (BE snapshots name + price server-side)
// id=… order_id=… product_id=abc name="Bánh cuốn thịt"
// unit_price=35000 quantity=2 qty_served=0 toppings_snapshot=[{id,name,price}]

// BE→FE — item in orderJSON response (item_status derived from qty_served)
{ "id": "…", "product_id": "abc", "combo_id": null, "name": "Bánh cuốn thịt",
  "unit_price": 35000, "quantity": 2, "qty_served": 0, "item_status": "pending",
  "toppings_snapshot": [{ "id": "t1", "name": "Thịt", "price": 0 }], "note": "" }
```

The point: the reader follows one real dish from cart → wire → DB → response and *sees* what each
layer keeps, drops, or renames — without cross-referencing five files.

---

## Deep Dive (where the layer-specific detail lives)

- Endpoint contracts (key fields only) → [API_SPEC.md](../API_SPEC.md) — links back here for full shape
- Tables / columns → [DB_SCHEMA.md](../DB_SCHEMA.md)
- How FE transports the object → [../04_fe/DATA_COMMUNICATION.md](../../04_fe/DATA_COMMUNICATION.md)
- Where FE state lives → [../04_fe/STATE_MANAGEMENT.md](../../04_fe/STATE_MANAGEMENT.md)
