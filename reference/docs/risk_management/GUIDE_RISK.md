# GUIDE_RISK.md — How to Register & Maintain a Risk

> **Purpose:** the *process* for adding, scoring, and retiring a risk.
> The register data lives in `PROJECT_RISK_REGISTER.md` — this doc owns the *rules* for filling it.
>
> **One fact, one home.**
> - Risk data (the rows) → `PROJECT_RISK_REGISTER.md`
> - Per-change dev-risk score (blast radius of a code edit) → `RISK_MATRIX.md`
> - This doc → the registration process only.

---

## When to register a risk

Add a row the moment you can answer "what could go wrong, and would it hurt?" Triggers:

- Starting a new **phase or domain** → scan it for new risks first.
- A **near-miss or incident** (P0/P1/P2) → register the underlying risk even after the fix.
- An **assumption** you're relying on but haven't verified (e.g. "webhook is idempotent").
- A **dependency** you don't control (payment provider, Redis, VPS, single operator).
- Owner says "I'm worried about X" → that's a risk, register it.

> If in doubt, register it. A Low row costs one line. An unregistered risk costs an outage.

---

## The 6 steps to register one risk

```
IDENTIFY → SCORE → OWN → MITIGATE → CONTINGENCY → PLACE
```

1. **IDENTIFY** — write the risk as *cause → effect*, one sentence. Bad: "Payments." Good: "Payment webhook never arrives → order stuck unpaid."
2. **SCORE** — set **L** (likelihood) and **I** (impact), each Low/Med/High, using the rubric below. Read against the **operating profile** at the top of the register, not in the abstract.
3. **OWN** — assign exactly one owner (Owner / BE / FE / DevOps). "Everyone" = no one.
4. **MITIGATE** — what reduces L or I *before* it happens. Must be an action, not a hope.
5. **CONTINGENCY** — what you do *when* it happens anyway. Must be runnable mid-incident.
6. **PLACE** — drop the row in the matching priority section (High/Med/Low), give it the next `R-NN` id, set Status `Open`, add a line to the review log.

---

## Scoring rubric

### Likelihood (L)

| L | Meaning |
|---|---|
| **High** | Expected to happen in normal operation, or has already happened once. |
| **Med** | Plausible under load, edge cases, or a bad day. |
| **Low** | Needs a rare combination of events. |

### Impact (I)

| I | Meaning |
|---|---|
| **High** | Money lost/unreconciled, data lost, or system unusable during service (P0/P1). |
| **Med** | One feature degraded; staff have a manual workaround. |
| **Low** | Cosmetic, or fully self-recovering, no money/data touched (P2). |

### Priority = L × I

Use the matrix in `PROJECT_RISK_REGISTER.md`. **Work High rows first.** Don't gold-plate a Low.

> Tie-break: when unsure between two scores, pick the higher one. Under-scoring a risk is the expensive mistake.

---

## Lifecycle of a row

```
Open → Mitigating → [re-score] → Killed=Closed | Reduced=Open(lower) | Accepted=Open
                                                          (never Deleted)
```

| Status | Meaning |
|---|---|
| **🔴/🟡/🟢 Open** | Identified, not yet acted on. Colour = current priority. |
| **Mitigating** | Mitigation in progress; note the task id. |
| **Closed** | Risk **Killed** — root cause removed, can't recur. Keep the row; close date in the review log. |

**Never delete a row.** A closed risk is history that explains why a control exists.

---

## Follow-through — close the loop (the part most people skip)

Listing a risk is step one. The job is finished only when you can answer: *did the fix actually kill it?*
Open a **treatment record** in the register (`PROJECT_RISK_REGISTER.md` → Treatment log) and fill it:

1. **WHY did it happen** — root cause, not the symptom. "Webhook missed" is the symptom; "no retry on a dropped connection" is the cause. Fix the cause, not the symptom.
2. **HOW it was solved** — the concrete action + the task id that did it.
3. **VERIFY** — prove the mitigation works (a test, a restore drill, an observed reconnect). An unverified mitigation has *not* reduced the risk.
4. **DECIDE the outcome — is the risk killed or not?**

| Outcome | When | What to do |
|---|---|---|
| **Killed** | Root cause removed — it physically can't happen again. | Status → `Closed`. No residual. |
| **Reduced** | Mitigation lowered L or I but the risk still exists. | **Re-score** (lower L×I) → keep `Open` at the new priority. This is the normal case. |
| **Accepted** | Can't reduce further and the cost to try exceeds the risk. | Owner signs off → `Open (Accepted)`, monitor only. |

> **A mitigation rarely kills a risk — it usually only shrinks it.** What's left after treatment is the **residual risk**. Always re-score and record the residual; don't mark a risk Closed just because you "did something."

5. **UPDATE** — write the new L/I/Status back into the register table *and* add a line to the Review log. The register must always show current reality.

---

## Review cadence

- **Each phase boundary** — scan the new phase, add rows, re-score affected ones.
- **After every P0/P1 incident** — register the root-cause risk; re-score anything related.
- **When the operating profile changes** (deadline, scale, operator, money) — re-score every row against the new lens.
- Log every review in the register's **Review log** table (date · reviewer · change).

---

## Anti-patterns (don't do these)

| Don't | Do instead |
|---|---|
| "Payments are risky" | Name the *specific* failure: webhook lost / double-fire / refund fails. |
| Mitigation = "be careful" | A concrete action with an owner and (ideally) a task id. |
| Score in the abstract | Score against the operating profile at the top of the register. |
| Delete a fixed risk | Mark it `Closed`, keep the history. |
| One mega-row for a whole domain | One risk = one failure mode = one row. |
