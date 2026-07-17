<!--
  ════════════════════════════════════════════════════════════════════════
  THIS IS A REFERENCE / GOLD-STANDARD EXAMPLE — not a live config.
  It models the 6 principles from ../CLAUDE_MD_GUIDE.md on a fictional
  "kitchen-display (KDS)" sub-area so you can compare your real CLAUDE.md
  files against a clean target. The "WHY" at the bottom explains each choice.

  Read the inline <!-- WHY: ... --> notes; they are the teaching part.
  ════════════════════════════════════════════════════════════════════════
-->

# fe/src/app/(dashboard)/kds/CLAUDE.md

<!-- WHY ① — One line of identity + the line budget, stated up front.
     A scoped CLAUDE.md declares its scope and what it is NOT allowed to hold. -->
> Tầng 1 — KDS area map only. **Does NOT contain:** business rules, hex, schema, TTLs, event payloads.
> Scope: the chef kitchen-display screen. Parent map → [../../../../CLAUDE.md](../../../../CLAUDE.md).

<!-- WHY ② — The single hard gate, before anything else. One sentence, impossible to miss. -->
> **MANDATORY before any code here:** read the `frontend-nextjs` skill index
> (`.claude/skills/frontend-nextjs/SKILL.md`), then `rules/04-rendering-and-loading.md`
> and `rules/05-forms-auth-realtime.md` (this screen is realtime).

---

## Read before code

<!-- WHY ③ — A "need X → file → section" table. Claude scans rows, not prose.
     Every row POINTS to a source; none of them RESTATE the source's content. -->

| Need | File | Section |
|---|---|---|
| WebSocket event types + reconnect config | [API_CONTRACT_v1.2.md](../../../../../docs/contract/API_CONTRACT_v1.2.md) | §10.1 |
| WS auth method (`?token=` query param, NOT Bearer) | [MASTER_v1.2.md](../../../../../docs/core/MASTER_v1.2.md) | §5.1 |
| KDS urgency color logic (10/20-min thresholds) | [MASTER_v1.2.md](../../../../../docs/core/MASTER_v1.2.md) | §2 (KDS) |
| KDS layout + card click behaviour | [Spec_4_Orders_API.md](../../../../../docs/spec/Spec_4_Orders_API.md) | FE KDS |
| What already exists (hooks/components) | [_INDEX_STATE_MANAGEMENT.md](../../../../../docs/fe/wireframes/shared/_INDEX_STATE_MANAGEMENT.md) | KDS rows |

## Architecture (strict)

<!-- WHY ④ — State the non-negotiable contract for THIS area only. Don't repeat the
     repo-wide layer rules the parent already owns; only the area-specific shape. -->

```
WS connection  → src/hooks/useWebSocket.ts        (shared hook — do not re-implement)
Card urgency   → derived at render from order.created_at, never stored
Sound alert    → Web Audio API on 'new_order'      (no external dep)
```

## Critical pointers (the traps)

<!-- WHY ⑤ — Front-load the bug-causers, imperative voice. These are the things
     a fresh session gets wrong precisely because they're counter-intuitive. -->

- WS auth uses `?token=${accessToken}` query param — browser `WebSocket` cannot set headers. (SSE is the opposite: Bearer header.)
- Show **sub-items only** on KDS cards — never render the combo header row.
- Urgency border: `<10min` default · `10–20min` `border-warning` · `>20min` `border-urgent`. Values live in MASTER §2 — do not hardcode minutes here.
- Same reconnect config as SSE: `maxAttempts=5, base=1000ms, max=30000ms`.

## Commands

```bash
cd fe && npm run dev                 # :3000 — open /kds
docker compose up -d --build fe      # after change
```

## Root context

Parent map → [../../../../CLAUDE.md](../../../../CLAUDE.md) · realtime truth → MASTER §5 · how-to → `frontend-nextjs` skill.

<!--
  ════════════════════════════════════════════════════════════════════════
  WHY THIS IS THE SHAPE TO COPY  (delete this block in a real file)
  ════════════════════════════════════════════════════════════════════════

  ① IDENTITY + NEGATIVE SPACE FIRST
     The very first lines say what the file IS (KDS map) and, crucially, what it
     is FORBIDDEN to contain. Saying "no hex / no rules / no payloads" out loud
     stops the file from slowly absorbing other docs' content over time. That
     drift is the #1 way CLAUDE.md files rot.

  ② ONE HARD GATE, UNMISSABLE
     The single most important instruction (read the skill + the 2 relevant
     rules) is a blockquote at the top, not buried in a list. If a fresh session
     reads only the first 6 lines, it still does the right thing.

  ③ POINT, NEVER RESTATE  (the "one fact, one home" principle)
     The table gives a destination for every need, but copies zero values.
     The 10/20-minute thresholds, the event payloads, the colors — all stay in
     their source file. If a threshold changes, ONE file changes. A CLAUDE.md
     that copied "10 min" would now be a second, silently-wrong source of truth.

  ④ ONLY THIS AREA'S CONTRACT
     The Architecture block does NOT repeat "server→TanStack, client→Zustand,
     forms→RHF+Zod" — the parent CLAUDE.md and the skill already own that.
     A child layer that repeats its parent doubles the maintenance and invites
     the two copies to disagree. It states only what is special about KDS.

  ⑤ TRAPS ARE FRONT-LOADED AND IMPERATIVE
     The "Critical pointers" are the counter-intuitive, bug-causing facts
     (WS uses query param not header; show sub-items not combo header). They
     earn premium space because getting them wrong is a silent bug, not a
     compile error. Each is a command ("Show sub-items only"), not a paragraph.

  ⑥ SCANNABLE > COMPLETE
     Tables, code fences, short bullets. The whole file is ~40 lines. A model
     scans it in one pass and knows: what not to touch, what to read, what
     traps exist, how to run it. Completeness lives in the linked sources;
     this file's only job is fast, correct ROUTING.

  HOW TO USE THIS FILE
     Open your real fe/CLAUDE.md next to this one and check each principle.
     Where your file copies a value, a color, or a rule that lives elsewhere —
     that's the line to convert into a pointer. The CLAUDE_MD_GUIDE.md
     "smell test" checklist is the quick version of this comparison.
  ════════════════════════════════════════════════════════════════════════
-->
