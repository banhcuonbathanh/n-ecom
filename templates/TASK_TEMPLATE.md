# TASK_TEMPLATE.md — copy-paste rows for harness/TASKS.md

## Single task row

```
| <PHASE>-<n> | <verb + object, one line> | <dep ids or —> | <observable AC — what the owner can see/run to confirm> | ⬜ | |
```

Good AC examples:
- "POST /api/v1/cart returns 201 + cart body; adding same product twice merges qty"
- "Product list page renders 12 items from the API with loading + empty states"

Bad AC (rewrite before registering): "cart works" · "implement cart API" (that's the task, not the AC).

## Task with sub-tasks (3+ files or 3+ scenarios)

```
| <ID> | <parent title> — SPLIT ↓ | <deps> | all sub-tasks ✅ | ⬜ | |
| <ID>.1 | <sub-task, 1 session> | <ID prereqs> | <AC> | ⬜ | |
| <ID>.2 | ... | <ID>.1 | <AC> | ⬜ | |
```

## Bug fix row

```
| BUG-<n> | fix: <symptom> (root cause: <fill after diagnosis>) | — | repro fails before, passes after — both receipts logged | ⬜ | |
```
