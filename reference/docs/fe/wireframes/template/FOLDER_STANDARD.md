# Wireframe Folder Standard

> How to build a wireframe folder like `client_menu_page/`.
> Copy this guide before creating any new page folder.

---

## Folder Structure

```
[page_folder]/
├── [page]_wireframe_v1.md       ← Main spec (REQUIRED — always first)
├── [page].excalidraw            ← Visual wireframe file
├── [page].png                   ← PNG export of excalidraw
├── business_description.md      ← User-facing description (who uses it, why, how)
├── tech_description.md          ← Technical architecture (stack, patterns, file org)
├── how_to_use.md                ← Step-by-step guide per zone
├── conccern.md                  ← Open questions, raw notes, things not yet decided
└── recomment/
    ├── recommend.md             ← Human UX/UI review notes
    └── recomment_claude.md      ← AI analysis (UX review + architecture strategy)
```

---

## Step-by-Step: How to Build the Folder

### Step 0 — Name the folder

Use lowercase with underscores. Match the FE route if possible.

```
client_menu_page/        →  /(shop)/menu
admin_main_staff/        →  /admin/staff
client_order_page/       →  /(shop)/order
```

---

### Step 1 — Create `[page]_wireframe_v1.md` (REQUIRED first)

This is the **main spec document**. All other files refer back to it.
Copy `_TEMPLATE.md`, fill in every section.

**What to write in each section:**

| Section | What to put |
|---------|-------------|
| Frontmatter | `page`, `route`, `spec_ref`, `created`, `status` |
| `## 📐 Visual Wireframe` | ASCII box drawing of the full page. Label each zone [A], [B], [C]... Show sticky notes (← sticky top-0 z-20). Show real copy, not placeholders. |
| `## 🗺️ Zone Mapping` | One row per zone: component name, when it shows, sticky/fixed position |
| `## 📊 Data Sources` | Per zone: where data comes from (Zustand store, TanStack Query, SSE). Include query key and staleTime. |
| `## 🧩 Component Specifications` | Per zone: `Reuse?` (✅ reuse / new (local) / new (shared)) · component name · file path · props interface. **Read `shared/_INDEX_SHARING_COMPONENT.md` first** before filling this table. |
| `## 👨‍💻 Developer Implementation Details` | TypeScript interfaces for all data shapes. Query hook signatures. Store slice definition. Skip if the page is simple/static. |
| `## ⚠️ Edge Cases & Fallbacks` | One row per scenario: empty list, image fail, network offline, no permission, quantity limits |
| `## 🧪 Testing & QA Checklist` | Functional tests per zone. Edge case tests. Accessibility checks. Cross-device checks. |
| `## 📋 Task Rows` | Copy task rows from MASTER_TASK.md for this page |
| `## 📝 Changelog` | v1 date + what changed |

**Critical rules:**
- Use **real Vietnamese copy** in the ASCII wireframe, not "Button 1" or "[label]"
- Every sticky zone must show its `z-index` in the comment
- Every data source must list its query key
- Zone labels must be consistent across all 4 tables (Zone Mapping, Data Sources, Components, Testing)

---

### Step 2 — Create `[page].excalidraw`

Run `/excalidraw [page-name]` to generate the visual.

The excalidraw file is the **visual source of truth**. The `.md` spec is the **written source of truth**.
Both must agree — if they conflict, update the `.md`.

Export a PNG after every significant change:
- File name must match: `[page].png`
- Re-export whenever zones are added or removed

---

### Step 3 — Create `business_description.md`

**Audience:** End users and restaurant owner. No technical terms.

**What to write:**
- Opening: what this page does in 1 sentence, from the user's perspective
- 4–6 bullet benefits (what the user will like / what problems it solves)
- UX quality notes (mobile-first, data persistence, price transparency)
- A simple 3–4 step ordering flow in plain language

**Length:** 300–500 words. Vietnamese preferred for customer-facing copy.

**Template opening:**
```
Trang [tên trang] được thiết kế để giúp [ai] [làm gì] nhanh hơn, chính xác hơn,
và minh bạch hơn. Không cần thao tác rườm rà — mọi thứ được tối ưu cho [device/context].
```

**Do not include:** component names, API paths, TypeScript types, zone labels.

---

### Step 4 — Create `tech_description.md`

**Audience:** Developers implementing the page.

**Sections to include:**

```markdown
## Page Structure
- Number of zones (A–X) and their positioning strategy
- Conditional rendering rules (what shows/hides and when)
- Scrollable vs. fixed areas

## RBAC & Auth Rules
(REQUIRED — fill even if the page is public)

| Rule | Value |
|------|-------|
| **Route protection** | None / AuthGuard / RoleGuard([roles]) |
| **Allowed roles** | Guest · Staff · Manager · Admin · [combinations] |
| **Auth state used** | Which fields from useAuthStore / useSettingsStore are read |
| **Conditional UI by role** | Which zones/buttons are hidden or disabled per role |
| **Unauthorized redirect** | Where the user goes when auth fails (login page / QR entry / 403) |

## Tech Stack
(show as a tree)
React (Next.js App Router)
├── State: Zustand ([store names]) + localStorage persistence
├── Data: TanStack Query ([resource names])
├── Styling: Tailwind CSS ([key patterns])
└── Types: TypeScript interfaces for all components

## Key Implementation Patterns
1. Component Architecture — how components are split and why
2. State Management — store shape with TypeScript (paste the interface)
3. Data Fetching Strategy — query keys, staleTime, conditional queries
4. Performance Optimizations — debounce, optimistic updates, memoization
5. UX Enhancements — progressive disclosure, immediate feedback, a11y
6. Edge Case Handling — image fallback, network error, quantity limits

## Rendering Strategy
(REQUIRED — fill for every page. See `shared/_INDEX_RENDERING_STRATEGY.md` for pattern definitions.)

| Layer | What | Why |
|---|---|---|
| **ISR** (`revalidate: [N]s`) | [query keys prefetched in page.tsx] | Data stable across users — safe to cache |
| **RSC** | `page.tsx` only — prefetch + HydrationBoundary | [no per-user server data / OR: per-user, use Pattern C] |
| **Client** (`'use client'`) | Zones [A–X] | Zustand / localStorage / user interaction |

> Gap: [any navigation or tab-change that causes a loading wait not covered by server prefetch]

After implementing: add a row to `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md`.

## File Organization
(show as a tree — stores go in src/store/, hooks go in src/hooks/, NEVER inside page folders)

src/
├── app/[route]/
│   ├── page.tsx
│   └── components/          # local — only this page uses these
│       └── ...
├── hooks/                   # top-level shared hooks
│   └── use[Page]Queries.ts
└── store/                   # top-level stores
    └── [store].ts

## State Contract
(REQUIRED — document what this page reads, writes, and hands off)

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `use[Store]` | field names | action names | when created/cleared | what the next route reads |

## Critical Implementation Notes
- Bullet list of non-obvious constraints (UUID rules, price formatting, auto-collapse timers, sticky stack conflicts)
```

**Length:** 400–700 words. Code snippets encouraged for state shape and query keys.

**Rules that apply to every `tech_description.md`:**
- `RBAC & Auth Rules` — fill this table even for public pages (write "None" for guard, "Guest" for roles). A reader must never have to guess whether a page needs auth.
- `State Contract` — one row per global store this page touches. "Next Page" column makes inter-page handoffs explicit. Leave blank if the page is a dead end.
- `File Organization` — stores must appear under `src/store/`, hooks under `src/hooks/`. Never show them inside the page folder tree. This is enforced by `CLAUDE.md`.

---

### Step 5 — Create `how_to_use.md`

**Audience:** End users, onboarding guides, in-app FAQ.

**Structure:**

```markdown
Opening: 1 sentence on the design principle (e.g. "thao tác tại chỗ – không popup rườm rà")

## Bước 1: [Zone group name] (Zone A, B, C)
| Vùng | Chức năng | Cách dùng |
...

## Bước 2: [Zone group name] (Zone D, E, F)
...

(one ## per logical step — 4 steps is the target)

## Mẹo sử dụng & Hỗ trợ đặc biệt
| Tình huống | Cách hệ thống xử lý | Gợi ý cho khách |
...

## Luồng chuẩn [N] bước
(ASCII flow diagram)
```

**Rules:**
- Every zone from the spec must appear in at least one step
- Write in Vietnamese (customer language)
- Describe what the user SEES and DOES, not how it works internally
- The "Mẹo" table must cover: offline, reload, max quantity, empty search, accessibility

**Length:** 400–600 words.

---

### Step 6 — Create `conccern.md`

**Audience:** Owner + developer. This is a scratchpad, not a polished doc.

**What to write:**
- Open questions that came up while designing the page
- Things that are not yet decided
- Risks or edge cases you noticed but haven't resolved
- Questions to ask stakeholders before building

**Format:** Free-form. Bullet points or plain questions. No headers required.

**Examples of good concerns:**
```
- Can a user edit a submitted order? The spec says no but the UI shows an edit button.
- What happens if the kitchen rejects an item? No error state defined yet.
- Is there a maximum number of items per order? Need to check with restaurant owner.
- Zone C tabs: does "Tất cả" always appear first, or is the order configurable?
```

**Do not:** turn this into a formal spec. That belongs in the wireframe `.md`.
**Do not:** leave this empty — if you have zero concerns you haven't looked closely enough.

---

### Step 7 — Create `recomment/recommend.md`

**Audience:** Developer + designer doing a manual UX review.

**What to write:**
- UX strengths (what the current design does well — 3–5 items)
- UX recommendations table:

```markdown
| Area | Observation | Recommendation |
|------|-------------|----------------|
```

- UI & visual recommendations table (same format)
- Spec vs. image alignment check (what the doc says vs. what the excalidraw shows — gaps = action items)
- Accessibility & edge case notes
- Recommended next steps (numbered list)

**Length:** 500–800 words.
**Tone:** Structured code review, not a chat message. Use tables.

---

### Step 8 — Create `recomment/recomment_claude.md`

**Audience:** Developer team. This is Claude's analysis of the page in context of the full app.

**What to write:**
- Paste the full CLAUDE.md behavioral guidelines for this page's domain (what Claude should know before coding this page)
- Architecture strategy for this page in context of other pages:
  - Which components from this page can be reused elsewhere
  - State management strategy (global Zustand vs. page-local vs. TanStack Query)
  - Performance strategy (code splitting, image optimization, skeleton screens, prefetching)
  - Navigation and layout strategy (shared layout.tsx, scroll restoration)
- Summary checklist for implementing this page

**This file answers the question:** "If I hand this spec to Claude to implement, what does Claude need to know that isn't in the main wireframe doc?"

---

## Minimum Viable Folder (MVP)

If you are time-constrained, do Step 1 + Step 2 only. A folder with just the wireframe spec and the excalidraw/PNG is useful. The other files add depth but are not blockers.

**Priority order:**
1. `[page]_wireframe_v1.md` — required before any dev work starts
2. `[page].excalidraw` + `[page].png` — visual reference
3. `tech_description.md` — needed before a developer opens the file
4. `conccern.md` — needed before a design review
5. `how_to_use.md` — needed before user testing or onboarding
6. `business_description.md` — needed before client handoff
7. `recomment/` — needed for cross-page architecture decisions

---

## Checklist Before Marking a Folder "Done"

```
[ ] Folder name matches the route and WIREFRAME_INDEX.md entry
[ ] [page]_wireframe_v1.md — all sections filled, no [placeholder] text remaining
[ ] [page].excalidraw — exists and matches the .md zone layout
[ ] [page].png — exported and matches excalidraw
[ ] business_description.md — no technical terms, customer-readable
[ ] tech_description.md — file org tree matches actual FE structure
[ ] tech_description.md — Rendering Strategy section filled (Pattern A/B/C declared, gaps noted)
[ ] shared/_INDEX_RENDERING_STRATEGY.md — row added for this page
[ ] how_to_use.md — every zone covered, Vietnamese copy
[ ] conccern.md — at least 3 open questions documented
[ ] recomment/recommend.md — UX strengths + recommendations table filled
[ ] recomment/recomment_claude.md — shared component + state strategy written
[ ] WIREFRAME_INDEX.md — row updated with correct link
[ ] shared/_INDEX_SHARING_COMPONENT.md — all `new (shared)` components from this page registered
```
