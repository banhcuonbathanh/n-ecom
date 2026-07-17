# QA-BE One-Session Prompt

> Paste everything below the line into a fresh Claude Code session to execute Phase QA-BE
> (6 tasks, `docs/tasks/MASTER_TASK.md §Phase QA-BE`) in a single session using sub-agents.
> Delete this file after the phase is ✅.

---

Execute **Phase QA-BE — Backend Quality Fixes** from `docs/tasks/MASTER_TASK.md` (rows QA-BE-1 … QA-BE-6), all in this session, using sub-agents for the normal work per `docs/MODEL_SELECTION.md`. The phase is already registered and ALIGNed — do not re-plan or re-ask; go straight to execution.

## Read first (driver, before anything else)

1. `.claude/skills/backend-go/SKILL.md` — layer rules, respond pattern, binding gotcha, tx-recalc rule
2. `.claude/skills/order-flow/SKILL.md` — required because QA-BE-2 touches order mutation logic
3. `docs/contract/ERROR_CONTRACT_v1.1.md` — exact 429 rate-limit error code + body format (needed for QA-BE-3 sub-agent prompt; never guess code strings)
4. `docs/tasks/MASTER_TASK.md §Phase QA-BE` — the 6 rows + ACs (source of truth for scope)

## Step 0 — Checkpoint

`git add -A && git commit -m "checkpoint: before QA-BE phase"` — if git is blocked by permissions, write the command to `scripts/qa-be-checkpoint.sh` and tell the owner to run it before continuing; do not skip silently.

## Scope contract (only these files may change)

- `be/internal/handler/product_handler.go` (QA-BE-1, QA-BE-5)
- `be/internal/service/order_service.go` + `be/internal/repository/order_repo.go` (QA-BE-2)
- `be/internal/middleware/ratelimit.go` NEW + `be/cmd/server/main.go` (QA-BE-3, QA-BE-6 wiring)
- `be/internal/payment/*_test.go` NEW (QA-BE-4) — no production files in `internal/payment/`
- `be/internal/handler/respond.go` + handler files currently using `gin.H{"data": ...}` (QA-BE-5)
- `be/internal/handler/{file,table,ingredient}_handler.go` + new/extended files in `be/internal/service/` (QA-BE-6)
- `docs/tasks/MASTER_TASK.md` + `docs/tasks/CURRENT_TASK.md` (status updates only)

Any other file → STOP and ask the owner.

## Execution plan — 2 waves

### Wave 1 (launch 3 Sonnet sub-agents in parallel, `run_in_background: true`; driver does QA-BE-2 itself meanwhile)

Spawn each with the Agent tool, `subagent_type: "general-purpose"`, `model: "sonnet"`. Every sub-agent prompt MUST contain: the exact files it may touch, the exact change, the AC from the MASTER row, the instruction "change nothing outside the listed files; do not commit; report a summary of your diff and the verify output".

- **Agent A — QA-BE-1:** In `be/internal/handler/product_handler.go` lines 84, 125, 360, change `binding:"required,min=0"` on the `Price int64` fields to `binding:"min=0"` (Gin treats 0 as missing when `required` is set on numerics, so price=0 is rejected with 400). Touch nothing else. Verify: `go build ./... && go vet ./be/...` from repo root.
- **Agent B — QA-BE-3:** Create `be/internal/middleware/ratelimit.go`: per-IP sliding/fixed window, 60 req/min, exceeding → 429 with EXACTLY the error code and JSON shape from `docs/contract/ERROR_CONTRACT_v1.1.md` (read it; match the `respondError` body format `{"error": CODE, "message": ...}`). Follow the existing middleware style in `be/internal/middleware/auth.go` (explicit dependency injection, no globals if the existing files avoid them). Wire it in `be/cmd/server/main.go` on the API router group. Verify: build + vet, then start nothing — driver will curl-verify after the wave.
- **Agent C — QA-BE-4:** Add unit tests for signature verification in `be/internal/payment/` — `vnpay_test.go`, `momo_test.go`, `zalopay_test.go`. Read each gateway file first to find the verify/sign functions and their exact input shapes. Minimum per gateway: (1) payload signed with the test secret passes, (2) tampered payload fails, (3) wrong secret fails where the API allows. NO production code changes — if a function is untestable without changes, report that back instead of refactoring. Verify: `go test ./be/internal/payment/...`.

**Driver (you) — QA-BE-2, do NOT delegate (order business rule → Opus):** In `be/internal/service/order_service.go:663-669` (CancelOrderItem) and `:717-723` (UpdateOrderItemQuantity), the item mutation and `RecalculateTotalAmount` are two separate non-transactional repo calls — a failure in between leaves `total_amount` stale. Add tx-wrapped repo methods in `be/internal/repository/order_repo.go` (e.g. `DeleteOrderItemAndRecalc`, `UpdateItemQuantityAndRecalc`) using the same `BeginTx → qtx → RecalculateTotalAmount → Commit` pattern already used at `order_repo.go:119` and `:152`, then call them from the service. Keep the `publishOrderEvent` calls after the tx commits. Remember the Critical Rule: combo header rows have `unit_price=0` — recalc sums all rows; do not change the recalc SQL. Verify: `go test ./be/internal/service/...`.

### Wave 1 gate (driver)

When all Wave-1 agents report back: run `go build ./... && go vet ./be/... && go test ./be/internal/...` from repo root. If red → fix or re-instruct the failing agent via SendMessage before Wave 2. Then curl-verify QA-BE-3 (61 rapid requests → last one 429) and QA-BE-1 (`price:0` product accepted) against `docker compose up -d --build be` if the stack is available; if Docker is not running, note it as a leftover verify step for the owner instead of blocking.

### Wave 2 (launch 2 Sonnet sub-agents in parallel — only after the gate is green)

- **Agent D — QA-BE-5:** Add to `be/internal/handler/respond.go`: `func respondSuccess(c *gin.Context, status int, data any) { c.JSON(status, gin.H{"data": data}) }`. Then mechanically replace `c.JSON(status, gin.H{"data": X})` with `respondSuccess(c, status, X)` across `be/internal/handler/*.go`. Rules: (1) responses whose top-level shape is NOT exactly `{"data": ...}` (extra keys like `message`, or auth token responses) stay as-is; (2) **`chat_handler.go:107` must NOT be changed** — the FE chat widget depends on the unwrapped shape; add a one-line comment `// shape locked: FE chat widget reads top-level fields` instead. Response JSON must be byte-identical everywhere. Verify: build + vet + `go test ./be/internal/...`.
- **Agent E — QA-BE-6:** Remove the layer skip: `FileHandler` and `TableHandler` currently hold `repository.*Repository` directly, and `ingredientStatus()` in `be/internal/handler/ingredient_handler.go:14` is business logic in the handler. Create/extend `be/internal/service/file_service.go`, `table_service.go`, and move ingredient status derivation into the ingredient service. Handlers keep only: bind → call service → respond. Service returns `*AppError` per the existing pattern in `be/internal/service/errors.go`; handlers use `handleServiceError`. Update DI wiring in `be/cmd/server/main.go`. Response shapes and behavior must be unchanged. Verify: build + vet + all tests.

Agents D and E both touch handler files — their file sets are disjoint EXCEPT `ingredient_handler.go` may appear in both (D refactors its success responses, E moves its logic). To avoid a collision, tell Agent D to **skip `file_handler.go`, `table_handler.go`, `ingredient_handler.go`** and have Agent E apply `respondSuccess` in those 3 files as part of its refactor.

### Final gate (driver)

1. `go build ./... && go vet ./be/... && go test ./be/internal/...` — must be fully green.
2. Grep receipts: no `binding:"required,min=0"` on Price; no `repository.` field in handler structs; `RecalculateTotalAmount` no longer called directly from `order_service.go` item-mutation paths.
3. SELF-REVIEW per CLAUDE.md: spec followed, no regressions, ACs met, only scope-contract files changed (`git status` diff list vs contract).
4. Update `docs/tasks/MASTER_TASK.md` Phase QA-BE rows to ✅ with one-line receipts in the AC column (what was verified, how); update phase Status line. Update `docs/tasks/CURRENT_TASK.md`.
5. If git commits are blocked, write `scripts/qa-be-commit.sh` with a proper conventional commit message (`fix(be): QA-BE phase — price=0 binding, tx recalc, rate limit, payment sig tests, respondSuccess, layer fix`) and hand it to the owner.
6. Final report to owner: per-task status table, verify outputs, and any leftover risks (e.g. Docker-dependent curl checks not run).
