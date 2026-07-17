> Scratchpad: open questions, risks, undecided items for Thông Tin Khách Hàng.

---

## Open Questions

- [ ] **Auth model conflict** — The current API contract (v1.2) uses stateless guest JWT (`sub='guest'`, no DB row). A stateless guest cannot have a persistent profile. Does a registered customer account system exist, or is it planned? `GET /api/v1/customer/profile` cannot work without a real `customer_id` in the token. **This is a blocker for CI-8 and CI-9.**
- [ ] **API endpoints missing** — `GET /api/v1/customer/profile` and `PUT /api/v1/customer/profile` are not in `docs/contract/API_CONTRACT_v1.2.md`. They must be added and agreed with BE before FE implementation starts.
- [ ] **⚙ settings icon removed** — The excalidraw showed a ⚙ icon in Zone A (top-right). Removed from the spec because no settings page is defined. Decision: if a settings/logout function is needed, add a "Đăng xuất" button in Zone B (below the membership badge) instead of the top nav icon. **Confirm with owner before building.**
- [ ] **Avatar upload** — The 📷 camera badge on the avatar is shown in the excalidraw but no avatar upload endpoint exists. Is avatar upload in scope for v1? If not, render the badge as non-interactive (greyed out or hidden).
- [ ] **"✓ Thành viên" badge** — What makes a customer a member? Is it automatic on registration, or does it require a specific action (e.g., first order, loyalty program)? The badge visibility depends on `isMember: boolean` from the profile API.
- [ ] **Phone validation** — Does the system accept `+84` international format or only `0xxx` local format? Zod currently uses `/^0\d{9}$/`. Confirm with BE whether the DB stores normalised form.
- [ ] **"Lịch Sử Ăn" link** — Zone D has a card linking to "Lịch Sử Ăn". Does this page exist? The wireframe index does not show a `client_order_history` page yet. If it doesn't exist, what should the link do — link to order tracking, or show a TODO state?
- [ ] **"Đặt Bàn" link** — Zone D has a card for "Đặt bàn về nhà" (table reservation for home delivery?). This seems unusual — is it "delivery" or "table reservation at the restaurant"? Clarify the target page/route.
- [ ] **useSettingsStore sync** — After saving, the spec says to sync `useSettingsStore.setCustomerName(name)`. Does `useSettingsStore` currently have a `setCustomerName` action? If not, it needs to be added.

## Risks

- **Guest JWT incompatibility** — If the team proceeds without a registered customer account system, the entire profile save flow has no server-side target. Risk: wasted FE work if BE model changes.
- **Duplicate phone** — If two customers register with the same phone number, the BE must return a clear 409 error. Without this, the mutation success/failure path is undefined.

## Undecided

- Should Zone B avatar tap open a native file picker (camera/gallery) or a custom modal?
- Should the page be accessible to guest (QR) users at all, or only to registered customers?

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
