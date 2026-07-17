# Component Extraction — Prompt & Vocabulary

> Reusable guide for asking Claude to refactor a big page file by pulling its
> inline JSX "zones" into standalone components.
> Reference implementation: `fe/src/app/(shop)/menu/page.tsx`
> (MenuHeader · MiniCartStrip · SearchBar · CartBottomBar).

---

## What this refactor is called

**Component extraction** — moving inline JSX out of a large page into its own
small component file. The flavor used in the menu page is **presentational
(dumb) component extraction**: each component reads its own data from the store
and takes only a callback or two as props, so the page becomes a thin layout
that just lists `<Zone />` tags.

It is a **pure structural change — zero behavior change.**

---

## Copy-paste prompt (full)

```
Refactor [path/to/page.tsx] using component extraction.

Pull each inline JSX zone out into its own standalone component
under [feature folder]/components/, matching how SearchBar/MenuHeader
are done in the menu page.

Rules:
- Each component reads its own data from the store (don't prop-drill
  display state like items/count/total)
- Pass only callbacks (onClick, onSomething) and small flags as props
- Keep business logic / routing decisions in the page via a handler
  function passed down (like handleCheckout)
- Self-guard visibility inside the component (return null when empty)
  instead of `{cond && <Zone/>}` in the page
- Pure structural change — zero behavior change
- Clean up any imports/variables left unused in the page afterward
- Typecheck when done; don't touch unrelated code
```

Swap `[path/to/page.tsx]` and `[feature folder]`. You can scope it:
"only extract the header and footer, leave the rest."

---

## Copy-paste prompt (shorthand)

Once the pattern is established, this is enough — Claude will use the menu page
as the reference:

```
Do the same component-extraction refactor on [path/to/page.tsx]
like we did on the menu page.
```

---

## The key vocabulary

| Term | What it means |
|---|---|
| **component extraction** | move inline JSX into its own component file |
| **presentational / dumb component** | a component that's mostly markup; logic stays in the parent |
| **zone** | a labeled UI block (the `{/* Zone A — Header */}` comments). Best anchor — Claude extracts along these lines |
| **prop-drilling** | passing data down through props. The rule above says *avoid* it by reading the store inside the component |
| **lift logic to the page / keep markup in the component** | business rules live in the page, UI lives in the component |
| **self-guard** | the component returns `null` when it has nothing to show, instead of the page wrapping it in `{cond && ...}` |
| **handler passed down** | a function like `handleCheckout` defined in the page and passed as a prop, so decisions stay in the page |

---

## Tips for clean extraction

- **Tag your zones first.** Adding `{/* Zone X — Name */}` comments before a
  refactor makes the boundaries unambiguous — then "extract each zone" is enough.
- **Components reading global stores themselves** (cart, favourites, settings)
  is the preferred style here, because those stores are global singletons.
  Only pass data as props when it's page-local state.
- **Keep business rules in the page.** Routing, validation, toasts, mutations —
  pass a callback down; don't move them into a presentational component.
