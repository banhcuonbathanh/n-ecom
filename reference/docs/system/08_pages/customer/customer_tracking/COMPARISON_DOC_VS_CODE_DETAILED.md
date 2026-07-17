# Customer Tracking — Doc vs. Code (Detailed Audit)

> **Scope:** a read-only doc-vs-code audit of the `/tracking` page across 5 axes — component visuals,
> cross-component dataflow, cross-page dataflow, loading behaviour, and the FE⇄BE data model.
> **Read-only — no code or docs were changed by this audit.**
> Produced by inline FE tracing + BE source verification; every 🔴 was re-verified by hand against
> source on branch `experience_claude.md_system_1_test_iphon2_change_code`.
> **Code wins:** every "Code reality" cell is a claim about the running code with a `file:line`.
> Exclusions: `SCENARIO_TRACK_ORDER.md` (narrative beat, not a structural axis) and the `.excalidraw`
> map are not audited here. Date: 2026-06-21 (refresh — re-verified all findings; **new dead-code
> finding added:** `ServiceQueueList` + `ServiceQueueItem` are unreferenced, superseded by
> `WholeFloorPrepList`).
>
> **Headline result (rare):** the *textual* doc-set (`_be.md`, `_loading.md`,
> `_crosscomponent_dataflow.md`, `TRACKING_BUGS.md`) is **unusually accurate** — it was traced from
> source and already documents the page's live code bugs as Flags. The genuine **doc drift** this
> audit surfaces is concentrated in the **ASCII wireframe in `customer_tracking.md` (Area 1)**, which
> draws UI (per-item cooking progress, floor progress bars) that the real components never render.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | ⚠️ Real drift — wireframe draws progress UI the code never renders | 2 | 2 | 2 |
| 2 — Cross-component dataflow | ✅ Accurate; one self-contradiction inside the file | 0 | 1 | 1 |
| 3 — Cross-page dataflow | ✅ Correct-by-design (no crosspage file; read-only consumer) | 0 | 0 | 1 |
| 4 — Loading behaviour | ✅ Accurate, line-for-line | 0 | 1 | 1 |
| 5 — FE⇄BE data model + Flags | ✅ Accurate; doc line numbers drifted; Flag 1 = live code bug | 1 | 3 | 2 |
| **Total** | | **3** | **7** | **7** |

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

1. **🔴 (Doc drift) `OrderDetailCard` does NOT render per-item cooking progress — the wireframe lies.**
   `customer_tracking.md:23-25` ASCII draws `• Bánh cuốn thịt   ra 1/2` / `• Canh mọc   còn 1`, and
   the Zones table (`customer_tracking.md:47`) calls it *"items + progress of own order"*. The real
   component renders `x{quantity}` + name + toppings + **line price** + a **total footer** —
   **no progress field exists** (`OrderDetailCard.tsx:36-64`, totals at `:67-74`). There is no
   `qty_served`/`ra n/m` rendering anywhere in the component. **Why it matters:** the page's central
   "watch my order cook" promise is drawn in the doc but absent in code — and even if added, Flags 1–2
   below mean progress could not update live.

2. **🔴 (Doc drift) `WholeFloorPrepList` renders status badges, NOT progress bars.**
   `customer_tracking.md:29-31` ASCII draws `1. Bàn 01  ▓▓▓▓░░` progress bars and a `3. Mang về ░░░░░░`
   row. The real component renders, per row: a position number, `tableLabel`, a **`StatusBadge`**
   (`statusColors`/`statusLabel`), and an order-number suffix — no progress bar glyphs, no dedicated
   "Mang về" row (`WholeFloorPrepList.tsx:42-82`); header is `Hàng chờ phục vụ` + a `{N} bàn` count
   (`:27-32`). **Why it matters:** the floor-queue visual the doc sells (fill-bars) was never built.

3. **🔴 (Code bug, already documented) Live status badge is dead — `order.status` SSE event never fires.**
   The FE hook switches on `case 'order.status'` (`useOrderMonitorSSE.ts:67-69`), but **no BE code
   publishes that type**. Every status transition publishes `type:"order_status_changed"` on
   `order:<id>` (`order_service.go:552`, `:745`, via `publishOrderEvent` `:806-818`). A repo-wide grep
   finds `"order.status"` only in a **comment** (`monitor_handler.go:17`) — never marshalled. So
   `orderStatus` stays `null` and the badge falls back to the last `GET /orders/:id` snapshot
   (`page.tsx:44`), advancing only when an `items_*` event happens to trigger a refetch. **This is a
   real product bug** — the `_be.md` Flag 1 + `TRACKING_BUGS.md` Bug 1 document it correctly; it is
   restated here because it is the top live defect on the page.

---

## Dead / Unreachable Code Found

- **`ServiceQueueList.tsx` + `ServiceQueueItem.tsx`** (entire files) — **zero external imports** (grep:
  `ServiceQueueList` appears only in its own definition; `ServiceQueueItem` only in
  `ServiceQueueList.tsx:1,28` + its own def). The page renders `WholeFloorPrepList` for the floor queue
  (`page.tsx:12,157`), never `ServiceQueueList`. These two are an **earlier, superseded** floor-queue
  implementation left in the tree (`ServiceQueueList` header "Bàn đang phục vụ", `ServiceQueueItem`
  renders `StatusBadge` + `#orderId.slice(0,8)` + `itemCount món` + `~Xʹ` + a `< Đơn của bàn` chip).
  **Newly surfaced by this refresh — not in the prior run.** 🟡 Code cleanup: delete both files.
- **`RECONNECT.showBannerAfter = 3`** (`useOrderMonitorSSE.ts:11`) — defined, **never referenced**.
  The `ConnectionErrorBanner` shows immediately on `!sseConnected` (`page.tsx:129`), not after 3
  attempts. Dead constant.
- **`tableStatuses` return value** (`useOrderMonitorSSE.ts:120`, fed by `tables.status` at `:81-82`) —
  `page.tsx:36` does **not** destructure it; no widget renders it. The BE pushes a `tables:broadcast`
  snapshot that is **dropped on this page** (the hook is shared with the admin floor monitor, so it is
  dead *on `/tracking`*, not globally).
- **`reconnect()` return value** (`useOrderMonitorSSE.ts:30-36, 120`) — not destructured in
  `page.tsx`; there is no "Thử lại" button. The banner is display-only.

---

## Area 1 — Component Visuals

**Verdict:** ⚠️ Real drift. The ASCII wireframe in `customer_tracking.md` is aspirational — two zones
draw UI (per-item progress, floor progress bars) the code never renders; one zone is structurally
right but copy-drifted; two zones are richer in code than in the doc.

| Component | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `OrderDetailCard` | ASCII shows per-item cooking progress `ra 1/2` / `còn 1`; Zones table = "items + progress of own order" (`customer_tracking.md:23-25,47`) | Renders `x{quantity}` + name + toppings + **line price** + total footer; **no progress** (`OrderDetailCard.tsx:36-64,67-74`) | 🔴 | Redraw ASCII to a priced line-item list + total; fix Zones row to "items + prices" |
| `WholeFloorPrepList` | ASCII shows progress bars `▓▓▓▓░░` per table + a `Mang về` row (`customer_tracking.md:29-31`) | Position # + `tableLabel` + `StatusBadge` + order suffix; header `Hàng chờ phục vụ` + `{N} bàn` (`WholeFloorPrepList.tsx:27-82`) | 🔴 | Redraw ASCII as status-badge rows, drop progress bars |
| `TableInfoBanner` | ASCII `Bàn 03 · [preparing]` + `Vị trí hàng đợi: 2/5 · ước tính ~8 phút` (`customer_tracking.md:18-20`) | Separate `Bàn` box + `Trạng thái:` label + `StatusBadge` + `~X phút`; queue line `Vị trí hàng chờ: #N trong M đơn \| Chờ ~X phút`; **plus a `delivered` state** "Đơn của bạn đã được phục vụ — Cảm ơn!" not in ASCII (`TableInfoBanner.tsx:13,24-54`) | 🟡 | Fix copy ("hàng đợi"→"hàng chờ"), add the `delivered` branch to ASCII |
| `MonitoringTopBar` | ASCII one line: `MonitoringTopBar  ● live / ○ mất kết nối` (`customer_tracking.md:13`) | Soup icon + title "Theo Dõi Đơn Hàng" + "Bánh Cuốn" subtitle + LIVE/"Mất kết nối" pill (`MonitoringTopBar.tsx:13-39`) | 🟢 | Optional: note the title/subtitle in ASCII |
| `ConnectionErrorBanner` | ASCII `⚠ ConnectionErrorBanner (if SSE down)` (`customer_tracking.md:14`) | Fixed red bar "⚠️ Mất kết nối — đang thử lại..." (`ConnectionErrorBanner.tsx:1-7`) | 🟢 | Matches |

**Verified-matching:** the zone *inventory* (5 components), the `MonitoringTopBar` dot semantics, the
`ConnectionErrorBanner` behaviour, and the `showTable` toggle (`page.tsx:134-140`, ASCII line 16) all
match.

---

## Area 2 — Cross-Component Dataflow

**Verdict:** ✅ Accurate. `customer_tracking_crosscomponent_dataflow.md` traces the orchestrator →
prop-drill fan-out correctly (sources, return shape, derived values, per-step props). One **internal
self-contradiction**: the file narrates the `order.status` event as if it works in §2.1 + Step 5,
then correctly negates it in its own §6 gotchas.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `order.status` narration | §2.1 comment "orderStatus set by SSE event type 'order.status'"; Step 5 "BE publishes a `order.status` event… SSE wins" (`_crosscomponent_dataflow.md:112,265-277`) | The event never arrives (Flag 1); §6 of the same file (`:365-372`) correctly says so | 🟡 | Add a "(never fires — see Flag 1)" caveat to §2.1 + Step 5 to match §6 |
| Sources, return shape, prop map | page reads `activeOrderId` (`:18`), runs query (`:21-34`) + SSE (`:36-37`), merges `effectiveStatus`/`tableLabel` (`:44-45`), prop-drills to 4 widgets | All confirmed verbatim (`page.tsx:18,21-37,44-45,143-160`) | 🟢 | None |
| `activeOrderId` persist key | persisted via `STORAGE_KEYS.CART_CONFIG`, `cart.ts:153` partialize (`:183`) | `page.tsx:18` reads `useCartStore(s=>s.activeOrderId)` ✅; the exact `cart.ts:153` partialize line was **not re-opened** this run | ❓ | Re-verify the partialize line if relied upon |

**Verified-matching:** the prop tables (§1), three-layers-of-state table (§4), the cross-component vs
cross-page boundary (§5), and the sequence timeline (§7) all match the code.

---

## Area 3 — Cross-Page Dataflow

**Verdict:** ✅ Correct-by-design. There is **no** `customer_tracking_crosspage_dataflow.md`, and that
is deliberate and documented: `/tracking` is a read-only consumer that **never writes
`activeOrderId`** and hands nothing off; the cross-page lifecycle is owned by
`customer_menu_crosspage_dataflow.md` (`_crosscomponent_dataflow.md:342-359`).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `/tracking` writes `activeOrderId`? | "never writes `activeOrderId`" (`_crosscomponent_dataflow.md:354`) | `page.tsx` only reads it (`:18`); no `setActiveOrderId`/`clearCart` call in the page or its components | 🟢 | None |

**Cross-page concern (logged to TRACKER):** `customer_menu_crosspage_dataflow.md:271,284` lists
`order.status` as a real wire event — it documents the FE's *broken expectation*, not the wire. Touches
`customer_menu` + `customer_tracking`; root is the same Flag 1 mismatch (`TRACKING_BUGS.md:46-48`).

---

## Area 4 — Loading Behaviour

**Verdict:** ✅ Accurate, line-for-line. `customer_tracking_loading.md` correctly maps the 5 layers,
the 5 priority branches, the skeleton, and the partial-data states.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Skeleton bottom-nav | `❓ UNVERIFIED` whether the skeleton's `fixed bottom-0 h-14` placeholder has a live counterpart (`_loading.md:221`) | Skeleton draws it (`page.tsx:120`); the live bottom nav is the `(shop)` shell `ClientBottomNav`, not the page (`page.tsx:125-164` has only `pb-20`) — so the placeholder mimics the **shell** nav, intentional | 🟡 | Resolve the ❓: "mirrors the `(shop)` shell bottom nav" |
| 5 priority branches + skeleton + query opts | `!orderId` / `isError&&!order` / `isUnauthorized` / `isLoading&&!order` / live; `staleTime:0`, `enabled:!!orderId`, retry skips 404 | All confirmed (`page.tsx:48,69,90,111,125`; `:27,29,30-33`) | 🟢 | None |

**Verified-matching:** the route-level `(shop)/loading.tsx` spinner note, the Zustand gate, the
SSE-is-non-blocking layer, the `showBannerAfter` dead-code flag, and the partial-data state table all
match.

---

## Area 5 — FE⇄BE Data Model + Flags

**Verdict:** ✅ Accurate content; only the cited **line numbers drifted** (the BE doc was written on an
earlier branch). All 6 Flags hold against current source (BE verified by a Sonnet agent reading
`order_service.go`, `monitor_handler.go`, `main.go`, `order_handler.go`, `group_handler.go`).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Flag 1 — `order.status` mismatch | FE listens `order.status`; BE emits `order_status_changed` → badge stale | ✅ Confirmed: publishers at `order_service.go:552,:745`; `"order.status"` only in comment `monitor_handler.go:17`; FE `useOrderMonitorSSE.ts:67` | 🔴 | Code fix (1 line FE) — register in MASTER first |
| Flag 2 — `item_progress` not consumed | BE emits `item_progress`; hook has no case | ✅ `publishItemEvent` emits `"item_progress"` (`order_service.go:998-1009`); no FE case (`useOrderMonitorSSE.ts:66-89`) | 🟡 | Code fix (FE) |
| Flag 3 — position/ETA placeholders | BE sends `position:0`, `estimatedMinutes:0`; FE computes | ✅ `buildMonitorPayloads` leaves `Position`/`EstimatedMinutes` at 0 (`order_service.go:876-928`); FE computes `idx+1`, `idx*3` (`useOrderMonitorSSE.ts:75-77`) | 🟡 | Drop BE stub fields or compute server-side |
| Flag 4 — SSE no ownership check | `StreamOrderMonitor` only checks non-empty `:id` | ✅ Confirmed `monitor_handler.go:28-35`; no role/ownership gate; REST read has `ErrForbidden` guard (`order_service.go:116-119`) | 🟡 | Note asymmetry; product decision |
| Doc line numbers | routes `main.go:236`/`:334`; handler `:125-137` | Drifted: `main.go:243-249` / `:347`; handler `:125-136` | 🟢 | Refresh `_be.md` line refs |
| Object model / event table | `GET /orders/:id` → Order+items+table_name; event table maps FE cases → channels | ✅ Matches FE `types/order.ts:38-52,56-72`; handler `order_handler.go:125-136`; `extractEventType` fallback `group_updated` (`group_handler.go:87-95`) | 🟢 | None |

**Verified-matching:** auth model (both routes `authMW`, no role gate), the REST ownership guard, the
no-Redis-cache claim, the `heartbeatInterval = 15s` (`handler.go:14`), and the per-endpoint trace.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Fix Flag 1: match the publisher — `case 'order_status_changed'` sets `orderStatus` | `fe/src/hooks/useOrderMonitorSSE.ts:67` |
| 2 | 🔴 Doc fix | Redraw `OrderDetailCard` ASCII as a priced line-item list + total; drop "progress" from the Zones row | `customer_tracking.md:23-25,47` |
| 3 | 🔴 Doc fix | Redraw `WholeFloorPrepList` ASCII as status-badge rows; remove `▓▓▓▓░░` bars + the `Mang về` row | `customer_tracking.md:29-31` |
| 4 | 🟡 Code | Flag 2: add `item_progress` case (bump `itemsChangedAt`); Bug 4: wire or delete `tableStatuses`/`reconnect`/`showBannerAfter` | `fe/src/hooks/useOrderMonitorSSE.ts` |
| 4b | 🟡 Code (cleanup) | Delete the unreferenced superseded floor-queue pair (0 imports; `WholeFloorPrepList` is the live one) | `fe/src/app/(shop)/tracking/components/ServiceQueueList.tsx` + `ServiceQueueItem.tsx` |
| 5 | 🟡 Doc fix | Add "(never fires — Flag 1)" caveat to crosscomponent §2.1 + Step 5; fix `TableInfoBanner` ASCII copy + add `delivered` state | `customer_tracking_crosscomponent_dataflow.md:112,265-277` · `customer_tracking.md:18-20` |
| 6 | 🟡 Doc fix | Refresh `_be.md` line numbers (`main.go:243-249`/`:347`, handler `:125-136`); resolve the `_loading.md:221` ❓ (shell bottom nav) | `customer_tracking_be.md` · `customer_tracking_loading.md:221` |
| 7 | 🟡 Code | Flag 3: drop BE `position`/`estimatedMinutes` stub fields or compute server-side | `be/internal/service/order_service.go:876-928` |

> **CLAUDE.md rule:** doc fixes (rows 2,3,5,6) are one ALIGNed task. Each **code** change (rows 1,4,7)
> must be registered in `docs/tasks/MASTER_TASK.md` and ALIGNed **before any file is touched** — this
> audit only surfaces the drift; it fixes nothing.
