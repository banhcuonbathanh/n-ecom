# State Management

> **TL;DR** — Three layers, no mixing. Server data (products, orders) → TanStack Query.
> Cross-page client state (auth, cart, favourites) → Zustand. Single-component state →
> useState/local. Forms → RHF+Zod. URL filters → `searchParams`. Violation of these
> rules creates duplicate state, inconsistent UIs, and hard-to-debug sync bugs.

---

## The Decision Rule (memorize this)

| You need to... | Use | Never use |
|---|---|---|
| Fetch + cache data from the API | TanStack Query `useQuery` | `useState + useEffect + fetch` |
| Mutate server data and sync all subscribers | TanStack Query `useMutation + invalidateQueries` | manual `useState` refresh |
| Store auth token across pages | `useAuthStore` (Zustand, memory-only) | `localStorage`, cookies, Context |
| Share cart state across pages | `useCartStore` (Zustand, persist) | prop drilling, Context |
| Track UI state local to one component | `useState` | Zustand |
| Validate + submit a form | React Hook Form + Zod | `useState` per field |
| Filter state in URL (admin tables) | `useSearchParams` | Zustand |
| All API calls | `api-client.ts` | raw `fetch`, `axios.get()` directly |

---

## Layer 1 — TanStack Query (server state)

Global cache keyed by `queryKey`. All pages using the same key share the same cached data — zero duplicate requests.

**Default client config** (`fe/src/lib/providers.tsx`):
```ts
new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } })
```

**staleTime overrides:**
- Products, categories, combos: `5 * 60 * 1000` — matches BE Redis TTL
- Marketing spend, training guides: `5 * 60 * 1000`
- Staff tasks: `15_000` (near-live polling)
- Task stats: `30_000`

**Standard query hook pattern:**
```ts
const { data, isLoading, isError } = useQuery({
  queryKey: ['products', categoryId],
  queryFn:  () => api.get('/products', { params: { category_id: categoryId } }).then(r => r.data.data),
  staleTime: 5 * 60 * 1000,
  enabled:  !!categoryId,   // skip if no value
})
```

**Mutation + invalidation pattern:**
```ts
const mutation = useMutation({
  mutationFn: (payload) => api.post('/orders', payload).then(r => r.data.data),
  onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
})
// Every component subscribed to ['orders'] re-fetches automatically.
```

**Query key conventions:**

| Domain | Example key | Notes |
|---|---|---|
| Products | `['products', categoryId, searchQuery]` | `null` = all categories |
| Orders (live) | `['orders', 'live']` | patched in-place by `useOverviewWS` |
| Single order | `['orders', orderId]` | |
| Customer profile | `['customer', 'profile']` | |
| Training guides | `['training', 'guides', role]` | |
| Admin tasks | `['admin', 'tasks', staffId, date]` | |
| Marketing spend | `['marketing', 'spend', dateRange]` | |

---

## Layer 2 — Zustand (cross-page client state)

Module-level singletons. Import anywhere — same instance, no prop drilling.

### When to create a new store vs extend

**Extend an existing store** if the new state belongs to the same domain (e.g. add `orderNote` to cart store).

**Create a new store** if:
- The domain is unrelated (e.g. training UI ≠ cart)
- The persist config differs (e.g. must survive reload but others should not)
- The new file goes in `fe/src/store/` (top-level, not inside page folders)

### Persistence rules

All persistence uses `zustand/middleware`'s `persist()` with keys from `STORAGE_KEYS` — never raw string literals.

| Store | Persisted fields | Key |
|---|---|---|
| `useCartStore` | `orderNote`, `activeOrderId` only | `STORAGE_KEYS.CART_CONFIG` (`cart-config-v3`) |
| `useFavouritesStore` | full store | `STORAGE_KEYS.FAVOURITES` |
| `useSettingsStore` | full store | `STORAGE_KEYS.CUSTOMER_SETTINGS` |
| `useThemeStore` | full store | `'admin-theme'` (hardcoded — no STORAGE_KEYS entry yet) |
| `useAuthStore` | NONE — memory-only | — |

**Security rule:** Access tokens MUST NOT persist. `useAuthStore` has no `persist()` wrapper. On page reload, the app calls `GET /auth/me` — the httpOnly refresh cookie silently restores the session.

### Cart Store — worked example

```ts
// fe/src/store/cart.ts  — real implementation excerpt
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      activeOrderId: null,  // enables "Đặt thêm món" flow after first order
      orderNote: '',

      addItem: (item) => set((s) => {
        const existing = s.items.find(i => i.id === item.id)
        if (existing)
          return { items: s.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i) }
        return { items: [...s.items, item] }
      }),

      clearCart: () => set({ items: [], tableId: null, tableName: null,
                              activeOrderId: null, paymentMethod: null, orderNote: '' }),

      total:     () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: STORAGE_KEYS.CART_CONFIG,
      version: 5,
      // Only orderNote + activeOrderId survive reload — items are session-only.
      partialize: (s) => ({ orderNote: s.orderNote, activeOrderId: s.activeOrderId }),
    },
  ),
)
```

**`activeOrderId` flow:** set after a successful `POST /orders`. The "Đặt thêm món" (add-to-order) banner on the menu page reads this to offer `POST /orders/:id/items` instead of a new order.

---

## Layer 3 — React Hook Form + Zod (form state)

Stays inside the form component. Never stored globally.

```ts
const schema = z.object({
  customer_name:  z.string().min(1),
  customer_phone: z.string().regex(/^0\d{9}$/, 'SĐT không hợp lệ'),
  note:           z.string().optional(),
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
})
```

INVALID_INPUT errors from the BE map to RHF field errors:
```ts
err.response?.data?.details?.fields?.forEach(({ field, message }) =>
  setError(field as keyof FormValues, { message })
)
```

---

## SSE Events → Query Cache

SSE streams do NOT use TanStack Query directly. They update state in two ways:

1. **Local state** (`useOrderSSE`, `useOrderMonitorSSE`): SSE patches a `useState<Order>` via `setOrder`. No query cache involved.
2. **Shared query cache** (`useOverviewWS`): WS events call `queryClient.setQueryData(['orders', 'live'], updater)` — all subscribers of that query key see the update instantly without a network round-trip.

```ts
// useOverviewWS.ts — patches live orders in TanStack Query cache
queryClient.setQueryData<Order[]>(['orders', 'live'], prev =>
  prev?.map(o => o.id === msg.order_id ? { ...o, status: msg.status } : o) ?? []
)
```

---

## Deep Dive Sources

- `fe/src/store/cart.ts` — persist partialize + migration pattern
- `fe/src/features/auth/auth.store.ts` — memory-only auth
- `fe/src/hooks/useOverviewWS.ts` — SSE → TanStack Query cache update
- `fe/src/lib/providers.tsx` — QueryClient defaults
- This file is the in-handbook 3-layer state guide (server / client / form)
