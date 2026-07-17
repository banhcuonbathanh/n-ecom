Where tasks come from: the chain

BRD (business need)
  → SRS/FSD (functional detail + business rules)
    → Spec files 1-9 (domain-specific implementation specs)
      → Task rows in TASKS.md
docs/qui_trinh/ is the source. docs/spec/ is what I actually read. The task row is the smallest unit of work derived from a spec section.

What makes a task
A task row is created when a spec section defines a distinct, completable unit of work. The signal:

BE: one handler/endpoint group, one service method, one repository layer, or one sqlc query set → one task
FE: one component, one page, one API function group → one task (from wireframe decomposition)
DevOps: one infra concern (compose service, Caddyfile block, CI job) → one task
A task is NOT ready to start if any of these are missing:

Field	BE	FE
ID	✅ required	✅ required
Domain	✅ required	✅ required
Task description	✅ required	✅ required
Dependencies (all ✅)	✅ required	✅ required
spec_ref	optional but strong preference	REQUIRED
draw_ref	not applicable	REQUIRED
BE task creation procedure
Read the spec section (e.g. Spec_4_Orders_API.md §3 — Create Order)
Identify the vertical slice: handler + service method + repository queries needed
Check what DB queries exist vs need to be written (query/*.sql)
Check what dependencies must be ✅ first (e.g. auth middleware before order handler)
Write one task row per distinct implementation concern:
4-1 BE Create order handler + service + repository
4-2 BE GetOrdersByTable query + repository
These are separate because one can be verified independently
FE task creation procedure (Step 0 — mandatory before any task rows)
The FE flow is stricter because without a wireframe you discover the layout mid-code:


Step 0a: Read the spec section end-to-end
         → mark every screen, component, data source, interaction mentioned

Step 0b: Draw the wireframe
         → label every zone [ComponentName]
         → note the data source for each zone
         → note interactions (button → which API call)
         Example:
         ┌──────────────────────┬─────────────────────┐
         │ [OrderList]          │ [PrepPanel]          │
         │ GET /orders/live     │ computed from        │
         │ SSE stream           │ OrderList data       │
         └──────────────────────┴─────────────────────┘

Step 0c: Decompose the wireframe into task rows
         Order: shared components first → API layer → page-specific → page assembly
         Each row gets:
           spec_ref = exact spec section  (e.g. Spec_9 §3.2)
           draw_ref = wireframe file + zone  (e.g. wireframes/overview.md zone-B)

Step 0d: Align the wireframe with the user before writing code
Only after 0a-0d are done do you write the task rows into TASKS.md.

The constraint that shapes task size
Tasks should be completable in one session. The size signal is whether the task can be independently verified:

Can you run go build ./... and prove this specific task works? → good boundary
Can you render this component in isolation and verify it? → good boundary
If the answer is "only works when 3 other tasks are also done" → the task is too large, split it
The practical heuristic from the docs: 20-minute tasks (a single sqlc query wrapper) and 3-hour tasks (full auth service) should not both be called "one task" — the former is a sub-task of the latter.

What a task row must trace back to
Every task should be traceable to a spec section. If you cannot fill spec_ref for a FE task, it means one of two things:

The spec is missing a section → ❓ CLARIFY before writing the task
You are inventing scope that was not specified → stop, check with the user
This traceability is the only thing that prevents "task done but built the wrong thing" — which is the most expensive failure mode.

The 4-level transformation chain
Each level answers a different question. Each level's output becomes the input for the next.


BRD          →  WHY + WHO + WHAT (scope)
  ↓
SRS/FSD      →  WHAT exactly (behavior, rules, criteria)
  ↓
Spec         →  HOW exactly (endpoints, schema, state machine, validation)
  ↓
Task rows    →  WHAT smallest unit can I implement AND verify independently
Level 1 — BRD → defines scope and user types
The BRD gives you two things that flow into every spec and task:

1. User roles — these become RBAC rules in every spec:


From BRD §2.2:
  customer   → dat hang, theo doi don, huy (<30% done)
  chef       → xem KDS, cap nhat trang thai mon
  cashier    → tao don offline POS, xu ly thanh toan
  staff      → chef + cashier
  manager    → superset of staff
  admin      → superset of manager
Every task that involves an API endpoint must know this. The role column in Spec_4's endpoint table (POST /orders → Customer/Cashier+) comes directly from the BRD role definition.

2. Feature scope per phase — this tells you which spec gets written now vs later:


From BRD §1.3:
  QR Table Ordering  → Phase 1 → Spec_6 gets written
  Quan Ly Kho        → Phase 2 → NO spec written yet, no tasks created
  Computer Vision    → Phase 3 → completely out of scope
Principle: you do not write a spec or a task for anything not in Phase 1 scope. The BRD is the gate that prevents scope creep into tasks.

Level 2 — SRS → defines behavior and rules precisely
The SRS takes the BRD scope and answers: what must the system actually do, step by step, verified how?

Three things the SRS produces that directly shape specs:

Business rules (numbered) — these become validation logic in specs and the self-review checklist:


From SRS (via MASTER §4):
  BR-001: 1 table → max 1 ACTIVE order at any time → 409 if violated
  BR-002: cancel only if SUM(qty_served)/SUM(quantity) < 30%
  BR-003: HMAC must be verified before reading any webhook body field
  BR-004: recalculateTotalAmount() after every order_items mutation
Each of these becomes a concrete validation line in the spec, a checklist item in SELF-REVIEW, and a test case in Step 6.

Acceptance criteria — these become the AC column in task rows and the "done" definition:


SRS says: "cancel order — AC: system rejects cancel if 30%+ items served,
           returns same error code whether customer or cashier tries"
→ Spec_4 writes the validation rule
→ Task 4-x has the AC ref
→ Step 6 TEST writes the exact test for this case
NFR (non-functional requirements) — these constrain implementation choices:


SRS NFR: API response < 500ms p95 · 1000 concurrent users · bcrypt cost=12
→ Redis caching strategy (not read from DB every time)
→ Connection pool sizing in docker-compose
→ No N+1 queries (use JOIN in sqlc queries, not loops calling DB)
These do not appear as separate task rows — they are constraints built into how every BE task is implemented.

Level 3 — Spec → defines the implementation contract
The spec takes the SRS requirements and produces the exact technical contract that a developer can implement directly. A spec section must contain all of these to be implementable:

What the spec defines	Example from Spec_4
Endpoint method + path + role	PATCH /api/v1/orders/:id/items/:itemId/status · Chef+
State machine with transitions + conditions	pending→confirmed→preparing→ready→delivered, cancel only if <30%
Exact request shape + field types	{ product_id: int|null, combo_id: int|null, quantity: int, unit_price: decimal }
Exact validation rules	product_id OR combo_id must be set, not both null. table_id: check no ACTIVE order
Response shape + status code	201 { id, status, total_amount, created_at }
Side effects	combo expand: create parent row + N sub-item rows with combo_ref_id
What is OUT of scope	Payment processing → Spec_5. Inventory deduction → inventory service
The principle that makes a spec section complete: a developer reading ONLY this section (plus the DB schema and error contract) should be able to implement it with zero guessing. If any field type is missing, any validation rule is unclear, or any state transition has an undefined condition → the spec is incomplete → ❓ CLARIFY before writing a task.

What makes a spec section its own spec (not merged with another):

Spec_4 (Orders) and Spec_5 (Payment) are separate because they have different ownership: orders are owned by cashier/staff, payments are owned by the payment gateway → different RBAC, different error domain, different test patterns.
Spec_3 (Menu UI) and Spec_4 (Orders API) are separate because one is FE and one is BE → different implementation layer, different task format.
Level 4 — Task rows → smallest independently-verifiable unit
The one rule that determines task boundaries:

Can I implement this AND verify it passes without completing any other task?

If yes → one task. If no → it is part of a larger task OR has an unresolved dependency.

How a spec section becomes task rows — concrete example:

Spec_4 §5 gives you these endpoints:


POST   /orders              → Create order
GET    /orders              → List orders  
GET    /orders/:id          → Get order detail
PATCH  /orders/:id/status   → Update status
DELETE /orders/:id          → Cancel order
PATCH  /orders/:id/items/:itemId/status → KDS item update
GET    /orders/:id/sse      → SSE stream
WS     /ws/kitchen          → Kitchen WebSocket
WS     /ws/orders-live      → Live orders WebSocket
These do NOT become one task. They become task rows split by verification boundary:


4-1  BE  CreateOrder: handler + service + validate (1-table-1-active + combo expand)
4-2  BE  GetOrders + GetOrderByID: handler + repository queries
4-3  BE  UpdateOrderStatus: state machine validation + PATCH handler
4-4  BE  CancelOrder: 30% rule + soft delete + handler
4-5  BE  KDS item status cycle: PATCH item + recalculateTotalAmount + WS broadcast
4-6  BE  SSE stream /orders/:id/sse: SSE handler + Redis pub/sub subscribe
4-7  BE  WebSocket hub: /ws/kitchen + /ws/orders-live + broadcast logic
Why split this way:

4-1 and 4-4 are separate because cancel has the 30% business rule — a distinct test case
4-5 is separate because it has a mandatory side effect (recalculateTotalAmount) that must be verified
4-6 and 4-7 are separate because SSE and WS are completely different protocols with different connection lifecycle
The principle that connects all four levels
Every task row must be traceable backward through all four levels:


Task 4-5 BE "KDS item status cycle"
  ↑ came from
Spec_4 §5.2 "PATCH /orders/:id/items/:itemId/status · Chef+"
  ↑ came from
SRS §4.3 "Chef cập nhật trạng thái từng món — trigger recalculate total"
  ↑ came from
BRD §1.2 "KDS: cập nhật trạng thái từng món" (Phase 1 scope)
If you cannot trace a task back to a BRD scope item → you are building something that was not agreed on. This is the most expensive failure mode: code is written, tests pass, but the feature was never requested.

If you cannot trace a task back to a spec section → you are guessing the implementation contract. Field names, error codes, validation rules will all be wrong.

The spec_ref field on every FE task row exists for exactly this reason — it makes the traceability explicit and checkable, not assumed.