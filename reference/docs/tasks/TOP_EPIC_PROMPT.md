# TOP Epic — Orchestrator Prompt (paste into a fresh session)

> Drives all 5 TOP sub-tasks (TOP-1 → TOP-5) in one session by spawning one sub-agent per task.
> Tasks are strictly sequential (each depends on the prior contract) — never parallel.
> Epic spec lives in `docs/tasks/MASTER_TASK.md` → Phase TOP. Checkpoint already committed.

---

```
TOP epic — Topping Unification. Complete all 5 sub-tasks (TOP-1 → TOP-5) this session
by orchestrating sub-agents. You are the Opus orchestrator: you plan, verify, commit, and
update docs; sub-agents do the mechanical per-task work.

## Boot (do this yourself, once)
1. Read CLAUDE.md, docs/tasks/CURRENT_TASK.md, and the "Phase TOP" + "Phase OC" rows in
   docs/tasks/MASTER_TASK.md (OC rows show exactly what `filling` touched — your reversal map).
2. Read docs/fe/wireframes/client_menu_page/Menu_Status_Routing_Reference.md Concerns §3–5
   (why this epic exists) and scripts/seed_real_menu.sql lines 57–134 (nhân/rau are toppings
   bbbbbbbb-…0001/0002/0003, price 0, linked via product_toppings).
3. Confirm the checkpoint commit exists (git log -1). If the tree is dirty with only doc
   changes, commit them as "chore: TOP epic docs" before starting code.

## Hard rules
- Strict order: TOP-1 (BE) → TOP-2 → TOP-3 → TOP-4 → TOP-5. Each DEPENDS on the prior; never
  run them in parallel.
- After EACH sub-task: you (orchestrator) run the gate yourself —
    BE tasks:  cd be && sqlc generate && cd .. && go build ./... && go test ./be/internal/service/...
    FE tasks:  cd fe && npm run lint && npx tsc --noEmit && npm test
  Do NOT proceed to the next task until the gate is green. If a sub-agent's work fails the gate,
  send it back the failure output (SendMessage to the same agent) — don't start the next task.
- After each green gate: mark that row ✅ in MASTER_TASK.md and commit:
    git add -A && git commit -m "feat(TOP-N): <summary>"   (end with the Co-Authored-By line)
- Scope contract: each sub-agent touches ONLY the files listed for its task (from the MASTER
  TOP rows). If a sub-agent reports it must touch a file outside its list, STOP and surface it
  to me before allowing the edit.
- nhân = a REQUIRED, single-select topping group (a bánh can't be added with 0 or 2 nhân).
- canh rau = the "Rau mùi tàu" topping (TOP-5), replacing the drinkConfig veg/noveg note.

## Per-task spawning
For each sub-task spawn a general-purpose sub-agent (model: sonnet for TOP-2/3/4/5; use the
default/opus for TOP-1 because the data-migration design is the riskiest). Give each agent:
  - the exact task text + file list + AC copied from its MASTER TOP row,
  - the rule to invoke the right project skill first: TOP-1 → `backend-go` + `db-migration`;
    TOP-2/3/4/5 → `frontend-nextjs`,
  - the instruction: implement, then run its own build/typecheck, then report back a short
    summary (files changed, decisions, any deviation, build/test result). Tell it NOT to commit
    — you commit after your own gate passes.

TOP-1 (BE): migration backfilling order_items.filling → topping snapshot, then drop the
  `filling` column + chk_oi_filling; order-create contract accepts nhân via topping_ids (remove
  `filling` from CreateOrderItemInput / buildProductRow / expandCombo / orderJSON / overview
  JSON); update query/orders.sql + sqlc generate. Existing orders must still read.
TOP-2 (FE): drop `filling` from types/cart.ts + types/order.ts; order-payload.ts emits nhân as
  topping_ids only; fix order-payload.test.ts.
TOP-3 (FE): ProductCard `+` opens ToppingModal with nhân as required single-select; ComboCard
  nhân as combo topping override; remove the filling pill buttons from both.
TOP-4 (FE): OrderSummary renders toppings (drop filling badge + change the name|filling
  aggregation key to name|toppingIds); read views order/[id] DishRow, kds/page.tsx,
  PrepPanel.tsx, overview.helpers.ts show toppings.
TOP-5 (FE): canh rau → "Rau mùi tàu" topping on canh rows (OrderSummary canh block +
  order-payload.ts), replacing the veg/noveg note.

## Finish
After TOP-5 gate is green and committed:
- Set Phase TOP = ✅ COMPLETE in MASTER_TASK.md (overview row + each TOP row), clear
  CURRENT_TASK.md.
- Rebuild + smoke test the real flow: docker compose up -d --build be fe, then verify on
  http://localhost:3000/menu that selecting nhân on a card + a topping shows correctly in
  "Tóm tắt đơn hàng", and a placed order shows the topping on order/[id] and KDS.
- Print a final summary: per-task commit hashes, the migration filename, anything left ❓.

Begin with the Boot steps, then TOP-1.
```

---

## Notes
- **Cost shape:** TOP-1 on the stronger model (risky migration + data backfill); TOP-2…5 on Sonnet — matches `docs/MODEL_SELECTION.md`.
- **Graceful stop:** if the session fills before TOP-5, every completed sub-task is committed and MASTER + CURRENT_TASK stay accurate, so a follow-up session resumes from the next ⬜ row.
- **Prereq:** the "checkpoint: before TOP epic" commit must exist before running this.
