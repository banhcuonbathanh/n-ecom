# Admin Categories — `/admin/categories`

> **TL;DR:** ✅ implemented · manager+ · Single-file client component — no sub-components. Provides
> full CRUD for restaurant categories: a count header, a table sorted by `sort_order` ASC, and an
> inline RHF+Zod modal with exactly two fields (name + sort_order). Categories drive the
> `CategoryTabs` component on `/menu` and `/pos`.
> Source traced from `fe/src/app/(dashboard)/admin/categories/page.tsx` on branch
> `experience_claude.md_system_1`.
> BE view → [admin_categories_be.md](admin_categories_be.md) ·
> Cross-page flow → [admin_categories_crosspage_dataflow.md](admin_categories_crosspage_dataflow.md) ·
> Loading states → [admin_categories_loading.md](admin_categories_loading.md) ·
> Scenario → [SCENARIO_CATEGORY_CRUD.md](SCENARIO_CATEGORY_CRUD.md)

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ Danh mục (4)                                  [+ Thêm danh mục]  │ ← A Header
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [Đang tải...]          ← loading state (page.tsx:97)          │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │ Không thể tải danh mục. Vui lòng thử lại. [Thử lại]    │    │
│   └─────────────────────────────────────────────────────────┘    │
│                         ← error state (page.tsx:99-107)         │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ Tên danh mục              Thứ tự                           │   │ ← B Table
│ │ Bánh cuốn                   1          [Sửa]  [Xóa]       │   │
│ │ Canh                        2          [Sửa]  [Xóa]       │   │
│ │ Đồ uống                     3          [Sửa]  [Xóa]       │   │
│ │ Combo                       4          [Sửa]  [Xóa]       │   │
│ │                                                            │   │
│ │     Chưa có danh mục nào   ← empty state (page.tsx:141-147)   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
  Overlay: Form modal (page.tsx:153-198) — add or edit
  ┌────────────────────────────────┐
  │ Thêm danh mục / Sửa danh mục  │
  │ Tên danh mục: [____________]  │
  │ Thứ tự hiển thị: [_________]  │
  │           [Huỷ]       [Lưu]   │
  │  (submitting → "Đang lưu...")  │
  └────────────────────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| A Header | inline JSX `page.tsx:86-94` | `categories.length` from TanStack Query |
| B Table | inline `<table>` `page.tsx:110-150` | `listCategories` → query key `['admin','categories']`; sorted client-side by `sort_order` ASC (`page.tsx:119`) |
| Form modal | inline RHF+Zod modal `page.tsx:153-198` | add → `createCategory`; edit → `updateCategory(editItem.id, …)`; delete → `deleteCategory` + native `confirm()` |

## Key Interactions

- **+ Thêm danh mục** (`page.tsx:88-93`) → calls `openAdd()` → resets form to `{name:'', sort_order:0}`, sets `editItem=null`, opens modal.
- **Sửa** (`page.tsx:126-130`) → calls `openEdit(c)` → prefills form with `{name:c.name, sort_order:c.sort_order}`, sets `editItem=c`, opens modal.
- **Xóa** (`page.tsx:131-136`) → calls `handleDelete(id, name)` → native browser `confirm('Xóa danh mục "<name>"?')` (`page.tsx:80`) → `deleteMut.mutate(id)`.
  - 409 response → `toast.error('Không thể xóa — danh mục đang có sản phẩm.')` (`page.tsx:71-73`).
  - Other error → `toast.error('Không thể xóa danh mục')` (`page.tsx:74-75`).
- **Lưu** (`page.tsx:187-193`) → `saveMut.mutate(values)`:
  - Add → `createCategory({name, sort_order})` (`admin.api.ts:10-11` → `POST /categories`).
  - Edit → `updateCategory(editItem.id, {name, sort_order})` (`admin.api.ts:13-14` → `PATCH /categories/:id`).
  - Success → invalidate `['admin','categories']` + toast + close modal (`page.tsx:48-51`).
  - 409 on save → `setError('name', {message:'Tên danh mục đã tồn tại.'})` (`page.tsx:55-57`).
- **Thử lại** (`page.tsx:101-106`) → calls `refetch()` on the categories query.
- All writes invalidate `['admin','categories']`; `/menu` `CategoryTabs` picks up changes on next fetch (staleTime 5 min on that page).

## Business Logic Used

- Category tab ordering on menu/POS is driven by `sort_order` → [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md) (menu queries)
- Admin CRUD pattern (invalidate on success, toast, modal close) → [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md) (admin CRUD pattern)
- Manager+ gate → [../../02_spec/BUSINESS_RULES.md §1 RBAC](../../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
- DELETE blocked (409) when category has products → [../../02_spec/BUSINESS_RULES.md](../../02_spec/BUSINESS_RULES.md)

---

## Object Model

> Category is a **leaf catalog object** — its full DB field list and BE response shape live in
> [../../02_spec/DB_SCHEMA.md](../../02_spec/DB_SCHEMA.md) (`categories` table). Do not restate DB
> columns here (Rule #9 — one fact, one home).
>
> This section covers only the FE-visible shape that this page reads and writes.

### §1 — Category (FE shape)

Source: `fe/src/types/product.ts:1-5`

```ts
interface Category {
  id:         string   // CHAR(36) UUID
  name:       string
  sort_order: number
}
```

The BE `GET /categories` response also returns `description` (TEXT|null→`""`) and `is_active`
(TINYINT→boolean). Both fields are **present in the JSON wire response but absent from the FE
`Category` type** (`types/product.ts:1-5`) — they are silently dropped by TypeScript's structural
typing and never accessed in this page.

### §2 — Form schema (Zod, write-side)

Source: `page.tsx:11-14`

```ts
const schema = z.object({
  name:       z.string().min(1, 'Nhập tên danh mục').max(100),
  sort_order: z.coerce.number().int().default(0),
})
```

`createCategory` sends `{name, sort_order}` → `POST /categories` (`admin.api.ts:10-11`).
`updateCategory` sends the same body to `PATCH /categories/:id` (`admin.api.ts:13-14`).

### §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **`description` + `is_active` returned but unused** | BE serializes both on `GET /categories`; FE type (`types/product.ts:1-5`) omits them. Harmless today — if a future field (e.g. active toggle) is needed, extend the type before using. |
| 2 | **Stale wireframe corrected in this file** | Previous version showed a "Số món" column and icon buttons `[✎][🗑]`. Real `<thead>` columns are only "Tên danh mục", "Thứ tự", and an empty action column (`page.tsx:111-116`). Real buttons are text labels "Sửa" / "Xóa" (`page.tsx:129,135`). |
| 3 | **DELETE is admin-only but the "Xóa" button renders for managers → silent 403** | Confirmed code bug: `DELETE /categories/:id` is gated `AtLeast("admin")` (`../../../../../be/cmd/server/main.go#L193-L196`) yet the page renders "Xóa" for every manager+ user with no role check (`page.tsx:131-136`); the delete `onError` has no 403 branch so the failure shows as a generic toast. See [CATEGORIES_BUGS.md](CATEGORIES_BUGS.md) Bug 1. |
| 4 | **Client-side sort only** | Rows are sorted by `sort_order` ASC in the browser (`page.tsx:119`: `[...categories].sort((a,b)=>a.sort_order-b.sort_order)`). The API also sorts server-side — `ListCategories` ends `ORDER BY sort_order ASC, name ASC` (`../../../../../be/internal/db/products.sql.go#L306-L310`). |
