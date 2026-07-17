# PLAN 11-4 — Camera CV (Table Occupancy)

> **TL;DR:** Sample a camera frame every ~10 s, send the still image to **Claude vision**, get a
> structured "which tables look occupied" answer, and publish it to the **same Redis channel the admin
> floor view already subscribes to** (`orders:admin`). NOT real-time video — Claude vision is
> still-image only. Staff-only.

---

## Goal

The `/admin/overview` floor grid shows a live **occupancy** signal per table, derived from a camera,
without anyone tapping anything.

## ⚠️ Constraint (read first)

Claude vision processes **still images**, not a video stream. This feature = *periodic frame snapshot
→ Claude → status*. Good for slow signals (occupied / empty / plates-left). NOT for motion tracking or
per-frame detection — that would need a self-hosted CV model + GPU, which is out of scope (owner chose
Claude API).

## Scope — files

| File | Change |
|---|---|
| `ai/` | `vision.py` — frame intake + Claude vision call + publish to Redis; a sampling loop/worker |
| `fe/src/app/admin/overview/...` | render the occupancy badge on the table grid (reuse existing realtime subscription) |

> Scope contract: occupancy publishes to the existing `orders:admin` Redis channel — reuse the floor
> view's current subscription; do not add a new realtime channel unless §4.1 forces it.

## Approach

1. **Frame source** (OPEN — Decision §4.1): simplest = a tablet/phone at the counter running a browser
   that POSTs a captured frame to `/ai/vision` on an interval. Alternative = an IP/RTSP cam → the worker
   pulls frames. Default to the browser-tablet path (no RTSP infra).
2. **Vision call:** send the frame + a prompt asking for a JSON list `{table_id, occupied, confidence}`.
   Map the camera's view to table ids via a small static config.
3. **Publish:** result → Redis `orders:admin` → existing SSE/WS fan-out → floor grid badge.
4. **Sampling:** ~10 s interval; staff-only JWT; skip publish when frame unchanged (cheap dedupe).

## Acceptance Criteria

- [ ] A frame with people at a table → that table shows "occupied" on the floor grid within ~15 s.
- [ ] Empty frame → "empty". No flicker on a steady scene (dedupe works).
- [ ] Endpoint rejects non-staff JWT.
- [ ] Cost sane: no calls on unchanged frames.

## Dependencies

11-1 (AI service + auth). Independent of 11-2/11-3 — can run in parallel after 11-1.

## Open Decisions

- §4.1 frame source — default browser-on-tablet. If owner wants a real RTSP cam, **split this into
  11-4a (frame intake) + 11-4b (vision + publish)** — RTSP handling is its own session.
