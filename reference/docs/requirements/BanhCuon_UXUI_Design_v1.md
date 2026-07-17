# 🎨 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## UX/UI Design — Hướng Dẫn Thiết Kế & Quy Trình
> **Version:** v1.0 · Tháng 4/2026
> **Công cụ:** Figma (chính) · draw.io (wireframe thô)

---

## 1. Design System

### 1.1 Color Palette

> **Single source:** `docs/core/MASTER_v1.2.md §2`. Spec này reference — không định nghĩa lại hex.

| Token | Dùng Cho |
|---|---|
| `primary` | CTA button, active nav, link |
| `success` | Order ready, done item, payment confirmed |
| `warning` | Item đang làm (preparing), cảnh báo stock |
| `error` | Form error, reject action |
| `surface-dark` | KDS card background — pending item |
| `neutral` | Text body, border, divider |

### 1.2 Typography

| Vai Trò | Font | Weight | Size |
|---|---|---|---|
| Heading 1 (trang) | Inter | 700 | 24px |
| Heading 2 (section) | Inter | 600 | 18px |
| Body | Inter | 400 | 14px |
| Caption / Label | Inter | 400 | 12px |
| Price / Amount | Inter | 700 | 16px (VND format: `95.000 đ`) |
| KDS Item Name | Inter | 600 | 16px |

### 1.3 Spacing System

| Scale | Value | Dùng Cho |
|---|---|---|
| `xs` | 4px | Khoảng cách nhỏ trong component |
| `sm` | 8px | Padding trong button, tag |
| `md` | 16px | Padding section, card |
| `lg` | 24px | Khoảng cách giữa các section |
| `xl` | 32px | Margin trang |
| `2xl` | 48px | Padding hero section |

### 1.4 Component Library (Tailwind + shadcn/ui)

| Component | Variant | Dùng Ở |
|---|---|---|
| `Button` | primary / secondary / danger / ghost | Toàn hệ thống |
| `Badge` | pending / preparing / done / ready / delivered / cancelled | Order status, item status |
| `Card` | default / elevated | KDS card, product card, order summary |
| `Input` | default / error | Form đặt món, form nhân viên |
| `Modal` | confirmation / info | Xác nhận hủy đơn, xác nhận thanh toán |
| `Toast` | success / error / info | Thông báo realtime, lỗi API |
| `Skeleton` | — | Loading state (thay spinner) |
| `EmptyState` | — | Khi không có đơn, không có món |

---

## 2. Màn Hình & Wireframe

### 2.1 Danh Sách Trang

| Route | Vai Trò | Mô Tả |
|---|---|---|
| `/table/[tableId]` | Guest (Customer) | Menu QR — xem sản phẩm, thêm giỏ |
| `/table/[tableId]/cart` | Guest | Giỏ hàng, xác nhận đặt |
| `/table/[tableId]/order/[orderId]` | Guest | Theo dõi đơn realtime (SSE) |
| `/login` | Staff | Đăng nhập nhân viên |
| `/cashier` | Cashier / Staff | POS — quản lý bàn và đơn |
| `/cashier/orders/[orderId]` | Cashier | Chi tiết đơn, thanh toán |
| `/kitchen` | Chef / Staff | KDS — hiển thị đơn cần làm |
| `/menu` | Manager / Admin | Quản lý sản phẩm, danh mục |
| `/staff` | Manager / Admin | Quản lý nhân viên |
| `/reports` | Manager / Admin | Báo cáo doanh thu |
| `/tables` | Manager / Admin | Quản lý bàn, QR |

### 2.2 Wireframe — Menu QR (`/table/[tableId]`)

```
┌─────────────────────────────────────────┐
│  🍜 Bánh Cuốn Bà Hà              Bàn 05 │  ← Header: tên quán + số bàn
│─────────────────────────────────────────│
│  [Tất cả] [Bánh Cuốn] [Nước] [Combo]   │  ← Category tabs (horizontal scroll)
│─────────────────────────────────────────│
│  ┌──────────┐  ┌──────────┐             │
│  │  [img]   │  │  [img]   │             │  ← Product cards (2 columns)
│  │ BC Thịt  │  │ BC Tôm   │             │
│  │ 35.000 đ │  │ 45.000 đ │             │
│  │   [+]    │  │   [+]    │             │  ← Add button
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │  [img]   │  │  [img]   │             │
│  │ BC Combo │  │  Nước    │             │
│  │ 75.000 đ │  │ 15.000 đ │             │
│  │   [+]    │  │   [+]    │             │
│  └──────────┘  └──────────┘             │
│─────────────────────────────────────────│
│  🛒 Giỏ hàng: 2 món — 80.000 đ  [Xem] │  ← Sticky bottom bar
└─────────────────────────────────────────┘
```

### 2.3 Wireframe — Theo Dõi Đơn (`/table/[tableId]/order/[orderId]`)

```
┌─────────────────────────────────────────┐
│  ← Đơn hàng #BCT-001      [ĐANG LÀM]   │  ← Status badge
│─────────────────────────────────────────│
│  Bàn 05 · 10:32 AM                      │
│─────────────────────────────────────────│
│  Món của bạn:                           │
│  ┌─────────────────────────────────┐    │
│  │ Bánh Cuốn Thịt x2              │    │
│  │ ████████░░░░ Đang làm (1/2)    │    │  ← Progress bar
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Nước Chanh x1                   │    │
│  │ ░░░░░░░░░░░░ Chờ               │    │
│  └─────────────────────────────────┘    │
│─────────────────────────────────────────│
│  Tổng:  80.000 đ                        │
│  [Hủy đơn]          (chỉ hiện khi hợp lệ)│
└─────────────────────────────────────────┘
```

### 2.4 Wireframe — KDS (`/kitchen`)

```
┌─────────────────────────────────────────────────────────┐
│  KDS — BẾP                              10:45 AM        │
│─────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Bàn 03      │  │  Bàn 05      │  │  Bàn 07      │  │
│  │  #BCT-003    │  │  #BCT-001    │  │  #BCT-007    │  │
│  │  10:30 AM    │  │  10:32 AM    │  │  10:41 AM    │  │
│  │──────────────│  │──────────────│  │──────────────│  │
│  │ BC Thịt x2   │  │ BC Thịt x2   │  │ BC Tôm x1    │  │
│  │ [Làm xong]   │  │ [1/2 xong]   │  │ [Chưa làm]   │  │
│  │ Nước C. x1   │  │ Nước C. x1   │  │              │  │
│  │ [Làm xong]   │  │ [Chưa]       │  │              │  │
│  │              │  │              │  │              │  │
│  │     ✅ XONG  │  │  ▶ LÀM TIẾP │  │  ▶ BẮT ĐẦU  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│   (green border)    (yellow border)    (dark bg)        │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Wireframe — POS Cashier (`/cashier`)

```
┌──────────────────────────────────────────────────────────────────┐
│  POS — THU NGÂN                                    10:45 AM      │
├──────────────┬───────────────────────────┬──────────────────────┤
│  DANH SÁCH   │    CHI TIẾT ĐƠN           │   THÊM MÓN           │
│  BÀN         │    Bàn 05 — #BCT-001      │                      │
│  ──────────  │    ─────────────────────  │   [Tất cả] [BC] [N] │
│  Bàn 01 ⬜  │    BC Thịt x2  70.000đ   │                      │
│  Bàn 02 🟡  │    Nước C. x1  15.000đ   │   ┌────┐  ┌────┐    │
│  Bàn 03 ✅  │    ─────────────────────  │   │BC T│  │BC T│    │
│  Bàn 04 ⬜  │    Tổng:       85.000đ   │   │35k │  │45k │    │
│  Bàn 05 🟢  │    ─────────────────────  │   └────┘  └────┘    │
│  Bàn 06 ⬜  │    [Thêm món]             │                      │
│  Bàn 07 🟡  │                           │   ┌────┐  ┌────┐    │
│              │    TRẠNG THÁI: READY      │   │Nước│  │Trà │    │
│              │    ─────────────────────  │   │15k │  │20k │    │
│              │    [💵 Tiền mặt]          │   └────┘  └────┘    │
│              │    [📱 VNPay QR]          │                      │
│              │    [📱 MoMo QR]           │                      │
└──────────────┴───────────────────────────┴──────────────────────┘
```

---

## 3. UX Guidelines

### 3.1 Nguyên Tắc Thiết Kế

| Nguyên Tắc | Áp Dụng |
|---|---|
| **Mobile-first** | Menu QR và order tracking phải hoạt động hoàn hảo trên điện thoại 375px+ |
| **Realtime feedback** | Mọi action phải có phản hồi ngay (skeleton, optimistic update, toast) |
| **Minimal cognitive load** | KDS và POS — thông tin tối thiểu, hành động lớn, dễ thao tác với một tay |
| **Error recovery** | Mỗi lỗi phải có hành động "thử lại" hoặc hướng dẫn tiếp theo |
| **Accessibility** | Contrast ratio ≥ 4.5:1, font size ≥ 14px, touch target ≥ 44px |

### 3.2 States Bắt Buộc Cho Mỗi Màn Hình

| State | Mô Tả |
|---|---|
| **Loading** | Skeleton (không dùng spinner vòng tròn) |
| **Empty** | Minh họa + text hướng dẫn ("Chưa có món — hãy thêm từ menu") |
| **Error** | Mô tả lỗi cụ thể + nút thử lại |
| **Success** | Toast xanh, animation nhẹ |
| **Offline** | Banner "Mất kết nối" — chức năng nào vẫn dùng được |

### 3.3 Responsive Breakpoints

| Breakpoint | Width | Target Device |
|---|---|---|
| Mobile | 375px–767px | Điện thoại khách hàng (menu QR) |
| Tablet | 768px–1023px | iPad cashier / chef (POS, KDS) |
| Desktop | 1024px+ | Màn hình quầy bar, báo cáo |

---

## 4. Quy Trình Design

| Bước | Tên | Output | Người Thực Hiện |
|---|---|---|---|
| 1 | **Wireframe thô** | Bố cục các màn hình chính (không màu, không ảnh) | BA + UX Designer |
| 2 | **UX Review** | Kiểm tra luồng user journey, phát hiện điểm gây nhầm lẫn | UX Designer |
| 3 | **Design System** | Color, typography, spacing, component library | UX/UI Designer |
| 4 | **High-Fidelity Mockup** | Mockup chi tiết từng màn hình với annotation | UI Designer |
| 5 | **Prototype** | Click-through prototype cho stakeholder duyệt | UI Designer |
| 6 | **Handoff** | Figma handoff + exported assets + spacing specs | UI Designer → FE |

### Definition of Done (Handoff)

- [ ] Mọi màn hình có đủ 5 states: default, loading, empty, error, success
- [ ] Annotation giải thích behavior phức tạp (hover, animation, realtime update)
- [ ] Exported assets: SVG icons, PNG images (1x, 2x)
- [ ] Spacing specs được chú thích đầy đủ trong Figma
- [ ] FE Dev đã xác nhận không có điểm mơ hồ trước khi bắt đầu code

---

## 5. Figma File Structure (Đề Xuất)

```
📁 BanhCuon Design System
├── 📄 00_Cover
├── 📄 01_Design Tokens (colors, typography, spacing)
├── 📄 02_Components (Button, Badge, Card, Input...)
├── 📄 03_Icons
├── 📁 Customer (QR Flow)
│   ├── 📄 Menu
│   ├── 📄 Cart
│   └── 📄 Order Tracking
├── 📁 Staff
│   ├── 📄 Login
│   ├── 📄 POS Cashier
│   ├── 📄 KDS Kitchen
│   └── 📄 Staff Management
├── 📁 Admin
│   ├── 📄 Product Management
│   ├── 📄 Table Management
│   └── 📄 Reports
└── 📁 Archive
```

---

> 🍜 BanhCuon System · UX/UI Design v1.0 · Tháng 4/2026
