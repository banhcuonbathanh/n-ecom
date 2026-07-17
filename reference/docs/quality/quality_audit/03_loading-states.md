# ASPECT 3 — Loading / Error / Empty States

Most customer-facing pages have good loading and error coverage, largely because the SSE-driven pages show a detailed inline skeleton while data is arriving. The most critical gap is the admin combos page, which fetches from the server but renders nothing on error — no retry button. Several admin-area pages have loading spinners that are plain text strings ("Đang tải...") rather than skeletons, causing visible layout shift. Mutation in-flight handling is generally correct (buttons disabled, "Đang..." labels). There are no optimistic updates with missing rollback. `error.tsx` / `global-error.tsx` files are absent from the entire `app/` tree — the app has no React error boundary coverage.

---

## Page-by-page state coverage table

| Page | Route | Loading UI | Error UI | Empty State | Notes |
|---|---|---|---|---|---|
| Menu | `(shop)/menu` | ✅ Skeleton (animated cards, mobile+desktop) | ✅ Inline retry button | ✅ `EmptyState` component | Loading only covers product list; categories/combos silently show nothing on error |
| Product Detail | `(shop)/menu/product/[id]` | ✅ `ProductDetailSkeleton` component | ✅ Inline message + back button | — | — |
| Combo Detail | `(shop)/menu/combo/[id]` | ❌ No loading UI (data=[] default) | ❌ No error UI | ❌ No empty state | Page renders blank if fetch fails |
| Checkout | `(shop)/checkout` | ✅ Redirect to /menu if cart empty | ❌ No error UI for submit failure (toast only) | — | Submit error is toast-only, no inline retry |
| Order Tracking (SSE) | `(shop)/order/[id]` | ✅ Rich inline skeleton (6 zones) | ✅ 404 + generic error states | — | Best in class |
| Order List | `(shop)/order` | ❌ No loading state (reads localStorage sync) | ❌ No error state | ✅ Empty bag icon | localStorage read is synchronous so "no loading" is acceptable |
| Table Monitor | `(shop)/tracking` | ✅ Skeleton | ✅ isError + isUnauthorized states | ✅ "No active order" state | — |
| Favourites | `(shop)/menu/favourites` | ❌ No loading (store only) | — | ✅ Inline empty message | — |
| Favourites Save | `(shop)/menu/favourites/save` | ❌ No loading (store only) | — | — | — |
| Favourites Sets | `(shop)/menu/favourites/sets` | ❌ No loading (store only) | — | ✅ Inline empty message | — |
| Profile | `(shop)/profile` | ✅ `ProfilePageSkeleton` | ❌ isError renders nothing (no error message shown, form renders with empty defaults) | — | See LD-2 |
| Settings | `(shop)/menu/settings` | — | — | — | Store-only, no server fetch |
| Login | `(auth)/login` | ✅ Button disabled+spinner | ✅ Toast error | — | — |
| Register | `(auth)/register` | ✅ Button disabled+spinner | ✅ Toast error | — | — |
| KDS | `(dashboard)/kds` | ❌ No loading (blank → data arrives) | ❌ No error UI | ✅ "No orders" message | See LD-3 |
| POS | `(dashboard)/pos` | ❌ No loading for product grid | ❌ No error UI | ✅ "Select from menu" | — |
| Payment | `(dashboard)/cashier/payment/[id]` | ✅ "Đang tải..." text (minimal) | ❌ No error state if order fetch fails | — | — |
| Admin Overview | `(dashboard)/admin/overview` | — | ✅ ConnectionErrorBanner for WS | ✅ Stat cards show 0 | Relies on WS; no spinner on initial load |
| Admin Products | `(dashboard)/admin/products` | ✅ `isLoading` checked | ❌ No error UI (list silently empty) | ✅ Empty row in table | — |
| Admin Combos | `(dashboard)/admin/combos` | ✅ "Đang tải..." text | ❌ No error UI | ✅ `EmptyState` | See LD-1 |
| Admin Categories | `(dashboard)/admin/categories` | ✅ "Đang tải..." text | ✅ Retry button | ✅ Empty row | — |
| Admin Toppings | `(dashboard)/admin/toppings` | ✅ `isLoading` checked | ❌ No error UI (silently empty) | ✅ Empty row | — |
| Admin Ingredients | `(dashboard)/admin/ingredients` | ✅ `isLoading` checked | ❌ No error UI | ✅ "No data" row | — |
| Admin Staff | `(dashboard)/admin/staff` | ✅ `isLoading` checked | ✅ `isError` + retry | ✅ `EmptyState` | — |
| Admin Summary | `(dashboard)/admin/summary` | ✅ Skeleton cards per section | ❌ No error UI for any section | ✅ Implicit (0 values) | — |
| Admin Marketing | `(dashboard)/admin/marketing` | ✅ Skeleton cards | ✅ Error banner + retry | ✅ `EmptyState` | — |
| Admin Training | `(dashboard)/admin/training` | ✅ `isLoading` checked | ✅ `isError` + reload button | ✅ Implicit from empty guides | — |
| Admin Task Board | `(dashboard)/admin/staff/task-board` | ✅ `statsLoading` checked | ❌ No error UI | ✅ Implicit | — |
| Admin Todo List | `(dashboard)/admin/todo-list` | ✅ `TodoPageSkeleton` | ❌ No error UI | ✅ "No tasks" | — |
| Table QR Entry | `table/[tableId]` | ✅ "Đang xác thực..." | ✅ Error shown | — | — |

---

## Findings

### LD-1 — 🟠 Major — Admin combos page has no error state; fetch failure renders silently empty

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/admin/combos/page.tsx` lines 54–57, 256–260

**Problem:** The `useQuery` for combos only destructures `data` and `isLoading`. There is no `isError` check in the render. If the network request fails, `combos` defaults to `[]` and the page renders an `EmptyState` with "Chưa có combo nào" — identical to the genuine empty state. An admin will not know whether data failed to load or whether there truly are no combos. The `staleTime` is also absent (defaults to 0), so the query will keep retrying silently.

**Fix:** Add `isError` to the destructuring and render an error banner with a retry button:
```tsx
const { data: combos = [], isLoading, isError, refetch } = useQuery<Combo[]>(...)
// in render:
{isError && (
  <div className="text-center py-10">
    <p className="text-muted-fg text-sm mb-3">Không thể tải combo.</p>
    <button onClick={() => refetch()} className="px-4 py-2 text-sm border border-border rounded-lg">Thử lại</button>
  </div>
)}
```

---

### LD-2 — 🟠 Major — Profile page renders empty form (not an error message) when the profile fetch fails

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(shop)/profile/page.tsx` lines 16, 35–76

**Problem:** `isError` is read but only used to disable the Save CTA button (`disabled={isError && !is404}`). When there is a non-404 error (network failure, 500), the page renders the form with `undefined` default values — the user sees empty input fields and a disabled save button with no explanation. There is no error message, no retry button.

**Fix:** Add an explicit error branch:
```tsx
if (isError && !is404) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-muted-fg text-sm">Không thể tải thông tin. Vui lòng thử lại.</p>
      <button onClick={() => window.location.reload()}>Thử lại</button>
    </div>
  )
}
```

---

### LD-3 — 🟠 Major — KDS page shows blank screen during initial data load (no loading skeleton)

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/kds/page.tsx` lines 97–111, 182–188

**Problem:** KDS fetches the initial order list via `useQuery`. While `initial` is `undefined` (loading), the `orders` local state is `[]`. The render guard `if (orders.length === 0)` immediately renders "Không có đơn nào đang chờ 🍜" — the same message as the true empty state. A chef opening KDS on page load sees "no orders" for several hundred milliseconds before data arrives, which is misleading on a busy kitchen display. There is also no error state if the initial fetch fails; the "no orders" text is shown in both cases.

**Fix:** Track loading/error from the query:
```tsx
const { data: initial, isLoading, isError } = useQuery<Order[]>(...)
if (isLoading) return <div className="..."><p className="text-muted-fg">Đang tải đơn hàng...</p></div>
if (isError)   return <div className="..."><p className="text-urgent">Lỗi kết nối bếp. <button onClick={() => refetch()}>Thử lại</button></p></div>
```

---

### LD-4 — 🟡 Minor — No `error.tsx` or `global-error.tsx` in any route segment — unhandled JS errors crash to a blank screen

**Problem:** There are zero `error.tsx` or `global-error.tsx` files under `fe/src/app/`. Any uncaught render error (e.g. a null-deref in `order/[id]/page.tsx` before `order` arrives, or a WS message with unexpected shape) will propagate to Next.js's default error page, which shows a blank screen in production with no route back to the app.

**Fix:** Add at minimum:
- `fe/src/app/error.tsx` — catches errors in any route segment under `app/`, displays an inline "Something went wrong" with a reset button
- `fe/src/app/global-error.tsx` — catches errors in the root layout itself

These are low-effort, high-safety additions.

---

### LD-5 — 🟡 Minor — Several admin pages show plain text "Đang tải..." instead of skeleton, causing layout shift

**Files:**
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/admin/combos/page.tsx` line 257
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/admin/categories/page.tsx` line 97 (implicit via `isLoading` check)
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/admin/toppings/page.tsx` (isLoading but no explicit skeleton)

**Problem:** These pages go from a "Đang tải..." text or empty block to a full table. The table header appears only after data arrives, causing a visible layout jump. Minor UX issue on staff-facing admin pages.

**Fix:** Replace the loading text with a fixed-height `animate-pulse` skeleton that matches the table height (3–5 rows × 48 px each). This also prevents confusing the "Đang tải..." state with an actual error or empty result.

---

### LD-6 — 🟡 Minor — Payment page loading state is a plain inline text string, not a skeleton

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` lines 137–143

**Problem:** `if (isLoading || !order)` renders:
```tsx
<div className="flex items-center justify-center min-h-screen bg-background text-muted-fg">
  Đang tải...
</div>
```
No skeleton; no error state (if order fetch fails with a non-loading state, the guard is never re-triggered and the component may partially render with `undefined` order data).

**Fix:** Add an `isError` guard returning an error message with a back button, and upgrade the loading UI to at least a card skeleton matching the receipt layout.

---

## What's already good

- `order/[id]` (customer order tracking) has the most polished loading/error/empty coverage in the codebase: a detailed six-zone inline skeleton, a dedicated `isNotFound` state, a `connectionError` banner, and a modal for every order lifecycle notification.
- `(shop)/tracking` correctly handles all three edge cases: no active order (redirect prompt), fetch error, and SSE auth failure — each with a distinct message and a contextual CTA.
- All mutation buttons (checkout submit, cancel order, confirm payment, CRUD modals) correctly disable during `isPending` and show "Đang..." labels to prevent double-submit.
- `EmptyState` shared component is used consistently across admin tables and the order list.
- The `(shop)` and `(dashboard)/admin` layout segments both have a `loading.tsx` file providing a fallback spinner for the initial route segment load.
