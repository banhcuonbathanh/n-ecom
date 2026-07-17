# Admin Products — Doc vs. Code (Detailed Comparison)

> **Scope:** a read-only audit of the `/admin/products` doc-set against the running FE/BE code on
> branch `experience_claude.md_system_1_test_iphon2_change_code`. Five axes: ① component visuals
> ② cross-component dataflow ③ cross-page dataflow ④ loading behaviour ⑤ FE⇄BE data model.
> **Read-only — no app code and no page doc was changed by this run.** Produced by 5 parallel Sonnet
> agents (one per area); every 🔴 was re-verified by hand against source. Date: 2026-06-21.
>
> Companion files: [VI mirror](COMPARISON_DOC_VS_CODE_DETAILED_VI.md) ·
> [Visual mockup (VI)](COMPARISON_VISUAL_MOCKUP_VI.md). Doc-set audited:
> [admin_products.md](admin_products.md) · [_be.md](admin_products_be.md) ·
> [_crosscomponent_dataflow.md](admin_products_crosscomponent_dataflow.md) ·
> [_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) · [_loading.md](admin_products_loading.md) ·
> [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md).
>
> **Code wins.** Every "Code reality" cell cites `file:line` on the audited branch. The 3 code bugs
> below were already honestly documented in [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) — they are listed
> here because the tracker requires every 🔴 to roll up, not because the doc-set hides them.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals | **Drifted** — wireframe missing a column + draws a control that doesn't exist | 2 | 6 | 3 |
| ② Cross-component dataflow | **Faithful** — every query/mutation/store claim verified; only line off-by-ones | 0 | 7 | 15+ |
| ③ Cross-page dataflow | **Faithful** — cache keys, no-SSE, snapshot all correct; main.go lines stale + 1 unaudited FE key | 0 | 5 | 20+ |
| ④ Loading behaviour | **Mostly faithful** — but the "lazy-load on modal open" narrative is wrong (2 files) | 1 | 4 | 18+ |
| ⑤ FE⇄BE data model | **Faithful** — all handlers/SQL/auth/bugs correct; every main.go route line stale (~+13) | 0 | 13 | 30+ |
| **Code bugs (re-confirmed, not doc drift)** | All 3 from PRODUCTS_BUGS.md still real on this branch | 1 | 1 | — |

**Bottom line:** the four *behavioural* docs (`_be`, `_crosscomponent`, `_crosspage`, `_loading`) are
high-quality, source-traced, and substantively correct — their only systematic flaw is stale
`main.go` route line numbers (the known project-wide +13 drift). The **visual** doc
(`admin_products.md`) is where the real contradictions live: its ASCII wireframe is missing the
Topping column and draws an availability switch inside the modal that does not (and cannot) exist.
The `_loading` + `_crosscomponent` docs share one wrong mental model: that the modal lazy-loads on
open.

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

**1. 🔴 Doc fix — Wireframe is missing the entire "Topping" column.**
`admin_products.md:18-23` draws the table as `[img] Tên · Danh mục · Giá · Còn hàng · HĐ` (5 columns).
The real table renders **7 `<th>`**: `(img) · Tên sản phẩm · Danh mục · **Topping** · Giá · Trạng
thái · (actions)` (`ProductsTable.tsx:34-40`), and the Topping cell renders up to 2 topping pills +
a `+N more` overflow chip (`ProductsTable.tsx:67-83`). The doc also labels the status column "Còn
hàng" where the code header reads **"Trạng thái"** (`ProductsTable.tsx:39`). The wireframe under-draws
the table by a whole data column.

**2. 🔴 Doc fix — The modal's "công tắc còn hàng" (availability switch) does not exist.**
`admin_products.md:25-26` says the form modal contains a "công tắc còn hàng". `ProductFormModal.tsx`
renders exactly seven controls — Danh mục (`:137`), Tên (`:155`), Mô tả (`:165`), Hình ảnh (`:174`),
Giá (`:219`), Thứ tự (`:229`), Topping (`:239`) — and Huỷ/Lưu (`:268`/`:275`). There is **no
availability control**, and none is possible: the Zod schema (`ProductFormModal.tsx:15-22`) and the
save payload (`:104`) have no `is_available` field. **This compounds Bug 1:** since the table badge
toggle is broken (always 400s) *and* the modal has no switch, there is **no working UI path to set a
product's availability anywhere on this page**.

**3. 🔴 Doc fix — The modal is NOT lazy-loaded on open; it (and its 2 sub-queries) load on page mount.**
`admin_products_loading.md:88-91` (+ Flag 3) and `admin_products_crosscomponent_dataflow.md:423-426`
both claim the `dynamic()` modal chunk and its `['categories']` / `['admin','toppings']` queries do
not fire until the modal is first opened. But `page.tsx:130-135` renders `<ProductFormModal
open={modal.open} …>` **unconditionally** — it is always in the React tree, so `next/dynamic` fetches
the chunk on page mount and the two `useQuery` hooks (`ProductFormModal.tsx:39-48`, which sit *above*
the `if (!open) return null` guard at `:124`) fire on page mount too. The "brief first-open
chunk-download gap" and "cold open may show a brief loading state for the dropdowns" do not happen.

**4. 🔴 Code bug (Bug 1, re-confirmed) — availability toggle is a no-op, always 400.**
`main.go:189` wires `PATCH /products/:id/availability` to `productH.UpdateProduct`, whose
`updateProductRequest` requires `name`/`price`/`category_id` (`product_handler.go:123-131`) — the
FE's `{is_available}`-only body (`admin.api.ts:51-52`) fails `ShouldBindJSON` → 400. Even if it bound,
`UpdateProductInput` has no `is_available` field (`product_service.go:280-289`) and the UPDATE SQL
never touches the column (`products.sql.go:723-726`). The purpose-built `ToggleProductAvailability`
query (`products.sql.go:667-676`) + repo wrapper (`product_repo.go:82-84`) exist but have **zero
service callers** (grep-verified). Full detail: [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1.

**5. 🟡 Code bug (Bug 2, re-confirmed) — `POST /products` silently drops `is_available`.**
`CreateProductInput` carries `IsAvailable` (`product_service.go:244`) but `CreateProduct` builds
`db.CreateProductParams` without it (`:260-268`), and the INSERT hardcodes `is_available = 1`
(`products.sql.go:82-83`). Latent (the FE never sends the field). Detail: PRODUCTS_BUGS.md #2.

**6. 🟠 Code bug (Bug 3, re-confirmed) — `DELETE /products/:id` has no active-order guard.**
`DeleteProduct` soft-deletes unconditionally (`product_service.go:332-339`); no `PRODUCT_IN_USE`
sentinel exists in `service/errors.go`. The FE's 409 branch ("…đang có đơn hàng…", `page.tsx:36-37`)
is therefore dead. Historical orders are safe (snapshotted name/price). Detail: PRODUCTS_BUGS.md #3.

---

## Dead / Unreachable Code Found

- **`ToggleProductAvailability`** — SQL (`products.sql.go:667-676`) + repo wrapper
  (`product_repo.go:82-84`) compile but have **no service call site** (grep across
  `be/internal/service/`). Dead until Bug 1 is fixed.
- **Delete 409 FE branch** — `page.tsx:36-37` handles a 409 the BE never emits (Bug 3). Dead.
- **`deleteMut.isPending` / `toggleMut.isPending`** — computed by TanStack Query, never read in any
  JSX (`page.tsx`, `ProductsTable.tsx`). No double-click guard on Xóa / availability badge.
- **`['products-all']` customer-menu query** (`menu/page.tsx:59-63`) — fetches `/products` without
  the `is_available` filter and is **never invalidated** by any admin write; cross-page only,
  surfaced here as a staleness gap (see Area ③).

---

## Area ① — Component Visuals

**Verdict: Drifted.** The behavioural docs are accurate, but the wireframe in `admin_products.md`
under-draws the table and over-draws the modal.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Table columns | ASCII: `[img] Tên · Danh mục · Giá · Còn hàng · HĐ` (5) | 7 `<th>`: `(img) · Tên sản phẩm · Danh mục · Topping · Giá · Trạng thái · (actions)` — `ProductsTable.tsx:34-40` | 🔴 | Add the **Topping** column to the wireframe |
| Status column header | `Còn hàng` | `Trạng thái` — `ProductsTable.tsx:39` | 🟡 | Rename column to `Trạng thái` |
| Modal availability switch | "công tắc còn hàng" in the form modal — `admin_products.md:26` | No availability control in `ProductFormModal.tsx` (fields `:137`–`:239`); no `is_available` in schema `:15-22` or payload `:104` | 🔴 | Remove the switch from the modal wireframe; note availability is (intended to be) set via the table badge only |
| Availability cell type | ASCII implies a toggle/radio (`● bật / ○ tắt`) | Clickable `<Badge>` with `onClick`, `cursor-pointer` — `ProductsTable.tsx:87-93` | 🟡 | Note it is a clickable Badge, not a switch |
| Availability labels | `● bật` / `○ tắt` | `Đang bán` / `Hết hàng` — `ProductsTable.tsx:92` | 🟡 | Update labels in the wireframe |
| Seed button | Absent from ASCII + Zones | `🌱 Dữ liệu mẫu` rendered — `ProductPageHeader.tsx:13-18`, wired `page.tsx:120` | 🟡 | Add the seed button to Zone A |
| Row action buttons | `[✎]` edit · `[🗑]` delete (emoji) | Text buttons `Sửa` (`ProductsTable.tsx:101`) · `Xóa` (`:107`) | 🟡 | Use text labels (or note they're text, not icons) |
| Modal field order | `tên · danh mục ▾ · giá · mô tả · ảnh · topping · switch` | `Danh mục → Tên → Mô tả → Hình ảnh → Giá + Thứ tự → Topping` — `ProductFormModal.tsx:137-239` | 🟡 | Reorder + add the `Thứ tự` field |
| Modal save = "multipart for image" | Zones table: `createProduct/updateProduct (multipart for image)` | Image is a **separate** `uploadFile` call (`ProductFormModal.tsx:89`); the product save is JSON (`:104-107`) | 🟡 | Note image upload is a separate call; save body is JSON |
| Header / modal button labels | `+ Thêm sản phẩm` · `[Lưu] [Huỷ]` | Match — `ProductPageHeader.tsx:24`, `ProductFormModal.tsx:273,280` | 🟢 | — |

**Verified-matching:** header count text "Sản phẩm (N)"; the `🍜` image-placeholder; the topping
"Miễn phí / +price" sub-labels; the modal title "Sửa/Thêm sản phẩm".

---

## Area ② — Cross-Component Dataflow

**Verdict: Faithful.** Every architectural claim in `admin_products_crosscomponent_dataflow.md` is
confirmed against source — the products query (`page.tsx:22-26`, key `['admin','products']`,
`staleTime 30_000`), all three mutations, the invalidation pattern, the dynamic import, the two
modal-local queries, the `Product` type shape, and the "no Zustand on this page" assertion. The only
issues are cosmetic line off-by-ones and one omitted detail.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Save toast | static `'Đã cập nhật sản phẩm'` | dynamic: edit→`'Đã cập nhật sản phẩm'`, add→`'Đã thêm sản phẩm'` — `ProductFormModal.tsx:111` | 🟡 | Note both branches |
| Save button disable | `disabled` on `saveMut.isPending` | also disabled when `categories.length === 0` — `ProductFormModal.tsx:277` | 🟡 | Add the 2nd condition |
| `ProductPageHeader` props block | `count` at `page.tsx:122` | block `:117-122`; `count` is `:118` (`:122` is `seedLoading`) | 🟡 | Fix line refs |
| Toggle badge block | `ProductsTable.tsx:88-91` | `:87-93` | 🟡 | Fix range |
| Edit button block | `ProductsTable.tsx:97-100` | `:97-101` ("Sửa" at `:101`) | 🟡 | Fix range |
| `saveMut.onSuccess` | `:109-113` | logic `:109-112` (`:113` is closing `},`) | 🟡 | Fix range |
| Full table JSX range | `:43-113` | `:43-116` | 🟡 | Fix range |

**Verified-matching:** `page.tsx` query `:22-26`; `modal` useState `:19`; `seedLoading` `:20`;
`deleteMut` `:28-42`; `toggleMut` `:44-49`; invalidations `:31,47,106`; `listProducts`/`updateProduct`
`admin.api.ts:39-40`/`45-47`; modal queries `:39-48`; dynamic import `:13-15`; `onEdit` wiring
`:126`; `Product` type `product.ts:14-25`; no Zustand import anywhere.

---

## Area ③ — Cross-Page Dataflow

**Verdict: Faithful.** Cache-key names, invalidation wiring, the "no SSE/WS, no localStorage" claim,
the price/name snapshot in `order_items`, and the 5-min vs 30-s staleTime split are all correct. Two
classes of issue: stale `main.go` route lines (the known +13 drift), and one unaudited FE cache key.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Secondary menu query | not mentioned | `menu/page.tsx:59-63` runs a 2nd `['products-all']` query fetching `/products` **without** `is_available` and **never invalidated** by admin writes | 🟡 | Document this key + its staleness window |
| `GET /products` route | `main.go:168` | `main.go:181` | 🟡 | Update line |
| `PATCH /:id/availability` route | `main.go:176` | `main.go:189` (handler `UpdateProduct` correct) | 🟡 | Update line |
| Customer menu query block | `menu/page.tsx:59-76`, key `['products',…]` | main filtered query `:65-77`, key `['products', selectedCategory, searchQuery]`; staleTime `:75` | 🟡 | Fix block + 3-part key |
| `order_items` INSERT | `orders.sql.go:55-70` | `:55-57` (SQL) + params `:60-71` | 🟢 | Minor |
| `ListProducts` cache read | "reads products:list at `:173`" | cache-check `:166`, DB fallback `:173` — substance correct | 🟢 | Clarify |

**Verified-matching:** `invalidateProductCaches` `:709-717` (Dels `products:list` + `categories:list`
+ `product:<id>`); `invalidateToppingCaches` `:719-721`; `productCacheTTL` `:21`; create/update/delete
invalidate at `:276/:328/:337`; `ListAllProducts` uncached `:194-209`; `ListProductsAvailable`
`is_available=1` `:467-470`; **no product pub/sub channel** (grep); **no localStorage** on the page;
POS query `pos/page.tsx:45-51`; FE invalidations `page.tsx:31,47,106`.

---

## Area ④ — Loading Behaviour

**Verdict: Mostly faithful** — line-accurate on every state machine *except* the dynamic-import
narrative (headline #3), which is wrong in two files.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Dynamic modal load timing | chunk + sub-queries fire on first **open** — `_loading.md:88-91` + Flag 3; `_crosscomponent.md:423-426` | `<ProductFormModal>` rendered unconditionally `page.tsx:130-135`; chunk + `useQuery` `:39-48` fire on **page mount** (above the `:124` open-guard) | 🔴 | Rewrite: modal mounts on page load; chunk + dropdown queries are not deferred to open |
| Seed button label | `Dữ liệu mẫu` | `🌱 Dữ liệu mẫu` (emoji) — `ProductPageHeader.tsx:18` | 🟡 | Add emoji |
| `handleDelete` close line | `page.tsx:53` | `:54` | 🟡 | Fix |
| `toggleMut` close line | `page.tsx:48` | `:49` | 🟡 | Fix |
| `seedLoading` first set | `page.tsx:56` | `:57` | 🟡 | Fix |

**Verified-matching:** AuthGuard returns `null` (no spinner) `:23`, `getMe` `:17`, push `/login`
`:19`; RoleGuard message `:16-21`; route spinner `loading.tsx:1-7` (`border-t-orange-500`); products
query `:22-26`; bare `<p>Đang tải...</p>` (not a skeleton) `ProductsTable.tsx:18`; 3-state order
(loading→empty→table); EmptyState `🍜` + message `EmptyState.tsx:6-13`; modal sub-query empty-states
`:138-139`, `:240-241`; Save disabled `:277`; upload `uploading` gate `:199,202`;
`deleteMut/toggleMut.isPending` unused (Flag 4 correct).

---

## Area ⑤ — FE⇄BE Data Model

**Verdict: Faithful.** Every handler name, service method, SQL behaviour, DTO field, auth gate,
caching detail, and all 3 bugs are accurately described in `admin_products_be.md`. The single
systematic flaw is stale `main.go` route line numbers — the entire products/categories/toppings/
staff/files block has shifted **~+13 lines** (the project-wide drift; see Cross-Page Concerns in the
tracker).

| Endpoint / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Products route block | `main.go:167-181` | `:179-195` | 🟡 | Update |
| `mgr.Use` + `GET /all` | `main.go:172-173` | `:185-186` | 🟡 | Update |
| `PATCH /:id` / `/:id/availability` | `:175` / `:176` | `:188` / `:189` | 🟡 | Update |
| `DELETE /:id` (admin) | `:180-181` | `:192-194` | 🟡 | Update |
| Categories / Toppings blocks | `:185-196` / `:200-211` | `:197-210` / `:212-225` | 🟡 | Update |
| Staff / Files blocks | `:280-290` / `:326-328` | `:292-304` / `:339-341` | 🟡 | Update |
| `GET /categories` / `/toppings` public | `:186` / `:201` | `:199` / `:214` | 🟡 | Update |
| `buildCategoryMap` call | `product_service.go:198` | `:199` | 🟡 | Update |
| `updateProduct` FE | `admin.api.ts:45-47` | `:45-46` | 🟢 | Minor |
| `is_orphan=1` on upload | `file_handler.go:81` | set in `files.sql.go` (not visible in handler) | 🟢 | Cite `files.sql.go` |

**Verified-matching (handler/service/SQL all line-accurate):** `ListAllProducts` `product_handler.go:57-69`;
`productJSON` `:443-460` (10 fields correct); `createProductRequest` `:82-91`; `updateProductRequest`
requires name/price/category_id `:123-131`; `DeleteProduct` `:157-164`; `ListAllProducts` service
uncached N+1 `:193-209`; `CreateProduct` drops `is_available` `:260-268`; `UpdateProductInput` no
availability `:280-289`; `DeleteProduct` no guard `:332-339`; INSERT hardcodes `is_available=1`
`products.sql.go:82-83`; UPDATE skips it `:723-726`; `ToggleProductAvailability` exists unwired
`:667-676`; no `PRODUCT_IN_USE` in `errors.go`; `file_handler.Upload` `:38-98`, `maxFileSize` `:19`.

**Bug status (grep-verified on this branch):** Bug 1 **CONFIRMED-STILL-REAL** · Bug 2
**CONFIRMED-STILL-REAL** · Bug 3 **CONFIRMED-STILL-REAL**.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target |
|---|---|---|---|
| 1 | 🔴 Code bug | Wire availability toggle: add `ProductService.SetAvailability` → `repo.ToggleProductAvailability` + `invalidateProductCaches`; add a handler binding `{is_available}` only; point `main.go:189` at it (Bug 1) | `product_service.go`, `product_handler.go`, `main.go` |
| 2 | 🔴 Doc fix | Add the **Topping** column to the table wireframe; rename status header to `Trạng thái`; relabel badge `Đang bán/Hết hàng` | `admin_products.md` |
| 3 | 🔴 Doc fix | Remove the non-existent "công tắc còn hàng" from the modal wireframe; note availability is set via the table badge (currently broken — link Bug 1) | `admin_products.md` |
| 4 | 🔴 Doc fix | Correct the dynamic-import narrative: the modal + its 2 sub-queries load on **page mount**, not first open | `admin_products_loading.md` (Flag 3 + §5), `admin_products_crosscomponent_dataflow.md` §7 |
| 5 | 🟠 Code/owner | Decide DELETE contract: BE active-order guard (409) vs FE removes the dead 409 branch (Bug 3) | `product_service.go` or `page.tsx` |
| 6 | 🟡 Code bug | Forward `is_available` through `CreateProduct` params + INSERT (needs sqlc regen) (Bug 2) | `be/db/queries/products.sql`, `product_service.go` |
| 7 | 🟡 Doc fix | Add the seed button to the wireframe; fix modal field order + "separate uploadFile (not multipart)" note | `admin_products.md` |
| 8 | 🟡 Doc fix | Batch-refresh stale `main.go` route lines (~+13) and the menu/page query block + 3-part key | `admin_products_be.md`, `admin_products_crosspage_dataflow.md` |
| 9 | 🟡 Doc fix | Document the secondary `['products-all']` menu query + its staleness window | `admin_products_crosspage_dataflow.md` |

> **Per CLAUDE.md:** the doc fixes (#2-4, 7-9) are one ALIGNed task; each **code** change (#1, 5, 6)
> must be registered in `docs/tasks/MASTER_TASK.md` before any file is touched. This audit does not
> start either.
