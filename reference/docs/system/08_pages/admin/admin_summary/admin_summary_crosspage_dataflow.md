# Admin Summary — Cross-Page Data Flow (`/admin/summary`)

> **TL;DR:** ✅ implemented · This is a **thin cross-page surface**. The four read endpoints (3
> analytics + 1 low-stock) are fire-and-forget reads that produce no data handed off anywhere. The
> **one write** — the stock-in `POST /admin/stock-movements` from the `StockInModal` — is the only
> cross-page event: it bumps a DB row that is then visible on `/admin/ingredients` and re-exposes
> itself via the shared TanStack Query cache. There is **no SSE/WS on this page**; cross-device sync
> is refetch-only.
>
> Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(dashboard)/admin/summary/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx) ·
> [`fe/src/features/admin/admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts) ·
> [`be/internal/repository/ingredient_repo.go`](../../../../../be/internal/repository/ingredient_repo.go)
>
> **Sibling files:**
> [admin_summary.md](admin_summary.md) ·
> [admin_summary_be.md](admin_summary_be.md) ·
> [admin_summary_loading.md](admin_summary_loading.md) ·
> [SCENARIO_SUMMARY_REVIEW.md](SCENARIO_SUMMARY_REVIEW.md)
>
> **Related page:**
> [admin_ingredients.md](../admin_ingredients/admin_ingredients.md) ·
> [admin_ingredients_be.md](../admin_ingredients/admin_ingredients_be.md)

---

## 0. The whole picture on one diagram

```
   ┌─────────────────── ONE ADMIN BROWSER (manager / admin role) ──────────────────┐
   │                                                                                │
   │              ┌──────────────── in-browser hub ─────────────────┐              │
   │              │  TanStack Query cache (memory only, no persist)   │              │
   │              │  ['admin','low-stock']          ← reads here      │              │
   │              │  ['admin','ingredients']        ← invalidated too  │              │
   │              │  ['admin','summary', range]     ← read-only, no   │              │
   │              │  ['admin','top-dishes', range]     cross-page      │              │
   │              │  ['admin','staff-performance', range]  write        │              │
   │              └─────────────────────────────────────────────────┘              │
   │                     ▲ invalidate both ▲                                        │
   │                     │ on stock-in 201  │                                       │
   │   /admin/summary ───┘                  │                                       │
   │   StockInModal: POST /admin/stock-movements                                    │
   │                           │            │                                       │
   │   /admin/ingredients ─────┴────────────┘                                       │
   │   (GET /admin/ingredients hits the same DB row; refetches when cache busted)   │
   │                                                                                │
   └──────────────────────────────────┬─────────────────────────────────────────────┘
                                       │
   ══════════════════════ THE WIRE — BE is the real hub ═══════════════════════════
                                       │
                          ┌────────────▼──────────────────┐
                          │  ingredients.current_stock row  │   MySQL (durable)
                          │  stock_movements log entry      │   (no Redis on this path)
                          └────────────────────────────────┘
                                       │
                    all other manager devices reading /admin/ingredients
                    or /admin/summary "Cảnh báo tồn kho" see the update
                    on their NEXT refetch (manual nav / staleTime expiry)
                    — NOT pushed in real time
```

```
   LEGEND   ──▶ HTTP write        ◀── cache invalidation (same browser only)
            No SSE / WS on this page — cross-device is refetch-only.
```

---

## 1. Status lifecycle — N/A for this page

This page renders **no order status**. Its "low-stock" widget renders `IngredientStatus`
(`in_stock` / `low_stock` / `expiring_soon` / `out_of_stock`) which is computed server-side on
read (not a state machine). The ingredient does not progress through statuses on this page; a restock
just bumps `current_stock` and may cause the item to drop off the low-stock list on next read.

> Detail of the status computation: `admin_summary_be.md §4`.

---

## 2. The moment of handoff — what this page leaves behind

Only the **stock-in mutation** produces a durable handoff. Everything else on the page is a read.

```
   Manager clicks "+ Nhập hàng" (StockAlertList, summary/page.tsx:343-350)
        │
        ▼
   StockInModal (summary/page.tsx:211-290)
        │  RHF + Zod validate { quantity > 0, note? }  (page.tsx:205-209)
        │
        ▼
   useMutation → postStockMovement (admin.api.ts:276-277)
        │  POST /admin/stock-movements
        │  body: { ingredient_id, type:"in", quantity, note }
        │
        ▼ 201
   ① ingredients.current_stock += quantity  (ingredient_repo.go:236-238) — durable server write
   ② INSERT stock_movements row              (ingredient_repo.go:222-227) — audit log, durable
        │
   onSuccess (summary/page.tsx:224-229):
   ③ qc.invalidateQueries(['admin','low-stock'])    ← re-fetches THIS page's alert list
   ④ qc.invalidateQueries(['admin','ingredients'])  ← busts /admin/ingredients' query cache
   ⑤ toast.success(...)
   ⑥ onClose() → modal dismissed
```

| # | Write | Where it lands | Who reads it later | Source |
|---|-------|----------------|--------------------|--------|
| ① | `current_stock += quantity` | `ingredients` DB row | `/admin/ingredients` (GET /admin/ingredients) · `/admin/summary` low-stock alert (GET /admin/ingredients/low-stock) | `ingredient_repo.go:236-238` |
| ② | INSERT `stock_movements` | `stock_movements` table | `/admin/ingredients` movement history tab · future `/admin/storage` 🔮 | `ingredient_repo.go:222-227` |
| ③ | cache bust `['admin','low-stock']` | TanStack Query (this browser only) | `StockAlertList` in **this** tab refetches | `summary/page.tsx:225` |
| ④ | cache bust `['admin','ingredients']` | TanStack Query (this browser only) | `listIngredients` query on `/admin/ingredients` if that tab is open or navigated to | `summary/page.tsx:226` |

> **Why two invalidations?** `['admin','low-stock']` is the key used by this page's alert widget
> (`summary/page.tsx:295`). `['admin','ingredients']` is the key used by the full ingredients
> list on `/admin/ingredients` (`admin.api.ts:261-262`). The stock-in is relevant to both, so
> both are busted in the same `onSuccess`.

---

## 3. `/admin/ingredients` — the downstream sibling page

`/admin/ingredients` is the canonical home for the full ingredient list. A restock done from
`/admin/summary` is immediately visible there because:

1. **Server:** `ingredients.current_stock` is the same DB row both pages read from.
2. **Same browser:** `qc.invalidateQueries(['admin','ingredients'])` fires on success
   (`summary/page.tsx:226`) — if the manager navigates to `/admin/ingredients` after the
   restock, TanStack Query will refetch rather than serve a stale response.
3. **Different browser / device:** the invalidation only runs in the browser that performed the
   POST. Another manager's tab sees the updated stock level **on their next refetch** (navigation
   to the page, or `staleTime` expiry) — see §5 for the multi-device rule.

The low-stock alert widget itself links directly to `/admin/ingredients`:

```
   StockAlertList (summary/page.tsx:304):
   <a href="/admin/ingredients" className="text-xs text-blue-500">Xem toàn bộ kho →</a>
```

---

## 4. 🔮 PLANNED `/admin/storage` — downstream consumer of the same data

`admin_summary.md` notes that the low-stock alert also feeds the planned `/admin/storage` page
([PAGES_INDEX.md row](../../PAGES_INDEX.md)). That page is described as: full inventory management —
low-stock warnings, link availability to menu, run-out forecast. When implemented it would read
`GET /admin/ingredients` (same endpoint) and `GET /admin/ingredients/low-stock` (same endpoint as
this page's alert widget) — so any stock-in done from `/admin/summary` will naturally feed it.
**No cross-page wiring is needed; the DB row is the shared fact.**

> Do not trace further here — `/admin/storage` is 🔮 PLANNED and has no source code yet.

---

## 5. Multi-device sync — no realtime; refetch-only

There is **no SSE or WebSocket on `/admin/summary`**. This is deliberate: the page is read-only
analytics + one operational write, not a live operational dashboard.

**Consequence for the restock action across devices:**

```
   Manager A's browser                      Manager B's browser
   ────────────────────                     ────────────────────
   POST /admin/stock-movements
        │ 201
        │ invalidates own cache
        │ → StockAlertList refetches         (nothing happens — no push)
        │ → ingredient leaves list            B's alert list still shows
        ▼                                     the old stock level

   Manager B navigates to /admin/summary  ──▶ query stale → refetch
   OR staleTime (120 s) expires           ──▶ background refetch
                                               → B now sees updated level
```

State this plainly: **a restock done by manager A is not pushed to manager B. B sees it on their
next navigation to the page or after the 120-second `staleTime` for `['admin','low-stock']`
(`summary/page.tsx:297`) expires.**

The four read-only queries (`staleTime: 60_000` for analytics, `120_000` for low-stock) also refetch
on window focus by TanStack Query's default `refetchOnWindowFocus` behaviour, which slightly reduces
the divergence window in practice.

---

## 6. Reload (F5) behavior

| Datum | Survives F5? | Why |
|-------|-------------|-----|
| Range selector value (`today`/`week`/`month`) | ❌ resets to `'today'` | local `useState` — `summary/page.tsx:366` |
| TanStack Query cache | ❌ (memory only) | no `persister` configured for admin queries |
| `ingredients.current_stock` in DB | ✅ | durable server write |
| Stock-in modal open/closed state | ❌ | local `useState` — `summary/page.tsx:293` |

On reload the page re-fetches all 4 queries from scratch. Because the analytics reads hit live
MySQL with no Redis (`admin_summary_be.md §Caching & Invalidation`), data is always current after
the round-trip.

---

## 7. Durability matrix

| Datum | Lives in | Survives F5? | Survives new device? | Scope |
|-------|----------|-------------|----------------------|-------|
| Range tab selection | ░ local state (`useState`) | ❌ | ❌ | this tab only |
| TanStack Query cache | ░ memory | ❌ | ❌ | this browser tab |
| `ingredients.current_stock` | ✅ MySQL | ✅ | ✅ | all devices, all pages |
| `stock_movements` log row | ✅ MySQL | ✅ | ✅ | all devices, all pages |

> **Mental model in one line:** the four analytics reads are ephemeral (tab-local cache, no
> persistent state); the one write — a restock — is the only durable cross-page event, and the
> DB row is its only vehicle across devices.

---

## 8. Source & rule map

| Topic | Source of truth |
|-------|----------------|
| Page zones / wireframe | [admin_summary.md](admin_summary.md) |
| All 5 endpoints traced handler → service → repo → SQL | [admin_summary_be.md](admin_summary_be.md) |
| Loading states / skeletons | [admin_summary_loading.md](admin_summary_loading.md) |
| Page-level scenario | [SCENARIO_SUMMARY_REVIEW.md](SCENARIO_SUMMARY_REVIEW.md) |
| `/admin/ingredients` page | [admin_ingredients.md](../admin_ingredients/admin_ingredients.md) · [BE](../admin_ingredients/admin_ingredients_be.md) |
| `/admin/storage` (planned) | [PAGES_INDEX.md row](../../PAGES_INDEX.md) |
| `postStockMovement` API call | [`fe/src/features/admin/admin.api.ts:276-277`](../../../../../fe/src/features/admin/admin.api.ts) |
| `getLowStock` API call | [`fe/src/features/admin/admin.api.ts:264-265`](../../../../../fe/src/features/admin/admin.api.ts) |
| Stock-in mutation + invalidations | [`fe/src/app/(dashboard)/admin/summary/page.tsx:217-231`](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx) |
| `StockAlertList` query + modal trigger | [`fe/src/app/(dashboard)/admin/summary/page.tsx:292-361`](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx) |
| BE repo: INSERT stock_movement + UPDATE current_stock | [`be/internal/repository/ingredient_repo.go:221-248`](../../../../../be/internal/repository/ingredient_repo.go) |
| No-transaction flag (INSERT + UPDATE not atomic) | [admin_summary_be.md Flag 5](admin_summary_be.md#flags) |
