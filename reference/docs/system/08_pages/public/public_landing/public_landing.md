# Public Landing — `/`

> **TL;DR:** ✅ implemented · public (no auth required) · Marketing/demo landing page for the
> whole system. Feature tour + quick entry points: admin dashboard, staff quick-login panel, and
> one-click table QR shortcuts (including "Giả lập khách" which runs a 4-step guest-order demo
> flow). Desktop-oriented; mostly static content. No loading spinner — all sections are statically
> rendered (no `loading.tsx`). BE view (endpoints, auth) → [public_landing_be.md](public_landing_be.md)

---

## ASCII Wireframe

Traced from `fe/src/app/page.tsx` (full file) · `fe/src/app/StaffQuickLogin.tsx` · `fe/src/app/TableGrid.tsx` · `fe/src/components/shared/DevPanel.tsx`.

```
┌──────────────────────────────────────────────────────────────┐
│ [🍴] Bánh Cuốn POS        Tính Năng · Cách Dùng [Dashboard]  │ ← Navbar (sticky, z-50)
├──────────────────────────────────────────────────────────────┤
│ ▒▒ DevPanel (amber/5 bg strip) — Seed DB · Build BE · FE ▒▒  │ ← DevPanel
├──────────────────────────────────────────────────────────────┤
│                    HERO (gradient-hero)                       │
│       Quản Lý Quán Thông Minh — Không Cần Cài App            │
│   [ Vào Admin Dashboard ]   [ Thử Menu Khách ]               │
│   <1s đơn đến bếp · 8–15 phút · 99.9% · 0 app   ← stats     │
├──────────────────────────────────────────────────────────────┤
│        StaffQuickLogin (Đăng Nhập Nhanh section)             │
│  [Admin] [Manager] [Cashier] [Chef] [Staff]  (5 buttons)     │
├──────────────────────────────────────────────────────────────┤
│ Demo Nhanh — Chọn Bàn Để Xem Menu                            │
│ ┌────────┐ ┌────────┐ ┌────────┐ … 11 table cards total      │
│ │Bàn 01  │ │Bàn 02  │ │Bàn VIP │   (TableGrid)               │
│ [Giả lập]  [Giả lập]  [Giả lập]  ← SimulateBtn per card     │
├──────────────────────────────────────────────────────────────┤
│ #features — 6 feature cards (QR · KDS · POS · Admin · …)     │
├──────────────────────────────────────────────────────────────┤
│ #how-it-works — 4 steps 01→04                                │
├──────────────────────────────────────────────────────────────┤
│ Vai Trò — 4 role cards (Admin/Manager/Cashier/Chef)          │
├──────────────────────────────────────────────────────────────┤
│ CTA — Sẵn Sàng Chạy? [Vào Admin Dashboard] [Xem Demo Khách]  │
├──────────────────────────────────────────────────────────────┤
│ Footer — Admin · Demo Khách · Đăng Nhập                      │
└──────────────────────────────────────────────────────────────┘
```

## Zones

| Zone | Component / Source | Data source |
|---|---|---|
| Navbar | inline JSX `page.tsx:78-99` | static; links to `#features`, `#how-it-works`, `/admin` |
| DevPanel | `components/shared/DevPanel` (`page.tsx:104`) | Next.js route `POST /api/dev/run` (NOT the Go BE) |
| Hero | inline JSX `page.tsx:108-158` | `stats[]` static array `page.tsx:67-72`; CTA links `/admin` + `/table/1` |
| StaffQuickLogin | `app/StaffQuickLogin` (`page.tsx:161`) | `POST /auth/login` via `features/auth/auth.api` → `StaffQuickLogin.tsx:34` |
| TableGrid | `app/TableGrid` (`page.tsx:173`) | `tables[]` static array `page.tsx:46-58`; links `/table/:token` |
| SimulateBtn (per card) | `app/TableGrid` — `SimulateBtn` inline component `TableGrid.tsx:22-136` | 4-step async chain: `POST /auth/guest` → `GET /products` + `GET /combos` → `POST /orders` |
| Features | inline JSX `page.tsx:177-203` | `features[]` static array `page.tsx:13-44` (6 cards) |
| How-it-works | inline JSX `page.tsx:205-229` | `steps[]` static array `page.tsx:60-65` (4 steps) |
| Roles | inline JSX `page.tsx:231-286` | hardcoded inline role data (4 cards: Admin/Manager/Cashier/Chef) |
| CTA | inline JSX `page.tsx:288-312` | static; links `/admin` + `/table/1` |
| Footer | inline JSX `page.tsx:314-330` | static; links `/admin`, `/table/1`, `/auth/login` |

## Key Interactions

- Click **Vào Admin Dashboard** (Navbar, Hero, CTA, Footer) → `/admin` (Next.js `Link`; BE
  redirects to `/admin/overview` if not authenticated; requires staff JWT in auth store).
  Source: `page.tsx:95`, `page.tsx:129`, `page.tsx:299`, `page.tsx:325`.

- Click a **table card** in TableGrid → Next.js `Link` to `/table/:token` (starts the guest QR
  flow — no BE call from this page; the `table/[token]` page handles `POST /auth/guest`).
  Source: `TableGrid.tsx:143-147`.

- Click **Giả lập khách** button (SimulateBtn, one per table card) → 5-state machine (idle →
  loading → done / error) running a 4-step BE chain without any user interaction:
  1. `POST /auth/guest` with `qr_token` extracted from the table href — obtains `access_token` +
     `tableInfo` (`TableGrid.tsx:37-38`).
  2. `GET /products?is_available=true` + `GET /combos` fired in parallel with the guest JWT
     (`TableGrid.tsx:44-47`).
  3. Pick 2–4 random products + 0–1 random combo; build `items[]` array (`TableGrid.tsx:59-75`).
  4. `POST /orders` with `source: 'qr'`, a random `customer_name` from `NAMES[]`, and
     `table_id: tableInfo.id` (`TableGrid.tsx:80-87`).
  On success: writes guest user + token to `useAuthStore`, sets `tableId`/`tableName` in
  `useCartStore`, then `router.push('/order/:id')` after 800 ms (`TableGrid.tsx:92-103`).
  On `TABLE_HAS_ACTIVE_ORDER` error: redirects to the existing `/order/:activeId` instead of
  failing (`TableGrid.tsx:107-112`).
  Full BE endpoint detail → [public_landing_be.md](public_landing_be.md).

- **StaffQuickLogin** buttons (5 roles) → calls `login(username, 'Admin@123')` (`StaffQuickLogin.tsx:34`)
  → writes `user` + `access_token` to `useAuthStore` → `router.push(redirect)`:
  - admin → `/admin`, manager → `/admin`, cashier → `/pos`, chef → `/kds`, staff → `/admin`
  (`StaffQuickLogin.tsx:8-14`).

- **DevPanel** buttons — Seed DB / Build BE / Build FE → `POST /api/dev/run` (Next.js API route,
  not the Go BE) with `{ cmd: "seed" | "build-be" | "build-fe" }` (`DevPanel.tsx:30-34`).
  Output is streamed back and shown in a collapsible `<pre>` block.

- Click **Thử Menu Khách** / **Xem Demo Khách** → `/table/1` (a static shortcut; token `1` may
  not match any real seeded QR token — `❓ UNVERIFIED` whether BE resolves it or 404s).
  Source: `page.tsx:135`, `page.tsx:305`.

## Business Logic Used

- Guest session bootstrap (`POST /auth/guest` + QR token validation) →
  [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) §5 JWT / Auth Rules
- Role → redirect-after-login mapping →
  [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) §1 RBAC / role hierarchy
- One active order per table (SimulateBtn catches `TABLE_HAS_ACTIVE_ORDER` and redirects) →
  [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) §2.3
- FE auth store + role-redirect implementation →
  [../../../07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) (auth store,
  role redirect)

---

## Object Model — Landing Page (FE shapes)

> Scope: the FE-local shapes this page **owns or writes**. The full Order object written by
> SimulateBtn → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md).
> Product + Combo shapes fetched by SimulateBtn are documented in
> [../../../02_spec/object/OBJECT_MODEL_PRODUCT.md](../../../02_spec/object/OBJECT_MODEL_PRODUCT.md)
> and [../../../02_spec/object/OBJECT_MODEL_COMBO.md](../../../02_spec/object/OBJECT_MODEL_COMBO.md).

### §1 — Table (static config, FE only)

Defined in `page.tsx:46-58` — passed as a prop to `TableGrid`. Not persisted or fetched.

| Field | Type | Value source |
|---|---|---|
| `label` | `string` | Display name, e.g. `"Bàn 01"`, `"Bàn VIP"` |
| `href` | `string` | Full path `/table/<64-char-hex-token>` or shorter token |

There are **11 table entries** on this branch (`page.tsx:47-58`): Bàn 01–05, Bàn VIP (original
tokens), and Bàn 01–05 (mới) with newer tokens.

### §2 — SimulateBtn state machine (FE only)

Inline in `TableGrid.tsx:27-28`. Not stored in Zustand — local `useState`.

| State | Meaning |
|---|---|
| `idle` | Default; button shows "Giả lập khách" |
| `loading` | Async chain running; button disabled, shows spinner + progress message |
| `done` | Order placed (or active order found); redirecting in 800 ms |
| `error` | Chain failed (non-`TABLE_HAS_ACTIVE_ORDER` error); auto-resets to `idle` after 3 s |

Progress messages cycle through: `"Đang quét QR..."` → `"Đang tải thực đơn..."` →
`"Đang chọn món ngẫu nhiên..."` → `"Đang đặt hàng..."` → `"✓ Đặt N món — đang chuyển trang..."`
(`TableGrid.tsx:35-102`).

### §3 — DevPanel command keys (FE only)

Defined in `DevPanel.tsx:10-13`. Commands map to shell ops executed server-side via the Next.js
API route — not the Go BE.

| Key | Label | Shell command |
|---|---|---|
| `seed` | Seed DB | `go run ./be/cmd/seed/main.go` |
| `build-be` | Build BE | `docker compose up -d --build be` |
| `build-fe` | Build FE | `docker compose up -d --build fe` |

### §4 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **`/table/1` shortcut may 404** | Hero CTA "Thử Menu Khách" and Footer "Demo Khách" both link to `/table/1` (`page.tsx:135`, `page.tsx:305`). The token `1` is not in the `tables[]` array (which uses 64-char hex tokens). Whether the BE accepts `1` as a valid QR token or returns an error is `❓ UNVERIFIED`. |
| 2 | **SimulateBtn uses raw `axios`, not `api-client`** | `TableGrid.tsx:5` imports `axios` directly. `fe/src/lib/api-client.ts` is the project-standard axios instance with interceptors; SimulateBtn bypasses it. Functionally equivalent but misses any future interceptor logic. |
| 3 | **`items[]` in SimulateBtn built inline** | `TableGrid.tsx:62-75` builds the order items array inline rather than via `buildOrderItemsPayload()` (`lib/order-payload.ts`), which is the project-mandated single builder. This means SimulateBtn does not apply filling / combo overrides from cart state (no cart involved here), but it is a structural deviation from the pattern. |
| 4 | **`customer_phone` always `''`** | `TableGrid.tsx:82` hard-codes `customer_phone: ''` in every simulated order. |
| 5 | **`11 tables` vs ASCII wireframe** | The current ASCII wireframe above shows 6 table slots. `page.tsx:46-58` actually defines 11 entries (5 originals + Bàn VIP + 5 "mới"). The wireframe is schematic, not exhaustive. |

---

## Cross-links (siblings in this folder)

- BE endpoint detail → [public_landing_be.md](public_landing_be.md)
- Cross-page data flow → [public_landing_crosspage_dataflow.md](public_landing_crosspage_dataflow.md)
- Loading states → [public_landing_loading.md](public_landing_loading.md)
- Demo scenario → [SCENARIO_LANDING_DEMO.md](SCENARIO_LANDING_DEMO.md)
- Known bugs → [LANDING_BUGS.md](LANDING_BUGS.md)
- Order object (SimulateBtn output) → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md)
- RBAC / role-redirect rules → [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md)
