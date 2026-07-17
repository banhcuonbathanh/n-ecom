# Seed Data Reference

> **TL;DR**
> Two seed scripts in `scripts/`. They now hold the **same menu** (shared ID space `aaaa…/cccc…/dddd…`), so they stay consistent and are safe to run together or alone.
> 1. `seed.sql` — staff + tables + menu + demo orders. Run **first** (it owns staff & tables).
> 2. `seed_real_menu.sql` — menu + demo orders only (reuses staff/tables from seed.sql). Optional refresh / cleanup of any old placeholder menu.
> Both idempotent (`ON DUPLICATE KEY UPDATE`). Menu spec: `docs/base/MENU_SPEC.md`.

```bash
# After goose up:
mysql -u root -p banhcuon < scripts/seed.sql
mysql -u root -p banhcuon < scripts/seed_real_menu.sql   # optional — same menu, idempotent
# Docker:
docker compose exec mysql mysql -uroot -p$MYSQL_ROOT_PASSWORD banhcuon < /scripts/seed.sql
```

**ID prefixes:** `1111…`=staff · `2222…`=tables · `aaaa…`=categories · `bbbb…`=toppings · `cccc…`=products · `dddd…`=combos · `eeee…`=combo_items · `ffff…`=orders · `0000…`=order_items.

---

## 1 — Staff (5) — bcrypt cost 12 — *(seed.sql only)*
| Username | Password | Role | Full name | Phone | Email |
|---|---|---|---|---|---|
| `admin` | admin123 | admin | Nguyễn Admin | 0901000001 | admin@banhcuon.vn |
| `manager1` | manager123 | manager | Trần Quản Lý | 0901000002 | manager@banhcuon.vn |
| `chef1` | chef1234 | chef | Lê Đầu Bếp | 0901000003 | — |
| `cashier1` | cashier123 | cashier | Phạm Thu Ngân | 0901000004 | — |
| `soup1` | chef1234 | **staff** | Đỗ Nấu Canh (soup maker) | 0901000005 | — |

> ⚠️ `soup1` (soup maker) uses role **`staff`** — the `role` ENUM has no `soup_maker` value, so adding one would need a migration. It shares chef1's bcrypt hash, so its password is `chef1234`.

## 2 — Tables (10) — *(seed.sql only)*
| Name | Capacity | qr_token | Start status |
|---|---|---|---|
| Bàn 01 | 4 | 64-char hex | available → occupied* |
| Bàn 02 | 4 | 64-char hex | available → occupied* |
| Bàn 03 | 4 | 64-char hex | available → occupied* |
| Bàn 04 | 4 | 64-char hex | available |
| Bàn 05 | 4 | 64-char hex | available |
| Bàn 06 | 4 | 64-char hex | available |
| Bàn 07 | 4 | `0707…0707` | available |
| Bàn 08 | 4 | `0808…0808` | available |
| Bàn 09 | 4 | `0909…0909` | available |
| **Bàn 10** | **4** | `1010…1010` | **available** |

\* Bàn 01–03 flipped to `occupied` by the demo orders. All 10 tables have capacity 4; there is no "Bàn VIP".

---

## 3 — Menu (shared by both SQL files)

### Categories (5)
| Sort | Name | Description | Products |
|---|---|---|---|
| 1 | Suất | Suất ăn trọn bộ tiện lợi | 5 combos |
| 2 | Trứng | Bánh trứng — tái · chín · vàng | Trứng Tái/Chín/Vàng |
| 3 | Bánh Cuốn | Bánh cuốn — khách chọn nhân | BC Thịt · BC Mộc Nhĩ · Bánh Chay |
| 4 | Giò | giò nhỏ 5 phút | Giò |
| 5 | Canh | Canh kèm theo mỗi suất | Canh có rau · Canh không rau |

### Toppings = "Nhân" (2) — both price 0
| Name | Applies to |
|---|---|
| Nhân thịt | all bánh + trứng |
| Nhân thịt mộc nhĩ | all bánh + trứng |

> "all bánh + trứng" = Bánh Cuốn Thịt · Bánh Cuốn Mộc Nhĩ · Trứng Tái/Chín/Vàng. **Bánh Chay (bánh không), Giò, Canh have no nhân.**

### Products (9)
| Category | Name | Price | Toppings |
|---|---|---|---|
| Bánh Cuốn | Bánh Cuốn Thịt | 4,000 | Nhân thịt · Mộc nhĩ |
| Bánh Cuốn | Bánh Cuốn Mộc Nhĩ | 4,000 | Nhân thịt · Mộc nhĩ |
| Bánh Cuốn | Bánh Chay | 2,500 | bánh không (no nhân) |
| Trứng | Bánh Trứng Tái | 9,000 | Nhân thịt · Mộc nhĩ |
| Trứng | Bánh Trứng Chín | 9,000 | Nhân thịt · Mộc nhĩ |
| Trứng | Bánh Trứng Vàng | 9,000 | Nhân thịt · Mộc nhĩ |
| Giò | Giò | 9,000 | — (no nhân) |
| Canh | Canh có rau | 0 | — |
| Canh | Canh không rau | 0 | — |

### Combos / Suất (5) — price = sum of components (auto-sum, no discount)
| Combo | Contents | Price |
|---|---|---|
| Suất Đầy Đủ Trứng Tái | 1 Bánh Trứng Tái + 3 Bánh Cuốn + 1 Giò + Canh có rau | 30,000 |
| Suất Đầy Đủ Trứng Chín | 1 Bánh Trứng Chín + 3 Bánh Cuốn + 1 Giò + Canh có rau | 30,000 |
| Suất Giò | 1 Giò + 4 Bánh Cuốn + Canh có rau | 25,000 |
| Suất Trứng Tái | 1 Bánh Trứng Tái + 4 Bánh Cuốn + Canh có rau | 25,000 |
| Suất Trứng Chín | 1 Bánh Trứng Chín + 4 Bánh Cuốn + Canh có rau | 25,000 |

> "Bánh Cuốn" inside a combo resolves to **Bánh Cuốn Thịt** (4k). Sums: `9k + 3×4k + 9k = 30k` (full) · `9k + 4×4k = 25k` (no-giò).
>
> **Nhân (topping) on a suất:** the bánh-cuốn/trứng inside a suất can take **Nhân thịt**, **Nhân thịt mộc nhĩ**, or **both** (a mixed suất whose bánh cuốn/trứng are split across the two nhân). Each combo child carries its own nhân in `toppings_snapshot`, so "both" is just children with different snapshots. Giò and Canh inside a suất never take a nhân.

---

## 4 — Demo orders (5 — identical in both files)
| Table | Order # | Status | Source | Total | Contents |
|---|---|---|---|---|---|
| Bàn 01 | ORD-20260623-001 | preparing | qr | 22,000 | 2× Bánh Trứng Chín (thịt, 1 served) + 1× Bánh Cuốn Thịt + Canh có rau |
| Bàn 02 | ORD-20260623-002 | pending | qr | 30,000 | 1× Suất Đầy Đủ Trứng Tái (combo, expanded into children) |
| Bàn 03 | ORD-20260623-003 | delivered | pos | 34,000 | Suất Giò (25k) + 1× Bánh Trứng Vàng (thịt, 9k), −20 min |
| Bàn 04 | ORD-20260623-004 | preparing | qr | 103,000 | **Gia đình** (mẹ + 2 người lớn + 2 trẻ): 1 Suất Đầy Đủ Chín + 2 Suất Giò + 2 Bánh Chay, then *gọi thêm* 2 Bánh Trứng Vàng + 4 Canh có rau + 2 canh không rau |
| Bàn 05 | ORD-20260623-005 | pending | qr | 50,000 | **Đôi lớn tuổi** (ông + bà): 1 Suất Trứng Tái + 1 Suất Trứng Chín |

> Bàn 04 demonstrates the **add-to-order** flow — the last 2 items carry `note='Gọi thêm'`. Tables 01–05 are all flipped to `occupied`.

Combo orders use the header/child pattern: header row carries `combo_id` + real `unit_price`; child rows carry `combo_ref_id` → header and `unit_price = 0`. Fillings ride in `toppings_snapshot` JSON. Renders identically in KDS / POS / Admin Overview.

---

## Notes / judgment calls
- **Only Bánh Cuốn (Thịt/Mộc Nhĩ) + Trứng (Tái/Chín/Vàng)** take a nhân. **Bánh Chay** is *bánh không* (no nhân); **Giò** and **Canh** have no nhân either.
- **Canh** is modelled as two products (*có rau* / *không rau*) rather than a "rau" topping, both priced 0.
- Both SQL files first run an FK-off `DELETE` of the legacy placeholder menu (`3333…/4444…/5555…/6666…` + `8888…` orders) so an old DB upgrades cleanly.
