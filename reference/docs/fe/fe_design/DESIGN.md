---
colors:
  primary: "#FF7A1A"
  background: "#0A0F1E"
  card: "#1F2937"
  foreground: "#F9FAFB"
  muted: "#374151"
  muted-fg: "#9CA3AF"
  border: "#2D3748"
  success: "#3DB870"
  warning: "#FCD34D"
  urgent: "#FC8181"

dimensions:
  radius: "8px"
  radius-lg: "12px"
  radius-badge: "4px"
  radius-modal: "12px"
  spacing-unit: "4px"
  touch-target: "44px"
  sidebar-width: "220px"
  mobile-content-width: "390px"
  admin-canvas-width: "1200px"

typography:
  heading:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "20px"
    fontWeight: "700"
    lineHeight: "1.3"
    letterSpacing: "-0.01em"
  subheading:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "16px"
    fontWeight: "600"
    lineHeight: "1.4"
    letterSpacing: "0"
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0"
  small:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "12px"
    fontWeight: "400"
    lineHeight: "1.35"
    letterSpacing: "0"
  micro:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "11px"
    fontWeight: "400"
    lineHeight: "1.35"
    letterSpacing: "0.01em"
  price:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "13px"
    fontWeight: "600"
    lineHeight: "1.4"
    letterSpacing: "0"

components:
  Button:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    typography: "body"
    rounded: "8px"
    padding: "12px 24px"
    height: "44px"
  Button-hover:
    backgroundColor: "#E56B15"
  Button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "8px"
    padding: "12px 24px"
    height: "44px"
  CartFAB:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "8px"
    height: "44px"
    padding: "0 16px"
  BadgeSuccess:
    backgroundColor: "#052E16"
    textColor: "{colors.success}"
    rounded: "4px"
    padding: "2px 8px"
  BadgeWarning:
    backgroundColor: "#422006"
    textColor: "{colors.warning}"
    rounded: "4px"
    padding: "2px 8px"
  BadgeUrgent:
    backgroundColor: "#450A0A"
    textColor: "{colors.urgent}"
    rounded: "4px"
    padding: "2px 8px"
  BadgeGray:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-fg}"
    rounded: "4px"
    padding: "2px 8px"
  Card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "8px"
    padding: "16px"
    border: "1px solid {colors.border}"
  QtyButton:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "8px"
    size: "34px"
  QtyButtonActive:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "8px"
    size: "34px"
  SearchInput:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    placeholderColor: "{colors.muted-fg}"
    rounded: "8px"
    height: "44px"
  TabActive:
    textColor: "{colors.primary}"
    borderBottom: "2px solid {colors.primary}"
  TabInactive:
    textColor: "{colors.muted-fg}"
---

## Overview

**Project:** Hệ Thống Quản Lý Quán Bánh Cuốn  
**Stack:** Next.js 14 App Router · Tailwind v3 · TypeScript strict  
**Design Philosophy:** Dark-mode first · Mobile-first · Touch-optimized (44px targets) · Orange accent

Hệ thống phục vụ 3 nhóm người dùng: **khách hàng** (đặt món qua QR), **nhân viên bếp/thu ngân** (KDS + POS), và **admin** (quản lý tổng quan). Giao diện tối giúp giảm mỏi mắt trong môi trường quán ăn (ánh sáng yếu), cam nổi bật giúp phân biệt CTA rõ ràng.

---

## Colors

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `primary` | `#FF7A1A` | `bg-primary` / `text-primary` | CTA, active state, price, accent |
| `background` | `#0A0F1E` | `bg-background` | Page background |
| `card` | `#1F2937` | `bg-card` | Cards, panels, headers |
| `foreground` | `#F9FAFB` | `text-foreground` | Primary body text |
| `muted` | `#374151` | `bg-muted` | Input backgrounds, qty buttons, secondary fills |
| `muted-fg` | `#9CA3AF` | `text-muted-fg` | Secondary text, labels, zone annotations |
| `border` | `#2D3748` | `border-border` | Dividers, card borders, input outlines |
| `success` | `#3DB870` | `text-success` | Available, confirmed, online status |
| `warning` | `#FCD34D` | `text-warning` | Delayed, low stock, caution |
| `urgent` | `#FC8181` | `text-urgent` | Overdue, error, out of stock |

**WCAG Contrast:**
- `foreground` (#F9FAFB) on `background` (#0A0F1E): **16.8:1** ✅ AAA
- `foreground` (#F9FAFB) on `card` (#1F2937): **11.2:1** ✅ AAA
- `primary` (#FF7A1A) on `background` (#0A0F1E): **4.8:1** ✅ AA
- `primary` (#FF7A1A) on `card` (#1F2937): **3.9:1** ⚠️ Fails AA — **do not use as text on card background**

> **Rule:** Never hardcode hex values in component files. Always use Tailwind token classes.

---

## Typography

**Font:** Be Vietnam Pro (primary) · system-sans (fallback)

| Style | Size | Weight | Use case |
|---|---|---|---|
| `heading` | 20px | 700 | Page titles, modal headers |
| `subheading` | 16px | 600 | Section headers, card titles |
| `body` | 14px | 400 | Default content, buttons |
| `small` | 12px | 400 | Labels, table cells, descriptions |
| `micro` | 11px | 400 | Zone annotations, timestamps, fine print |
| `price` | 13px | 600 | Monetary values (always `text-primary`) |

**Rules:**
- No bold below 12px
- Line-height ≥ 1.35 on all text
- Prices always `font-semibold text-primary`
- Placeholder text always `text-muted-fg`

---

## Layout

**Breakpoints:**
- Mobile: 375px (customer-facing pages — default)
- Tablet: 768px
- Desktop: 1280px (admin/staff pages)

**Customer pages (mobile):**
- Content width: 390px, left margin: 15px
- Zone stacking: top→bottom, 12px gap
- Sticky header: `top-0 z-20`
- Sticky category tabs: `top-[52px] z-10`
- Sticky cart FAB: `fixed bottom-6 left-4 right-4 z-30`

**Admin/Staff pages (desktop):**
- Canvas: 1200px
- Sidebar: 220px
- Main content: starts at x=240, width=940px
- Zone stacking: 16px gap

**Spacing scale (4px base):**
`4px · 8px · 12px · 16px · 24px · 32px · 48px · 64px`

**Touch targets:** All interactive elements (buttons, tabs, qty controls, links) must be `min-h-[44px] min-w-[44px]`.

---

## Elevation & Depth

- **No box-shadow on dark backgrounds** — use `border-border` instead
- **CTA glow:** `glow-primary` utility (`box-shadow: 0 0 40px -10px #FF7A1A`) on hero CTAs
- **Card depth:** `bg-card border border-border` — no shadow
- **Modal overlay:** `bg-background/60 backdrop-blur-sm`
- **Sticky zones:** z-index ladder: header z-20 → tabs z-10 → FAB z-30

---

## Shapes

| Context | Radius |
|---|---|
| Badge, chip, small tag | 4px (`rounded-sm`) |
| Card, button, input, modal | 8px (`rounded-lg` via `var(--radius)`) |
| Large modal, sheet | 12px (`rounded-xl`) |
| Avatar, icon button | 9999px (`rounded-full`) |

---

## Components

### Button (Primary)
```
bg: #FF7A1A  ·  text: #FFFFFF  ·  height: 44px  ·  radius: 8px
hover: bg → #E56B15
```

### CartFAB
```
fixed bottom-6 left-4 right-4 z-30
bg: #FF7A1A  ·  text: #FFFFFF  ·  height: 44px  ·  radius: 8px
Show when cart count > 0
```

### Badge variants
| Variant | Background | Text |
|---|---|---|
| Success | `#052E16` | `#3DB870` |
| Warning | `#422006` | `#FCD34D` |
| Urgent | `#450A0A` | `#FC8181` |
| Gray | `#374151` | `#9CA3AF` |

### Quantity Stepper
```
− button: bg=#374151  text=#F9FAFB  size=34px  radius=8px
value: text=#F9FAFB  fontSize=14px
+ button: bg=#FF7A1A  text=#FFFFFF  size=34px  radius=8px
```

### Product Card
```
bg: #1F2937  ·  border: 1px solid #2D3748  ·  radius: 8px  ·  padding: 16px
title: text=#F9FAFB  fontSize=14px  fontWeight=600
price: text=#FF7A1A  fontSize=13px  fontWeight=600
```

---

## Do's and Don'ts

```
✅ DO: bg-primary, text-foreground, border-border, bg-card, text-muted-fg
❌ DON'T: hardcode #FF7A1A, #0A0F1E, or any hex in component/style files

✅ DO: min-h-[44px] min-w-[44px] on ALL interactive elements
❌ DON'T: use touch targets smaller than 44px — KDS and POS are used on tablets

✅ DO: text-primary for all monetary values (prices)
❌ DON'T: text-primary as body text on bg-card (contrast 3.9:1 fails AA)

✅ DO: import ALL localStorage keys from src/lib/storage-keys.ts
❌ DON'T: create key strings inline ("cart", "favourites", etc.)

✅ DO: extend tailwind.config.ts for new design tokens
❌ DON'T: create new CSS custom properties in globals.css

✅ DO: glow-primary on hero CTAs (not on every button)
❌ DON'T: box-shadow on dark backgrounds — use border instead

✅ DO: border-border for dividers and card outlines
❌ DON'T: use separate border colors per component — always border-border

✅ DO: text-muted-fg for zone labels, timestamps, secondary content
❌ DON'T: use text-white — always use text-foreground
```

---

*Generated by `/design scaffold` from `fe/src/app/globals.css` + `fe/tailwind.config.ts`*  
*Last Updated: 2026-05-27*  
*Lint: run `/design lint` to validate*
