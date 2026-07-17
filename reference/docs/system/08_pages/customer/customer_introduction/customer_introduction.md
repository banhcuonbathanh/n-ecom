# Customer Introduction — `/introduction`

> **TL;DR:** 🔮 PLANNED (owner decision 2026-06-12) · public (no auth) · Dedicated
> about-the-restaurant page: story, photo gallery, location with embedded map, opening hours,
> contact. Today most of this content lives compressed on `/welcome`; this page expands it.
> Wireframe below is **proposed — owner to confirm**.

---

## ASCII Wireframe (proposed — owner to confirm)

```
┌────────────────────────────────────────────────┐
│ [←] Giới Thiệu             [Xem Thực Đơn]      │ ← top nav (back to /welcome)
├────────────────────────────────────────────────┤
│ HERO PHOTO (full-width restaurant photo)       │
│   Bánh Cuốn Bà Hoa — Từ 1995                   │
├────────────────────────────────────────────────┤
│ Câu Chuyện                                     │
│  long-form story text (multiple paragraphs,    │
│  founder photo inline)                         │
├────────────────────────────────────────────────┤
│ Hình Ảnh — photo gallery                       │
│ ┌─────┐ ┌─────┐ ┌─────┐                        │
│ │ img │ │ img │ │ img │  (swipeable on mobile) │
│ └─────┘ └─────┘ └─────┘                        │
├────────────────────────────────────────────────┤
│ 📍 Vị Trí                                      │
│ ┌────────────────────────────────────────┐     │
│ │        embedded map (Google Maps)      │     │
│ └────────────────────────────────────────┘     │
│  123 Đường Ẩm Thực, Hoàn Kiếm, Hà Nội          │
│  [ Chỉ đường ]                                 │
├────────────────────────────────────────────────┤
│ 🕐 Giờ Mở Cửa          ☎ Liên Hệ               │
│  T2–T6 06:30–21:00      0901 234 567           │
│  T7–CN 06:00–21:30      (Zalo / Facebook)      │
├────────────────────────────────────────────────┤
│ CTA — [ Xem Thực Đơn & Đặt Món ]               │
└────────────────────────────────────────────────┘
```

## Zones (proposed)

| Zone | Component (proposed) | Data source |
|---|---|---|
| Top nav | `CustomerTopNav` (shared, reuse) | — |
| Hero / story / gallery | new `features/introduction/` components | static content (CMS later, optional) |
| Map | embedded iframe or map component | static coordinates |
| Hours / contact | `Card` atoms (reuse) | static config |
| CTA | `Button` atom | → `/menu` |

## Key Interactions (proposed)

- **Xem Thực Đơn** → `/menu`.
- **Chỉ đường** → opens external maps app with restaurant coordinates.
- Gallery images → fullscreen lightbox (optional, phase 2).
- Back arrow → `/welcome`.

## Business Logic Used

- None server-side — static page; no auth, no API calls.
- Entry/exit points within the customer journey → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (navigation map)
- Ordering CTA leads into guest/online session rules → [../02_spec/BUSINESS_RULES.md §5 JWT / Auth Rules](../02_spec/BUSINESS_RULES.md#5-jwt--auth-rules)
