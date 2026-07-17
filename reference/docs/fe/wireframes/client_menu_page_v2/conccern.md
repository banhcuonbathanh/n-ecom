# Concerns — Menu Page

> Open questions / unresolved issues. Scratchpad, not a spec. Cleaned 2026-06-08.
> Full detail + line refs live in `menu_spec.md` → "Concerns" section.

## Open

1. **`restaurant-banner.jpg` → 404.** Falls back to a gradient (works as designed). Add the real
   asset to `fe/public/` if a photo was intended.

2. **Canh product price = `0 ₫`** in the catalog. Confirm this is intentional (free / included).
   It surfaces as `—` in the "Tổng số món" Đơn giá column and is easy to miss.

3. **🚨 Toppings unselectable from the menu list.** `ProductCard.tsx` hardcodes `hasToppings = false`,
   so `ToppingModal` (fully built) is dead code on `/menu` mobile. Toppings can only be chosen on the
   product **detail** page. Decide: enable on the card, or accept detail-page-only.

4. **🚨 Toppings never rendered in "Tóm tắt đơn hàng".** `OrderSummary` shows name + filling + qty
   only; the customer cannot see *which* toppings were chosen (they still reach BE via `topping_ids`,
   and price is correct). Decide whether the summary must show toppings.

5. **⚠️ Two add paths disagree (filling vs topping).** Menu card records "nhân" as a `filling` field;
   the detail page records the same "Nhân thịt" as a **topping**. Same product from the two surfaces
   → different cart lines + different metadata. This is the unification tracked by the **TOP epic**
   (topping unification) — see git history / MASTER_TASK.

## Resolved / by-design

- **No entity-status routing on this page** — `/menu` is a catalog + cart builder; it never reads an
  order/table/payment `status`. The only status-shaped value is the `TABLE_HAS_ACTIVE_ORDER` error
  code on order-create → redirect. (Confirmed, not a gap.)
