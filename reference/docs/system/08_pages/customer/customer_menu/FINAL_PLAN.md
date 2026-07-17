# Customer Menu — Final Plan: All Findings & Solutions

> **Goal:** bring the `/menu` page's docs (source of truth) and code into alignment.
> **Outcome of the 2026-06-25 fresh audit:** the code is already **~90% aligned** to the new design —
> so this is mostly **doc cleanup + 3 small code fixes**, NOT a rebuild.
> **Source-of-truth precedence:** `DESIGN_PROMPT.md` (visual) wins conflicts; for code reality, the
> running code wins (audited file:line).
> Branch: `docs/customer-menu-alignment` · Date: 2026-06-25 · Full audit: [`COMPARISON_DOC_VS_CODE_DETAILED.md`](COMPARISON_DOC_VS_CODE_DETAILED.md)

---

## 0 · Owner decisions (locked)

| Decision | Choice |
|---|---|
| Note pre-fill ("Gia đình (mẹ + 2…)") | **Do NOT pre-fill** — note stays blank (it was example data). → doc fix only. |
| 2nd `RestaurantBanner` | **Remove it** — single photo header per design. |
| Dead `ToppingModal` / `ComboModal` | **Out of scope** — owner deletes later. |
| `customer_menu.excalidraw` | **Ignore** — not part of this pass. |
| Execution | Plan only for now; implement on owner's go. |

---

## 1 · Headline finding — the drift flipped

`customer_menu.md` is full of **"⚠️ NEW DESIGN — code pending rebuild"** markers that are now **stale lies**:
the rebuild is DONE. Verified rebuilt in code:

- `MenuHeader` = store-free photo banner (no pill/login/table label).
- Scroll-spy nav = `MenuCategoryNav` + `MenuSections` (replaced the old filter `CategoryTabs`, which is now the **POS** component).
- `ComboCard` nhân = multi-select (both default-on, ≥1 required) + heart.
- `CartBottomBar` = two stacked floating pills, no total.
- `OrderSummary` = spinning "Bàn 04" `running-border` ring + NO "Gọi thêm" badge + collapsible "Tổng số món" table.

**Resolved since the prior audit:** `TableConfirmModal` 201 handoff NOW calls `setActiveOrderId`
(`TableConfirmModal.tsx:51`); MenuHeader's `settings.tableLabel` read is gone.

➡️ For most zones, "reflect docs → code" would *revert good code*. The correct action is the reverse:
**fix the stale docs.** Only 3 spots need real code changes.

---

## 2 · Code changes needed (the only real code↔design gaps)

| # | Sev | Finding (file:line) | Solution |
|---|---|---|---|
| 1a | 🔴 | **Note data-loss.** `TableConfirmModal` keeps its own `const [note,setNote]=useState('')` (`TableConfirmModal.tsx:15`) and POSTs `note.trim()\|\|null` (`:23`); it never reads `cart.orderNote`. The note the customer typed in `OrderSummary` (`OrderSummary.tsx:62,300-304`, persisted) is silently dropped from the order. | Seed the modal note from the store: `useState(cart.orderNote)` (or remove the modal textarea and send `cart.orderNote` at POST). |
| 1b | 🔴 | **Heading mismatch.** `ComboSection.tsx:16` renders `<h2>Combo</h2>`, but the nav tab is `"Suất"` (`MenuSections.tsx:29`) and `DESIGN_PROMPT.md` says **"SUẤT"** — three-way inconsistency, visible. | Change the heading to `"SUẤT"` (or `"Suất"` to match the tab casing). |
| 1c | 🔴 | **Redundant 2nd banner.** `page.tsx:131` renders `<RestaurantBanner />` — a full `h-44` banner whose img `/restaurant-banner.jpg` is missing (`onError` → gradient strip, `RestaurantBanner.tsx:10-14`). Not in `DESIGN_PROMPT` (single header banner). | **Remove** `<RestaurantBanner />` from `page.tsx:131`; delete the component if unused elsewhere. |

> Per `CLAUDE.md` (MASTER-first + scope contract): each code change = its own `MASTER_TASK.md` row +
> a `checkpoint:` commit before editing + a scope contract (exact files) before any code is written.

---

## 3 · Doc fixes needed (code is right, docs are stale — one doc-only task)

| # | Sev | Doc claim | Reality (file:line) | Fix |
|---|---|---|---|---|
| 2a | 🔴 | "⚠️ NEW DESIGN — code pending rebuild" on zones C/D/E/I/J | all rebuilt | strip every stale marker in `customer_menu.md` |
| 2b | 🔴 | Zones table component = `CategoryTabs` | page renders `MenuCategoryNav` (`page.tsx:9,147-153`) | rename zone → `MenuCategoryNav` |
| 2c | 🔴 | Note pre-filled "Gia đình…" | textarea starts empty (`OrderSummary.tsx:300-304`) | remove the pre-fill claim — note starts blank |
| 2d | 🔴 | queryKey `['products', selectedCategory, searchQuery]` | `['products', searchQuery]` (`page.tsx:67`) | drop `selectedCategory` |
| 2e | 🔴 | main-content = 3 states | 5 branches incl. a distinct `searching` branch (`page.tsx:162-200`) | add the `searching` branch at priority 3 |
| 2f | 🔴 | category-empty guard `products.length===0 && !showCombos` | `products.length===0 && combos.length===0` (`page.tsx:190`) | fix the guard condition |
| 2g | 🟡 | query order categories→all→combos→products | categories→all→**products**→combos (`page.tsx:53,60,66,79`) | swap rows 3/4 |
| 2h | 🟡 | "clearCart KEEPS activeOrderId" (`customer_menu.md:269`) | clearCart only resets `items/paymentMethod/orderNote` (`cart.ts:94`); `setActiveOrderId(id)` overwrites next line | reword: not "kept", just not reset, then overwritten |
| 2i | 🟡 | refers to CART_CONFIG "v5" | persist `version:5` but key string = `'cart-config-v3'` (`storage-keys.ts:6`) | clarify version 5 vs key string |
| 2j | 🟡 | "Theo dõi" cited line 564 | actual `order/[id]/page.tsx:572` | refresh line ref |
| 2k | 🟡 | copy/layout: MiniCartStrip "Xem giỏ →" label · AddToOrderBanner copy · CartDrawer "slide-up" (slides from RIGHT) · ComboCard items inline-vs-list · casing (Combo/Canh/Yêu thích) · OrderSummary canh-gate uses `totalCanh===0` not `startsWith('canh_')` | various | align doc copy/ASCII to code |
| 2l | 🟡 | stale loading line refs (Suspense, skeleton, empty) | Suspense 224-229, skeleton 170-183, empty 184-191 | refresh line numbers |

---

## 4 · Optional 🟡 (skip unless wanted)

| # | Finding | Solution |
|---|---|---|
| 3a | FE types declare `string\|null` for `description`/`image_path`/combo `category_id`, but BE always sends `""` never `null` (`product_service.go:627-695`; `product.ts:19-20,38-46`) → `=== null` checks never fire | drop `\| null` (or send real `null` from BE) |
| 3b | `buildImageURL` defined (`product_handler.go:31-37`) but **zero call sites** — raw object path shipped | call it in serializers, or delete |
| 3c | FE `Category` omits `description`+`is_active` that BE sends (harmless today) | add optional fields only if a tab needs them |

---

## 5 · Out of scope / deferred

- Dead `ToppingModal.tsx` (0 imports) and unreachable `ComboModal` (`setModalOpen(true)` never called, `ComboCard.tsx:17,97,201-206`) — **owner deletes later**.
- `customer_menu.excalidraw` — ignored this pass.

---

## 6 · Execution order (on owner's go)

1. **Phase 1 — code** (register 3 MASTER rows + scope contracts first; checkpoint commit each):
   `1a` note seed → `1b` heading "SUẤT" → `1c` remove RestaurantBanner.
2. **Phase 2 — doc cleanup** (one doc-only task): apply all of §3 to `customer_menu.md` + `customer_menu_loading.md` + `customer_menu_crosspage_dataflow.md`.
3. **Optional** — §4 if desired.
4. (When the stack is up) capture the ⏳ pending screenshots for [`COMPARISON_VISUAL_MOCKUP_VI.md`](COMPARISON_VISUAL_MOCKUP_VI.md).

---

### Reference set (already written this audit)
- [`COMPARISON_DOC_VS_CODE_DETAILED.md`](COMPARISON_DOC_VS_CODE_DETAILED.md) — EN 5-area audit + consolidated action list
- [`COMPARISON_DOC_VS_CODE_DETAILED_VI.md`](COMPARISON_DOC_VS_CODE_DETAILED_VI.md) — VI mirror
- [`COMPARISON_VISUAL_MOCKUP_VI.md`](COMPARISON_VISUAL_MOCKUP_VI.md) — per-zone ①②③ visual mockup
- [`../../COMPARISON_TRACKER.md`](../../COMPARISON_TRACKER.md) — tracker row + cross-page concern
