# Admin Products — Code Bugs Found by the BE Trace

> **TL;DR:** **3 code bugs** surfaced tracing `/admin/products` on branch
> `experience_claude.md_system_1`. These are **code bugs, not stale docs** — the running FE and BE
> code disagree with each other (or with the documented contract). **A doc edit cannot fix them;
> only an app-code change can.** The `/page-doc-set` skill does NOT touch app code — it records
> them here so the owner can register a fix.
> Anchor: [admin_products_be.md](admin_products_be.md) · Decision Log entry: 2026-06-14 (DRIFT row
> naming this file) in [../../../07_business_logic/LOGIC_INDEX.md](../../../07_business_logic/LOGIC_INDEX.md).

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | Availability toggle is a no-op — always 400s | 🔴 High | `/admin/products` (table badge); the dead `ToggleProductAvailability` query | **BE** |
| 2 | `POST /products` silently drops `is_available` | 🟡 Low | product create (latent — no FE trigger today) | **BE** |
| 3 | `DELETE /products/:id` has no active-order guard | 🟠 Med | `/admin/products` (admin delete); dead FE 409 branch | BE (guard) or FE (remove branch) |

---

## Bug 1 — Availability toggle never works (always 400) 🔴

**Symptom.** On `/admin/products`, clicking the green "Đang bán" / grey "Hết hàng" badge to flip a
product's availability does nothing useful — the request fails and the user sees the toast
"Không thể cập nhật trạng thái". A manager **cannot mark a sold-out dish as unavailable** from this
page. (The customer menu filters on `is_available=1`, so the inability to toggle means sold-out
dishes keep showing to customers.)

**Root cause.** The dedicated availability route is wired to the **wrong handler**:

- FE publisher: `toggleAvailability(id, is_available)` →
  `PATCH /products/:id/availability` with body `{ is_available }` **only** —
  [`fe/src/features/admin/admin.api.ts:51-52`](../../../../../fe/src/features/admin/admin.api.ts#L51-L52);
  called from [`page.tsx:44-49`](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L44-L49).
- Route: `main.go:176` points `/products/:id/availability` at **`productH.UpdateProduct`** — the
  same handler as the full `PATCH /products/:id` (`main.go:175`).
- Consumer: `UpdateProduct` binds `updateProductRequest`
  ([`be/internal/handler/product_handler.go:123-131`](../../../../../be/internal/handler/product_handler.go#L123-L131))
  which makes `name`, `price`, `category_id` **required**. The toggle body has none of them →
  `ShouldBindJSON` fails → **400 INVALID_INPUT** (`product_handler.go:136-138`).
- Even if the body *did* bind: `UpdateProductInput`
  ([`be/internal/service/product_service.go:281-289`](../../../../../be/internal/service/product_service.go#L281-L289))
  has **no `is_available` field**, and the `UpdateProduct` SQL
  ([`be/internal/db/products.sql.go:723-726`](../../../../../be/internal/db/products.sql.go#L723-L726))
  never touches the `is_available` column. So the route is incapable of changing availability.
- The correct query already exists but is **wired to nothing**: `ToggleProductAvailability`
  ([`be/internal/db/products.sql.go:667-676`](../../../../../be/internal/db/products.sql.go#L667-L676))
  + repo wrapper ([`be/internal/repository/product_repo.go:82-84`](../../../../../be/internal/repository/product_repo.go#L82-L84)).
  Verified: **no service method calls it** (grep of `be/internal/` finds only the repo/querier
  definitions, no call site).

> Note: `docs/system/02_spec/API_SPEC.md:47` documents the *intended* contract
> (`PATCH /products/:id/availability` · body `is_available` · returns `message`). The code does not
> honor it — this bug is the gap, so API_SPEC is left describing the correct target, not patched to
> match broken code.

**Suggested fix (smallest safe, BE).** Add a thin service method
`ProductService.SetAvailability(ctx, id string, isAvailable bool)` that calls the existing
`repo.ToggleProductAvailability` then `invalidateProductCaches(ctx, id)`; add a dedicated handler
`UpdateAvailability` binding only `{ is_available *bool }`; point `main.go:176` at it. ~30 lines, no
migration, no sqlc regen (the query already exists).

---

## Bug 2 — `POST /products` silently drops `is_available` 🟡

**Symptom.** Creating a product with `is_available: false` still produces an available product.
Latent today — the FE `CreateProductInput`
([`admin.api.ts:21-29`](../../../../../fe/src/features/admin/admin.api.ts#L21-L29)) has no
`is_available` field, so the create form never sends it. It becomes a real bug the moment any caller
(API client, future UI, the fix for Bug 1's create path) tries to create a hidden product.

**Root cause.** The handler accepts and computes the flag, but it is dropped before SQL:

- Handler binds `is_available *bool` and computes `in.IsAvailable` (default `true`, overridden if
  sent) — [`product_handler.go:89,108-113`](../../../../../be/internal/handler/product_handler.go#L108-L113).
- Service `CreateProduct`
  ([`product_service.go:249-278`](../../../../../be/internal/service/product_service.go#L249-L278))
  builds `db.CreateProductParams` **without** an availability field.
- sqlc `CreateProduct` INSERT **hardcodes** `is_available` to `1`
  ([`products.sql.go:82-83`](../../../../../be/internal/db/products.sql.go#L82-L83)).

**Suggested fix (BE).** Add `is_available` to the `CreateProduct` query params + INSERT column list
(`be/db/queries/products.sql`), `sqlc generate`, and forward `in.IsAvailable` in
`CreateProductParams`. Requires an sqlc regen (see the `db-migration` skill workflow for the
generate step).

---

## Bug 3 — `DELETE /products/:id` has no active-order guard (dead FE 409) 🟠

**Symptom.** The FE is written to handle a `409` on delete with a specific message —
"Sản phẩm đang có đơn hàng đang xử lý, không thể xoá"
([`page.tsx:36-37`](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L36-L37)) — but
that 409 is **never emitted**, so the branch is dead. An admin can soft-delete a product that is on
a live (pending/preparing) order, and it silently vanishes from the menu mid-service.

**Root cause.** `ProductService.DeleteProduct`
([`product_service.go:333-339`](../../../../../be/internal/service/product_service.go#L333-L339))
calls `repo.SoftDeleteProduct` unconditionally — no pre-flight check for the product appearing in
any active `order_items`. No `PRODUCT_IN_USE`/equivalent sentinel exists in
`be/internal/service/errors.go`.

> Severity is medium, not high: historical orders are **not** corrupted — `order_items` snapshot
> `name`/`price` at order time (see
> [admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) durability matrix),
> so a delete only affects the *live* menu, not past bills.

**Suggested fix.** Either (BE) add a guard in `DeleteProduct` — count active `order_items` for the
product and return a `409` `AppError` when > 0 — to honor the contract the FE already expects; or
(FE) remove the dead 409 branch if cancel-anytime delete is the intended behaviour. **Owner
decision needed** on which is the desired contract before coding.

---

## Next step

None of these are on [`docs/tasks/MASTER_TASK.md`](../../../../../docs/tasks/MASTER_TASK.md) yet.
Per CLAUDE.md, a fix must be **registered + ALIGNed** before any code change. **Recommended first:
Bug 1** — highest impact (a core admin control is silently broken), smallest safe fix (~30 lines,
no migration, reuses an existing query). Bugs 2 and 3 can follow or be folded into the same task.
