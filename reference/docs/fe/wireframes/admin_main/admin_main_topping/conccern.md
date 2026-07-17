> Scratchpad: open questions, risks, undecided items for Admin — Topping.

---

## Open Questions

- [ ] **Delete permission:** Can Managers delete toppings or is delete Admin-only? The excalidraw shows a single [×] button with no role distinction. Needs clarification before building the delete button's visibility logic.

- [ ] **Product-topping linking on this page:** The "Áp dụng cho sản phẩm" column is read-only here (linking is done from Admin — Products). But should there be a quick way to link toppings to products directly from this page? The excalidraw doesn't show this — assume read-only for now, but confirm with owner.

- [ ] **Bulk actions:** No bulk delete or bulk status toggle shown in the excalidraw. Is this intentional for v1, or was it omitted from the wireframe? With 23+ toppings, toggling status one-by-one could be slow.

- [ ] **Pagination vs. infinite scroll:** The excalidraw shows "... 18 topping khác · cuộn để xem thêm" — implying a scrollable list, not paginated. Confirm: is this a full list (client-side, no pagination) or should we add `Pagination` for large datasets (50+ toppings)?

- [ ] **Search/filter:** No search bar shown in the excalidraw. With a growing list, filtering by name or status would be useful. Is this a v1 gap or intentionally omitted?

- [ ] **API endpoint confirmation:** The excalidraw shows `GET /api/v1/admin/toppings`, `POST /api/v1/admin/toppings`, `PATCH /api/v1/admin/toppings/:id`, `DELETE /api/v1/admin/toppings/:id`. Need to verify these endpoints exist in the BE and match the spec — or if they're still to be built.

- [ ] **"Áp dụng cho sản phẩm" data shape:** The excalidraw shows plain text ("Chưa gắn sản phẩm") or a pill tag ("Bánh Cuốn Thập Cẩm"). Does the `GET /api/v1/admin/toppings` response include `productNames[]`? Or does the FE need to join against the products list separately?

## Risks

- **Query key collision with Admin — Products:** `['admin', 'toppings']` is already used by ProductFormModal for a topping checkbox list. Any mutation on this page will invalidate that cache too — which is correct but could cause unexpected re-fetches if the user has both pages open in separate tabs.

- **Delete linked topping:** If the API returns 409 when trying to delete a topping linked to products, the FE needs to handle this gracefully (show readable error, not a raw toast). This error path is not modeled in the excalidraw.

- **Form reset bug risk:** RHF forms in modals commonly retain stale values between open/close cycles. Must reset on every open. This is easy to miss.

## Undecided

- Whether to show a row count in Zone B (the badge shows "23" in the excalidraw) as a static number or derived from `data.length` — should be derived; the excalidraw "23" is just example data.
- Confirm if `extraPrice` in the API is stored in VND (integer) or as a decimal. Formatting `+8.000đ` assumes integer VND.
- Sort order of the topping list — alphabetical? creation order? The excalidraw doesn't specify.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
