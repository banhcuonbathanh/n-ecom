# Comparison — Doc vs. Code — `/admin/summary` (Tổng kết nhà hàng)

> **Scope:** a read-only audit of the `admin_summary` doc-set against the running FE/Go code, across
> 4 applicable axes — **Component visuals · Cross-page dataflow · Loading behaviour · FE⇄BE data
> model**. (Area 2 *Cross-component dataflow* does **not** apply — this page has no shared store and
> no `_crosscomponent_dataflow.md`; every component holds its own local `useState`/`useQuery`.)
> **Read-only — no code and no page-doc was changed.** Produced by 2 parallel Sonnet agents (BE+types,
> FE loading/crosspage); the orchestrator read `page.tsx` in full and hand-verified every 🔴 candidate
> against source. **Code wins.** Branch: `experience_claude.md_system_1_test_iphon2_change_code`.
> Date: 2026-06-20.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | ✅ Faithful — every Zone line-citation matches `page.tsx` exactly | 0 | 1 | 6 |
| 3 — Cross-page dataflow | ✅ Faithful — invalidations + raw-anchor handoff confirmed | 0 | 1 | 5 |
| 4 — Loading behaviour | ✅ Faithful — 6 layers + 4 skeletons confirmed; doc correctly self-flags the `isError` gap | 0 | 1 | 12 |
| 5 — FE⇄BE data model | ✅ Faithful on behaviour; only BE line-numbers + one sibling-route note are stale | 0 | 2 | 20+ |
| **Total** | **No 🔴 — the doc-set is an honest mirror of the code** | **0** | **5** | **40+** |

**One-paragraph verdict:** This is a high-fidelity doc-set. Every FE line-citation in `admin_summary.md`,
`_loading.md`, and `_crosspage_dataflow.md` lands on the exact line of
[summary/page.tsx](../../../../fe/src/app/(dashboard)/admin/summary/page.tsx) it claims. Every backend
behavioural claim — SQL clauses, serializer keys, the chef-revenue omission, the `pct`-over-top-N
calc, the non-transactional stock-in, the no-Redis policy, the FE⇄BE type contract — is confirmed
against the Go source. There is **no 🔴**: no wrong data source, no missing call, no dead flow, no
product bug introduced. The only drift is **mechanical staleness** (the BE route block shifted ~13
lines since `_be.md` was written) plus **one incomplete sentence** (the admin-only sub-group gates two
DELETEs, the doc names one). Separately, the doc *correctly* documents two real code-quality gaps
(no `isError` handling; a raw `<a>` instead of `next/link`) — those are code items for a future task,
not doc drift.

---

## 🔴 RAISE-MY-VOICE headline findings

**None.** No hand-verified 🔴 was found for this page. Both agents' 🔴 candidates were re-checked
against source and downgraded:

- The "no `isError` on any of 4 `useQuery`" candidate is **real code behaviour but not doc drift** —
  `_loading.md` Flag 1 already documents it accurately. → tracked as a 🟡 code-quality item below.
- The "raw `<a href>` not `next/link`" candidate is **real but already documented** —
  `admin_summary.md` Flag 6 and `_crosspage_dataflow.md` §3 both call it out. → 🟡 code-quality item.
- The "`admIngR` gates two routes, doc says one" candidate is a genuine doc inaccuracy but on a
  **sibling route this page never calls** (`DELETE /ingredients/:id`, `DELETE /training/guides/:id`) —
  no product impact. → 🟡 doc fix below.

> Honest result: the headline is the *absence* of a headline. The page does what its docs say.

---

## Dead / unreachable components found

- **None in FE.** `page.tsx` has no zero-import components, no unreachable modal, no dead branch. The
  one overlay (`StockInModal`, `page.tsx:211-290`) is reachable via the per-row "+ Nhập hàng" button
  (`page.tsx:342-351`).
- **BE micro-smell (not dead, not a bug):** `analytics_handler.go:72` builds a `gin.H{"revenue": …}`
  value that is only used as a nil/non-nil sentinel to decide whether to attach the `revenue` key for
  non-chef rows — a `bool` would read clearer. No behavioural impact. Out of scope to fix here.

---

## Area 1 — Component visuals

**Verdict:** ✅ Faithful. The Zones table (`admin_summary.md:59-66`) and the ASCII wireframe map 1-for-1
to the real inline components in `page.tsx`. All cited line ranges are exact.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `RangeSelector` | `page.tsx:24-42`, local `useState`, no Zustand | `page.tsx:24-42` — exact; `range` from `useState<SummaryRange>('today')` `page.tsx:366` | 🟢 | — |
| `SummaryKPICards` | `page.tsx:58-103`, 4 KPI cards | `page.tsx:58-103` — exact; 4 `KPICard` blocks | 🟢 | — |
| `TopDishesList` | `page.tsx:107-147` | `page.tsx:107-147` — exact | 🟢 | — |
| `StaffPerfTable` | `page.tsx:159-201` | `page.tsx:159-201` — exact; `—` for chef revenue `page.tsx:192` | 🟢 | — |
| `StockAlertList` | `page.tsx:292-361`, range-independent | `page.tsx:292-361` — exact; key `['admin','low-stock']` `page.tsx:295` | 🟢 | — |
| `StockInModal` | `page.tsx:211-290`, RHF+Zod `stockSchema` `:205-209` | `page.tsx:211-290`, `stockSchema` `page.tsx:205-209` — exact | 🟢 | — |
| ASCII wireframe provenance line | "`page.tsx:365-383`" | Page render is `page.tsx:365-384` (closing brace at 384) | 🟡 | Bump end line 383→384 |

**Verified-matching:** the "Khách hôm nay" static label (`page.tsx:78`), the "(delivered)" sub-label
(`page.tsx:87`), the FE 🔴/🟡 split `isCritical = ing.quantity < ing.warningThreshold` (`page.tsx:318`)
— all three are documented as Flags in `admin_summary.md` and all three match the code. The doc's own
flag list is accurate, not aspirational.

---

## Area 3 — Cross-page dataflow

**Verdict:** ✅ Faithful. The single durable handoff (stock-in write → DB row → sibling page) and the
dual cache invalidation are exactly as drawn. No SSE/WS on the page — confirmed (no realtime hook
imported in `page.tsx:1-12`).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Stock-in invalidations | busts `['admin','low-stock']` **and** `['admin','ingredients']` | `page.tsx:225` + `page.tsx:226` — exact keys | 🟢 | — |
| Write payload | `{ingredient_id, type:'in', quantity, note}` | `page.tsx:218-223` — exact | 🟢 | — |
| Durable server write | `current_stock += qty` + INSERT `stock_movements` | `ingredient_repo.go:221-248` — confirmed, `in`→`current_stock + ?` | 🟢 | — |
| No realtime | "no SSE/WS on this page; refetch-only" | No `useOrderSSE`/`useAdminSSE`/`useOverviewWS`/EventSource in `page.tsx` | 🟢 | — |
| F5 resets `range` | resets to `'today'` (local state, no persist) | `page.tsx:366` `useState`, no persister | 🟢 | — |
| "Xem toàn bộ kho →" link | raw `<a href="/admin/ingredients">`, full-page nav | `page.tsx:304` — confirmed raw `<a>`, not `next/link` | 🟡 | Real UX gap (full reload). Doc *correctly* flags it (`admin_summary.md` Flag 6). Code-fix task, not doc drift. |

---

## Area 4 — Loading behaviour

**Verdict:** ✅ Faithful. All 6 loading layers and all 4 per-query skeletons match. The doc's most
important self-flag — **no `isError` on any query** — is confirmed true against the code.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Layer 1 `(dashboard)/layout.tsx` | wraps in `OrdersWSProvider`, no loading UI | `(dashboard)/layout.tsx:1-5` — exact | 🟢 | — |
| Layer 2 `AuthGuard` | returns `null` while user null | `AuthGuard.tsx:23` — `if (!user) return null` | 🟢 | — |
| Layer 3 `RoleGuard` | "Không có quyền truy cập trang này" if role<MANAGER | `RoleGuard.tsx:16-19` — exact; wired `admin/layout.tsx:30` `minRole={Role.MANAGER}` | 🟢 | — |
| Layer 4 `admin/loading.tsx` | orange spinner `h-8 w-8 animate-spin border-t-orange-500` | `admin/loading.tsx:2-6` — exact class string | 🟢 | — |
| Layer 5 no summary `loading.tsx` | file does not exist | confirmed — folder holds only `page.tsx` | 🟢 | — |
| 4 skeletons (counts/classes) | KPI 4×`h-28`, top 5×`h-8`, staff 4×`h-8`, stock 3×`h-12` | `page.tsx:65-73 / 117-120 / 169-172 / 309-312` — all exact | 🟢 | — |
| `staleTime` | 60_000 ×3, 120_000 low-stock | `page.tsx:62 / 111 / 163 / 297` — exact | 🟢 | — |
| StockIn pending button | `disabled={mut.isPending}`, label "Đang lưu..." | `page.tsx:280` + `page.tsx:283` — exact; doc cites `:279`, code starts `:278` | 🟡 | Bump cited line `279`→`278` |
| **No `isError` on any query** | Flag 1: skeleton pulses forever on network error | `page.tsx:59 / 108 / 160 / 294` — none destructure `isError` | 🟡 | Real code gap — doc is **correct**. Add `isError`→error/retry UI (future code task). |

---

## Area 5 — FE⇄BE data model

**Verdict:** ✅ Faithful on every behavioural and contract claim. The drift here is purely mechanical:
the `_be.md` route line-numbers are stale (the `adminR` block shifted ~13 lines), and one parenthetical
about the admin-only sub-group is incomplete.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `adminR` route block lines | group `main.go:294-295`; summary `:296`, top-dishes `:297`, staff-perf `:298`, low-stock `:300`, stock-mvt `:305` | group `main.go:307-308`; summary `:309`, top-dishes `:310`, staff-perf `:311`, low-stock `:313`, stock-mvt `:318` | 🟡 | Re-cite all 5 route lines (+`authMW` is `:164` not `:151`) |
| `admIngR` admin-only sub-group | "only gates `DELETE /ingredients/:id`" (`main.go:311-315`) | `main.go:323-328` gates **two**: `DELETE /ingredients/:id` (`:326`) **and** `DELETE /training/guides/:id` (`:327`) | 🟡 | Doc omits the 2nd DELETE. No impact on this page (neither route used). Reword + re-cite. |
| Summary SQL (customers/dishes_sold/revenue/active_tables) | non-cancelled count · `IN('delivered','paid')` · `status='completed'` · range-agnostic live tables | `analytics_repo.go:63-107` — all 4 clauses confirmed; `active_tables` no date filter `:92-96` | 🟢 | — |
| `validRange` | only `week`/`month` honoured, else `today` | `analytics_service.go:19-26` — exact | 🟢 | — |
| Top-dishes `pct` over top-N | `PctTimes100 = qty*10000/totalQty` of returned rows | `analytics_repo.go:150-153` — exact | 🟢 | — |
| Top-dishes limit guard | `>50` resets to `5` (not clamped) | `analytics_repo.go:110-112` — `if limit<=0 \|\| limit>50 { limit=5 }` | 🟢 | — |
| Staff-perf chef revenue omitted | `revenue` key absent for `role=="chef"` | `analytics_handler.go:72-84` — conditional attach; FE type `revenue?` optional `admin.api.ts:202-208` | 🟢 | — |
| Low-stock `WHERE current_stock <= min_stock*1.2` | items up to 1.2× threshold | `ingredient_repo.go:120-141` — exact | 🟢 | — |
| `toIngredientJSON` camelCase keys | `quantity`/`warningThreshold`/`importDate`/`shelfDays`/`expiryDate`/`status` | `ingredient_handler.go:28-43` — all keys match; FE `Ingredient` type matches `admin.api.ts:223-235` | 🟢 | — |
| Stock-mvt response snake_case | `{id, ingredient_id, type, quantity, note, created_at}` | `ingredient_handler.go:195-202` — exact | 🟢 | — |
| Stock-in not transactional | 3 sequential stmts, no `BEGIN` | `ingredient_repo.go:221-248` — confirmed; `in`&`adjustment`→`current_stock + ?` | 🟢 | — |
| No Redis on 5 endpoints | every read hits MySQL live | grep clean — no `rdb`/`redis`/`cache` in analytics/ingredient layers | 🟢 | — |
| FE summary/top-dish/staff types | snake_case `dishes_sold`/`active_tables`; `pct`/`qty`; `staff_id`/`full_name` | `admin.api.ts:188-208` — every field matches BE JSON | 🟢 | — |
| FE caller lines | `admin.api.ts:210-217, 264-265, 276-277` | `getSummary :210`, `getTopDishes :213`, `getStaffPerformance :216`, `getLowStock :264`, `postStockMovement :276` | 🟢 | — |

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🟡 Doc fix | Re-cite the 5 `adminR` route lines (`:309/:310/:311/:313/:318`) and `authMW` (`:164`) — block shifted ~13 lines | `admin_summary_be.md:23-38` |
| 2 | 🟡 Doc fix | Reword the `admIngR` note: the admin-only group gates **two** DELETEs (`/ingredients/:id` + `/training/guides/:id`), at `main.go:323-328` | `admin_summary_be.md:32-33` |
| 3 | 🟡 Doc fix | Bump stale FE line cites: ASCII provenance `383`→`384`; StockIn button `279`→`278` | `admin_summary.md:53`, `admin_summary_loading.md:155` |
| 4 | 🟡 Code bug | Add `isError` handling to the 4 `useQuery` calls so a failed fetch shows an error/retry, not a forever-pulsing skeleton | `summary/page.tsx:59,108,160,294` |
| 5 | 🟡 Code bug | Replace raw `<a href="/admin/ingredients">` with `next/link` `<Link>` to avoid a full-page reload | `summary/page.tsx:304` |

> **CLAUDE.md note:** items 1–3 are a single doc-fix task. Items 4–5 are code changes — each must be
> registered as a row in `docs/tasks/MASTER_TASK.md` and ALIGNed with the owner **before** any file is
> touched. This comparison file changes nothing on its own.
