# Object Model — Staff (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/types/staff.ts` (`Staff`, `StaffRole`, `ShiftSlot`) ·
> `be/internal/handler/staff_handler.go` (`toStaffJSON` / `toStaffDetailJSON`) ·
> migrations `001_auth.sql` (`staff`) + `013_staff_profile_fields.sql` (job_title, shifts, responsibilities).
>
> **Single home** for the Staff model (Rule #9). See [OBJECT_MODELS.md](OBJECT_MODELS.md).
> Data instances (seeded accounts) → [MENU_CATALOG.md §5](MENU_CATALOG.md). RBAC roles →
> `docs/core/MASTER_v1.2.md §3`.

```
READ:  staff MySQL → toStaffJSON (password_hash NEVER serialized) → GET /staff → Staff[] (TS)
WRITE: manager+ — POST/PATCH /staff
AUTH:  login verifies password_hash (bcrypt) → issues staff JWT; role drives RBAC
```

> **Security:** `password_hash` exists only in DB and is **never** put on the wire. `performance_score`
> is **not stored** — the BE hardcodes `0` in the serializer (placeholder).

---

## §1 — Comparison Matrix

Legend: `—` = absent at that layer · ⚠️ = mismatch, see [§3](#3--flags--known-mismatches).

| Attribute | DB `staff` | BE→FE JSON | FE `Staff` |
|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` |
| `username` | VARCHAR(50) NOT NULL | `string` | `string` |
| `password_hash` | VARCHAR(255) NOT NULL | — 🔒 **never serialized** | — |
| `full_name` | VARCHAR(100) NOT NULL | `string` | `string` |
| `role` | ENUM(customer,chef,cashier,staff,manager,admin) | `string` | `StaffRole` ⚠️ (no `customer`) |
| `job_title` | VARCHAR(100) NULL *(013)* | `string` — NULL→`""` | `string` |
| `shifts` | JSON NULL *(013)* | `string[]` (parsed) | `ShiftSlot[]` |
| `responsibilities` | TEXT NULL *(013)* | `string` — NULL→`""` | `string` |
| `phone` | VARCHAR(20) NULL | `string` — NULL→`""` ⚠️ | `string \| null` |
| `email` | VARCHAR(100) NULL | `string` — NULL→`""` ⚠️ | `string \| null` |
| `is_active` | TINYINT(1) DEFAULT 1 | `boolean` | `boolean` |
| `performance_score` | — (not stored) | `number` (hardcoded `0`) ⚠️ | `number` |
| `created_at` | DATETIME | `string` | `string` |
| `updated_at` | DATETIME | `string` — **detail only** | `string?` |
| `deleted_at` | DATETIME NULL | — | — |

---

## §2 — Detail Tables

### 2.1 DB `staff` — migrations `001_auth.sql` + `013_staff_profile_fields.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `username` | VARCHAR(50) | login id, unique |
| `password_hash` | VARCHAR(255) | bcrypt (cost 12). 🔒 never leaves the DB |
| `email` | VARCHAR(100) NULL | |
| `role` | ENUM | `customer` exists in the enum but is unused for real staff rows |
| `full_name` | VARCHAR(100) | |
| `job_title` | VARCHAR(100) NULL | added 013 — NULL for seeded staff |
| `shifts` | JSON NULL | added 013 — `["sang","chieu","toi"]` |
| `responsibilities` | TEXT NULL | added 013 |
| `phone` | VARCHAR(20) NULL | |
| `is_active` | TINYINT(1) DEFAULT 1 | |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft delete |

### 2.2 BE serializer — `toStaffJSON` (`staff_handler.go`)

Emits `{id, username, full_name, role, job_title, shifts[], responsibilities, phone, email, is_active,
performance_score, created_at}`. `toStaffDetailJSON` adds `updated_at`. `shifts` JSON string is parsed
to `[]string` (`unmarshalShifts`); empty → `[]`. **No `password_hash`, ever.**

### 2.3 FE types — `fe/src/types/staff.ts`

```ts
type StaffRole = 'chef' | 'cashier' | 'staff' | 'manager' | 'admin'
type ShiftSlot = 'sang' | 'chieu' | 'toi'

interface Staff {
  id:                string
  username:          string
  full_name:         string
  role:              StaffRole
  job_title:         string
  shifts:            ShiftSlot[]
  responsibilities:  string
  phone:             string | null
  email:             string | null
  is_active:         boolean
  performance_score: number
  created_at:        string
  updated_at?:       string
}
```

---

## §2.4 — Real object example (from the seed)

```jsonc
// DB — staff row (password_hash truncated)
// id=11111111-…-000000000003 username="chef1" password_hash="$2b$12$…"
// full_name="Lê Đầu Bếp" role="chef" phone="0901000003" email=NULL is_active=1
// job_title=NULL shifts=NULL responsibilities=NULL

// BE→FE — toStaffJSON (hash gone; NULLs → "" / []; score hardcoded 0)
{
  "id": "1111…0003", "username": "chef1", "full_name": "Lê Đầu Bếp",
  "role": "chef", "job_title": "", "shifts": [], "responsibilities": "",
  "phone": "0901000003", "email": "", "is_active": true,
  "performance_score": 0, "created_at": "2026-06-13T…"
}
```

Seed credentials: `admin/admin123` · `manager1/manager123` · `chef1/chef1234` · `cashier1/cashier123`.

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **`password_hash` write-only** | In DB, never serialized. Any code expecting it on the wire is wrong. |
| 2 | **`performance_score` is fake** | Not a DB column — BE hardcodes `0` in `toStaffJSON`. Treat as placeholder until a real metric lands. |
| 3 | **`role` enum wider than FE** | DB enum includes `customer`; FE `StaffRole` omits it (staff rows are never `customer`). |
| 4 | **Null convention** | BE coalesces `job_title`/`responsibilities`/`phone`/`email` NULL → `""`; FE types `phone`/`email` as `string \| null`. |
| 5 | **`updated_at` detail-only** | Present in `toStaffDetailJSON` (GET /staff/:id) but not in the list serializer — hence FE `updated_at?`. |
