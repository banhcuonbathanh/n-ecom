# SCENARIO_TEMPLATE.md — UAT / verification scenario

> One file per user-facing flow (e.g. `scenario-checkout.md`), kept next to
> harness/VERIFICATION.md when the flow ships. Scenarios double as the UAT script
> and, for AI features, as prompt-tuning conversation scripts.

---

## Scenario: <flow name>

**Actor:** <guest / logged-in customer / admin>
**Precondition:** <data state — e.g. product X in stock, empty cart>

| # | Step (what the actor does) | Expected (what must be observable) | Pass? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

**Edge cases (each gets its own row above):**
- empty / zero-quantity input
- unauthorized actor attempts the action
- double-submit (refresh + resubmit)
- state changed underneath (product sold out between cart and checkout)

**Receipt on pass:** screenshot or transcript per ambiguous step → log in
`harness/VERIFICATION.md` under the task ID.
