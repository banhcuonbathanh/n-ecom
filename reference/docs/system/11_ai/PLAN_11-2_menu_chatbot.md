# PLAN 11-2 — Menu Chatbot (Q&A)

> **TL;DR:** A chat widget on `/menu` where a customer asks about dishes/combos/hours in natural
> language. The `ai` service calls **Claude Haiku 4.5**, grounded on the **same Redis menu cache** the
> BE already maintains, and streams the answer back to the browser via SSE (reuse the order-tracking
> EventSource pattern). Read-only — no ordering yet (that's 11-3).

---

## Goal

Customer types "có combo nào dưới 50k?" → gets an accurate, grounded answer drawn from the live menu,
streamed token-by-token.

## Scope — files

| File | Change |
|---|---|
| `ai/` | `chat.py` — `POST /ai/chat` (SSE stream); loads menu from Redis as grounding context; Haiku call |
| `fe/src/components/...` | chat widget component (floating button + panel) on `/menu` |
| `fe/src/hooks/` | `useAiChat` hook — reuse existing SSE/EventSource pattern from order tracking |

> Scope contract: no BE (Go) changes — the chatbot reads Redis, which the BE already populates.

## Approach

1. **Grounding (RAG-lite):** read `products:list` / combos / toppings / categories from Redis
   ([REDIS_CACHE](../03_be/REDIS_CACHE.md)) → inject as structured context in the system prompt.
   Auto-fresh: when the BE invalidates the menu cache, the next chat turn sees new data. No new pipeline.
2. **Model:** Haiku 4.5 — a menu bot does not need more; cheapest per-turn.
3. **System prompt:** restaurant persona + "answer ONLY from the provided menu; if unknown, say so."
4. **Streaming:** `POST /ai/chat` returns SSE; FE renders deltas. Reuse the reconnect/backoff config
   already standardised for SSE ([TECH_STACK §3](../00_overview/TECH_STACK.md)).

## Acceptance Criteria

- [ ] Ask about a real menu item → correct price/description from cache.
- [ ] Ask about a non-existent item → bot declines, does not hallucinate.
- [ ] Answer streams (not one blocking chunk).
- [ ] Menu edited in admin → cache invalidated → bot reflects change on next turn.
- [ ] Guest JWT is accepted (no login required).

## Dependencies

11-1 (AI service + auth). Blocks 11-3.

## Open Decisions

- §4.2 language — default Vietnamese only.
