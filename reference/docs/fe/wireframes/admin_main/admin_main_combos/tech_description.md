## Technical Architecture — Admin — Combo

### Page Structure
- Zones: A (AdminTopNav sticky), B (PageHeader), C (ComboTable), D (ComboFormModal overlay)
- Device target: Desktop (1280px+)
- Sticky zones: A (`sticky top-0 z-20`)
- Modals: D — ComboFormModal (`z-50`), shared for add and edit mode via `mode` prop

### Tech Stack
```
React (Next.js App Router)
├── State: useAuthStore (Zustand) — role check for delete visibility
├── Data: TanStack Query
│   ├── ['admin', 'combos']   → GET /api/v1/admin/combos
│   └── ['admin', 'products'] → GET /api/v1/admin/products (modal search)
├── Forms: React Hook Form + Zod (ComboFormModal)
├── Styling: Tailwind CSS (desktop table layout)
└── Types: TypeScript strict — Combo · ComboItem · CreateComboPayload
```

### Key Implementation Patterns

**1. Component Architecture**
- Page: `app/admin/combos/page.tsx` — thin shell, renders guards + layout
- Local components in `app/admin/combos/_components/`:
  - `ComboPageHeader` — title with count, action buttons
  - `ComboTable` — table rows with product chips, price display, action buttons
  - `ComboFormModal` — controlled modal, `mode: "add" | "edit"`, pre-fills via `defaultValues`
  - `ProductSearchList` — client-side filtered product list with `−/qty/+` controls

**2. State Management**
```ts
// No page-local Zustand store needed — modal open state is component-local
const [modalOpen, setModalOpen] = useState(false)
const [editTarget, setEditTarget] = useState<Combo | null>(null)

const handleEdit = (combo: Combo) => {
  setEditTarget(combo)
  setModalOpen(true)
}
const handleAdd = () => {
  setEditTarget(null)
  setModalOpen(true)
}
```

**3. Data Fetching**
```ts
// staleTime 30s for combo list — changes are admin-driven, low frequency
const { data: combos } = useQuery({
  queryKey: ['admin', 'combos'],
  queryFn: fetchCombos,
  staleTime: 30_000,
})

// Products loaded once for modal search, longer staleTime acceptable
const { data: products } = useQuery({
  queryKey: ['admin', 'products'],
  queryFn: fetchProducts,
  staleTime: 60_000,
})
```

**4. Savings Calculation**
- Computed inside `ComboFormModal` via `watch()` on price field + selected items
- `retailSum = selectedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)`
- `savings = retailSum - comboPrice`
- Rendered only when `savings > 0`; no backend call needed

**5. Role-based Delete**
```ts
const { role } = useAuthStore()
// In ComboTable row:
{role === 'admin' && (
  <Button variant="destructive" size="sm" onClick={() => onDelete(combo.id)}>
    Xóa
  </Button>
)}
```

**6. Form Validation (Zod)**
```ts
const comboSchema = z.object({
  name: z.string().min(1, 'Tên combo là bắt buộc'),
  description: z.string().optional(),
  price: z.number().positive('Giá combo phải lớn hơn 0'),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().min(1),
  })).min(2, 'Combo phải có ít nhất 2 sản phẩm'),
})
```

### File Organization
```
app/admin/combos/
├── page.tsx                          ← Page shell (AuthGuard + RoleGuard + layout)
├── layout.tsx                        ← (optional, if admin has shared layout)
└── _components/
    ├── ComboPageHeader.tsx
    ├── ComboTable.tsx
    ├── ComboFormModal.tsx
    └── ProductSearchList.tsx

hooks/
└── useAdminCombos.ts                 ← query + mutation hooks for combos

types/
└── combo.ts                          ← Combo · ComboItem · CreateComboPayload interfaces
```

### Critical Notes
- Products for modal search are fetched once and filtered client-side — no debounced API search needed (product list is small)
- `retailSum` is computed from `unit_price` on each `ComboItem`; the backend must return `unit_price` per item for this to work
- Old/strikethrough price in the table (`~~175.000 ₫~~`) requires the API to return price history; confirm this field exists in the response before implementing
- ComboFormModal must reset form state (`reset(defaultValues)`) each time it opens to prevent stale data leaking between add/edit sessions
