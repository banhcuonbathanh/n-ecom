# Comparison — Doc vs. Code · `/introduction` (customer_introduction)

> **Scope:** audit the `customer_introduction` doc-set (`customer_introduction.md` — the only file in
> the folder) against the running FE code on branch `experience_claude.md_system_1_test_iphon2_change_code`.
> Axes: ① component visuals · ② cross-component dataflow · ③ cross-page dataflow · ④ loading · ⑤ FE⇄BE.
> **Areas 2, 4, 5 are N/A** — the page is a fully static Server Component: no store, no queries, no BE
> (confirmed `app/introduction/page.tsx:12`, "no auth, no BE"). · **Read-only — no code or docs changed.**
> Done inline (no subagents — small static page); every 🔴 hand-verified by grep/Read with `file:line`.
> Date: 2026-06-23.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | Real drift — doc is a *proposed* wireframe, code shipped a richer layout | 0 | 3 | 4 |
| 2 — Cross-component dataflow | **N/A** — no Zustand store, no shared selectors (static page) | — | — | — |
| 3 — Cross-page dataflow | Page built but **orphaned** (no inbound link); shell placement is deliberate & correct | 1 | 0 | 1 |
| 4 — Loading behaviour | **N/A** — static Server Component, no queries, no skeletons | — | — | — |
| 5 — FE⇄BE data model | **N/A** — zero BE calls (all content is static consts in the components) | — | — | — |
| **Page status** | **Doc says 🔮 PLANNED / "proposed"; code is fully built & shipped** | 1 | 0 | 0 |
| **Totals** | | **2** | **3** | **5** |

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

1. **The doc marks this page 🔮 PLANNED / "proposed — owner to confirm", but it is fully built and
   shipped.** `customer_introduction.md:3` says *"🔮 PLANNED (owner decision 2026-06-12)"*, `:6` says
   *"Wireframe below is **proposed — owner to confirm**"*, and the Zones / Interactions / Business-Logic
   headings are all tagged *"(proposed)"* (`:43`, `:53`). `PAGES_INDEX.md:31` also lists it `🔮 PLANNED`.
   **Code reality:** the route exists and renders — `fe/src/app/introduction/page.tsx:16-63` plus five
   real components `fe/src/features/introduction/IntroHero.tsx`, `IntroStory.tsx`, `IntroGallery.tsx`,
   `IntroMap.tsx`, `IntroContact.tsx`. **Why it matters:** the single source of truth for "is this page
   real" is wrong in two places — anyone reading the docs would believe the page doesn't exist. Doc fix:
   flip status to ✅ in `customer_introduction.md` + `PAGES_INDEX.md` and drop the "(proposed)" tags.

2. **The page is built but ORPHANED — nothing in the app links to `/introduction`.**
   `grep -rn "introduction" fe/src` (excluding `app/introduction` + `features/introduction` self-refs)
   returns **zero** hits — no `href="/introduction"`, no `router.push("/introduction")` anywhere. The
   page's own back-arrow points *to* `/welcome` (`page.tsx:22-28`), implying a round-trip, yet `/welcome`
   does **not** link *to* `/introduction` (re-confirmed against the `customer_welcome` run, which noted
   "/introduction correctly absent" from the welcome footer). **Why it matters:** the page is reachable
   only by manually typing the URL — a real product gap (built feature with no entry point), not a doc
   error. Needs a product decision: add the link from `/welcome` (and surface status), or leave it dark.
   *(This is a code/product gap, not a code bug — register before adding any link.)*

---

## Dead / unreachable components found

- **Whole route `/introduction` is unreachable via UI** — see headline #2. The 5 `features/introduction/*`
  components only ever render under this one orphaned route, so the entire feature is dark until a link
  is added. No *internal* dead code (every component is imported by `page.tsx:4-8` and rendered `:38-42`).
- The doc's **Gallery lightbox** (`customer_introduction.md:57`, "phase 2, optional") is correctly **not
  built** — `IntroGallery.tsx:7` comment states "Lightbox is phase-2 … not built here". Consistent, not dead.

---

## Area 1 — Component visuals

**Verdict:** the doc ASCII is an honest *proposal* and the shipped page follows its zone order
faithfully, but each zone is richer than drawn (extra Badges, h2 headings, subtitles) and the hero +
gallery + founder images are intentional **placeholders**, not the real photos the ASCII implies.

| Zone | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Top nav | Zones table proposes **`CustomerTopNav` (shared, reuse)** (`customer_introduction.md:47`) | Inline `<nav>` in the page itself (`page.tsx:20-36`): back-link → `/welcome` ("Giới Thiệu" + `ArrowLeft`) + a `Button` → `/menu` ("Xem Thực Đơn" + `QrCode`). `CustomerTopNav` **not** used. Reuse isn't feasible: `CustomerTopNav` is `'use client'`, takes an `onBack: () => void` callback + renders a **cart** icon (`CustomerTopNav.tsx:1,7,29`) — wrong fit for a static Server page whose right slot is a "Xem Thực Đơn" CTA | 🟡 | Doc fix: drop "CustomerTopNav (shared, reuse)" from the Zones table — code correctly uses a bespoke server nav |
| Hero | "HERO PHOTO (full-width restaurant photo)" + "Bánh Cuốn Bà Hoa — Từ 1995" (`:16-17`) | **Placeholder** block, not a photo — `IntroHero.tsx:11-17` (Star icon + "Ảnh quán toàn cảnh sẽ được thêm vào đây"). Headline `Bánh Cuốn Bà Hoa / Từ 1995` ✅ (`:24-28`). Code **adds** a `Badge` "Quán Bánh Cuốn Truyền Thống" (`:20-23`) + subtitle "Gần 30 năm…" (`:29-31`) the ASCII omits. Placeholder is flagged (`:5-6`) | 🟡 | Doc fix: redraw hero as a placeholder block + add the Badge/subtitle; note "real photo pending assets" |
| Câu Chuyện | "long-form story text (multiple paragraphs, founder photo inline)" (`:19-21`) | `IntroStory.tsx`: 2-col grid, Badge "Câu Chuyện" (`:12-14`), **h2** "Gần 30 Năm / Trao Truyền Hương Vị" (`:15-19`, not in ASCII), 3 paragraphs (`:20-33`), founder photo is a **placeholder** (ChefHat icon, `:36-42`), not an inline real photo | 🟢 | Doc fix: add the h2; mark founder image as placeholder |
| Hình Ảnh | gallery of **3** images, "(swipeable on mobile)" (`:23-26`) | `IntroGallery.tsx`: **6** placeholder tiles (`PLACEHOLDER_COUNT = 6`, `:9`), static **grid** `grid-cols-2 sm:grid-cols-3` (`:25`) — **not swipeable**. Header "Không Gian Quán" (`:19`) | 🟡 | Doc fix: redraw as a 6-tile grid, drop "swipeable" (no carousel in code) |
| Vị Trí | embedded Google Map + "123 Đường Ẩm Thực, Hoàn Kiếm, Hà Nội" + "[ Chỉ đường ]" (`:28-33`) | `IntroMap.tsx`: Google Maps `iframe ?output=embed` (`:23-29`), address richer — "123 Đường Ẩm Thực, **Phường Hàng Bông**, Quận Hoàn Kiếm, Hà Nội" (`:9`); "Chỉ đường" opens maps in a new tab (`:34-42`). Zones table said "static coordinates" but code drives both off a **text address query** (`:10`) | 🟢 | Doc fix: update address string; clarify it's an address query, not coordinates |
| Giờ Mở Cửa / Liên Hệ | T2–T6 06:30–21:00 · T7–CN 06:00–21:30 · 0901 234 567 · (Zalo / Facebook) (`:35-37`) | `IntroContact.tsx`: hours **match exactly** (`:8-11`), phone **matches** "0901 234 567" (`:14`); code adds a real fb URL "fb.com/banhcuonbahoa" (`:15`). Rendered as two `Card` atoms (`:24,45`) — matches Zones table "Card atoms (reuse)" | 🟢 | None (or note the fb URL) |
| CTA | "[ Xem Thực Đơn & Đặt Món ]" (`:39`) | `page.tsx:44-60`: section with h2 "Sẵn Sàng Thưởng Thức?" (`:47-49`) + subtitle (`:50-52`, not in ASCII) + `Button` "Xem Thực Đơn & Đặt Món" → `/menu` (`:53-58`) | 🟢 | Doc fix: add the heading + subtitle to the ASCII |

**Verified-matching:** zone **order** (nav → hero → story → gallery → map → hours/contact → CTA) is
identical to the ASCII; the hours table and phone number are exact; the map iframe, "Chỉ đường", and
both `/menu` CTAs all behave as the Key-Interactions list describes (`:55-58`); `Card` + `Button` atom
reuse matches the Zones table.

---

## Area 3 — Cross-page dataflow

**Verdict:** the one real concern is reachability (headline #2). The deliberate shell placement is a
*positive* — the page sidesteps the fixed-footer collision class seen on other customer pages.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Reachability / entry point | back-arrow → `/welcome` (`:58`), implying `/welcome` ↔ `/introduction` round-trip | Nothing links **to** `/introduction` — grep over `fe/src` = 0 inbound hits; `/welcome` has no link to it. Page reachable by URL only | 🔴 | Product decision: add a link from `/welcome` (+ flip status), or document it as intentionally dark |
| Shell placement | ASCII draws no bottom nav (`:12-41`) | Route is **top-level**, NOT under `(shop)` (`page.tsx:13` comment) → shared `ClientBottomNav` does **not** render → **no** fixed-footer collision (contrast `customer_product_detail` / `customer_favourites` / `customer_checkout` 🔴s). Deliberate & correct | 🟢 | None — good design; worth noting in the doc |

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Doc fix | Flip status 🔮 PLANNED → ✅ and drop all "(proposed)" tags — the page is built & shipped | `customer_introduction.md:3,6,43,53` + `PAGES_INDEX.md:31` |
| 2 | 🔴 Code/product gap | Add an entry point to `/introduction` (link from `/welcome`) **or** document it as intentionally dark — register in `MASTER_TASK.md` first | `fe/src/app/welcome/page.tsx` (+ product decision) |
| 3 | 🟡 Doc fix | Redraw hero + gallery as **placeholder** blocks; gallery is **6 static tiles**, not 3 swipeable; add the Badges/h2/subtitles each zone actually renders | `customer_introduction.md:12-41` |
| 4 | 🟡 Doc fix | Remove "CustomerTopNav (shared, reuse)" from the Zones table — code correctly uses a bespoke static-server nav | `customer_introduction.md:47` |
| 5 | 🟢 Doc fix | Update the Vị Trí address to the fuller string in code; mark map as address-query (not coordinates); add the fb URL + CTA heading | `customer_introduction.md:32,39,49` |
| 6 | 🟢 Doc fix | Note the deliberate top-level (non-`(shop)`) placement that avoids the `ClientBottomNav` collision | `customer_introduction.md:60-64` |

> Per CLAUDE.md: the doc fixes (#1, #3–#6) are **one** ALIGNed doc task; the code/product gap (#2) must
> be registered in `MASTER_TASK.md` **before** any file is touched. This audit changed nothing.
