# Checkout — `/checkout`

> **TL;DR:** ✅ implemented · guest/customer · Order form for the **non-table** path (no QR table
> bound): order summary, name + phone (RHF + Zod), note, payment method radio, fixed submit bar.
> The QR dine-in path **skips this page entirely** — it confirms via `TableConfirmModal` on `/menu`.
> 🔮 PLANNED: this page is the natural home of the online-ordering flow (order from home,
> pickup/delivery) once customer accounts exist.
>
> Source traced from: [`../../../../../fe/src/app/(shop)/checkout/page.tsx`](../../../../../fe/src/app/(shop)/checkout/page.tsx) ·
> [`../../../../../fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`../../../../../fe/src/lib/order-payload.ts`](../../../../../fe/src/lib/order-payload.ts)
>
> Siblings: [customer_checkout_be.md](customer_checkout_be.md) ·
> [customer_checkout_crosspage_dataflow.md](customer_checkout_crosspage_dataflow.md) ·
> [customer_checkout_loading.md](customer_checkout_loading.md) ·
> [SCENARIO_CHECKOUT_ORDER.md](SCENARIO_CHECKOUT_ORDER.md) ·
> [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md)

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ [← Quay lại]  Xác Nhận Đơn Hàng                │ ← sticky header
├────────────────────────────────────────────────┤
│ ĐƠN HÀNG CỦA BẠN                               │ ← order summary card
│ 2x Bánh cuốn thịt                  70.000đ     │
│   + Chả lụa, Hành phi                          │
│ 1x Canh mọc                        10.000đ     │
│ ──────────────────────────────────────────     │
│ Tổng cộng                          80.000đ     │
├────────────────────────────────────────────────┤
│ THÔNG TIN LIÊN HỆ                              │ ← contact card (RHF+Zod)
│ [ Họ tên * ____________________ ]              │
│ [ Số điện thoại * _____________ ]              │
│ [ Ghi chú (tuỳ chọn) __________ ]              │
├────────────────────────────────────────────────┤
│ PHƯƠNG THỨC THANH TOÁN                         │ ← payment card
│ (•) 💵 Tiền mặt COD   ( ) 💳 VNPay             │
│ ( ) 📱 MoMo           ( ) 🏦 ZaloPay           │
├────────────────────────────────────────────────┤
│      [ Đặt hàng · 80.000đ ]                    │ ← fixed submit bar
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
```

Source: `page.tsx:94-216`

## Zones

| Zone | Component | Data source |
|---|---|---|
| Order summary | inline JSX in `checkout/page.tsx:108-133` | `useCartStore().items` + `formatVND` |
| Contact form | RHF + Zod (`customer_name`, `customer_phone` regex `^(0\|\+84)[0-9]{9}$`, `note`) `page.tsx:15-20` | local form state |
| Payment method | radio group (`vnpay/momo/zalopay/cash`, default `cash`) `page.tsx:24-29, 180-198` | local form → `cart.setPaymentMethod` (writes to store but **not sent to BE** — see Flags) |
| Submit bar | fixed bottom `<button form="checkout-form">` `page.tsx:203-214` | `POST /orders` via `buildOrderItemsPayload(cart.items)` |

## Key Interactions

- **Empty cart guard** — `useEffect` on mount: if `cart.itemCount() === 0` and not yet submitted → `router.replace('/menu')`. (`page.tsx:36-38`). Render also returns `null` for the same condition (`page.tsx:92`).
- **Đặt hàng** — `handleSubmit` → `submitOrder.mutate(form)`:
  1. Calls `cart.setPaymentMethod(form.payment_method)` to write the selection to the Zustand store (`page.tsx:47`).
  2. Builds payload: `{ customer_name, customer_phone, note, table_id: cart.tableId ?? null, source: cart.tableId ? 'qr' : 'online', items: buildOrderItemsPayload(cart.items) }` (`page.tsx:49-56`). Note: `payment_method` is **not** included in the POST body — it is not a field the BE accepts at order-create time.
  3. `POST /orders` → BE returns `201 { data: { id, table_busy } }` (`order_handler.go:121`).
  4. On success: fetches full order via `GET /orders/:id`, caches it in `localStorage` under `STORAGE_KEYS.ORDER_CACHE + order.id` (`page.tsx:66-70`), calls `cart.clearCart()`, then `router.replace('/order/:id')` (`page.tsx:73-75`).
  5. **Dead branch — `TABLE_HAS_ACTIVE_ORDER`:** the `onError` handler checks for this code and would redirect to `/order/:active_order_id` (`page.tsx:79-84`). However, `CreateOrder` in `order_service.go:270-275` **never returns this error** — when a table already has an active order, the service sets `tableBusy = true` and still returns `201`. `ErrTableHasActiveOrder` (`errors.go:30`) is defined but referenced nowhere in the create path. This `onError` branch is therefore dead code. See [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug #2.
  6. Other errors → `toast.error(resp?.data?.message ?? 'Đặt hàng thất bại')` (`page.tsx:86`).

## Business Logic Used

- Single order-payload builder (no hand-rolled `items[]`) → [`../../../../../fe/src/lib/order-payload.ts`](../../../../../fe/src/lib/order-payload.ts)
- Payment methods + when payment actually happens → [../02_spec/BUSINESS_RULES.md §4 Payment Rules](../02_spec/BUSINESS_RULES.md#4-payment-rules) (payment is set at cashier S5, not at order-create time)
- One active order per table: **no longer a hard block** — BE now creates a parallel order and returns `table_busy: true` informational flag. See `order_service.go:270-275` and [customer_checkout_be.md](customer_checkout_be.md).

## Object Model

This page does not own a persistent object model — it consumes cart items (owned by `useCartStore`) and produces an Order (owned by the BE). For field definitions see:

- Cart item shape → [`../../../../../fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) (`CartState`, `CartItem`)
- Order fields → [customer_checkout_be.md](customer_checkout_be.md) (POST /orders request + response)

### Flags / Known Mismatches

See full detail in [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) and [customer_checkout_be.md](customer_checkout_be.md). Summary:

1. **`payment_method` collected but never sent** — the radio group writes to `cart.setPaymentMethod` (`page.tsx:47`) and Zod validates it (`page.tsx:19`), but the field is absent from the POST payload (`page.tsx:49-56`). There is no `payment_method` column on `orders`; payment method is recorded at cashier bill-close (S5). The radio is therefore cosmetic — user selection is silently ignored. (`page.tsx:47`, `order_handler.go` — no `payment_method` binding)
2. **Dead `TABLE_HAS_ACTIVE_ORDER` branch** — `onError` at `page.tsx:79-84` checks for this error code and redirects to `/order/:active_order_id`. `CreateOrder` (`order_service.go:262`) never returns this error; a table conflict silently creates a parallel order and returns `{ table_busy: true }` in the 201 response (`order_handler.go:121`). The `ErrTableHasActiveOrder` sentinel (`errors.go:30`) is defined but unreachable on this path. The FE redirect branch never fires; the `table_busy` flag in the success response is also **not read** by `onSuccess` (`page.tsx:61-76`).
3. **Latent 403 on `GET /orders/:id` for online orders** — after a successful `POST /orders` with `source: 'online'` and `table_id: null`, `onSuccess` immediately calls `GET /orders/:id` to populate the cache (`page.tsx:67`). `GetOrder` (`order_service.go:116-119`) enforces that `customer`-role callers can only fetch orders where `o.TableID.String == callerID`. An `online` order has `table_id = NULL`, so `o.TableID.Valid` is `false`, and the check fails → 403. The cache-fetch silently falls back to the partial create response (`page.tsx:69-70`), so the order detail page may render incomplete data on first load. See [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug #3.
