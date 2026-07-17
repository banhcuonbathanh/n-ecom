# Admin Marketing — Backend View — `/admin/marketing`

> **TL;DR:** ✅ implemented · **1 endpoint, read-only.** `GET /admin/marketing/spend`
> (`authMW` + `AtLeast("manager")`) returns **fully hardcoded** campaign budget/spend/love-score
> data straight from the handler — **no service, no repository, no SQL, no Redis**. The `from`/`to`
> query params are accepted and echoed back in `date_range` but **never used to filter** — every
> number is a constant. The page's "Xuất báo cáo" / "+ Nhập chi tiêu" buttons are placeholder toasts
> (no endpoint). This is an intentional pre-launch stub, not a bug.
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `be/cmd/server/main.go` · `be/internal/handler/marketing_handler.go`
> FE caller: `fe/src/hooks/useMarketingSpend.ts` · `fe/src/app/(dashboard)/admin/marketing/page.tsx`
> FE sibling doc: [admin_marketing.md](admin_marketing.md) · loading: [admin_marketing_loading.md](admin_marketing_loading.md) · scenario: [SCENARIO_MARKETING.md](SCENARIO_MARKETING.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|----------|------|---------|---------|--------------|-------------|
| 1 | `GET /admin/marketing/spend?from=&to=` | `authMW` + `AtLeast("manager")` | `marketingH.GetSpend` (`marketing_handler.go:19`) | **none** — handler builds the response inline | **none** — no repo/sqlc query | **none** |

Route registration: `adminR.GET("/marketing/spend", marketingH.GetSpend)` (`be/cmd/server/main.go:306`),
inside the `adminR := v1.Group("/admin")` group guarded by `adminR.Use(authMW, middleware.AtLeast("manager"))`
(`main.go:294-295`). Handler constructed at `main.go:111` (`handler.NewMarketingHandler()` — a zero-field struct, `marketing_handler.go:10-15`).

---

## Auth Model on This Page

- The single endpoint is **`authMW` + `AtLeast("manager")`** — same gate as every other `/admin/*`
  analytics route (summary, top-dishes, ingredients, tasks). A valid staff JWT with role
  `manager` **or** `admin` passes; `chef`/`cashier`/`customer` are rejected by `AtLeast("manager")`.
- The FE never sends a guest token here — the page lives behind the admin shell
  (`(dashboard)/admin/layout.tsx` AuthGuard + RoleGuard `minRole=MANAGER`), so an unauthenticated
  or under-privileged user is redirected before the request fires.
- No `created_by` / ownership concept applies — the response is global static data, not scoped to
  the caller.

---

## Per-Endpoint Detail

### 1 · `GET /admin/marketing/spend`

- **Handler:** `MarketingHandler.GetSpend` (`marketing_handler.go:19-80`). It reads
  `from := c.DefaultQuery("from", "2026-05-01")` and `to := c.DefaultQuery("to", "2026-05-31")`
  (`marketing_handler.go:20-21`), then builds and returns a `gin.H` literal with
  `c.JSON(http.StatusOK, …)` (`marketing_handler.go:56-79`).
- **`from`/`to` are echoed, not applied.** They appear only inside `"date_range": {from, to}`
  (`marketing_handler.go:58`). The `items`, `summary`, and `love_score` payloads are **hardcoded
  constants** (`marketing_handler.go:23-77`) — changing the date range returns byte-identical
  numbers. See Flag 1.
- **No service / repo / SQL / Redis.** The handler has no injected dependencies
  (`NewMarketingHandler()` returns `&MarketingHandler{}`, `marketing_handler.go:13-15`); it never
  touches the DB or cache. The handler comment states this explicitly: *"Returns static campaign
  budget + spend data for the new restaurant launch."* (`marketing_handler.go:17-18`).
- **Response shape** (consumed by `fe/src/types/marketing.ts` `MarketingSpendResponse`):
  - `date_range: {from, to}` — the echoed query params.
  - `summary: {total_budget, total_spent, total_remaining, spent_pct, roi, roi_base}`
    (`marketing_handler.go:59-66`) → FE `BudgetSummaryCards` renders 4 KPI cards incl. `roi`/`roi_base`
    ("ROI dự kiến", `BudgetSummaryCards.tsx:21`).
  - `items: [{id, icon, name, sub_items[], budget, spent, remaining, progress_pct, color}]`
    (5 categories, `marketing_handler.go:23-54`) → `SpendBreakdownTable` + `BudgetDonutChart`.
  - `love_score: {cost_per_new_customer, target_customers, current_customers, target_followers,
    current_followers, follower_progress_pct, satisfaction_score, satisfaction_max}`
    (`marketing_handler.go:68-77`) → `LoveScoreSection` 3 cards.

---

## Caching & Invalidation

- **Server:** none. No Redis read-cache, no key, no TTL, no invalidation trigger — the handler
  computes nothing and stores nothing. (Matches `03_be/REDIS_CACHE.md` do-not-cache posture: this
  endpoint is not listed because it never reaches Redis.)
- **Client:** TanStack Query only. `useMarketingSpend` keys on
  `['marketing', 'spend', dateRange]` with `staleTime: 5 * 60 * 1000` (5 min) and
  `enabled: !!from && !!to` (`useMarketingSpend.ts:6-16`). Because the BE ignores `from`/`to`, the
  per-range cache entries all hold identical data — distinct cache keys, identical payloads.

---

## Error Behaviour

- **The endpoint cannot fail server-side from input** — there is no binding, no validation, no DB
  call. `DefaultQuery` supplies fallbacks for missing `from`/`to`, so even a param-less request
  returns `200` with the May-2026 default range. The only realistic failure modes are transport
  (network down) or auth (`401`/`403` from `authMW`/`AtLeast`).
- **FE-visible states:** on any non-2xx / network error, `useMarketingSpend` sets `isError`; the
  page renders the red banner *"Không thể tải dữ liệu."* with a **Thử lại** (`refetch`) link
  (`marketing/page.tsx:46-53`). An empty `items[]` (never happens with the static payload) would
  show `EmptyState` *"Chưa có hạng mục chi tiêu nào."* (`page.tsx:73-74`).

---

## Flags

| # | Flag | Detail |
|---|------|--------|
| 1 | **`from`/`to` accepted but ignored — date filter is decorative.** | The header date picker (`MarketingPageHeader`) changes `dateRange` → triggers a refetch with new params, but `GetSpend` only echoes them into `date_range`; all budget/spend/love-score numbers are constants (`marketing_handler.go:23-77`). A manager changing the range sees the filter "work" (URL params + refetch) but identical figures. Intentional pre-launch stub, **not a code bug** — surfaced so the doc set is honest. |
| 2 | **Whole endpoint is hardcoded mock data.** | No service/repo/SQL — `marketing_handler.go` is the entire backend. There is no `marketing` table, no spend ledger. When real spend tracking is built, this handler must be replaced with a service+repo reading actual data. Handbook already marks it static (`03_be/BE_CODE_SUMMARY.md:59,173`; `02_spec/API_SPEC.md:184`) — **no drift**. |
| 3 | **"Xuất báo cáo" / "+ Nhập chi tiêu" have no endpoint.** | Both call `toast.info('… đang phát triển')` (`marketing/page.tsx:41-42`) — placeholders, no BE write path exists. Listed here so a reader of the BE view knows there is no export/create API to trace. |
| 4 | **No realtime.** | Pull-only via TanStack Query; no SSE/WS. A spend change (when implemented) would not push to open dashboards. |

> No `<PAGE>_BUGS.md` for this page: the trace found no FE↔BE event/ownership/dead-output
> disagreement — only intentional-stub behaviour (Flags 1–3), which a doc edit (not app code) is the
> correct response to.
