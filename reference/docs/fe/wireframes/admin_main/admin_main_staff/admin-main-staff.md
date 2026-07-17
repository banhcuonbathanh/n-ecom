---
page: admin-main-staff
route: /admin/staff
spec_ref: Spec_7_Staff_Management.md
created: 2026-05-21
---

# Wireframe — Admin Staff Management

## Data Sources

| Zone | Source | Update mechanism |
|---|---|---|
| Stats bar | `GET /admin/staff` (derived count) | TanStack Query, refetch on mutation |
| Staff table | `GET /admin/staff` | TanStack Query, refetch on focus |
| Add/Edit modal | `POST /admin/staff` · `PATCH /admin/staff/:id` | useMutation → invalidate |
| Status toggle | `PATCH /admin/staff/:id/status` | useMutation → invalidate |
| Detail drawer | `GET /admin/staff/:id` + local derived | TanStack Query |

---

## PANEL 1 — Main Page `/admin/staff`  (width 1100px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOP NAV  (bg #1e293b, h=48)                                                │
│  "Quản trị hệ thống"   Tổng quan · Tổng kết · Sản phẩm · Combo · Danh mục  │
│  · Topping · [Nhân viên ←active] · Kho nguyên liệu · Marketing              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ZONE A — PageHeader  (h=52, card)                                          │
│  "Nhân viên (8)"                         [+ Thêm nhân viên] (orange btn)   │
├────────────┬────────────┬────────────┬───────────────────────────────────────┤
│ ZONE B — Stats bar  (h=88, 4 cards side by side)                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────────────────┐│
│ │ Tổng NV  │ │ Đang HĐ  │ │ Vô hiệu  │ │ Theo vai trò                     ││
│ │   8      │ │   6      │ │   2      │ │ Bếp:2 · Thu ngân:2 · NV:3 · QL:1 ││
│ └──────────┘ └──────────┘ └──────────┘ └──────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│  ZONE C — Filter bar  (h=44)                                                │
│  [🔍 Tìm kiếm tên / username...  (input w=400)]  [Vai trò ▾]  [Trạng thái ▾]│
├─────────────────────────────────────────────────────────────────────────────┤
│  ZONE D — Staff Table  (GET /admin/staff)                                   │
│  ┌──────────┬──────────────┬────────┬───────────┬──────────┬────────────┐   │
│  │ Tên đầy đủ  │ Username │ Vai trò│ Ca làm    │ Hiệu suất│ Trạng thái │   │
│  ├──────────┼──────────────┼────────┼───────────┼──────────┼────────────┤   │
│  │ 👤 Nguyễn Văn An  │ chef_an  │ [Bếp]  │ Sáng Chiều│ ████░ 85%│ [Đang HĐ]│ [Chi tiết][Sửa][Xóa]│
│  │ 👤 Trần Thị Lan   │ cashier_lan│[Thu ngân]│ Chiều Tối │ ████░ 72%│ [Đang HĐ]│ [Chi tiết][Sửa][Xóa]│
│  │ 👤 Lê Minh Tuấn   │ staff_tuan│ [NV]  │ Sáng      │ ██░░░ 45%│ [Vô hiệu]│ [Chi tiết][Sửa][Xóa]│
│  │ 👤 Phạm Thị Mai   │ mgr_mai │ [Quản lý]│ S+C+T    │ █████ 91%│ [Đang HĐ]│ [Chi tiết][Sửa]    │
│  └──────────┴──────────────┴────────┴───────────┴──────────┴────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ZONE E — Pagination  (h=44)                                                │
│                           [←]  [1]  [2]  ...  [→]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Column widths (total 1070px)
| Col | x | width | Notes |
|---|---|---|---|
| Avatar | 27 | 44 | circle avatar placeholder |
| Tên đầy đủ | 82 | 160 | bold name |
| Username | 248 | 140 | mono, muted |
| Vai trò | 394 | 96 | role badge (blue) |
| Ca làm | 496 | 130 | shift tags (orange tint) |
| Hiệu suất | 632 | 120 | progress bar + % |
| Trạng thái | 758 | 100 | green/red badge (clickable toggle) |
| Hành động | 864 | 216 | Chi tiết + Sửa + Xóa buttons |

---

## PANEL 2 — Modal A: Thêm / Sửa nhân viên  (x=1160, width=500)

```
┌────────────────────────────────────────┐
│  Modal: Thêm nhân viên                 │
│  ──────────────────────────────────── │
│  [Username ────────] [Mật khẩu ──────] │
│  [Tên đầy đủ ─────────────────────── ] │
│  [Vai trò ──────▾ ] [Vị trí công việc ]│
│  Ca làm việc:                          │
│  [✓ Sáng]  [✓ Chiều]  [  Tối  ]       │
│  Trách nhiệm / mô tả công việc:        │
│  [textarea ─────────────────────────]  │
│  [SĐT ──────────── ] [Email ──────── ] │
│  ─────────────────────────────────── │
│       [Huỷ]          [Tạo tài khoản]  │
└────────────────────────────────────────┘
```

### Fields
| Field | Type | Validation |
|---|---|---|
| username | text | min 3, a-z0-9_- |
| password | password | min 8, 1 upper, 1 digit |
| full_name | text | min 2 |
| role | select | chef/cashier/staff/manager |
| job_title | text | optional — e.g. "Bếp trưởng" |
| shifts | checkbox chips | Sáng / Chiều / Tối (multi) |
| responsibilities | textarea | optional, max 500 |
| phone | text | optional |
| email | email | optional |

---

## PANEL 3 — Modal B: Chi tiết nhân viên  (x=1720, width=600)

```
┌────────────────────────────────────────────────┐
│  [👤 large avatar]  Nguyễn Văn An              │
│                     Bếp · Đang hoạt động ●     │
│  ─────────────────────────────────────────────│
│  [Thông tin] [Hiệu suất] [Lịch làm việc] [Trách nhiệm]  │
│  ─────────────────────────────────────────────│
│  TAB: Thông tin cơ bản (active)                │
│  Username:      chef_an                        │
│  Vai trò:       Bếp                            │
│  Vị trí:        Bếp trưởng                     │
│  Ca làm việc:   [Sáng] [Chiều]                 │
│  SĐT:           0901 234 567                   │
│  Email:         an@banhcuon.vn                 │
│  Ngày tạo:      01/03/2026                     │
│  ─────────────────────────────────────────────│
│  TAB: Hiệu suất (preview, faded)               │
│  Tổng đơn xử lý: 1,240    Đánh giá: ★★★★☆     │
│  Tỷ lệ đúng giờ: 92%      Nghỉ phép: 2 ngày   │
│  [Bar chart placeholder — ngày làm/tháng]      │
│  ─────────────────────────────────────────────│
│  TAB: Lịch làm việc (preview, faded)           │
│  [Mini calendar — week view, T2→T7]            │
│  Ca Sáng 6:00–14:00 · Ca Chiều 14:00–22:00    │
│  ─────────────────────────────────────────────│
│  TAB: Trách nhiệm (preview, faded)             │
│  • Chế biến bánh cuốn theo order từ KDS        │
│  • Kiểm tra chất lượng nguyên liệu             │
│  • Báo cáo tồn kho cuối ca                    │
│  ─────────────────────────────────────────────│
│         [Sửa thông tin]      [Đóng]           │
└────────────────────────────────────────────────┘
```

---

## Components List

| Zone | Component | Notes |
|---|---|---|
| ZoneA | `PageHeader` | shared — title + add CTA |
| ZoneB | `StaffStatsBar` | 4 stat cards, derived from list |
| ZoneC | `StaffFilterBar` | search + role + status dropdowns |
| ZoneD | `StaffTable` | table with performance bar column |
| ZoneE | `Pagination` | shared component |
| ModalA | `AddStaffModal` / `EditStaffModal` | RHF + Zod, new fields: job_title, shifts, responsibilities |
| ModalB | `StaffDetailDrawer` | tabbed: Info / Hiệu suất / Lịch / Trách nhiệm |

## New Fields vs Existing (diff)

| Field | Exists today | New |
|---|---|---|
| username, password, full_name, role, phone, email | ✅ | — |
| job_title | — | ✅ |
| shifts (Sáng/Chiều/Tối) | — | ✅ |
| responsibilities | — | ✅ |
| performance score | — | ✅ (read-only, derived) |
| working_days / schedule | — | ✅ |
