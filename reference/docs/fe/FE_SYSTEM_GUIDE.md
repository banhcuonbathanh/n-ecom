# FE System Guide — Hệ Thống Quản Lý Quán Bánh Cuốn

> **Version:** v1.1 · 2026-05-10
> **Purpose:** Single self-contained manual for all Frontend work. Every FE session starts here.
> **Rule:** This file + the spec listed per epic = everything you need. Do NOT read all docs at once.

---

## 0 — Project Snapshot

**System:** QR ordering (customer mobile) + Kitchen Display System (chef tablet) + POS (cashier desktop) for a Vietnamese food stall.

**Stack:** Next.js 14 App Router · TypeScript strict · Tailwind CSS v3 · Zustand v4 · TanStack Query v5 · React Hook Form + Zod · Axios

**State ownership (strict, no exceptions):**

| Data type | Where it lives | Wrong alternative |
|---|---|---|
| Products, orders (server data) | TanStack Query (`useQuery`) | `useState` + `useEffect` + `fetch` |
| Auth token, cart (client state) | Zustand store | `localStorage` · `sessionStorage` · React Context |
| Form data | React Hook Form + Zod | `useState` for each field |
| API calls | `api-client.ts` only | raw `fetch` · direct `axios.get()` |
| Page auth guard | `AuthGuard` wrapping page | manual redirect in each page |
| Color values | Tailwind token names | hardcoded hex in className |
| Price display | `formatVND()` from `lib/utils.ts` | `.toLocaleString()` · manual string concat |

**Ports:** FE=3000 · BE=8080

---

## 1 — Big Tasks (Epics) — The 8-Step Build Plan

> Work in order. Each epic unlocks the next. FE-1 must be done before anything else.

| Epic | Name | Status | Depends on |
|---|---|---|---|
| **FE-1** | Foundation & Setup | ✅ COMPLETE | — |
| **FE-2** | Authentication UI | ✅ COMPLETE | — |
| **FE-3** | Menu & Product Catalog | ✅ COMPLETE | — |
| **FE-4** | Cart & Checkout | ✅ COMPLETE | — |
| **FE-5** | Order Tracking (SSE) | ✅ COMPLETE | — |
| **FE-6** | Kitchen Display (WebSocket) | ✅ COMPLETE | — |
| **FE-7** | POS & Payment UI | ✅ COMPLETE | — |
| **FE-8** | Testing & Polish | ⬜ NOT STARTED | FE-1 through FE-7 |

---

## 2 — Current Scaffold State

### ✅ Done — all files implemented

All FE files exist. Key locations:

| Path | What exists |
|---|---|
| `fe/src/lib/api-client.ts` | Axios instance · request interceptor (Bearer) · response interceptor (401→refresh→retry) |
| `fe/src/lib/utils.ts` | `cn()` · `formatVND()` |
| `fe/src/lib/providers.tsx` | QueryClient + QueryClientProvider wrapper |
| `fe/src/features/auth/` | auth.store.ts (Zustand) · auth.api.ts |
| `fe/src/store/cart.ts` | CartStore with activeOrderId field (see §8.5) |
| `fe/src/types/` | product.ts · order.ts · cart.ts · auth.ts · staff.ts |
| `fe/src/hooks/useOrderSSE.ts` | SSE hook with exponential backoff + localStorage cache |
| `fe/src/components/guards/` | AuthGuard.tsx · RoleGuard.tsx |
| `fe/src/components/menu/` | CategoryTabs · ProductCard · ToppingModal · ComboModal · CartDrawer |
| `fe/src/components/shared/` | StatusBadge · ConnectionErrorBanner · EmptyState |
| `fe/src/app/(auth)/login/` | Login page |
| `fe/src/app/(shop)/menu/` | Menu page |
| `fe/src/app/(shop)/checkout/` | Checkout page |
| `fe/src/app/(shop)/order/[id]/` | Order tracking page |
| `fe/src/app/(shop)/order/` | Order list page (reads localStorage cached orders) |
| `fe/src/app/table/[tableId]/` | QR entry page |
| `fe/src/app/(dashboard)/kds/` | KDS full-screen (WebSocket) |
| `fe/src/app/(dashboard)/pos/` | POS cashier page |
| `fe/src/app/(dashboard)/cashier/payment/[id]/` | Payment page |
| `fe/src/app/(dashboard)/admin/` | Admin layout + products/categories/toppings/staff/overview/marketing/summary/ingredients pages |
| `fe/src/features/admin/admin.api.ts` | All admin CRUD + analytics + stock movement API calls |

---

## 3 — Design Token Map (the complete reference)

> **Rule:** NEVER hardcode hex values in className. Use the semantic names below.

| Token | Tailwind class | Color value | Use case |
|---|---|---|---|
| Primary accent | `bg-primary` · `text-primary` · `border-primary` | `#FF7A1A` | Prices · badges · active states |
| Page background | `bg-background` | `#0A0F1E` | Dark page background |
| Card | `bg-card` | `#1F2937` | Cards · modals |
| Success | `bg-success` · `text-success` | `#3DB870` | Done status · success badges |
| Warning | `bg-warning` · `text-warning` | `#FCD34D` | Preparing status · KDS 10-20min |
| Urgent | `bg-urgent` · `text-urgent` | `#FC8181` | Cancelled · >20min KDS · out of stock |
| Foreground | `text-foreground` | `#F9FAFB` | Main text |
| Border | `border-border` | `#2D3748` | Dividers |
| Muted bg | `bg-muted` | `#374151` | Disabled · secondary areas |
| Muted text | `text-muted-fg` | `#9CA3AF` | Placeholders · secondary text |

**Typography:**
- Body: `font-body` (Be Vietnam Pro)
- Headings/logo: `font-display` (Playfair Display)

**Wrong vs Right:**
```tsx
// ❌ WRONG
<div className="bg-[#FF7A1A] text-[#9CA3AF]" />
<div className="bg-orange-500 text-gray-400" />

// ✅ CORRECT
<div className="bg-primary text-muted-fg" />
```

---

## 4 — TypeScript Conventions (strict — check before writing any interface)

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
  CASHIER:  3,
  MANAGER:  4,
  ADMIN:    5,
} as const
export type RoleValue = typeof Role[keyof typeof Role]
```

### item_status — DERIVE from qty_served, never a stored field

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
| `image_url` | `image_path` (relative — build full URL in component) |
| `price_delta` | `price` (on toppings) |
| `slug` | — does not exist |
| `id: number` | `id: string` |

### Image URL construction (never store full URL)

```ts
const imageUrl = product.image_path
  ? `${process.env.NEXT_PUBLIC_STORAGE_URL}/${product.image_path}`
  : '/placeholder.jpg'
```

---

## 5 — Auth & Token Rules

| Token | TTL | Storage | Never |
|---|---|---|---|
| Staff access token | 24h | Zustand memory only | localStorage · sessionStorage · cookie |
| Staff refresh token | 30d | httpOnly cookie (BE sets it) | FE never reads this |
| Guest JWT | 2h | Zustand memory only | localStorage |

**Key auth rules:**
- `withCredentials: true` on axios — browser auto-sends httpOnly refresh cookie
- On app mount or F5: call `GET /auth/me` — refresh cookie silently restores session
- Guest exception: if decoded token has `sub='guest'` → do NOT call `/auth/refresh` → redirect `/table/:tableId`
- Role values for guards: customer=1 · chef=2 · cashier=3 · manager=4 · admin=5

**Login → role redirect map:**
```ts
const redirectByRole: Record<string, string> = {
  chef:    '/kds',
  cashier: '/pos',
  staff:   '/pos',
  manager: '/dashboard',
  admin:   '/dashboard',
  customer: '/menu',
}
```

---

## 6 — Error Handling (interceptor pattern)

```ts
// lib/api-client.ts — interceptor switch
switch (error) {
  case 'TOKEN_EXPIRED':
    // Staff: auto-refresh (silent)
    // Guest (sub='guest'): redirect /table/:tableId — DO NOT refresh
    return refreshAndRetry(originalConfig)

  case 'MISSING_TOKEN':
  case 'ACCOUNT_DISABLED':
  case 'REFRESH_TOKEN_INVALID':
    clearAuth()
    router.push('/login')
    break

  case 'FORBIDDEN':
    toast.error('Không có quyền thực hiện hành động này')
    break

  case 'INVALID_INPUT':
    // If in form context: map details.fields → setError per field
    // Otherwise: toast
    toast.error(message ?? 'Dữ liệu không hợp lệ')
    break

  case 'TABLE_HAS_ACTIVE_ORDER':
    router.push(`/order/${details?.active_order_id}`)
    break

  case 'CANCEL_THRESHOLD':
    toast.error('Không thể huỷ đơn khi đã phục vụ hơn 30% món')
    break

  default:
    toast.error(message ?? 'Đã xảy ra lỗi')
}
```

**INVALID_INPUT field mapping (React Hook Form):**
```ts
const fields = err.response?.data?.details?.fields ?? []
fields.forEach(({ field, message }: { field: string, message: string }) =>
  setError(field as keyof FormValues, { message })
)
```

---

## 7 — Realtime Config (SSE + WebSocket)

```ts
// Shared reconnect config — use for BOTH SSE and WebSocket
const RECONNECT = {
  maxAttempts:    5,
  baseDelay:      1000,   // ms, doubles each retry (exponential backoff)
  maxDelay:       30000,  // ms cap
  showBannerAfter: 3,     // show ConnectionErrorBanner after 3 fails
}
```

**SSE auth:** `Authorization: Bearer <token>` header — use `@microsoft/fetch-event-source` (install in FE-5)

**WS auth:** `?token=<access_token>` query param — browser WS API cannot set custom headers

---

## 8 — Code Patterns (copy-paste ready)

### 8.1 — api-client.ts (complete)

```ts
// fe/src/lib/api-client.ts
import axios from 'axios'
import { useAuthStore } from '@/features/auth/auth.store'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true,  // auto-sends httpOnly refresh cookie
})

// Request: attach Bearer token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: handle 401 → refresh → retry
let isRefreshing = false
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      // Guest exception — do NOT refresh
      const token = useAuthStore.getState().accessToken
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.sub === 'guest') {
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
            return Promise.reject(err)
          }
        } catch { /* malformed token — fall through */ }
      }

      original._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { data } = await api.post('/auth/refresh')
          useAuthStore.getState().setAccessToken(data.data.access_token)
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

### 8.2 — auth.store.ts

```ts
// fe/src/features/auth/auth.store.ts
import { create } from 'zustand'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))
```

### 8.3 — providers.tsx

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
// fe/src/app/layout.tsx — wrap children in Providers
import { Providers } from '@/lib/providers'
// ...
<body className="font-body">
  <Providers>{children}</Providers>
</body>
```

### 8.4 — TanStack Query hook pattern

```ts
// Server state (products, orders) always goes through useQuery
const { data: products, isLoading } = useQuery({
  queryKey: ['products', selectedCategory],
  queryFn: () => api.get('/products', { params: { category_id: selectedCategory } })
              .then(r => r.data.data),
  staleTime: 5 * 60 * 1000,  // matches BE Redis TTL
})

// Mutations invalidate queries so all subscribers refresh
const mutation = useMutation({
  mutationFn: (input) => api.post('/orders', input).then(r => r.data.data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
})
```

### 8.5 — CartStore (Zustand)

```ts
// fe/src/store/cart.ts
import { create } from 'zustand'
import type { CartItem } from '@/types/cart'

interface CartState {
  items: CartItem[]
  tableId: string | null
  paymentMethod: string | null
  activeOrderId: string | null   // set after checkout, used by "Đặt thêm món" flow
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQty: (itemId: string, qty: number) => void
  clearCart: () => void
  setTableId: (id: string) => void
  setPaymentMethod: (method: string) => void
  setActiveOrderId: (id: string | null) => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  paymentMethod: null,
  activeOrderId: null,
  addItem: (item) => set((s) => {
    const existing = s.items.find(i =>
      i.product_id === item.product_id &&
      JSON.stringify(i.toppings) === JSON.stringify(item.toppings)
    )
    if (existing) {
      return { items: s.items.map(i => i === existing ? { ...i, quantity: i.quantity + item.quantity } : i) }
    }
    return { items: [...s.items, item] }
  }),
  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
  updateQty: (id, qty) => set((s) => ({
    items: s.items.map(i => i.id === id ? { ...i, quantity: qty } : i).filter(i => i.quantity > 0)
  })),
  clearCart: () => set({ items: [], tableId: null, paymentMethod: null, activeOrderId: null }),
  setTableId: (id) => set({ tableId: id }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setActiveOrderId: (id) => set({ activeOrderId: id }),
  total: () => get().items.reduce((sum, i) => {
    const toppingTotal = i.toppings?.reduce((t, tp) => t + tp.price * tp.quantity, 0) ?? 0
    return sum + (i.price + toppingTotal) * i.quantity
  }, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
```

### 8.6 — formatVND (add to utils.ts immediately)

```ts
// fe/src/lib/utils.ts — ADD this now, it's missing from scaffold
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}
// Output: "45.000 ₫"
```

### 8.7 — AuthGuard

```tsx
// fe/src/components/guards/AuthGuard.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/auth.store'
import { api } from '@/lib/api-client'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, setAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      api.get('/auth/me')
        .then(r => setAuth(r.data.data, useAuthStore.getState().accessToken!))
        .catch(() => router.push('/login'))
    }
  }, [])

  if (!user) return null  // or loading spinner
  return <>{children}</>
}
```

### 8.8 — RoleGuard

```tsx
// fe/src/components/guards/RoleGuard.tsx
'use client'
import { useAuthStore } from '@/features/auth/auth.store'
import { Role, type RoleValue } from '@/types/auth'

interface Props {
  minRole: RoleValue
  children: React.ReactNode
}

export function RoleGuard({ minRole, children }: Props) {
  const user = useAuthStore((s) => s.user)
  const roleValue = user ? Role[user.role.toUpperCase() as keyof typeof Role] ?? 0 : 0

  if (roleValue < minRole) {
    return <div className="text-urgent p-8 text-center">Không có quyền truy cập trang này</div>
  }
  return <>{children}</>
}
```

### 8.9 — useOrderSSE hook skeleton

```ts
// fe/src/hooks/useOrderSSE.ts
// Requires: npm install @microsoft/fetch-event-source
import { useEffect, useRef, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAuthStore } from '@/features/auth/auth.store'

const RECONNECT = { maxAttempts: 5, baseDelay: 1000, maxDelay: 30000, showBannerAfter: 3 }

export function useOrderSSE(orderId: string) {
  const [lastEvent, setLastEvent] = useState<any>(null)
  const [connectionError, setConnectionError] = useState(false)
  const attempts = useRef(0)
  const ctrl = useRef(new AbortController())

  function connect() {
    const token = useAuthStore.getState().accessToken
    fetchEventSource(`/api/v1/orders/${orderId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.current.signal,
      onmessage(ev) {
        if (!ev.data || ev.data === '') return  // heartbeat
        attempts.current = 0
        setConnectionError(false)
        setLastEvent({ type: ev.event, data: JSON.parse(ev.data) })
      },
      onerror() {
        attempts.current += 1
        if (attempts.current >= RECONNECT.showBannerAfter) setConnectionError(true)
        if (attempts.current >= RECONNECT.maxAttempts) throw new Error('max attempts')
        const delay = Math.min(RECONNECT.baseDelay * 2 ** attempts.current, RECONNECT.maxDelay)
        return delay  // fetchEventSource retries after this delay
      },
    })
  }

  useEffect(() => {
    connect()
    return () => ctrl.current.abort()
  }, [orderId])

  return { lastEvent, connectionError }
}
```

### 8.10 — Admin product list: use /products/all not /products

```ts
// ❌ WRONG — public endpoint filters is_available=true, admin sees incomplete list
const products = await api.get('/products')

// ✅ CORRECT — Manager+ endpoint returns all products including unavailable
const products = await api.get('/products/all')
```

Public `GET /products` filters `is_available=1`. Admin CRUD pages need `GET /products/all` (Manager+) to see and manage out-of-stock items.

### 8.11 — Tailwind JIT: rebuild FE image after adding pages/components

```bash
# After adding any new page or component with new Tailwind classes:
docker compose up -d --build fe
```

Tailwind JIT in production scans source files at **build time**, not runtime. Classes that don't exist in the image at build time are purged → invisible text / missing colors. This affects every new admin page added after the initial Docker build.

### 8.12 — PATCH not PUT for partial updates (match API_CONTRACT)

```ts
// ❌ WRONG — route registered as PUT on BE, but FE sends PATCH → 404
await api.patch(`/products/${id}`, data)  // if BE has PUT registered

// ✅ CORRECT — both sides use PATCH for partial updates
// FE: api.patch()
// BE: router.PATCH("/:id", handler)
```

Always verify HTTP method matches between `admin.api.ts` calls and BE route registrations. Use PATCH (not PUT) for partial updates per API_CONTRACT.

---

## 9 — Orders API: Critical Payload Rules

### POST /orders — what goes in body, what does NOT

```ts
// ✅ CORRECT POST /orders body
const payload = {
  table_id:       cartStore.tableId ?? undefined,
  source:         'qr',          // "qr" | "online" | "pos"
  note:           form.note,
  customer_name:  form.customer_name,
  customer_phone: form.customer_phone,
  items: cartStore.items.map(i => ({
    product_id: i.product_id,
    combo_id:   i.combo_id ?? undefined,
    quantity:   i.quantity,
    toppings:   i.toppings?.map(t => ({ topping_id: t.id, quantity: t.quantity })),
    note:       i.note,
  })),
}
// ❌ DO NOT include payment_method in the body
// payment_method is stored in CartStore only for UI display
```

### PATCH /orders/items/:id (chef serving items)

```ts
// Send qty_served only
const payload = { qty_served: newQtyServed }
// Response includes item_status (derived by BE): "pending" | "preparing" | "done"
```

### Cancel button visibility rule

```ts
const canCancel =
  totalServedPct < 30 &&
  order.status !== 'delivered' &&
  order.status !== 'cancelled'
```

---

## 10 — Epic-by-Epic Implementation Guide

### FE-1 — Foundation & Setup ← START HERE

**Goal:** Core plumbing that all other epics depend on. Do in this exact order.

**Read first:**
1. This file §5 (auth rules) · §8.1–8.3 (code patterns)
2. `docs/contract/API_CONTRACT_v1.2.md` §2 (auth endpoints)

**Files to create (in this order):**

1. **`fe/src/lib/api-client.ts`** — see §8.1
2. **`fe/src/types/auth.ts`** — User interface + Role enum
3. **`fe/src/features/auth/auth.store.ts`** — see §8.2
4. **`fe/src/features/auth/auth.api.ts`**:
   ```ts
   export const login = (username: string, password: string) =>
     api.post('/auth/login', { username, password }).then(r => r.data.data)

   export const logout = () =>
     api.post('/auth/logout').then(r => r.data)

   export const getMe = () =>
     api.get('/auth/me').then(r => r.data.data)

   export const refreshToken = () =>
     api.post('/auth/refresh').then(r => r.data.data)
   ```
5. **`fe/src/lib/providers.tsx`** — see §8.3
6. **`fe/src/app/layout.tsx`** — wrap children in `<Providers>`
7. **`fe/src/components/guards/AuthGuard.tsx`** — see §8.7
8. **`fe/src/components/guards/RoleGuard.tsx`** — see §8.8
9. **`fe/src/lib/utils.ts`** — add `formatVND()` — see §8.6

**Acceptance Criteria:**
- Token never in localStorage (check DevTools → Application → Local Storage → empty)
- F5 on a protected page → silent session restore (no flicker to login)
- 401 → interceptor auto-refreshes → retries original request
- 2nd 401 → clears store → redirects `/login`

---

### FE-2 — Authentication UI

**Goal:** Login page that handles all auth states gracefully.

**Read first:**
1. `docs/spec/Spec1_Auth_Updated_v2.md` — FE Auth Flow + State & Token sections
2. This file §5 (auth rules) · §6 (error handling)

**Files to create:**
- `fe/src/app/(auth)/login/page.tsx`

**Login page requirements:**
```tsx
// Zod schema
const schema = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự'),
  password: z.string().min(6, 'Tối thiểu 6 ký tự'),
})

// On submit:
// 1. login(username, password) → setAuth(user, access_token)
// 2. Redirect by role:
//    chef → /kds
//    cashier/staff → /pos
//    manager/admin → /dashboard
//    customer → /menu

// On INVALID_CREDENTIALS error:
// Show inline error below password field — NOT a toast
```

**Acceptance Criteria:**
- Wrong credentials → inline error under password field
- Correct login → redirect to role-appropriate page
- Already logged in → redirect away from /login

---

### FE-3 — Menu & Product Catalog

**Goal:** Menu page, product cards, category navigation, QR table entry.

**Read first:**
1. `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` §4 (Menu section)
2. `docs/contract/API_CONTRACT_v1.2.md` §3 (products endpoints)
3. `docs/spec/Spec_6_QR_POS.md` (QR Customer Flow)
4. This file §3 (design tokens) · §4 (TypeScript conventions)

**Files to create:**
- `fe/src/types/product.ts` — Topping · Product · ComboItem · Combo
- `fe/src/types/cart.ts` — CartItem
- `fe/src/store/cart.ts` — see §8.5
- `fe/src/components/menu/CategoryTabs.tsx` — sticky · horizontal scroll on mobile · `border-b-2 border-primary` for active
- `fe/src/components/menu/ProductCard.tsx` — image_path · name · formatVND(price) in orange · "+Thêm" · "Hết" badge
- `fe/src/components/menu/ToppingModal.tsx` — checkbox list · `+{price}₫` per topping · footer total
- `fe/src/components/menu/ComboModal.tsx` — combo image · items list · confirm
- `fe/src/components/menu/CartDrawer.tsx` — slide-in from right · qty stepper · total · "Thanh toán" → /checkout
- `fe/src/components/shared/EmptyState.tsx`
- `fe/src/app/(shop)/menu/page.tsx` — TanStack Query for products · CategoryTabs · ProductCard grid · CartDrawer
- `fe/src/app/table/[tableId]/page.tsx` — QR entry point

**QR table page flow:**
```ts
// fe/src/app/table/[tableId]/page.tsx
// 1. GET /tables/qr/:token → confirm table exists
// 2. POST /auth/guest { qr_token } → get guest access_token
// 3. useAuthStore.setAuth(guestUser, access_token)  ← NOT localStorage
// 4. cartStore.setTableId(table.id)
// 5. router.push('/menu')
```

**Critical rules:**
- `image_path` from API is relative — construct full URL: `${NEXT_PUBLIC_STORAGE_URL}/${product.image_path}`
- `price` field only — never `base_price`, `image_url`, `slug`
- CartStore is Zustand (client state) — NOT TanStack Query
- `staleTime: 5 * 60 * 1000` on product queries (matches BE Redis TTL)

---

### FE-4 — Cart & Checkout

**Goal:** Checkout form → POST /orders → redirect to order tracking.

**Read first:**
1. `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` §5 (Checkout section)
2. `docs/contract/API_CONTRACT_v1.2.md` §4 (POST /orders)
3. This file §9 (payload rules)

**Files to create:**
- `fe/src/types/order.ts` — Order · OrderItem · itemStatus derive function
- `fe/src/app/(shop)/checkout/page.tsx`

**Checkout page requirements:**
```tsx
// Guard: empty cart → redirect /menu
// Zod schema:
const schema = z.object({
  customer_name:  z.string().min(1),
  customer_phone: z.string().regex(/^0\d{9}$/, 'SĐT không hợp lệ'),
  note:           z.string().optional(),
  payment_method: z.enum(['cash', 'vnpay', 'momo', 'zalopay']),
})

// On submit:
// 1. cartStore.setPaymentMethod(form.payment_method)
// 2. POST /orders — body does NOT include payment_method (see §9)
// 3. cartStore.clearCart()
// 4. router.push(`/order/${response.id}`)
```

---

### FE-5 — Order Tracking (SSE)

**Goal:** Real-time order progress page using SSE.

**Read first:**
1. `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` §6 (Order Tracking)
2. `docs/contract/API_CONTRACT_v1.2.md` §4 SSE section
3. This file §7 (reconnect config) · §8.9 (SSE hook)

**Install first:**
```bash
cd fe && npm install @microsoft/fetch-event-source
```

**Files to create:**
- `fe/src/hooks/useOrderSSE.ts` — see §8.9
- `fe/src/components/shared/StatusBadge.tsx` — pending=muted · preparing=warning · done=success
- `fe/src/components/shared/ConnectionErrorBanner.tsx` — shows after 3 SSE failures
- `fe/src/app/(shop)/order/[id]/page.tsx`

**Order tracking page requirements:**
```tsx
// Progress bar: Math.round((totalServedQty / totalQty) * 100)
// Cancel button: show only if totalServedPct < 30 && status !== 'delivered' && !== 'cancelled'
// Before cancel: show confirm modal
// On cancel: DELETE /orders/:id → redirect /menu

// SSE events to handle:
// order_status_changed → update order.status
// item_progress → update individual item qty_served (re-derive item_status)
// order_completed → navigate to success state
```

**Critical rule:** SSE uses `Authorization: Bearer` header (via `@microsoft/fetch-event-source`) — NOT `?token=` query param.

---

### FE-6 — Kitchen Display System (WebSocket)

**Goal:** Full-screen KDS for chef tablet using WebSocket.

**Read first:**
1. `docs/spec/Spec_4_Orders_API.md` — FE KDS section
2. `docs/contract/API_CONTRACT_v1.2.md` §10.1 (WS events)
3. This file §3 (urgency colors) · §7 (reconnect config)

**Files to create:**
- `fe/src/hooks/useWebSocket.ts` — WS hook with exponential backoff
- `fe/src/app/(dashboard)/kds/page.tsx`
- `fe/src/app/(dashboard)/orders/live/page.tsx`

**KDS page requirements:**
```tsx
// Full-screen: bg-background (#0A0F1E)
// WS: ws://localhost:8080/api/v1/ws/kds?token=${accessToken}
// RoleGuard: minRole = Role.CHEF (2)

// Card colors by elapsed time:
// < 10 min  → bg-card (default)
// 10–20 min → border-warning border-2
// > 20 min OR flagged → border-urgent border-2

// Show sub-items only — NOT the combo header row
// Click item → PATCH /orders/items/:id { qty_served: current + 1 }
// Sound on new_order: Web Audio API (no external deps)
const audioCtx = new AudioContext()
// ... oscillator.start() → short beep
```

**WS connection:**
```ts
const token = useAuthStore.getState().accessToken
const ws = new WebSocket(`ws://localhost:8080/api/v1/ws/kds?token=${token}`)
// Same RECONNECT config as SSE — exponential backoff
```

---

### FE-7 — POS & Payment UI

**Goal:** Cashier point-of-sale screen + payment processing + receipt print.

**Read first:**
1. `docs/spec/Spec_5_Payment_Webhooks.md` — FE section
2. `docs/contract/API_CONTRACT_v1.2.md` §5 (payments)
3. This file §6 (error handling for TABLE_HAS_ACTIVE_ORDER)

**Files to create:**
- `fe/src/app/(dashboard)/pos/page.tsx`
- `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx`

**POS page requirements:**
```tsx
// 2-column layout: menu browse (left) + order summary (right)
// RoleGuard: minRole = Role.CASHIER (3)

// POST /orders with:
// customer_name: "Khách tại quán"
// customer_phone: "0000000000"
// source: "pos"

// Navigate to payment page when order.status = 'ready'
```

**Payment page requirements:**
```tsx
// Show: order total + QR image (from POST /payments response)
// Subscribe WS payment_success event
// On payment_success: toast → window.print() → router.push('/pos')
// COD button → immediate complete

// Print-only styles (inline — not in global CSS):
// @media print { .no-print { display: none } }
```

---

### FE-8 — Testing & Polish

**Goal:** Unit tests + E2E for critical flows + accessibility pass.

**Files to create:**
- `fe/src/store/cart.store.test.ts` — TestAddSameItem · TestRemoveItem · TestClearCart · TestTotal
- `fe/src/lib/utils.test.ts` — TestFormatVND · TestDeriveItemStatus
- E2E: login → QR scan → add to cart → checkout → track order

**Run tests:**
```bash
cd fe && npm test
npm run build  # must pass with zero errors
```

---

## 11 — Commands Reference

```bash
# Dev server
cd fe && npm run dev          # localhost:3000

# Type check
npm run typecheck

# Test
npm test
npm run test:e2e

# Build
npm run build

# Docker
docker compose up -d --build fe
docker compose logs -f fe
```

---

## 12 — What to Read for Each Session

> Open this file → find your epic → read ONLY the docs listed → implement.

| Starting task | Read first | Then read |
|---|---|---|
| api-client + stores | This file §5 + §8.1–8.3 | `Spec1_Auth_Updated_v2.md` FE sections |
| Login page | This file §5 + §6 | `Spec1_Auth_Updated_v2.md` |
| Menu page | This file §3 + §4 + §8.4–8.5 | `Spec_3_Menu_Checkout_UI_v2.md` §4 |
| Checkout | This file §9 | `Spec_3_Menu_Checkout_UI_v2.md` §5 |
| Order tracking | This file §7 + §8.9 | `Spec_3_Menu_Checkout_UI_v2.md` §6 |
| KDS | This file §3 + §7 | `Spec_4_Orders_API.md` FE KDS |
| POS + payments | This file §6 | `Spec_5_Payment_Webhooks.md` FE |
| QR table entry | This file §5 | `Spec_6_QR_POS.md` QR Customer Flow |
| Any endpoint | This file §4 (conventions) | `API_CONTRACT_v1.2.md` §(relevant) |
| Error handling | This file §6 | `ERROR_CONTRACT_v1.1.md` §4 |

---

*BanhCuon System · FE System Guide · v1.1 · 2026-05-10*
