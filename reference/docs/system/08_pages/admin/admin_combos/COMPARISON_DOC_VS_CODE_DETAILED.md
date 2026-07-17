# Admin Combos — Doc vs. Code (Detailed Audit)

> **Scope:** the `/admin/combos` doc-set (`admin_combos.md`, `admin_combos_be.md`,
> `admin_combos_crosspage_dataflow.md`, `admin_combos_loading.md`, `SCENARIO_COMBOS_CRUD.md`,
> `COMBOS_BUGS.md`) audited against the running FE/BE code on branch
> `experience_claude.md_system_1_test_iphon2_change_code`.
> **5 axes:** ① component visuals · ② cross-component dataflow · ③ cross-page dataflow ·
> ④ loading behaviour · ⑤ FE⇄BE data model.
> **Read-only — no code or docs changed.** Produced inline (3 fan-out agents hit a session limit;
> the orchestrator re-traced every claim by hand from source). 🔴 items, where any, re-verified by hand.
> **No cross-component-dataflow file exists** for this page (the page is one `'use client'` component
> with local `useState` — the doc itself records Area ② as N/A), so axis ② is folded into ①/③.
> Date: 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals (`admin_combos.md` ASCII + Zones) | **Faithful** — every Zone `file:line` matches `page.tsx`; only ASCII abstractions | 0 | 0 | 3 |
| ② Cross-component dataflow | **N/A** — single component, local `useState`; doc correctly says N/A | 0 | 0 | 0 |
| ③ Cross-page dataflow (`_crosspage_dataflow.md`) | **Accurate** — `combos:list` shared-key model confirmed end-to-end | 0 | 1 | 1 |
| ④ Loading behaviour (`_loading.md`) | **Accurate** — guards, query gates, modal states all confirmed | 0 | 1 | 1 |
| ⑤ FE⇄BE data model (`admin_combos_be.md` + Object Model) | **Accurate** — every endpoint, binding, SQL, cache claim confirmed | 0 | 1 | 2 |
| **Code bugs** (`COMBOS_BUGS.md` — already doc'd, not drift) | **All 4 re-confirmed in current code** | — | — | — |

**Bottom line:** **No 🔴 doc-vs-code contradiction.** This is a high-fidelity, source-traced doc-set —
on par with `customer_combo_detail` and `admin_summary`. The doc accurately describes the running code,
*including* its bugs. The 4 code bugs catalogued in `COMBOS_BUGS.md` are **real and still present**, but
the doc already documents them faithfully, so they are **not** doc errors. The only genuine drift is
provenance: stale `main.go` route line numbers (~+13) and a wrong directory for `providers.tsx`.

---

## 🔴 RAISE-MY-VOICE headline findings

**None.** There is no doc claim that the code contradicts. Every behavioural assertion in the doc-set —
available-only list, hardcoded `is_available=1`, PATCH nulling `image_path`/`category_id`, swallowed
item inserts, create/update validation asymmetry, the shared `combos:list` cache — was re-traced to
source and **holds**.

### ⚠️ Code bugs re-confirmed (real, but the doc already documents them — fix needs MASTER registration)

These are **code** bugs, surfaced again by this audit. They are not doc drift — `COMBOS_BUGS.md` and
the `_be.md`/scenario Flags describe them correctly. Listed here so they stay visible:

1. **Admin combo list is available-only — hidden combos unmanageable** (Bug 1). Service `ListCombos`
   calls the available-only repo query `ListCombosAvailable`
   ([product_service.go:505](../../../../../be/internal/service/product_service.go#L505)); the
   unfiltered `ListCombos` query exists but is **dead**
   ([products.sql:107-110](../../../../../be/query/products.sql#L107)). Combos have **no `/combos/all`**
   manager endpoint (unlike products' `/products/all`), so any `is_available=0` combo would vanish from
   the table. Latent today (no path sets `is_available=0`). BE fix.
2. **`PATCH /combos/:id` nulls `image_path` + `category_id` on every edit** (Bug 2). Handler
   `updateComboRequest` has **no** `image_path`/`category_id` field
   ([product_handler.go:400-406](../../../../../be/internal/handler/product_handler.go#L400)); service
   builds `UpdateComboParams` with `ImagePath` **omitted** (zero → NULL) and `CategoryID=""` → NULL
   ([product_service.go:603-610](../../../../../be/internal/service/product_service.go#L603)); the SQL
   sets **both** columns regardless
   ([products.sql:132-135](../../../../../be/query/products.sql#L132)). Latent (form sends neither). BE fix.
3. **Combo item inserts are non-transactional & swallow FK errors** (Bug 3). Both write paths loop
   `CreateComboItem` and only `slog.Warn` on failure
   ([create :563](../../../../../be/internal/service/product_service.go#L563) /
   [update :618](../../../../../be/internal/service/product_service.go#L618)) — a bad `product_id`
   drops that item while the header still returns 2xx. BE fix.
4. **`POST /combos` validation looser than `PATCH`** (Bug 4). Create binds `price min=0` and **no**
   item-count minimum
   ([product_handler.go:359-365](../../../../../be/internal/handler/product_handler.go#L359)); update
   binds `price min=1` + `items required,min=2`
   ([:401-405](../../../../../be/internal/handler/product_handler.go#L401)). API accepts a free/itemless
   combo on create (FE guards ≥2, `page.tsx:173`). BE fix.

---

## Dead / unreachable components found

- **No dead UI in this page.** Every branch in `page.tsx` is reachable.
- **Dead BE query:** `ListCombos` (`products.sql:107-110`) — unfiltered combo list, **zero callers**
  (the service method named `ListCombos` calls `ListCombosAvailable` instead). Root of Bug 1.
- **Dead response field:** `GET /combos` returns `is_available`
  ([product_handler.go:349](../../../../../be/internal/handler/product_handler.go#L349)) and `listCombos`
  maps it ([admin.api.ts:137](../../../../../fe/src/features/admin/admin.api.ts#L137)), but this page
  **never renders or toggles it** — there is no availability column/toggle (doc Flag 1/2, confirmed).
- **Dead service parameter:** `UpdateComboInput.CategoryID` is read by the service
  (`product_service.go:595-597`) but **never set by the handler** — the root of Bug 2.
- **Duplicate raw type (not dead):** the admin page uses a local `RawCombo`
  ([admin.api.ts:122-126](../../../../../fe/src/features/admin/admin.api.ts#L122)) while the shared
  `ComboRaw` ([types/product.ts:36-46](../../../../../fe/src/types/product.ts#L36)) is used by the
  customer menu/favourites/combo-detail pages — two definitions of the same wire shape. Cross-page note,
  not this page's drift.

---

## Area ① — Component visuals

**Verdict:** Faithful. Every Zone and ASCII anchor in `admin_combos.md` maps to the real `page.tsx`.
The ASCII is an honest abstraction of the rendered DOM; the only gaps are cosmetic (an ASCII checkbox
char standing in for a custom SVG checkbox, a description line the ASCII omits).

| Component / Topic | Doc says (`admin_combos.md`) | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Wireframe trace anchor | "Traced from `page.tsx:233-342`" + modal `:345-552` | `return` opens `page.tsx:233`; Zone B `:235-253`; Zone C `:255-342`; modal `:345-552` | 🟢 | none |
| Zone B header `Combo (N)` | `combos.length` count, `page.tsx:236-253` | `<h2>Combo ({combos.length})</h2>` [page.tsx:237](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L237>) | 🟢 | none |
| 🎲 Random combo button | inline → `handleRandomCombos`, 3× parallel `Promise.allSettled`, `:239-245, 194-228` | button [page.tsx:239-245](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L239>); handler `:194-229` (allSettled `:207`) | 🟢 | none |
| + Thêm combo → `openAdd` | opens modal in `'add'`, `:246-252, 78-84` | [page.tsx:246-251](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L246>); `openAdd` `:78-84` | 🟢 | none |
| Zone C ComboTable | `<table>`, `:261-342`; retail/savings client-side | rows `page.tsx:274-338`; `rowRetail`/`rowSavings` `:275-279` | 🟢 | none |
| Sản phẩm cell — product chips | resolved via `productMap`, fallback to `product_id`, `:288-301` | `{p?.name ?? item.product_id} ×{qty}` [page.tsx:294](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L294>) | 🟢 | none |
| Actions cell — Sửa always / Xóa admin-only | `:318-335`, Xóa gated `isAdmin` | Sửa `:320-325`; `{isAdmin && …Xóa}` `:326-333` | 🟢 | none |
| Zone D ComboFormModal | RHF+Zod, `:344-552`; Lưu disabled `<2` items | modal `:345-552`; disabled `isPending || selectedItems<2` `:543` | 🟢 | none |
| Picker row ASCII `[☐]`/`[☑]` | ASCII checkbox chars + price + stepper | code renders a **custom SVG checkbox** (`:422-430`) + optional **description line** (`:441-443`) the ASCII omits; stepper only when checked `:445-469` | 🟢 | ASCII is approximate — acceptable |
| Price suggestion / savings hint | 90% rounded to 1,000đ `:503-505`; savings `:515-519` | `Math.round(retailTotal*0.9/1000)*1000` [page.tsx:504](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L504>); savings `:515-519` | 🟢 | none |

**Verified-matching:** EmptyState (`icon="🍱"`, message), the 2-col name/description grid, the
"Bỏ chọn tất cả" clear button, the selected-summary block (`Tổng giá lẻ`), the footer `Huỷ bỏ`/`Lưu combo`,
and the Escape-to-close handler all match the cited lines exactly.

---

## Area ③ — Cross-page dataflow

**Verdict:** Accurate. The whole-picture diagram, the `combos:list` shared-key story, the pull-only
(no SSE/WS) model, and the order-time expansion handoff all hold against source.

| Topic | Doc says (`_crosspage_dataflow.md`) | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Writes Del only `combos:list` | `invalidateComboCaches` Dels only `combos:list`, `product_service.go:723-725` | `s.rdb.Del(ctx, cacheKeyCombos)` [product_service.go:723-724](../../../../../be/internal/service/product_service.go#L723); `cacheKeyCombos="combos:list"` `:27` | 🟢 | none |
| TTL 5 min | `productCacheTTL`, `product_service.go:21` | `const productCacheTTL = 5 * time.Minute` [product_service.go:21](../../../../../be/internal/service/product_service.go#L21) | 🟢 | none |
| List rebuilt from `ListCombosAvailable` | available-only, `product_service.go:505` | `s.repo.ListCombosAvailable(ctx)` [product_service.go:505](../../../../../be/internal/service/product_service.go#L505) | 🟢 | none |
| FE `invalidateQueries(['admin','combos'])` per mutation | `page.tsx:140,156,166` | create `:140`, edit `:156`, delete `:166`, random `:222` | 🟢 | none |
| No SSE/WS on this page | pull-only | no WS/SSE import in `page.tsx` (confirmed) | 🟢 | none |
| Global `staleTime` 60s | `providers.tsx:8` | value + line correct, but real path is **`fe/src/lib/providers.tsx:8`** not `fe/src/app/providers.tsx` | 🟡 | fix the dir in the doc citation |
| `main.go` route cites in source map | (general BE refs) | combos routes now at `main.go:228-240` (see Area ⑤) | 🟢 | refresh on next run |

**Verified-matching:** the durability matrix, the F5/reload behaviour, the cancellation/`SoftDeleteCombo`
reverse flow (no in-use guard), and the end-to-end timeline are all consistent with the BE service code.

---

## Area ④ — Loading behaviour

**Verdict:** Accurate. The 4 loading layers, the per-query gating, and the modal pending states all
confirm against the guard components and `page.tsx`.

| Topic | Doc says (`_loading.md`) | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| AuthGuard renders `null` until `getMe()` | blank screen; redirect `/login` on fail; `attempted.current` ref; `:7-24,19,23` | `if (!user) return null` [AuthGuard.tsx:23](../../../../../fe/src/components/guards/AuthGuard.tsx#L23); redirect `:19`; ref `:12` | 🟢 | none |
| RoleGuard access-denied text | `<div className="text-urgent p-8 text-center font-body">Không có quyền truy cập trang này</div>` `:16-20` | exact match [RoleGuard.tsx:16-22](../../../../../fe/src/components/guards/RoleGuard.tsx#L16) | 🟢 | none |
| Layout wraps AuthGuard `:29` + RoleGuard MANAGER `:30` | — | `<AuthGuard>` `:29`, `<RoleGuard minRole={Role.MANAGER}>` [layout.tsx:30](<../../../../../fe/src/app/(dashboard)/admin/layout.tsx#L30>) | 🟢 | none |
| Route spinner `h-64`/`h-8 w-8`/`border-t-orange-500` `:1-7` | — | exact [admin/loading.tsx:1-7](<../../../../../fe/src/app/(dashboard)/admin/loading.tsx#L1>) | 🟢 | none |
| Combos query gates Zone C via `isLoading` `:54-57` | — | `const { data: combos=[], isLoading }` [page.tsx:54-57](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L54>) | 🟢 | none |
| Products query has no `isLoading`/`isError`, defaults `[]` `:58-61` | — | `const { data: products=[] }` [page.tsx:58-61](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L58>) | 🟢 | none |
| Main branch: `Đang tải...` / EmptyState / table `:256-259` | plain text loading `:257` | exact [page.tsx:256-259](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L256>) | 🟢 | none |
| Save button `Đang lưu...` disabled `isPending||<2` `:543-546` | — | exact `:543-546`; `isPending` `:231` | 🟢 | none |
| EmptyState default icon `'🍜'`, `py-16`, `text-4xl`+`text-muted-fg text-sm` `:6-13` | — | exact [EmptyState.tsx:6-13](../../../../../fe/src/components/shared/EmptyState.tsx#L6) | 🟢 | none |
| Global `staleTime` 60s `providers.tsx:8` | — | correct value/line, wrong dir → `fe/src/lib/providers.tsx:8` | 🟡 | fix dir in citation |

**Verified-matching:** the product-chip-shows-UUID-during-load gap (Flag 1), the no-skeleton plain-text
loading (Flag 2), the empty-picker-in-modal gap (Flag 4), the AuthGuard blank-gap-on-F5 (Flag 5), and the
no-row-level-delete-pending gap (Flag 6) are all real and correctly described.

---

## Area ⑤ — FE⇄BE data model

**Verdict:** Accurate. Every endpoint, auth gate, binding struct, SQL statement, cache key, and error
path in `admin_combos_be.md` confirms against source. The Object Model in `admin_combos.md` matches the
TS types field-for-field. Only `main.go` route line numbers drift.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Handler anchors (`ListCombos`/`CreateCombo`/`UpdateCombo`/`DeleteCombo`/`ListAllProducts`) | `:327/:374/:409/:433/:57` | exact: [product_handler.go:327,374,409,433,57](../../../../../be/internal/handler/product_handler.go#L327) | 🟢 | none |
| `createComboRequest` binding | `price required,min=0`, no item-min, has `image_path`+`category_id` `:359-365` | exact [product_handler.go:358-366](../../../../../be/internal/handler/product_handler.go#L358) | 🟢 | none |
| `updateComboRequest` binding | `price min=1`, `items required,min=2`, **no** image_path/category_id `:400-406` | exact [product_handler.go:400-406](../../../../../be/internal/handler/product_handler.go#L400) | 🟢 | none |
| `ListCombos` JSON shape | `{id,product_id,quantity}` items, no `unit_price`/toppings `:337-341` | exact [product_handler.go:337-352](../../../../../be/internal/handler/product_handler.go#L337) | 🟢 | none |
| Service `ListCombos`→`ListCombosAvailable`, TTL 5m | `:497-517,505,21,515` | exact [product_service.go:497-517](../../../../../be/internal/service/product_service.go#L497) | 🟢 | none |
| `CreateCombo` SQL hardcodes `is_available=1` | `products.sql:128-130` | `VALUES (?,?,?,?,?,?, 1, ?)` [products.sql:129-130](../../../../../be/query/products.sql#L129) | 🟢 | none |
| `UpdateCombo` SQL sets `category_id` + `image_path` | `products.sql:132-135` | `SET category_id=?, … image_path=?, …` [products.sql:132-135](../../../../../be/query/products.sql#L132) | 🟢 | none |
| `UpdateCombo` service omits `ImagePath`, NULLs category | `:595-610` | params lack `ImagePath`; `catID=""→NULL` [product_service.go:603-610](../../../../../be/internal/service/product_service.go#L603) | 🟢 | none |
| `SoftDeleteCombo` no in-use guard, no existence check | `:571-577` | exact [product_service.go:571-577](../../../../../be/internal/service/product_service.go#L571) | 🟢 | none |
| `GET /combos` public; `/products/all` manager+ | `main.go:216`, `:171-173`/`:173` | combos GET now `main.go:229`; `/products/all` now `main.go:186` (group `:180-195`) | 🟢 | refresh `main.go` line cites (~+13) |
| Combos route group | `main.go:215-227` (POST/PATCH `:218-222`, DELETE `:223-227`) | group `main.go:228-240` (mgr `:231-235`, adm `:237-239`) | 🟢 | refresh `main.go` line cites |
| Object Model — `Combo`/`ComboItem` types | `types/product.ts:49-59` / `:27-33` | exact [product.ts:27-33,49-59](../../../../../fe/src/types/product.ts#L27) | 🟢 | none |
| Object Model — `CreateComboInput`/`RawCombo`/`listCombos` | `admin.api.ts:112-119/:122-126/:128-146` | exact [admin.api.ts:112-146](../../../../../fe/src/features/admin/admin.api.ts#L112) | 🟢 | none |
| Flag 3 — `product_name:''` set line | `admin.api.ts:143` | actual [admin.api.ts:142](../../../../../fe/src/features/admin/admin.api.ts#L142) | 🟢 | off-by-1 |
| Provenance branch in all doc headers | `experience_claude.md_system_1` | actual branch `…_test_iphon2_change_code` | 🟢 | refresh on next run |
| `errors.go` `ErrNotFound` | `:28` | confirm on `errors.go` | 🟡 | re-cite if drifted (see note) |

> Note on `errors.go:28`: the PATCH-on-missing → `ErrNotFound` → 404 path is confirmed in the service
> (`product_service.go:589-593` returns `ErrNotFound`). The exact `errors.go` line was not re-opened in
> this pass — left 🟡 `❓` for the line number only; the behaviour is verified.

**Verified-matching:** the 5-endpoint table (auth, handler, service, repo, cache columns), the caching &
invalidation section, the error-behaviour section (bind→400, untyped→500, missing→404, delete→204), and
all 7 Flags are accurate against source.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🟡 Doc fix | Correct `providers.tsx` path → **`fe/src/lib/providers.tsx:8`** (value 60s/line are right) | `admin_combos_loading.md`, `_crosspage_dataflow.md`, `SCENARIO_COMBOS_CRUD.md` |
| 2 | 🟢 Doc fix | Refresh stale `main.go` route line numbers (~+13): combos group `:215-227→:228-240`, GET `:216→:229`, POST/PATCH `:218-222→:231-235`, DELETE `:223-227→:237-239`, products group `:167-182→:180-195`, `/products/all` `:171/:173→:186` | `admin_combos_be.md`, `COMBOS_BUGS.md` |
| 3 | 🟢 Doc fix | Fix off-by-1: `product_name:''` is `admin.api.ts:142` (doc says `:143`) | `admin_combos.md` Flag 3 |
| 4 | 🟢 Doc fix | Refresh provenance branch in all 6 doc headers → `experience_claude.md_system_1_test_iphon2_change_code` | whole doc-set |
| 5 | 🔴 Code bug | Bug 1 — wire admin list to all-combos (new `GET /combos/all` manager+) or delete dead `ListCombos` query | `product_service.go`, `products.sql`, `main.go` |
| 6 | 🔴 Code bug | Bug 2 — thread `image_path`+`category_id` through `updateComboRequest`/`UpdateComboInput`/`UpdateComboParams` (or COALESCE in SQL) | `product_handler.go`, `product_service.go`, `products.sql` |
| 7 | 🟡 Code bug | Bug 3 — wrap combo header+items in a tx; return item-insert errors instead of `slog.Warn`-and-swallow | `product_service.go` |
| 8 | 🟡 Code bug | Bug 4 — tighten `createComboRequest` to `price min=1` + `items required,min=2` | `product_handler.go` |

> Per CLAUDE.md: doc fixes (#1–4) are **one** ALIGNed task; each code change (#5–8) must be registered in
> `docs/tasks/MASTER_TASK.md` **before** any file is touched. This audit changed nothing.
</content>
</invoke>
