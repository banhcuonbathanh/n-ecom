> Scratchpad: open questions, risks, undecided items for Client — Favourites.

---

## Open Questions

- [ ] **Store shape migration** — The existing `useFavouritesStore` only tracks favourite IDs. The new shape adds `qty`, `toppingIds`, and `sets[]`. How do we handle existing localStorage data from users who have the old store? Need a migration or version check in the persist middleware.
- [ ] **Topping snapshot in sets** — When a set is saved, do we store topping names/prices alongside IDs, or just IDs? If the topping is later deleted by admin, the set would silently have broken topping references. Decision needed before implementing `addSet`.
- [ ] **Rename flow for sets** — The excalidraw shows a ✏ button but no rename UI. Is this an inline editable field, a bottom sheet, or a small modal? Not defined yet.
- [ ] **"Áp dụng" navigation** — After applying a set, where does the user go? Back to menu (to review cart), to the cart drawer, or stay on Screen 3? Needs a decision.
- [ ] **Max favourites limit** — Is there a maximum number of items a user can favourite? No limit defined. Could cause very long lists. Should we cap at e.g. 20 items?
- [ ] **Max sets limit** — Same question for saved sets. No limit defined in spec.
- [ ] **Topping display in FavouriteItemCard** — The excalidraw shows toppings from when the item was added to favourites. But the user might want to change toppings without un-favouriting and re-favouriting. Is topping editing in-place on this page, or read-only (must go back to menu)?

## Risks

- **Store extension is a breaking change** — Existing `useFavouritesStore` with old shape in localStorage will conflict with new shape. Requires versioned persist or a `_version` field check on hydration.
- **Product/combo 404 race** — If multiple items 404 simultaneously, multiple toast messages could stack. Need to debounce or batch the cleanup toast.
- **`applySet` merges into cart — no preview** — User taps "Áp dụng" and items silently land in the cart. If the set is large, the cart could grow unexpectedly. No confirm step is shown in the excalidraw.

## Undecided

- Whether `FavouritesSummaryList` (Screen 2) shows per-portion subtotals or just item totals
- Whether item images should be shown in Screen 2 and Screen 3 (not visible in excalidraw for those screens)
- Whether the sets list (Screen 3) is ordered by creation date (newest first) or allows manual reordering

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
