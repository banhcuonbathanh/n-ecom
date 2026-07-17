# Comparison — Doc vs. Code · `customer_table_qr` (`/table/:tableId`)

> **Scope:** a read-only doc-vs-code audit of the `/table/:tableId` "airlock" page doc-set against the
> real running code. Axes: ① Component visuals · ③ Cross-page dataflow · ④ Loading behaviour ·
> ⑤ FE⇄BE data model. **Area ② (cross-component dataflow) is N/A** — this is a single 67-line component
> with no inter-widget data sharing.
> **Read-only — no app code and no page doc-set file was changed.** Only the 3 comparison files +
> `COMPARISON_TRACKER.md` were written.
> Produced by 1 Sonnet BE-trace agent + inline FE verification by the orchestrator; every 🔴 was
> re-verified by hand against source.
> **Branch audited:** `experience_claude.md_system_1_test_iphon2_change_code`. **Date:** 2026-06-21.
>
> **Bottom line:** this is one of the most accurate doc-sets audited so far. Every cross-page, loading,
> and BE claim traces to real code. There is **near-zero doc-vs-code drift** — the only doc errors are
> stale line numbers and a stale provenance branch name. The 🔴 items below are **real code bugs that
> the page doc-set already documents honestly** (it flags them itself), not doc mistakes.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals | ✅ Accurate — spinner + error ASCII match `page.tsx` exactly | 0 | 0 | 1 |
| ③ Cross-page dataflow | ✅ Accurate — all store + downstream-page claims trace to code | 0 | 0 | 2 |
| ④ Loading behaviour | ✅ Accurate — branches, dir listing, no-timeout all confirmed | 0 | 0 | 0 |
| ⑤ FE⇄BE data model | ✅ Accurate — handler→service→repo→SQL→JWT all match | 0 | 0 | 3 |
| **Cross-cutting code bugs** (doc-accurate, surfaced) | ⚠️ Real bugs, already flagged by the doc | 2 | 1 | 0 |
| **Total** | **Doc-set is faithful; 🔴s are code, not doc** | **2** | **1** | **6** |

---

## 🔴 RAISE-MY-VOICE headline findings

> Both 🔴s are **code/spec bugs**, not doc drift. The page doc-set already names them — recording here
> because the skill's TRACKER must carry every 🔴, and because each is a real product/security gap.

1. **`TABLE_HAS_ACTIVE_ORDER` is dead end-to-end — the one-active-order rule is unenforced in code.**
   The FE special-cases this error code in **3** places — `table/[tableId]/page.tsx:36`,
   `(shop)/checkout/page.tsx:79`, `app/TableGrid.tsx:107` (confirmed by
   `grep -rn TABLE_HAS_ACTIVE_ORDER fe/src` → exactly those 3 hits). But `ErrTableHasActiveOrder`
   (`be/internal/service/errors.go:30`) is **defined and never returned anywhere in `be/`** (grep →
   only the definition line). `AuthService.GuestLogin` (`auth_service.go:281-303`) does no active-order
   lookup; `CreateOrder` (`order_service.go:256-275`) sets an informational `tableBusy` flag that
   "never blocks creation" and the handler returns `201` + `table_busy` (`order_handler.go:121`), not a
   409. **Effect:** a diner who re-scans a busy table gets a fresh guest JWT → `/menu` and can create a
   **second concurrent order on the same table**; the BUSINESS_RULES §2.3 "one active order per table"
   rule is not enforced. The page doc-set already documents this (`TABLE_QR_BUGS.md` Bug 1). Fix needs a
   product decision (BE auto-rejoin vs. FE delete-dead-branch) — register + ALIGN first.

2. **`POST /auth/guest` rate-limit (BUSINESS_RULES §5.2 "5 req/min/IP") is not implemented.**
   `be/internal/middleware/` contains only `auth.go`, `metrics.go`, `rbac.go` (confirmed by `ls`); the
   global chain is `gin.Logger(), gin.Recovery(), Metrics()` + CORS (`main.go:117-118,133`). There is no
   rate-limit middleware and `GuestLogin` does no in-process throttle. The endpoint is fully public
   (`main.go:171`). The page `_be.md` already flags this (Flag #5) — it is a **spec→code drift in
   `BUSINESS_RULES §5.2`**, a security control that is claimed but absent.

---

## Dead / unreachable code found

- **`TABLE_HAS_ACTIVE_ORDER` catch branches — 3 of them, all dead.**
  `table/[tableId]/page.tsx:36-38`, `(shop)/checkout/page.tsx:79-85`, `app/TableGrid.tsx:107` — the BE
  never emits the code (see 🔴 #1). Each is an unreachable `if`.
- **`ErrTableHasActiveOrder`** (`be/internal/service/errors.go:30`) — a defined error value with zero
  `return` sites in `be/`.
- **Note (not dead):** `be/internal/repository/table_repo.go:71` has a parallel `GetTableByQRToken`,
  but the auth service deliberately uses its own raw-SQL `auth_repo.go:96-106`. Both compile and are
  reachable; the sqlc one just isn't used by this path. Harmless layering note.

---

## Area ① — Component visuals

**Verdict:** ✅ Accurate. The two render branches in `customer_table_qr.md`'s ASCII wireframe match
`page.tsx` exactly — spinner (default) and error screen.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Spinner zone | inline JSX `page.tsx:61-66`, `w-10 h-10 border-4 border-primary border-t-transparent animate-spin` + "Đang tải menu…" | Exact match — `page.tsx:61-66` | 🟢 | — |
| Error zone | inline JSX `page.tsx:46-59`, ⚠️ + "Mã bàn không hợp lệ…" + "Vào menu" button → `router.replace('/menu')` | Exact match — `page.tsx:46-59` (button `:51-56`) | 🟢 | — |
| Provenance branch | all doc-set headers say branch `experience_claude.md_system_1` | Current branch is `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Refresh provenance line on next doc edit |

**Verified-matching:** zone-to-`file:line` map in `customer_table_qr.md` §Zones; "no layout shell, no
nav, full-screen both states" (`page.tsx` has no layout import).

---

## Area ③ — Cross-page dataflow

**Verdict:** ✅ Accurate. Every store write, persist rule, and downstream-page consumer in
`customer_table_qr_crosspage_dataflow.md` traces to real code. Only storage-key line numbers drift.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `useAuthStore` — no `persist` | bare `create()`, no persist (`auth.store.ts:12`); `setAuth` (`:15`) | Exact — `auth.store.ts:12` bare `create`, `setAuth` `:15`, `clearAuth` `:17` | 🟢 | — |
| `setTableId`/`setTableName` | `cart.ts:91-92`, memory-only | Exact — `cart.ts:91-92` | 🟢 | — |
| `clearCart` wipes table binding | `cart.ts:89` | Exact — `cart.ts:89` resets `tableId,tableName,…` | 🟢 | — |
| `partialize` persists only `orderNote`+`activeOrderId` | `cart.ts:153` | Exact — `cart.ts:153` `partialize: (s) => ({ orderNote, activeOrderId })` | 🟢 | — |
| localStorage key `cart-config-v3` | `storage-keys.ts:5` | Key string correct (`CART_CONFIG: 'cart-config-v3'`) but at **`storage-keys.ts:6`**, not 5 | 🟢 | Fix line ref 5→6 |
| localStorage prefix `order_cache_` | `storage-keys.ts:4` | Correct (`ORDER_CACHE: 'order_cache_'`) but at **`storage-keys.ts:3`**, not 4 | 🟢 | Fix line ref 4→3 |
| Token injected on every request | `api-client.ts:11-14` Bearer from `useAuthStore.getState().accessToken` | Exact — `api-client.ts:11-14` | 🟢 | — |
| Guest 401 → `clearAuth()` + `/menu` | `api-client.ts:27-34` decodes `sub`, guest → `clearAuth` + redirect | Exact — `api-client.ts:27-37` (guest branch) | 🟢 | — |
| `/menu` reads `{tableId,items}` + checkout branch | `menu/page.tsx:36,49` `tableId ? confirm : push('/checkout')` | Exact — `menu/page.tsx:36,49` | 🟢 | — |
| `TableConfirmModal` posts `source:'qr'` | `TableConfirmModal.tsx:14,19-26`, `buildOrderItemsPayload`, `cart.tableId`+`cart.items` | Exact — `TableConfirmModal.tsx:14,20-26` | 🟢 | — |
| `/checkout` `table_id`/`source` | `checkout/page.tsx:53-54` `cart.tableId ?? null` / `'qr':'online'`; guard `:37`; cache `:66-70`; dead handler `:79` | Exact — all confirmed `checkout/page.tsx:37,53-54,66-70,79` | 🟢 | — |
| `/order/:id` `useOrderSSE` + "Add more" | `order/[id]/page.tsx:41` SSE; `:573` setTableId+setActiveOrderId | `useOrderSSE` at `:41` ✅; "Thêm món" sets `setTableId(order.table_id!)`+`setActiveOrderId` at `:573-575` ✅ | 🟢 | — |
| `/tracking` reads `activeOrderId`; 401 screen | `tracking/page.tsx:18`; "Phiên làm việc hết hạn" `:90-107` | Exact — `:18`, 401 screen `:90-107` (driven by `isUnauthorized` from `useOrderMonitorSSE`, not `useOrderSSE`) | 🟢 | — |
| `useOrderSSE` reads token + cache | `useOrderSSE.ts:30,35-38,55-57,70` | Exact — token `:30`, cache `:33-38`, REST `:56`, SSE `:69-72` | 🟢 | — |

**Verified-matching:** the §0 "whole picture" diagram (memory-only auth+cart, only `{orderNote,
activeOrderId}` in `cart-config-v3`); §9 durability matrix; the dead-branch §2 (see 🔴 #1).

---

## Area ④ — Loading behaviour

**Verdict:** ✅ Accurate. All loading claims in `customer_table_qr_loading.md` confirmed, including the
two negative facts (no `loading.tsx`, no axios timeout) verified by directory listing and source.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Only `page.tsx` in route dir | no `loading.tsx`/`layout.tsx`/`error.tsx` in `table/[tableId]/` | Confirmed by `ls` — only `page.tsx` | 🟢 | — |
| `(shop)/loading.tsx` exists, doesn't cover this route | `fe/src/app/(shop)/loading.tsx` exists; route is outside `(shop)/` | Confirmed by `ls` — file exists; `/table/` is at root segment | 🟢 | — |
| Local `useState`, no TanStack Query | `page.tsx:14` `useState<string\|null>` | Exact — `page.tsx:14` | 🟢 | — |
| `useEffect` dep `[params.tableId]`, no abort | `page.tsx:16-44`, no cleanup/AbortController | Exact — `page.tsx:16-44`, no return fn | 🟢 | — |
| Two render branches | error `:46-59`, spinner `:61-66` | Exact | 🟢 | — |
| axios no `timeout` | `api-client.ts:6-9` `axios.create` no timeout key | Exact — `api-client.ts:6-9`, axios default `0` (disabled) | 🟢 | — |
| Dead `TABLE_HAS_ACTIVE_ORDER` redirect | `page.tsx:36-38` unreachable (Gap 2) | Confirmed dead (see 🔴 #1) | 🟢 | — (covered by 🔴 #1) |

---

## Area ⑤ — FE⇄BE data model

**Verdict:** ✅ Accurate on every behavioural claim. The handler→service→repo→SQL→JWT trace in
`customer_table_qr_be.md` matches source exactly; only the route-section line numbers in `main.go` are
stale (the file grew ~10-13 lines since the doc was written).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `Guest` handler | `auth_handler.go:182-207`, binds `len=64`, serializes `access_token,expires_in,table{id,name,capacity,status}` | Exact — handler `:182`, bind `:176-178`, response `:195-207` | 🟢 | — |
| `GuestLogin` service | `auth_service.go:281-303`, `GetTableByQRToken`→`GenerateGuestToken`, **no active-order check** | Exact — `:281-303`, call `:282`, JWT `:290`, returns `ExpiresIn:7200` `:297` | 🟢 | — |
| Repo raw SQL | `auth_repo.go:96-106`, hand-written `… WHERE qr_token=? AND is_active=1 AND deleted_at IS NULL LIMIT 1` | Exact — `:96-106`, SQL `:97-98` | 🟢 | — |
| JWT mint | `jwt.go:73-92`, `sub=guest`,`role=customer`,`table_id`,`exp=+2h`, err if no secret | Exact — `:73-92` (`Subject "guest"` `:82`, `2h` `:84`, `TableID` `:88`) | 🟢 | — |
| Route is public | `main.go:158`, above `protected` `:159-164` | Public ✅ but actual lines `main.go:171` (route), `:173-177` (protected) | 🟢 | Fix `main.go` route line refs (~+10-13) |
| Error mapping | `respond.go:24-36` ErrNotFound→404, fallback 500 COMMON_002 `:34-35` | Correct outcome; mechanism is `errors.As(&AppError)` (`respond.go:25-32`), `ErrNotFound` is itself an `*AppError{404}` (`errors.go:28`) — not a hard-coded case | 🟢 | Tighten mechanism wording |
| `ErrTableHasActiveOrder` never returned | `errors.go:30` defined, never returned in `be/` | Confirmed — grep → only the definition line | 🟢 | — (covered by 🔴 #1) |
| No rate-limit middleware | claimed in BUSINESS_RULES §5.2, not in code | Confirmed absent (see 🔴 #2) | 🔴 | Fix BUSINESS_RULES §5.2 or implement |

**Verified-matching:** response fields ignored by FE (`expires_in`,`capacity`,`status`); `is_active=0`/
soft-deleted → same 404; `tableBusy` informational + 201 (`order_service.go:256-275`,
`order_handler.go:121`).

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug (product decision) | Decide: BE auto-rejoin (return `ErrTableHasActiveOrder` w/ `active_order_id`) **or** FE delete 3 dead branches. Enforces (or honestly drops) one-active-order. | `be/internal/service/auth_service.go` + `order_service.go` **or** `table/[tableId]/page.tsx:36`, `checkout/page.tsx:79`, `TableGrid.tsx:107` |
| 2 | 🔴 Spec/code drift | Implement the §5.2 rate-limit on `POST /auth/guest`, or correct BUSINESS_RULES §5.2 to match reality | `be/internal/middleware/` (new) **or** `docs/.../BUSINESS_RULES.md §5.2` |
| 3 | 🟡 Code robustness | Add axios `timeout` + an `AbortController` to the airlock effect (spinner can hang forever) | `fe/src/lib/api-client.ts:6`, `fe/src/app/table/[tableId]/page.tsx:16-44` |
| 4 | 🟢 Doc fix | Storage-key line refs: `cart-config-v3` 5→6, `order_cache_` 4→3 | `customer_table_qr_crosspage_dataflow.md §10` |
| 5 | 🟢 Doc fix | `main.go` route-section line refs (~+10-13): 148→161, 154→167, 158→171, 159-164→173-177, CORS 126→133 | `customer_table_qr_be.md` |
| 6 | 🟢 Doc fix | Refresh provenance branch name in all 6 doc-set headers → `…_test_iphon2_change_code` | all `customer_table_qr/*.md` |

> Per CLAUDE.md: doc fixes (#4–#6) are **one** task; each **code** change (#1–#3) must be registered in
> `MASTER_TASK.md` and ALIGNed **before any file is touched**. This audit changed nothing.
