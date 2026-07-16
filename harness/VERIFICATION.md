# VERIFICATION.md — Receipts (Primitive 10)

> Evidence, not claims. Nothing in `TASKS.md` becomes ✅ without a row here.
> A receipt is something the owner can re-run or look at: build output, test output,
> a curl transcript, a screenshot. "It works" is not a receipt.
> Scrub tokens/secrets before pasting transcripts.

---

## Receipt types (pick at least one per task)

| Type | Good for | Minimum content |
|---|---|---|
| Build | any code change | the actual command + exit-clean output |
| Test | logic | command + pass summary (paste failures in full if any) |
| Curl transcript | endpoints | request + response body (status visible) |
| Screenshot | UI | file path or embedded image; state shown must match the AC |
| Migration round-trip | schema | up → down → up output |

## Log (newest on top)

<!-- TEMPLATE:

### <TASK-ID> — <title> · YYYY-MM-DD
**AC:** <copy from TASKS.md>
**Receipt:**
```
<command>
<output>
```
**Verdict:** AC met — marked ✅ in TASKS.md.

-->

### F-1 — Session 0: decide stack + MVP domains, fill PLAN.md · 2026-07-16
**AC:** No `⬜ DECIDE` left in PLAN.md §Stack/§Domains
**Receipt:**
```
$ grep -cn "DECIDE" harness/PLAN.md harness/ENVIRONMENT.md
harness/ENVIRONMENT.md:0
harness/PLAN.md:0
(grep exit=1 — no matches)
```
Decisions (owner-confirmed via Q&A): Go 1.25+Gin+sqlc+MySQL 8+Redis · Next.js App
Router+TS strict+Tailwind stack · Compose+Caddy+GH Actions · Payment/Admin/AI deferred ·
v1 = Catalog/Cart/Checkout/Orders/Accounts · nested error envelope · git init'd
(root commit `0b727a8`, branch `main`). Phases 1–4 broken into C-1…5, CC-1…5,
O-1…3, A-1…3 in TASKS.md.
**Verdict:** AC met — marked ✅ in TASKS.md.
