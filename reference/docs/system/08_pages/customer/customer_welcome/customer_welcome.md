# Customer Welcome — `/welcome`

> **TL;DR:** ✅ implemented · public (no auth) · Restaurant-branded landing page: hero, story,
> signature dishes, opening hours + address, and a "Xem Thực Đơn" CTA into `/menu`.
> 🔮 PLANNED additions (owner decision 2026-06-12): show table info when arriving from a QR scan,
> and links to `/introduction` + customer login (online-ordering entry).

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ [👨‍🍳] Bánh Cuốn Bà Hoa        [Xem Thực Đơn]   │ ← Navbar (sticky)
├────────────────────────────────────────────────┤
│              HERO (gradient)                   │
│   ⭐ Quán Bánh Cuốn Truyền Thống Từ 1995       │
│   Hương Vị Bánh Cuốn — Đúng Vị Hà Nội          │
│   [ Đặt Món Ngay ]  [ Tìm Hiểu Thêm ↓ ]        │
├────────────────────────────────────────────────┤
│ #about — Câu Chuyện Của Chúng Tôi              │
│ ┌──────────────────┐ ┌───────────────────┐     │
│ │ story text       │ │ [photo            │     │
│ │ (2 paragraphs)   │ │  placeholder]     │     │
│ └──────────────────┘ └───────────────────┘     │
├────────────────────────────────────────────────┤
│ Món Đặc Trưng — 3 dish cards                   │
│ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │ [img]  │ │ [img]  │ │ [img]  │               │
│ │ Nhân   │ │ Tôm    │ │ Chay   │               │
│ │ Thịt   │ │ Thịt   │ │        │               │
│ └────────┘ └────────┘ └────────┘               │
│        [ Xem Toàn Bộ Thực Đơn → ]              │
├────────────────────────────────────────────────┤
│ Giờ Mở Cửa & Địa Chỉ                           │
│ ┌─🕐 Giờ Mở Cửa───┐ ┌─📍 Địa Chỉ──────┐        │
│ │ T2–T6 06:30–21h │ │ address + phone │        │
│ │ T7–CN 06:00–21h │ │ [map placeholder]│       │
│ └─────────────────┘ └─────────────────┘        │
├────────────────────────────────────────────────┤
│ QR CTA — Sẵn Sàng Đặt Món?                     │
│        [ Xem Thực Đơn & Đặt Món ]              │
├────────────────────────────────────────────────┤
│ Footer — Thực Đơn · Chính Sách · Điều Khoản    │
└────────────────────────────────────────────────┘
```

🔮 PLANNED (proposed — owner to confirm): a banner under the navbar showing "Bạn đang ở Bàn N"
when arriving from `/table/:token`, plus navbar links to `/introduction` and customer login.

## Zones

| Zone | Component | Data source |
|---|---|---|
| All sections | inline JSX in `app/welcome/page.tsx` | static arrays (`dishes`, `hours`) in file |
| Atoms used | `Button`, `Badge`, `Card` (`components/ui/`) | — |
| Photo / map blocks | placeholders (real assets pending) | — |

## Key Interactions

- **Xem Thực Đơn / Đặt Món Ngay / Xem Toàn Bộ Thực Đơn** → `/menu`.
- **Tìm Hiểu Thêm** → scrolls to `#about`.
- Footer → `/menu`, `/privacy-policy`, `/terms`.
- 🔮 PLANNED: navbar link → `/introduction`; customer login entry (order from home).

## Business Logic Used

- Page is fully static — no API calls; ordering requires a guest/customer session →
  [../02_spec/BUSINESS_RULES.md §5 JWT / Auth Rules](../02_spec/BUSINESS_RULES.md#5-jwt--auth-rules)
- 🔮 Online-ordering entry rules → [../02_spec/BUSINESS_RULES.md §1 RBAC](../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
- FE session/cart bootstrap → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (guest session, cart store)
