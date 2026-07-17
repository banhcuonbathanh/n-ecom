## Technical Architecture — Admin — Categories

### Page Structure
- Zones: A (AdminTopNav sticky), B (PageHeader static), C (CategoryTable scrollable)
- Modals: D (AddCategoryModal fixed overlay), E (EditCategoryModal fixed overlay)
- Device target: Desktop (1280px+)
- Sticky zones: Zone A — `sticky top-0 z-20`
- No horizontal scroll needed for main table on desktop; rows take full width

### Tech Stack

```
React (Next.js App Router)
├── State: local useState (modal open/close + edit target) — no Zustand needed
├── Data: TanStack Query (['categories'] key, staleTime 60s)
├── Forms: React Hook Form + Zod (CategoryFormSchema)
├── Styling: Tailwind CSS (desktop layout, orange accent #f97316)
└── Types: Category, CategoryFormValues
```

### Key Implementation Patterns

1. **Component Architecture**
   - Page component: `src/app/admin/categories/page.tsx` — thin orchestrator; holds modal state only
   - All page-specific components live in: `src/app/admin/categories/components/`
   - AdminTopNav is shared: `src/components/shared/AdminTopNav.tsx`
   - Query hooks live in: `src/hooks/useCategories.ts` (not inside page folder)

2. **State Management**
   ```typescript
   // Page-level state — local useState is sufficient, no cross-page sharing needed
   const [addModalOpen, setAddModalOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Category | null>(null);
   ```

3. **Data Fetching Strategy**
   ```typescript
   queryKey: ['categories']
   staleTime: 60_000  // 60 seconds
   // On any mutation success → queryClient.invalidateQueries({ queryKey: ['categories'] })
   // Sort categories client-side: [...data].sort((a, b) => a.sort_order - b.sort_order)
   ```

4. **Form Validation (Zod)**
   ```typescript
   const CategoryFormSchema = z.object({
     name: z.string().min(1, 'Tên danh mục không được để trống'),
     sort_order: z.number().int().min(0).default(0),
   });
   ```

5. **Performance**
   - Category list is expected < 50 rows — no virtualization needed
   - No search input on this page — no debounce needed
   - Skip optimistic updates; invalidate + refetch is correct and simple for this list size

6. **Edge Case Handling**
   - 409 Duplicate name → `setError('name', { message: 'Tên danh mục đã tồn tại.' })` via RHF
   - 409/422 Delete with products → toast error, row stays in table
   - Network error on load → TanStack Query `isError` → render error message + retry button

### File Organization

```
src/
└── app/
    └── admin/
        └── categories/
            ├── page.tsx                          ← route entry, modal state
            └── components/
                ├── CategoryPageHeader.tsx        ← Zone B: title + add button
                ├── CategoryTable.tsx             ← Zone C: table + row actions
                ├── AddCategoryModal.tsx          ← Zone D: POST form
                └── EditCategoryModal.tsx         ← Zone E: PATCH form pre-filled
src/
└── components/
    └── shared/
        └── AdminTopNav.tsx                       ← Zone A (shared across admin pages)
src/
└── hooks/
    └── useCategories.ts                          ← useCategories, useCreateCategory,
                                                     useUpdateCategory, useDeleteCategory
```

### Critical Implementation Notes

- Sort `sort_order` is 0-based; sort the list client-side after fetch — do not rely on server ordering
- Category `id` is UUID — always use `id` as React key, never array index
- Edit modal receives the full `Category` object as prop — seed RHF `defaultValues` from it; do NOT refetch by ID inside the modal
- DELETE endpoint: `DELETE /api/v1/categories/:id` — if category has products, BE returns 409; show toast, do not remove row
- `AdminTopNav` `activeTab` prop must receive the "categories" enum value on this page
- `sort_order` field: use `register('sort_order', { valueAsNumber: true })` to avoid string coercion bugs
