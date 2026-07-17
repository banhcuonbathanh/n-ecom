# Checkout `/checkout` — Doc vs. Code Comparison (DETAILED)

> **Scope:** a read-only audit of the `/checkout` page's doc-set against the running FE/BE code on
> branch `experience_claude.md_system_1_test_iphon2_change_code`. Axes audited: **(1) Component
> visuals · (3) Cross-page dataflow · (4) Loading/error · (5) FE⇄BE data model.** Area 2
> (cross-component) is **N/A** — the page is a single `page.tsx` reading `useCartStore` directly,
> with no intra-page component graph and no `_crosscomponent_dataflow.md`.
>
> **Read-only — no code or docs were changed.** Produced by 3 parallel Sonnet audit agents (Areas
> 3/4/5); Area 1 + every 🔴 re-verified by hand by the Opus orchestrator (greps + `file:line` reads
> cited inline). **Code wins:** every "Code reality" cell is traced from source, not recalled.
>
> Date: 2026-06-23 (refresh — re-ran on the same branch; all 3 🔴 hand-re-verified against live
> source and **hold unchanged**: footer collision `checkout/page.tsx:203` + `ClientBottomNav.tsx:48` +
> `(shop)/layout.tsx:12`; `payment_method` 0 grep hits in handler/service; `ErrTableHasActiveOrder`
> sole grep hit = `errors.go:30` definition. No code changed since the 2026-06-22 run.)

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | Mostly faithful; **one undocumented footer-collision bug** + payment-zone layout drift | 1 | 1 | 1 |
| 3 — Cross-page dataflow | **Faithful** — every persist field, cache key, route handoff matches | 0 | 2 | 1 |
| 4 — Loading / error | **Faithful** — bugs re-confirmed, citations within ±1 line | 0 | 1 | 2 |
| 5 — FE⇄BE data model | **Faithful incl. its bugs** — 2 documented code bugs re-confirmed | 2 | 1 | 2 |
| **Total** | **Low-drift, source-faithful doc-set; the 🔴s are code bugs, not doc lies** | **3** | **5** | **6** |

**One-line verdict:** the checkout doc-set is a high-fidelity mirror of the code — it documents the
code *including* its bugs (peer of `customer_combo_detail` / `customer_order_detail` / `admin_combos`).
The only **doc-vs-code contradiction** is the wireframe drawing the submit bar and bottom-nav cleanly
stacked when they actually **collide** (🔴 #1, previously undocumented). The other two 🔴s are real
code bugs the doc already flags.

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

1. **🔴 Footer collision — submit bar hidden behind `ClientBottomNav` (NEW · undocumented code bug +
   doc drift).** The fixed submit bar is `fixed bottom-0 left-0 right-0` with **no z-index**
   (`checkout/page.tsx:203`). The shared customer shell renders `ClientBottomNav` as the **later
   sibling** (`(shop)/layout.tsx:12`), and that nav is `fixed bottom-0 left-0 right-0 z-20`
   (`ClientBottomNav.tsx:48`). Both occupy `bottom: 0`; with `z-20` > `z-auto` **and** later DOM
   order, the nav paints over the **"Đặt hàng · {total}" primary CTA** — the most important control
   on the page. The wireframe (`customer_checkout.md:43-45`) draws them as two clean stacked bars,
   so the doc is also wrong here. **This is the exact same class** as the `customer_product_detail`
   and `customer_favourites` 🔴s (see Cross-Page Concerns in `COMPARISON_TRACKER.md`). Neither
   `customer_checkout.md` nor `CHECKOUT_BUGS.md` mentions it. **Why it matters:** the user may be
   unable to tap "Đặt hàng" — a checkout-blocking visual bug. *Fix:* offset the bar above the ~72px
   nav (`bottom-[calc(72px+env(safe-area-inset-bottom))]`) or give it `z-30`.

2. **🔴 `payment_method` collected but never sent — cosmetic radio (code bug · doc already documents,
   re-verified).** The radio group writes the choice to `cart.setPaymentMethod` (`page.tsx:47`) and
   Zod validates `z.enum(['vnpay','momo','zalopay','cash'])` (`page.tsx:19`), but the field is **absent
   from the POST payload** (`page.tsx:49-56`) and there is **no `orders.payment_method` column** —
   grep for `payment_method` in `order_handler.go` + `order_service.go` returns **zero** hits.
   Picking VNPay/MoMo/ZaloPay does nothing different from Cash; payment method is captured later at the
   cashier (S5). The radio is purely cosmetic. *Doc:* `customer_checkout.md` Flag 1 +
   `customer_checkout_be.md` Flag 1 + `CHECKOUT_BUGS.md` Bug 1 — all accurate. *Why it matters:* a
   customer who picks "VNPay" expecting to pay online is silently routed to cash-on-pickup.

3. **🔴 Dead `TABLE_HAS_ACTIVE_ORDER` branch + unread `table_busy` → silent duplicate order (code bug ·
   doc already documents, re-verified).** `ErrTableHasActiveOrder` (`errors.go:30`) is the **only**
   occurrence of that symbol in all of `be/` (grep) — it is **never returned**. `CreateOrder` treats a
   busy table as informational: it sets `tableBusy = true` (`order_service.go:270-275`) and **still
   creates a parallel order**, returning `201 {data:{id, table_busy}}` (`order_handler.go:121`). So the
   FE `onError` branch checking `error === 'TABLE_HAS_ACTIVE_ORDER'` (`page.tsx:79-84`) is unreachable,
   **and** `onSuccess` never reads `table_busy` from the 201 body (`page.tsx:61-76`). Net effect:
   checkout silently creates a **duplicate order with no notice** — unlike the menu `TableConfirmModal`
   which at least toasts on `table_busy`. *Doc:* `customer_checkout.md` Flag 2 + `_be.md` Flag 2 +
   `CHECKOUT_BUGS.md` Bug 2 — all accurate.

> Note — **`customer_introduction`** was requested in the same batch but **STOPPED, no set written**:
> it is 🔮 PLANNED with no `page.tsx`/route/`features/introduction/` (verified by `find`+`grep`), so a
> comparison would be speculative. Recorded here for provenance only.

---

## Dead / Unreachable Code Found

- **`ErrTableHasActiveOrder`** (`be/internal/service/errors.go:30`) — defined, **returned nowhere** in
  `be/` (grep: single hit = the definition). Fully dead sentinel.
- **`onError` `TABLE_HAS_ACTIVE_ORDER` branch** (`checkout/page.tsx:79-84`) — correctly coded on the FE
  but unreachable because the BE never emits that code.
- **`cart.setPaymentMethod(form.payment_method)` call** (`checkout/page.tsx:47`) — a **dead write**:
  the value is wiped by `clearCart()` on success (`cart.ts:89`), is **not** in `partialize`
  (`cart.ts:153`), and is **never read back** from the store by any page/hook. The payment method that
  *would* matter never reaches the BE anyway (see 🔴 #2).

---

## Area 1 — Component Visuals

**Verdict:** the wireframe matches the render zone-for-zone **except** the footer (🔴 #1) and the
payment-method zone's option order/layout (🟡).

| Component / Zone | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Submit bar vs bottom-nav | Wireframe draws `[ Đặt hàng · 80.000đ ]` then `ClientBottomNav` as two clean stacked bars (`customer_checkout.md:43-45`) | Submit bar `fixed bottom-0 … ` **no z-index** (`page.tsx:203`); shell nav `fixed bottom-0 … z-20` later sibling (`ClientBottomNav.tsx:48`, `(shop)/layout.tsx:12`) → nav overlaps the CTA | 🔴 | Offset bar `bottom-[calc(72px+env(safe-area-inset-bottom))]` or `z-30`; redraw wireframe to show overlap fixed |
| Payment method zone | ASCII draws a **2×2 grid**, Cash first: `(•) 💵 Tiền mặt COD  ( ) 💳 VNPay / ( ) 📱 MoMo  ( ) 🏦 ZaloPay` (`customer_checkout.md:40-41`) | Vertical single-column list (`space-y-3`, one `<label>` per row, `page.tsx:184-194`); option order is **VNPay, MoMo, ZaloPay, Cash** (`PAYMENT_OPTIONS`, `page.tsx:24-29`) — Cash is **last** though it's the default (`page.tsx:42`) | 🟡 | Redraw as a vertical list; fix option order to match code |
| Sticky header | `[← Quay lại]  Xác Nhận Đơn Hàng` (`customer_checkout.md:25`) | `← Quay lại` + `Xác Nhận Đơn Hàng`, `sticky top-0 z-10` (`page.tsx:96-104`) | 🟢 | Matches |
| Order summary card | `ĐƠN HÀNG CỦA BẠN` + `Nx name … price`, `+ toppings`, `Tổng cộng` (`customer_checkout.md:27-32`) | `Đơn hàng của bạn` (uppercased via CSS) + `{qty}x {name}`, `+ toppings.join(', ')`, `Tổng cộng` (`page.tsx:108-133`) | 🟢 | Matches |
| Contact card | `THÔNG TIN LIÊN HỆ` — Họ tên / Số điện thoại / Ghi chú (`customer_checkout.md:34-37`) | RHF inputs `customer_name`/`customer_phone`/`note` (`page.tsx:141-177`) | 🟢 | Matches |

**Verified-matching:** header, order summary, contact card render exactly as drawn.

---

## Area 3 — Cross-page Dataflow

**Verdict:** **faithful** — every `file:line` in `customer_checkout_crosspage_dataflow.md` pins to the
correct current line. No contradiction.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `setPaymentMethod` store write | written then wiped, "never read cross-page" | `page.tsx:47` writes; `clearCart` wipes (`cart.ts:89`); not in `partialize` (`cart.ts:153`); **never read back** — a dead write | 🟡 | Doc accurate but understates; could note it's a no-op write |
| `CART_CONFIG` key vs persist version | key literal `'cart-config-v3'` (`storage-keys.ts:6`) | `storage-keys.ts:6` = `'cart-config-v3'`, but `cart.ts:129` `version: 5` — frozen `-v3` suffix, harmless (Zustand migrates on the integer) | 🟡 | One-line doc note; not a code bug |
| Empty-cart guard | `useEffect` → `router.replace('/menu')` | `page.tsx:36-38` exact (+ sync early-return `:92`) | 🟢 | Matches |
| `ORDER_CACHE` write | `order_cache_<id>` localStorage in `onSuccess` | `STORAGE_KEYS.ORDER_CACHE='order_cache_'` (`storage-keys.ts:3`), written `page.tsx:68` | 🟢 | Matches |
| `clearCart` → `router.replace('/order/:id')` | both on success | `page.tsx:73,75` | 🟢 | Matches |
| `partialize` whitelist | only `orderNote` + `activeOrderId` persist; `items`/`tableId`/`tableName`/`paymentMethod` session-only | `cart.ts:153` exact | 🟢 | Matches |
| `source` derivation | `cart.tableId ? 'qr' : 'online'` | `page.tsx:54` | 🟢 | Matches |
| `buildOrderItemsPayload` single builder | shared by menu/combo/checkout | `order-payload.ts:27`, imported `page.tsx:13,55`; comment `order-payload.ts:16-18` confirms | 🟢 | Matches |

**Verified-matching:** all 10 audited claims pin to exact lines; zero stale citations in this doc.

---

## Area 4 — Loading / Error Behaviour

**Verdict:** **faithful** — no initial-load skeleton (no `useQuery`; cart is synchronous Zustand); all
3 documented bugs re-confirmed; only ±1-line citation drift.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Bug 3 — online order 403 on re-fetch | `source:'online'` ⇒ `table_id NULL` ⇒ `GetOrder` customer guard 403s the post-create re-fetch | `order_service.go:116-119` `if callerRole=="customer" { if !o.TableID.Valid \|\| … != callerID { return ErrForbidden }}`; NULL table set `order_service.go:301-304`; re-fetch failure swallowed `page.tsx:69-71` — **latent** (no wired online entry today) | 🟡 | Close when online-ordering ships; tie ownership to a customer-account claim, not `TableID` |
| No initial skeleton | page has no `useQuery`; cart from synchronous Zustand | `page.tsx:7` imports only `useMutation`; no `useQuery` in file | 🟢 | Matches |
| Empty-cart fast path | `return null` + `useEffect` redirect | `page.tsx:92` + `:36-38` | 🟢 | Matches |
| Submit pending state | disabled + "Đang đặt hàng..." | `page.tsx:207-212` | 🟢 | Matches |
| onSuccess GET try/catch fallback | caches full order, falls back to minimal body | `page.tsx:61-75` | 🟢 | Matches |
| onError toast | `toast.error(message ?? 'Đặt hàng thất bại')` | `page.tsx:86` | 🟢 | Matches |
| Off-by-one citations | `page.tsx:79-83`; `order_service.go:116-120` | actual `:79-84` and `:115-120` | 🟢 | Update cites ±1 |

**Bugs re-confirmed:** Bug 1 (payment_method) **holds**; Bug 2 (dead branch) **holds**; Bug 3 (online
403) **holds, latent**.

---

## Area 5 — FE⇄BE Data Model

**Verdict:** **faithful including its bugs.** Every binding tag, auth rule, service branch, response
shape, and the two dead-code findings match source. Only `main.go` route line numbers are stale.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `payment_method` never sent | radio cosmetic; no column; not in body | `page.tsx:49-56` payload omits it; `order_handler.go:59-66` struct has no field; grep `payment_method` in handler+service = 0 hits | 🔴 | Drop non-cash options or label "sắp có" until online-payment BE exists (code bug, MASTER row) |
| `TABLE_HAS_ACTIVE_ORDER` dead + silent dup | sentinel unreturned; busy table → parallel order + 201 | `errors.go:30` sole hit (grep); `order_service.go:270-275` informational; `order_handler.go:121` `201 {id,table_busy}`; FE `page.tsx:79-84` dead, `table_busy` unread in `onSuccess` | 🔴 | Delete FE dead branch; read `data.table_busy` in `onSuccess` to toast (code bug, MASTER row) |
| name/phone/note not server-validated | handler binds with no rules; regex is FE-only | `order_handler.go:62-64` no `binding:` tags; FE regex `page.tsx:16-17` | 🟡 | Add server-side validation if non-browser clients matter |
| 2 endpoints, both authMW | `POST /orders` + `GET /orders/:id` under `orderR.Use(authMW)` | `main.go:243-249` (group `:243`, `authMW :244`, `POST "" :245`, `GET /:id :249`) | 🟢 | doc cites `:230-237` — stale, update |
| `created_by` rule | customer → blank → NULL; staff → stored | `order_handler.go:88-92` | 🟢 | Matches |
| `source` binding | `required,oneof=online qr pos`; items `required,min=1` | `order_handler.go:61,65` | 🟢 | Matches |
| Per-item XOR guard | exactly one of product_id/combo_id | `order_handler.go:77-86` | 🟢 | Matches |
| Combo header `unit_price=0` | OC epic | `order_service.go:402-411` (doc cites `:398-412`, ~4 off) | 🟢 | Update cite |
| GetOrder ownership guard | customer caller `callerID=claims.TableID`, enforce `o.TableID==callerID` | `order_handler.go:128-129` + `order_service.go:116-119` | 🟢 | Matches |
| No Redis read-cache | pub/sub fan-out only | `CreateOrder`/`GetOrder` straight to MySQL; only `publish*` to Redis | 🟢 | Matches |
| `sql.ErrNoRows` handling | 404 mapping | `order_service.go:109` uses `errors.Is(err, sql.ErrNoRows)` — **not** the `==` 404→500 trap seen on admin_ingredients | 🟢 | Matches (good) |

**Verified-matching:** endpoints, authMW, `created_by`, all binding tags, XOR guard, tableBusy
informational logic, 201 shape, ownership guard, no-Redis-read, combo header unit_price=0.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Offset submit bar above the 72px nav (`bottom-[calc(72px+env(safe-area-inset-bottom))]`) or `z-30` so the "Đặt hàng" CTA isn't overlapped | `fe/src/app/(shop)/checkout/page.tsx:203` |
| 2 | 🔴 Code bug | Stop silently sending a useless payment method: hide non-cash options (or label "sắp có") until online-payment BE exists; remove the dead `cart.setPaymentMethod` write | `checkout/page.tsx:24-29,47,184-194` |
| 3 | 🔴 Code bug | Delete the unreachable `TABLE_HAS_ACTIVE_ORDER` `onError` branch; read `data.table_busy` in `onSuccess` and toast the customer (parity with menu `TableConfirmModal`) | `checkout/page.tsx:61-84` |
| 4 | 🔴 Doc fix | Redraw the wireframe footer to show the submit-bar/nav relationship truthfully (and the fix) | `customer_checkout.md:43-45` |
| 5 | 🟡 Doc fix | Redraw payment zone as a vertical list with the real option order (VNPay, MoMo, ZaloPay, Cash) | `customer_checkout.md:40-41` |
| 6 | 🟡 Doc fix | Refresh stale `main.go` route lines `:230-237 → :243-249`; combo header `:398-412 → :402-411`; off-by-one cites `page.tsx:79-83→:79-84`, `order_service.go:116-120→:115-120` | `customer_checkout_be.md`, `CHECKOUT_BUGS.md` |
| 7 | 🟡 Code (latent) | When online-ordering ships, fix the `table_id`-null 403 by tying `GetOrder` ownership to a customer-account claim | `order_service.go:116-119` |
| 8 | 🟢 Doc fix | Note the harmless `CART_CONFIG='cart-config-v3'` vs persist `version: 5`; refresh provenance branch in `_be.md` header | `_crosspage_dataflow.md`, `customer_checkout_be.md` |

> **CLAUDE.md note:** doc fixes (#4-6, #8) are one ALIGNed task. Each **code** change (#1-3, #7) must be
> registered in `docs/tasks/MASTER_TASK.md` before any file is touched — this audit only surfaces drift,
> it does not fix it.
