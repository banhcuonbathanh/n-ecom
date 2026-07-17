# Cleanup Log — stale / duplicated Claude docs to retire

> Tracks docs that split the "one fact, one home" rule. Status: 🔴 retire · 🟡 verify · ✅ done.
> Nothing here is deleted automatically — each needs owner sign-off before removal.

---

## 🔴 FE_DOC_INDEX vs. frontend-nextjs skill — duplicate FE systems

- **File:** [docs/fe/FE_DOC_INDEX.md](../fe/FE_DOC_INDEX.md) (508 lines, banner says **SUPERSEDED**).
- **Problem:** replaced by the `frontend-nextjs` skill, but still **linked from live maps** — [fe/CLAUDE.md](../../fe/CLAUDE.md) line 73 (`→ docs/fe/FE_DOC_INDEX.md §3`) and [docs/claude/CLAUDE_FE.md](../claude/CLAUDE_FE.md) §2 (points at it 4×). A fresh session can be sent down the dead path.
- **Fix:** repoint those links to the skill / `MASTER_v1.2.md §2` token map, then archive `FE_DOC_INDEX.md` under `docs/archive/`.
- **Owner action needed:** confirm before editing `fe/CLAUDE.md` and `CLAUDE_FE.md` (out of scope this pass).

## 🟡 docs/claude/*.docx exports — possibly stale

- **Files:** `docs/claude/CLAUDE_FE.docx`, `CLAUDE_BE.docx`, `CLAUDE_DEVOPS.docx` (+ `.md` conversions).
- **Problem:** `CLAUDE_FE.md` references `MASTER.docx` / `API_CONTRACT.docx` filenames that no longer exist (current names are `MASTER_v1.2.md`, `API_CONTRACT_v1.2.md`). Suggests the whole `docs/claude/` set predates the current naming.
- **Fix:** verify which of these is still authoritative vs. superseded by the skills + `CONTEXT_MAP.md`; archive the `.docx` originals.

## 🟡 fe/CLAUDE.md dual pointers

- **Problem:** points at **both** the new skill (lines 6–9, correct) and the superseded `FE_DOC_INDEX.md` (line 73). Ambiguous source of truth.
- **Fix:** keep the skill pointer; drop / repoint the `FE_DOC_INDEX` reference once the link above is resolved.

---

## Done

- ✅ 2026-06-07 — Created `docs/claude_system/` as the single home for Claude/context management (CONTEXT_MAP, CLAUDE_MD_GUIDE, SKILLS_REGISTRY, this log).
