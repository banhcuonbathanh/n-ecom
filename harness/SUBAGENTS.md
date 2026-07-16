# SUBAGENTS.md — Delegation (Primitive 8)

> One stream of attention per job. When a task is big and separable, delegate the
> separable part so the main session's context stays on implementation.

---

## When to delegate

| Situation | Delegate to | Why |
|---|---|---|
| Broad codebase search ("where is X handled?") | Explore agent | search noise stays out of main context |
| Deep code review of a finished diff | /code-review or a review sub-agent | reviewer needs fresh, unbiased context |
| Generating a large doc set (page docs, summaries) | general-purpose sub-agent | mechanical, high-token, separable |
| Research (library choice, gateway API docs) | sub-agent with web access | findings come back as a summary |

## When NOT to delegate

- The task IS the session's core work (implementing the feature).
- The sub-task needs decisions only the owner/main context can make.
- Anything < ~10 minutes of inline work — spawn overhead exceeds the win.

## Rules

1. A sub-agent gets a **narrow brief**: goal, exact inputs (file paths), expected
   output shape. Never "look around and improve things".
2. Sub-agent output is a **report**, not applied changes, unless the brief says otherwise.
3. The main session relays sub-agent findings into `STATE.md` if they carry decisions.

## Runtime sub-agents (in the product)

v1 AI features run **one** agent. The seam for future delegation is the tool
registry (`TOOLS.md`): a specialized flow (e.g. size-recommendation, fraud check)
plugs in as a tool with its own narrow context rather than bloating the main prompt.
