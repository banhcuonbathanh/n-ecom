# Design System

> **TL;DR** — Dark-mode first, mobile-first, orange accent. ALL color values come from CSS
> custom properties mapped to Tailwind token names. Never hardcode hex in a component.
> Every new page reuses the shared-component catalog below — no one-off styles.
> Source of truth: `fe/src/app/globals.css` + `fe/tailwind.config.ts` — this file is the in-handbook design spec derived from them.

---

## Design Philosophy

- **Dark-mode only** — reduces eye strain in low-light restaurant environments
- **Mobile-first** — customer pages target 375–390px width; staff/admin target 1280px desktop
- **Touch-optimized** — ALL interactive elements must be `min-h-[44px] min-w-[44px]`
- **Orange accent** — `#FF7A1A` primary color for CTAs, prices, active states

---

## Color Tokens

Defined as CSS variables in `globals.css`, aliased in `tailwind.config.ts`. Use Tailwind class names — never hex.

| Token | Hex | Tailwind class | Use case |
|---|---|---|---|
| `primary` | `#FF7A1A` | `bg-primary` / `text-primary` / `border-primary` | CTA, active state, prices, accent |
| `background` | `#000000` | `bg-background` | Page background |
| `card` | `#1F2937` | `bg-card` | Cards, modals, panels, headers |
| `foreground` | `#F9FAFB` | `text-foreground` | Primary body text |
| `muted` | `#374151` | `bg-muted` | Input backgrounds, qty buttons, secondary fills, disabled |
| `muted-fg` | `#9CA3AF` | `text-muted-fg` | Secondary text, labels, placeholders |
| `border` | `#2D3748` | `border-border` | Dividers, card borders, input outlines |
| `success` | `#3DB870` | `text-success` / `bg-success` | Available, confirmed, done status |
| `warning` | `#FCD34D` | `text-warning` / `bg-warning` | Delayed, preparing, low stock |
| `urgent` | `#FC8181` | `text-urgent` / `bg-urgent` | Overdue, error, cancelled, out of stock |

**WCAG contrast notes:**
- `foreground` on `background`: 16.8:1 (AAA)
- `primary` on `background`: 4.8:1 (AA pass)
- `primary` on `card`: 3.9:1 — FAILS AA. Do NOT use `text-primary` on `bg-card` backgrounds.

**Wrong vs. Right:**
```tsx
// WRONG
<div className="bg-[#FF7A1A] text-[#9CA3AF]" />
<div className="bg-orange-500 text-gray-400" />

// CORRECT
<div className="bg-primary text-muted-fg" />
```

---

## Typography

| Style | Size | Weight | Use case |
|---|---|---|---|
| heading | 20px | 700 | Page titles, modal headers |
| subheading | 16px | 600 | Section headers, card titles |
| body | 14px | 400 | Default content, buttons |
| small | 12px | 400 | Labels, table cells, descriptions |
| micro | 11px | 400 | Timestamps, annotations, fine print |
| price | 13px | 600 | Monetary values — always `text-primary` |

**Font families** (configured in `tailwind.config.ts`):
- `font-body` → Be Vietnam Pro (default body)
- `font-display` → Playfair Display (headings and logo — rarely used in components)

**Rules:**
- Prices: always `font-semibold text-primary`, formatted with `formatVND()` from `lib/utils.ts`
- Placeholder text: always `text-muted-fg`
- No bold below 12px

---

## Spacing

Base unit: 4px. Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` px.

Translated to Tailwind: `p-1 · p-2 · p-3 · p-4 · p-6 · p-8 · p-12 · p-16`.

---

## Border Radius

| Context | Radius | Tailwind |
|---|---|---|
| Badge, chip, small tag | 4px | `rounded-sm` |
| Card, button, input | 8px | `rounded-lg` (via `var(--radius)`) |
| Large modal, sheet | 12px | `rounded-xl` |
| Avatar, icon button | 9999px | `rounded-full` |

---

## Layout Shells

### Customer (mobile-first)
```
Content width: 390px, margin: 15px sides
Sticky header: top-0 z-20   (height: 56px h-14)
Sticky category tabs: top-[52px] z-10
Fixed cart FAB: fixed bottom-6 left-4 right-4 z-30
Bottom nav bar: fixed bottom-0 z-20 + pb-safe
```

### Staff / Admin (desktop)
```
Canvas: 1200px max-w
Sidebar: 220px (when present)
Main content: starts at x=240, width ≈ 940px
Zone gap: 16px
```

---

## Component Catalog (reuse, do not recreate)

### Atoms — `fe/src/components/ui/`
| Component | Usage |
|---|---|
| `<Button>` | Primary / secondary / ghost variants. 44px height. |
| `<Card>` | `bg-card border-border rounded-lg` wrapper with CardHeader/Content/Footer |
| `<Input>` | Styled form input with `bg-muted` fill |
| `<Label>` | Form label |
| `<Badge>` | Generic pill badge |
| `<ProgressBar>` | Horizontal fill bar — used for order progress |

### Shared — `fe/src/components/shared/`
| Component | When to use |
|---|---|
| `<StatusBadge status={...}>` | ALL order status displays — pending/confirmed/preparing/ready/delivered/cancelled/paid |
| `<EmptyState message={...}>` | Every empty list or error state |
| `<ConnectionErrorBanner>` | After 3+ SSE/WS failures |
| `<QuantityStepper value onChange>` | All +/− quantity controls (44px touch target built in) |
| `<KPICard label value badge>` | Admin dashboard metric cards |
| `<Pagination currentPage totalPages onPageChange>` | All paginated admin tables |
| `<CustomerTopNav title onBack>` | Client-area page headers with back button |
| `<ClientBottomNav>` | Client-area tab bar |
| `<DateRangePicker>` | Admin analytics date filters |
| `<TableLayoutMap>` | Floor plan grid (admin overview) |

---

## Elevation & Effects

- **No box-shadow on dark backgrounds** — use `border-border` for depth instead.
- **CTA glow:** `glow-primary` utility on hero CTAs only (`box-shadow: 0 0 40px -10px var(--color-primary)`).
- **Modal overlay:** `bg-background/60 backdrop-blur-sm`.
- **Z-index ladder:** header `z-20` → tabs `z-10` → FAB/modals `z-30` → SSE banner `z-50`.

---

## Do's and Don'ts

```
DO:  bg-primary, text-foreground, border-border, bg-card, text-muted-fg
DON'T: hardcode any hex value in component files

DO:  min-h-[44px] min-w-[44px] on ALL interactive elements
DON'T: use touch targets smaller than 44px

DO:  text-primary for all prices (font-semibold text-primary)
DON'T: text-primary as body text on bg-card (contrast fails AA)

DO:  import all localStorage keys from src/lib/storage-keys.ts
DON'T: create key strings inline in components

DO:  extend tailwind.config.ts for new design tokens
DON'T: add new CSS custom properties directly in globals.css

DO:  glow-primary on hero CTAs only
DON'T: box-shadow on dark backgrounds — use border instead

DO:  text-muted-fg for zone labels, timestamps, secondary content
DON'T: text-white — always text-foreground
```

---

## Adding New Design Tokens

1. Add CSS variable to `globals.css` `:root` block.
2. Add Tailwind alias to `tailwind.config.ts` `theme.extend.colors`.
3. Document the new token in this file (token tables above).
4. Run `docker compose up -d --build fe` — Tailwind JIT purges unused classes at build time.

---

## Deep Dive Sources

- `fe/src/app/globals.css` — CSS custom properties (single source of hex values)
- `fe/tailwind.config.ts` — token name → CSS variable mapping
- This file is the in-handbook design spec (components + dimensions + token map), derived from the two files above
