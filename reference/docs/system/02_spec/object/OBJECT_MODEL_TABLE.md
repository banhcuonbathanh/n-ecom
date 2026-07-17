# Object Model — Table (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/internal/handler/table_handler.go` (`ListTables` serializer, `createTableReq`) ·
> migration `003_tables.sql` (`tables`). **FE has no dedicated `Table` interface** in `fe/src/types/`
> (see §3) — the closest typed shape is `MonitorTableStatus` in `order.ts` (a different, derived view).
>
> **Single home** for the Table model (Rule #9). See [OBJECT_MODELS.md](OBJECT_MODELS.md).
> Data instances → [MENU_CATALOG.md §6](MENU_CATALOG.md). QR flow → `docs/work_flow/CLIENT_QR_FLOW.md`.

```
READ:  tables MySQL → ListTables serializer → GET /tables → consumed inline by admin/POS UI
WRITE: manager+ — POST /tables (returns {id, qr_token}) · PATCH /tables/:id
QR:    each table has a 64-char qr_token; the customer QR encodes it → resolves to this table
```

> A `table` is both a seating unit and the **anchor of the QR ordering flow**: scanning a table's QR
> (which carries its 64-char `qr_token`) starts a guest order for that table. `status` tracks live
> occupancy and is flipped by the order lifecycle (e.g. → `occupied` when an order is active).

---

## §1 — Comparison Matrix

Legend: `—` = absent at that layer · ⚠️ = mismatch, see [§3](#3--flags--known-mismatches).

| Attribute | DB `tables` | BE→FE JSON (`ListTables`) | FE consumption |
|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | inline `string` |
| `name` | VARCHAR(50) NOT NULL | `string` | inline `string` |
| `qr_token` | CHAR(64) NOT NULL | `string` (64 hex) | used to build QR / link |
| `capacity` | INT DEFAULT 4 | `number` | inline `number` |
| `status` | ENUM(available,occupied,reserved,inactive) | `string` | inline `string` |
| `is_active` | TINYINT(1) DEFAULT 1 | `boolean` | inline `boolean` |
| `created_at`/`updated_at` | DATETIME | — (not serialized) | — |
| `deleted_at` | DATETIME NULL | — | — |

---

## §2 — Detail Tables

### 2.1 DB `tables` — migration `003_tables.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(50) NOT NULL | e.g. "Bàn 01", "Bàn 10" |
| `qr_token` | CHAR(64) NOT NULL | random hex; the QR payload that resolves to this table |
| `capacity` | INT DEFAULT 4 | seats |
| `status` | ENUM(available, occupied, reserved, inactive) | live seating state |
| `is_active` | TINYINT(1) DEFAULT 1 | retired tables stay in DB |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft delete |

### 2.2 BE serializers — `table_handler.go`

- `ListTables` (GET /tables) → `{ id, name, capacity, status, is_active, qr_token }`.
- `createTableReq` (POST /tables) → input `{ name, capacity≥1 }`; response `{ id, qr_token }` (token generated server-side).

---

## §2.4 — Real object example (from the seed)

```jsonc
// DB — tables row
// id=22222222-…-000000000006 name="Bàn 06" capacity=4 status="available" is_active=1
// qr_token="f67890123456789af67890123456789af67890123456789af67890123456789a" (64 hex)

// BE→FE — GET /tables item (no timestamps)
{
  "id": "2222…0006", "name": "Bàn 06", "capacity": 4,
  "status": "available", "is_active": true,
  "qr_token": "f678…789a"
}
```

Seeded tables: Bàn 01–10, **all capacity 4** (there is no "Bàn VIP"). The demo orders in `seed.sql`
flip Bàn 01–03 to `occupied`.

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **No FE `Table` type** | `fe/src/types/` has no `Table` interface; admin/POS code consumes the `GET /tables` payload inline. `MonitorTableStatus` (`order.ts`) is a *different* derived shape for the live floor monitor, not this model. |
| 2 | **`qr_token` is sensitive** | It's the QR secret that authorizes guest ordering for the table — exposed on `GET /tables` (staff-only endpoint) and on create, but it should not leak to customers beyond their own scanned table. |
| 3 | **`status` driven by orders** | Don't set `status` ad hoc — it's flipped by the order lifecycle. See `docs/work_flow/STAFF_ORDER_FLOW.md`. |
