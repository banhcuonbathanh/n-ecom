# Working Patterns — how the AI co-developer operates

> Design your docs around these behaviors. If a doc shortens or de-risks one of these, it pays off every session.

1. **Trace the whole data path before concluding.** I don't fix the symptom page; I find the hop where data is lost. For this bug I read FE preview → checkout payload → BE service → DB → read views before saying anything.
   - *Doc lever:* a map of "data path per feature" (which file at each hop) shortens this.

2. **Verify root cause at every layer, with raw data.** Querying the actual order row in MySQL is what exposed the combo double-count — the FE story alone would have missed it.
   - *Doc lever:* documented invariants (e.g., combo pricing) let me confirm/deny faster instead of reverse-engineering from data.

3. **Let existing conventions decide the fix.** Header price = 0 because every read view already hid the header. I conform to the codebase's implicit rules rather than imposing new ones.
   - *Doc lever:* when a convention is implicit (only visible by grepping read views), writing it down turns a 4-grep investigation into a 1-read lookup.

4. **Smallest correct change; flag bigger structural fixes.** I zeroed the header (1-line semantic fix) rather than refactoring the pricing model. I flagged the discount-combo limitation rather than silently handling it.

5. **Verify at multiple levels.** unit test → `go build`/typecheck → live smoke against the running stack → DB/JSON inspection. I don't trust "it compiles."

6. **Follow the owner's process precisely.** MASTER registration before code, skill invocation for migrations, align-before-code, update status after each task. The process docs are load-bearing — I read and obey them.

7. **Parallelize independent reads.** Multiple `Read`/`Bash` calls in one turn when there's no dependency between them.

8. **Leave no mess.** Test orders created during live verification get deleted afterward.

9. **Surface discoveries instead of expanding scope silently.** The combo double-count was out of the original 3-bug scope; I reported it, explained the entanglement, and folded it into OC-2 only because OC-2 already owned `expandCombo`.

## What slows me down (the inverse — friction to remove)

- **Stale facts in docs** (e.g., "highest migration = 009"). Worse than no fact — they cost a verification step *and* erode trust in the rest of the doc.
- **Scattered, undocumented serializers/entry points.** I had to grep to discover there were 2 order-item serializers and 5 order-POST builders. The scattering itself was the bug's root cause.
- **Implicit invariants.** Anything only knowable by reading multiple files (combo header convention, cart↔contract shape) costs investigation time every session.
- **Verification friction.** Hunting for seed credentials, working around ownership checks. A "local verification cheatsheet" removes this.
- **Doc lag.** Stale branch name / "current work" in `CLAUDE.md` starts my session from a false premise.
