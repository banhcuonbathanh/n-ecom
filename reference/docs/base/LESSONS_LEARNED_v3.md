| 📚 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
LESSONS LEARNED — Documentation Architecture & Claude Workflow Guide
Áp dụng cho mọi dự án phức tạp tương tự · v3.0 · Tháng 4/2026 |
| --- |

# 🤝 Phần 0 — WORKFLOW: Claude Làm Việc Với Bạn Như Thế Nào

| Phần này là MỚI trong v3.0 — mô tả đầy đủ cách Claude hoạt động trong dự án BanhCuon để bạn không bị bất ngờ và có thể làm việc hiệu quả nhất với Claude. |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- |

## 🧠 0.1 — Triết Lý Cốt Lõi: Claude Là Senior Coworker

| Claude không phải công cụ gõ lệnh — Claude là đồng đội đọc spec, viết code, phát hiện vấn đề, và lên tiếng khi cần. Bạn quyết định cuối cùng, Claude đảm bảo bạn có đủ thông tin để quyết định đúng. |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 🔍 ĐỌC KỸ
Đọc spec + MASTER + migration trước khi code — không giả định | 🚨 LÊN TIẾNG
Flag bug, risk, conflict ngay lập tức — không im lặng làm | 🤝 MINH BẠCH
Giải thích why cho mọi quyết định — bạn luôn biết Claude đang làm gì | 🎯 ĐÚNG HƯỚNG
Clarify DoD trước khi code — không 'xong nhưng sai hướng' |
| --- | --- | --- | --- |

## 🔄 0.2 — Vòng Lặp Làm Việc Chuẩn (Standard Session Loop)

| Bước          | Bạn Làm                              | Claude Làm                                                                | Output                                           |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------ |
| ① START       | Gõ /start [feature] hoặc mô tả task  | Đọc spec + MASTER liên quan, xác định scope, phát hiện gap                | Tóm tắt understanding + câu hỏi clarify (nếu có) |
| ② ALIGN       | Trả lời câu hỏi clarify, confirm DoD | Confirm understanding, break task thành sub-steps nếu lớn                 | Plan rõ ràng trước khi code                      |
| ③ IMPLEMENT   | Review sub-steps, approve plan       | Code theo sqlc-only/no-ECC, kèm comment giải thích logic phức tạp         | Code + file list cần tạo/sửa                     |
| ④ SELF-REVIEW | (chờ)                                | Mental audit: happy path, error path, race condition, security, duplicate | 🚨 RISK nếu phát hiện vấn đề                     |
| ⑤ REVIEW      | Đọc code, test, feedback             | Address feedback, giải thích trade-off nếu không đồng ý                   | Code hoàn thiện                                  |
| ⑥ HANDOFF     | Gõ /handoff                          | Tóm tắt đã làm, update Current Work, list follow-up items                 | /handoff summary + Section 7 updated             |

## 📣 0.3 — Hệ Thống Prefix: Claude Báo Bạn Như Thế Nào

| Claude dùng prefix chuẩn hóa để bạn biết ngay mức độ quan trọng. Đọc prefix trước — rồi đọc nội dung. |
| ----------------------------------------------------------------------------------------------------- |

| Prefix         | Mức Độ   | Claude Dùng Khi Nào                                              | Bạn Cần Làm                       |
| -------------- | -------- | ---------------------------------------------------------------- | --------------------------------- |
| 💡 SUGGESTION: | Info     | Thấy cách tốt hơn, pattern hay hơn, optional improvement         | Đọc, quyết định có apply không    |
| ⚠️ FLAG:       | Warning  | Doc conflict, ambiguous spec, potential drift, cần attention     | Phải xử lý trước khi tiếp tục     |
| 🚨 RISK:       | High     | Bug tiềm ẩn, security hole, production risk, data loss potential | Dừng, đọc kỹ, quyết định approach |
| 🔴 STOP:       | Critical | Sẽ gây bug production nếu tiếp tục — Claude từ chối làm tiếp     | Phải giải quyết ngay mới tiếp tục |
| ❓ CLARIFY:    | Question | Cần thêm thông tin để proceed, spec không đủ rõ                  | Trả lời để Claude unblock         |
| 🔄 REDIRECT:   | Change   | Đang đi sai hướng — Claude đề xuất hướng khác tốt hơn            | Evaluate và confirm hướng mới     |

## 📋 0.4 — Các Tình Huống Thường Gặp & Cách Claude Xử Lý

| Tình Huống                          | Claude Làm                                                                                                        | Claude KHÔNG Làm                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Spec thiếu edge case                | Hỏi: 'Edge case X thì handle thế nào?' trước khi code                                                             | Code rồi mới hỏi sau                          |
| Tìm thấy bug trong code cũ          | Flag 🚨 RISK ngay dù không trong scope task hiện tại                                                              | Giả vờ không thấy, làm tiếp                   |
| 2 docs mâu thuẫn nhau               | Báo ⚠️ FLAG + hỏi doc nào là source of truth                                                                      | Tự chọn 1 doc để follow                       |
| Task quá lớn cho 1 session          | Break down + confirm scope trước khi bắt đầu                                                                      | Làm một nửa rồi stop giữa chừng               |
| Code đúng spec nhưng có risk        | Implement + flag 🚨 RISK rõ ràng, giải thích why                                                                  | Im lặng implement                             |
| Không hiểu requirement              | Hỏi ngay: 'Ý bạn là X hay Y?' (max 3 câu)                                                                         | Đoán mò rồi code                              |
| Biết cách tốt hơn                   | 💡 SUGGESTION với trade-off rõ ràng, để bạn quyết                                                                | Tự ý làm khác với spec                        |
| Review code của bạn                 | Honest feedback — không chỉ khen, chỉ rõ risk + suggest fix                                                      | Rubber stamp mọi thứ                          |
| Deadline gấp                        | Prioritize, flag ⚠️ những gì bỏ qua để fix sau                                                                   | Cut corners im lặng                           |
| Task không có trong MASTER_TASK.md  | STOP → 5-step gate: Classify → Register (show draft row) → Size + break down → Show full plan → Wait for ALIGN   | Tự ý code ngay sau khi owner confirm task tồn tại |

## ⚠️ 0.6 — Known Weaknesses in This System (Added 2026-04-30)

These are structural gaps identified after a full audit of the workflow. Each has a mitigation.

### Weakness 1 — Duplicate Phase State

**Problem:** Phase status lives in both `CLAUDE.md` and `docs/TASKS.md`. They will drift.
**Mitigation:** `TASKS.md` is the single source of truth. `CLAUDE.md` Phase Status table is a quick-glance summary only — always update `TASKS.md` first. When the two disagree, `TASKS.md` wins.

### Weakness 2 — No Automated Enforcement

**Problem:** Every rule (no business logic in handlers, no localStorage, HMAC first, soft-delete filters) is a text instruction to Claude. If Claude misses something in the Step 5 self-review, nothing catches it automatically.
**Mitigation (short term):** The self-review checklist in Step 5 is the only backstop — treat it as mandatory, not optional. Flag any checklist miss as 🚨 RISK.
**Mitigation (long term):** Add linters/CI checks for the highest-risk rules when Phase 4 starts:

- `grep -r "localStorage" fe/src/` → fail if found
- `go vet ./...` + a custom linter rule for gin imports in service layer
- pre-commit hook: `wc -l CLAUDE.md` → fail if > 150 lines

### Weakness 3 — Document Staleness with No Signal

**Problem:** Layer 2 and Layer 3 docs have no "last verified" date. Claude reads them as authoritative even if they predate significant code changes.
**Mitigation:** Add a `> Last verified: YYYY-MM-DD` line at the top of each Layer 2 and Layer 3 document. At the end of each phase, run a reconciliation pass:

- Open each spec → confirm it still matches the API contract and schema
- If it does not → update the spec OR raise ⚠️ FLAG before starting work in that domain

### Weakness 4 — Uneven Task Granularity

**Problem:** TASKS.md mixes 20-minute tasks (pubsub.go wrappers) with 3-hour tasks (full auth service). This makes session planning unreliable and increases the chance of leaving a task half-done.
**Mitigation:** When a task in TASKS.md looks like it will take more than 90 minutes in a single session, break it into sub-tasks before starting. The signal: any task with 3+ distinct files to create, or any task that crosses two service layers. Flag with ❓ CLARIFY to confirm the breakdown before coding.

### Weakness 5 — Navigation-only index files cause multi-file context switching

**Problem:** BE_DOC_INDEX.md and FE_DOC_INDEX.md pointed to the right files but contained no actual content. Every session required opening 4–6 different files just to get context before writing a single line of code. This increased the chance of missing a critical rule.
**Resolution (2026-04-30):** Created `docs/be/BE_SYSTEM_GUIDE.md` and `docs/fe/FE_SYSTEM_GUIDE.md` — comprehensive system guides that consolidate: epic breakdown · all critical rules · code patterns · DI skeleton · error codes · per-domain reading list. Each guide is the single entry point for its side. Spec files are still the source of domain-specific detail, but the guide tells you exactly which spec to read and when.

### Weakness 7 — Spec skipped during READ phase (2026-05-10)

**Problem:** Claude read existing code first and jumped to planning without opening the domain spec. The plan contradicted spec-defined interaction patterns (e.g. `ToppingModal` triggered by `+ Thêm`, not image click). Caught only after user asked "did you check the spec?"
**Root cause:** No blocking gate between READ and PLAN — Claude treated code exploration as sufficient context.
**Rule:** If the task touches a domain with a spec file → open and read that spec **before** forming any plan. This is a hard stop, not a suggestion.
**Scope (spec required):** Auth · Products · Menu/Checkout · Orders · Payment · QR/POS · Staff · Admin Dashboard
**Scope (spec NOT required):** infra/DevOps, test setup, pure refactoring with no new behaviour, tooling.

### Weakness 8 — No procedure check before diving into code (2026-05-10)

**Problem:** User requested a "product detail page" — a feature not in any spec and not in TASKS.md. Instead of asking what the user wanted first, Claude immediately opened spec files and source code to "understand context." This is backwards: reading code before understanding requirements wastes context window, produces a plan shaped by implementation details rather than user intent, and signals to the user that Claude is guessing rather than listening.
**Root cause:** The READ step rule only covered "tasks that touch a domain with a spec." It gave no instruction for tasks with NO spec and NO TASKS.md entry — the gap case.
**Rule:** Before the READ step, run a **procedure check**:
1. Is this task in `docs/TASKS.md`? → follow normal 7-step workflow.
2. Is there a spec for this domain? → read spec first, then plan.
3. Neither? → **STOP. Ask the user for requirements before reading any file.**
Reading code before requirements are clear is never the right first move for a spec-less task.
**Index:** Full procedure-to-task mapping lives in `docs/PROCEDURE_INDEX.md`.

### Weakness 9 — Task started without a MASTER.md row, plan, or breakdown (2026-05-12 · updated 2026-05-25)

**Problem:** Work begins on a task that has no row in `docs/tasks/MASTER_TASK.md`, OR a row exists but Claude jumps straight into coding without showing a plan, breaking it down, or waiting for ALIGN confirmation. Both cases produce untracked, unreviewed work that may go in the wrong direction.
**Root cause (original):** The 7-step workflow assumed the task already existed in MASTER.md. There was no explicit gate enforcing this before step 1 (READ).
**Root cause (updated):** Even after "add the row + confirm" was added, Claude had no gate between confirmation and coding for unlisted tasks. Claude treated owner confirmation of the *task existence* as permission to code immediately — skipping the plan and breakdown steps that listed tasks go through.

**Rule — 5-step gate for any task NOT on the list (no exceptions):**

| Step | Action | Gate |
|---|---|---|
| 1 — Classify | Ask: bug fix / feature / refactor? Which domain? Urgent or backlog? | Owner answers |
| 2 — Register | Add draft row to MASTER_TASK.md using TEMPLATE_TASK.md format. Show draft, wait for confirmation | Owner confirms row |
| 3 — Size + break down | Apply < 100k token rule. 1–2 files + 1 AC = 1 task ✅. 3+ files or 3+ scenarios → sub-tasks ⚠️ | Sub-task rows added |
| 4 — Show full plan | Present: which files change + why, AC per sub-task, execution order, dependencies | Owner reads plan |
| 5 — Wait for ALIGN | Do not write a single line of code until owner explicitly confirms the plan | Owner says go |

**Effect:** An unlisted task now goes through the same Register → Size → Plan → Align gate as a listed task. The only difference is that Steps 2–3 happen first to create the MASTER row before the plan is written.

### Weakness 10 — Tasks too large to complete in one session (2026-05-12)

**Problem:** A task is estimated to take "a few sessions" but is written as a single row in MASTER.md. Mid-session the context window fills, the task is left half-done, and the next session cannot safely resume without re-reading everything.
**Root cause:** No explicit token budget per task row. Task granularity was driven by feature scope, not session capacity.
**Rule:** Every task and sub-task must be completable in **< 100k tokens** (≈ 1 session).

**How to break down a task into sub-tasks (< 100k rule):**

| Signal | Action |
|---|---|
| Task touches 3+ files OR 3+ distinct scenarios | Split into sub-tasks — 1 sub-task per scenario or file group |
| Task spans two service layers (e.g. handler + service + repo) | Keep as 1 task only if all layers are straightforward; split if any layer has complex logic |
| Task has a mandatory prerequisite that is itself non-trivial | Make the prerequisite a separate sub-task with a dep arrow |
| FE task: 3+ components + page assembly | 1 sub-task per component + 1 sub-task for page assembly (always last) |
| Task description needs more than 2 sentences to explain the AC | Too broad — split until each sub-task has a 1-sentence AC |
| You cannot verify the task independently without the next task being done | Split so each sub-task is independently verifiable |

**Size signal quick-check:**
- 1–2 files, 1 clear AC → fits in 1 session ✅
- 3+ files OR 3+ scenarios → break into sub-tasks ⚠️
- When in doubt → split. A sub-task too small costs nothing. A task too large breaks mid-session and loses context.

**How to apply:** Before writing any code, count the files to touch and the distinct ACs. If > 2 of either → open MASTER.md and write the sub-task rows first. Get owner confirmation on the breakdown before proceeding.

### Weakness 6 — FE tasks created without a visual model (2026-05-03)

**Problem:** Phase 8 FE tasks (admin overview, PrepPanel, etc.) were created directly from spec text with no wireframe. Components like PrepPanel and the Kiểm tra toggle were discovered mid-coding, not during planning. This caused task rows to be rewritten after implementation started, and some components were built without clear spec traceability.
**Root cause:** The workflow went Spec → TASKS.md → code with no intermediate visual step. FE is inherently spatial — a text spec cannot fully define what needs to be built without a layout drawing.
**Resolution (2026-05-03):** Added **Step 0 — FE Pre-Task Phase** to `IMPLEMENTATION_WORKFLOW.md`:

- `0a READ SPEC` — read domain spec end-to-end, mark every screen + data source
- `0b DRAW Wireframe` — ASCII or Excalidraw frame, label every zone `[ComponentName]` + data source. Save to `docs/fe/wireframes/[page].md`
- `0c DECOMPOSE` — 1 component = 1 task row. Shared components first, page.tsx assembly last
- `0d WRITE TASK ROWS` — each row must have `spec_ref: Spec_X §Y.Z` + `draw_ref: wireframes/p.md zone-N`
  **Rule:** A FE task row with no `spec_ref` is not ready to start. A FE task row with no `draw_ref` means no wireframe exists yet — run 0b first.

### Weakness 11 — Behavioral guidelines treated as "coding rules only" (2026-05-25)

**Problem:** The four core behavioral guidelines — Think Before Acting, Simplicity First, Surgical Changes, Goal-Driven Execution — were mentally framed as coding rules. During planning, documentation, and analysis tasks, Claude operated without the same discipline: over-elaborating plans, touching unrelated doc sections, or starting to explore files before the user's intent was clear.
**Root cause:** The guidelines were written with coding mechanics (tests, line counts, imports) as examples, which implied they only applied during implementation. Non-code tasks had no equivalent guardrails.
**Rule:** All four principles apply to every task type — code, docs, planning, analysis, conversation:

| Principle | Code tasks | Non-code tasks |
|---|---|---|
| **Think Before Acting** | State assumptions, ask before implementing | State assumptions, ask before editing any doc or forming a plan |
| **Simplicity First** | Minimum code; no speculative features | Minimum words/sections; no extra docs that weren't asked for |
| **Surgical Changes** | Touch only changed logic; remove only your orphans | Edit only the section asked for; don't "improve" adjacent content |
| **Goal-Driven Execution** | Write tests first, verify they pass | Define AC before starting; verify each AC before marking done |

**How to apply:** Before any task (code or not) — state the goal, confirm it matches what the owner asked, then do the minimum work to reach it. The mechanics differ; the discipline does not.

### Weakness 12 — Unwanted code changes with no clean rollback point (2026-06-05)

**Problem:** When the owner asks for "a bit more" on top of a task, Claude sometimes misunderstands the scope and edits code the owner did not want changed. Worse, because work piles up as uncommitted changes on the branch, there is no clean point to return to — the owner cannot cheaply undo just the unwanted change.
**Root cause:** Two gaps. (1) ALIGN confirmed the *plan* but never pinned down the *exact file set*, so scope crept silently during IMPLEMENT. (2) No checkpoint discipline — uncommitted changes accumulated, so "go back to before this task" was not a single command.
**Rule — Checkpoint + Scope Contract (two layers):**

| Layer | Rule |
|---|---|
| **Recover (git)** | Before IMPLEMENT, commit current state: `git add -A && git commit -m "checkpoint: before <task>"`. Rollback is then one command: `git reset --hard HEAD~1` (or to the checkpoint hash). |
| **Prevent (scope)** | In ALIGN, list the **exact files I will change and why**. Touch only those. If mid-task a file not on the list must change → STOP and ask first. |

**Effect:** The scope contract catches most unwanted edits before a line changes (owner approves the file list); anything that slips through is reversible in one command because the pre-task state is always committed. On "revert"/"undo", reset to the last checkpoint — do not patch over the unwanted change.

---

## 💡 0.5 — Tips Để Làm Việc Hiệu Quả Nhất Với Claude

|     | ✅ LÀM THẾ NÀY (Hiệu Quả)                                            | ❌ TRÁNH (Kém Hiệu Quả)                                 |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Dùng /start [feature] khi bắt đầu task mới — Claude đọc đúng context | Paste code và hỏi 'fix cái này đi' không có context     |
| 2   | Cung cấp spec + business rule khi hỏi về logic phức tạp              | Hỏi Claude đoán business rule không có tài liệu         |
| 3   | Confirm DoD (Definition of Done) trước khi Claude code               | Đợi Claude code xong mới nói 'thực ra tôi muốn...'      |
| 4   | Khi Claude flag ⚠️/🚨 — đọc kỹ trước khi override                    | Override flag mà không đọc reason                       |
| 5   | Dùng /handoff cuối session — đừng để context bị mất                  | Đóng session mà không handoff — session sau mất context |
| 6   | Feedback rõ ràng: 'Code này chạy được nhưng cần thêm X'              | Feedback mơ hồ: 'Không đúng lắm'                        |
| 7   | Reference spec/doc cụ thể khi hỏi: 'theo spec NNN_orders.docx...'    | Hỏi chung chung không reference nguồn                   |

# 🔴 Phần 1 — Những Gì Đã Xảy Ra (Root Cause)

| Vấn đề cốt lõi: Tài liệu phát triển theo feature, không theo kiến trúc. Mỗi spec mới copy những gì nó cần thay vì reference source gốc. Sau 32 files, cùng 1 fact tồn tại ở 6+ nơi khác nhau. |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## 📅 1.1 — Timeline Của Vấn Đề

| Giai Đoạn                  | Quyết Định                                                                      | Hậu Quả                                                             |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Khởi đầu dự án             | Tạo CLAUDE.md với đầy đủ tech stack, roles, business rules, design tokens       | OK lúc đầu — 1 file, dễ quản lý                                     |
| Viết spec 1–5              | Mỗi spec tự khai báo lại DB schema, roles, error codes để 'đầy đủ context'      | Bắt đầu drift — spec 3 và spec 5 có khác nhau nhỏ về role hierarchy |
| Thêm Phase 2 vào CLAUDE_BE | Copy business rules từ CLAUDE.md vào CLAUDE_BE 'để tiện'                        | Giờ có 2 sources — khi update 1 chỗ, chỗ kia stale                  |
| Tạo docs/specs/ riêng      | inventory.docx, dashboard.docx, staff.docx viết lại schema + rules + API        | 3 layers cho cùng 1 domain: CLAUDE_BE + API_CONTRACT + spec file    |
| Phase 2 specs (17, 18)     | FE spec và BE spec viết riêng, cả 2 lại có ROI formula, DB schema, color tokens | 32 files, ~60% nội dung là duplicate của nhau                       |
| Refactor session           | Phát hiện vấn đề, tạo MASTER.docx + restructure toàn bộ                         | Mất nhiều thời gian hơn nếu làm đúng từ đầu                         |

## ⚠️ 1.2 — Pattern Nguy Hiểm Đã Lặp Lại

| Anti-Pattern                                              | Ví Dụ Cụ Thể                                                                                                                                                                                                                                                                                | Tại Sao Nguy Hiểm                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy để đầy đủ context                                    | Mỗi spec copy lại Order State Machine, color tokens, JWT config                                                                                                                                                                                                                             | Khi rule thay đổi, phải update N chỗ. Dễ quên 1 chỗ → silent inconsistency                                                                                                                                                                        |
| 1 doc per layer                                           | dashboard.docx (FE) và Spec_12 (BE) là 2 file riêng cho cùng 1 feature                                                                                                                                                                                                                      | Developer phải đọc 2 file, ROI formula khác nhau giữa 2 file                                                                                                                                                                                      |
| CLAUDE.md là nơi chứa mọi thứ                             | CLAUDE.md phình lên 300+ dòng với cả spec detail lẫn business rules                                                                                                                                                                                                                         | Claude đọc toàn bộ mỗi session → tốn token, attention bị loãng                                                                                                                                                                                    |
| Spec = implementation guide                               | Spec files chứa cả color hex, JWT expiry, error codes — không liên quan domain                                                                                                                                                                                                              | Spec phải đọc thêm 5 files khác để verify consistency                                                                                                                                                                                             |
| Schema ở khắp nơi                                         | DB table columns khai báo trong spec, trong CLAUDE_BE, trong migration SQL                                                                                                                                                                                                                  | SQL file là DDL thật — 2 chỗ còn lại luôn lỗi thời sau migration thay đổi                                                                                                                                                                         |
| ALTER TABLE không đi kèm sqlc generate                    | Chạy migration 008 (ADD COLUMN group_id), nhưng quên `cd be && sqlc generate` → `db.Order` struct thiếu `GroupID`, queries `SELECT *` scan sai số cột, compile error                                                                                                                        | Sau mọi migration có ADD/DROP COLUMN phải chạy `sqlc generate` ngay lập tức trước khi viết code dùng column mới                                                                                                                                   |
| goose không có trong local hoặc container                 | goose không cài local, container runtime không có goose binary → không thể chạy `goose up` bình thường                                                                                                                                                                                      | Workaround: chạy SQL trực tiếp qua `docker exec <mysql-container> mysql -u<user> -p<pass> <db> -e "..."` rồi INSERT thủ công vào `goose_db_version (version_id, is_applied, tstamp)`                                                              |
| Middleware không được inject dependency cần thiết         | `AuthRequired()` được code nhưng không nhận Redis/service → is_active check (Spec1 §10) hoàn toàn bị bỏ qua dù service đã có logic đúng. JWT validate pass → mọi disabled account vẫn đi qua suốt 24h TTL                                                                                   | Middleware cần state bên ngoài (Redis, DB) phải nhận dependency qua tham số, không phải closure global. Pattern đúng: `AuthRequired(checker IsActiveChecker)` — kiểm tra interface tại compile time                                               |
| Response field name drift giữa spec và code               | Handler dùng `image_url` (full URL) thay vì `image_path` (relative path) theo spec. DB column là `image_path`, spec nói rõ trả về relative path, nhưng code build full URL và đổi tên key                                                                                                   | Khi serialize response: tên field trong JSON = tên column trong DB (không rename). Không tự ý build full URL trong handler — FE chịu trách nhiệm prepend storage base URL                                                                         |
| DB có query đúng nhưng service gọi query sai              | `products.sql.go` đã có `ListProductsAvailable` (filter `is_available=1`) và `ListProducts` (no filter). Service chỉ gọi `ListProducts` → unavailable products lộ ra public endpoint. AC bị fail dù query đúng đã tồn tại                                                                   | Khi thêm query filtered vào DB layer, phải ngay lập tức cập nhật service layer để dùng query đó. Không để cả hai query tồn tại mà service chỉ biết một                                                                                            |
| Status code conflict giữa hai doc                         | TASKS.md §4.3-AC ghi "cancel ≥30% → 422", checklist `BanhCuon_Project_Checklist.md` ghi "≥30% → 409". Code dùng 409 (StatusConflict) — đúng theo checklist nhưng sai theo TASKS.md                                                                                                          | TASKS.md là master task list — khi hai doc conflict về HTTP status code, TASKS.md wins. Semantic: 422 (UnprocessableEntity) = business rule violation; 409 (Conflict) = resource state conflict. Cancel threshold là business rule → 422 đúng hơn |
| Payment service tạo record nhưng không gọi gateway        | `CreatePayment` persists DB record, trả về `CreatePaymentResult` với `QRCodeURL=""` — gateway API (MoMo/ZaloPay) không được gọi. Frontend nhận response không có URL để redirect/display QR                                                                                                 | Service layer phải gọi gateway để lấy URL trước khi return. Pattern: (1) validate order, (2) create DB record, (3) call gateway → get URL, (4) return URL. Nếu gateway fail → log + return partial result, không rollback payment record          |
| Webhook không verify amount — silent financial risk       | `processWebhookResult` accept bất kỳ amount nào từ gateway mà không compare với DB. Attacker có thể gửi webhook với `amount=1` cho đơn 500,000đ                                                                                                                                             | Amount verification phải là bước bắt buộc sau signature check: `if gatewayAmount != dbAmount → reject AMOUNT_MISMATCH`. Thứ tự cứng: (1) HMAC verify, (2) amount verify, (3) idempotency check, (4) update DB                                     |
| WS `payment_success` event payload không khớp spec        | Spec 5 §8 khai báo `PaymentSuccessEvent` gồm `payment_id`, `amount`, `method`. Thực tế BE chỉ publish `{"type":"payment_success","order_id":"uuid"}`. FE build WS handler dựa trên spec → compile bị sai type                                                                               | Khi viết FE WS handler, luôn grep BE service để xem marshal payload thực tế: `grep -n "json.Marshal" be/internal/service/payment_service.go`. Spec có thể không sync với impl. Match on `order_id`, không dựa vào `payment_id`                    |
| WS `order_status_changed` không kèm new status            | `orderEvent` struct chỉ có `{type, order_id}`. FE nhận event mà không biết status mới là gì — phải fetch GET /orders/:id để check                                                                                                                                                           | Không đoán status từ event type. Sau khi nhận `order_status_changed`, luôn fetch order để đọc `order.status` trước khi điều hướng                                                                                                                 |
| FE Docker image không được rebuild sau khi thêm trang mới | Admin pages (Phase 8) được build vào FE Docker image ở Phase 6. Image không được rebuild → Tailwind JIT production build quét source lúc build time → classes mới (`text-gray-700`, v.v.) không tồn tại trong image cũ → bị purge → màu chữ invisible (body inherit near-white từ CSS vars) | Sau bất kỳ lần thêm trang/component mới vào FE: phải `docker compose up -d --build fe`. Tailwind JIT trong production scan source tại build time, không phải runtime. Classes không có trong image = không được compile.                          |
| HTTP method mismatch giữa BE routes và FE api calls       | FE `admin.api.ts` dùng `api.patch()` cho tất cả update ops. BE `main.go` đăng ký `mgr.PUT("/:id", ...)` cho categories/products/toppings → tất cả edit calls return 404 "route not found"                                                                                                   | Khi viết BE route registration, verify method khớp với FE api.ts. Dùng PATCH (không phải PUT) cho partial updates — khớp với API_CONTRACT. Sau khi fix: `docker compose up -d --build be`.                                                        |
| `binding:"required"` trên Gin int field reject giá trị 0  | `createToppingRequest` có `Price int64 \`binding:"required,min=0"\``→ user submit form với price=0 (default) → Gin validator fail 400 INVALID_INPUT vì`required` trên numeric type = non-zero trong go-playground/validator                                                                 | Dùng `binding:"min=0"` thay cho `binding:"required,min=0"` với mọi numeric field có thể hợp lệ ở giá trị 0. `required` chỉ dùng cho string (non-empty) hoặc pointer (non-nil).                                                                    |
| FE admin page gọi wrong endpoint cho product list         | `listProducts` trong admin.api.ts ban đầu gọi `GET /products` (public, chỉ trả available=true). Admin cần thấy tất cả sản phẩm kể cả hết hàng                                                                                                                                               | Admin pages phải gọi `GET /products/all` (Manager+). Public endpoint `/products` filter `is_available=1` — không đủ cho admin CRUD.                                                                                                               |
| Guest JWT `sub="guest"` vi phạm FK khi insert vào orders  | Handler truyền `claims.Subject` ("guest") trực tiếp vào `created_by`. Schema có `FOREIGN KEY (created_by) REFERENCES staff(id)` → INSERT fail 500. Sau khi fix created_by=NULL, ownership check `o.CreatedBy.String != callerID` lại fail vì created_by NULL → khách không đọc được đơn mình | (1) Khi `role == "customer"`: set `callerID = ""` → service lưu NULL. (2) Ownership check cho guest dùng `order.table_id` (từ JWT claims.TableID), không phải `created_by`. Rule: guest không có staff record — không bao giờ store literal "guest" vào FK column. |
| localStorage key strings bị scatter ở 3+ files           | `order_cache_` prefix hardcoded trong `useOrderSSE.ts`, `order/page.tsx`, `menu/page.tsx` — 3 nơi khác nhau. Đổi tên key phải tìm và sửa 3 chỗ; dễ miss 1 chỗ → stale cache không bao giờ được clear | Tạo `src/lib/storage-keys.ts` làm single source cho mọi localStorage key constant. Mọi file import từ đó — không hardcode string. Rule trong `fe/CLAUDE.md`: "KHÔNG hardcode localStorage key strings." |
| Wireframe .md chứa file paths dự kiến, không phải paths thực | `menu_wireframe_v1.md` ghi `/(shop)/menu/stores/cartStore.ts` và `menu/hooks/useMenuQueries.ts`. Thực tế: `store/cart.ts` (top-level) và hooks/ folder không có file đó. Developer copy path từ wireframe vào MASTER task → task chỉ correct path khi bắt đầu làm | Wireframe docs là design spec — file paths bên trong là ý định, không phải sự thật. Trước khi viết MASTER task row, luôn `find fe/src -name "*.ts" | grep <name>` để verify path thực tế. Nếu file chưa tồn tại, ghi path đúng theo folder conventions trong `fe/CLAUDE.md`. |

# ✅ Phần 2 — Kiến Trúc Đúng Từ Đầu

| Nếu được làm lại từ đầu, đây là cấu trúc file tối ưu. Mỗi loại thông tin có đúng 1 nhà — không ở đâu khác. |
| ---------------------------------------------------------------------------------------------------------- |

## 🏗️ 2.1 — File Hierarchy (3 Tầng Rõ Ràng)

| project/
├── CLAUDE.md ← TẦNG 1: Rules + Pointers + Current Work ONLY
│ Max 150 dòng. Claude đọc mỗi session. KHÔNG chứa: spec, schema, color hex
├── docs/
│ ├── MASTER.docx ← TẦNG 2A: Shared facts (đọc khi cần)
│ ├── API_CONTRACT.docx ← TẦNG 2B: Endpoints only (bảng, không prose)
│ ├── DB_SCHEMA.docx ← TẦNG 2C: Schema overview + Redis keys
│ └── specs/
│ ├── 001_auth.docx ← TẦNG 3: Domain specs (đọc khi làm domain đó)
│ ├── 002_products.docx Mỗi spec = BE + FE trong 1 file
│ └── ... KHÔNG chứa: shared facts từ MASTER
└── migrations/
├── 001_auth.sql ← SINGLE SOURCE: DDL thực tế
└── ... Specs chỉ reference, không repeat DDL |
| --- |

## 🏠 2.2 — Quy Tắc "Nhà Của Từng Loại Thông Tin"

| Loại Thông Tin                                     | Nhà Duy Nhất                            | Mọi Nơi Khác                                |
| -------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| DB column definitions (DDL)                        | migrations/\*.sql                       | Reference: '→ xem 003_orders.sql'           |
| Design tokens (màu HEX, spacing)                   | MASTER.docx §2                          | Reference: '→ MASTER.docx §2'               |
| RBAC roles, hierarchy                              | MASTER.docx §3                          | Reference không copy                        |
| Business rules (order, payment)                    | MASTER.docx §4                          | Reference không copy                        |
| WS/SSE reconnect config                            | MASTER.docx §5 + src/config/realtime.ts | Import module, không hardcode               |
| JWT expiry, interceptor pattern                    | MASTER.docx §6                          | Reference không copy                        |
| Error codes                                        | MASTER.docx §7                          | Reference không copy                        |
| API endpoints (bảng)                               | API_CONTRACT.docx                       | Specs reference section số                  |
| Domain-specific sqlc queries                       | docs/specs/NNN_domain.docx              | Không repeat ở nơi khác                     |
| BE implementation guide (epics · patterns · rules) | docs/be/BE_SYSTEM_GUIDE.md              | Reference từ CLAUDE.md — không copy content |
| FE implementation guide (epics · patterns · rules) | docs/fe/FE_SYSTEM_GUIDE.md              | Reference từ CLAUDE.md — không copy content |
| Current work / branch                              | CLAUDE.md §Current Work                 | Update sau mỗi /handoff                     |

# ✅ Phần 3 — Checklist Trước Khi Viết Bất Kỳ Doc Nào

| ⚠️ Dùng checklist này mỗi khi sắp tạo file mới hoặc thêm nội dung vào file hiện có. |
| ----------------------------------------------------------------------------------- |

## 📝 3.1 — Trước Khi Tạo File Mới

| Câu Hỏi                                 | YES → Làm Gì                               | NO → Làm Gì                           |
| --------------------------------------- | ------------------------------------------ | ------------------------------------- |
| Thông tin này đã tồn tại ở đâu đó chưa? | Viết reference, không viết lại nội dung    | Tìm đúng 'nhà' cho nó theo hierarchy  |
| File này sẽ được đọc thường xuyên?      | Thường xuyên → vào MASTER.docx             | Chỉ 1 domain → vào specs/             |
| File này có cả BE lẫn FE cho 1 feature? | Viết 1 file với 2 sections: ⚙️ BE và ⚛️ FE | OK — nhưng check có thể merge không   |
| Nội dung thay đổi độc lập với domain?   | YES + nhiều domain → vào MASTER.docx       | Chỉ 1 domain → vào spec của domain đó |

## 📝 3.2 — Trước Khi Thêm Nội Dung Vào File

| Câu Hỏi                                           | Nếu YES → Làm                                        |
| ------------------------------------------------- | ---------------------------------------------------- |
| Nội dung này đã có trong MASTER.docx không?       | Xóa — viết reference thay                            |
| Đây có phải là DDL (CREATE TABLE, column def)?    | Xóa — chỉ để trong migration SQL                     |
| Đây có phải design token (HEX color, spacing)?    | Xóa khỏi spec — reference MASTER.docx §2             |
| Đây có phải business rule ảnh hưởng nhiều domain? | Move sang MASTER.docx §4                             |
| File này đang vượt quá 8 sections?                | Split hoặc review xem có duplicate không             |
| CLAUDE.md đang vượt quá 150 dòng?                 | Extract content sang MASTER.docx hoặc spec tương ứng |

## ⚙️ 3.3 — Enforcement: Ai Đảm Bảo Rules Được Tuân Thủ?

| Checkpoint                 | Tool / Command                                                                  |
| -------------------------- | ------------------------------------------------------------------------------- |
| /audit command             | Check: sec.sh patterns, go build, .env tracking + duplicate scan                |
| CLAUDE.md line count check | scripts/audit.sh: wc -l CLAUDE.md → FAIL nếu > 150 dòng                         |
| Duplicate scan tự động     | scripts/audit.sh: script detect content xuất hiện > 1 lần                       |
| Pre-commit hook            | git hook kiểm tra CLAUDE.md size trước mỗi commit                               |
| PR checklist               | Khi tạo PR: 'Có nội dung xuất hiện ở > 1 file không? → duplicate, cần refactor' |

# 🚀 Phần 4 — Workflow Khởi Động Dự Án Mới

| Thứ tự này tránh được phần lớn vấn đề duplicate. Dành 1 ngày cho bước 1–3 trước khi viết bất kỳ dòng code nào. |
| -------------------------------------------------------------------------------------------------------------- |

## 📅 4.1 — Day 0: Setup Architecture Docs

| Bước | Làm Gì                                                                | Output                  | Thời Gian |
| ---- | --------------------------------------------------------------------- | ----------------------- | --------- |
| 1    | Xác định tech stack, roles, business rules cốt lõi                    | Nháp tay hoặc Notion    | 2–3 giờ   |
| 2    | Viết MASTER.docx từ nháp — 9 sections, đầy đủ ngay từ đầu             | MASTER.docx hoàn chỉnh  | 3–4 giờ   |
| 3    | Viết CLAUDE.md lean (<150 dòng) — chỉ pointers + rules + Current Work | CLAUDE.md v1            | 30 phút   |
| 4    | Viết API_CONTRACT.docx — list tất cả endpoints dự kiến                | API_CONTRACT.docx draft | 2–3 giờ   |
| 5    | Viết migrations SQL (001–N) — đây là design DB thực sự                | migrations/\*.sql       | 2–4 giờ   |
| 6    | Viết DB_SCHEMA.docx — overview + key design decisions                 | DB_SCHEMA.docx          | 1 giờ     |

## 🔍 4.2 — Sau Mỗi Major Refactor hoặc Phase Kết Thúc

| Action                         | Tool / Command                                      | Mục Đích                      |
| ------------------------------ | --------------------------------------------------- | ----------------------------- |
| Chạy duplicate scan            | /audit (với checks mới từ §3.3)                     | Tìm content xuất hiện > 1 lần |
| Kiểm tra CLAUDE.md size        | wc -l CLAUDE.md → phải < 150                        | Đảm bảo không phình           |
| Verify MASTER.docx coverage    | Đọc 1 spec → check mọi shared fact đều có reference | Không có orphan facts         |
| Update API_CONTRACT.docx       | Mỗi endpoint mới phải thêm vào ngay                 | Contract luôn sync với code   |
| Tag migration với feature name | goose: 003_orders_add_combo_ref.sql                 | Dễ trace schema change        |

# 🏆 Phần 5 — Quy Tắc Vàng (3 Rules Để Nhớ)

| Nếu chỉ nhớ được 3 thứ từ tài liệu này, nhớ 3 điều này. |
| ------------------------------------------------------- |

## 1️⃣ Rule 1 — "One Fact, One Home"

| ❌ WRONG (Duplicate)
MASTER.docx: 'Cancel chỉ khi progress < 30%'
spec_004: 'Cancel chỉ khi progress < 30%' ← DUPLICATE
API_CONTRACT: 'Cancel chỉ khi progress < 30%' ← DUPLICATE | ✅ RIGHT (Single Source)
MASTER.docx: 'Cancel chỉ khi progress < 30%' ← SOURCE
spec_004: '→ Cancel rule: MASTER.docx §4' ← REFERENCE
API_CONTRACT: '→ Business rules: MASTER.docx §4' ← REF |
| --- | --- |

## 2️⃣ Rule 2 — "CLAUDE.md Is a Map, Not a Territory"

| ❌ WRONG (CLAUDE.md phình)

## Business Rules

- Cancel order chỉ khi progress < 30%
- Payment chỉ tạo khi status = ready
- Inventory deduct khi item done
  ... 20 dòng nữa ... | ✅ RIGHT (CLAUDE.md gọn)

## Business Rules

→ MASTER.docx §4 — LUÔN đọc trước khi code
order/payment/inventory

| Test: nếu CLAUDE.md > 150 dòng → extract! |
| ----------------------------------------- |

## 3️⃣ Rule 3 — "Spec Owns What Is Unique"

| ❌ WRONG (spec chứa shared facts)

# Spec 4 — Orders

## Design Tokens ← đã có trong MASTER

Primary: #FF7A1A

## RBAC ← đã có trong MASTER

## DB Schema ← đã có trong migration SQL | ✅ RIGHT (spec chứa unique content)

# Spec 4 — Orders

> Shared facts → MASTER.docx. DDL → 003_orders.sql.

## Combo Expand Logic ← UNIQUE to Orders

## sqlc Queries ← UNIQUE to Orders

## State Transitions ← UNIQUE to Orders |

| --- | --- |

# 📊 Phần 6 — Summary: Before vs After

| Aspect                     | Before (32 files mess)                                 | After (structured)                              |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Số lần 1 rule xuất hiện    | 6–8 lần (CLAUDE_BE, API, spec, FE, BE, overview…)      | 1 lần (MASTER.docx) + N references              |
| Khi thay đổi business rule | Update 6+ files, dễ quên 1 chỗ                         | Update 1 chỗ (MASTER.docx §4)                   |
| CLAUDE.md size             | 300+ dòng với spec content                             | <150 dòng, pointers only                        |
| 1 feature = mấy files      | 2 files (FE spec + BE spec) + sections trong CLAUDE_BE | 1 file (BE+FE merged spec)                      |
| DB schema source           | 3 sources: spec, CLAUDE_BE, migration SQL              | 1 source: migration SQL (spec references)       |
| New developer onboarding   | Phải đọc 10+ files để hiểu system                      | Đọc MASTER.docx + spec của domain cần làm       |
| Token usage (Claude)       | Claude đọc nhiều duplicate content mỗi session         | Claude đọc đúng content cần thiết               |
| Maintenance overhead       | Cao — mỗi thay đổi nhỏ cần update nhiều files          | Thấp — 1 fact, 1 update                         |
| Enforcement                | Chỉ dựa vào ý thức — dễ bị phá vỡ khi deadline         | Tự động qua /audit + pre-commit + PR checklist  |
| Claude workflow clarity    | Không rõ Claude làm gì mỗi bước                        | Prefix hệ thống + Standard Session Loop rõ ràng |

## ⚙️ Phase 4 Implementation Lessons (2026-04-30)

| Anti-Pattern                                     | Ví Dụ Cụ Thể                                                                                                                                                  | Correct Approach                                                                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passing `map[string]string` as `json.RawMessage` | `HandleVNPayWebhook` called `processWebhookResult(..., params)` where params was `map[string]string` but arg was `json.RawMessage` — Go does not auto-convert | Always `json.Marshal(params)` first → `rawPayload(rawJSON)`. Pattern: whenever one webhook fn takes raw bytes and another takes a typed map, marshal before passing                                                        |
| Named return: `error` keyword as return name     | `SumQtyServedAndQuantity(ctx, id string) (int64, int64, error)` — writing `(served, total int64, error)` fails compilation: `error` is a keyword, not a name  | Always name the error return: `(served int64, total int64, err error)`                                                                                                                                                     |
| Polling vs Redis keyspace for timeout job        | Spec said "Redis keyspace notification listener" for payment timeout — implemented as polling ticker (1 min interval) instead                                 | Polling is valid and simpler (no Redis `notify-keyspace-events` config required). Document the deviation. If keyspace needed later, it requires `CONFIG SET notify-keyspace-events KEA` on Redis and a separate Subscribe. |
| Raw SQL for tables when sqlc not configured      | `table_repo.go` uses raw `QueryRowContext/ExecContext` because no sqlc query annotations exist for tables table                                               | sqlc only generates code for `.sql` query files in the configured directory. Either add `-- name: ListTables :many` annotations to a `.sql` query file and regenerate, OR keep raw SQL but note it in repo comments.       |

---

# 📐 Phần 7 — Spec & Task Creation Workflow (Added 2026-05-05)

> **Mục đích:** Đảm bảo mọi thành viên — BA, PM, Tech Lead, Dev, và Claude — tuân theo cùng một quy trình khi tạo spec và task. Nếu tất cả follow đúng rules này, output luôn traceable, implementable, và verifiable.
>
> **Visual diagrams:** `docs/doc_structure/task/spec_task_chain.excalidraw` · `docs/doc_structure/claude_decision_workflow.excalidraw`

---

## 🔗 7.1 — The 4-Level Transformation Chain

Every task must pass through 4 levels. Each level answers a different question and has a gate that must be passed before the next level begins.

```
╔══════════════════╦══════════════════╦══════════════════╦══════════════════╗
║   LEVEL 1        ║   LEVEL 2        ║   LEVEL 3        ║   LEVEL 4        ║
║   BRD            ║   SRS / FSD      ║   Spec 1-9       ║   Task Rows      ║
╠══════════════════╬══════════════════╬══════════════════╬══════════════════╣
║ Q: WHY + WHO     ║ Q: WHAT exactly  ║ Q: HOW exactly   ║ Q: WHAT unit     ║
║    + WHAT scope  ║    (behavior,    ║    (endpoint,    ║    can I verify  ║
║                  ║     rules, AC)   ║     schema,      ║    alone?        ║
║                  ║                  ║     side effects) ║                  ║
╠══════════════════╬══════════════════╬══════════════════╬══════════════════╣
║ GATE: SCOPE      ║ GATE: RULE       ║ GATE: CONTRACT   ║ GATE: BOUNDARY   ║
║ Feature in       ║ Business rules   ║ Dev can impl.    ║ 1 task = 1       ║
║ Phase 1? If not  ║ numbered + AC    ║ with ZERO        ║ independently    ║
║ → no spec, no    ║ defined? If not  ║ guessing? If not ║ verifiable unit  ║
║ task. Period.    ║ → no spec yet.   ║ → ❓ CLARIFY.    ║                  ║
╠══════════════════╬══════════════════╬══════════════════╬══════════════════╣
║ WHO WRITES:      ║ WHO WRITES:      ║ WHO WRITES:      ║ WHO WRITES:      ║
║ BA + Owner       ║ BA + Tech Lead   ║ Tech Lead        ║ Tech Lead / Lead ║
║                  ║                  ║                  ║ Dev              ║
╠══════════════════╬══════════════════╬══════════════════╬══════════════════╣
║ WHO READS:       ║ WHO READS:       ║ WHO READS:       ║ WHO READS:       ║
║ Everyone once    ║ Tech Lead +      ║ Dev + Claude     ║ Dev + Claude     ║
║ at project start ║ Claude (Step 1)  ║ (Step 1 READ)    ║ (each session)   ║
╠══════════════════╬══════════════════╬══════════════════╬══════════════════╣
║ LOCATION:        ║ LOCATION:        ║ LOCATION:        ║ LOCATION:        ║
║ docs/requirements/  ║ docs/requirements/  ║ docs/spec/       ║ docs/TASKS.md    ║
║ BanhCuon_BRD_v1  ║ BanhCuon_SRS_v1  ║ Spec_1 thru 9    ║                  ║
╚══════════════════╩══════════════════╩══════════════════╩══════════════════╝
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
   Role hierarchy      Numbered BRs        Technical          Verified code
   + Phase scope       + AC + NFR          contract           (go build ✓)
   → used in every     → become spec       → read-only        → TASKS.md ✅
     spec endpoint       validations         during coding
     table (RBAC col)    + test cases
```

**The traceability rule:** Every task must be traceable backward through all 4 levels.

```
Task 4-5  "KDS item status cycle"
    ↑ came from  Spec_4 §5.2  PATCH /orders/:id/items/:itemId/status · Chef+
    ↑ came from  SRS §4.3     'Chef cập nhật trạng thái → trigger recalculate total'
    ↑ came from  BRD §1.2     'KDS: cập nhật trạng thái từng món' (Phase 1 scope)
```

Break in chain = wrong thing built. `Cannot trace to spec` → guessing implementation. `Cannot trace to BRD` → feature was never agreed on → 🔴 STOP.

---

## 🗂️ 7.2 — Annotated Folder Structure

### Project root structure

```
claude restaurant/                    ← project root
├── CLAUDE.md                         ← TẦNG 1: session state + pointers (max 150 lines)
│                                        Claude reads this FIRST every session
│                                        Contains: phase status, current work, branch, commands
│                                        Does NOT contain: spec, schema, color hex, business rules
│
├── be/                               ← Go backend source
│   ├── cmd/server/                   ← main.go + server bootstrap
│   ├── internal/
│   │   ├── db/                       ← sqlc-generated (DO NOT edit manually)
│   │   ├── handler/                  ← HTTP handlers (gin.Context, bind, call service)
│   │   ├── service/                  ← business logic (NO gin imports, NO direct DB)
│   │   ├── repository/               ← sqlc wrappers + transaction helpers
│   │   ├── middleware/               ← auth, RBAC, rate limit
│   │   ├── websocket/                ← WS hub + broadcast
│   │   ├── sse/                      ← SSE stream handlers
│   │   ├── payment/                  ← payment gateway integrations
│   │   └── jobs/                     ← background jobs (payment timeout, etc.)
│   ├── migrations/                   ← goose SQL files (SINGLE SOURCE for DDL)
│   │   └── 001_auth.sql ... 008_*.sql
│   ├── pkg/                          ← shared utilities (jwt, bcrypt, redis)
│   └── query/                        ← sqlc query annotation files (*.sql)
│
├── fe/                               ← Next.js 14 frontend
│   └── src/
│       ├── app/                      ← Next.js App Router pages
│       ├── components/ui/            ← shared UI primitives (Button, Card, Badge)
│       ├── features/                 ← feature-specific components
│       ├── hooks/                    ← custom React hooks
│       ├── lib/                      ← api-client.ts, utils.ts (formatVND here)
│       ├── store/                    ← Zustand stores (auth token lives here ONLY)
│       └── types/                    ← TypeScript types
│
├── docs/                             ← all documentation
│   ├── TASKS.md                      ← MASTER TASK LIST (single source of task truth)
│   ├── IMPLEMENTATION_WORKFLOW.md    ← 7-step quality process (Claude's operating manual)
│   ├── MASTER_v1.2.md                ← TẦNG 2: cross-cutting rules
│   │                                    §2 design tokens · §3 RBAC · §4 biz rules
│   │                                    §5 realtime · §6 JWT
│   │
│   ├── qui_trinh/                    ← ORIGIN DOCUMENTS (read once at project start)
│   │   ├── BanhCuon_BRD_v1.md       ← LEVEL 1: WHY + WHO + scope
│   │   ├── BanhCuon_SRS_v1.md       ← LEVEL 2: WHAT + business rules + AC + NFR
│   │   ├── BanhCuon_FSD_v1.md       ← LEVEL 2: functional spec detail
│   │   ├── BanhCuon_UXUI_Design_v1  ← UX flows, color palette (→ MASTER §2)
│   │   └── BanhCuon_Project_Checklist.md ← AC per task (verification reference)
│   │   🚫 NEVER read during coding — already distilled into spec/ + MASTER
│   │
│   ├── spec/                         ← LEVEL 3: domain implementation contracts
│   │   ├── Spec1_Auth_Updated_v2.md  ← auth, login, refresh, JWT
│   │   ├── Spec_2_Products_API_v2_CORRECTED.md ← CRUD products/categories/toppings
│   │   ├── Spec_3_Menu_Checkout_UI_v2.md       ← customer mobile UI, cart, checkout
│   │   ├── Spec_4_Orders_API.md      ← order lifecycle, state machine, SSE, WS
│   │   ├── Spec_5_Payment_Webhooks.md ← gateways, HMAC, idempotency
│   │   ├── Spec_6_QR_POS.md          ← QR codes, POS cashier flow
│   │   ├── Spec_7_Staff_Management.md ← staff CRUD, roles
│   │   └── Spec_9_Admin_Dashboard_Pages.md ← admin pages, overview, marketing
│   │   ✅ Read only the spec for the current domain — never all at once
│   │
│   ├── contract/                     ← TẦNG 2: technical contracts
│   │   ├── API_CONTRACT_v1.2.md      ← ALL endpoints (method·path·role·shape)
│   │   └── ERROR_CONTRACT_v1.1.md    ← ALL error codes + respondError pattern
│   │
│   ├── task/                         ← DB schema reference
│   │   └── BanhCuon_DB_SCHEMA_SUMMARY.md ← SINGLE SOURCE for field names + types
│   │
│   ├── be/                           ← BE primary guide
│   │   └── BE_SYSTEM_GUIDE.md        ← TẦNG 3: read FIRST for any BE task
│   │
│   ├── fe/                           ← FE primary guide
│   │   ├── FE_SYSTEM_GUIDE.md        ← TẦNG 3: read FIRST for any FE task
│   │   └── wireframes/               ← FE page wireframes (zone layout + data sources)
│   │       ├── _TEMPLATE.md          ← copy this before drawing any new page
│   │       ├── overview.md           ← admin overview page wireframe
│   │       └── overview.excalidraw   ← visual version
│   │
│   ├── doc_structure/                ← workflow diagrams (for team understanding)
│   │   ├── doc_structure_map.excalidraw      ← document hierarchy visual
│   │   ├── claude_decision_workflow.excalidraw ← how Claude makes decisions per session
│   │   └── task/
│   │       └── spec_task_chain.excalidraw    ← BRD→SRS→Spec→Task chain visual
│   │
│   ├── base/
│   │   └── LESSONS_LEARNED_v3.md     ← this file — durable knowledge + patterns
│   │
│   ├── onboarding/                   ← role-specific onboarding guides
│   │   ├── BE_DEV.md · FE_DEV.md · DEVOPS.md · LEAD.md
│   │
│   └── claude/                       ← per-role Claude context files
│       ├── CLAUDE_BE.md · CLAUDE_FE.md · CLAUDE_DEVOPS.md · CLAUDE_BA.md
│
└── scripts/                          ← operational scripts
    └── migrate.sh                    ← DB migration helper
```

### Who reads what (quick reference)

| Role      | Reads at start                       | Reads per task                                                        | Never reads during coding         |
| --------- | ------------------------------------ | --------------------------------------------------------------------- | --------------------------------- |
| Claude    | CLAUDE.md + TASKS.md + IMPL_WORKFLOW | MASTER (relevant §) + Spec (current domain) + DB_SCHEMA + ERROR + API | docs/requirements/                   |
| BE Dev    | BE_SYSTEM_GUIDE                      | Spec for current domain + DB_SCHEMA + API_CONTRACT                    | All FE specs                      |
| FE Dev    | FE_SYSTEM_GUIDE + wireframes/        | Spec for current feature + MASTER §2/3/5                              | All BE internal specs             |
| Tech Lead | TASKS.md + all specs                 | Spec being written + BRD + SRS (for rules)                            | —                                 |
| BA / PM   | BRD + SRS                            | BRD when writing new features                                         | docs/spec/ (that's dev territory) |

---

## 📋 7.3 — Rules: Creating a Spec Section (Checklist)

Use this checklist before writing any spec section. This mirrors exactly what Claude checks at Step 1 READ.

**Gate 1 — SCOPE CHECK (from BRD)**

```
□ Feature appears in docs/requirements/BanhCuon_BRD_v1.md Project Scope table?
□ Feature is Phase 1 (not Phase 2/3)?
   → If NO to either: do NOT write a spec. Add to backlog for future phase.
```

**Gate 2 — RULE CHECK (from SRS)**

```
□ SRS has numbered business rules (BR-xxx) for this feature?
□ SRS has acceptance criteria (given/when/then) for each scenario?
□ NFR constraints are identified (performance, security thresholds)?
   → If NO: write the SRS section first. Do NOT write the spec without rules.
   → Missing rules = developer will guess = production bugs.
```

**Gate 3 — CONTRACT COMPLETENESS (the spec itself)**

A spec section is complete ONLY when ALL of these exist:

```
□ Endpoint table: method · path · role (from BRD RBAC) · description
□ State machine (if stateful): all transitions + who triggers + conditions
□ Request shape: every field name (verified in DB_SCHEMA_SUMMARY) + type + nullable
□ Response shape: every field name + type + status code
□ Validation rules: one rule per BR-xxx that applies (no orphan rules)
□ Side effects: ALL listed — WS broadcast, Redis write, recalculate, job trigger
□ Out-of-scope boundary: explicit sentence ('Payment → Spec_5')
□ For FE specs: wireframe zone label + data source per zone

COMPLETENESS TEST: Can a developer read ONLY this section + DB_SCHEMA + ERROR_CONTRACT
and implement with zero questions? If NO → spec is incomplete → ❓ CLARIFY first.
```

**Gate 4 — SPLIT CHECK (is this one spec or two?)**

```
□ Does this section have ONE out-of-scope boundary statement?
□ Does it cover ONE domain (not orders + payments in same section)?
□ Does it have ONE owner role (not both customer and chef as primary actors)?
   → If NO: split into two spec sections.
```

---

## 📋 7.4 — Rules: Creating Task Rows (Checklist)

Use this before writing any task row into TASKS.md.

**Pre-condition: spec section must pass Gate 3 above first.**

**For ALL tasks (BE + FE + DevOps):**

```
□ Task traces to a spec section? (can you write spec_ref = 'Spec_X §Y.Z'?)
   → If NO: the spec is missing this detail → write the spec section first
□ All dependency tasks are ✅ in TASKS.md?
   → If NO: mark this task as 🔴 BLOCKED until deps are done
□ Task can be independently verified (go build / npm run build proves it works alone)?
   → If NO: this is a sub-task → merge with parent or resolve the dependency
□ Task description is specific enough to know when 'done'?
   Bad:  '4-1 BE  Orders'
   Good: '4-1 BE  CreateOrder: handler + service + validate (1-table-1-active + combo expand)'
```

**For FE tasks (extra requirements):**

```
□ Step 0 completed before writing any task row?
   □ 0a: spec section read end-to-end (screens, components, data sources marked)
   □ 0b: wireframe drawn (zones labeled [ComponentName] + data source per zone)
   □ 0c: decomposition done (1 task row per component, shared first)
   □ 0d: wireframe aligned with user

□ spec_ref filled? (e.g. 'Spec_9 §3.2')
   → If NO: trace back to spec. If spec section doesn't exist → write spec first.
□ draw_ref filled? (e.g. 'wireframes/overview.md zone-B')
   → If NO: wireframe not drawn → run Step 0b first.

A FE task row with no spec_ref or no draw_ref is NOT ready to start.
```

**FE task row format (v1.1):**

```
| ID   | Domain | Task                        | Status | spec_ref     | draw_ref                    |
|------|--------|-----------------------------|--------|--------------|------------------------------|
| 9-1  | FE     | PrepPanel component         | ⬜     | Spec_9 §3.2  | wireframes/overview.md zone-B |
```

**BE task row format:**

```
| ID   | Domain | Task                                              | Status |
|------|--------|---------------------------------------------------|--------|
| 4-5  | BE     | KDS item cycle: PATCH + recalculate + WS broadcast | ⬜     |
```

---

## ✂️ 7.5 — Split Signals: When to Create a New Task Row

| Signal                  | Example                                                                  | New task?                               |
| ----------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Different business rule | CreateOrder (BR-001: 1-table-1-active) vs CancelOrder (BR-002: 30% rule) | ✅ YES — different test case            |
| Different protocol      | SSE stream vs WebSocket hub                                              | ✅ YES — different connection lifecycle |
| Mandatory side effect   | KDS item update → recalculateTotalAmount + WS broadcast                  | ✅ YES — side effect must be verified   |
| FE: different component | [OrderList] vs [PrepPanel]                                               | ✅ YES — different component            |
| FE: page assembly       | page.tsx composing all components                                        | ✅ YES — always last task               |
| Just a different file   | handler.go + service.go (same endpoint)                                  | ❌ NO — same vertical slice             |
| Just more lines         | 50-line handler vs 200-line handler                                      | ❌ NO — size is not a signal            |
| Just a different layer  | repository.go (same query, no new logic)                                 | ❌ NO — part of the same task           |

**The one rule:** Split by behavior boundary (different rule, different protocol, different component), NOT by file or line count.

---

## 🔴 7.6 — What to Do When the Chain Breaks

| Break point                                 | What it means                   | Action                                                       |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| Task has no spec_ref                        | Implementation contract unknown | ❓ CLARIFY — find the spec section or write it               |
| Spec section has no SRS rule                | Business rule was never defined | ❓ CLARIFY — write the SRS rule with BA/owner before coding  |
| SRS feature not in BRD scope                | Feature was never agreed on     | 🔴 STOP — do not build it. Add to future phase backlog.      |
| Spec has conflicting info with API_CONTRACT | Drift between documents         | ⚠️ FLAG — update the spec OR the contract, pick one source   |
| Spec says 'TBD'                             | Section was deferred            | 🔴 STOP — do not proceed until TBD is resolved               |
| Two specs both define the same endpoint     | Duplicate spec coverage         | ⚠️ FLAG — merge or add explicit out-of-scope boundary to one |

---

## 🧭 7.7 — The Rules Claude Follows (Same Rules You Should Follow)

When Claude starts any task, it runs through these in order — and so should any human dev or lead:

```
1. SCOPE: Is this in BRD Phase 1?                          → If NO: stop.
2. RULES: Does SRS have numbered rules + AC for this?      → If NO: write rules first.
3. CONTRACT: Does the spec section have ALL required parts? → If NO: ❓ CLARIFY.
4. FIELDS: Are all field names verified in DB_SCHEMA_SUMMARY? → If NO: check before coding.
5. ERRORS: Are error codes verified in ERROR_CONTRACT?      → If NO: check before coding.
6. ENDPOINTS: Is the endpoint signature in API_CONTRACT?    → If NO: check before coding.
7. TRACE: Can this task be traced back to a spec section?  → If NO: find or write spec first.
8. VERIFY: Can this task be verified independently?        → If NO: split or resolve dep.
```

These 8 checks are not optional. They are the reason bugs do not reach production.

**Visual references for the full workflow:**

- Session execution flow → `docs/doc_structure/claude_decision_workflow.excalidraw`
- BRD→SRS→Spec→Task chain → `docs/doc_structure/task/spec_task_chain.excalidraw`
- Document hierarchy → `docs/doc_structure/doc_structure_map.excalidraw`

---

| 🍜 BanhCuon System · LESSONS_LEARNED.docx · v3.0 · Updated with Claude Workflow Guide · Tháng 4/2026 |
| ---------------------------------------------------------------------------------------------------- |

What was created
NEW_PROJECT_BOOTSTRAP_GUIDE.md (26KB) — The complete reusable playbook:

Part 0: My commentary — the real insights behind why the system works
Part 1: Team roles + Claude file ownership table
Part 2: 3-tier document architecture
Part 3: Per-role session procedure (BA / Lead / BE / FE / DevOps)
Part 4: Doc interaction + knowledge flow (who writes, who reads, update triggers)
Part 5: Day 0 bootstrap sequence (9 steps, folder structure, file templates)
Part 6: Copy-paste bootstrap prompt for Claude Code
Part 7: 8 quality gates summary
Part 8: How knowledge accumulates over time
team_claude_workflow.excalidraw (51KB) — 5-frame visual diagram:

Team Structure + doc ownership (with the subdirectory CLAUDE.md insight)
4-Level Doc Chain (BRD→SRS→Spec→Task) with gates
Session Loop + Self-Review checklist + prefix system
Day 0 Bootstrap Sequence (4-block grid)
8 Quality Gates (color coded: blue=human / orange=Claude / green=auto)
My key thinking (the things not obvious from just reading docs)
CLAUDE.md per subdirectory, not per person. This is the biggest structural improvement. Claude Code auto-loads CLAUDE.md from current dir upward — so be/CLAUDE.md loads automatically for BE work, fe/CLAUDE.md for FE work. No "read this file first" instructions. Less noise = better output.

Claude is the implementer, not the designer. When Claude writes the spec AND codes it in the same session, quality degrades — it optimizes for internal consistency, not business requirements. Humans write BRD/SRS. Claude reads specs and codes.

Docs are Claude's only long-term memory. Context resets every session. If a rule isn't written, Claude invents it. The entire doc architecture exists to ensure Claude never has to guess.

Quality is built-in at each step, not added at the end. The 8-gate system prevents "code is done but wrong thing built" — the most expensive failure. Gate 1 catches it at scope, Gate 3 at spec, Gate 5 at self-review. Code review (Gate 7) is a safety net, not the primary mechanism.

/handoff is the single most important habit. Without it, every session starts from zero.
