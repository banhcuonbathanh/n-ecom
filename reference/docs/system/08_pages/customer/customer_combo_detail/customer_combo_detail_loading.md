# Combo Detail — `/menu/combo/:id` · Loading Behaviour

> **TL;DR:** ✅ implemented · how the page behaves while its two catalog queries are in flight.
> There is **no route-level `loading.tsx`** — the page gates entirely on the **`combos` query's
> `isLoading`** and renders an in-component `<ComboDetailSkeleton />`. The **`products` query loads
> independently and ungated**, which causes a brief flash where combo sub-items show their raw
> `product_id` before names resolve (see Flags).
> Sources: `fe/src/app/(shop)/menu/combo/[id]/page.tsx` (queries `:18-28`, branches `:84-93`,
> skeleton `:194-217`).
>
> Siblings → [page](customer_combo_detail.md) · [BE](customer_combo_detail_be.md) ·
> [crosspage](customer_combo_detail_crosspage_dataflow.md) · [scenario](SCENARIO_COMBO_ADD.md) ·
> bugs → [COMBO_BUGS.md](COMBO_BUGS.md)

---

## Loading Layers (outer → inner)

1. **Route spinner — none.** There is no `loading.tsx` in `menu/`, `menu/combo/`, or
   `menu/combo/[id]/` (verified — only `page.tsx` exists). So Next.js renders no Suspense fallback
   for this segment; the `(shop)/layout.tsx` shell (ClientBottomNav) paints immediately and the
   page body owns its own loading UI.
2. **No `<Suspense>` boundary** inside the page — the component is a client component
   (`'use client'`, `page.tsx:1`) driven by TanStack Query state, not React Suspense.
3. **Per-query state (the only real layer):**
   - `combos` query (`page.tsx:18-22`): destructures `isLoading` and `isError`. **This is the gate.**
   - `products-all` query (`page.tsx:24-28`): destructures **only `data` (default `[]`)** — its
     `isLoading`/`isError` are ignored. It never blocks paint.

## Main content branch (priority order)

The page body chooses exactly one branch, in this order (`page.tsx:84-95`):

1. **`isLoading` (combos in flight)** → `<ComboDetailSkeleton />` (`page.tsx:84`, skeleton
   `:194-217`): pulsing hero (aspect-[4/3]), title bar, price bar, two description lines, and three
   item rows. Matches the real Zones A/B/C layout so there is no layout shift on resolve.
2. **`isError` OR (not loading AND no combo found)** → the not-found block (`page.tsx:86-93`):
   centered "Không tìm thấy combo." + a "Quay lại menu" link. **Two distinct causes collapse into
   one UI** — a real network failure on `GET /combos` AND a successful-but-empty `rawCombos.find()`
   (id not in the list) render identically. There is no per-id BE 404 because no `GET /combos/:id`
   exists ([BE §Error Behaviour](customer_combo_detail_be.md#error-behaviour)).
3. **`combo` resolved** → the full page (Zones A–E, `page.tsx:95-189`).

The back button (`page.tsx:76-82`) is rendered **outside** all branches, so "Quay lại" works during
the skeleton and the not-found state too.

## Cross-query timing gap (the flash)

The two queries are independent. The `combo` memo (`page.tsx:30-50`) joins `combos` against
`products` to resolve each sub-item's `product_name`/`unit_price` via a `productMap`. Because the
page gates **only** on `combos.isLoading`:

- If `combos` resolves **before** `products`, the page leaves the skeleton and renders Zone C with
  `productMap` still empty → each sub-item falls back to its raw `product_id` UUID as the name
  (`page.tsx:45`) for one render, then snaps to the real name when `products` arrives.
- Both queries share a 5-min `staleTime` (`page.tsx:21,27`) and the BE caches both for 5 min
  (`products:list` / `combos:list`), so on a warm cache this gap is usually imperceptible; on a cold
  deep-link it is visible.

This same fallback is also the durable bug when a sub-product is genuinely unavailable (it never
arrives at all) → [COMBO_BUGS.md](COMBO_BUGS.md) Bug 2.

## Flags / Known Gaps

| # | Flag | Detail |
|---|---|---|
| 1 | **Products query is ungated** | Only `combos.isLoading` gates the skeleton; `products` loads behind it, causing the UUID-name flash above. A stricter gate would also wait on `products`. |
| 2 | **No route-level `loading.tsx`** | A cold deep-link to `/menu/combo/:id` shows the shell instantly then the in-component skeleton; acceptable, but there is no streamed Suspense fallback. |
| 3 | **Error and not-found are indistinguishable** | A flaky network (`combos` `isError`) and a bad/stale id both render "Không tìm thấy combo." — the user cannot tell "retry" from "wrong link". |
| 4 | **`products` failure is silent** | On `products` error the query defaults to `[]` (`page.tsx:24`); the combo still renders but every sub-item shows its UUID and no price. |
