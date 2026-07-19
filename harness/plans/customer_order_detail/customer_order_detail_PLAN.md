# Customer Order Detail — no plan here (superseded)

> **There is no page plan for `/order/:id`, by owner ruling (2026-07-19).** The route is
> **merged away**: order detail is a *view inside* the `/orders` screen. Its contract,
> components, behaviors and SSE switch live in
> [`../customer_orders_tracking/customer_orders_tracking_PLAN.md`](../customer_orders_tracking/customer_orders_tracking_PLAN.md).
>
> A full 4-doc set was drafted for this folder during F-19 and **discarded as ~90 %
> duplication** of that plan (`PAGE_PLAN_GUIDE.md §10`: cross-link, don't re-derive).
>
> **What survives is the supplement** —
> [`customer_order_detail_SUPPLEMENT.md`](customer_order_detail_SUPPLEMENT.md) — which
> owns only the three things the merge left unhomed:
> 1. 🚨 the deep-link gap (`/orders` can only be reached via client-side `activeOrderId`),
> 2. ⚠️ the dropped quantity stepper (`PATCH /orders/items/:id/quantity`),
> 3. ⚠️ the menu plan's stale post-order redirect.
>
> This stub exists only so the folder cannot be mistaken for an unfinished plan set.
> *F-19, 2026-07-19.*
