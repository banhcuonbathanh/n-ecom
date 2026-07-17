# Admin Categories — Doc vs. Code (Detailed Audit)

> **Scope:** a read-only doc-vs-code audit of the `/admin/categories` page doc-set against the running
> FE/BE code. Five axes: ① component visuals · ② cross-component dataflow · ③ cross-page dataflow ·
> ④ loading behaviour · ⑤ FE⇄BE data model.
> **Read-only — no code or docs were changed.** This file only records drift.
> Produced by 1 Sonnet area agent (FE⇄BE) + orchestrator-inline tracing (visuals/cross-page/loading);
> every 🔴 re-verified by hand against source.
> **Code wins.** Every "Code reality" cell is cited `file:line` from the current branch
> `experience_claude.md_system_1_test_iphon2_change_code`. Date: 2026-06-21.
>
> **Bottom line: a low-drift, source-faithful doc-set.** There is **no doc-vs-code contradiction**.
> The single 🔴 is a **real FE code bug** (manager sees "Xóa" → silent 403) that the doc-set
> **already documents accurately** (`CATEGORIES_BUGS.md`, `admin_categories.md` Flag 7, `_be.md` Flag 7,
> `SCENARIO_CATEGORY_CRUD.md` 09:38 beat). The only genuine doc drift is **stale `main.go` route line
> numbers (+14)** and the **outdated provenance branch** on all six doc files.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals | ✅ Accurate — ASCII + zones + interactions match `page.tsx` | 0 | 0 | 3 |
| ② Cross-component dataflow | ✅ N/A by design — single client component, no shared store (doc says so) | 0 | 0 | 1 |
| ③ Cross-page dataflow | ✅ Accurate — all FE query line-cites **exact**; cosmetic-tabs claim confirmed | 0 | 1 | 2 |
| ④ Loading behaviour | ✅ Accurate — all 4 layers + branches match, line-cites exact | 0 | 0 | 2 |
| ⑤ FE⇄BE data model | ✅ BE fully correct; only `main.go` route block stale +14 | 1 | 2 | 5 |
| **Total** | **Low-drift, code-faithful** | **1** | **3** | **13** |

> The 🔴 is a **code** bug already on record — not a doc error. No comparison-only findings: every
> code flag below is already captured in the page doc-set.

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

### 🔴 #1 — Manager sees the "Xóa" button but `DELETE /categories/:id` is admin-only → silent, mislabelled 403 (**real FE code bug; doc-accurate**)

- **FE renders "Xóa" for every row, no role check** — `page.tsx:131-136` (`onClick={() => handleDelete(c.id, c.name)}`); `handleDelete` → `deleteMut.mutate(id)` (`page.tsx:79-82`).
- **BE gates DELETE behind admin** — `adm := catR.Group(""); adm.Use(authMW, middleware.AtLeast("admin")); adm.DELETE("/:id", …)` at **`main.go:207-210`** (the doc-set cites the stale `main.go:193-196`/`:194-196`). A `manager` JWT → **403** before the handler runs.
- **`onError` only special-cases 409** — every other status (incl. 403) falls to the catch-all `toast.error('Không thể xóa danh mục')` (`page.tsx:69-76`). The permission failure renders as a generic error.
- **Why it matters:** a manager reaches this page (admin shell guard `minRole=MANAGER`, `layout.tsx:30`), sees a clickable red button that always fails with a misleading message. Same root class as A12 Training Bug 2 and the A3 Products admin-only DELETE button.
- **Status:** ✅ already documented — `CATEGORIES_BUGS.md` Bug 1, `admin_categories.md` Flag 7, `admin_categories_be.md` Flag 7 + Error table, `SCENARIO_CATEGORY_CRUD.md` 09:38. **This is a code fix (FE), not a doc fix**, and is not yet on `MASTER_TASK.md`.

> **No other 🔴.** The Area-5 agent initially raised three 🔴 (FE `Category` type omits
> `description`+`is_active`; `createCategory`/`updateCategory` never send `description`). On hand-review
> these are **by-design, doc-accurate Flags** (`admin_categories.md` Flag 1 + Flag 3, `_be.md` Flag 1 +
> Flag 3): the BE returns/accepts those fields, the FE deliberately ignores them, and the doc says
> exactly that. **Downgraded to 🟢 / by-design — not a contradiction.**

---

## Dead / unreachable components found

**None.** No zero-import component, no unreachable modal. `page.tsx` is a single self-contained client
component (list + RHF modal in one file); `CategoryTabs` (the downstream consumer) is live on `/menu`
and `/pos`. The `Xóa` button is *reachable but ineffective for managers* (🔴 #1) — that is a guard
bug, not dead code.

---

## Area ① — Component visuals

**Verdict:** ✅ Accurate. The ASCII wireframe, the Zones table, and the Key Interactions in
`admin_categories.md` all match the real render in `page.tsx`. The doc even pre-corrected a stale
earlier wireframe (its own Flag 2). Only a couple of line-cites are off by 1.

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| A Header | `Danh mục (N)` + `[+ Thêm danh mục]`, `page.tsx:86-94` | `<h2>Danh mục ({categories.length})</h2>` `page.tsx:87` + button `page.tsx:88-93` | 🟢 | none |
| B Table columns | "Tên danh mục", "Thứ tự", empty action col; text buttons "Sửa"/"Xóa" | `<thead>` `page.tsx:111-116`; rows `page.tsx:119-140`; "Sửa" `page.tsx:129`, "Xóa" `page.tsx:135` | 🟢 | none |
| Client-side sort | `[...categories].sort((a,b)=>a.sort_order-b.sort_order)` `page.tsx:119` | exact at `page.tsx:119` | 🟢 | none |
| Empty state | "Chưa có danh mục nào" `page.tsx:141-147` | exact at `page.tsx:141-147` | 🟢 | none |
| Error state cite | `page.tsx:99-107` | real range `page.tsx:98-107` (off by 1) | 🟢 | retune to `:98-107` |
| Form modal | title add/edit, name + sort_order fields, `[Huỷ][Lưu]`, "Đang lưu..." `page.tsx:153-198` | exact `page.tsx:153-198`; title `:157-159`; "Đang lưu..." `:192` | 🟢 | none |
| Delete confirm | native `confirm('Xóa danh mục "<name>"?')` `page.tsx:80` | exact `page.tsx:80` | 🟢 | none |
| Save 409 → inline | `setError('name', …'Tên danh mục đã tồn tại.')` `page.tsx:55-57` | `page.tsx:55-56`; catch-all toast `'Có lỗi xảy ra'` `page.tsx:58` | 🟢 | none |

**Verified-matching:** header, add/edit/delete interactions (`openAdd` `:32-36`, `openEdit` `:37-41`,
`handleDelete` `:79-82`), table structure, empty/loading/error branches, modal fields, "Thử lại"
`refetch()` `page.tsx:101-106`.

---

## Area ② — Cross-component dataflow

**Verdict:** ✅ N/A by design, and the doc-set says so. `page.tsx` is a **single client component**: all
state is local `useState` (`editItem`/`showModal`, `page.tsx:19-20`) + one RHF instance + one TanStack
query. There is **no shared Zustand store, no sub-components exchanging data** — so there is nothing to
draw. No `admin_categories_crosscomponent_dataflow.md` exists (correct per PAGE_FOLDER_GUIDE: only
needed at ≥3 interacting widgets with a shared store).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| No shared store / no cross-component flow | "N/A for this page" (`SCENARIO_CATEGORY_CRUD.md` §A) | confirmed — local `useState` only `page.tsx:18-26` | 🟢 | none |

---

## Area ③ — Cross-page dataflow

**Verdict:** ✅ Accurate. Every downstream FE query line-cite is **exact**, the Redis-invalidation
propagation model is correct (no SSE/WS, no localStorage), and the "cosmetic tabs" cross-page concern is
confirmed at the handler. Only the `main.go` route cite in the source map is stale.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| FE write invalidations | `qc.invalidateQueries(['admin','categories'])` save `:49` / delete `:66` | exact — `page.tsx:49`, `page.tsx:66` | 🟢 | none |
| Customer `/menu` query | `['categories']`, `staleTime:5*60*1000`, `menu/page.tsx:52-56` | exact `menu/page.tsx:52-56` | 🟢 | none |
| POS query | `['categories']`, `staleTime:5*60*1000`, `pos/page.tsx:39-43` | exact `pos/page.tsx:39-43` | 🟢 | none |
| ProductFormModal query | `['categories']`, `queryFn:listCategories`, `staleTime:60_000`, `:39-43` | exact `ProductFormModal.tsx:39-43`; empty guard `:137-139`; save `disabled` `:277` | 🟢 | none |
| `CategoryTabs` render | tab buttons `:24-36` | exact map `CategoryTabs.tsx:24-36` (component `:10-40`) | 🟢 | none |
| Cosmetic tabs (cross-page concern) | `GET /products` ignores `category_id` → tabs cosmetic | confirmed: `ListProducts` `product_handler.go:42-43` calls `svc.ListProducts(ctx)` with **no params**; POS passes `category_id` (`pos/page.tsx:48`) but it is ignored | 🟢 | none (pre-existing, documented in BE_DOC_TRACKER) |
| `invalidateProductCaches` cite | `product_service.go:709-717` | confirmed `:709-717`, Dels both keys when `id=""` | 🟢 | none |
| `main.go` route cite (source map) | "Category routes … `main.go:185-197`" + `:373` | real `main.go:198-210` (+13/+14) | 🟡 | retune to `:198-210` |

**Verified-matching:** all three downstream `['categories']` consumers, the `enrichProduct`
products-list side-effect rationale, the durability matrix, the F5 behaviour table, "no realtime".

---

## Area ④ — Loading behaviour

**Verdict:** ✅ Accurate. All four loading layers and the three main-content branches match code with
exact line-cites.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Layer 1 — AuthGuard blank | `if (!user) return null` `AuthGuard.tsx:23` | exact `AuthGuard.tsx:23` | 🟢 | none |
| Layer 2 — RoleGuard block | `roleValue < minRole` → "Không có quyền truy cập trang này" `RoleGuard.tsx:16-20` | exact `RoleGuard.tsx:16-20`; wrapped `minRole={Role.MANAGER}` `layout.tsx:30` | 🟢 | none |
| Layer 3 — route spinner | orange spin ring `h-8 w-8 … border-t-orange-500` `admin/loading.tsx:1-7` | exact `admin/loading.tsx:3-4` | 🟢 | none |
| Layer 4 — page query | `['admin','categories']`, `listCategories`, `staleTime:60_000`, `page.tsx:22-26` | exact `page.tsx:22-26` | 🟢 | none |
| Content branches | isLoading→"Đang tải..." `:96-97`; isError→card `:98-107`; success table `:108-151` | exact | 🟢 | none |
| Save in-flight | "Đang lưu..." + `disabled={saveMut.isPending}` `page.tsx:189-192` | exact `page.tsx:189-192` | 🟢 | none |
| Delete no in-flight visual | no spinner/dim on delete | confirmed `page.tsx:79-82` (only `confirm` + toast) | 🟢 | none |

**Verified-matching:** loading layer order, the no-skeleton plain-text gap (Flag 1), no-optimistic-UI
(Flag 2), no `loading.tsx` in the categories folder (Flag 5).

---

## Area ⑤ — FE⇄BE data model

**Verdict:** ✅ The BE is fully correct and almost every Go line-cite is exact. The **only** real drift is
the `main.go` route block, which the file grew past — doc cites `:184-197`, reality is `:198-210`
(**+14**). The handler/service/repo/sqlc cites are all accurate.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Route group `catR` | `v1.Group("/categories")` `main.go:184` | real `main.go:198` (**+14**) | 🟡 | retune route block to `:198-210` |
| GET public / POST·PATCH manager / DELETE admin | `:186` / `:188-191` / `:193-196` | GET `:199`; mgr `AtLeast("manager")` `:201-205`; adm `AtLeast("admin")` `:207-210` — **auth gates correct** | 🟡 | retune line refs only |
| `ListCategories` handler serialises 5 fields | `gin.H{id,name,description,sort_order,is_active}` `:181-187` | confirmed, ends `:188` (off by 1) | 🟢 | retune to `:181-188` |
| NULL `description`→"" | `:177-180` | exact | 🟢 | none |
| `CreateCategory` 201 `{data:{id}}` | `:199-215`, return `:214` | exact | 🟢 | none |
| `UpdateCategory` 200 message | `:224-239`, "Cập nhật danh mục thành công" | exact text `:238` | 🟢 | none |
| Handler doc-comment "PUT" vs PATCH route | Flag 5 — stale comment | confirmed `product_handler.go:223` says PUT; route is PATCH `main.go:204` | 🟢 | (code) fix comment to PATCH |
| `DeleteCategory` 204 | `c.Status(http.StatusNoContent)` `:247` | exact `:247` | 🟢 | none |
| Service methods | `ListCategories` `:344-357`, `CreateCategory` `:365-379` (inval `:377`), `UpdateCategory` `:387-406` (inval `:404`), `DeleteCategory` `:408-427` (inval `:425`) | all exact | 🟢 | none |
| Repo raw SQL | `GetCategoryByName` `:119-126`; `CountProductsByCategory` `:128-134` (products only, not combos) | all exact; combo-blindness confirmed (Flag 6) | 🟢 | none |
| sqlc queries | `CreateCategory` `:23-26` (is_active=1), `ListCategories` `:306-310`, `SoftDeleteCategory` `:623-626`, `UpdateCategory` `:678-682` (full replace) | all exact | 🟢 | none |
| Errors | `ErrNotFound` `:28`, `ErrCategoryHasProducts` `:37`, `ErrCategoryNameConflict` `:38` | confirmed (doc said `:28,37-38`) | 🟢 | none |
| FE `Category` type omits `description`+`is_active` | Flag 1 — by design | confirmed `types/product.ts:1-5` | 🟢 | none (by design) |
| `createCategory`/`updateCategory` never send `description` | Flag 3 — by design | confirmed `admin.api.ts:10-14` | 🟢 | none (by design) |

**Verified-matching:** every handler status code + body, all four service methods with exact ranges,
`invalidateProductCaches` `:709-717`, all repo raw-SQL, all four sqlc queries, all three sentinel errors,
the `is_active` write-once flag (Flag 4), the combo-blind delete guard (Flag 6).

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug (FE) | Hide/disable "Xóa" for `role !== 'admin'` (preferred) **or** add a 403 branch to delete `onError` with an honest message. Already on record in `CATEGORIES_BUGS.md` Bug 1 — **not yet on `MASTER_TASK.md`**. Consider bundling with A12 Training Bug 2 + A3 Products (shared root). | `fe/src/app/(dashboard)/admin/categories/page.tsx:131-136` (or `:69-76`) |
| 2 | 🟡 Doc fix | Retune the `main.go` category-route cites from `:184-197`/`:193-196`/`:194-196` → **`:198-210`/`:207-210`** in `_be.md`, `admin_categories.md` (Flag 7), `CATEGORIES_BUGS.md`, `admin_categories_crosspage_dataflow.md` (source map), `SCENARIO_CATEGORY_CRUD.md` (sources). | the 5 doc files |
| 3 | 🟢 Doc fix | Bump provenance branch on all six doc files: `experience_claude.md_system_1` → `experience_claude.md_system_1_test_iphon2_change_code`. | the 6 doc files |
| 4 | 🟢 Doc fix | Off-by-1 retunes: error state `:99-107`→`:98-107`; handler serialise `:181-187`→`:181-188`. | `admin_categories.md`, `_be.md` |
| 5 | 🟢 Code (optional) | Fix the stale `// UpdateCategory handles PUT …` comment to PATCH (already Flag 5). | `be/internal/handler/product_handler.go:223` |

> **CLAUDE.md note:** doc fixes (#2–#4) are one ALIGNed doc task. Each **code** change (#1, #5) must be
> registered in `docs/tasks/MASTER_TASK.md` and ALIGNed **before any file is touched** — this audit
> changed nothing.
