---
page: <Page Name> (<one-line role>) — VISUAL SHORT SPEC v<N>
route: <app-router path, e.g. /(shop)/menu/page.tsx>
created: <YYYY-MM-DD>
status: companion to <canonical_spec.md> (canonical) — diagram-first summary
reads_with: ./<canonical_spec.md>   # full as-built detail lives there
supersedes: ./<previous_visual.md>   # delete this line if first version
---

# <Page Name> — v<N> Visual Spec (the short one)

> **Read this to *understand* the page in 5 minutes.** For exact classes, props, line
> numbers and payloads → [<canonical_spec.md>](./<canonical_spec.md>) (canonical).
>
> **What the page is:** <1–2 sentences. Who arrives here and how, what they do, and the
> ONE primary outcome. State plainly whether the page reads, writes, or both.>

> **Changed from v<N-1> (<YYYY-MM-DD>):**   <!-- delete this whole block if first version -->
> - <what changed and why — point to the epic/commit that drove it>
> - <removed / renamed / added — be specific so a reader diffs mentally in seconds>

---

## 1 · Component Map

<!-- One paragraph: which file is the dumb shell, which is the "brain" (owns queries +
     page state), and the golden rule for how zones communicate. -->
`<page.tsx>` is just a shell. `<BrainComponent>` is the brain: it runs the BE queries, holds
page state, and hands data down to dumb zone components. **Zones never talk to each other.**

```
<TopComponent> (page.tsx)            ← <Suspense> shell only
└── <BrainComponent>                 ← BRAIN: N queries + page state, composes all zones
    │
    ├─ <Zone> ................ A      <one-line role · key behaviour>
    ├─ <Zone> ................ B      <...>
    ├─ <Zone> ................ C      <...>
    │   └─ <ChildCard> ×N
    ├─ <Zone> ................ modal  <slide-in / dialog>
    └─ <Zone> ................ modal  <the ONE write, if any>
```

> **Not on this page:** <components that live in this feature folder but are NOT imported
> here — say where they ARE used and what they share (same store action, etc.). Delete if none.>

**The golden rule:** a <card/zone> writes to a **store**; every component subscribed to that
store re-renders automatically. No zone-to-zone calls, no event bus, no context.

```
   <WriterComponent>
            │ <action()>
            ▼
      ┌─────────────┐   set() re-renders ALL subscribers in one tick
      │ <useStore>  │ ───────────────────────────────────────────────┐
      └─────────────┘                                                 │
        │        │            │             │            │            │
        ▼        ▼            ▼             ▼            ▼            ▼
   <SubscriberA> <SubscriberB> <SubscriberC> <...>      <...>       <...>
```

---

## 2 · Shared Components (reuse before you build)

> Registry: [`../shared/_INDEX_SHARING_COMPONENT.md`](../shared/_INDEX_SHARING_COMPONENT.md)

```
ALREADY SHARED (used here)          OWNED here but reusable           SHOULD reuse (drift)
┌────────────────────────┐         ┌────────────────────────┐       ┌──────────────────────┐
│ <Button (ui atom)>     │         │ <ComponentA>           │       │ <ComponentX — why it │
│ <EmptyState (shared)>  │         │ <ComponentB · ...>     │       │  duplicates a shared │
└────────────────────────┘         └────────────────────────┘       │  atom>               │
                                                                     └──────────────────────┘
```

⚠️ <Any styling/a11y drift worth flagging — e.g. raw Tailwind vs design-system atoms.
   Delete if nothing to flag.>

---

## 3 · Loading Strategy

```
<COLD VISIT (Pattern A = ISR+RSC prefetch | Pattern B = full client)>

  blank ──► skeleton ──► content
            (animate-pulse)
            <skeleton shape per breakpoint>

  inside <main>, mutually-exclusive branches:
  ┌──────────────────────────────────────────────┐
  │ isError  → <error UI + retry>                  │
  │ loading  → skeletons                           │
  │ empty    → <EmptyState>                         │
  │ else     → <content zones>                      │
  └──────────────────────────────────────────────┘
```

<!-- If the documented pattern and the actual code disagree, flag it: -->
🚨 **DRIFT:** <claimed pattern vs actual> → <user-visible symptom>. Fix = <one line>.
<!-- Delete the DRIFT block if there is none. -->

---

## 4 · Local Data Management (in-page state)

Two layers only. **Global mutable → Zustand. Page-local UI → `useState` in the brain, props down.**

```
GLOBAL (Zustand, any zone subscribes directly)
┌────────────────┬──────────────────────────────────────────────┐
│ <useStoreA>    │ <fields it owns that this page touches>        │
│ <useStoreB>    │ <...>                                          │
└────────────────┴──────────────────────────────────────────────┘

PAGE-LOCAL (useState in the brain → passed by props)
┌────────────────┬──────────────────────┬───────────────────────┐
│ <stateVar>     │ <what it controls>    │ <which zones read it> │
│ <stateVar>     │ <...>                 │ <...>                 │
└────────────────┴──────────────────────┴───────────────────────┘
```

<Note any form lib (RHF/Zod) usage — or state plainly that there is none and why.>

### 4a · Inside `<useMainStore>` — the page's most important store   <!-- optional: keep only if one store dominates -->

```
<useMainStore>  (store/<file>.ts)
├── <field>: <type> ......... <role · who writes it>
├── <field> ................. <...>
└── <field> ................. <...>
```

> ⚠️ <any non-obvious migration / legacy-key / persistence gotcha. Delete if none.>

### 4b · What a <writer> GIVES to `<action()>`   <!-- optional: keep for write-heavy pages -->

```jsonc
{
  "<id>":   "<identity rule — what makes two entries distinct vs merge>",
  "<field>": "<value · who computes it, the store or the caller>"
}
```

- **`<id>`** = <identity rule>.
- **`<computedField>`** = <who computes it and from what>.

### 4c · What `<action>` DOES with it   <!-- optional -->

```
<action>(item):
   <condition>?
   ├─ YES → <merge/bump behaviour>
   └─ NO  → <append/insert behaviour>
```

| Who | Does what |
|---|---|
| **the <writer>** | <responsibility> |
| **`<action>`** | <responsibility> |
| **`<derived>()`** | <derived-on-read values — never stored> |

⚠️ <data-integrity risk if two surfaces build identity differently. Delete if N/A.>

---

## 5 · Cross-Page Data (what survives, what doesn't)

State split by **lifetime** across stores + localStorage:

```
┌────────────┬──────────────────┬─────────────────────────────────────────┐
│ store      │ localStorage      │ persisted?                                │
├────────────┼──────────────────┼─────────────────────────────────────────┤
│ <storeA>   │ <key (version)>   │ <FULL | PARTIAL → which fields | MEMORY>  │
│ <storeB>   │ <key>             │ <...>                                     │
└────────────┴──────────────────┴─────────────────────────────────────────┘
```

⚠️ <why something is / isn't persisted — the non-obvious bit. Delete if none.>

**Handoff <ThisPage> → <NextPage> (how state crosses the route boundary):**

```
<source action / event>
   │ <intermediate step>
   ▼
localStorage["<key pattern>"] ──read──► <consumer route>
   │
   └─ <any signal lit on return, e.g. a badge/dot>
```

<Auth-token rule: where the token lives and any navigation gotcha — e.g. router.replace to
 keep memory-only token alive. Delete if not relevant.>

---

## 6 · Backend — Load · Send · Receive · Errors

**Every call goes through ONE axios instance** (`lib/api-client.ts`) — never `fetch` directly.
It auto-attaches the token on the way out and auto-handles 401 on the way back.

```
            ┌──────────────────────── lib/api-client.ts (axios) ─────────────────────────┐
component → │ REQUEST interceptor:  add  Authorization: Bearer <token from useAuthStore> │ → BE
            │ RESPONSE interceptor: on 401 → refresh / redirect (see §6d)                │ ← BE
            └────────────────────────────────────────────────────────────────────────────┘
```

### 6a · LOADING (reads) — TanStack Query

```
       useQuery(queryKey, queryFn)                       queryFn = api.get(...).then(r => r.data.data)
┌──────────────────────────────────────┐                          └─ BE wraps payload in { data: ... }
│ <['queryKey']>      <always | enabled>│   enabled flag = WHEN it runs:
│ <['queryKey']>      <...>              │     <condition that gates the call>
└──────────────────────────────────────┘

  WHAT EACH QUERY DOES on every render:
  1st time / stale  → fetch → isLoading=true → skeletons     (cache empty or older than staleTime)
  cached & fresh    → return cache instantly, no network
  same key reused   → de-duped — one request shared by all subscribers
```

<Note any client-side join / enrichment and whether it belongs on the BE. What [Thử lại]/retry calls.>

### 6b · SENDING (the write(s)) — `useMutation`   <!-- delete §6b/§6c if the page is read-only -->

```
<WriterComponent>  → <mutation>.mutate()
        │ body assembled HERE (<file>.tsx:<lines>):
        ▼
  <METHOD> <endpoint> {
     <field>: <value>,                              ← <note any always-empty / derived fields>
     items: <buildPayload(...)>                     ← <shared builder path, if any>
  }
```

> Invariant: <what the on-screen preview must equal in the payload, if applicable>.
> <Name the single shared builder feeding all write paths so they can't drift.>

### 6c · RECEIVING + error handling (mutation callbacks)

```
                         ┌─ onSuccess(data) ──────────────────────────────────────────┐
                         │  <follow-up GET / cache write / navigation>                 │
  <METHOD> <endpoint> ───┤  <store cleanup, e.g. clearCart()>                          │
                         │  <router.replace(...) — note why replace vs push>           │
                         └─────────────────────────────────────────────────────────────┘
                         ┌─ onError(err) ─────────────────────────────────────────────┐
                         │  read err.response.data.{error,message,details}            │
                         │  ├─ error === <SPECIFIC_CODE> → <special handling>          │
                         │  └─ anything else            → toast.error(message ?? '…')  │
                         └─────────────────────────────────────────────────────────────┘
```

<Call out any nested try/catch or "succeeds even if follow-up fails" behaviour.>

### 6d · 401 / auth errors — handled globally, not per-page (api-client.ts:<lines>)

```
response 401 (not an /auth/* endpoint)
   │
   ├─ <case>  → <action / redirect>
   ├─ <case>  → <action / redirect>
   └─ normal user → POST /auth/refresh
                      success → retry the original request once (_retry guard)
                      fail    → clearAuth → '/login'
```

### 6e · Error surfaces — don't confuse them

| Where | Trigger | What the user sees |
|---|---|---|
| **Query error** (read) | <which fetch fails> | <error UI + retry> |
| **Mutation error** (write) | <which write fails> | <toast / inline> |
| **401 anywhere** | expired/invalid token | interceptor refresh or redirect — no in-page UI |

### 6f · Worked Example — full round-trip   <!-- optional but high-value: keep for complex write pages -->

<!-- Walk ONE real, verified request: the cart/inputs → exact POST body → BE response →
     any follow-up GET → what BE adds that FE never sent → a money/count check that proves it.
     Use real (abridged) IDs from a live run and mark it "Verified live <date>". -->

> ✅ **Verified live** <YYYY-MM-DD>: <how — stack + endpoints hit + source files traced>.

---

## 7 · Subpages (one-liner — full table in canonical)   <!-- delete if the page has no children -->

<This route's siblings/children, one line each> → full purpose table in
[<canonical_spec.md>](./<canonical_spec.md>).

---

## 8 · Top Risks (full list → <canonical_spec.md> §Concerns)

```
🚨 <ID>  <one-line risk — symptom + cause>
🚨 <ID>  <...>
⚠️ <ID>  <lower-severity risk>
```

---

*Short visual companion to the canonical [<canonical_spec.md>](./<canonical_spec.md>). Diagrams
summarize; the canonical file is the line-traced source of truth.<supersedes note if any>*
