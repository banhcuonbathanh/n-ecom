> Scratchpad: open questions, risks, undecided items for Admin — Marketing.

---

## Open Questions

- [ ] **"+ Nhập chi tiêu" button** — What does it open? The excalidraw shows the button but no modal. Does it open an inline form, a slide-over, or a separate page? This is a full feature gap — cannot be implemented until designed.
- [ ] **Is the Campaign Timeline static or configurable?** The excalidraw shows a fixed 5-week plan for the launch campaign. Should this be editable by the admin? Or is it always a fixed display? If configurable, needs a separate data source and CRUD UI.
- [ ] **What is the API response shape for `GET /api/v1/admin/marketing/spend`?** The endpoint is referenced in the excalidraw but not defined in `docs/contract/API_CONTRACT_v1.2.md`. Needs BE spec before FE implementation.
- [ ] **Budget overrun handling** — Is it valid for a category to be spent > budget? Should the system block it, warn, or just display it? No business rule documented yet.
- [ ] **ROI calculation** — The excalidraw shows "3.2×" and "Dựa trên 2.000 khách/tháng". Is this a backend-computed field or a frontend calculation? What formula is used?
- [ ] **LoveScore data source** — Are `costPerNewCustomer`, `targetFollowers`, and `satisfactionScore` stored in the DB or computed on-the-fly? If the latter, what are the input data sources?
- [ ] **Export format** — "↓ Xuất BC" button — what format does it export? PDF? Excel? CSV? Who defined the report template?
- [ ] **Multi-campaign support** — Is this page always tied to "Khai trương nhà hàng mới" or will there be multiple campaigns? The current design assumes one campaign per view.
- [ ] **Date range default** — Should it default to "current month" or "campaign start to today"? The excalidraw shows 01/05–31/05 but this may be a demo value, not a default.

## Risks

- `BudgetDonutChart` requires a chart library (Recharts). Need to confirm it's already in `package.json` — if not, this adds a dependency decision.
- The Campaign Timeline is hardcoded in the excalidraw. If the owner wants to change milestone dates after launch, it requires a code change. Consider making it data-driven from the start.
- Zone D is a side-by-side layout (table + chart). On tablet/mobile this will break and needs a stacked fallback — not yet designed.
- LoveScore "Điểm hài lòng dự kiến" (4.5/5.0) looks like a made-up number in the wireframe. Need to confirm what real data backs this metric.

## Undecided

- Whether `DateRangePicker` should support preset ranges (e.g. "Tuần này", "Tháng này", "Toàn bộ chiến dịch") or only free-form date selection.
- Whether the page should support printing directly (Ctrl+P) as an alternative to export.
- The "+ Nhập chi tiêu" modal design — full spec needed before FE can build Zone B's primary action.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-26*
