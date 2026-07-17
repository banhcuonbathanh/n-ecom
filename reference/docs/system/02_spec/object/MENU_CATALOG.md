# Seed Data Catalog — Products · Combos · Toppings · Categories · Staff · Tables

> **What this is:** the full inventory of *actual data instances* the system seeds — every category,
> topping, product, combo, staff account, and table. This is the **data**, not the schema.
> For the field shapes of each object, see the schema home files:
> [Product](OBJECT_MODEL_PRODUCT.md) · [Combo](OBJECT_MODEL_COMBO.md) · [Topping](OBJECT_MODEL_TOPPING.md)
> · [Category](OBJECT_MODEL_CATEGORY.md) · [Staff](OBJECT_MODEL_STAFF.md) · [Table](OBJECT_MODEL_TABLE.md)
> · [Order](OBJECT_MODEL_ORDER.md) · index → [OBJECT_MODELS.md](OBJECT_MODELS.md).
>
> **Traced from source:** menu (categories/toppings/products/combos) from
> [`scripts/seed_real_menu.sql`](../../../../scripts/seed_real_menu.sql) (menu spec: `docs/base/MENU_SPEC.md`);
> staff + tables from [`scripts/seed.sql`](../../../../scripts/seed.sql) (these are *not* replaced by
> the real-menu seed). Prices in VND (₫). When a seed changes, regenerate this file.
> **Code wins** — if anything here disagrees with the seed, fix this file.

---

## At a glance

| Type | Count | Notes |
|---|---|---|
| Categories | 5 | Suất · Trứng · Bánh Cuốn · Giò · Canh |
| Toppings (nhân) | 2 | all free (₫0) — price baked into the dish |
| Products | 9 | 2 bánh cuốn + 1 bánh chay + 3 trứng + 1 giò + 2 canh |
| Combos (suất) | 5 | each = fixed set of products |
| Staff accounts | 4 | admin · manager · chef · cashier |
| Tables | 10 | Bàn 01–10 — all capacity 4 |

> ID prefix guide: menu seed → `aaaa…` categories · `bbbb…` toppings · `cccc…` products ·
> `dddd…` combos · `eeee…` combo_items. Base seed → `1111…` staff · `2222…` tables.
> Short IDs below are the `…0000000N` suffix.

---

## 1. Categories

> `#` = the category's ID suffix (`aaaa…0000000N`); rows are listed in **`Sort` (menu display) order**.

| # | Name | Description | Sort | Active |
|---|---|---|---|---|
| 03 | **Suất** | Suất ăn trọn bộ tiện lợi | 1 | ✅ |
| 04 | **Trứng** | Bánh trứng — tái · chín · vàng | 2 | ✅ |
| 01 | **Bánh Cuốn** | Bánh cuốn — khách chọn nhân | 3 | ✅ |
| 05 | **Giò** | giò nhỏ 5 phút | 4 | ✅ |
| 02 | **Canh** | Canh kèm theo mỗi suất | 5 | ✅ |

---

## 2. Toppings (Nhân)

All toppings are free — `price = 0`. Cost is already included in the dish price.

| # | Name | Price | Available | Used by |
|---|---|---|---|---|
| 01 | **Nhân thịt** | ₫0 | ✅ | 5 dishes: Bánh Cuốn Thịt · Bánh Cuốn Mộc Nhĩ · Bánh Trứng Tái/Chín/Vàng |
| 02 | **Nhân thịt mộc nhĩ** | ₫0 | ✅ | 5 dishes: Bánh Cuốn Thịt · Bánh Cuốn Mộc Nhĩ · Bánh Trứng Tái/Chín/Vàng |

> Only 2 toppings exist (both nhân). There is **no "Rau mùi tàu" topping** — canh choice is modelled
> as two separate products (**Canh có rau** / **Canh không rau**), not a topping. Bánh Chay, Giò and
> Canh take no nhân.

---

## 3. Products

> `#` = the product's ID suffix (`cccc…0000000N`); listed in seed order.

| # | Name | Category | Price | Selectable toppings |
|---|---|---|---|---|
| 01 | **Bánh Cuốn Thịt** | Bánh Cuốn | ₫4,000 | Nhân thịt · Nhân thịt mộc nhĩ |
| 02 | **Bánh Cuốn Mộc Nhĩ** | Bánh Cuốn | ₫4,000 | Nhân thịt · Nhân thịt mộc nhĩ |
| 03 | **Bánh Chay** | Bánh Cuốn | ₫2,500 | — (bánh không, no nhân) |
| 04 | **Bánh Trứng Tái** | Trứng | ₫9,000 | Nhân thịt · Nhân thịt mộc nhĩ |
| 05 | **Bánh Trứng Chín** | Trứng | ₫9,000 | Nhân thịt · Nhân thịt mộc nhĩ |
| 06 | **Bánh Trứng Vàng** | Trứng | ₫9,000 | Nhân thịt · Nhân thịt mộc nhĩ |
| 07 | **Giò** | Giò | ₫9,000 | — (no nhân) |
| 08 | **Canh có rau** | Canh | ₫0 | — (no nhân) |
| 09 | **Canh không rau** | Canh | ₫0 | — (no nhân) |

**Descriptions**
- **Bánh Cuốn Thịt** — Bánh cuốn nhân thịt
- **Bánh Cuốn Mộc Nhĩ** — Bánh cuốn nhân mộc nhĩ
- **Bánh Chay** — Bánh cuốn chay — không thịt (bánh không, no nhân)
- **Bánh Trứng Tái** — Trứng lòng đào (half-cooked), chọn nhân
- **Bánh Trứng Chín** — Trứng chín hoàn toàn, chọn nhân
- **Bánh Trứng Vàng** — Trứng chiên vàng, chọn nhân
- **Giò** — Giò lụa cắt khoanh (no nhân)
- **Canh có rau** — Canh kèm rau mùi tàu
- **Canh không rau** — Canh không rau

---

## 4. Combos (Suất)

Each combo is a fixed set of products at a set price (category: **Suất**).

| # | Name | Price | Contents |
|---|---|---|---|
| 01 | **Suất Đầy Đủ Trứng Tái** | ₫30,000 | 1× Bánh Trứng Tái · 3× Bánh Cuốn · 1× Giò · 1× Canh |
| 02 | **Suất Đầy Đủ Trứng Chín** | ₫30,000 | 1× Bánh Trứng Chín · 3× Bánh Cuốn · 1× Giò · 1× Canh |
| 03 | **Suất Giò** | ₫25,000 | 1× Giò · 4× Bánh Cuốn · 1× Canh |
| 04 | **Suất Trứng Tái** | ₫25,000 | 1× Bánh Trứng Tái · 4× Bánh Cuốn · 1× Canh |
| 05 | **Suất Trứng Chín** | ₫25,000 | 1× Bánh Trứng Chín · 4× Bánh Cuốn · 1× Canh |

> Combo price is the **listed combo price**, not the sum of item prices. Per the OC epic, the
> combo header carries the price and child `order_items` are stored at `unit_price = 0` to avoid
> double-counting — see [Combo schema](OBJECT_MODEL_COMBO.md) and [Order schema](OBJECT_MODEL_ORDER.md).

---

## 5. Staff accounts

Seeded in [`scripts/seed.sql`](../../../../scripts/seed.sql) (bcrypt cost 12). Schema → [Staff](OBJECT_MODEL_STAFF.md).
`job_title` / `shifts` / `responsibilities` are NULL for all seeded accounts.

| # | Username | Password | Full name | Role | Phone | Email | Active |
|---|---|---|---|---|---|---|---|
| 01 | **admin** | `admin123` | Nguyễn Admin | admin | 0901000001 | admin@banhcuon.vn | ✅ |
| 02 | **manager1** | `manager123` | Trần Quản Lý | manager | 0901000002 | manager@banhcuon.vn | ✅ |
| 03 | **chef1** | `chef1234` | Lê Đầu Bếp | chef | 0901000003 | — | ✅ |
| 04 | **cashier1** | `cashier123` | Phạm Thu Ngân | cashier | 0901000004 | — | ✅ |

> 🔒 Dev credentials only. `password_hash` is never serialized; `performance_score` is a hardcoded `0`
> placeholder (not stored) — see [Staff §3](OBJECT_MODEL_STAFF.md).

---

## 6. Tables

Seeded in [`scripts/seed.sql`](../../../../scripts/seed.sql). Each has a 64-char hex `qr_token` (the QR
payload that starts a guest order). Schema → [Table](OBJECT_MODEL_TABLE.md).

> `#` = the table's ID suffix (`2222…0000000N`). **All 10 tables have capacity 4.**

| # | Name | Capacity | Status (seed) | Active |
|---|---|---|---|---|
| 01 | **Bàn 01** | 4 | available | ✅ |
| 02 | **Bàn 02** | 4 | available | ✅ |
| 03 | **Bàn 03** | 4 | available | ✅ |
| 04 | **Bàn 04** | 4 | available | ✅ |
| 05 | **Bàn 05** | 4 | available | ✅ |
| 06 | **Bàn 06** | 4 | available | ✅ |
| 07 | **Bàn 07** | 4 | available | ✅ |
| 08 | **Bàn 08** | 4 | available | ✅ |
| 09 | **Bàn 09** | 4 | available | ✅ |
| 10 | **Bàn 10** | 4 | available | ✅ |

> The demo orders in `seed_real_menu.sql` flip **Bàn 01–03** to `occupied`. `status` is otherwise
> driven by the order lifecycle, not set by hand — see [Table §3](OBJECT_MODEL_TABLE.md).
