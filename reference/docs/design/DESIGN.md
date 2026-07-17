---
colors:
  primary: "#FF7A1A"
  background: "#000000"
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
  spacing-unit: "4px"
  touch-target: "44px"

typography:
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0"
  heading:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "20px"
    fontWeight: "700"
    lineHeight: "1.3"
    letterSpacing: "-0.01em"
  small:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "12px"
    fontWeight: "400"
    lineHeight: "1.35"
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
  BadgeSuccess:
    backgroundColor: "{colors.card}"
    textColor: "{colors.success}"
    rounded: "4px"
    padding: "2px 8px"
  BadgeWarning:
    backgroundColor: "{colors.card}"
    textColor: "{colors.warning}"
    rounded: "4px"
    padding: "2px 8px"
  BadgeUrgent:
    backgroundColor: "{colors.card}"
    textColor: "{colors.urgent}"
    rounded: "4px"
    padding: "2px 8px"
  Card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "8px"
    padding: "16px"
---

# DESIGN.md — Hệ Thống Quản Lý Quán Bánh Cuốn

> Single source of truth for visual design. Every page — customer, KDS, POS, admin — follows this spec.
> Token values live in the YAML front matter above; code reads them via `fe/src/app/globals.css` → `fe/tailwind.config.ts`.
> **Rule: never hardcode a hex value in a component. Use the Tailwind class.**

## Overview

- **Project:** Hệ Thống Quản Lý Quán Bánh Cuốn — QR ordering + POS + kitchen display.
- **Stack:** Next.js 14 App Router · Tailwind v3 · TypeScript strict.
- **Philosophy:**
  - **Dark-mode first** — nền đen tuyệt đối (`#000000`), text sáng, card xám đậm. Không có light theme.
  - **Mobile-first** — khách quét QR bằng điện thoại; customer pages thiết kế cho 390px.
  - **Touch-optimized** — mọi element tương tác tối thiểu 44×44px (khách vừa ăn vừa bấm).
  - **Orange accent** — cam `#FF7A1A` là màu thương hiệu duy nhất; dùng tiết chế cho CTA, selection, và giá tiền.

## Colors

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `primary` | `#FF7A1A` | `bg-primary` / `text-primary` / `border-primary` | CTA buttons, selected state, giá tiền, brand accent |
| `background` | `#000000` | `bg-background` | Page background (body default) |
| `card` | `#1F2937` | `bg-card` | Card, modal, sheet, input backgrounds |
| `foreground` | `#F9FAFB` | `text-foreground` | Primary text on any dark surface |
| `muted` | `#374151` | `bg-muted` | Disabled fills, skeleton loaders, dividers-as-fill |
| `muted-fg` | `#9CA3AF` | `text-muted-fg` | Secondary text: timestamps, hints, captions |
| `border` | `#2D3748` | `border-border` (default via `*` rule) | All borders — globals.css sets this as the universal default |
| `success` | `#3DB870` | `text-success` / `bg-success` | Paid, completed, confirmed states |
| `warning` | `#FCD34D` | `text-warning` / `bg-warning` | Pending, KDS mid-urgency |
| `urgent` | `#FC8181` | `text-urgent` / `bg-urgent` | Cancel, errors, KDS high-urgency |
| `ring` | = primary | `ring-ring` | Focus rings (alias of primary in tailwind.config.ts) |

**Rules:**
- ❌ **Never hardcode hex** in `fe/src/**` — always the Tailwind class. The `#FF7A1A` string appears in exactly two files: `globals.css` and this spec.
- ❌ Never use `text-white` / `bg-black` / `text-gray-400` — use the role tokens (`text-foreground`, `bg-background`, `text-muted-fg`) so a future palette change is a one-line edit.
- Status colors (`success` / `warning` / `urgent`) map 1-1 to order/KDS states — see `docs/core/MASTER_v1.2.md §2` for the KDS urgency logic.

**WCAG contrast (computed against current values):**

| Pair | Ratio | Verdict |
|---|---|---|
| `foreground` on `background` | ≈ 20.1:1 | ✅ AAA |
| `foreground` on `card` | ≈ 11.0:1 | ✅ AAA |
| `primary` on `background` | ≈ 8.0:1 | ✅ AA (any size) |
| `primary` on `card` | ≈ 4.4:1 | ⚠️ **fails AA for normal text** — use primary on card only for borders, icons, or ≥18px bold text |
| `muted-fg` on `card` | ≈ 4.5:1 | ✅ AA (borderline — don't use below 12px) |
| white `#FFFFFF` on `primary` | ≈ 2.5:1 | ⚠️ fails AA for normal text — acceptable only on Button (14px+ semibold, large hit area); prefer bold label |

## Typography

- **Font:** Be Vietnam Pro (primary), `sans-serif` fallback. Set on `body` in globals.css.
- ⚠️ **Known drift:** `tailwind.config.ts` declares `font-display`/`font-body` from `--font-display`/`--font-body` CSS variables that are **never defined** — those classes silently fall back to serif/sans-serif. Until fixed, don't use `font-display`/`font-body`; the body rule already applies Be Vietnam Pro everywhere.

**Scale:**

| Style | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `heading` | 20px (`text-xl`) | 700 | 1.3 | Page/section titles |
| `body` | 14px (`text-sm`) | 400 | 1.5 | Default text, buttons, inputs |
| `small` | 12px (`text-xs`) | 400 | 1.35 | Badges, captions, timestamps |
| micro | 10px (`text-[10px]`) | 400 | 1.35 | Chỉ dùng cho chip đếm số — tránh nếu được |

**Rules:**
- No bold below 12px — Be Vietnam Pro bold ở cỡ nhỏ bị dính nét trên màn hình mobile.
- Line-height ≥ 1.35 everywhere (tiếng Việt có dấu cần khoảng thở dọc).
- Giá tiền: always through `formatVND()` from `src/lib/utils.ts`, styled `text-primary font-semibold`.

## Layout

- **Breakpoints:** mobile 375px (design target 390px) · tablet 768px (`md:`) · desktop 1280px (`xl:`).
- **Spacing unit:** 4px base — only use multiples: 4, 8, 12, 16, 24, 32 (Tailwind `p-1/2/3/4/6/8`). No arbitrary values like `p-[13px]`.
- **Touch target:** min **44×44px** on every interactive element — `min-h-[44px]` on buttons, list rows, tab items. Icon-only buttons get padding to reach 44px.
- **Customer pages** (`(shop)/`): content width 390px, centered; fixed bottom bars use `.pb-safe` for the iOS home indicator.
- **Admin pages** (`(dashboard)/admin/`): 1200px canvas, 220px fixed sidebar.
- **KDS:** full-width grid, cards sized for glance-reading from 1–2m distance.

## Elevation & Depth

Dark background makes shadows invisible — depth comes from **surface color + border**, not box-shadow.

- ❌ No `shadow-*` utilities on dark surfaces.
- Card depth: `bg-card border border-border` (the `*` rule already defaults border color).
- Layering: `background` (page) → `card` (surface) → `muted` (inset/disabled fill).
- **CTA emphasis:** `.glow-primary` utility (`box-shadow: 0 0 40px -10px primary`) — the one sanctioned "shadow", reserved for the primary CTA per screen (max 1).
- **Hero flourish:** `.gradient-hero` — radial orange glow at top of landing/menu header only.
- **Attention animations** (use sparingly, all respect `prefers-reduced-motion`):
  - `.running-border` — comet light around the selected filling pill
  - `animate-soft-hint` — breathing scale on the suggested selection
  - `animate-canh-shake` — validation shake
  - `animate-slide-down` — new-order banner entrance

## Shapes

| Radius | Value | Tailwind | Usage |
|---|---|---|---|
| sm | 4px | `rounded-sm` | Badges, chips |
| DEFAULT/lg | 8px | `rounded-lg` | Buttons, cards, inputs (`--radius` base) |
| xl | 12px | `rounded-xl` | Modals, bottom sheets |
| full | 9999px | `rounded-full` | Avatars, pills, count chips |

Note: the Tailwind radius scale is derived from `--radius` (`lg` = var, `md` = −2px, `sm` = −4px, `xl` = +4px, `2xl` = +8px) — change `--radius` once and everything shifts together.

## Components

Atoms live in `src/components/ui/` — **use them; don't restyle raw elements per page.**

### Button
- Base: `bg-primary text-white rounded-lg px-6 py-3 min-h-[44px] text-sm font-semibold`
- Hover: darken to `#E56B15` (via `hover:brightness-95` or a `primary-hover` token if added)
- Disabled: `bg-muted text-muted-fg cursor-not-allowed`
- Secondary variant: `bg-card border border-border text-foreground`
- Destructive variant: `border border-urgent text-urgent bg-transparent` (outline style — solid red fill chỉ dành cho confirm cuối)
- Max **one** primary (orange) button per screen region; everything else is secondary.

### Badge (StatusBadge in `components/shared/`)
- Shape: `rounded-sm px-2 py-0.5 text-xs`
- Variants: `text-success` · `text-warning` · `text-urgent` · `text-muted-fg` (neutral), each on `bg-card` or a 10%-alpha tint of its color.
- Badge text maps to order status — mapping lives in `StatusBadge`, not per page.

### Card
- `bg-card border border-border rounded-lg p-4 text-foreground`
- Interactive cards (product, table) add `active:scale-[0.98] transition` for touch feedback; selected state = `border-primary`.

### Input
- `bg-card border border-border rounded-lg min-h-[44px] px-4 text-sm text-foreground placeholder:text-muted-fg`
- Focus: `focus:ring-2 ring-ring` (orange ring), never a bare blue outline.
- Error: `border-urgent` + helper text `text-urgent text-xs`.

## Do's and Don'ts

```
✅ DO:  use bg-primary, text-foreground, border-border, text-muted-fg
❌ DON'T: hardcode #FF7A1A or ANY hex in fe/src component files

✅ DO:  min-h-[44px] on all buttons and interactive elements
❌ DON'T: ship icon buttons smaller than 44×44px touch area

✅ DO:  text-foreground for text; text-white only inside bg-primary buttons
❌ DON'T: use text-white / text-gray-* as general text colors

✅ DO:  bg-card + border-border for elevation on dark surfaces
❌ DON'T: use shadow-* utilities (invisible on black) — glow-primary is the only exception, max 1 per screen

✅ DO:  extend tailwind.config.ts when a new token is needed (and add it here first)
❌ DON'T: create ad-hoc CSS variables or inline styles in components

✅ DO:  reuse atoms from src/components/ui/ (Button, Input, Card, Badge)
❌ DON'T: restyle raw <button>/<input> per page

✅ DO:  formatVND() for every price · storage keys from src/lib/storage-keys.ts
❌ DON'T: hand-format currency or hardcode localStorage key strings
```

---

*Maintained via `/design` skill: `scaffold` (regenerate) · `lint` (validate refs + WCAG) · `export` (emit tailwind/css) · `diff` (compare versions). When tokens change: edit globals.css → re-run `/design scaffold` → `/design lint`.*
