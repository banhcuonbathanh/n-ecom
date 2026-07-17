# FE State Management & Cross-Page Data Sharing

> How data flows across pages, how state is shared, and how every session stays in sync.

---

## The 3-Layer Rule

**Never mix layers.** Each type of data has exactly one home.

| Layer | Tool | Owns |
|---|---|---|
| Server state | TanStack Query | Products, orders, menus — anything that lives in the DB |
| Client state | Zustand | Auth token, cart, UI state — browser-only data |
| Form state | React Hook Form + Zod | Local to one form, validated before submit |

---

## Layer 1 — Server State → TanStack Query

Data fetched from the API is cached globally by query key. Any page calling the same key shares the same cache — no duplicate requests.

```ts
// Page A fetches → cached under ['products']
// Page B calls same hook → served from cache, zero extra request
const { data } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
```

**Keeping pages in sync after mutations:**

```ts
// After creating an order, invalidate so every subscriber refetches
queryClient.invalidateQueries({ queryKey: ['orders'] })
```

All pages subscribed to `['orders']` auto-update. No manual coordination needed.

---

## Layer 2 — Client State → Zustand

Module-level singletons. Import anywhere, same instance — no prop drilling, no React context.

### Store locations

```
fe/features/auth/auth.store.ts      → { user, accessToken, setAuth, clearAuth }
fe/features/orders/orders.store.ts  → { items, tableId, paymentMethod, ... }
```

### Auth store shape

```ts
// fe/features/auth/auth.store.ts
interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}
```

### Security rule — token storage

| Storage | Status | Reason |
|---|---|---|
| `localStorage` | WRONG | XSS vulnerability — any injected script can read it |
| Zustand (in-memory) | CORRECT | Never touches the DOM, cleared on tab close |

**After page refresh (F5):** token is gone from memory. On mount, call `GET /auth/me` — the refresh token (httpOnly cookie) silently restores the session automatically.

```ts
// On app mount
useEffect(() => {
  authApi.getMe().then(user => useAuthStore.setState({ user }))
}, [])
```

---

## Layer 3 — Form State → React Hook Form + Zod

Stays local to the form component. Never stored globally.

```ts
const schema = z.object({
  customer_name: z.string().min(1),
  customer_phone: z.string().regex(/^0\d{9}$/),
  note: z.string().optional(),
})

const { register, handleSubmit } = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})
```

---

## The Glue — `api-client.ts`

Single axios instance used by every page. Auth is transparent — no page manages tokens manually.

```
fe/lib/api-client.ts
```

**Request interceptor** — reads token from Zustand, adds header:

```ts
config.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`
```

**Response interceptor** — on 401, refreshes silently then retries:

```ts
// 1. Call POST /auth/refresh (browser sends httpOnly cookie automatically)
// 2. Update Zustand store with new token
// 3. Retry original request with new token
// 4. If refresh also fails → clearAuth() → redirect /login
```

---

## Cross-Session Consistency — Document Chain

Every Claude session and every developer reads the same single sources. No re-deriving from code.

| Question | Source |
|---|---|
| API shapes (request / response) | `docs/contract/API_CONTRACT_v1.2.md` |
| DB field names | `docs/be/DB_SCHEMA_SUMMARY.md` |
| Error codes → toast messages | `docs/contract/ERROR_CONTRACT_v1.1.md` |
| Auth store shape + interceptor pattern | `docs/spec/Spec1_Auth_Updated_v2.md` §F2 |
| Design tokens (colors, fonts) | `docs/core/MASTER_v1.2.md` §2 |
| RBAC roles + guards | `docs/core/MASTER_v1.2.md` §3 |
| Realtime (SSE / WebSocket) | `docs/core/MASTER_v1.2.md` §5 |

---

## Guard Components

Shared auth enforcement — wrap pages, not individual components.

```
fe/components/guards/AuthGuard.tsx   → redirects to /login if no session
fe/components/guards/RoleGuard.tsx   → renders 403 if role_value < required
```

Usage:

```tsx
// Any staff page
<AuthGuard>
  <RoleGuard required={Role.CASHIER}>
    <PosPage />
  </RoleGuard>
</AuthGuard>
```

---

## Summary — Decision Table

| You need to... | Use |
|---|---|
| Fetch + cache server data | `useQuery` (TanStack Query) |
| Mutate server data + sync all pages | `useMutation` + `invalidateQueries` |
| Read/write auth token | `useAuthStore` (Zustand) |
| Read/write cart across pages | `useOrdersStore` (Zustand) |
| Validate + submit a form | React Hook Form + Zod |
| Make an API call | `api-client.ts` (never raw `fetch`/`axios`) |
| Protect a page by auth | `AuthGuard` |
| Protect a page by role | `RoleGuard` |
