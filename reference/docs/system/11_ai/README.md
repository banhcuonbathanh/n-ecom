# AI Services — Plan (Phase 11)

> **TL;DR:** Planning home for three AI features — **menu chatbot**, **voice/chat ordering**,
> and **camera computer-vision (table occupancy)** — all powered by the **Claude API**.
> Core decision: add **one new Python FastAPI service (`ai:8000`)** behind Caddy, NOT embed AI into
> the Go BE. The Go BE stays the source of truth (auth, orders, DB); the AI service is stateless,
> calls Claude, reads the Redis menu cache, and calls back into the Go API. Nothing here is built yet
> — these are plans pending MASTER_TASK registration + owner ALIGN.
>
> Status markers: 📝 PLAN (this folder) · ⬜ not started · 🔄 in progress · ✅ done.

---

## 1. Why a Separate Service (the one decision that drives everything)

The BE is **Go/Gin** — excellent for CRUD + realtime fan-out, wrong tool for the ML/AI ecosystem.
Rather than fight that, add a lane. Your topology already supports it cleanly:

- **Caddy** routes by path prefix → add `/ai/*` → `ai:8000`. No redesign.
- **Redis pub/sub** already decouples writers from readers → CV results publish to the same channels the floor view subscribes to.
- **Docker Compose** just gains one service.
- **JWT** — the AI service validates the *same* token the Go BE issues (shared HMAC secret). No new auth system.

```
Caddy  /api/*  → be:8080      (existing Go — source of truth)
       /ai/*   → ai:8000      (NEW — Python FastAPI, owns Claude API key + prompts)
       else    → fe:3000      (Next.js)
```

**Rule that keeps the architecture intact:** the AI service NEVER touches MySQL directly. It reads
Redis (menu cache) and calls the Go REST API. The bot/CV *proposes*; **Go enforces** every business
rule (one active order per table, pricing, RBAC). AI is a front door, never an authority.

Full architecture detail → [PLAN_11-1_ai_service.md](PLAN_11-1_ai_service.md).

---

## 2. The Three Features

| Feature | Claude model | Grounding / input | Result lands in |
|---|---|---|---|
| **Menu chatbot (Q&A)** | Haiku 4.5 (cheap) | Redis `products:list` / combos / toppings | Chat widget on `/menu`, streamed via SSE |
| **Voice/chat ordering** | Sonnet 4.6 (reasoning) | Same + **tool-use** → Go `/orders` | Item in cart; Go enforces rules |
| **Camera CV (table occupancy)** | Claude vision (still frames) | Sampled frame every ~10 s | Redis `orders:admin` → floor grid |

> **⚠️ FLAG — "live camera" ≠ real-time video.** Claude vision works on **still images**. Camera CV
> here means *sample a frame every N seconds → ask Claude → status*. Great for slow signals
> (table occupied? plates left?), NOT for per-frame motion tracking (that needs a self-hosted model +
> GPU, which is out of scope per owner's Claude-API choice).

---

## 3. Sub-Task Breakdown (proposed Phase 11 — each ≈ 1 session, < 100k tokens)

| ID | Title | Files touched | AC | Plan |
|---|---|---|---|---|
| **11-1** ⬜ | Scaffold `ai/` FastAPI service + Compose + Caddy `/ai/*` | `docker-compose.yml`, `Caddyfile`, `ai/` (new) | `/ai/health` 200 via Caddy; validates Go-issued JWT | [PLAN_11-1](PLAN_11-1_ai_service.md) |
| **11-2** ⬜ | Menu chatbot Q&A (Haiku + Redis menu grounding) | `ai/`, FE chat widget on `/menu` | "có combo nào?" → grounded streamed answer | [PLAN_11-2](PLAN_11-2_menu_chatbot.md) |
| **11-3** ⬜ | Voice/chat ordering (Sonnet + tool-use → Go `/orders`) | `ai/`, FE | "cho 2 bánh cuốn thịt" → item in cart, Go enforces | [PLAN_11-3](PLAN_11-3_voice_ordering.md) |
| **11-4** ⬜ | Camera CV table occupancy (Claude vision on frames) | `ai/`, FE overview | Frame → "table N occupied" → floor grid updates | [PLAN_11-4](PLAN_11-4_camera_cv.md) |
| **11-5** ⬜ | Sync docs into handbook | `docs/system/11_ai/`, `system_data_flow.excalidraw`, this README, `00_overview/*` | Handbook self-contained; AI lane on the diagram | — |

Execution order: **11-1 → 11-2 → 11-3** (each depends on the prior), **11-4** parallel after 11-1,
**11-5** last.

---

## 4. Open Decisions (needed before building)

| # | Question | Blocks | Default if unanswered |
|---|---|---|---|
| 1 | **Camera frame source** — real IP/RTSP cam, or a phone/tablet propped at the counter running a browser? | 11-4 sizing | Browser-on-tablet (simplest; no RTSP infra) |
| 2 | Chatbot scope — Vietnamese only, or VN + EN? | 11-2 prompt | Vietnamese only |
| 3 | Where does the Claude API key live — `.env` + Compose secret? | 11-1 | `.env` (matches existing secret pattern) |

---

## 5. Not Yet Done (gates before any code)

1. Add rows **11-1 … 11-5** to [`docs/tasks/MASTER_TASK.md`](../../tasks/MASTER_TASK.md).
2. Resolve the open decisions in §4.
3. Per-task **scope contract** (exact files) shown to owner → **ALIGN** → only then code.

---

## Deep Dive Sources

| Topic | File |
|---|---|
| Current architecture + topology | [../00_overview/SYSTEM_OVERVIEW.md](../00_overview/SYSTEM_OVERVIEW.md) · [../00_overview/SCALABILITY_REVIEW.md](../00_overview/SCALABILITY_REVIEW.md) |
| Stack + ports + repo layout | [../00_overview/TECH_STACK.md](../00_overview/TECH_STACK.md) |
| Redis channels CV reuses | [../03_be/REDIS_CACHE.md](../03_be/REDIS_CACHE.md) · [../03_be/REALTIME_SSE.md](../03_be/REALTIME_SSE.md) |
| Order write path (tool-use target) | [../02_spec/API_SPEC.md](../02_spec/API_SPEC.md) · `fe/src/lib/order-payload.ts` |
| Claude API reference | `/claude-api` skill (model ids, pricing, tool-use, streaming, vision) |
