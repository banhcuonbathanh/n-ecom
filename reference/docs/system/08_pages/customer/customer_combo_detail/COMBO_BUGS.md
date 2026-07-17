# Combo Detail — Known Code Bugs (found during `/page-doc-set customer_combo_detail`)

> **TL;DR:** 2 live code bugs surfaced while tracing `/menu/combo/:id` against source on branch
> `experience_claude.md_system_1`. Both stem from the same root: the page's two catalog GETs only
> ever return **available** rows (`is_available=1`), yet the FE keeps UI paths for the unavailable
> case. These are **code** mismatches, not stale docs — the doc skill does not touch app code.
> Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-14)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [customer_combo_detail_be.md Flags 3–4](customer_combo_detail_be.md#flags).
>
> Source files: `fe/src/app/(shop)/menu/combo/[id]/page.tsx` ·
> `be/internal/db/products.sql.go` · `be/internal/service/product_service.go`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | Unavailable-combo UI ("Hết hàng" badge + disabled CTA) is unreachable — BE filters it out | 🟡 Low — dead code / misleading not-found | `/menu/combo/:id` (combo card on `/menu` is the twin pattern) | FE (or BE) |
| 2 | Unavailable/deleted sub-product renders its raw UUID as the item name | 🟠 Medium — user sees a UUID | `/menu/combo/:id` (any combo with a since-unavailable sub-item) | FE (or BE) |

---

## Bug 1 — 🟡 Unavailable-combo UI can never render

**Symptom.** A guest deep-linking to a combo that has been marked sold-out (`is_available=false`)
does **not** see the "Hết hàng" badge or the disabled "Combo tạm hết" button the page was built to
show. Instead they see **"Không tìm thấy combo."** (the not-found block) — as if the combo never
existed.

**Root cause — the BE never sends unavailable combos, so the FE's unavailable branch is dead.**
- `GET /combos` is served by `ListCombos` → repo `ListCombosAvailable`, whose SQL is
  `WHERE is_available = 1 AND deleted_at IS NULL`
  ([`products.sql.go:387`](../../../../../be/internal/db/products.sql.go#L387);
  service [`product_service.go:505`](../../../../../be/internal/service/product_service.go#L505)).
- The page resolves the combo by `rawCombos.find(c => c.id === id)`
  ([`page.tsx:31`](../../../../../fe/src/app/(shop)/menu/combo/[id]/page.tsx#L31)). For an unavailable
  combo this returns `undefined` → the page takes the `!combo` not-found branch
  ([`page.tsx:86-93`](../../../../../fe/src/app/(shop)/menu/combo/[id]/page.tsx#L86)).
- Therefore `combo.is_available` is **always `true`** for any combo that reaches render, so the badge
  ([`page.tsx:122-126`](../../../../../fe/src/app/(shop)/menu/combo/[id]/page.tsx#L122)) and the
  disabled/"Combo tạm hết" CTA
  ([`page.tsx:183-185`](../../../../../fe/src/app/(shop)/menu/combo/[id]/page.tsx#L183)) can never
  fire.

**Suggested fix (pick one, smallest first).**
- *Accept-as-is + FE cleanup:* delete the unreachable badge/disabled-CTA branches and let the
  not-found block own the sold-out case (smallest, honest with the current contract).
- *Or BE:* if the product owner wants a true "sold out" combo page, add a `GET /combos/:id` (or have
  `ListCombos` include unavailable for detail views) so the FE branch becomes reachable. Larger
  change — register as a feature, not a bugfix.

---

## Bug 2 — 🟠 Combo sub-item shows a raw UUID when its product is unavailable

**Symptom.** Opening a combo whose included dish has since been marked unavailable, the "Gồm có"
list shows a line like **"×1 7f3a9c2e-…-uuid"** instead of the dish name, and that line carries no
price.

**Root cause — sub-item names/prices are resolved by joining against `GET /products`, which excludes
unavailable products.**
- The page builds `productMap` from `GET /products`
  ([`page.tsx:33`](../../../../../fe/src/app/(shop)/menu/combo/[id]/page.tsx#L33)); that endpoint's
  repo `ListProductsAvailable` is `WHERE is_available = 1 AND deleted_at IS NULL`
  ([`products.sql.go:469`](../../../../../be/internal/db/products.sql.go#L469)).
- For each combo sub-item, the name falls back to the raw `product_id` when the map misses:
  `product_name: productMap.get(ci.product_id)?.name ?? ci.product_id`
  ([`page.tsx:45`](../../../../../fe/src/app/(shop)/menu/combo/[id]/page.tsx#L45)), and `unit_price`
  becomes `undefined` ([`page.tsx:46`](../../../../../fe/src/app/(shop)/menu/combo/[id]/page.tsx#L46)).
- So whenever a combo references a product that is currently unavailable/soft-deleted, that sub-item
  is shown by its UUID. (The combo header price still uses `combo.price`, so the total is unaffected
  — only the line label/price is wrong.)

**Suggested fix (FE, small).** Replace the UUID fallback with a neutral placeholder
(e.g. `'Món tạm hết'`) so the user never sees a UUID:
```ts
product_name: productMap.get(ci.product_id)?.name ?? 'Món tạm hết',
```
*Or BE:* expose product names directly on the `combo_items` serializer
([`product_handler.go:337-341`](../../../../../be/internal/handler/product_handler.go#L337)) so the FE
no longer needs the `/products` join at all (also removes the loading flash documented in
[customer_combo_detail_loading.md](customer_combo_detail_loading.md)). Larger change.

---

## Next step

These are not yet on `docs/tasks/MASTER_TASK.md`. Per CLAUDE.md, a fix task must be registered +
ALIGNed before any code change. Recommended first: **Bug 2** (user-visible — a UUID on screen),
a ~1-line FE change; Bug 1 is cosmetic dead-code cleanup that can be batched with it (same file).
