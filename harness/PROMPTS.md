# PROMPTS.md — Session Kickoff Prompts (Primitive 7)

> One prompt = one fresh session = one task. The owner copies the next prompt to start
> a session; the AI keeps this file topped up with a ready prompt for each remaining task.

---

## Standing prompt (works for any task)

```
Read CLAUDE.md, then harness/STATE.md and harness/TASKS.md.
Pick up task <ID>. Follow the loop: READ → PLAN → ALIGN (wait for me) →
IMPLEMENT → SELF-REVIEW → VERIFY (receipt) → CHECKPOINT.
```

## Queued prompts

### F-1 — Session 0: Foundation decisions
```
Read CLAUDE.md and harness/PLAN.md. Walk me through every ⬜ DECIDE block one at a
time — give me your recommendation with a one-line reason, let me confirm or override.
Then write the decisions into PLAN.md + ENVIRONMENT.md, break Phases 1–4 into
session-sized tasks in TASKS.md, and checkpoint STATE.md.
```

### F-2 — Dev stack skeleton
```
Read CLAUDE.md + STATE.md. Do task F-2: compose stack with hello-world BE + FE and a
healthcheck endpoint. ALIGN with the exact file list before writing anything.
Receipt: `docker compose up` output + curl of the health endpoint.
```

<!-- Add one block per registered task. Delete blocks when the task is ✅. -->
