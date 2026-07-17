# BE Quality Audit Report — 2026-07-12

> **Scope:** `be/` — audited against `.claude/skills/backend-go/SKILL.md`, layer architecture, error contract, and test coverage.
> **Solution:** Phase **QA-BE** in `docs/tasks/MASTER_TASK.md` (6 tasks) · one-session run prompt → [`QA_BE_PROMPT.md`](QA_BE_PROMPT.md)
> **Status at audit time:** `go build` ✅ · `go vet` ✅ · `go test ./be/internal/...` ✅ (service pkg only, ~6s)

---

## Summary

Solid core, 5 real issues + 4 smaller observations. The strict `handler → service → repository → db` architecture is mostly respected, error handling via `AppError` + `handleServiceError` is consistent, order totals are recalculated inside transactions on the **create** paths, and all three payment gateways verify signatures.

| # | Finding | Severity | Fix task |
|---|---|---|---|
| 1 | `Price` binding rejects price=0 | 🔴 User-facing bug | QA-BE-1 |
| 2 | Item cancel/qty-update recalc outside transaction | 🔴 Data-integrity risk | QA-BE-2 |
| 3 | No HTTP rate limiting (doc says it exists) | 🟠 Doc-vs-code drift + abuse risk | QA-BE-3 |
| 4 | Payment HMAC code has zero tests | 🟠 Risk before P7-7 sandbox | QA-BE-4 |
| 5 | No `respondSuccess` helper — shapes drifting | 🟡 Consistency | QA-BE-5 |
| 6 | 3 handlers skip the service layer | 🟡 Architecture | QA-BE-6 |

---

## Findings (detail)

### 1. 🔴 `binding:"required,min=0"` on `Price` rejects price = 0

`be/internal/handler/product_handler.go:84`, `:125`, `:360`. Gin treats `0` as "missing" when `required` is set on a numeric field, so a free item/topping (price 0) gets a 400. This is the exact gotcha documented in the backend-go skill. Fix: drop `required`, keep `min=0`. (The `Quantity binding:"required,min=1"` cases are fine — 0 is invalid there anyway.)

### 2. 🔴 Item cancel / qty-update recalculates total outside a transaction

`be/internal/service/order_service.go:663-669` (`CancelOrderItem`) and `:717-723` (`UpdateOrderItemQuantity`): the item mutation (`DeleteOrderItem` / `UpdateItemQuantity`) and `RecalculateTotalAmount` are two separate non-transactional repo calls. A crash or DB error between them leaves `total_amount` silently stale — the same class of bug the OC epic fixed. The create paths already do it correctly in-tx (`be/internal/repository/order_repo.go:119`, `:152`); these two paths need the same pattern.

### 3. 🟠 No HTTP rate limiting exists

`be/CLAUDE.md` lists `middleware/ratelimit.go` and `ERROR_CONTRACT_v1.1.md` defines a 429 rate-limit code (>60 req/min/IP), but no rate-limit middleware exists anywhere — only login-attempt throttling inside `auth_service.go`. Public endpoints (guest order creation especially) are unthrottled. Doc and code disagree; QA-BE-3 implements the middleware per contract.

### 4. 🟠 Payment signature verification is untested

`be/internal/payment/` (vnpay · momo · zalopay) contains HMAC signing/verification with **zero** unit tests. Test coverage overall is service-layer-only: 6 service test files + 4 integration tests; nothing for `handler/`, `middleware/` (auth/RBAC!), or `payment/`. Risky code to leave unverified right before P7-7 payment sandbox.

### 5. 🟡 Success responses are hand-rolled; no `respondSuccess` helper

The skill mandates `respondSuccess(...)` but `be/internal/handler/respond.go` only defines `respondError`. Every handler writes `c.JSON(status, gin.H{"data": ...})` by hand and the shape already drifts — `chat_handler.go:107` returns the result with no `data` wrapper (⚠️ FE chat widget now depends on that unwrapped shape — it is **locked**, do not "fix" it).

### 6. 🟡 Three handlers skip the service layer

`FileHandler` and `TableHandler` hold a `repository.*Repository` directly, and `ingredientStatus()` in `be/internal/handler/ingredient_handler.go:14` computes expiry business logic in the handler. Breaks the strict layer rule and makes that logic untestable without HTTP.

### Smaller observations (not registered as tasks)

- **No `context.WithTimeout` anywhere** in handlers/services despite the skill requiring it — a slow MySQL query holds the request open indefinitely.
- **`order_service.go` is 1,048 lines** — approaching split territory (item mutations vs. lifecycle), not urgent.
- Hardcoded `Admin@123` in `be/cmd/seed/main.go:31` — fine for dev seeding, never run in prod.
- `internal/testhelper/testhelper.go:38` test admin password — acceptable (test-only).

---

## Solution

All 6 findings are registered as **Phase QA-BE** in `docs/tasks/MASTER_TASK.md` (QA-BE-1 … QA-BE-6, with per-row ACs).

Designed to complete in **one session with sub-agents** (per `docs/MODEL_SELECTION.md`):

- **Wave 1 (parallel):** QA-BE-1 ∥ QA-BE-3 ∥ QA-BE-4 → Sonnet sub-agents; driver does QA-BE-2 itself (order business rule = difficult → Opus).
- **Gate:** build + vet + full test run, curl checks.
- **Wave 2 (parallel):** QA-BE-5 ∥ QA-BE-6 → Sonnet sub-agents, with a file-collision guard (Agent D skips the 3 handler files Agent E restructures).
- **Final gate:** grep receipts + SELF-REVIEW + MASTER_TASK updates + commit script (git is harness-blocked).

▶ **Run it:** paste the body of [`QA_BE_PROMPT.md`](QA_BE_PROMPT.md) into a fresh Claude Code session.
