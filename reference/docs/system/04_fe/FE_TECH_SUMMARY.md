# FE Tech Summary

> **TL;DR** — Next.js 14 App Router with TypeScript strict mode. Three user areas: (shop) for
> customers, (dashboard) for staff/admin, (auth) for login. Server state in TanStack Query,
> client state in Zustand, forms in RHF+Zod, all API calls through `lib/api-client.ts`.
> Folder conventions are enforced — hooks in `src/hooks/`, stores in `src/store/`, shared
> components in `src/components/shared/`, atoms in `src/components/ui/`.

---

## Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js App Router | 14 |
| Language | TypeScript strict | 5.x |
| Styling | Tailwind CSS | v3 |
| Global client state | Zustand | v4 |
| Server-state cache | TanStack Query | v5 |
| Forms | React Hook Form + Zod | latest |
| HTTP client | Axios via `lib/api-client.ts` | latest |
| Realtime (customer) | `@microsoft/fetch-event-source` (SSE) | latest |
| Realtime (staff) | Native WebSocket | — |
| Icons | lucide-react | latest |
| Toast | sonner | latest |

---

## App Router Structure

```
fe/src/app/
├── (auth)/
│   ├── login/page.tsx            ← staff login
│   └── register/page.tsx         ← staff register
├── (shop)/                       ← customer QR ordering area
│   ├── menu/page.tsx             ← product/combo browse + cart
│   ├── menu/product/[id]/        ← product detail
│   ├── menu/combo/[id]/          ← combo detail
│   ├── menu/favourites/          ← saved favourites list
│   ├── checkout/page.tsx         ← order form + submit
│   ├── order/[id]/page.tsx       ← per-order tracking (SSE)
│   ├── tracking/[id]/page.tsx    ← order-monitor SSE (alternate view)
│   └── profile/page.tsx          ← customer profile
├── (dashboard)/                  ← staff / admin area
│   ├── kds/page.tsx              ← Kitchen Display (WebSocket)
│   ├── pos/page.tsx              ← POS cashier
│   ├── cashier/payment/[id]/     ← payment page
│   ├── orders/live/              ← live order monitor
│   └── admin/
│       ├── overview/             ← live floor + waitlist
│       ├── products/             ← product CRUD
│       ├── categories/           ← category CRUD
│       ├── toppings/             ← topping CRUD
│       ├── combos/               ← combo CRUD
│       ├── ingredients/          ← ingredient CRUD
│       ├── staff/                ← staff CRUD
│       ├── summary/              ← revenue analytics
│       ├── marketing/            ← QR code marketing
│       ├── training/             ← staff training guides
│       └── todo-list/            ← staff task board
├── table/[tableId]/page.tsx      ← QR scan entry point (guest JWT)
├── welcome/page.tsx              ← landing
├── privacy-policy/ · terms/      ← static pages
└── api/dev/run/                  ← dev-only endpoint
```

---

## Folder Conventions (enforced — no exceptions)

| Location | What goes there |
|---|---|
| `fe/src/hooks/` | ALL shared hooks (useOrderSSE, useAdminSSE, useOverviewWS, useProductDetail, …). Never inside page folders. |
| `fe/src/store/` | ALL global Zustand stores (cart.ts, favourites.ts, settings.ts, theme.ts, …). Never inside page folders. |
| `fe/src/components/shared/` | Cross-page reusable components (StatusBadge, ConnectionErrorBanner, EmptyState, QuantityStepper, …) |
| `fe/src/components/ui/` | Atomic design-system primitives (Button, Card, Input, Label, Badge, ProgressBar) |
| `fe/src/components/guards/` | Auth/role enforcement wrappers (AuthGuard, RoleGuard) |
| `fe/src/features/auth/` | Auth store + auth API calls |
| `fe/src/features/menu/components/` | Menu-domain components (ProductCard, ComboCard, CartDrawer, …) |
| `fe/src/features/admin/` | Admin store, admin API, admin-specific components |
| `fe/src/lib/` | Utilities: api-client.ts, storage-keys.ts, order-payload.ts, providers.tsx, utils.ts |
| `fe/src/types/` | Shared TypeScript interfaces (product.ts, order.ts, cart.ts, auth.ts, …) |
| `fe/src/app/**/` | Page orchestrators only — no business logic inline |

---

## api-client Pattern

Single Axios instance. All API calls MUST use `api` from `lib/api-client.ts` — never raw `fetch` or direct `axios.get`.

- **Request interceptor:** reads `accessToken` from `useAuthStore`, attaches `Authorization: Bearer <token>`.
- **Response interceptor:** on 401 → silent token refresh (POST /auth/refresh via httpOnly cookie) → retry original. Guest tokens (`sub='guest'`) skip refresh and redirect to `/login`.
- `withCredentials: true` — browser auto-sends the httpOnly refresh cookie.

---

## Route Map by Area

### Client (customer QR flow)
| Route | Page |
|---|---|
| `/table/[tableId]` | QR entry — issues guest JWT, sets tableId in cart |
| `/menu` | Browse products/combos, manage cart |
| `/menu/product/[id]` | Product detail |
| `/checkout` | Order form and submit |
| `/order/[id]` | Real-time tracking (SSE) |
| `/tracking/[id]` | Extended order monitor (SSE + queue + table map) |

### Staff (dashboard)
| Route | Page |
|---|---|
| `/kds` | Kitchen Display System — WebSocket (Chef+) |
| `/pos` | POS cashier — browse + create orders (Cashier+) |
| `/cashier/payment/[id]` | Payment processing + QR print (Cashier+) |
| `/orders/live` | Live order list (Cashier+) |

### Admin (dashboard)
| Route | Page |
|---|---|
| `/admin/overview` | Live floor map + waiting queue + prep panel |
| `/admin/products` | Product CRUD |
| `/admin/categories` | Category management |
| `/admin/toppings` | Topping management |
| `/admin/combos` | Combo management |
| `/admin/ingredients` | Ingredient / storage management |
| `/admin/staff` | Staff CRUD |
| `/admin/summary` | Revenue summary + analytics |
| `/admin/marketing` | QR code generator |
| `/admin/training` | Staff training guides |
| `/admin/todo-list` | Staff task board |

---

## Deep Dive Sources

- `FE_CODE_SUMMARY.md` (same folder) — folder map + component inventory
- `../05_dev_guide/NEW_PAGE_GUIDE.md` — how to build a page that fits the system
- `fe/src/lib/api-client.ts` — actual interceptor implementation
- `fe/src/app/` — route tree (ground truth)
