# ecom-core — Harness Core for the E-commerce Project

> A portable **agent harness** built on the 10 harness-engineering primitives.
> Copy this whole folder to your new project location, rename it to your project root
> (or drop its contents into an empty repo), and start the first session.

## What this is

This is NOT application code. It is the **operating system for you + your personal AI**
to build the e-commerce project together. Every file here exists to serve one of the
10 primitives that turn a text model into a dependable co-developer:

| # | Primitive | Realized by |
|---|---|---|
| 1 | Instruction | `CLAUDE.md` — agent identity, rules, workflow |
| 2 | Context Delivery | `harness/PLAN.md` — architecture, stack, exact file map |
| 3 | Context Management | `harness/CONTEXT_MAP.md` — what to read when, what to skip |
| 4 | Tool Interface | `harness/TOOLS.md` — tools/MCP inventory + how to add one |
| 5 | Execution Environment | `harness/ENVIRONMENT.md` — sandbox, env vars, secrets rules |
| 6 | Durable State | `harness/STATE.md` — checkpoint log (resume point for any session) |
| 7 | Orchestration | `harness/TASKS.md` + `harness/PROMPTS.md` — task lifecycle |
| 8 | Sub-agents | `harness/SUBAGENTS.md` — when and how to delegate |
| 9 | Skills & Procedures | `.claude/skills/` + `harness/SKILLS.md` — reusable playbooks |
| 10 | Verification | `harness/VERIFICATION.md` — receipts, not claims |

## How to bootstrap a new project with this core

1. Copy `ecom-core/` to the new location. `git init`.
2. Open Claude Code in that folder. It reads `CLAUDE.md` automatically.
3. First session = **Session 0 (Foundation)**: together with the AI, fill in the
   `⬜ DECIDE` blocks in `harness/PLAN.md` (stack, domains, MVP scope) and
   `harness/ENVIRONMENT.md` (dev stack).
4. Register the first real tasks in `harness/TASKS.md` (E-0, E-1, …).
5. From then on, every session follows the loop in `CLAUDE.md`:
   read STATE → pick task → align → implement → verify → checkpoint.

## Folder layout

```
ecom-core/
├── CLAUDE.md              ← entry point — the AI reads this first, every session
├── README.md              ← this file
├── harness/               ← the 10-primitive working surface (one file per concern)
├── .claude/
│   ├── settings.json      ← hook wiring
│   ├── hooks/rule-reminder.sh
│   └── skills/            ← start-task · finish-task · handoff
├── templates/             ← copy-paste templates for tasks & scenarios
├── reference/docs/        ← read-only north-star corpus (restaurant platform) — cited, never edited
└── personal/              ← owner's scratch space, not project material
```

## The one rule that outranks all others

**No task is ✅ without a receipt in `harness/VERIFICATION.md`.**
A confident "it works" does not count. Build output, test output, curl transcript,
or screenshot — pick at least one, log it, then mark done.


