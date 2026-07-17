---
page: admin-overview
created: 2026-05-18
merged_by: Claude
---

# Wireframe Merge Notes — admin-overview.excalidraw

## Source Files Used

| File | Role | What it contributed |
|---|---|---|
| `admin-overview.excalidraw` (original) | Primary structure | Zone B/C layout (PrepList + ServingSection), Trạng thái ▼ button pattern, per-order card format |
| `overview.excalidraw` | Zone D detail | Full TableCard design with urgency borders, progress bar, item list, Hoàn thành/Huỷ buttons |
| `flow-admin-ordering-workflow.excalidraw` | Workflow context | ①–⑥ top strip (QR → Menu → Monitor → KDS → POS → Reports) |
| `flow-admin.excalidraw` | Reference | Admin user journey flowchart (not directly merged — content covered by workflow strip) |
| `menu_ver1_done.excalidraw` | Style reference | Confirmed color/font conventions (#f97316 orange, #1e293b dark nav, #4338ca indigo) |
| `/admin/overview` (live page) | Ground truth | Confirmed actual zone order and UX patterns on 2026-05-18 |

---

## Merged Canvas Structure

```
y=0   ── Workflow Strip (①–⑥ steps from flow-admin-ordering-workflow) ──
y=72  ── Nav Bar (dark, tabs, Live badge) ──
y=170 ── Section Header (Tổng quan sàn · Live) ──
y=224 ── Zone A — StatCards (4 cards: phục vụ / chờ / làm / khẩn) ──
y=352 ── Zone B — PrepList (Danh sách cần chuẩn bị · 4 order cards) ──
        Each card: dark header + items + [🔍 Kiểm tra] + [Trạng thái ▼]
y=808 ── Zone C — ServingSection (Đang phục vụ) ──
        Tổng cần làm summary → per-table collapsible sections
y=1390 ── Zone D — TableGrid (4 occupied + 2 available) ──
         Urgency borders: red>20min / yellow 10-20min / orange<10min / gray=empty
         TableCard: progress bar · item list · Kiểm tra · Hoàn thành · Huỷ
y=2004 ── Legend + Data Source Notes ──
```

---

## Key Design Decisions

1. **Zone B uses PrepList** (not WaitingSection from overview.excalidraw) — matches actual implementation at `/admin/overview`. The live page shows "Danh sách cần chuẩn bị" not "N bàn chờ xác nhận".

2. **Zone C uses ServingSection** (not PrepPanel) — live page shows "Đang phục vụ" as a full section below PrepList, not a conditional side panel.

3. **Trạng thái ▼ dropdown** kept from original admin-overview — actual page uses this pattern for order status changes.

4. **TableCards** use the richer format from overview.excalidraw — progress bar, mini counters (Chờ/Làm/Ra), item dots, Hoàn thành/Huỷ buttons.

5. **Canvas width: 1160px** (wider than original 900px) to fit 4 TableCards per row.

---

## What overview.excalidraw Represents

`overview.excalidraw` describes a DIFFERENT UX design (WaitingSection + PrepPanel side-by-side). It may represent:
- A future/proposed redesign of the overview page, OR
- The Spec_9 §2 spec which was not fully implemented as written

Keep `overview.excalidraw` intact as a design alternative. The merged `admin-overview.excalidraw` matches what is currently running.

---

## TODO (if wireframe needs further updates)

- [ ] Add ZoneF (WebSocket handler annotations) to bottom of canvas
- [ ] Show mobile-responsive breakpoint notes
- [ ] Annotate the 30s setInterval tick on StatCards border urgency
