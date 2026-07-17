# Comparison — Doc vs. Code: `customer_welcome` (`/welcome`)

> **Scope:** audit this page's doc-set (`customer_welcome.md` wireframe + `SCENARIO_WELCOME.md`)
> against the running FE code. The page is a **fully static Server Component** — so only **Area 1
> (Component visuals)** materially applies; Areas 2–5 (cross-component store, cross-page persist,
> loading, FE⇄BE data model) are **genuinely N/A** (no store, no persist, no async, no backend) and
> the doc-set itself says so.
> **Read-only — no code or docs were changed.** Done inline (single static page, no fan-out needed);
> every Code-reality cell traced from source; `🔴` items (none here) would be re-verified by hand.
> Sources: `fe/src/app/welcome/page.tsx` (entire page, 256 lines, self-contained).
> Branch: `experience_claude.md_system_1_test_iphon2_change_code` · Date: 2026-06-22.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | **High-fidelity.** ASCII wireframe + Zones + Key Interactions all match the render; only wireframe-level simplifications + one hour-label rounding. | 0 | 1 | 8 |
| 2 — Cross-component dataflow | **N/A** — no shared store, no inter-widget flow (doc-confirmed). | — | — | — |
| 3 — Cross-page dataflow | **N/A** — page writes nothing (no Zustand / localStorage / URL state); only nav intent. | — | — | — |
| 4 — Loading behaviour | **N/A** — no `loading.tsx`, no Suspense, no `useQuery`, no fetch. First paint = final paint. | — | — | — |
| 5 — FE⇄BE data model | **N/A** — zero requests leave the page; "signature dishes" are the in-file `dishes` constant, **not** `GET /products` (confirmed). | — | — | — |
| **Provenance (SCENARIO)** | Every `file:line` in `SCENARIO_WELCOME.md` is **exact**; only the header branch tag is stale. | 0 | 0 | 1 |

**Bottom line:** `customer_welcome` is one of the most accurate doc-sets in the repo — a peer of
`customer_table_qr` / `customer_profile`. **No 🔴 doc-vs-code contradiction and no code bug.** The
SCENARIO's standing question ("signature dishes likely `GET /products` — confirm on run") is
**resolved: they are static**, never fetched.

---

## 🔴 RAISE-MY-VOICE headline findings

**None.** There is no hard contradiction between the doc-set and the code, and no product bug on this
page. The single 🟡 is a copy-rounding in the wireframe (weekend close time), not a behavioural drift.

---

## Dead / unreachable components found

**None.** The page is a single self-contained `WelcomePage` (`page.tsx:32`) with no sub-components,
no conditional branches, and no unused imports — every import (`Link`, `Button`, `Badge`, `Card`,
`CardContent`, and the 7 lucide icons) is rendered.

---

## Area 1 — Component visuals

**Verdict:** the ASCII wireframe, Zones table, Key Interactions, and Business-Logic notes in
`customer_welcome.md` all match `page.tsx`. The only real-data drift is the hours label; everything
else is normal wireframe abstraction (an ASCII box can't show every paragraph/badge).

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **Navbar** | logo + "Bánh Cuốn Bà Hoa" + `[Xem Thực Đơn]` | sticky nav: `ChefHat` in a `bg-primary` box + "Bánh Cuốn Bà Hoa" + `Button`(`QrCode` + "Xem Thực Đơn") `asChild` → `<Link href="/menu">` (`page.tsx:37-52`) | 🟢 | Accurate. ASCII omits the QrCode icon — cosmetic. |
| **Hero** | badge "⭐ … Từ 1995"; headline "Hương Vị Bánh Cuốn **—** Đúng Vị Hà Nội"; `[Đặt Món Ngay]` `[Tìm Hiểu Thêm ↓]` | `Badge`+`Star` "Quán Bánh Cuốn Truyền Thống Từ 1995" (`:57-60`); `h1` "Hương Vị **Bánh Cuốn**`<br/>`Đúng Vị Hà Nội" — a line break, **no em-dash** (`:62-66`); a descriptive `<p>` (`:68-71`, not drawn); CTAs `Đặt Món Ngay` → `<Link href="/menu">` (`:74-79`) + `Tìm Hiểu Thêm` → `<a href="#about">` (`:80-85`) | 🟢 | The doc's "—" is a `<br/>` in code; ASCII omits the hero sub-paragraph. Cosmetic. |
| **About (`#about`)** | "Câu Chuyện Của Chúng Tôi" + 2 paragraphs + photo placeholder | `Badge` "Câu Chuyện Của Chúng Tôi" + `h2` "Gần 30 Năm / Trao Truyền Hương Vị" (`:94-98`, not in ASCII) + 2 `<p>` story (`:99-109`) + `ChefHat` photo placeholder "Ảnh quán sẽ được thêm vào đây" (`:112-118`) | 🟢 | Accurate. ASCII omits the section `h2`. Cosmetic. |
| **Signature dishes** | 3 cards "Nhân Thịt / Tôm Thịt / Chay" + `[Xem Toàn Bộ Thực Đơn →]` | `dishes.map` → 3 `Card`s, **full** names "Bánh Cuốn Nhân Thịt / Tôm Thịt / Chay" + tag `Badge` + desc (`:131-150`); section also has `Badge` "Thực Đơn Nổi Bật" + `h2` "Món Đặc Trưng" + subtitle (`:125-129`, not drawn); CTA → `<Link href="/menu">` (`:153-158`) | 🟢 | Doc abbreviates dish names ("Nhân Thịt" vs "Bánh Cuốn Nhân Thịt") + omits the section header. Cosmetic. |
| **Hours & location — hours** | 🕐 "T2–T6 06:30–21h" · "T7–CN 06:00–**21h**" | `hours` const: `{ "Thứ 2 – Thứ 6", "06:30 – 21:00" }`, `{ "Thứ 7 – Chủ Nhật", "06:00 – 21:30" }` (`page.tsx:27-30`), rendered by `hours.map` (`:180-185`) | 🟡 | Doc rounds **both** closings to "21h", hiding that **weekends close 21:30, not 21:00**. Fix ASCII to "06:30–21:00" / "06:00–21:30". |
| **Hours & location — location** | 📍 address + phone + map placeholder | "123 Đường Ẩm Thực, Phường Hàng Bông, Quận Hoàn Kiếm, Hà Nội" + `Phone` "0901 234 567" + `MapPin` placeholder "Bản đồ sẽ được nhúng vào đây" (`:197-211`) | 🟢 | Accurate. |
| **QR CTA** | "Sẵn Sàng Đặt Món?" + `[Xem Thực Đơn & Đặt Món]` | `QrCode` icon box + `h2` "Sẵn Sàng Đặt Món?" + a `<p>` (`:218-227`, not drawn) + `Button` → `<Link href="/menu">` (`:228-233`) | 🟢 | Accurate. ASCII omits the QR icon + paragraph. Cosmetic. |
| **Footer** | "Thực Đơn · Chính Sách · Điều Khoản" | logo + "© 2026 · Hà Nội, Việt Nam" + 3 links: "Thực Đơn" → `/menu`, "Chính Sách" → **`/privacy-policy`**, "Điều Khoản" → **`/terms`** (`:238-252`) — both target routes **exist** (`app/privacy-policy/page.tsx`, `app/terms/page.tsx`) | 🟢 | Accurate; link targets verified live. |
| **Zones table** | inline JSX in `app/welcome/page.tsx`; static arrays `dishes`/`hours`; atoms `Button`/`Badge`/`Card`; photo/map placeholders | Exact: imports `Button`/`Badge`/`Card`/`CardContent` (`:2-4`); 2 module-level const arrays (`:9-30`); `ChefHat`/`MapPin` placeholders. | 🟢 | Accurate. |
| **Business Logic "fully static — no API calls"** | static, no API | Confirmed — no `api-client` import, no hooks, no `fetch`; a default Server Component (no `'use client'`). | 🟢 | Accurate. |
| **🔮 PLANNED — navbar link → `/introduction`** | marked PLANNED, not coded | `/introduction` route does **not** exist (`find app -ipath '*introduction*'` → none) — and no QR table banner | 🟢 | Doc is honest: correctly labelled 🔮 PLANNED. |

**Verified-matching:** all three primary CTAs (`Đặt Món Ngay`, `Xem Toàn Bộ Thực Đơn`,
`Xem Thực Đơn & Đặt Món`) and the navbar button route to `/menu`; `Tìm Hiểu Thêm` is an in-page
`#about` anchor; footer routes to `/menu` / `/privacy-policy` / `/terms`. All Key-Interactions
claims hold.

---

## Areas 2–5 — N/A (confirmed, not skipped)

- **Area 2 (Cross-component):** no shared store, no inter-widget flow — every section is independent
  static JSX over the two module-level constants. (`SCENARIO_WELCOME.md` §A) ✅
- **Area 3 (Cross-page):** the page writes nothing — no Zustand, no localStorage, no URL state. Its
  only output is navigation intent. (`SCENARIO_WELCOME.md` §B) ✅
- **Area 4 (Loading):** no `loading.tsx` (confirmed absent), no `<Suspense>`, no `useQuery`. First
  paint = final paint. (`SCENARIO_WELCOME.md` §E) ✅
- **Area 5 (FE⇄BE):** zero requests leave `/welcome`. The "signature dishes" are the hardcoded
  `dishes` const (`page.tsx:9-25`), **not** `GET /products` — the tracker's standing question is
  hereby resolved. (`SCENARIO_WELCOME.md` §D) ✅

---

## Provenance check — `SCENARIO_WELCOME.md`

Every `file:line` citation in the scenario was re-opened and is **exact**: `WelcomePage` `:32`;
`dishes` `:9-25`; `hours` `:27-30`; navbar link `:45-50`; hero CTAs `:74-79` / `:80-85`; about photo
`:112-118`; `dishes.map` `:131-150`; dishes CTA `:153-158`; `hours.map` `:180-185`; map placeholder
`:205-211`; QR CTA `:228-233`; footer `:247-251`. The "256 lines, self-contained" claim is correct.

| Topic | Doc says | Code reality | Sev | Solution |
|---|---|---|---|---|
| SCENARIO header provenance | "Traced from source on branch `experience_claude.md_system_1`" (`SCENARIO_WELCOME.md:9`) | Current branch is `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Stale branch tag — refresh on next pass (same class as every other page's provenance drift). |

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🟡 Doc fix | Stop rounding the weekend close to "21h" in the ASCII — show `06:30–21:00` (T2–T6) / `06:00–21:30` (T7–CN) to match the `hours` const | `customer_welcome.md` (ASCII, hours block) |
| 2 | 🟢 Doc fix | Refresh the SCENARIO provenance branch tag to the current branch | `SCENARIO_WELCOME.md:9` |
| 3 | 🟢 Doc (optional) | Optionally note in the ASCII that the hero/about/dishes/QR sections each carry a section `Badge`+`h2`+sub-paragraph the box can't show (so future readers don't think they're missing) | `customer_welcome.md` |

> Per CLAUDE.md: doc fixes are **one** ALIGNed task (this page needs only doc touches — there is **no
> code bug** to register). Nothing here requires a `MASTER_TASK.md` row beyond the doc-edit task.
