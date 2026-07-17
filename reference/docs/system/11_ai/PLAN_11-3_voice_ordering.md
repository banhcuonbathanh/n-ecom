# PLAN 11-3 — Voice / Chat Ordering

> **TL;DR:** Extend the 11-2 chatbot with **tool-use** so it can actually build an order. Bump to
> **Claude Sonnet 4.6** (multi-step reasoning). Voice = browser Web Speech API → text → same chat
> endpoint. The bot proposes cart actions via tools that map to existing endpoints; **the Go BE
> enforces every rule** (one active order per table, pricing, table_id). The bot is never the authority.

---

## Goal

Customer says or types "cho 2 bánh cuốn thịt với 1 chả" → those items land in the cart through the
**existing order write path**, with prices and rules enforced by Go.

## Scope — files

| File | Change |
|---|---|
| `ai/` | add tool definitions + tool-loop to `chat.py`: `search_menu`, `add_to_cart`, `review_order` |
| `fe/` | mic button (Web Speech API) on the chat widget; wire tool results into the cart |
| `fe/src/lib/order-payload.ts` | **reuse** — the bot's "place order" MUST go through this single write path (Rule #4) |

> Scope contract: tool execution that creates an order goes through `order-payload.ts` + the Go
> `/orders` endpoint. No new order-creation path. No Go business-logic changes.

## Approach

1. **Tools (Claude tool-use):**
   - `search_menu(query)` → reads Redis menu (same as 11-2), returns matching items + ids/prices.
   - `add_to_cart(product_id, qty, filling, combo_items)` → returns a proposed cart line for FE confirm.
   - `review_order()` → summarises the cart for confirmation.
2. **Authority boundary:** tools return *proposals*; the FE shows them and the customer confirms; the
   actual POST uses `order-payload.ts` → Go enforces one-active-order-per-table, pricing, JWT/table_id.
3. **Model:** Sonnet 4.6 — ordering needs reliable multi-step + tool selection.
4. **Voice:** browser `SpeechRecognition` (vi-VN) → text → existing `/ai/chat`. No backend speech infra.

## Acceptance Criteria

- [ ] Natural-language order → correct items + qty + filling proposed.
- [ ] Customer confirms → order created via `order-payload.ts`, totals match Go's calculation.
- [ ] Bot cannot bypass the one-active-order-per-table rule (Go rejects → bot relays the error).
- [ ] Voice input transcribes and produces the same result as typing.
- [ ] Combo overrides (`filling`, `combo_items`) thread through correctly.

## Dependencies

11-2 (chatbot + grounding). Touches the order flow → **READ
[ORDER_STATE_MACHINE](../01_flow/ORDER_STATE_MACHINE.md) + [BUSINESS_RULES](../02_spec/BUSINESS_RULES.md)
before coding** (CLAUDE.md spec-first rule).

## Open Decisions

- Should the bot auto-place on confirm, or always hand off to the normal cart UI for final submit?
  Default: hand off to existing cart confirm (safer, reuses `TableConfirmModal`).
