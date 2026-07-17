# Scenario — The Welcome (land → "Xem Thực Đơn" → /menu)

> **TL;DR:** ✅ implemented · a first-time visitor opens the restaurant's branded home page,
> reads the story + signature dishes + hours, and taps a CTA into `/menu`. This page is a
> **fully static server component** — it makes **zero BE calls**, holds **no state**, and writes
> **nothing** to disk or any store. Every interactive element is a `<Link>` (or one in-page
> `#about` anchor). This scenario zooms on the **front-door beat**: marketing → one click → the
> ordering app begins.
> Traced from source on branch `experience_claude.md_system_1`.
> Sources: `fe/src/app/welcome/page.tsx` (the entire page, 256 lines, self-contained).
>
> FE zones → [customer_welcome.md](customer_welcome.md) ·
> Page inventory → [../../PAGES_INDEX.md](../../PAGES_INDEX.md) ·
> The ordering story this hands off to → [../customer_menu/SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md).
>
> **No `_be.md` / `_crosscomponent_dataflow.md` / `_crosspage_dataflow.md` / `_loading.md` for this
> page** — it calls no backend, shares no store, hands off no data, and fetches nothing async.
> Confirmed N/A on the run logged in [../../BE_DOC_TRACKER.md](../../BE_DOC_TRACKER.md) (row C2).

---

## Cast

- **Linh** — a prospective diner who found the restaurant via a Google search / shared link, on
  her phone, has **not** scanned a table QR.
- **`/welcome`** — the restaurant-branded marketing home, rendered by `WelcomePage`
  (`page.tsx:32`). A default React **Server Component** — no `'use client'`, no `useEffect`, no
  hooks of any kind.
- **The static content** — two in-file constant arrays: `dishes` (3 signature dishes,
  `page.tsx:9-25`) and `hours` (2 rows, `page.tsx:27-30`). **Not** fetched — hardcoded.
- **`/menu`** — the destination every CTA points at. The ordering app proper.

## Setting

Linh taps a link to the restaurant. Because `/welcome` is **not** under the `(shop)` route group,
it renders **without** the customer bottom-nav shell — it is a standalone full-bleed marketing
page (navbar → hero → about → dishes → hours → QR CTA → footer).

---

## Timeline — beat by beat

**00:00 — Request.** The browser requests `/welcome`. Next.js renders `WelcomePage` as a Server
Component. Because nothing in the tree is client-interactive beyond `<Link>`s, the HTML arrives
**fully formed** — there is **no route-level `loading.tsx`**, no Suspense boundary, no spinner,
and no client-side fetch to wait on. First paint = final paint.

**00:00 — What renders.** Seven static sections, all from in-file JSX + the two constant arrays:

1. **Navbar** (sticky) — logo + a `Xem Thực Đơn` button that is a `<Link href="/menu">`
   (`page.tsx:45-50`).
2. **Hero** — badge "Từ 1995", headline, and two CTAs: `Đặt Món Ngay` → `<Link href="/menu">`
   (`page.tsx:74-79`) and `Tìm Hiểu Thêm` → `<a href="#about">` (an in-page anchor, `page.tsx:80-85`).
3. **About** (`#about`) — two paragraphs of story + a photo **placeholder** (real asset pending,
   `page.tsx:112-118`).
4. **Signature dishes** — `dishes.map(...)` renders 3 cards (`page.tsx:131-150`); each card's
   image is a `ChefHat` icon **placeholder**, name/desc/tag come from the constant. Below them a
   `Xem Toàn Bộ Thực Đơn` → `<Link href="/menu">` (`page.tsx:153-158`).
5. **Hours & location** — `hours.map(...)` renders the 2 opening-hour rows (`page.tsx:180-185`);
   address + phone are literal text; the map is a **placeholder** (`page.tsx:205-211`).
6. **QR CTA** — a final `Xem Thực Đơn & Đặt Món` → `<Link href="/menu">` (`page.tsx:228-233`).
7. **Footer** — links to `/menu`, `/privacy-policy`, `/terms` (`page.tsx:247-251`).

**00:08 — Linh reads, then decides.** She scrolls (the `Tìm Hiểu Thêm` button smooth-jumps to
`#about` without a navigation). She likes what she sees.

**00:20 — The one meaningful action — tap a CTA.** Linh taps **`Xem Thực Đơn & Đặt Món`**. This
is a plain `next/link` client-side navigation to `/menu`. **No** API call leaves `/welcome`; the
page mints nothing, stores nothing, and is simply unmounted as `/menu` mounts.

**00:20.x — Linh lands on `/menu` with no session.** Crucially, `/welcome` did **not** create a
guest JWT or a table binding — only `/table/:tableId` does that
([../customer_table_qr/SCENARIO_TABLE_SCAN.md](../customer_table_qr/SCENARIO_TABLE_SCAN.md)). So
Linh arrives at `/menu` **unauthenticated**: she can browse the catalog (the catalog GETs are
public), but the first protected action (`POST /orders`) will need a session. What `/menu` does
for an unauthenticated visitor is owned by the menu docs, not this page (see Edge beats).

For the ordering story that begins here, see
[../customer_menu/SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md).

---

## Edge beats

### The reload (F5)

Because the page holds **no state** and fetches **nothing**, an F5 at any scroll position simply
re-serves the identical static HTML. There is nothing to lose, nothing to re-auth, nothing to
re-fetch — the polar opposite of the QR-scan page where F5 wipes the whole session
([../customer_table_qr/SCENARIO_TABLE_SCAN.md §F5](../customer_table_qr/SCENARIO_TABLE_SCAN.md)).

### Arriving unauthenticated at `/menu`

`/welcome` is a marketing entry, **not** a session-minting one. A visitor who clicks through has
no guest JWT. Whether `/menu` lets an unauthenticated visitor browse and where it stops them is
**❓ owned by the menu docs**, not this page — see
[../customer_menu/customer_menu.md](../customer_menu/customer_menu.md) /
[customer_menu_be.md](../customer_menu/customer_menu_be.md). The clean path to an ordering session
is the table QR scan, not `/welcome`.

### 🔮 PLANNED additions (owner decision 2026-06-12 — not in code)

Two enhancements are noted on this page but **not yet coded** (do not assume they exist): (1) a
banner showing "Bạn đang ở Bàn N" when arriving from a `/table/:token` scan; (2) navbar links to
`/introduction` and a customer-login entry (order-from-home). See the Decision Log rows for
2026-06-12 in [../../../07_business_logic/LOGIC_INDEX.md](../../../07_business_logic/LOGIC_INDEX.md).
When built, these are the **only** changes that could give `/welcome` dynamic data — at which
point this scenario (and a then-applicable `_be.md` / `_loading.md`) would need a refresh.

---

## Under the hood

### A · Cross-component (this page)

**None.** The page has no shared store and no inter-widget data flow — every section is
independent static JSX reading from two module-level constants. There are no sub-components that
coordinate. That is why there is **no `_crosscomponent_dataflow.md`** for this page.

### B · Cross-page

**None durable.** The page writes nothing — no Zustand, no localStorage, no URL state. Its only
"output" is navigation intent: a click on any CTA routes to `/menu` (or `/privacy-policy` /
`/terms`). Nothing outlives the page. That is why there is **no `_crosspage_dataflow.md`**.

### C · FE → BE send

**Nothing.** Zero requests leave the browser from `/welcome`. No `fetch`, no `api-client` import,
no hooks. The page is inert from the network's point of view.

### D · BE → FE receive / live

**Nothing.** No response to receive, no SSE, no WebSocket, no polling. The "signature dishes" look
like they could be `GET /products`, but they are the hardcoded `dishes` constant (`page.tsx:9-25`)
— this run **confirmed** the tracker's standing question ("Signature dishes likely GET /products —
confirm on run"): **they are static, NOT a product fetch.**

### E · Loading + caching

**No loading states.** No `loading.tsx`, no `<Suspense>`, no `useQuery`, no client-side fetch — so
there is nothing to skeleton or spin. The HTML is static and cacheable as a normal Next.js static
route. That is why there is **no `_loading.md`** for this page. The image/map blocks are JSX
**placeholders** (`ChefHat`/`MapPin` icons), not lazy-loaded assets.

### F · Monitoring

No page-specific instrumentation. As a static FE route it generates no BE traffic to alert on; a
request to `/welcome` itself is served by Next.js / Caddy, not the Go API. There is nothing on the
"BanhCuon — API Monitoring" Grafana dashboard tied to this page.

---

## One-line mental model

> `/welcome` is a **static front door**: a server-rendered marketing page with zero backend, zero
> state, and zero data handoff — read it, tap a CTA, and the real app (`/menu`) begins; the page
> itself remembers nothing and asks the server for nothing.
