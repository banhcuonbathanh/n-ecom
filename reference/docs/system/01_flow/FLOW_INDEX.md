# Flow Index — System Handbook

> **TL;DR:** Five major flows: customer QR journey (plus 🔮 planned online ordering), staff
> operations (KDS + POS), order state machine, payment, and cancellation. All flows share one
> order lifecycle and intersect at the realtime layer (WS/SSE). Start here, then open the
> specific flow file.
>
> Status markers: ✅ implemented · 🔮 PLANNED (owner decision 2026-06-12, not in code yet) ·
> ⚠️ DRIFT (target rule differs from current code).
>
> **Any change to business logic or flow MUST first consult and update
> `docs/system/07_business_logic/` ([LOGIC_INDEX.md](../07_business_logic/LOGIC_INDEX.md)).**

---

## Flow Documents in This Folder

| # | File | What It Covers |
|---|---|---|
| 1 | [CLIENT_FLOW.md](CLIENT_FLOW.md) | QR scan → menu → cart → order → live tracking · 🔮 planned online ordering flow |
| 2 | [STAFF_FLOW.md](STAFF_FLOW.md) | Login → KDS cooking / POS / Overview → bill → payment confirm |
| 3 | [ORDER_STATE_MACHINE.md](ORDER_STATE_MACHINE.md) | All order status transitions + cancellation rules |
| 4 | [PAYMENT_FLOW.md](PAYMENT_FLOW.md) | COD + VNPay / MoMo / ZaloPay webhook flows |
| — | [../02_spec/BUSINESS_RULES.md](../02_spec/BUSINESS_RULES.md) | RBAC, cancel rule, JWT rules, realtime config |

---

## Flow Intersection Map

The diagram below shows how the four major flows connect at runtime.

```mermaid
flowchart TD
    subgraph CLIENT["Customer Flow"]
        C1["QR Scan\n/table/:token"]
        C2["POST /auth/guest\n→ guest JWT"]
        C3["/menu\nbrowse + cart"]
        C4["POST /orders\nsource='qr'"]
        C5["/order/:id\nSSE live tracking"]
    end

    subgraph STAFF["Staff Flow"]
        S1["Login\n/login → role redirect"]
        S2["KDS /kds\nWS: new_order"]
        S3["POS /pos\nbuild walk-in order"]
        S4["Admin Overview\npending → confirmed"]
        S5["/cashier/payment/:id\nCOD or QR pay"]
    end

    subgraph ORDER_SM["Order State Machine"]
        O1["pending"]
        O2["confirmed"]
        O3["preparing"]
        O4["ready"]
        O5["delivered"]
        O6["cancelled"]
    end

    subgraph PAYMENT["Payment Flow"]
        P1["POST /payments\n{method}"]
        P2["COD → completed\nimmediately"]
        P3["QR → pending\nshow qr_code_url"]
        P4["Webhook verify\nHMAC → completed"]
    end

    C4 -->|WS new_order| S2
    C4 -->|WS new_order| S4
    C4 --> O1
    S4 -->|PATCH status confirmed| O2
    S2 -->|PATCH status preparing| O3
    S2 -->|all items done / manual| O4
    O4 -->|cashier navigates| S5
    S5 --> P1
    P1 --> P2
    P1 --> P3
    P3 -->|webhook| P4
    P4 -->|WS payment_success| S5
    P2 --> O5
    P4 --> O5
    O1 -->|"cancel (current code: < 30% served)"| O6
    O2 -->|"cancel (current code: < 30% served)"| O6
    O3 -->|"cancel (current code: < 30% served)"| O6
    O4 -.->|"🔮 target: cancel anytime before payment\n(current code blocks at ready — ⚠️ DRIFT)"| O6
    O5 -->|SSE update| C5
    O6 -->|SSE order_cancelled| C5
```

> ⚠️ DRIFT — cancel rule: target rule (owner decision 2026-06-12) lets a customer cancel at any
> time before payment is completed. Current code still enforces the < 30% served rule and blocks
> cancel at `ready`. Detail: [ORDER_STATE_MACHINE.md — cancel rules](ORDER_STATE_MACHINE.md#cancel-rules).

---

## Quick Reference

| Question | Where to look |
|---|---|
| Customer → which staff screen reacts? | Flow Intersection Map above + [STAFF_FLOW.md](STAFF_FLOW.md) |
| What statuses can an order be in? | [ORDER_STATE_MACHINE.md](ORDER_STATE_MACHINE.md) |
| Can this order be cancelled? | [ORDER_STATE_MACHINE.md — cancel rules](ORDER_STATE_MACHINE.md#cancel-rules) |
| Why does WS use `?token=` but SSE uses a header? | [../02_spec/BUSINESS_RULES.md §6](../02_spec/BUSINESS_RULES.md) + [STAFF_FLOW.md](STAFF_FLOW.md) realtime section |
| When does payment happen and how? | [PAYMENT_FLOW.md](PAYMENT_FLOW.md) |

---

## Deep Dive Sources

| File | Purpose |
|---|---|
| `../02_spec/BUSINESS_RULES.md` | Business rules (cancel, payment, one-active-order, RBAC, realtime) |
| `../07_business_logic/LOGIC_INDEX.md` | Business-logic index — consult + update before any logic/flow change |
| `../02_spec/API_SPEC.md` | All API endpoints referenced by the flows |
