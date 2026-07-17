# Admin Combos — Code Bugs (`/admin/combos`)

> **TL;DR:** 4 code bugs the `/admin/combos` BE trace surfaced on branch
> `experience_claude.md_system_1`. These are **code** bugs (FE/BE disagree with each other or with
> clear intent), **not stale docs** — a doc edit cannot fix them; only an app-code change can. The
> `/page-doc-set` skill records them here but does **not** touch app code.
>
> Anchor: [admin_combos_be.md](admin_combos_be.md) (Flags 1, 3, 4, 5) · Decision Log entry:
> [../../07_business_logic/LOGIC_INDEX.md](../../07_business_logic/LOGIC_INDEX.md) (2026-06-18).

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|-----|----------|------------------|----------|
| 1 | Admin combo list is available-only → hidden combos unmanageable | 🟠 Med (latent) | `/admin/combos` table (cross-cuts the shared `combos:list` read used by C1/C5) | BE |
| 2 | `PATCH /combos/:id` wipes `image_path` + `category_id` every edit | 🟠 Med (latent) | combo row data integrity | BE |
| 3 | Combo item inserts are non-transactional & swallow FK errors | 🟡 Low | create/edit can persist a partial/empty combo, still 2xx | BE |
| 4 | `POST /combos` validation looser than `PATCH` (free / itemless combo) | 🟡 Low | API accepts price=0 / 0-item combo | BE |

---

## Bug 1 — Admin management list shows only `is_available=1` combos

**Symptom.** The `/admin/combos` table is meant to manage **all** combos, but it can only ever
display available ones. If a combo's `is_available` were ever `0`, it would disappear from the
management table entirely — no way to edit it, re-enable it, or delete it from the UI.

**Root cause.** The service method `ListCombos` calls the **available-only** repo query
`ListCombosAvailable` (`WHERE is_available=1 AND deleted_at IS NULL`):
- [be/internal/service/product_service.go:505](../../../../../be/internal/service/product_service.go#L505) — `s.repo.ListCombosAvailable(ctx)`
- [be/query/products.sql:112-115](../../../../../be/query/products.sql#L112) — the available-only filter

There **is** an unfiltered query, [`ListCombos` at products.sql:107-110](../../../../../be/query/products.sql#L107)
(all non-deleted combos), but **nothing calls it** — it is dead code. Unlike products, which expose
a manager-only `GET /products/all`→`ListProducts` (unfiltered) for management
([main.go:173](../../../../../be/cmd/server/main.go#L173)), combos have **no "all" endpoint** — the
admin page reuses the public `GET /combos`
([main.go:216](../../../../../be/cmd/server/main.go#L216)).

**Why it's only latent today:** no UI or API path sets a combo `is_available=0` (see Bug-adjacent
Flag 2 in the anchor — `CreateCombo` hardcodes `1`, `UpdateCombo` never touches it, no toggle
exists). So in practice all combos are available and visible. The defect is the *wrong query wired
to the management list* + the dead correct query.

**Suggested fix (BE).** Either (a) point the admin management list at the existing `ListCombos`
(all) query — e.g. add a `GET /combos/all` (manager+) mirroring `/products/all`, and keep public
`GET /combos` on `ListCombosAvailable`; or (b) if combos will never be hideable, delete the dead
`ListCombos` query to remove the ambiguity. Decide alongside Bug-adjacent Flag 2 (whether combos
should be hideable at all).

---

## Bug 2 — `PATCH /combos/:id` nulls `image_path` and `category_id` on every edit

**Symptom.** Editing any combo silently erases its image and its category association, even if the
manager only changed the name or price.

**Root cause.** The update path drops both columns:
- Handler binds `updateComboRequest` with **no `image_path` and no `category_id` field**
  ([be/internal/handler/product_handler.go:400-406](../../../../../be/internal/handler/product_handler.go#L400)).
- Service `UpdateCombo` reads `in.CategoryID` (always `""` → `sql.NullString{}` → NULL) and builds
  a `db.UpdateComboParams` that **omits `ImagePath`** (zero-value NULL)
  ([be/internal/service/product_service.go:595-610](../../../../../be/internal/service/product_service.go#L595)).
- The SQL sets both regardless:
  [be/query/products.sql:132-135](../../../../../be/query/products.sql#L132)
  (`SET category_id = ?, … image_path = ?`).

The publisher (handler) never supplies these values; the consumer (SQL) overwrites them with NULL.
`in.CategoryID` on `UpdateComboInput` is a **dead parameter** — wired in the service but never set
by the handler. (`POST` has the same omission on the FE form, but `CreateCombo` at least *accepts*
`image_path`/`category_id` in its request struct, so create is not lossy by construction.)

**Why it's only latent today:** the FE combo form has no image-upload and no category selector, so
combos created through this UI carry neither — there is nothing to wipe. The bug bites if a combo's
image/category is ever set by seed data or a future UI.

**Suggested fix (BE).** Add `image_path` and `category_id` to `updateComboRequest`, thread them into
`UpdateComboInput`, and include `ImagePath` in the `UpdateComboParams` — or change the SQL to a
COALESCE/partial update so omitted fields are preserved rather than nulled.

---

## Bug 3 — Combo item inserts are non-transactional and swallow errors

**Symptom.** A create or edit can report success (`201`/`200`) while silently persisting a combo
with missing or zero items.

**Root cause.** Both write paths loop `CreateComboItem` and only log on failure — the error is
never returned and the outer write is never rolled back:
- create: [be/internal/service/product_service.go:561-565](../../../../../be/internal/service/product_service.go#L561)
- update: [be/internal/service/product_service.go:616-620](../../../../../be/internal/service/product_service.go#L616)

The combo header insert and the item inserts are separate statements with no surrounding
transaction, so a FK violation on a bad `product_id` drops that item while the header survives.

**Suggested fix (BE).** Wrap the header + item writes in a single DB transaction and return the
item-insert error (mapped to `400`/`409`) instead of `slog.Warn`-and-continue.

---

## Bug 4 — `POST /combos` validation is looser than `PATCH`

**Symptom.** The API will accept a combo with **price 0** and/or **zero items** on create, even
though edit forbids it.

**Root cause.** Binding asymmetry:
- `createComboRequest`: `price` `binding:"required,min=0"`, **`items` has no min**
  ([be/internal/handler/product_handler.go:359-365](../../../../../be/internal/handler/product_handler.go#L359)).
- `updateComboRequest`: `price` `binding:"min=1"`, **`items` `binding:"required,min=2"`**
  ([be/internal/handler/product_handler.go:401-405](../../../../../be/internal/handler/product_handler.go#L401)).

The FE enforces ≥2 items for both before submit
([combos/page.tsx:173-176](../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L173)), so
the gap is only reachable by a direct API call — but it means server-side invariants for a "combo"
are inconsistent.

**Suggested fix (BE).** Make `createComboRequest` match: `price min=1` and `items required,min=2`.

---

## Next step

These bugs are **not** yet on [`docs/tasks/MASTER_TASK.md`](../../../../tasks/MASTER_TASK.md). Per
CLAUDE.md a fix must be **registered + ALIGNed** before any code change. Recommended first: **Bug 1**
(decide combo hideability + wire the correct list query) since it also resolves Flag 2 and removes
the dead `ListCombos` query — and **Bug 2** rides along in the same combo-write touch-up. Bugs 3–4
are low-severity hardening that can batch with them.
