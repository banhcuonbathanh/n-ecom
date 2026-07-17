# Admin Bottom Nav — Shared Shell (mobile)

> **Status: 🔮 PROPOSED** — not in code yet. Owner to confirm before build.
> Modelled on the customer **`ClientBottomNav`** ([`fe/src/components/shared/ClientBottomNav.tsx`](../../../../fe/src/components/shared/ClientBottomNav.tsx)).
> The live admin shell today is a **top** horizontal tab-nav in `(dashboard)/admin/layout.tsx`
> (see [PAGES_INDEX.md → Admin shell](../PAGES_INDEX.md#shared-shells-drawn-once-referenced-by-every-page-file)).
> This doc specifies a **mobile bottom bar** that would sit alongside (or replace, on small screens)
> that top nav. **Code wins** — once built, re-trace this file from the real component.

---

## Why

Admin has **11 sections**, today reachable only via a desktop top tab-nav that horizontally scrolls.
On a phone that scroll is hard to thumb-reach. The customer side already solves this with a fixed
5-tab bottom bar. This doc applies the **same pattern** to admin, using a **"Top 5 + Thêm"** layout:
5 fixed thumb-tabs, with the remaining 7 sections behind a **"Thêm"** (More) sheet.

---

## Wireframe

```
┌──────────────────────────────────────────────┐
│                 (page content)               │
│                                              │
├──────────────────────────────────────────────┤
│  ▔▔▔▔                                        │ ← sliding spring indicator (3px, glides between tabs)
│  ( ⌂ )   ( ▤ )   ( 🍽 )   ( 👥 )   ( ⋯ )    │ ← pills (active = primary/15 bg, scale-110, glow)
│  Tổng    Tổng    Sản     Nhân    Thêm        │
│  quan    kết     phẩm    viên                │
└──────────────────────────────────────────────┘
  fixed bottom-0 · z-20 · bg-card · border-t · pb-safe · max-w-lg mx-auto
```

Tapping **Thêm** opens a bottom sheet over the bar:

```
┌──────────────────────────────────────────────┐
│  Thêm                                    [✕] │
├──────────────────────────────────────────────┤
│  ( 🍱 ) Combo          ( ▦ ) Danh mục        │
│  ( ＋ ) Topping        ( ✓ ) Công việc       │
│  ( 📦 ) Kho nguyên liệu ( 📣 ) Marketing      │
│  ( 🎓 ) Đào tạo                              │
└──────────────────────────────────────────────┘
```

---

## Tabs — 5 primary

| # | Label      | Route             | Icon (lucide)   | Active when `pathname` …                       |
|---|------------|-------------------|-----------------|------------------------------------------------|
| 0 | Tổng quan  | `/admin/overview` | `LayoutDashboard` | `startsWith('/admin/overview')`              |
| 1 | Tổng kết   | `/admin/summary`  | `BarChart3`     | `startsWith('/admin/summary')`                 |
| 2 | Sản phẩm   | `/admin/products` | `UtensilsCrossed` | `startsWith('/admin/products')`              |
| 3 | Nhân viên  | `/admin/staff`    | `Users`         | `startsWith('/admin/staff')`                   |
| 4 | Thêm       | — (opens sheet)   | `MoreHorizontal`| any route in the **Thêm** set below is active  |

> Tab 4 is **not a link** — it toggles the sheet. It renders "active" (pill highlighted) whenever the
> current page is one of the 7 sections inside the sheet, so the user always sees where they are.

## "Thêm" sheet — remaining 7

| Label           | Route                 | Icon (lucide)  |
|-----------------|-----------------------|----------------|
| Combo           | `/admin/combos`       | `Boxes`        |
| Danh mục        | `/admin/categories`   | `LayoutGrid`   |
| Topping         | `/admin/toppings`     | `Plus`         |
| Công việc       | `/admin/todo-list`    | `CheckSquare`  |
| Kho nguyên liệu | `/admin/ingredients`  | `Package`      |
| Marketing       | `/admin/marketing`    | `Megaphone`    |
| Đào tạo         | `/admin/training`     | `GraduationCap`|

> Note: `/admin/staff/task-board` lives under the **Nhân viên** tab (it's a sub-route of `/admin/staff`),
> so it's covered by tab 3's `startsWith` and needs no separate entry.

---

## Visual spec (inherited from `ClientBottomNav`)

Reuse the same tokens and motion so admin and customer feel like one system:

| Aspect            | Value (same as client nav)                                                        |
|-------------------|-----------------------------------------------------------------------------------|
| Container         | `fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card pb-safe`        |
| Width clamp       | `max-w-lg mx-auto flex`                                                            |
| Item              | `flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px]`         |
| Pill (active)     | `bg-primary/15 text-primary scale-110 shadow-[0_0_20px_-6px_var(--color-primary)]`|
| Pill (idle)       | `text-muted-fg` · hover `bg-muted`/`text-foreground` · active `scale-90`           |
| Label             | `text-[11px]` — active `text-primary font-semibold`, idle `text-muted-fg`          |
| Spring easing     | `cubic-bezier(0.34,1.56,0.64,1)` on indicator + pills                              |
| Sliding indicator | `h-[3px] w-1/5`, `translateX(activeIndex * 100%)`, hidden (`opacity-0`) when none  |

⚠️ **FLAG** — the live admin shell uses an **orange-500 / gray-900 dark** palette
(`(dashboard)/admin/layout.tsx`), while `ClientBottomNav` uses the design-token palette
(`primary`, `card`, `muted-fg`). Before build, owner picks one:
**(a)** keep admin on its current orange/dark colors, or **(b)** migrate admin to design tokens to
match the customer bar. This doc assumes **(b)** for the spec above.

---

## Where it mounts

`(dashboard)/admin/layout.tsx` — render `<AdminBottomNav />` after `{children}`, inside the existing
`AuthGuard` + `RoleGuard minRole=MANAGER` wrapper, and add bottom padding to the content
(`pb-[calc(72px+env(safe-area-inset-bottom))]`) so nothing hides behind the fixed bar — mirroring how
`(shop)/layout.tsx` pads for `ClientBottomNav`.

**Responsive open question (owner to decide):** show the bottom bar only on mobile (`md:hidden`) and
keep the top tab-nav on desktop, or replace the top nav entirely. Recommended: **mobile-only bottom
bar + keep desktop top nav** — least disruptive, matches "customer = mobile, admin = desktop" in
[PAGES_INDEX.md](../PAGES_INDEX.md).

---

## Build checklist (when approved)

1. `fe/src/components/shared/AdminBottomNav.tsx` — `'use client'`, `usePathname`, 5 tabs + Thêm sheet.
2. Sheet state: local `useState` (open/close) — no store needed.
3. Mount in `(dashboard)/admin/layout.tsx` + add content bottom padding.
4. Resolve the two ⚠️ owner decisions above (palette · mobile-only vs replace).
5. Re-trace this doc from the shipped component (drop the 🔮, mark ✅).
