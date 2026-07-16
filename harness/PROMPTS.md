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

### F-2 — Dev stack skeleton
```
Read CLAUDE.md + STATE.md. Do task F-2: compose stack with hello-world BE + FE and a
healthcheck endpoint. ALIGN with the exact file list before writing anything.
Receipt: `docker compose up` output + curl of the health endpoint.
```

### F-3 — DB + migration tooling + first migration
```
Read CLAUDE.md + STATE.md. Do task F-3: pick the migration tool (recommend one first),
wire it to the compose MySQL, ship the first migration, start the schema doc.
ALIGN before writing. Receipt: migrate up → down → up transcript.
```

### F-4 — Error contract + API client + CI
```
Read CLAUDE.md + STATE.md + PLAN.md §Architecture rules (error envelope is decided
there). Do task F-4: implement the envelope on one real endpoint, create the single
FE API client module, add GitHub Actions build+test on push. ALIGN first.
Receipt: curl showing the envelope + a green CI run.
```

<!-- Add one block per registered task. Delete blocks when the task is ✅. -->
