# How Claude works in this repo — the mental model

> Goal: you understand *why* your setup helps (or hurts), not just what files exist.
> Written 2026-06-11, based on how Claude Code actually behaves in your sessions.

---

## 1. Every session starts from zero

Claude has **no memory between sessions** of its own. When you open a new session, Claude knows:

1. Its general training (Go, Next.js, etc.) — but **nothing about your project**
2. Whatever is **auto-loaded** into the context window (see §2)

Everything else — specs, code, task status — Claude must *read during the session*, and every read costs context space. This is why your docs ARE Claude's memory. A stale doc is a false memory.

## 2. What loads automatically (you don't ask, it just appears)

| Source | When |
|---|---|
| `CLAUDE.md` (root) | every session, always |
| `fe/CLAUDE.md` / `be/CLAUDE.md` | when Claude works inside that folder |
| `~/.claude/.../memory/MEMORY.md` (the index, one line per memory) | every session |
| `.claude/settings.json` permissions | every session |
| Git status snapshot (branch, modified files, last 5 commits) | session start |
| Skill **descriptions** (one line each, not the body) | every session |

Everything in this table is paid for in tokens *before any work starts*. That's the real reason behind your own "<150 lines, map only" rule for CLAUDE.md — every extra line is a tax on **every** session.

## 3. The context window is a budget (~200k tokens)

- Think of it as RAM: CLAUDE.md + memory + conversation + every file read + every command output all share it.
- When it fills up, the session gets **compacted** (summarized). Details get lost — exactly the failure your "< 100k tokens per task" sizing rule prevents. That rule is one of the smartest things in your setup.
- Reading a 1,000-line spec "just in case" wastes budget. This is why `docs/be/be_code_summary/` (summaries instead of grepping Go source) is a genuinely good pattern: same knowledge, ~10× fewer tokens.

## 4. Skills = on-demand instructions

- At session start Claude only sees each skill's **name + description** (cheap).
- When a skill fires (you type `/dev-page`, or Claude matches the description), the full SKILL.md body is loaded **then** (expensive but only when needed).
- So: skill *descriptions* must be precise (they are the trigger), skill *bodies* can be long.
- Your 16 project skills follow this correctly — e.g. `frontend-nextjs` is a 55-line router that points to 5 rule files read per task. That is the right shape.

## 5. Memory (the `MEMORY.md` system)

- Separate from the repo: lives in `~/.claude/projects/.../memory/`.
- Only the **index** auto-loads; bodies are read when relevant.
- Right use: facts about *you* and *how you want Claude to work* (e.g. "commits are often meaningless — remind about format"). Repo facts belong in repo docs, not memory — you already split this correctly.

## 6. Permissions are exact-ish pattern matching

- `allow` / `deny` rules in `.claude/settings.json` match the **literal command shape**.
- `Bash(git log *)` matches `git log --oneline` but NOT `git -C /path log ...` and NOT compound commands (`cd X && git log`). That's why Claude sometimes gets denied for things you thought you allowed → it retries differently → friction and wasted turns.
- Implication: allow rules should be a few **general** patterns, not dozens of one-off full commands (see audit §settings).

## 7. Why your 3-tier doc system is the right architecture

```
Tier 1  CLAUDE.md            = map        → loaded always, must stay tiny
Tier 2  shared facts          = contracts  → read per concern
Tier 3  domain specs + skills = deep truth → read only for that domain
```

This matches exactly how the context budget works: pay always for the map, pay per-task for rules, pay per-domain for truth. Most users dump everything into one giant CLAUDE.md and wonder why Claude "forgets" — you avoided that. The remaining risk is **drift**: a map that points to moved/stale files is worse than no map, because Claude trusts it (see audit).

## 8. The failure modes that actually hurt you

| Failure | Mechanism | Your exposure |
|---|---|---|
| Stale CLAUDE.md | Claude trusts it blindly, acts on old status | **High** — "Current Work" section is outdated (see audit) |
| Meaningless commits | Claude reads `git log` to understand history → learns nothing | **High** — "dg", "sdgf", "dfsg" |
| Doc duplication | two homes for one fact → they diverge → Claude picks the wrong one | **Medium** — phase status lives in 2 places |
| Over-broad mandatory reading | context burned before work starts | **Medium** — 7-step + MASTER-first + specs for even tiny fixes |
| Permission misses | denied → retry → wasted turns | **Medium** — observed this session |
