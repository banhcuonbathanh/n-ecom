> **SUPERSEDED** — Use [`FE_SYSTEM_GUIDE.md`](FE_SYSTEM_GUIDE.md) as the primary FE reference. This file is kept for reference only.

---

# FE Documentation Index — Phase 5 Navigation Guide

> **Purpose:** Single navigation guide for all FE implementation work.
> Every Phase 5 task starts here: find your domain → read the listed docs → implement.
> **Last verified:** 2026-04-30

---

## 1 — Scaffold Status (What Exists Now)

### ✅ Complete — do not recreate

| File | Notes |
|---|---|
| `fe/src/app/layout.tsx` | Root layout, fonts (Playfair Display + Be Vietnam Pro), metadata. **Missing: providers wrapper — add in 5.1** |
| `fe/src/app/globals.css` | Design tokens as CSS vars, Tailwind base. Single source of truth for colors |
| `fe/tailwind.config.ts` | Custom color names mapped to CSS vars (`bg-primary`, `bg-card`, `text-primary`, etc.) |
| `fe/src/lib/utils.ts` | `cn()` helper. **`formatVND()` must be added — see §5** |
| `fe/src/components/ui/badge.tsx` | Badge component |
| `fe/src/components/ui/button.tsx` | Button component |
| `fe/src/components/ui/card.tsx` | Card component |
| `fe/src/components/ui/input.tsx` | Input component |
| `fe/src/components/ui/label.tsx` | Label component |
| `fe/package.json` | All deps installed: axios, @tanstack/react-query, zustand, react-hook-form, zod, lucide-react |

### ⚠️ Stub — file exists but is just a placeholder

| File | Stub Content | Phase to Complete |
|---|---|---|
| `fe/src/app/page.tsx` | redirect skeleton | 5.1 |
| `fe/src/app/(auth)/login/page.tsx` | TODO 5.1 | 5.1 |
| `fe/src/app/(shop)/menu/page.tsx` | TODO 5.2 | 5.2 |
| `fe/src/app/(shop)/checkout/page.tsx` | TODO 5.3 | 5.3 |
| `fe/src/app/(shop)/order/[id]/page.tsx` | TODO 5.3 | 5.3 |
| `fe/src/app/table/[tableId]/page.tsx` | TODO 5.2 | 5.2 |
| `fe/src/app/(dashboard)/kds/page.tsx` | TODO 5.4 | 5.4 |
| `fe/src/app/(dashboard)/pos/page.tsx` | TODO 5.5 | 5.5 |
| `fe/src/app/(dashboard)/orders/live/page.tsx` | TODO | 5.4 |
| `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` | TODO 5.5 | 5.5 |

### ⬜ Not yet created — Phase 5 will create these

```
fe/src/lib/api-client.ts                    ← axios instance + interceptors (5.1 FIRST)
fe/src/lib/providers.tsx                    ← QueryClientProvider wrapper (5.1)
fe/src/features/auth/auth.store.ts          ← Zustand auth store
fe/src/features/auth/auth.api.ts            ← login, logout, refreshToken, getMe
fe/src/features/orders/orders.store.ts      ← (if needed beyond cart)
fe/src/store/cart.ts                        ← CartStore: items, tableId, total
fe/src/types/product.ts                     ← Topping, Product, ComboItem, Combo
fe/src/types/order.ts                       ← Order, OrderItem, itemStatus derive fn
fe/src/types/cart.ts                        ← CartItem type
fe/src/types/auth.ts                        ← User, Role enum
fe/src/hooks/useOrderSSE.ts                 ← SSE order tracking hook (5.3)
fe/src/hooks/useWebSocket.ts                ← WS connection hook (5.4)
fe/src/components/guards/AuthGuard.tsx      ← Auth check → redirect /login
fe/src/components/guards/RoleGuard.tsx      ← Role check → 403 page
fe/src/components/menu/CategoryTabs.tsx
fe/src/components/menu/ProductCard.tsx
fe/src/components/menu/ToppingModal.tsx
fe/src/components/menu/ComboModal.tsx
fe/src/components/menu/CartDrawer.tsx
fe/src/components/shared/StatusBadge.tsx
fe/src/components/shared/ConnectionErrorBanner.tsx
fe/src/components/shared/EmptyState.tsx
```

---

## 2 — Reading Guide Per Domain

> **Rule:** Read only the listed docs for your domain in the listed order.

### 5.1 Auth Flow (⚠️ FIRST — everything depends on api-client.ts)

| What | File | Section |
|---|---|---|
| Auth endpoints (login, refresh, logout, me, guest) | `docs/contract/API_CONTRACT_v1.2.md` | §2 |
| Zustand store shape, interceptor pattern, guest exception | `docs/fe/FE_STATE_MANAGEMENT.md` | Layer 2, The Glue |
| Auth business flow, token storage rules | `docs/spec/Spec1_Auth_Updated_v2.md` | F1 FE Auth Flow · F2 State & Token |
| JWT TTLs, guest JWT (`sub='guest'`) | `docs/core/MASTER_v1.2.md` | §6 |
| 401 error codes → redirect behavior | `docs/contract/ERROR_CONTRACT_v1.1.md` | §4 FE Integration |
| Role values for RoleGuard | **See §4 of this doc** |

**Critical rules:**
- Access token: Zustand in-memory ONLY — `localStorage` is XSS-vulnerable and forbidden
- `withCredentials: true` on axios instance — browser auto-sends httpOnly refresh cookie
- Guest exception in interceptor: if decoded token has `sub='guest'` → do NOT call /auth/refresh → redirect `/table/:tableId` instead
- On app mount (or F5): call `GET /auth/me` — refresh cookie silently restores session
- `role_value` for RoleGuard: customer=1 · chef=2 · cashier/staff=3 · manager=4 · admin=5

**Files to create (in order):**
1. `fe/src/lib/api-client.ts` — interceptors first
2. `fe/src/features/auth/auth.store.ts` — Zustand store
3. `fe/src/features/auth/auth.api.ts` — API calls
4. `fe/src/lib/providers.tsx` — wrap layout
5. `fe/src/app/(auth)/login/page.tsx` — form
6. `fe/src/components/guards/AuthGuard.tsx` + `RoleGuard.tsx`

### 5.2 Menu & Cart

| What | File | Section |
|---|---|---|
| Product list, categories, combos endpoints | `docs/contract/API_CONTRACT_v1.2.md` | §3 |
| Menu layout, CartStore shape, ToppingModal, ComboModal | `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` | §4 Menu |
| Guest JWT flow for QR table page | `docs/contract/API_CONTRACT_v1.2.md` | §2 POST /auth/guest |
| QR page flow (scan → guest JWT → /menu) | `docs/spec/Spec_6_QR_POS.md` | QR Customer Flow |
| CartStore patterns (cross-page sharing) | `docs/fe/FE_STATE_MANAGEMENT.md` | Layer 2 |
| Design token classes | **See §3 of this doc** |

**Critical rules:**
- `image_path` comes from API (relative path). Construct full URL: `${NEXT_PUBLIC_STORAGE_URL}/${image_path}`
- `price` field only — never `base_price`, `price_delta`, `image_url`, `slug`
- CartStore lives in Zustand (NOT TanStack Query — it's client state, not server state)
- QR table page: store guest access_token in Zustand, NOT localStorage
- `staleTime: 5 * 60 * 1000` for products/categories — matches Redis TTL on BE

### 5.3 Checkout & Order Tracking (SSE)

| What | File | Section |
|---|---|---|
| POST /orders request body + response | `docs/contract/API_CONTRACT_v1.2.md` | §4 |
| SSE endpoint, event types, reconnect config | `docs/contract/API_CONTRACT_v1.2.md` | §4 SSE + §10.2 |
| Checkout form fields, order tracking layout | `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` | §5 Checkout · §6 Order Tracking |
| SSE auth method (Bearer header NOT query param) | `docs/core/MASTER_v1.2.md` | §5.2 |

**Critical rules:**
- POST /orders body does NOT include `payment_method` — it goes in cartStore only for UI, not in the API payload
- POST /orders body DOES include `source` field ("qr", "online", "pos")
- SSE uses `Authorization: Bearer` header (NOT `?token=` query param — that's only for WebSocket)
- `item_status` is DERIVED from `qty_served` — never stored: `0→pending, 0<x<qty→preparing, x=qty→done`
- Cancel button: show only if `totalServedPct < 30 && status !== 'delivered'`
- SSE exponential backoff: maxAttempts=5, base=1000ms, max=30000ms; show `ConnectionErrorBanner` after 3 fails

**SSE hook skeleton — see §5.2 of this doc**

### 5.4 KDS Screen (WebSocket)

| What | File | Section |
|---|---|---|
| WS event types, reconnect config | `docs/contract/API_CONTRACT_v1.2.md` | §10.1 |
| KDS layout, urgency color logic, item click behavior | `docs/spec/Spec_4_Orders_API.md` | FE KDS section |
| WS vs SSE auth method difference | `docs/core/MASTER_v1.2.md` | §5.1 |
| KDS color-code (urgency timing) | `docs/core/MASTER_v1.2.md` | §2 KDS |

**Critical rules:**
- WS auth: `?token=${accessToken}` query param (browser WS API cannot set custom headers)
- Show sub-items only on KDS cards — do NOT show the combo header row
- Urgency: <10min → default card, 10-20min → `border-warning`, >20min or flagged → `border-urgent`
- Sound alert on `new_order` event: Web Audio API (no external dep)
- Same WS_RECONNECT config as SSE: maxAttempts=5, base=1000ms, max=30000ms

### 5.5 POS & Payment UI

| What | File | Section |
|---|---|---|
| Payment endpoints + webhook shape | `docs/contract/API_CONTRACT_v1.2.md` | §5 |
| POS layout, cashier payment flow, QR/COD | `docs/spec/Spec_5_Payment_Webhooks.md` | FE section |
| WS `payment_success` event | `docs/contract/API_CONTRACT_v1.2.md` | §10.1 |

**Critical rules:**
- POS creates orders with `customer_name="Khách tại quán"`, `customer_phone="0000000000"`, `source="pos"`
- Payment page subscribes to WS `payment_success` event to know when to print + redirect
- Print: `@media print { .no-print { display: none } }` — inline in page, not global CSS
- RoleGuard: Cashier+ (role_value ≥ 3)

---

## 3 — Tailwind Token Map (the complete reference)

> **Rule:** NEVER hardcode hex values in className. The CSS vars are defined in `globals.css`.
> The `tailwind.config.ts` maps custom names → CSS vars. Use the names below.

| Token | Tailwind Class | Value | Use Case |
|---|---|---|---|
| Primary accent | `bg-primary` · `text-primary` · `border-primary` | `#FF7A1A` | Prices, badges, active borders |
| Background | `bg-background` | `#0A0F1E` | Page background (dark) |
| Card | `bg-card` | `#1F2937` | Cards, modals |
| Success | `bg-success` · `text-success` | `#3DB870` | Done status, success badges |
| Warning | `bg-warning` · `text-warning` | `#FCD34D` | Preparing status, alert |
| Urgent | `bg-urgent` · `text-urgent` | `#FC8181` | Cancelled, out-of-stock, >20min KDS |
| Foreground | `text-foreground` | `#F9FAFB` | Main text |
| Border | `border-border` | `#2D3748` | Dividers |
| Muted bg | `bg-muted` | `#374151` | Disabled, secondary areas |
| Muted text | `text-muted-fg` | `#9CA3AF` | Placeholder, secondary text |
| Glow | `glow-primary` (utility) | — | Accent glow effect |
| Hero gradient | `gradient-hero` (utility) | — | Landing hero bg |

**Typography:**
- Body text: `font-body` (Be Vietnam Pro)
- Headings/logo: `font-display` (Playfair Display)

**WRONG → RIGHT examples:**
```tsx
// ❌ WRONG — hardcoded hex
<div className="bg-[#FF7A1A] text-[#9CA3AF]" />
// ❌ WRONG — generic Tailwind (not from config)
<div className="bg-orange-500 text-gray-400" />

// ✅ CORRECT — use semantic token names
<div className="bg-primary text-muted-fg" />
```

---

## 4 — TypeScript Conventions

### All IDs are `string` (UUID), never `number`

```ts
// ❌ WRONG
interface Product { id: number }
// ✅ CORRECT
interface Product { id: string }  // "550e8400-e29b-41d4-a716-446655440000"
```

### Role enum

```ts
// fe/src/types/auth.ts
export const Role = {
  CUSTOMER: 1,
  CHEF:     2,
  CASHIER:  3,   // same as STAFF
  MANAGER:  4,
  ADMIN:    5,
} as const
export type RoleValue = typeof Role[keyof typeof Role]
```

### item_status derive function (DO NOT add DB column)

```ts
// fe/src/types/order.ts
export type ItemStatus = 'pending' | 'preparing' | 'done'

export function deriveItemStatus(qty_served: number, quantity: number): ItemStatus {
  if (qty_served === 0) return 'pending'
  if (qty_served >= quantity) return 'done'
  return 'preparing'
}
```

### Product field names (match BE response exactly)

| Wrong | Correct |
|---|---|
| `base_price` | `price` |
| `image_url` | `image_path` (relative; build full URL in component) |
| `price_delta` | `price` (on toppings) |
| `slug` | — (does not exist) |
| `id: number` | `id: string` |

### Image URL construction

```ts
// Never store full URL. Construct at render time:
const imageUrl = product.image_path
  ? `${process.env.NEXT_PUBLIC_STORAGE_URL}/${product.image_path}`
  : '/placeholder.jpg'
```

---

## 5 — Code Patterns

### 5.1 — Providers Wrapper (add to layout.tsx in task 5.1)

```tsx
// fe/src/lib/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

```tsx
// fe/src/app/layout.tsx — wrap children
import { Providers } from '@/lib/providers'
// ...
<body className="font-body">
  <Providers>{children}</Providers>
</body>
```

### 5.2 — SSE Hook Skeleton (useOrderSSE)

```ts
// fe/src/hooks/useOrderSSE.ts
'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/auth.store'

const WS_RECONNECT = { maxAttempts: 5, baseDelay: 1000, maxDelay: 30000 }

export function useOrderSSE(orderId: string) {
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  const [failCount, setFailCount] = useState(0)
  const [connectionError, setConnectionError] = useState(false)
  const es = useRef<EventSource | null>(null)
  const attempts = useRef(0)

  function connect() {
    const token = useAuthStore.getState().accessToken
    // SSE uses Authorization header — NOT query param
    const eventSource = new EventSource(
      `/api/v1/orders/${orderId}/events`,
      // Note: EventSource doesn't support custom headers natively.
      // Use a fetch-based SSE polyfill, OR proxy via Next.js API route.
      // Simple approach: pass token in a session cookie (httpOnly).
      // Spec-correct approach: use @microsoft/fetch-event-source
    )

    eventSource.addEventListener('order_status_changed', (e) => {
      setLastEvent({ type: 'order_status_changed', data: JSON.parse(e.data) })
    })
    eventSource.addEventListener('item_progress', (e) => {
      setLastEvent({ type: 'item_progress', data: JSON.parse(e.data) })
    })
    eventSource.addEventListener('order_completed', (e) => {
      setLastEvent({ type: 'order_completed', data: JSON.parse(e.data) })
    })
    eventSource.onerror = () => {
      eventSource.close()
      attempts.current += 1
      setFailCount(attempts.current)
      if (attempts.current >= 3) setConnectionError(true)
      if (attempts.current < WS_RECONNECT.maxAttempts) {
        const delay = Math.min(WS_RECONNECT.baseDelay * 2 ** attempts.current, WS_RECONNECT.maxDelay)
        setTimeout(connect, delay)
      }
    }
    es.current = eventSource
  }

  useEffect(() => { connect(); return () => es.current?.close() }, [orderId])

  return { lastEvent, connectionError, failCount }
}
```

> ⚠️ `EventSource` doesn't support custom headers. Use `@microsoft/fetch-event-source` package for proper Bearer auth. Add it to package.json in task 5.3.

### 5.3 — TanStack Query Hook Pattern

```ts
// fe/src/features/products/products.api.ts
import { api } from '@/lib/api-client'
import { Product } from '@/types/product'

export const fetchProducts = (categoryId?: string) =>
  api.get<{ data: Product[] }>('/products', {
    params: categoryId ? { category_id: categoryId } : undefined,
  }).then(r => r.data.data)

// fe/src/app/(shop)/menu/page.tsx
const { data: products, isLoading } = useQuery({
  queryKey: ['products', selectedCategory],
  queryFn: () => fetchProducts(selectedCategory),
  staleTime: 5 * 60 * 1000,  // matches Redis TTL
})

// After mutation — invalidate so all subscribers refresh
const mutation = useMutation({ mutationFn: createOrder,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
})
```

### 5.4 — Zustand Store Pattern

```ts
// fe/src/features/auth/auth.store.ts
import { create } from 'zustand'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))
```

### 5.5 — api-client.ts Pattern

```ts
// fe/src/lib/api-client.ts
import axios from 'axios'
import { useAuthStore } from '@/features/auth/auth.store'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true,  // sends httpOnly refresh cookie automatically
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      // Guest token exception — do NOT refresh, redirect to QR scan
      const token = useAuthStore.getState().accessToken
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.sub === 'guest') {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
          return Promise.reject(err)
        }
      }

      original._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { data } = await api.post('/auth/refresh')
          useAuthStore.getState().setAuth(
            useAuthStore.getState().user!,
            data.data.access_token
          )
        } catch {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
          return Promise.reject(err)
        } finally { isRefreshing = false }
      }
      return api(original)
    }
    return Promise.reject(err)
  }
)
```

### 5.6 — formatVND (add to utils.ts NOW — missing from scaffold)

```ts
// fe/src/lib/utils.ts — ADD this function
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}
// Output: "45.000 ₫"
```

---

## 6 — Layer Rules (Strict)

| Data Type | Where It Lives | Wrong Alternative |
|---|---|---|
| Products, orders (server data) | TanStack Query (`useQuery`) | `useState` + `useEffect` + `fetch` |
| Auth token, cart (client state) | Zustand store | `localStorage`, `sessionStorage`, React Context |
| Form data | React Hook Form + Zod | `useState` for each field |
| API calls | `api-client.ts` only | raw `fetch`, direct `axios.get()` |
| Page auth protection | `AuthGuard` wrapping page | manual redirect in each page |
| Color values | Tailwind token names | hardcoded hex in className |
| Price display | `formatVND()` from `lib/utils.ts` | `.toLocaleString()`, manual string concat |

---

## 7 — Missing Package (Add in 5.3)

The standard `EventSource` API doesn't support custom headers, so `Authorization: Bearer` cannot be sent. Install:

```bash
npm install @microsoft/fetch-event-source
```

Use in `useOrderSSE.ts`:
```ts
import { fetchEventSource } from '@microsoft/fetch-event-source'
// then call fetchEventSource('/api/v1/orders/:id/events', {
//   headers: { Authorization: `Bearer ${token}` },
//   onmessage(ev) { ... },
//   onerror(err) { ... retry logic ... }
// })
```

---

*BanhCuon System · FE Documentation Index · v1.0 · 2026-04-30*
