# TOOLS.md — Tool Interface (Primitive 4)

> Tools let the agent **act** instead of just talk. Two layers:
> (a) dev-time tools Claude Code uses while building, and
> (b) runtime tools any AI feature inside the product exposes to its model.

---

## Dev-time tools (Claude Code)

| Tool | Use for | Rule |
|---|---|---|
| File tools (Read/Edit/Write/Glob/Grep) | all code work | prefer over shell equivalents |
| Bash | build, test, docker, git | never `git push` without owner ask |
| MCP servers | ⬜ add as connected (e.g. Playwright for browser verification) | list each with its purpose |

## Runtime tools (AI features in the product)

When the product gets an AI feature (shopping assistant, support bot), every tool follows
this pattern — proven on the restaurant chat feature:

1. **Typed schema** — name + description + JSON schema. The model requests actions;
   it never free-texts them.
2. **Whitelist** — the model can only call registered tools; unknown names are rejected.
3. **Read vs. write** — read tools (get_products, get_my_order) execute freely.
   **Write tools (create_order, cancel_order, refund) are confirm-gated:** the loop
   suspends, the human approves, then the action executes deterministically.
   This invariant may not be relaxed without owner approval.
4. **Service layer only** — tools call the same service functions as HTTP handlers.
   Never HTTP loopback, never raw SQL. Same validation, same business rules, same auth scope.

## Tool registry (runtime)

⬜ Fill when the first AI feature lands:

| Tool | Kind | Backed by | Gated? |
|---|---|---|---|
| | | | |

## How to add a runtime tool (playbook pointer)

See `SKILLS.md §add-a-tool` — schema → executor → whitelist → test → doc row here.
