# Flow Index — All System Flows

> Start here. Each file covers one flow in full — rules, diagrams, endpoints, key files.

---

| # | File | What it covers |
|---|---|---|
| 01 | [FLOW_01_ENTRY_POINTS.md](FLOW_01_ENTRY_POINTS.md) | Customer QR scan + Staff login → role-based redirect |
| 02 | [FLOW_02_CLIENT_QR.md](FLOW_02_CLIENT_QR.md) | QR → menu → cart → order → tracking (no login, ever) |
| 03 | [FLOW_03_STAFF_KDS.md](FLOW_03_STAFF_KDS.md) | Chef: receive orders via WS, mark items done, status bumps |
| 04 | [FLOW_04_STAFF_POS.md](FLOW_04_STAFF_POS.md) | Cashier: build walk-in order, wait for kitchen, go to payment |
| 05 | [FLOW_05_ADMIN_OVERVIEW.md](FLOW_05_ADMIN_OVERVIEW.md) | Manager: floor view, confirm orders, table grid, SSE + WS |
| 06 | [FLOW_06_PAYMENT.md](FLOW_06_PAYMENT.md) | COD + QR payment (VNPay/MoMo/ZaloPay), proof upload |
| 07 | [FLOW_07_CANCEL.md](FLOW_07_CANCEL.md) | Cancel rule (< 30%), who can cancel what, item vs order |
| 08 | [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md) | All order status transitions: pending → confirmed → preparing → ready → delivered / cancelled |
| 09 | [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) | Token storage, transport rules (Bearer vs ?token=), refresh |
| 10 | [FLOW_10_FLOW_INTERSECTION.md](FLOW_10_FLOW_INTERSECTION.md) | Where customer and staff flows meet — event mapping |

---

## Quick Reference

**Customer does something → which staff screen reacts?**
→ [FLOW_10_FLOW_INTERSECTION.md](FLOW_10_FLOW_INTERSECTION.md)

**What statuses can an order be in and who changes them?**
→ [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md)

**Can this order be cancelled?**
→ [FLOW_07_CANCEL.md](FLOW_07_CANCEL.md)

**Why is the WS using ?token= and the SSE using a header?**
→ [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md)

**When does payment happen and how?**
→ [FLOW_06_PAYMENT.md](FLOW_06_PAYMENT.md)
