## Technical Architecture — Admin — Products

### Page Structure
- Zones: Nav (AdminTopNav sticky) + Zone A (PageHeader) + Zone B (ProductsTable) + Modal M1 (ProductFormModal)
- Device target: Desktop (1280px+)
- Sticky zones: Nav — `sticky top-0 z-20`
- Modals: M1 — ProductFormModal (shared Add/Edit)

---

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard(['admin', 'manager'])` |
| **Allowed roles** | Admin · Manager |
| **Auth state used** | `useAuthStore.user.role` |
| **Conditional UI by role** | TBD — confirm whether Manager can delete or only Admin (see conccern.md) |
| **Unauthorized redirect** | `/login` (AuthGuard) · `/403` or redirect to dashboard (RoleGuard) |

---

### Tech Stack

```
React (Next.js App Router)
├── State: Zustand (useAuthStore) — auth only, no page-level global state
├── Data: TanStack Query
│   ├── ['admin', 'products']   staleTime 30s
│   ├── ['categories']          staleTime 60s  (shared with Menu + Admin Categories)
│   └── ['admin', 'toppings']   staleTime 60s  (new key)
├── Forms: RHF + Zod (ProductFormModal only)
├── Styling: Tailwind CSS (desktop table layout)
└── Types: TypeScript strict — Product · ProductTopping · Topping · ProductFormValues
```

---

### Key Implementation Patterns

**1. Component Architecture**
- `page.tsx` — RSC: prefetch all 3 queries, HydrationBoundary
- `ProductsPageClient.tsx` — `'use client'`: owns modal state + mutation handlers
- `ProductPageHeader`, `ProductsTable`, `ProductFormModal` — local components under `_components/`
- `ProductFormModal` is mode-driven: `mode: 'add' | 'edit'`. In edit mode, `product` prop pre-populates RHF `defaultValues`.

**2. State Management**

```typescript
// Page-level local state (in ProductsPageClient)
const [modalOpen, setModalOpen]       = useState(false)
const [modalMode, setModalMode]       = useState<'add' | 'edit'>('add')
const [selectedProduct, setSelected] = useState<Product | null>(null)

// Open for add
const handleAdd = () => { setModalMode('add'); setSelected(null); setModalOpen(true) }

// Open for edit
const handleEdit = (p: Product) => { setModalMode('edit'); setSelected(p); setModalOpen(true) }
```

**3. Data Fetching**

All three queries are prefetched in RSC `page.tsx` so the table renders with zero loading flash:

```typescript
await Promise.all([
  queryClient.prefetchQuery({ queryKey: ['admin', 'products'], queryFn: fetchAdminProducts }),
  queryClient.prefetchQuery({ queryKey: ['categories'],        queryFn: fetchCategories }),
  queryClient.prefetchQuery({ queryKey: ['admin', 'toppings'], queryFn: fetchAdminToppings }),
])
```

Mutations: invalidate `['admin', 'products']` on success (add, edit, delete).

**4. Performance**
- Product list is full (no pagination) — if list grows > 100, add virtual scroll (`@tanstack/react-virtual`)
- Image upload: client-side preview via `URL.createObjectURL`, upload to storage on submit
- Topping checkbox list renders from cache — no re-fetch on modal open

**5. Edge Case Handling**
- Delete: confirm dialog required before mutation fires (dialog not shown in excalidraw — implement as `window.confirm` or a modal)
- Duplicate name: map server 409 to RHF `setError('name', ...)`
- Server 409 on delete (active orders): show inline error in table row, do not close modal

---

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** (`revalidate: 30s`) | `['admin', 'products']` | Admin product list is shared across admin sessions — safe to cache |
| **ISR** (`revalidate: 60s`) | `['categories']` · `['admin', 'toppings']` | Reference data — changes infrequently |
| **RSC** | `page.tsx` only — prefetch all 3 + HydrationBoundary | No per-user data needed for initial render |
| **Client** (`'use client'`) | Nav + Zone A + Zone B + Modal M1 | Zustand auth state + modal interactions |

> Gap: Modal opens topping list from pre-hydrated cache — no extra fetch needed. If topping list is empty (cache miss), a short loading state shows inside the modal checkbox section.

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

---

### File Organization

```
src/
├── app/admin/products/
│   ├── page.tsx                          ← RSC — prefetch + HydrationBoundary
│   └── _components/
│       ├── ProductsPageClient.tsx        ← 'use client' — modal state + mutations
│       ├── ProductPageHeader.tsx
│       ├── ProductsTable.tsx
│       └── ProductFormModal.tsx
├── hooks/
│   └── useAdminProductsQueries.ts        ← query + mutation hooks for this page
└── store/
    └── auth.ts                           ← useAuthStore (already exists)
```

---

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useAuthStore` | `user.role` | — | Persistent across admin session | N/A |

Local state lives in `ProductsPageClient` — not persisted, cleared on unmount.

---

### Critical Implementation Notes
- Product `id` is UUID — never use array index as key; always `key={product.id}`
- Price is stored as integer VND — display with `toLocaleString('vi-VN')` + ` ₫`
- Topping `extra_price === 0` → display "Miễn phí" in modal; in table show nothing (—)
- `['admin', 'products']` query key is shared with Admin — Combos (product search in ComboFormModal) — mutations here also affect that page's stale status
- "🌱 Dữ liệu mẫu" button: confirm whether this is dev-only before shipping to production (see conccern.md)
