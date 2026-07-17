# RISK_MATRIX.md — Blast-Radius Risk Score

> **Purpose:** before touching code, score the *blast radius* of the action.
> The score sets how much process the task needs. Small change = just do it.
> System-wide change = mandatory ALIGN before a single line is written.
>
> **One fact, one home.** This doc owns the risk score. CLAUDE.md only points here.

---

## How to use (every task, before IMPLEMENT)

1. Score the action on the 4 axes below → write the numbers down.
2. Sum them → look up the tier.
3. Apply the tier's required procedure.
4. Put the line in your plan, e.g. `Risk: 9 → 🔴 High (Reach 4 + Rev 2 + Contract 3 + Safety 0)`.

One action = one score. If a task bundles several changes, score the **riskiest** one.

---

## The 4 axes

### Axis 1 — Reach (how far the change spreads)

| Frontend | BE | Score |
|---|---|---|
| Single component, used on **one page** | One handler, **one endpoint** | **1** |
| Shared component / hook / store used by **2–3 pages** | Service method called by **2–3 handlers** | **2** |
| Global file — `storage-keys.ts`, `api-client.ts`, root layout, design tokens (**every page reads it**) | Middleware, auth, a repository, or a **DB migration** (**whole system depends on it**) | **4** |

> Rule of thumb: *"If I get this wrong, how many screens / endpoints break?"*
> One = 1. A handful = 2. Everything = 4.

### Axis 2 — Reversibility (how hard to undo)

| Situation | Score |
|---|---|
| Pure code, one `git reset` undoes it cleanly | **1** |
| Touches shared state / config / many call sites — revert needs care | **2** |
| **DB migration, data mutation, money/order state** — cannot just `git reset` | **4** |

### Axis 3 — Contract impact (does it change a shared agreement)

| Situation | Score |
|---|---|
| Internal only — no API shape, no shared type change | **0** |
| Changes an **API contract**, shared DTO, or a type both FE & BE consume | **3** |

### Axis 4 — Safety net (is there a test catching regressions)

| Situation | Score |
|---|---|
| The touched path has passing tests | **0** |
| **No test** covers the path being changed | **2** |

---

## Score → Tier → Required procedure

| Sum | Tier | Required procedure |
|---|---|---|
| **1–3** | 🟢 **Low** | Just do it. Commit after. No checkpoint, no align needed. |
| **4–7** | 🟡 **Medium** | **Checkpoint commit** + **scope contract** (list exact files + why). Standard 7-step. |
| **8+** | 🔴 **High** | Everything in Medium **+ MANDATORY ALIGN** — show the full plan and the impacted-pages/callers list, then **wait for owner confirmation before writing any code.** Not optional. |

> Max possible = 4 + 4 + 3 + 2 = **13**.

---

## Fast lookups (these are ALWAYS High — score confirms it)

- Any **DB migration** → Reach 4 + Rev 4 = 8 before you add anything → 🔴 High.
- Editing **`storage-keys.ts` / `api-client.ts`** → Reach 4 → almost always Medium+, often High.
- Any change to **auth / JWT / RBAC middleware** → Reach 4 → High.
- Any change to an **API contract** → Contract 3 stacks on Reach → High.

---

## Worked examples

**OC-3 — single `order-payload.ts` builder wired into 3 POST paths**
- Reach: shared lib used by 3 cart paths → **2**
- Reversibility: pure code → **1**
- Contract: changes the order payload shape BE reads → **3**
- Safety: had test gaps → **2**
- **Sum = 8 → 🔴 High → mandatory ALIGN.** (Correct — it changed how every order is built.)

**Rename a label inside one KDS card component**
- Reach 1 + Rev 1 + Contract 0 + Safety 0 = **2 → 🟢 Low.** Just do it.

**Add `order_items.filling` migration (OC-1)**
- Reach 4 (migration) + Rev 4 (migration) + Contract 0 + Safety 0 = **8 → 🔴 High.** ALIGN first.

**Tweak spacing on the product-detail page only**
- Reach 1 + Rev 1 + Contract 0 + Safety 0 = **2 → 🟢 Low.**
