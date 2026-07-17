# FE Quality Audit — Aspect 6: Type Safety & Validation

## Verdict

Type safety is **structurally sound but has several gaps** that increase maintenance risk. The project correctly uses TypeScript strict mode, Zod on nearly all forms, and snake_case field names matching the API contract in `src/types/`. The most serious issue is a **diverged `StaffRole` type defined three times** across `types/staff.ts`, `types/task.ts`, and `types/training.ts` — the `task.ts` variant contains the invalid values `'kitchen'` and `'server'` which do not exist in the BE, creating a silent category mismatch for task assignment. The second major issue is `handleFormSubmit: (values: any)` in `admin/staff/page.tsx`, which discards the Zod-validated `FormValues` type from the child `AddEditStaffModal` right at the mutation call site. Non-null assertions are present in a few places but are either pattern-safe or low-risk. No IDs are typed as `number`, and API response types generally match the contract.

---

## Findings

### TS-1 — `StaffRole` type defined three times with diverged values; `task.ts` contains invalid BE roles
**Severity:** 🔴 Critical
**Files:**
- `src/types/staff.ts:1` — `'chef' | 'cashier' | 'staff' | 'manager' | 'admin'`
- `src/types/training.ts:1` — `'chef' | 'cashier' | 'staff' | 'manager'` (missing `'admin'`)
- `src/types/task.ts:3` — `'kitchen' | 'cashier' | 'server' | 'manager' | 'admin' | 'chef' | 'staff'`

**What's wrong:** The BE (`be/internal/service/staff_service.go:29`) enforces exactly five roles: `chef`, `cashier`, `staff`, `manager`, `admin`. The `task.ts` variant adds `'kitchen'` and `'server'` which the BE will never return or accept. Any task filtered or assigned by `'kitchen'` role will silently fail to match any real staff member. The `training.ts` variant omits `'admin'`, meaning an admin cannot be assigned training guides according to the FE type — even though the BE allows it.

**Fix:** Create a single canonical type in `src/types/auth.ts` (which already defines the role strings for `User`):
```ts
export type StaffRole = 'chef' | 'cashier' | 'staff' | 'manager' | 'admin'
```
Delete the `StaffRole` declaration from `task.ts` and `training.ts`, and import from `@/types/auth`. In `task.ts`, remove `'kitchen'` and `'server'` from any existing data or mappings that use them.

**Status:** ⬜

---

### TS-2 — `handleFormSubmit: (values: any)` in `admin/staff/page.tsx` discards Zod-validated type
**Severity:** 🟠 Major
**File:** `src/app/(dashboard)/admin/staff/page.tsx:113`
```ts
const handleFormSubmit = (values: any) => {
  if (modal === 'add') {
    createMut.mutate(values)   // mutationFn expects CreateStaffInput
  } else if (modal === 'edit' && editStaff) {
    editMut.mutate({ id: editStaff.id, body: values })  // body expects UpdateStaffInput
  }
}
```
**What's wrong:** `AddEditStaffModal` has a Zod schema and types its `onSubmit` prop as `(data: FormValues) => void` — the data arriving at the callback is correctly shaped. But `page.tsx` accepts it as `any`, which means TypeScript will not catch a field mismatch between the Zod output and `CreateStaffInput` / `UpdateStaffInput`. If the Zod schema or the API input type diverges, there is no compile-time signal. Additionally, the `onError` callbacks at lines 72, 93, and 102 also use `err: any` for the same reason.

**Fix:** Replace `any` with the correct type:
```ts
import type { CreateStaffInput, UpdateStaffInput } from '@/features/admin/admin.api'
// In AddEditStaffModal Props, onSubmit should use a discriminated union or the modal
// can emit typed data. Minimum fix:
const handleFormSubmit = (values: CreateStaffInput | UpdateStaffInput) => { ... }
// For onError callbacks, use the Axios error type:
onError: (err: unknown) => {
  const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
  ...
}
```

**Status:** ⬜

---

### TS-3 — `CustomerProfile` type in `hooks/useCustomerProfile.ts` uses camelCase fields with no matching BE endpoint
**Severity:** 🟠 Major
**File:** `src/hooks/useCustomerProfile.ts:6-15`
```ts
export interface CustomerProfile {
  id: string
  name: string
  phone: string
  address: string
  email?: string
  isMember: boolean       // camelCase, not snake_case
  memberSince?: string    // camelCase
  avatarUrl?: string      // camelCase
}
```
**What's wrong:** Two issues compound here. First, `grep` over the entire BE codebase finds zero routes or handlers for `/customer/profile`. The hook calls `api.get('/customer/profile')` and `api.put('/customer/profile', ...)` against a non-existent endpoint — all profile queries will return 404 (the hook swallows it via the `retry` config). Second, even if the endpoint were added, the `CustomerProfile` interface uses camelCase field names (`isMember`, `memberSince`, `avatarUrl`) while the project rule requires snake_case for all BE response types. This type will drift silently from any future BE implementation.

**Fix:** Either (A) remove the hook and profile page until the BE endpoint is built, or (B) add a stub that makes it explicit: add a comment `// TODO: BE endpoint not implemented` and rename fields to snake_case (`is_member`, `member_since`, `avatar_url`). The `UpdateProfileForm` type exported from this hook (and imported by `PersonalInfoForm`) should be moved to `src/types/` once the endpoint is real.

**Status:** ⬜

---

### TS-4 — `updateOrderStatus` in `admin.api.ts` accepts `status: string` instead of `OrderStatus`
**Severity:** 🟡 Minor
**File:** `src/features/admin/admin.api.ts:178`
```ts
export const updateOrderStatus = (id: string, status: string): Promise<void> =>
  api.patch(`/orders/${id}/status`, { status })
```
**What's wrong:** `OrderStatus` is defined in `src/types/order.ts` with exactly seven valid values. Using `status: string` means any typo (e.g. `'delievered'`) will pass TypeScript checks and reach the BE where it will fail at runtime. Call sites in `admin/overview/page.tsx` pass string literals directly without this type constraint.

**Fix:**
```ts
import type { OrderStatus } from '@/types/order'
export const updateOrderStatus = (id: string, status: OrderStatus): Promise<void> =>
  api.patch(`/orders/${id}/status`, { status })
```

**Status:** ⬜

---

### TS-5 — `Payment` interface in `cashier/payment/[id]/page.tsx` is an inline local type, not in `src/types/`
**Severity:** 🟡 Minor
**File:** `src/app/(dashboard)/cashier/payment/[id]/page.tsx:16-23`
```ts
interface Payment {
  id:          string
  order_id:    string
  method:      PaymentMethod
  amount:      number
  status:      'pending' | 'completed' | 'failed'
  qr_code_url: string | null
}
```
**What's wrong:** `Payment` is a domain entity returned by the BE (`/payments` endpoint). Defining it inline in a single page means: (a) if another page ever needs to display payment state, the type will be re-defined or copy-pasted, and (b) the type cannot be validated against the API contract in a central place. The `PaymentMethod` local type has the same problem.

**Fix:** Move `Payment` and `PaymentMethod` to `src/types/order.ts` (or a new `src/types/payment.ts`). Import from there in the payment page.

**Status:** ⬜

---

### TS-6 — `WsMsg` interface duplicated between `context/OrdersWSContext.tsx` and `cashier/payment/[id]/page.tsx`
**Severity:** 🟡 Minor
**Files:**
- `src/context/OrdersWSContext.tsx:5` — `export interface WsMsg { type, order_id, item_id?, qty_served?, status? }`
- `src/app/(dashboard)/cashier/payment/[id]/page.tsx:25` — `interface WsMsg { type, order_id }` (narrower, local only)

**What's wrong:** The payment page defines its own local `WsMsg` with a subset of fields. If the BE adds a new WS message field, it must be updated in both places. The payment page's `WsMsg` is not exported from `OrdersWSContext` because the page manages its own WebSocket connection (separate from the shared one). The root fix is to export `WsMsg` from `src/types/order.ts` and import it in both places, or narrow it locally with `Pick<WsMsg, 'type' | 'order_id'>`.

**Fix:** Export `WsMsg` from `src/types/order.ts`:
```ts
export interface WsMsg {
  type:        string
  order_id:    string
  item_id?:    string
  qty_served?: number
  status?:     string
}
```
Remove the local definitions from both files and import from `@/types/order`.

**Status:** ⬜

---

### TS-7 — Non-null assertions on `toppings_snapshot!` inside a truthiness guard that TypeScript can't narrow
**Severity:** 🟡 Minor
**File:** `src/features/admin/components/TableList.tsx:121`
```tsx
const hasToppings = item.toppings_snapshot && item.toppings_snapshot.length > 0
...
{hasToppings && (
  <p>+ {item.toppings_snapshot!.map(t => t.name).join(', ')}</p>
)}
```
**What's wrong:** `toppings_snapshot` is typed as `ToppingSnapshotEntry[] | null`. The `hasToppings` variable narrows the value, but TypeScript does not narrow through a boolean variable stored outside the JSX expression, so `!` is needed to suppress the error. The same pattern appears with `combo_items!` in `CartDrawer.tsx:141` and `OrderSummary.tsx:398`. These assertions are technically safe (the `!` will never trigger a real null deref) but signal that TypeScript is not tracking the narrowing — a future refactor could move the `!` to a wrong place.

**Fix:** Replace the boolean variable pattern with an inline narrowing:
```tsx
{item.toppings_snapshot && item.toppings_snapshot.length > 0 && (
  <p>+ {item.toppings_snapshot.map(t => t.name).join(', ')}</p>
)}
```
This eliminates the `!` and makes the narrowing explicit. Apply the same pattern to `combo_items` in CartDrawer and OrderSummary.

**Status:** ⬜

---

### TS-8 — `err: any` in three `onError` mutation callbacks in `admin/staff/page.tsx`
**Severity:** 🟡 Minor
**File:** `src/app/(dashboard)/admin/staff/page.tsx:72, 93, 102`

**What's wrong:** Covered partially in TS-2. The `err: any` in `onError` callbacks disables type-checking on error shape access. If the Axios error response shape changes, no compile error will warn you. Other files in the project use the safer pattern `(err as { response?: { data?: {...} } })` with `unknown` — which is consistent with strict TypeScript.

**Fix:** Change `onError: (err: any) =>` to `onError: (err: unknown) =>` and use safe type assertion:
```ts
onError: (err: unknown) => {
  const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
  ...
}
```

**Status:** ⬜

---

### TS-9 — `store/theme.ts` uses hardcoded localStorage key `'admin-theme'` bypassing `storage-keys.ts`
**Severity:** 🟡 Minor
**File:** `src/store/theme.ts:15`
```ts
persist(..., { name: 'admin-theme' })
```
**What's wrong:** The project rule states: "ALL localStorage keys → `src/lib/storage-keys.ts` ONLY — no hardcoded strings." All other persist stores (`cart.ts`, `settings.ts`, `favourites.ts`) import `STORAGE_KEYS` from `storage-keys.ts`. `theme.ts` alone uses a raw string. If the key needs to change or be referenced elsewhere, it cannot be found via the canonical source.

**Fix:**
1. Add to `src/lib/storage-keys.ts`:
   ```ts
   ADMIN_THEME: 'admin-theme',
   ```
2. In `src/store/theme.ts`:
   ```ts
   import { STORAGE_KEYS } from '@/lib/storage-keys'
   ...
   persist(..., { name: STORAGE_KEYS.ADMIN_THEME })
   ```

**Status:** ⬜

---

## What's Already Good

- **All IDs are correctly typed as `string` (UUID).** No `id: number` found anywhere in types or components. The `Role` numeric enum in `auth.ts` is only used for RBAC comparisons, not as entity identifiers.
- **Zod coverage is strong across all admin and auth forms.** Login, register, product, topping, ingredient, combo, category, staff, and todo forms all use `zodResolver` with explicit schemas. No form submits raw unvalidated data.
- **API response types match snake_case contract.** `src/types/product.ts`, `order.ts`, `staff.ts`, `auth.ts` all use `image_path`, `is_available`, `created_at`, `toppings_snapshot` — matching the BE field names. The `Ingredient` type intentionally uses camelCase because the BE handler (`ingredient_handler.go`) serialises those fields as camelCase.
- **`api-client.ts` is the single gateway.** All production API calls go through `@/lib/api-client` with typed return values. The `TableGrid.tsx` direct-`axios` usage is a demo-only simulation helper on the marketing landing page, not a production data path.
- **Payment status uses `'completed'` (not `'success'`).** The `Payment` interface on line 21 of the payment page correctly defines `status: 'pending' | 'completed' | 'failed'`, matching the contract.
- **No `@ts-ignore` or `@ts-expect-error` suppressions exist anywhere in the codebase.**
