# Staff Training — Cross-Page / Cross-Device Dataflow

> **TL;DR:** ✅ implemented, but a **thin** cross-page story — `/admin/training` is the **sole
> producer AND consumer** of training data. No other page or route reads `training_*` tables, there
> is **no realtime** (no SSE/WS) in this domain, and nothing is persisted client-side (no
> localStorage key; `trainingStore.ts` is dead). The only real "cross" axes are: **(1) server-DB
> persistence** (guides outlive the session) and **(2) multi-manager refetch** (eventual, not
> pushed). Source: `be/cmd/server/main.go:294-323`, `be/query/training.sql`,
> `fe/src/hooks/useTrainingQueries.ts`, `fe/src/lib/storage-keys.ts`. Page →
> [admin_training.md](admin_training.md) · BE → [admin_training_be.md](admin_training_be.md).

---

## 0. The whole picture on one diagram

```
   Browser hub (manager device)                THE WIRE                 Server hub
   ┌──────────────────────────────┐                              ┌──────────────────────────┐
   │ TanStack Query cache          │   GET …/guides (poll)        │ MySQL                      │
   │  ['training','guides',role]   │ ───────────────────────────▶ │  training_guides           │
   │  (staleTime 5 min, memory)    │ ◀─────────────────────────── │  training_guide_roles      │
   │                               │   POST/PATCH/DELETE guides   │  (training_progress —      │
   │ page-level React state        │ ───────────────────────────▶ │   never written, Bug 1)    │
   │  (lost on F5)                 │                              │  (quiz_attempts — same)    │
   └──────────────────────────────┘                              └──────────────────────────┘
        ▲ no localStorage, no persisted store          no Redis · no SSE · no WS
        └ second manager device: identical, syncs only via its own next refetch
```

There is no in-browser persistence hub (cache is memory-only) and no realtime channel — so the
server DB is the **only** durable, shared surface.

---

## 1. The status lifecycle every page renders against

A guide's only lifecycle field is `published` (draft `Nháp` vs published) plus soft-delete
(`deleted_at`). Both are server columns (`014_training.sql:13,17`). No other page renders against
this lifecycle — only Zone C of this page (`JobGuideCard.tsx:37-43`).

Progress lifecycle (`watched_percent`, quiz `passed`, `attemptsRemaining`) **exists in the schema
but is never advanced** because no API writes it (see [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 1),
so there is effectively no live progress lifecycle to render anywhere.

---

## 2. The moment of handoff — what this page leaves behind

When a manager creates/edits/deletes a guide:
- `POST /admin/training/guides` (201) inserts `training_guides` + `training_guide_roles`
  (`training_service.go:169-196`).
- `PATCH …/guides/:id` updates them; `DELETE …/guides/:id` **soft-deletes**
  (`SoftDeleteTrainingGuide`, `training.sql:30-33`) — admin-only.

What's left behind = **server rows only**. The page does **not** write any localStorage cache, URL
state, or persisted store. So the handoff is entirely server-side; the next reader is **the same
page on a later mount / another manager's tab**.

---

## 3. Downstream surfaces

### 3.1 Other pages → **none**

No other route in `fe/src` imports `training.api.ts` or `useTrainingQueries.ts` (only this page +
its own components do). There is **no staff-facing route** for an assignee to view their own guides
or progress. So training data has zero downstream page consumers today — a gap worth noting if a
"my training" staff view is ever planned (would mirror the A8/A9 "no assignee view" finding).

### 3.2 Same page, later mount

On remount/F5 the page refetches `['training','guides','all']` (staleTime 5 min) and re-derives
everything from the server. Selection/filter state does not survive (see §Reload).

---

## Multi-device sync — one tap, N screens move?

**No — there is no push.** Two managers on `/admin/training`: when manager A creates a guide,
manager B sees it only when B's `['training','guides',role]` query refetches (window refocus,
staleTime 5 min expiry, or manual reload). There is no SSE/WS in the training domain
(`main.go:317-323` registers plain REST only), so cross-device convergence is **eventual via
polling**, not real-time.

---

## Cancellation / reverse flows

Only delete (soft) — admin-only, no undo in the UI. A soft-deleted guide simply stops appearing in
`ListGuides` (`WHERE deleted_at IS NULL`). No fan-out, no reverse notification.

---

## End-to-end timeline (all pages + devices)

```
Device 1 (manager A): create guide → POST → MySQL row written
Device 2 (manager B): (no push) … later refetch → GET …/guides → sees new guide
Device 1: edit → PATCH → MySQL updated → B sees on next refetch
Device 1 (admin only): delete → soft-delete → vanishes from both on next refetch
```

---

## Reload (F5) behavior per page

| Surface | Survives F5? | Why |
|---------|--------------|-----|
| Guide list | ✅ (re-fetched) | server-derived; `useJobGuides` refetches on mount |
| Active role tab | ❌ | `activeRole` is `useState`, resets to `'all'` |
| Open modal / selected staff | ❌ | page-level `useState`, lost |
| Any progress data | n/a | never existed (Bug 1) |
| localStorage | — | no training key in `fe/src/lib/storage-keys.ts` (confirmed) |

---

## Durability matrix

| Data | Memory (cache) | localStorage | Server DB | Pushed cross-device |
|------|----------------|--------------|-----------|---------------------|
| Job guides | ✅ (5 min stale) | ❌ | ✅ `training_guides` | ❌ (refetch only) |
| Responsible roles | ✅ | ❌ | ✅ `training_guide_roles` | ❌ |
| Staff progress / quiz | — | ❌ | schema only, never written | — |
| UI selection (role, modal) | React state | ❌ | ❌ | ❌ |

---

## Source & rule map

- Routes (REST only, no SSE/WS): `be/cmd/server/main.go:294-323`
- Soft delete: `be/query/training.sql:30-33`
- Query keys + staleTime: `fe/src/hooks/useTrainingQueries.ts:14-35`
- No persistence: `fe/src/lib/storage-keys.ts` (no `train*` key) · `fe/src/store/trainingStore.ts` (dead)
- BE detail: [admin_training_be.md](admin_training_be.md) · within-page flow: [admin_training_crosscomponent_dataflow.md](admin_training_crosscomponent_dataflow.md) · bugs: [TRAINING_BUGS.md](TRAINING_BUGS.md)
