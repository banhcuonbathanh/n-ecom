# Admin Toppings — Doc vs. Code (Detailed Audit)

> **Scope:** the `/admin/toppings` doc-set (`admin_toppings.md`, `_be.md`, `_crosspage_dataflow.md`,
> `_loading.md`) vs. the real running code on branch
> `experience_claude.md_system_1_test_iphon2_change_code`. Four audit axes (this page has **no**
> `_crosscomponent_dataflow.md`, so the cross-component area is N/A): **(1) component visuals ·
> (3) cross-page dataflow · (4) loading behaviour · (5) FE⇄BE data model.**
> **Read-only — no code or docs were changed.** Every "Code reality" cell is traced from source and
> cited `file:line`; 🔴 items (none this run) would be hand-verified. Produced inline (the BE-trace
> subagent hit a session limit; the orchestrator traced the Go domain by hand instead).
> Date: 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | **Faithful** — ASCII matches render; only abbreviated column copy | 0 | 0 | 3 |
| 3 — Cross-page dataflow | **Accurate** — every cache/invalidation/staleTime claim confirmed | 0 | 1 | 1 |
| 4 — Loading behaviour | **Accurate** — all toppings-specific gates confirmed; one broken sibling link | 0 | 1 | 1 |
| 5 — FE⇄BE data model | **Faithful** — handler/service/repo/SQL/migration all exact; only `main.go` route lines stale | 0 | 1 | 2 |
| **Total** | **Low-drift, source-accurate doc-set** | **0** | **3** | **7** |

**Bottom line:** like `admin_summary`, `admin_staff` and `customer_combo_detail`, this is a
**faithful, code-traced doc-set with zero doc-vs-code contradictions.** Every endpoint, handler,
service, repo function, SQL query and migration line in `_be.md` matches the Go source **exactly**
(handler/service/repo/SQL/migration line numbers are all spot-on). The doc's own `Flags` already
document every real code-quality gap (dead 409 branch, raw-SQL availability write, stale
`product:<id>`, no in-use delete guard). The only genuine doc drift is the **`main.go` route line
numbers (~+13 stale)** — the same systematic drift logged across five prior pages — and a **broken
sibling link** in `_loading.md` to a `_crosscomponent_dataflow.md` file that does not exist.

---

## 🔴 RAISE-MY-VOICE headline findings

**None.** No doc claim contradicts the code. The doc-set tells the truth about the page, including
its warts. The items below are stale line-refs (🟡) and copy (🟢), plus code-quality gaps the doc
**already flags** (not drift).

---

## Dead / unreachable code found

- **FE duplicate-name 409 branch is dead** — `ToppingFormModal.tsx:55-57` maps a `409` response to a
  field error "Tên topping đã tồn tại", but the `toppings` table has **no unique constraint on
  `name`** (`be/migrations/002_products.sql:41-52` — only `PRIMARY KEY (id)` + two non-unique `KEY`
  indexes) and `CreateTopping` does **no duplicate check** (`product_service.go:452-459`;
  `query/products.sql:79-81`). So the BE can never return `409` here — duplicate names insert as
  separate rows. **The doc already flags this** (`_be.md` Flag 4) — confirmed dead, low severity.
- **No other dead/unreachable components** — all 3 zone components (`ToppingPageHeader`,
  `ToppingTable`, `ToppingFormModal`) are imported and rendered by `page.tsx:78-90`; the modal is a
  live `dynamic()` import (`page.tsx:10-12`).

---

## Area 1 — Component visuals

**Verdict: faithful.** The ASCII wireframe and Zones table in `admin_toppings.md` match the real
render of all three components. The only deltas are abbreviated copy in the ASCII drawing.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| ToppingPageHeader | `Topping (6)   [+ Thêm topping]` | `Topping ({count})` + `+ Thêm topping` button (`ToppingPageHeader.tsx:9-15`) | 🟢 | None — exact match (count is dynamic) |
| Table — col 2 header | ASCII draws `Áp dụng cho SP` | real header text is `Áp dụng cho sản phẩm` (`ToppingTable.tsx:33`) | 🟢 | Expand the ASCII abbreviation to match |
| Table — col 5 header | ASCII draws a `Hành động` column header | the 5th `<th>` is **empty** (`<th className="px-4 py-3" />`, `ToppingTable.tsx:36`) — the Sửa/Xóa buttons sit under a blank header | 🟢 | Drop `Hành động` label from the ASCII (or add a label in code) |
| Table — unassigned cell | ASCII draws `Chưa gắn SP` | real text is `Chưa gắn sản phẩm` (`ToppingTable.tsx:57`) | 🟢 | Expand abbreviation in ASCII |
| Table — price / status / actions | `+10.000đ` / `Miễn phí` · `[Có sẵn]`/`[Hết]` · `[Sửa][Xóa]` | `Miễn phí` (green) / `+formatVND(price)` (orange) (`ToppingTable.tsx:60-64`); `<Badge success/muted>` "Có sẵn"/"Hết" (`:66-68`); Sửa + Xóa buttons (`:72-83`) | ✅ | None |
| Form modal | `tên *, giá thêm (0 = Miễn phí), trạng thái (toggle Có sẵn/Hết) [Hủy][Lưu topping]` | `Tên topping *` (`:77`), `Giá thêm (đ)` + helper `0 = Miễn phí` (`:87,94`), `Trạng thái` toggle Có sẵn/Hết (`:99-111`), `[Hủy][Lưu topping]` (`:120,127`) | ✅ | None |
| Zones table — data sources | Table = `listToppings` (`['admin','toppings']`→`GET /toppings`) + `listProducts` (`['admin','products']`→`GET /products/all`); modal = `createTopping`/`updateTopping`, delete on page | `page.tsx:19-29` (both queries, keys, staleTime), `ToppingFormModal.tsx:45-48`, `page.tsx:43-50` (deleteMut) | ✅ | None — exact |

**Verified-matching:** header copy + dynamic count; all 4 row cells (name truncate, product chips,
price color split, status badge, Sửa/Xóa); modal field set, toggle, helper text, buttons; every Zones
data-source mapping. **Key Interactions** (`+Thêm`→modal, `Sửa`→pre-filled modal, `Xóa`→`confirm()`
with N-product warning then `DELETE`, create always `is_available=1`) all confirmed against
`page.tsx:52-69`, `ToppingFormModal.tsx:33-40`, and the BE.

---

## Area 3 — Cross-page dataflow

**Verdict: accurate.** Every cache key, invalidation target, `staleTime`, and the "no realtime push"
model in `_crosspage_dataflow.md` is confirmed in the Go source and the FE.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Write invalidation | all 3 writes `Del toppings:list + products:list`, **never** `product:<id>` | `invalidateToppingCaches` = `rdb.Del(ctx, cacheKeyTopping, cacheKeyProductsList)` (`product_service.go:719-721`); `cacheKeyTopping="toppings:list"` (`:26`), `cacheKeyProductsList="products:list"` (`:25`); `product:<id>` key built at `:213` is never touched by topping writes | ✅ | None |
| Stale `product:<id>` on C4 | customer product-detail serves stale topping price/availability up to 5 min after an edit here | confirmed: topping writes don't Del `product:%s` (`:213,719-721`); TTL = `productCacheTTL = 5*time.Minute` (`:21`) | 🟡 | Real code-quality gap (cache-invalidation asymmetry) — **doc already flags it** (`_be.md` Flag 2). A BE fix would Del `product:<id>` on topping writes; register in MASTER first. |
| No realtime push | topping data has no SSE/WS; pull-only on next fetch | no topping channel in the WS/SSE layer; FE has no topping subscription (`page.tsx` uses only `useQuery`) | ✅ | None |
| Admin TanStack caches | `['admin','toppings']` + `['admin','products']`, 60s stale, browser-local | `page.tsx:20-22, 26-28` (both keys, `staleTime: 60_000`) | ✅ | None |
| FE mutation + API paths | `page.tsx:19-50`, `ToppingFormModal.tsx:44-62`; `admin.api.ts:54-66` | `page.tsx:19-50` ✅, `ToppingFormModal.tsx:44-62` ✅, toppings API block `admin.api.ts:54-66` ✅ | ✅ | None |
| Snapshot safety | edits/deletes never rewrite past orders (`order_items.toppings_snapshot`) | business rule, not on this page's code path — consistent with `_be.md` | ✅ | None |

**Verified-matching:** the whole §0 diagram (DB row + two Redis list caches as the durable hub), the
§2 consumer list (`/menu`, `/pos`, product form all read `products:list`), §4 soft-delete + retained
junction rows, §6 durability matrix.

---

## Area 4 — Loading behaviour

**Verdict: accurate.** Every toppings-specific loading gate, the 3-state table branch, and the
mutation-pending claims are exact. One broken internal link.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Sibling link | `_loading.md:193` links `admin_toppings_crosscomponent_dataflow.md` | that file **does not exist** in the folder (only `_crosspage_dataflow.md` is present) | 🟡 | Remove the dead link (or note the page has no cross-component doc) |
| Table loading gate | `isLoading` → `<p>Đang tải...</p>` (bare text, no skeleton) | `ToppingTable.tsx:15-16` — exact | ✅ | None |
| Empty state | `EmptyState` msg "Chưa có topping nào — nhấn + Thêm topping để bắt đầu" | `ToppingTable.tsx:19-24` — exact | ✅ | None |
| Products side-load | `['admin','products']` has **no** loading gate (`isLoading` not read) → col flashes "Chưa gắn sản phẩm" | `page.tsx:25` destructures only `data` (no `isLoading`); flash via `ToppingTable.tsx:57` | ✅ | None — doc Flag 1 |
| `productNames` map | `useMemo` `page.tsx:31-41` | exact | ✅ | None |
| Modal lazy load | `dynamic()` import, no `loading:` option, `page.tsx:10-12` | exact | ✅ | None |
| Save pending | `saveMut.isPending` → disabled + "Đang lưu..." (`ToppingFormModal.tsx:124-127`) | exact | ✅ | None |
| Delete pending | `deleteMut.isPending` **unused** in UI — Xóa button never disables | confirmed: `handleDelete` (`page.tsx:52-59`) fires `mutate` with no button-disable; `deleteMut.isPending` read nowhere in render | 🟢 | Real minor gap — **doc already flags it** (`_loading.md` Flag 5); add `disabled` to the Xóa button if desired (register in MASTER) |
| Shared guards | AuthGuard `return null` (`:23`) · RoleGuard `Không có quyền…` (`:16-21`) · admin `loading.tsx` spinner · `layout.tsx` `AuthGuard`>`RoleGuard minRole=MANAGER` (`:29-30`) | AuthGuard `if (!user) return null` `:23`, `getMe()` `:17` ✅; RoleGuard `if (roleValue<minRole)` `:16`, msg `:19` ✅; `admin/loading.tsx` orange spinner ✅; `layout.tsx:29-30` ✅ | ✅ | None |

**Verified-matching:** the 6-layer loading ladder, the 3-state branch table, both mutation-pending
rows, "no search / no `enabled` gate", and "no `loading.tsx` inside `toppings/`".

---

## Area 5 — FE⇄BE data model

**Verdict: faithful.** Every handler binding, service function, repo wrapper, SQL query and migration
line in `_be.md` is **exact**. The only drift is the `main.go` route line block (~+13 stale).

| Topic | Doc says (file:line) | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Route group block | toppings group `main.go:200-212`; GET `:201`; create+update `:203-206`; delete `:208-211` | group `main.go:213`; `GET ""` `:214`; `mgr` create+update `:216-219`; `adm` delete `:221-224` | 🟡 | Re-cite (~+13). Guards themselves correct: GET public, POST/PATCH `AtLeast("manager")`, DELETE `AtLeast("admin")` |
| `GET /products/all` route | `main.go:173` inside `prodR` `:167`; manager guard `:171-173` | `/all` `main.go:186` inside `prodR` `:180`; `mgr.Use(authMW, AtLeast("manager"))` `:185` | 🟡 | Re-cite (~+13/+19) |
| Handlers | `ListAllProducts:57` · `ListToppings:253` · `CreateTopping:277` · `UpdateTopping:298` · `DeleteTopping:316` | `product_handler.go:57,253,277,298,316` | ✅ | None — all exact |
| Handler serialize | `{id,name,price(ParsePrice),is_available}` under `{"data"}` (`product_handler.go:259-268`) | exact, `:259-268`; `service.ParsePrice` at `:264` | ✅ | None |
| Bind structs | `createToppingRequest{Name req, Price min=0 int64}` `:271-274`; `updateToppingRequest{Name req, Price min=0, IsAvailable *bool}` `:291-313` | `:271-274` ✅; struct `:291-295`, handler `:298-313` ✅ | ✅ | None |
| Service fns | `ListToppings:432` · `CreateTopping:452` · `UpdateTopping:467` · `DeleteTopping:486` | `product_service.go:432,452,467,486` | ✅ | None — exact |
| `is_available` hardcoded 1 | `CreateTopping` INSERT hardcodes `is_available=1` (`products.sql:79-81`) | `INSERT INTO toppings (id,name,price,is_available) VALUES (?,?,?,1)` `products.sql:79-81` | ✅ | None |
| Raw-SQL availability write | `UpdateToppingAvailability` is raw `ExecContext`, not sqlc (`product_repo.go:156-159`) | `product_repo.go:156-159` — `r.dbtx.ExecContext(... UPDATE toppings SET is_available=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL ...)` | ✅ | None — doc Flag 1 |
| SQL queries | `ListToppings:64-67` · `CreateTopping:79-81` · `UpdateTopping:83-86` · `SoftDeleteTopping:88-91` | `query/products.sql:64-67, 79-81, 83-86, 88-91` — all exact; `ListToppingsAvailable:69-72` confirms the available-only twin | ✅ | None |
| N+1 in `/products/all` | `ListAllProducts` loops `GetToppingsByProductID` per product; no Redis; `enrichProduct:627` | `product_service.go:194-209` (loop `:205`, `enrichProduct` `:206`); `enrichProduct` def `:627` | ✅ | None |
| Migration / uniqueness | toppings DDL `002_products.sql:41-52` — no unique on `name`; FK `ON DELETE CASCADE` `:60` | `002_products.sql:41-52` (PK on id + 2 non-unique KEYs, **no unique name**); `fk_product_toppings_topping … ON DELETE CASCADE` `:60` | ✅ | None |
| 409 on duplicate | FE expects 409 → BE never sends it (no unique constraint, no dup check) | confirmed dead — see Dead-code section | 🟢 | Doc Flag 4 — accurate; FE branch is dead but harmless |
| Cache TTL / invalidation | `productCacheTTL=5min` `:21`; `invalidateToppingCaches:719-721` | `:21`, `:719-721` — exact | ✅ | None |

**Verified-matching:** all 5 endpoint rows (auth, handler, service, repo, SQL, cache), response codes
(`201`+`{id}`, `200`+message, `204`), the `ErrNotFound`→404 path on update, and the asymmetric
invalidation. **Faithful** — only the `main.go` route block is stale.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🟡 Doc fix | Re-cite the `main.go` route lines (~+13): toppings group `:200-212→:213-225`; `GET /products/all` `:173→:186` (`prodR` `:167→:180`, mgr guard `:171-173→:185`). Prefer citing the route *group + handler name* over absolute `main.go` lines (recurring drift). | `admin_toppings_be.md` |
| 2 | 🟡 Doc fix | Remove the broken sibling link to `admin_toppings_crosscomponent_dataflow.md` (file does not exist) | `admin_toppings_loading.md:193` |
| 3 | 🟢 Doc fix | Expand ASCII abbreviations to match render: `Áp dụng cho SP`→`Áp dụng cho sản phẩm`; `Chưa gắn SP`→`Chưa gắn sản phẩm`; drop the unrendered `Hành động` column header | `admin_toppings.md` (ASCII wireframe) |
| 4 | 🟢 Code (opt.) | Remove the dead 409 branch in `ToppingFormModal.tsx:55-57` **or** add a unique constraint on `toppings.name` + BE dup-check (product decision) | `ToppingFormModal.tsx` / `product_service.go` / migration |
| 5 | 🟡 Code (opt.) | Invalidate `product:<id>` on topping writes to fix the up-to-5-min stale topping on customer product-detail | `product_service.go:719-721` |
| 6 | 🟢 Code (opt.) | Disable the Xóa button while `deleteMut.isPending` (prevents double-delete) | `toppings/page.tsx` + `ToppingTable.tsx` |

> Per CLAUDE.md: doc fixes (#1–#3) are **one** ALIGNed task; each **code** change (#4–#6) must be
> registered in `MASTER_TASK.md` **before any file is touched**. This audit changed nothing.
