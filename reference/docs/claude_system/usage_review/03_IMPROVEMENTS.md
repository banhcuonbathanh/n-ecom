# Improvements — ordered by payoff

> P1 = do this week, big payoff · P2 = do soon · P3 = nice to have.
> Each item maps to a finding in [02_AUDIT.md](02_AUDIT.md).

---

## P1-1 · Fix commit messages (audit B1)

**Rule:** every commit follows `type(scope): what changed` — types: `feat | fix | docs | chore | checkpoint | refactor | test`.

```
feat(orders): add filling column to order_items        ✅
checkpoint: before OC-3 payload builder                ✅
dg                                                     ❌
```

**Make it stick (pick one):**
- *Lightest:* let Claude write every commit message — you already allow `Bash(git commit *)`; just stop typing messages yourself and say "commit this".
- *Enforced:* add a `commit-msg` git hook that rejects messages shorter than 10 chars or not matching the pattern. Ask Claude: *"add a commit-msg hook that enforces type(scope): subject"* — 10-minute task.

## P1-2 · Make CLAUDE.md honest again (audit B2)

1. Delete the **"Current Work"** section entirely — that fact's home is `docs/tasks/CURRENT_TASK.md` (which CLAUDE.md already orders Claude to read at step 2). Duplicating it guarantees drift.
2. Replace the **Phase Status table** with one line: *"Phase status → docs/tasks/MASTER_TASK.md (single source)."*
3. These two cuts bring the file from 251 lines back under its own 150-line rule — no other content needs to change.
4. Add one line to the `/handoff` skill checklist: *"If CLAUDE.md mentions any status/branch, verify it or delete the mention."*

## P1-3 · Add a small-task fast path (audit B3)

Add one block to CLAUDE.md (3 lines, fits after the cuts above):

> **Fast path** — task touches ≤ 2 files, no new behavior contract (typo, copy change, style tweak, doc fix):
> skip MASTER row and ALIGN; still do checkpoint commit + self-review. When unsure → full process.

This makes the written process match reality, so the heavy process regains authority for the tasks that need it.

## P2-1 · Clean `.claude/settings.json` allowlist (audit B4)

- **Delete** the ~10 one-shot full-command entries (excalidraw python one-liners, specific DSN test commands, the single curl, mkdir).
- **Replace** with a few general patterns you actually want always-allowed, e.g. `Bash(go test *)`, `Bash(go build *)`, `Bash(npm run *)`, `Bash(docker compose logs *)`, `Bash(wc *)`, `Bash(git log *)`, `Bash(git branch *)`.
- **Review** `Bash(python3)` / `Bash(python3 -c ' *)` — broader than intended; scope to what you really run.
- *Shortcut:* run `/fewer-permission-prompts` — it scans transcripts and proposes the allowlist for you.

## P2-2 · Repo hygiene, automated at session close (audit B5)

- Add to `.gitignore`: `fe/tsconfig.tsbuildinfo`, `*.png` at repo root (or move audit screenshots into `docs/**/screenshots/`). Untrack the tsbuildinfo (`git rm --cached`).
- The `/handoff` skill should end with: `git status` must be clean or every dirty file explained in the handoff note. (Memory `feedback_session_close` already wants this — encode it in the skill so it survives sessions.)

## P2-3 · Retire superseded docs for real (audit B6)

- Move `docs/fe/FE_DOC_INDEX.md` (and anything else CLEANUP_LOG lists as superseded) into `docs/archive/`. A warning note in CONTEXT_MAP is a patch; moving the file is the fix — Claude can't accidentally read what isn't there.
- Delete the duplicate `hand-off` personal skill (keep the project `handoff`).
- Update CONTEXT_MAP: `be/CLAUDE.md` exists now; refresh the "reflects 2026-06-07" stamp when touched.

## P3-1 · Branch names (audit B7)
Follow your own convention; current branch `experience_claude.md_system_1` → would be `chore/claude-md-system`. Low cost: just name the next branch correctly.

## P3-2 · Drift check cadence
You already own the right tool: `/doc-check`. Run it once a week (or first session after a multi-session push). Optional: `/schedule` a weekly cloud run of it.

---

## What NOT to do

- **Don't add more process.** Your bottleneck is discipline on the existing rules, not missing rules. Every new "no exceptions" block that gets exceptions in practice weakens all the others.
- **Don't grow CLAUDE.md.** Anything you're tempted to add there has a tier-2/tier-3 home; add a pointer at most.
- **Don't create more doc folders** until CLEANUP_LOG items are actually retired — sprawl is already the trend to reverse.
