# Task Templates

> **Rule:** Copy-paste from here. Never write task rows from scratch.
> **Format rules** → `GUIDE.md` · **All tasks** → `MASTER.md`

---

## 1. Phase Header

```markdown
## Phase N — Name

> **Owner:** {BE / FE / Full / DevOps / QA}
> **Dependency:** Phase X ✅ · Phase Y ✅
> **Spec:** `docs/spec/Spec_N.md`
> **Order:** N-1 → N-2 → N-3

| Phase N Status | Sessions Left | Next task |
|---|---|---|
| ⬜ NOT STARTED | ~N | P{N}-1 |
```

---

## 2. Single Task Row (1 session — most common)

```markdown
| P7-N | {Owner} | {What to build / do — be specific about file + behaviour} | {Dep ID or —} | 1 | ⬜ | {Spec §X.Y or —} |
```

Column order: `ID | Owner | Task | Deps | Sessions | Status | AC`

---

## 3. Task with Sub-tasks (> 1 session)

Use this when a task cannot be done in 1 session (~2h). The parent row becomes a heading — no status cell on the parent.

```markdown
### P7-N — Parent Task Name

> **File:** `path/to/file.go`
> **Deps:** P7-X ✅
> **Why sub-tasks:** {reason — e.g. "6 test cases, 3 sessions total"}

| ID | Owner | Task | Deps | Sessions | Status | AC |
|---|---|---|---|---|---|---|
| P7-N.1 | {Owner} | {First deliverable} | — | 1 | ⬜ | {Spec §X or —} |
| P7-N.2 | {Owner} | {Second deliverable} | P7-N.1 ✅ | 1 | ⬜ | {Spec §X or —} |
| P7-N.3 | {Owner} | {Third deliverable} | P7-N.2 ✅ | 1 | ⬜ | {Spec §X or —} |
```

---

## 4. FE Task Row (requires spec_ref + draw_ref)

```markdown
| P9-N | FE | {Component name} — {what it renders / does} | {Dep or —} | 1 | ⬜ | `Spec_9 §X.Y` | `wireframes/page.md ZoneX` |
```

Column order: `ID | Owner | Task | Deps | Sessions | Status | spec_ref | draw_ref`

If you cannot fill `spec_ref` → spec is missing a section → flag `❓ CLARIFY` before proceeding.
If you cannot fill `draw_ref` → no wireframe exists → run wireframe step first.

---

## 5. Bug Fix Task

```markdown
| BUG-N | {Owner} | Fix: {symptom description} — root cause: {cause if known} | — | 1 | ⬜ | — |
```

If the bug spans BE + FE, use `Owner = Full` and break into sub-tasks:

```markdown
### BUG-N — {Bug title}

| ID | Owner | Task | Deps | Sessions | Status | AC |
|---|---|---|---|---|---|---|
| BUG-N.1 | BE | Fix: {BE-side fix} | — | 1 | ⬜ | — |
| BUG-N.2 | FE | Fix: {FE-side fix} | BUG-N.1 ✅ | 1 | ⬜ | — |
```

---

## 6. New Feature Task (after owner confirms + added to TASKS.md)

```markdown
### P{N}-{M} — Feature Name

> **Added:** {YYYY-MM-DD} · **Requested by:** {owner / stakeholder}
> **AC:** {What "done" looks like in one sentence}
> **Spec:** {link to spec section, or "no spec — use AC above"}

| ID | Owner | Task | Deps | Sessions | Status | AC |
|---|---|---|---|---|---|---|
| P{N}-{M}.1 | {Owner} | {Sub-task 1} | — | 1 | ⬜ | — |
| P{N}-{M}.2 | {Owner} | {Sub-task 2} | P{N}-{M}.1 ✅ | 1 | ⬜ | — |
```

---

## 7. CURRENT.md — Filled-in Example

```markdown
## Active Task

| Field | Value |
|---|---|
| **Task ID** | P7-1.1 |
| **Owner** | BE |
| **Title** | Auth tests — scaffolding + TestLogin_WrongPassword + TestLogin_RateLimitAfter5Fails |
| **Session goal** | Both login tests passing with mocked repo |
| **Branch** | feature/P7-1.1-auth-login-tests |
| **Started** | 2026-05-12 |
| **Blocked by** | — |
| **Stopped at** | — |
| **Notes** | Use testify/mock for repo layer; real Redis in test container |
```

---

## 8. Phase Status Row (for the overview table at top of MASTER.md)

```markdown
| P{N} — {Name} | {Owner} | ⬜ NOT STARTED | ~{N} | P{N}-1 |
```
