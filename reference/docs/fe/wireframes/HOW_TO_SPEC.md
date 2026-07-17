# How to Write a Spec + Wireframe

> Use this guide every time you design a new page or feature.
> Finish steps in order — each step feeds the next.

## The 7 Steps at a Glance

```
 Step 1          Step 2          Step 3          Step 4
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
│  NAME    │ →  │  DATA    │ →  │  ZONES   │ →  │  ✏ DRAW      │
│ feature  │    │ sources  │    │ breakdown│    │  wireframe   │
│ + route  │    │ table    │    │ table    │    │  (ASCII)     │
└──────────┘    └──────────┘    └──────────┘    └──────────────┘

 Step 5          Step 6          Step 7
┌──────────┐    ┌──────────┐    ┌──────────┐
│ COMPONENT│ →  │    AC    │ →  │  TASKS   │
│   map    │    │  list    │    │  rows    │
│ reuse?   │    │ testable │    │ → TASKS  │
└──────────┘    └──────────┘    └──────────┘
```

> **Step 4 (Draw) is the most important step.**
> No drawing = no shared understanding = implementation drift.
> Always draw before writing AC or task rows.

---

## Step 1 — Name the Feature

Write one sentence: **What does this page do for the user?**

```
Product Detail Page — lets a customer view full product info,
pick toppings, set quantity, and add to cart.
```

Then pin:
- **Route:** `/menu/product/[id]`
- **Who sees it:** customer (guest JWT)
- **Entry point:** tap product image/name in `ProductCard`
- **Exit points:** "Add to cart" → stays on page (toast) · Back → `/menu`

---

## Step 2 — Identify Data Sources

Before drawing anything, answer: *where does each piece of data come from?*

| Data | Source | How it updates |
|---|---|---|
| Product (name, price, image, desc) | `GET /api/v1/products/:id` | TanStack Query, once on mount |
| Toppings for this product | `GET /api/v1/products/:id` (included) | same query |
| Combo membership | `GET /api/v1/products/:id` (included) | same query |
| Cart state | Zustand `cartStore` | in-memory, instant |
| Selected toppings | local `useState` | component-local |
| Quantity | local `useState` (default 1) | component-local |

**Rule:** if data comes from an API, it needs a loading state + error state in your wireframe.

---

## Step 3 — Break Into Zones

Divide the screen into named zones top → bottom.
Every zone has: a **name**, a **data source**, and **interactions**.

| Zone | Name | Data | Interaction |
|---|---|---|---|
| A | Header | — | ← back, cart icon badge |
| B | Hero | product image, name, price, status | display only |
| C | Description | product.description | display only |
| D | Combo Badge | product.combo (optional) | tap → navigate |
| E | Toppings Selector | product.toppings | checkbox toggle |
| F | Quantity Stepper | local state | +/- buttons |
| G | CTA Footer | computed total | tap → addItem → toast |

---

## Step 4 — Draw the Wireframe (ASCII)

Rules for good ASCII wireframes:
- Use `┌ ┐ └ ┘ ├ ┤ ─ │` for box borders
- Label every zone with `[Zone X — Name]`
- Show real-ish content (not "Lorem ipsum") — use the actual field names
- Mark computed values with `=` e.g. `total = price + toppings × qty`
- Mark conditional zones with `(if ...)`
- Show states: loading skeleton, empty, error

```
MOBILE — 390 px wide
┌─────────────────────────────────────────┐
│ [Zone A — Header]                        │
│  ←  Chi tiết món                  🛒 2  │
│     (back → /menu)          (cart badge) │
├─────────────────────────────────────────┤
│ [Zone B — Hero]                          │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │          product.image_path         │ │  ← 16:9, object-cover
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                          │
│  Bánh Cuốn Nhân Tôm              [Có sẵn]│  ← name + StatusBadge
│  45.000 ₫                                │  ← formatVND(price), orange
│                                          │
├─────────────────────────────────────────┤
│ [Zone C — Description]                   │
│  Bánh cuốn tươi với nhân tôm thịt,       │
│  nước chấm đặc biệt của quán.            │
│                                          │
├─────────────────────────────────────────┤
│ [Zone D — Combo Badge]  (if in combo)    │
│  🍱 Có trong:  Combo Đặc Biệt  →        │  ← tap navigates to combo
│                                          │
├─────────────────────────────────────────┤
│ [Zone E — Toppings Selector]             │
│  Chọn topping  (tuỳ chọn)               │
│                                          │
│  ☐  Hành phi                  +3.000 ₫  │
│  ☐  Chả lụa                   +8.000 ₫  │
│  ☐  Trứng hấp                +10.000 ₫  │
│  ☑  Tôm khô                  +12.000 ₫  │  ← checked = selected
│                                          │
│  (empty state: "Món này không có topping")│
│                                          │
├─────────────────────────────────────────┤
│ [Zone F — Quantity Stepper]              │
│  Số lượng                                │
│                                          │
│          ┌───┐       ┌───┐              │
│          │ − │   2   │ + │              │  ← min=1, no max
│          └───┘       └───┘              │
│                                          │
├─────────────────────────────────────────┤
│ [Zone G — CTA Footer]  (sticky bottom)   │
│ ┌───────────────────────────────────────┐│
│ │   Thêm vào giỏ         69.000 ₫      ││  ← total = price + Σtoppings × qty
│ └───────────────────────────────────────┘│  ← disabled if !is_available
└─────────────────────────────────────────┘

LOADING STATE (skeleton):
┌─────────────────────────────────────────┐
│ ←  Chi tiết món                   🛒   │
├─────────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← image skeleton
│ ░░░░░░░░░░░░░░░░░░░░░░                 │  ← name skeleton
│ ░░░░░░░░░                              │  ← price skeleton
└─────────────────────────────────────────┘

ERROR STATE:
┌─────────────────────────────────────────┐
│ ←  Chi tiết món                   🛒   │
├─────────────────────────────────────────┤
│                                          │
│   ⚠  Không tải được món này             │
│      [Thử lại]                          │
│                                          │
└─────────────────────────────────────────┘
```

---

## Step 5 — Map Components

List every UI piece. Reuse before creating.

| Zone | Component | Reuse? | File |
|---|---|---|---|
| A | Back button + cart icon | new | `ProductDetailHeader.tsx` |
| B | Image | native `<img>` | — |
| B | `StatusBadge` | ✅ reuse | `components/shared/StatusBadge.tsx` |
| C | Description text | native `<p>` | — |
| D | Combo badge link | new | inline in page |
| E | Topping checkbox row | new | `ToppingRow.tsx` (or reuse `ToppingModal` logic) |
| F | Quantity stepper | new | `QuantityStepper.tsx` |
| G | CTA button | new | sticky `<footer>` in page |

---

## Step 6 — Write Acceptance Criteria (AC)

Concrete, testable, no prose.

```
AC-1  Tap product image/name in ProductCard → navigates to /menu/product/:id
AC-2  Page shows product image (16:9), name, price in formatVND, StatusBadge
AC-3  Toppings list renders checkbox per topping with +price label
AC-4  Selecting/deselecting toppings updates CTA total in real-time
AC-5  Quantity − button disabled at 1 (never goes below)
AC-6  CTA total = formatVND(product.price × qty + Σ selectedTopping.price × qty)
AC-7  Tap "Thêm vào giỏ" → cartStore.addItem({product, toppings, qty}) → toast "Đã thêm vào giỏ"
AC-8  If !is_available → CTA button is disabled + shows "Hết hàng"
AC-9  No toppings → Zone E shows "Món này không có topping" (not empty div)
AC-10 Combo badge shown only if product belongs to a combo; tap → scroll/link to combo section
AC-11 Loading state: skeleton for image + name + price
AC-12 Error state: ⚠ message + "Thử lại" button that retriggers the query
AC-13 Back button → router.back() (not hardcoded /menu)
```

---

## Step 7 — Create Task Rows (paste into TASKS.md)

| ID | Domain | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| PD-1 | FE | `QuantityStepper.tsx` — +/- with min prop | ⬜ | Spec_3b §AC-5 | wireframes/product_detail.md zone-F |
| PD-2 | FE | `ToppingRow.tsx` — checkbox + price label | ⬜ | Spec_3b §AC-3 | wireframes/product_detail.md zone-E |
| PD-3 | FE | `ProductDetailHeader.tsx` — back + cart badge | ⬜ | Spec_3b §AC-13 | wireframes/product_detail.md zone-A |
| PD-4 | FE | `app/(shop)/menu/product/[id]/page.tsx` — assemble all zones, TanStack Query, addItem | ⬜ | Spec_3b | wireframes/product_detail.md |

---

## Quick Reference — Spec Checklist

```
☐  Step 1: One-sentence purpose + route + who + entry/exit
☐  Step 2: Data source table (API / Zustand / local state)
☐  Step 3: Zone table (name + data + interaction)
☐  Step 4: ASCII wireframe (happy path + loading + error)
☐  Step 5: Component map (reuse first)
☐  Step 6: AC list (concrete + testable)
☐  Step 7: Task rows (paste into TASKS.md)
```

---

*File: `docs/fe/wireframes/HOW_TO_SPEC.md` — template for all future FE page specs.*
