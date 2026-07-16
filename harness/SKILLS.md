# SKILLS.md — Playbooks (Primitive 9)

> Reusable checklists for recurring jobs. Before doing a recurring task, check here —
> follow the playbook, don't re-derive it. When you solve the same problem twice,
> promote the solution to a playbook here (or a full skill in `.claude/skills/`).

---

## Installed skills (slash commands)

| Skill | Use |
|---|---|
| `/start-task <desc>` | Open a task: classify → register → read routed docs → checkpoint commit → scope contract → ALIGN |
| `/finish-task <id>` | Definition-of-Done gate: AC demonstrated · receipt logged · scoped files only · STATE + TASKS updated |
| `/handoff` | End-of-session: sync STATE.md/TASKS.md, list loose ends, print resume summary |

## Playbooks (inline checklists)

### add-an-endpoint
1. Row in `TASKS.md` exists → 2. Read `PLAN.md` architecture rules + the domain's
   business rules → 3. Handler → service → repository, error envelope from the
   contract → 4. Test at service level → 5. Receipt: test output + curl transcript
   → 6. Update `PLAN.md §File map` if a new module appeared.

### add-a-migration
1. Never edit an applied migration — always a new file → 2. Write up AND down →
   3. Run up, run down, run up (round-trip proof) → 4. Regenerate query code if the
   stack generates it → 5. Receipt: migration output → 6. Update the schema summary doc.

### add-a-runtime-tool (AI feature)
1. Schema (name/description/JSON schema) → 2. Executor calling the **service layer**
   → 3. Register in whitelist → 4. Decide read vs. write; write ⇒ confirm-gated,
   no exceptions → 5. Test: happy path + rejected-unknown-tool + gate flow →
   6. Row in `TOOLS.md §Tool registry`.

### fix-a-bug
1. Reproduce first — receipt of the failure BEFORE the fix → 2. Register row if
   missing → 3. Smallest change that fixes root cause (no drive-by refactors) →
   4. Receipt of the pass AFTER → 5. Note in `STATE.md` if the bug revealed doc drift.

<!-- Promote any playbook used ≥ 3 times into a real skill folder:
     .claude/skills/<name>/SKILL.md with frontmatter (name, description). -->
