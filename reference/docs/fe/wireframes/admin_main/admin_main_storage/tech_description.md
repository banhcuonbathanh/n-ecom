## Technical Architecture — Admin — Kho nguyên liệu

### Page Structure
- **Zones:** A (AdminTopNav, sticky) · B (AdminNavTabs, within AdminTopNav) · C (StoragePageHeader) · D (IngredientTable) · E (IngredientFormModal, overlay)
- **Device target:** desktop (880px+ design width; table horizontal scroll at < 1024px)
- **Sticky zones:** Zone A — `sticky top-0 z-20`
- **Modals:** E — `IngredientFormModal` (add / edit mode)
- **Scrollable:** Zone D grows with list; page scrolls vertically

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard` |
| **Allowed roles** | `admin` · `manager` (TBC — confirm with owner) |
| **Auth state used** | `useAuthStore.user` (display name in nav) · `useAuthStore.role` (RoleGuard check) |
| **Conditional UI by role** | TBC — possibly hide "Xóa" for Manager; Admin can delete |
| **Unauthorized redirect** | `/login` (unauthenticated) · `/admin` (wrong role) |

### Tech Stack

```
React (Next.js 14 App Router)
├── State: Zustand (useAuthStore) — auth/role only
├── Data: TanStack Query (['admin', 'ingredients']) — staleTime 60s
├── Forms: RHF + Zod — IngredientFormModal
├── Styling: Tailwind CSS (desktop table layout, row conditional bg)
└── Types: Ingredient · IngredientFormData · IngredientStatus
```

### Key Implementation Patterns

**1. Component Architecture**
- `page.tsx` (RSC) — prefetchQuery + HydrationBoundary
- `StoragePageClient` (`'use client'`) — owns all Zustand reads + modal state + search state
- `StoragePageHeader` — controlled search input + add button CTA
- `IngredientTable` — receives filtered list; handles row highlighting + action buttons
- `IngredientFormModal` — RHF form; `mode: 'add' | 'edit'`; pre-fills on edit

**2. State Management**

```typescript
// Local state in StoragePageClient
const [searchQuery, setSearchQuery] = useState('')
const [modalOpen, setModalOpen] = useState(false)
const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)

// Derived: client-side filter (no separate API call)
const filtered = useMemo(
  () => ingredients?.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())) ?? [],
  [ingredients, searchQuery]
)
```

**3. Data Fetching**

```typescript
// hooks/useIngredientQueries.ts
queryKey: ['admin', 'ingredients']
endpoint: GET /api/v1/admin/ingredients
staleTime: 60_000  // 1 min — matches ISR revalidate
```

All mutations (create / update / delete) invalidate `['admin', 'ingredients']` on success.

**4. Row Highlighting**

```typescript
const rowClass = (item: Ingredient) =>
  item.status === 'expiring_soon' || item.status === 'out_of_stock'
    ? 'bg-orange-50 border-orange-200'
    : ''

const qtyClass = (item: Ingredient) =>
  item.quantity <= item.warningThreshold ? 'text-red-600 font-medium' : 'text-slate-800'

const expiryClass = (item: Ingredient) =>
  item.status === 'expiring_soon' || item.status === 'out_of_stock'
    ? 'text-red-600 font-medium'
    : 'text-green-700'
```

**5. Date Handling**
- Display format: `dd/MM/yyyy` (Vietnamese convention)
- API format: ISO 8601 `YYYY-MM-DD`
- `importDate` + `shelfDays` → `expiryDate` computed server-side; client only displays
- Form input: date picker or `<input type="date">` with display reformatting

**6. Edge Case Handling**
- Empty list → `<EmptyState>` with add CTA
- Search no results → `<EmptyState>` with "Không tìm thấy" message
- Delete with 422 → toast error (ingredient in use)
- 409 on create → field-level error on `name` field

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** (`revalidate: 60s`) | `['admin', 'ingredients']` | Ingredient list stable across users; infrequent mutations |
| **RSC** | `page.tsx` only — `prefetchQuery(['admin', 'ingredients'])` + `HydrationBoundary` | No per-user server data needed |
| **Client** (`'use client'`) | `StoragePageClient` (Zones C · D · E) | Zustand auth read + modal state + search state |

> Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

### File Organization

```
src/
├── app/admin/storage/
│   ├── page.tsx                    # RSC — prefetchQuery + HydrationBoundary
│   └── components/
│       ├── StoragePageClient.tsx   # 'use client' — owns all state
│       ├── StoragePageHeader.tsx   # search input + add button
│       ├── IngredientTable.tsx     # table + row highlighting
│       └── IngredientFormModal.tsx # RHF form (add/edit)
├── hooks/
│   └── useIngredientQueries.ts     # useIngredients · useCreateIngredient · useUpdateIngredient · useDeleteIngredient
└── store/
    └── auth.ts                     # useAuthStore (existing)
```

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useAuthStore` | `user.name` · `role` | — | Session-scoped | All admin pages |

### Critical Implementation Notes
- `expiryDate` is computed server-side from `importDate + shelfDays` — do not recompute on the frontend
- `warningThreshold` drives both the `status` field (server) and the quantity text colour (client)
- Row conditional bg must not override hover state — use `hover:bg-slate-50` only on non-warning rows
- Modal `mode` prop must be set BEFORE opening (set both `modalMode` and `selectedIngredient` in the same event handler)
- `shelfDays` field: validate as integer ≥ 1; display with "ngày" suffix (not part of input value)
