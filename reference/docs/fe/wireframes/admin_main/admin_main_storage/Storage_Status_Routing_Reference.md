# Storage (Kho nguyên liệu) — Status Routing Reference

> Page: `/admin/ingredients` — admin ingredient inventory.
> Every cell below is traced to current code (`file:line`). Where a fact could not be
> confirmed it is marked `❓ UNVERIFIED`.
>
> **This page HAS entity-status routing** — `ingredient.status` (4 values) drives row colour,
> a warning icon, and the status badge. But note: the status is **derived server-side**
> (not stored, not set by any button), so there is **no status-advance flow** — the table
> CRUD buttons are status-independent. See the Action Buttons + Concerns sections.

---

## Live Page Snapshot (`http://localhost:3000/admin/ingredients`, 2026-06-07)

**Not captured.** FE (`:3000` → 200) and BE (`:8080` → 401, auth-gated as expected) were both
up, but the Playwright MCP browser profile was locked by another instance
(`Browser is already in use … mcp-chrome-ef492b3`) — same blocker logged for the C3 run.
The page also requires a `manager`+ authenticated session (RBAC below), so a snapshot needs
both an unlocked profile and a logged-in admin. Re-run when the profile is free.

Everything below is traced from source, not from a live render.

---

## Page Layout

| Zone | Component | Title | When visible |
|------|-----------|-------|--------------|
| A | `StoragePageHeader` | `Kho nguyên liệu` (`StoragePageHeader.tsx:12`) | always |
| B | `IngredientTable` | — (column headers only) | when not loading and not (search-with-no-match) — `page.tsx:191-207` |
| — | `IngredientFormModal` (dynamic import) | `Thêm nguyên liệu` / `Sửa nguyên liệu` (`IngredientFormModal.tsx:101`) | `modal === 'add' \|\| 'edit'` (`page.tsx:209-216`) |
| — | `StockMoveModal` (in `page.tsx`) | `Điều chỉnh kho — {name}` (`page.tsx:54`) | `modal === 'move' && selected` (`page.tsx:218`) — ⚠️ **never reachable**, see Concerns |

States that replace Zone B:
- **Loading** → 5 skeleton bars (`page.tsx:191-196`)
- **Search with no match** → `Không tìm thấy nguyên liệu nào.` (`page.tsx:197-200`)
- **Empty list (no search)** → `Chưa có nguyên liệu nào. Nhấn '+ Thêm nguyên liệu' để bắt đầu.` (`IngredientTable.tsx:44-50`)
- **Error** → banner `Không tải được danh sách. Thử lại.` (`page.tsx:185-189`)

---

## Ingredient DB Statuses (derived — not a stored column)

`ingredients` has **no `status` column** (`DB_SCHEMA_SUMMARY.md:311-322`). The status is
computed per-request by the BE handler `ingredientStatus()` (`ingredient_handler.go:14-26`)
from `current_stock`, `min_stock`, and `expiry = import_date + shelf_days`. Evaluation order
matters (first match wins):

| Status (FE enum) | Derivation (in order, `ingredient_handler.go:14-26`) | Meaning |
|------------------|------------------------------------------------------|---------|
| `out_of_stock` | `current_stock == 0` | Hết sạch tồn kho |
| `expiring_soon` | `expiry < now + 7 days` | Sắp/đã quá hạn sử dụng (within 7 days) |
| `low_stock` | `current_stock <= min_stock` | Tồn kho dưới ngưỡng cảnh báo |
| `in_stock` | none of the above | Bình thường |

FE enum source: `admin.api.ts:221` (`'in_stock' \| 'low_stock' \| 'expiring_soon' \| 'out_of_stock'`).

> ⚠️ Because order is "out_of_stock → expiring_soon → low_stock", an item that is **both**
> low and expiring shows `expiring_soon`; an item at qty 0 shows `out_of_stock` even if also
> expired. The tracker note's earlier guess (`ok/expiring_soon/expired`) was wrong — the real
> enum is the 4 values above.

---

## Ingredient Statuses — Which Section Each Appears In

The table does **not** filter by status — the only filter is a client-side name search
(`page.tsx:173-175`). So every status renders in Zone B. Zone A never shows status.

| Status | Vietnamese label (badge) | Badge colour | A (Header) | B (Table) |
|--------|--------------------------|--------------|:----------:|:---------:|
| `in_stock` | `Còn hàng ✓` | green (`IngredientTable.tsx:18`) | ❌ | ✅ |
| `low_stock` | `Sắp hết` | yellow (`:19`) | ❌ | ✅ |
| `expiring_soon` | `Sắp hết hạn` | orange (`:20`) | ❌ | ✅ (row tinted orange + ⚠ icon) |
| `out_of_stock` | `Hết hàng` | red (`:21`) | ❌ | ✅ |

Unknown/missing status → falls back to the `in_stock` badge (`IngredientTable.tsx:23`,
`?? map.in_stock`).

---

## IngredientTable — Action Buttons Per Status

There are **no status-changing buttons**. Status is derived server-side, so buttons cannot set
it. The two row buttons are pure CRUD and appear for **every** status, identically.

| Status | `Sửa` (edit) | `Xóa` (delete) | Status-advance button? |
|--------|:------------:|:--------------:|:----------------------:|
| any of the 4 | ✅ `onEdit(item)` → opens edit modal (`IngredientTable.tsx:90-95`) | ✅ `confirm()` → `onDelete(id)` (`:96-103`) | ❌ none exists |

- `Sửa` → `setSelected(ing); setModal('edit')` (`page.tsx:204`) → `IngredientFormModal` in edit mode.
- `Xóa` → native `confirm("Xóa nguyên liệu \"{name}\"?")`, then `deleteMut.mutate(id)` (`page.tsx:205`, `IngredientTable.tsx:97-99`).

How status *actually* changes (indirectly, no dedicated button):
- Editing `importDate` / `shelfDays` moves the computed `expiry` → can flip `expiring_soon`.
- Quantity (→ `out_of_stock` / `low_stock`) only changes via **stock movements**, whose modal is
  **unreachable** in the current UI (see Concerns). So after creation, qty-driven statuses are
  effectively frozen at whatever the seed/initial qty produced.

---

## IngredientTable — Rules

- **Order:** rows render in the order returned by `GET /admin/ingredients` (no client sort);
  `STT` column is just `idx + 1` (`IngredientTable.tsx:74`). BE list order is `❓ UNVERIFIED`
  (not traced into the repo query for this run).
- **Row tint:** only `expiring_soon` rows get `bg-orange-50 border-orange-200` (`:31-33`).
- **Warning icon:** `⚠` prefix in the STT cell only for `expiring_soon` (`:71-73`).
- **Quantity colour:** red+bold when `quantity <= warningThreshold` (`qtyClass`, `:35-37`).
  ⚠️ This is an **independent FE re-derivation** of "low" using `warningThreshold`, separate from
  the BE `status` field — a row can show a red quantity yet a non-`low_stock` badge (e.g. a
  qty-0 item is `out_of_stock` but its quantity also renders red). Cosmetic, not wired to status.
- **Expiry colour:** red+bold only when `status === 'expiring_soon'` (`expiryClass`, `:39-41`).
- **Date format:** `expiryDate`/`importDate` come as `YYYY-MM-DD`, rendered `DD/MM/YYYY`
  (`formatDate`, `:10-14`); empty → `—`.
- **Columns:** STT · Tên nguyên liệu · Đơn vị · Số lượng tồn · Ngày nhập · Hạn SD · Trạng thái · Thao tác (`:57-64`).

---

## What Information Comes FROM BE (reads)

| Query key | Endpoint | Params | staleTime | enabled gating |
|-----------|----------|--------|-----------|----------------|
| `['admin','ingredients']` | `GET /admin/ingredients` (`admin.api.ts:261-262`) | none | `60_000` ms (`page.tsx:118`) | none — runs on mount (`page.tsx:115-119`) |

**Fields received** per `Ingredient` (`admin.api.ts:223-235`, produced by `toIngredientJSON`
`ingredient_handler.go:28-43`):
`id` · `name` · `unit` · `quantity` (← `current_stock`) · `warningThreshold` (← `min_stock`) ·
`importDate` (`YYYY-MM-DD`) · `shelfDays` · `expiryDate` (`YYYY-MM-DD`, **computed** =
`import_date + shelf_days`) · `status` (**computed**, 4-value enum) · `createdAt` · `updatedAt`.

- Client-side enrichment: **none**. The only post-fetch processing is the name-search filter
  (`page.tsx:173-175`).
- `getLowStock` (`GET /admin/ingredients/low-stock`, `admin.api.ts:264-265`) is **defined but not
  used** on this page — no `useQuery` references it here.

---

## What Information Is SENT TO BE (writes)

Four mutations, all keyed off the table / modals. On success each `invalidateQueries(['admin','ingredients'])`.

### Create — `POST /admin/ingredients` (`createMut`, `page.tsx:121-135`)
Builder: `IngredientFormModal.submit()` (`IngredientFormModal.tsx:81-90`).
```json
{
  "name": "string",
  "unit": "string",
  "importDate": "YYYY-MM-DD",
  "shelfDays": 90,
  "initialQuantity": 0,
  "warningThreshold": 0
}
```
- Success toast: `Đã thêm nguyên liệu`.
- Error: HTTP **409** → `Nguyên liệu này đã tồn tại.`; else → `Có lỗi xảy ra` (`page.tsx:128-134`).

### Update — `PATCH /admin/ingredients/:id` (`updateMut`, `page.tsx:137-146`)
Builder: same modal in edit mode (`IngredientFormModal.tsx:73-80`).
```json
{
  "name": "string",
  "unit": "string",
  "importDate": "YYYY-MM-DD",
  "shelfDays": 90,
  "warningThreshold": 0
}
```
- **No `initialQuantity`** — the quantity field is `disabled` in edit mode (`IngredientFormModal.tsx:146`),
  and the BE PATCH handler doesn't accept it either (`ingredient_handler.go:129-135`).
- Success toast: `Đã cập nhật nguyên liệu`. Error → `Có lỗi xảy ra`.

### Delete — `DELETE /admin/ingredients/:id` (`deleteMut`, `page.tsx:148-161`)
- Triggered after native `confirm()` in the row.
- Success toast: `Đã xóa nguyên liệu`.
- Error: HTTP **422** → `Không thể xóa: nguyên liệu đang được sử dụng.`; else → `Có lỗi xảy ra`.

### Stock movement — `POST /admin/stock-movements` (`StockMoveModal`, `page.tsx:35-48`)
Builder: `StockMoveModal` form (`page.tsx:36-41`).
```json
{ "ingredient_id": "uuid", "type": "in | out | adjustment", "quantity": 1, "note": "string?" }
```
- Success toast: `Đã cập nhật tồn kho`. Error → `Có lỗi xảy ra`.
- ⚠️ **Unreachable from current UI** — `setModal('move')` is never called (the table exposes only
  `onEdit`/`onDelete`). The modal + mutation are dead code today. See Concerns.

---

## How It Manages Data CROSS-PAGE

| Store | localStorage key | Persisted? | Carries across pages | File |
|-------|------------------|------------|----------------------|------|
| — | — | — | **none** | — |

- **No Zustand store, no localStorage, no `partialize`/`persist`.** This page is pure
  server-state (TanStack Query) + local component `useState` for `searchQuery`, `modal`,
  `selected` (`page.tsx:111-113`).
- **Auth:** the access token is attached by the shared axios interceptor in `lib/api-client.ts`
  (Zustand memory only — per `fe/CLAUDE.md`), not by this page.
- **End-to-end loop:** mount → `GET /admin/ingredients` (60s stale) → render table → open modal →
  `POST/PATCH/DELETE` → on success `invalidateQueries(['admin','ingredients'])` → refetch →
  re-render. Nothing leaves the page; no handoff to other routes.

---

## RBAC (BE route group)

All under `v1.Group("/admin")` with `authMW` + `middleware.AtLeast("manager")` (`main.go:294-305`):

| Action | Method · path | Min role |
|--------|---------------|----------|
| List / Get / Low-stock | `GET /admin/ingredients[...]` | manager |
| Create | `POST /admin/ingredients` | manager |
| Update | `PATCH /admin/ingredients/:id` | manager |
| Stock movement | `POST /admin/stock-movements` | manager |
| **Delete** | `DELETE /admin/ingredients/:id` | **admin** (sub-group `AtLeast("admin")`, `main.go:311-313`) |

⚠️ FE shows the `Xóa` button to any manager who can load the page, but BE rejects delete for
non-admins. A manager will get the generic `Có lỗi xảy ra` toast (no 403-specific message).

---

## Concerns

1. **🟠 Dead stock-movement flow.** `StockMoveModal` + `postStockMovement` exist, but
   `setModal('move')` is never called (`page.tsx` only sets `'add'`/`'edit'`). The Nhập/Xuất/Điều
   chỉnh kho feature is unreachable from the UI. Consequence: after creation, quantity can't be
   changed via the app → `out_of_stock`/`low_stock` statuses are only reachable via seed data or
   direct DB/API calls.
2. **🟠 Delete RBAC mismatch.** `Xóa` is shown to all managers (FE) but BE allows delete for
   `admin` only. Manager delete fails with a generic toast, not a clear "permission" message.
3. **🟡 Two "low" signals that can disagree.** Red quantity text (`qty <= warningThreshold`,
   FE-derived) vs the `low_stock` badge (BE-derived, but suppressed when `out_of_stock`/
   `expiring_soon` win). A qty-0 row shows red quantity + `Hết hàng` badge (not `Sắp hết`).
4. **🟡 No 403/permission-specific toasts** for delete; only 409 (create dup) and 422 (delete
   in-use) are mapped.
5. **ℹ️ No pagination** — full list fetched, filtered client-side by name only (open question
   from `conccern.md:11` still unresolved in code).

---

*Generated by `/status-routing-reference admin_main/admin_main_storage` — 2026-06-07.*
