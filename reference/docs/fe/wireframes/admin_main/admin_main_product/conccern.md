> Scratchpad: open questions, risks, undecided items for Admin — Products.

---

## Open Questions

- [ ] **RBAC — Delete permission:** Can Manager delete products, or is that Admin-only? Excalidraw shows "Xóa" for all rows without role distinction. The other admin pages (Combos) hide "Xóa" for non-Admin roles — should Products follow the same pattern?
- [ ] **Delete confirm dialog:** The excalidraw shows a "Xóa" button but no confirm step. Is there a confirm dialog before deletion fires? This is a destructive action and should have confirmation — but is it a simple `window.confirm` or a custom modal?
- [ ] **"🌱 Dữ liệu mẫu" button:** Is this dev/staging only, or should it be available in production? If dev-only, it should be hidden behind an env flag (`NODE_ENV !== 'production'`). Who can use it — Admin only?
- [ ] **Pagination vs. full list:** The excalidraw shows 15 products with "11 sản phẩm khác". Is the table always full-list (no pagination), or will pagination be needed when the restaurant grows? If > 50 products expected, add pagination or virtual scroll now.
- [ ] **Status toggle:** Is "Hết hàng" only changed via the Edit modal, or can it be toggled inline in the table (e.g., click the badge to toggle)? Inline toggle would be faster UX.
- [ ] **Image storage:** Where are product images stored? Local uploads to the BE file system, or a CDN/object storage (e.g. S3)? This affects the image upload implementation in `ProductFormModal`.
- [ ] **Sort order:** The "Thứ tự" field — does the menu page respect this sort_order, or does it use a different ordering (e.g., category, creation date)? Need to confirm the display order rule.

## Risks

- `['admin', 'products']` is already in the state index with `staleTime: 30s` from Admin — Combos usage. After this page launches, mutations here will also invalidate that query on the Combos page — cross-page side effect to be aware of.
- Image upload not defined in API contract — need to confirm endpoint (`POST /api/v1/admin/products/:id/image` or inline as base64?). Implementation blocked until confirmed.

## Undecided

- Delete confirmation UI: `window.confirm` (fast to build) vs. custom dialog (more consistent with design system)
- Whether "Hết hàng" status can be toggled without opening full edit modal

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-26*
