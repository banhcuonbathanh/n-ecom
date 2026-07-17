# Open Questions — owner's brain-dump

> **How to use (viết tiếng Việt thoải mái):** any time a question pops into your head, add one
> line under "Open". Next session tell Claude: *"answer the open questions in
> docs/system_review/OPEN_QUESTIONS.md"*. Claude answers with proof (`file:line` or doc link),
> then moves the row to "Answered". Questions that become work → MASTER_TASK row, not an answer.

## Open

| # | Date | Question | Priority |
|---|---|---|---|
| Q1 | 2026-07-15 | (example) Why does the favourites page look different from the menu design? | — answered below |
| | | *(add yours here)* | |

## Answered

| # | Date asked | Question | Answer (with proof) |
|---|---|---|---|
| Q1 | 2026-07-15 | Why does the favourites page look different from the design? | The wireframe and the code diverged and nobody reconciled them. `/comparison-doc` already measured it: the wireframe draws a per-card `[+ Giỏ]` add-to-cart button that was never built (`FavouriteItemCard.tsx` has only remove + qty), and the page footer is painted over by the bottom nav (z-index collision, same bug as product_detail and checkout). See [COMPARISON_TRACKER.md](../system/08_pages/COMPARISON_TRACKER.md) row `customer_favourites` + the fix plan in [02_SUGGESTIONS_AND_COMMANDS.md](02_SUGGESTIONS_AND_COMMANDS.md) P1-1. |

## Became tasks

| # | Question | MASTER_TASK row |
|---|---|---|
| Q1 | Favourites page differs from design — build per-card add-to-cart or keep bulk-only? | **P-FIX-10** (owner decision) + **P-FIX-1** (footer z-index, code fix) |
