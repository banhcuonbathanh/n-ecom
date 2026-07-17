# POS — `/pos`

> **TL;DR:** ✅ implemented · cashier+ (AuthGuard + RoleGuard minRole=CASHIER) · Two-pane
> point-of-sale: left = category tabs + product grid, right = current order with quantity steppers
> and total. Creating an order (source `pos`) switches to a "waiting for kitchen" screen; when the
> kitchen marks it `ready` over WS, auto-redirects to `/cashier/payment/:id`.
> 🔮 PLANNED: order on a customer's behalf (phone-less customer) — cashier creates the session
> and places the order for them from here.

---

## ASCII Wireframe

```
Main state:                                          Waiting state (after Tạo Đơn):
┌───────────────────────────────┬──────────────────┐ ┌──────────────────────────────┐
│ POS — Thu Ngân                │ Đơn hiện tại     │ │   ┌──────────────────────┐   │
├───────────────────────────────┤──────────────────│ │   │  Đơn #BC-0042        │   │
│ [Tất cả][Bánh cuốn][Đồ uống]  │ Bánh cuốn thịt   │ │   │ ⏳ Bếp đang chuẩn bị…│   │
├───────────────────────────────┤ 35.000đ [−]2[+]  │ │   │ Khi bếp hoàn thành   │   │
│ ┌───────┐┌───────┐┌───────┐   │                  │ │   │ sẽ tự chuyển sang    │   │
│ │Bánh   ││Canh   ││Trà đá │   │ Canh mọc         │ │   │ thanh toán.          │   │
│ │cuốn   ││mọc    ││3.000đ │   │ 10.000đ [−]1[+]  │ │   │                      │   │
│ │35.000đ││10.000đ││       │   │                  │ │   │ [Đến thanh toán]     │   │
│ └───────┘└───────┘└───────┘   │ (empty: "Chọn    │ │   │ [Tạo đơn mới]        │   │
│ ┌───────┐┌───────┐            │  món từ menu")   │ │   └──────────────────────┘   │
│ │ Hết   ││  ...  │            ├──────────────────│ └──────────────────────────────┘
│ │(dimmed)│       │            │ Tổng:  80.000đ   │
│ └───────┘└───────┘            │ [   Tạo Đơn →  ] │
│   (product grid, scroll)      │   Xoá đơn        │
└───────────────────────────────┴──────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Guards | `components/guards/AuthGuard` + `RoleGuard` | `useAuthStore` |
| Category tabs | `features/menu/components/CategoryTabs` (reused) | `GET /categories` |
| Product grid | inline buttons in `(dashboard)/pos/page.tsx` | `GET /products?category_id=` |
| Current order pane | inline JSX (local `PosCartItem[]` state — not the customer cart store) | local state |
| Create order | mutation | `POST /orders { source: 'pos', customer_name: 'Khách tại quán', items }` |
| Waiting card | inline JSX | WS `order_status_changed` → refetch → redirect when `ready` |

## Key Interactions

- Tap product → add/increment in the right pane (unavailable products dimmed, "Hết").
- `[−]/[+]` per line → quantity; reaching 0 removes the line. **Xoá đơn** clears the pane.
- **Tạo Đơn →** → creates POS order, toast with order number, switches to waiting state.
- Waiting state: WS push of `ready` → toast + auto `router.push('/cashier/payment/:id')`;
  manual buttons **Đến thanh toán** / **Tạo đơn mới** also available.

## Business Logic Used

- POS order source + skip-confirm behaviour → [../02_spec/BUSINESS_RULES.md §2 Order Rules](../02_spec/BUSINESS_RULES.md#2-order-rules)
- Role gate (cashier and up) → [../02_spec/BUSINESS_RULES.md §1 RBAC](../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
- WS events + shared connection → [../02_spec/BUSINESS_RULES.md §6 Realtime Config](../02_spec/BUSINESS_RULES.md#6-realtime-config)
- POS local cart (separate from customer cart store) → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (POS flow)
