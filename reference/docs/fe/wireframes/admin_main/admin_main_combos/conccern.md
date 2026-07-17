> Scratchpad: open questions, risks, undecided items for Admin — Combo page.

---

## Open Questions

- [ ] Does the API return a price history field (old/previous price) for the strikethrough display in Zone C? The excalidraw shows "175.000 ₫" with strikethrough under the current price. If the backend doesn't store price history, this column cannot be implemented as drawn.
- [ ] Does `GET /api/v1/admin/combos` return `unit_price` per `ComboItem`? This is needed for the savings auto-calculation in the modal. If only `product_id` is returned, a join or separate products fetch is required.
- [ ] Is there a delete confirmation dialog? The excalidraw doesn't show one, but deleting a combo is irreversible. Should we add an "Xác nhận xóa" modal?
- [ ] What happens to active orders that contain a deleted combo? Does the backend handle this gracefully or should the FE warn the admin before deleting?
- [ ] The "🎲 Random combo" button is drawn but has no defined behavior. Should it be hidden, disabled, or shown as "Sắp ra mắt" until the feature is built?
- [ ] Is there pagination on the combo list? The excalidraw shows only 2 rows. If the list can grow large (50+ combos), a paginated or virtualized table is needed.
- [ ] Can the same product appear twice in a combo (e.g., two separate line items for the same product ID)? Or is quantity the only way to increase a product count?

## Risks

- Price history field dependency: if the backend doesn't support it, the strikethrough price in Zone C needs a design change (show only current price, or show "—" for no history).
- `unit_price` per ComboItem dependency: the savings calculation breaks silently if the API doesn't return this field — the savings note would show ₫0 or a wrong number.
- ComboFormModal with many products: if the product list is large (100+ items), client-side filtering may feel sluggish. May need debounce or server-side search later.

## Undecided

- Edit modal title: should it say "Sửa combo" or "Thêm combo mới" when in edit mode? (Currently the excalidraw only shows the add title.)
- Whether "Xóa" needs a second confirmation step or is single-click.
- Whether the savings note in the modal should also show a percentage (e.g., "Tiết kiệm 11%") in addition to the absolute value.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-26*
