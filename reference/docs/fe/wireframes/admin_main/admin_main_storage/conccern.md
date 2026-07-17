> Scratchpad: open questions, risks, undecided items for Admin — Kho nguyên liệu.

---

## Open Questions

- [ ] **RBAC**: Roles allowed to add/edit/delete ingredients? Admin only, or Manager too? Does Manager see the page but only Admin can delete?
- [ ] **Stock = 0**: Is there a distinct "Hết hàng" (out-of-stock) status badge (red), separate from "Sắp hết hạn" (amber)? The excalidraw only shows 2 states — confirm with owner.
- [ ] **Duplicate name**: Should the system block (409 error) or warn-and-allow duplicate ingredient names? Restaurant may have same ingredient from different suppliers.
- [ ] **Unit list**: Is the unit field a free-text input or a fixed dropdown (kg, g, lít, cái, hộp, túi…)? Excalidraw shows a select (`kg ▾`) — what are all valid values?
- [ ] **Pagination**: The excalidraw shows 4 rows only — does the table paginate, or is it full-list with client-side filter? What is the expected max number of ingredients?
- [ ] **Expiry date source**: Is `expiryDate` always computed as `importDate + shelfDays` server-side, or can the user enter a specific expiry date directly?
- [ ] **Edit modal vs Add modal**: Is the same form (Zone E) reused for both Add and Edit, or is there a separate Edit flow? (Assumed: same modal, different mode)
- [ ] **Threshold-based status**: Does `status: 'expiring_soon'` trigger from expiry date proximity, quantity threshold, or both? The excalidraw shows "Tôm tươi" with BOTH low quantity (2) and near expiry date — unclear which triggered the badge.
- [ ] **API endpoint**: Is it `/api/v1/admin/ingredients` or `/api/v1/admin/storage`? No backend spec confirmed yet.
- [ ] **Backend endpoint for ingredients**: Does a backend endpoint exist, or is this a new Phase 8+ feature that needs BE work too?

## Risks

- The "Ngưỡng cảnh báo" (warning threshold) logic lives on the backend — if BE computes `status`, then FE row highlighting must match the same logic. Risk of visual inconsistency if FE re-derives it independently.
- No pagination in the excalidraw — if the restaurant has 50+ ingredients, a full-list client-side approach may feel slow. Needs decision before implementation.

## Undecided

- Whether "Hết hàng" (quantity = 0) gets its own row colour (red?) distinct from "Sắp hết hạn" (orange).
- Whether the delete action requires a confirmation dialog or uses optimistic UI.
- Whether "Số ngày bảo quản" is editable after initial creation, or if updating it creates a new expiry date.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-26*
