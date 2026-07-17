# Session Analysis — OC (Order Consistency) Epic

> **Raw data for the owner to analyze later.** Captured 2026-06-05.
> Purpose: understand how the AI co-developer works, so `docs/` + `CLAUDE.md` can be optimized to support it more efficiently.
> This folder is meta/process material — NOT curated project docs. Safe to move, archive, or delete after analysis.

## What happened this session (one-paragraph context)

The owner reported that the menu "Tổng số món" preview (pic 1) did not match the saved order page (pic 2) or the admin Overview (pics 3 & 4) — quantities, filling (Thịt/Mộc nhĩ), canh (có/không rau), and total (42.000đ vs 72.000đ) all diverged. Investigation found the menu preview promised customization the backend never stored, **plus** a pre-existing combo double-count bug. The owner chose to make the backend honor the preview (filling = real per-order attribute). The fix was registered as the **OC epic (OC-1→OC-4)** in `MASTER_TASK.md` as top priority and completed end-to-end (DB column → contract → single FE payload builder → read views), verified with unit tests + live smoke tests. Three doc improvements were then made to prevent recurrence.

## Original bug report (verbatim intent)

- Page 1: `http://localhost:3000/menu` — chose items (combo + standalone), preview showed Bánh Cuốn ×6 Thịt, canh có rau ×3 / không rau ×2, total **42.000đ**.
- Page 2: `http://localhost:3000/order/3eb5ae73-f590-4e67-8f7d-2f9870f42578` — saved order showed combo "Suất Đầy Đủ Trứng Chín" (Bánh Cuốn ×3, Canh ×1, Giò ×1, Bánh Trứng Chín ×1), total **72.000đ**, "không nhân" / "không rau".
- Pages 3 & 4: `http://localhost:3000/admin/overview` — WaitingSection + PrepPanel, showed "không nhân"/"không rau".
- Ask: "different from pic 1. please check. and ensure information cross pages consistency."

## Files in this folder

| File | Contents |
|---|---|
| `00_README.md` | This index. |
| `01_action_log.md` | **Primary raw data.** Every action Phase 0 → latest, what + why. |
| `02_working_patterns.md` | The behavioral patterns to design docs around. |
| `03_optimization_findings.md` | 8 friction points; which 3 were implemented + where. |

## Outcome summary

- **Epic OC-1→OC-4: all ✅** (see `docs/tasks/MASTER_TASK.md` §Phase OC).
- Root causes fixed: (1) `filling` never sent/stored; (2) combo contents ignored (canonical rebuild); (3) canh split only on standalone canh; (4) **pre-existing combo double-count** (header price summed with sub-items).
- Verified: 2 BE unit tests + 5 FE unit tests added; live POST→DB and GET→JSON round-trips confirmed 72k→42k and `filling` persistence.
- 3 doc improvements implemented (see `03_optimization_findings.md`).
- Not committed — left as working-tree changes for owner review.
