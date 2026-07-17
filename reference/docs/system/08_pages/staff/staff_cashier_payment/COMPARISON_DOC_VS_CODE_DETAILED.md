# Comparison — Doc vs. Code · `staff_cashier_payment` (`/cashier/payment/:id`)

> **Scope:** the full `staff_cashier_payment/` doc-set vs. the running code on the current branch,
> across 4 applicable axes — ① component visuals, ③ cross-page dataflow, ④ loading behaviour,
> ⑤ FE⇄BE data model. **Area 2 (cross-component dataflow) is N/A** — this page owns no shared Zustand
> store; all client state is local `useState` (`method`, `payment`) + TanStack `['order', id]` + a
> read of `useAuthStore` (accessToken only). There is no `_crosscomponent_dataflow.md`.
> **Read-only — no app code and no page doc-set was changed.** All BE/FE claims re-traced from source
> (FE single file + 6 Go files) by the Opus orchestrator inline (single-file page; no audit fan-out
> needed); every 🔴 re-verified by hand. Date: 2026-06-22.
>
> **Verdict in one line:** this is a **high-fidelity, source-faithful doc-set** — it documents the
> code *including its bugs* (peer of `customer_checkout` / `customer_combo_detail` / `admin_combos`).
> There is **no doc-vs-code contradiction**: every drift is either (a) the doc *correctly* flagging a
> real code bug, or (b) stale `main.go` line-numbers + a stale provenance branch. The two 🔴 below are
> **code bugs the doc already documents**, raised here because they break payment for every method.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals (`staff_cashier_payment.md` ASCII + Zones) | ✅ Accurate — wireframe is explicitly drawn "as code exists" incl. dead-state annotations | 0 | 1 | 3 |
| ③ Cross-page dataflow (`_crosspage_dataflow.md`) | ✅ Accurate — write-and-close, `orders:kds` fan-out, F5 matrix all correct; 3 honest `❓ UNVERIFIED` | 0 | 1 | 1 |
| ④ Loading (`_loading.md`) | ✅ Accurate — guards, no `loading.tsx`, `isLoading\|\|!order` guard, interaction states all match | 0 | 2 | 1 |
| ⑤ FE⇄BE data model (`_be.md` + Object Model) | ✅ Accurate — the FE `Payment` vs thin BE response drift IS the doc's central, correctly-documented finding | 2 | 2 | 2 |
| **Total** | **Source-faithful; no contradiction** | **2** | **6** | **7** |

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

> Both are **code bugs the doc already documents** ([PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 1 + Bug 2,
> `_be.md` Flags 1-2). They are **not doc errors** — they are raised because together they mean
> **payment cannot complete from this screen for any method.** Re-verified line-by-line below.

### 🔴 #1 — `POST /payments` response omits `status`/`amount`/`method` → screen goes blank after create (Bug 2)

- **Code reality (hand-verified):** the handler returns only `{data:{id, pay_url, qr_code_url}}` —
  [`payment_handler.go:44-48`](../../../../be/internal/handler/payment_handler.go#L44). The FE
  `Payment` interface expects `status`/`amount`/`method`
  ([`page.tsx:16-23`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L16)) and
  `setPayment(data)` stores the thin object ([`page.tsx:114-115`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L114)).
  With `payment.status === undefined`: the cash success branch `data.status === 'completed'`
  ([`page.tsx:116`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L116)) never fires;
  the WS effect returns early at `payment.status !== 'pending'`
  ([`page.tsx:64`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L64)) so the socket
  never opens; the QR render guard `payment.status === 'pending' && payment.qr_code_url`
  ([`page.tsx:249`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L249)) is false.
  **Net: for every method the picker disappears and nothing replaces it** (`else null`, `page.tsx:280`).
- **Why it matters:** all gateway payments (VNPay/MoMo/ZaloPay) — no QR, no WS, no auto-print/redirect.
- **Fix path the code already exposes:** `GET /payments/:id` ([`main.go:270`](../../../../be/cmd/server/main.go#L270))
  serves the full `db.Payment` ([`payment_handler.go:52-59`](../../../../be/internal/handler/payment_handler.go#L52)) — widen the create response (BE) or re-fetch after create (FE).

### 🔴 #2 — Cash button sends `method:'cod'`; BE binding requires `'cash'` → 400 on the default method (Bug 1)

- **Code reality (hand-verified):** FE `PaymentMethod = 'vnpay'|'momo'|'zalopay'|'cod'`, default `'cod'`
  ([`page.tsx:14,52`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L14)); the mutation
  posts `{order_id, method:'cod'}` ([`page.tsx:111-113`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L111)).
  BE binding is `oneof=vnpay momo zalopay cash` —
  [`payment_handler.go:25`](../../../../be/internal/handler/payment_handler.go#L25); `cod` ∉ set →
  `ShouldBindJSON` fails → `400 INVALID_INPUT` ([`payment_handler.go:31-34`](../../../../be/internal/handler/payment_handler.go#L31)).
  DB enum is also `cash` (`db.PaymentsMethodCash`, consumed at `payment_service.go:81,98`).
- **Why it matters:** cash is the **default + most-used** method → the page 400s on the cashier's
  first click for most orders; the generic toast "Không thể tạo thanh toán" gives no hint.
- **Fix:** one-line FE change — `'cod'` → `'cash'` in the type, default, and `METHOD_LABELS` key
  (keep the "Tiền mặt" label). No BE change.

---

## Dead / unreachable components found

- **QR-pending block** (`page.tsx:249-279`) — unreachable today: render guard `payment.status === 'pending'`
  is never true because the create response omits `status` (🔴 #1). Includes the QR `<img>`, the
  "⏳ Đang chờ thanh toán..." text, **and** the proof-upload input.
- **WS listener** (`page.tsx:63-108`) — never connects: effect returns early at `payment.status !== 'pending'`
  (`page.tsx:64`), same root as 🔴 #1.
- **Proof-upload mutation** (`page.tsx:125-135`) — doubly dead: (a) `PATCH /payments/:id/proof` has
  **no route, handler, service, query or column** anywhere in `be/` (grep `proof` → 0 non-test hits;
  payments group exposes only `POST ""`, `GET "/:id"`, 3 webhooks — `main.go:267-275`) → 404; (b) the
  input lives inside the unreachable QR block. Doc rates this Bug 3 / 🟡 (gated behind Bug 2).
- **`uploadProof.isPending` pending UI** (`page.tsx:275-277`) — inside the dead QR block → never shown.

---

## Area ① — Component visuals

**Verdict:** ✅ Accurate. The `staff_cashier_payment.md` ASCII is explicitly drawn "as zones EXIST in
code" (its own header note) with State A / B / C and the dead-state annotations matching reality.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Method picker label "Tiền mặt" | label "Tiền mặt", value `'cod'` | `METHOD_LABELS.cod = 'Tiền mặt'` but BE wants `'cash'` (`page.tsx:31`, `payment_handler.go:25`) — the label is the visible tell of Bug 1 | 🟡 | covered by 🔴 #2 (FE `cod`→`cash`) |
| Method picker order/grid | 2×2: `[Tiền mặt][VNPay]` / `[MoMo][ZaloPay]` | `grid grid-cols-2` over `Object.entries(METHOD_LABELS)` order cod,vnpay,momo,zalopay (`page.tsx:220-234`) — matches | 🟢 | — |
| State B QR block annotated "DEAD" | "⚠️ DEAD TODAY (Bug 2)" | exactly so — guard `page.tsx:249` never true | 🟢 | — |
| State C success annotated "DEAD" | "⚠️ DEAD TODAY (Bug 2 prevents both triggers)" | cash branch `page.tsx:116` + WS `page.tsx:88-92` both dead | 🟢 | — |
| Receipt card fields | Đơn#/Bàn/Khách/items/Tổng cộng + conditional "Phương thức" | `page.tsx:166-213`; `table_id` row conditional (`:177`), `customer_name` hidden if `'Khách tại quán'` (`:183`), "Phương thức" row only `if payment` (`:205`) | 🟢 | — |

**Verified-matching:** header (`← Quay lại` + `Thanh Toán Đơn #{order_number}`, `page.tsx:152-162`);
`.no-print` on header/controls, receipt prints (`page.tsx:148`); confirm-button label logic
(`page.tsx:242-246`).

---

## Area ③ — Cross-page dataflow

**Verdict:** ✅ Accurate. `_crosspage_dataflow.md` correctly frames the page as a *write-and-close*
terminal: two MySQL writes (`payments` row + `orders.status → paid` via `MarkOrderPaid`) and one
Redis publish to `orders:kds`. The F5/durability matrices match the all-`useState` reality.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `payment_success` channel | published to `orders:kds` (shared KDS/POS/admin floor) | `s.rdb.Publish(ctx, "orders:kds", …{"type":"payment_success",…})` (`payment_service.go:270-271`); `LiveHandler` + `KDSHandler` both subscribe `orders:kds` (`websocket/handler.go:18,23`) | 🟢 | — (Flag 4 deployment-coupling, owner decision) |
| POS / KDS / admin-floor `payment_success` handling | 3× `❓ UNVERIFIED` — "no handler traced; likely ignored" | honestly flagged, not asserted; consistent with the dead WS branches noted on admin_overview | 🟡 | resolve `❓` on staff_pos / staff_kds / admin_overview future runs |
| Webhook return-URL path | `/api/v1/payments/webhook/vnpay` | matches route `v1.POST("/payments/webhook/vnpay", …)` (`main.go:273`) + builder `payment_service.go:103` | 🟢 | — |

**Verified-matching:** status machine gate `ready OR delivered` (`order_service.go:50`); output `paid`
via `MarkOrderPaid` (`order_service.go:86`); cancellation/timeout reverse-flow table; "no
browser→browser arrow" invariant.

---

## Area ④ — Loading behaviour

**Verdict:** ✅ Accurate. `_loading.md` correctly traces the 4 loading layers and that the
QR/WS "waiting" states are unreachable (Bug 2).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| No error state on `GET /orders/:id` failure | guard `isLoading \|\| !order` → permanent "Đang tải…" on 404/network error | exactly `page.tsx:137-143`; query has no `isError` branch (`page.tsx:56-60`) | 🟡 | FE — add error/retry branch (also `_be.md` Flag 7) |
| Missing `orderId` → stuck spinner | `enabled:!!orderId` → query never fires → stuck | `page.tsx:59`; `!order` stays true | 🟡 | FE — invalid-route guard |
| No route-level `loading.tsx` for `cashier/` | none in `(dashboard)`/`cashier/`; `admin/` has one, not inherited | confirmed (no `cashier/loading.tsx`) | 🟢 | — |

**Verified-matching:** AuthGuard blank-screen (`AuthGuard.tsx:23`) → RoleGuard `minRole=CASHIER`
(`page.tsx:40`) → order query → interaction pending states (create button "Đang xử lý…" `page.tsx:242`,
WS backoff `min(1000*2**attempts,30_000)` `page.tsx:98`).

---

## Area ⑤ — FE⇄BE data model

**Verdict:** ✅ Accurate, and this is where the doc earns its keep — the FE `Payment` interface vs the
thin `POST /payments` response is the doc's central, correctly-documented drift (= 🔴 #1).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `POST /payments` response shape | thin `{id, pay_url, qr_code_url}` — omits status/amount/method | `payment_handler.go:44-48` confirmed | 🔴 | 🔴 #1 |
| FE `cod` vs BE `cash` | mismatch → 400 | `page.tsx:14` vs `payment_handler.go:25` confirmed | 🔴 | 🔴 #2 |
| `PATCH /payments/:id/proof` exists? | "route does not exist" | grep `proof` in `be/` → 0 non-test hits; only `POST ""`,`GET /:id`,3 webhooks (`main.go:267-275`) | 🟡 | BE build or FE remove (Bug 3, gated by 🔴 #1) |
| `GET /orders/:id` staff ownership bypass | staff token reads any order; customer guarded by table | `order_handler.go:127-130` (staff `callerID=claims.Subject`); guard `order_service.go:116-120` | 🟢 | — |
| `completePayment` for `ready` (not `delivered`) | status drift — `MarkOrderPaid` only `delivered→paid`, error swallowed | `order_service.go:83-86` returns error; `payment_service.go:265-267` warn-swallows | 🟡 | BE (Flag 6) |
| WS `/ws/orders-live` role gate | none — `?token=` parsed then discarded; any JWT subscribes | `websocket/handler.go:31-47` (`ParseToken` result `_`-discarded `:40`) | 🟡 | BE — add role check (Flag 5, cross-page) |

**Verified-matching:** idempotency `409 PAYMENT_ALREADY_EXISTS` for non-`failed` existing payment
(`payment_service.go:71-75`); amount = `order.TotalAmount`, client never sends it
(`payment_service.go:89`); 15-min `expires_at` gateways only (`:80-83`); gateway URL silently empty on
build failure (`:108-110,122,133` — Flag 8); `GetPayment` returns full `db.Payment` (`payment_service.go:142-151`).

---

## Drift that is documentation-only (provenance)

| Topic | Doc says | Code reality (file:line) | Sev |
|---|---|---|---|
| `main.go` orders group | `:230-246`; `GET /:id` `:236` | actual group `:243-244`, `GET /:id` **`:249`** | 🟢 |
| `main.go` payments group | group/auth `:254-257`; `POST ""` `:256`; `GET /:id` `:257`; webhooks `:254-262` | actual `payR` `:267`, `.Use` `:268`, `POST ""` **`:269`**, `GET /:id` **`:270`**, webhooks `:273-275` | 🟢 |
| `main.go` WS group | `:337-339`; `/orders-live` `:339` | actual `wsR` `:350`, `/kds` `:351`, `/orders-live` **`:352`** | 🟢 |
| `completePayment` range | `:252-273` | actual `:252-274` (off-by-one) | 🟢 |
| Provenance branch | all 5 files cite `experience_claude.md_system_1` | actual branch `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 |

**Note (no collision here):** unlike `customer_checkout` / `customer_favourites` / `customer_product_detail`,
this page lives in the `(dashboard)` group, **not** `(shop)` — there is **no `ClientBottomNav`** and no
`fixed bottom-0` footer; header + controls are `.no-print` inline. The shared sticky-footer collision
pattern does **not** apply.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Widen `POST /payments` response to include `status`/`amount`/`method` (or FE re-fetch `GET /payments/:id` after create) — unblocks QR + WS + cash-success in one change | `be/internal/handler/payment_handler.go:44-48` (or `fe/.../page.tsx:114`) |
| 2 | 🔴 Code bug | FE `'cod'` → `'cash'` in `PaymentMethod` type, default, `METHOD_LABELS` key (keep "Tiền mặt" label) | `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx:14,30-35,52` |
| 3 | 🟡 Code bug | Add `isError`/retry branch to `GET /orders/:id` (and invalid-`orderId` guard) so a bad id doesn't stick on "Đang tải…" | `fe/.../page.tsx:137-143` |
| 4 | 🟡 Code bug | Build `PATCH /payments/:id/proof` (route+handler+service+column) **or** remove the proof-upload UI | `be/cmd/server/main.go:267-275` / `fe/.../page.tsx:264-278` |
| 5 | 🟡 Code bug | Fix Flag 6 status drift — allow `MarkOrderPaid` from `ready`, or surface the swallowed error | `be/internal/service/order_service.go:83-86`, `payment_service.go:265-267` |
| 6 | 🟡 Code bug | Add a role gate to WS `/ws/orders-live` after JWT parse (cross-page: KDS/POS/admin floor) | `be/internal/websocket/handler.go:40-47` |
| 7 | 🟢 Doc fix | Refresh stale `main.go` line-numbers (~+13) across `_be.md` / `_crosspage_dataflow.md` and the off-by-one `completePayment` range; bump provenance branch to `experience_claude.md_system_1_test_iphon2_change_code` on all 5 files | the 5 doc-set files |

> **CLAUDE.md note:** doc fixes (row 7) are one task. **Each code change (rows 1-6) must be registered
> in `docs/tasks/MASTER_TASK.md` and ALIGNed before any file is touched** — this skill is read-only and
> did not start any fix. PAYMENT_BUGS.md already recommends rows 1+2 first (one BE change + one FE line).
