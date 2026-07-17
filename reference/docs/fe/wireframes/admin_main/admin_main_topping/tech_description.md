## Technical Architecture — Admin — Topping

### Page Structure
- Zones: A (AdminNav sticky), B (PageHeader), C (ToppingTable), D (ToppingFormModal overlay)
- Device target: desktop (960px+ primary; tablet acceptable with horizontal scroll on table)
- Sticky zones: Zone A (top-0 z-50)
- Modals: 1 — Zone D `ToppingFormModal` (shared for add + edit, title changes)

---

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard` |
| **Allowed roles** | Manager · Admin |
| **Auth state used** | `useAuthStore.user.role` |
| **Conditional UI by role** | Delete button (`[x]`) hidden for Manager if business rule requires Admin-only delete — confirm with owner |
| **Unauthorized redirect** | `/login` (via `AuthGuard`) |

---

### Tech Stack

```
React (Next.js App Router)
├── State: Zustand (useAuthStore) — page access guard only
├── Data: TanStack Query (['admin', 'toppings']) — staleTime 60s
├── Forms: RHF + Zod (ToppingFormModal)
├── Styling: Tailwind CSS (desktop layout, sticky nav)
└── Types: TypeScript interfaces for Topping + ToppingFormValues
```

---

### Key Implementation Patterns

**1. Component Architecture**

```
app/admin/toppings/
├── page.tsx                         ← RSC: ISR + HydrationBoundary
└── components/
    ├── ToppingsPageClient.tsx        ← 'use client'; modal state + query
    ├── ToppingPageHeader.tsx         ← title + count + CTA
    ├── ToppingTable.tsx              ← table rows + action buttons
    └── ToppingFormModal.tsx          ← RHF form, add/edit mode

hooks/
└── useToppingQueries.ts             ← useToppings, useCreateTopping, useUpdateTopping, useDeleteTopping

src/store/auth.ts                    ← useAuthStore (existing, shared)
```

**2. State Management**

```typescript
// ToppingsPageClient.tsx — local state only (no Zustand needed)
const [addModalOpen, setAddModalOpen] = useState(false)
const [editTopping, setEditTopping] = useState<Topping | null>(null)

const isModalOpen = addModalOpen || editTopping !== null
const modalMode = addModalOpen ? 'add' : 'edit'
```

**3. Data Fetching**

```typescript
// hooks/useToppingQueries.ts
export function useToppings() {
  return useQuery({
    queryKey: ['admin', 'toppings'],
    queryFn: () => apiFetch('/api/v1/admin/toppings'),
    staleTime: 60_000,
  })
}
```

Query key `['admin', 'toppings']` is already registered in `_INDEX_STATE_MANAGEMENT.md`. It is also read by Admin — Products (topping checkbox list in ProductFormModal). Mutations here will invalidate that shared cache — this is intentional.

**4. Form (RHF + Zod)**

```typescript
// ToppingFormModal.tsx
const form = useForm<ToppingFormValues>({
  resolver: zodResolver(toppingSchema),
  defaultValues: topping
    ? { name: topping.name, extraPrice: topping.extraPrice, isAvailable: topping.isAvailable }
    : { name: '', extraPrice: 0, isAvailable: true },
})

// Reset when modal closes or topping changes
useEffect(() => { form.reset(...) }, [topping])
```

**5. Price Display**

```typescript
// In ToppingTable row
const priceDisplay = topping.extraPrice === 0
  ? 'Miễn phí'              // green text
  : `+${topping.extraPrice.toLocaleString('vi-VN')}đ`
```

**6. Delete with confirmation**

Always confirm before DELETE — topping may be linked to products. Use a confirmation dialog (can be a simple `window.confirm` or a dedicated `ConfirmDialog` component if available). If linked to products, show a warning with the product count.

---

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** (`revalidate: 60s`) | `['admin', 'toppings']` prefetched in `page.tsx` | Topping list changes at admin cadence — safe to cache 60s (matches staleTime) |
| **RSC** | `page.tsx` only — prefetchQuery + HydrationBoundary | No per-user data on initial render |
| **Client** (`'use client'`) | Zones A · B · C · D (via `ToppingsPageClient`) | Modal state, form interaction, Zustand auth |

> Gap: No known gaps — full list is prefetched on page load. Delete modal is client-only (no prefetch needed).

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

---

### File Organization

```
src/
├── app/
│   └── admin/
│       └── toppings/
│           ├── page.tsx                  ← ISR RSC shell
│           └── components/
│               ├── ToppingsPageClient.tsx
│               ├── ToppingPageHeader.tsx
│               ├── ToppingTable.tsx
│               └── ToppingFormModal.tsx
├── hooks/
│   └── useToppingQueries.ts             ← shared hook (reused by Admin — Products)
└── store/
    └── auth.ts                          ← useAuthStore (existing)
```

---

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useAuthStore` | `user.role` | — | Session-scoped | All admin pages |

Local state (not in store):
- `addModalOpen: boolean` — cleared on modal close
- `editTopping: Topping | null` — cleared on modal close

---

### Critical Implementation Notes

- **Query key reuse:** `['admin', 'toppings']` is shared with Admin — Products (ProductFormModal topping checkbox). Mutations on this page will invalidate that page's topping dropdown too — this is correct behaviour.
- **extraPrice = 0 is valid:** 0 means "Miễn phí". Do not validate `extraPrice > 0`; validate `extraPrice >= 0`.
- **Modal reset:** Always reset RHF form on modal open/close using `useEffect` on the `topping` prop, or reset in `onClose`. Stale form data between add/edit sessions is the #1 modal bug.
- **Product linkage on delete:** The API may return 409 if the topping is linked to products. Handle this gracefully — surface a readable error message, not a raw API error.
- **"Áp dụng cho sản phẩm" column:** This column is read-only in the topping list. Product-topping linking is done from the Admin — Products page (ProductFormModal), not here. Do not add a product picker to `ToppingFormModal`.
