# FE_STATE.md — Frontend State, Loading & Design Structure

> Expands `PLAN.md §Architecture rules (FE state)` into the full working design.
> Read this before any FE task (C-4, C-5, CC-3, CC-5, O-3, A-2).
> One fact one home: stack choices live in `PLAN.md §Stack`; this file owns HOW state flows.
> Visual companion: `harness/diagrams/fe-state-loading.html`.

---

## 1. The four kinds of state (and the fifth people forget)

Every piece of frontend state belongs to exactly ONE owner. Putting it in two places
is the #1 source of FE bugs (stale cart badge, filter that survives navigation, etc.).

| # | Kind | Owner | Examples in this project | Never do |
|---|---|---|---|---|
| 1 | **Server state** | TanStack Query | products, categories, cart contents, orders, user profile | copy it into Zustand |
| 2 | **URL state** | Next.js `searchParams` / route params | category filter, page number, search query, product id | mirror it in a store |
| 3 | **Form state** | React Hook Form + Zod | address form, login/register, quantity input | control inputs via Zustand |
| 4 | **Client/UI state** | Zustand (shared) or `useState` (local) | cart drawer open, toast queue, mobile nav open | put fetched data here |
| 5 | **Session state** | httpOnly cookie (JWT) + one `useMe()` query | "who am I", logged-in header | store the JWT in localStorage/Zustand |

**Decision flow for any new piece of state:**

```
Does it come from the API?            → TanStack Query          (kind 1)
Should a shared/reloaded URL keep it? → searchParams            (kind 2)
Is it a form the user is filling in?  → RHF + Zod               (kind 3)
Is it needed by >1 distant component? → Zustand slice           (kind 4)
Otherwise                             → useState in the component
```

Zustand is the LAST resort, not the default. Expected v1 store surface is tiny:
`ui` slice (drawer/nav/toasts) — that's it. The cart itself is server state
(BE cart keyed by cookie token, PLAN.md rule 5), so the cart badge count comes
from the `['cart']` query, never from a store.

## 2. Data flow — one straight line

```
Route (RSC, server)          Client component
  prefetchQuery ─┐             useQuery/useMutation
                 ▼                  ▼
        HydrationBoundary   queries/<domain>.ts  (hooks + query keys)
                                    ▼
                            lib/api/<domain>.ts  (typed endpoint fns)
                                    ▼
                            lib/api/client.ts    (THE one client)
                                    ▼
                                 Go API
```

- **`lib/api/client.ts`** — the single fetch wrapper (PLAN.md rule). Owns: base URL,
  `credentials: 'include'` (guest-cart cookie + JWT cookie), JSON encode/decode, and
  **error-envelope parsing**: every non-2xx becomes a thrown `ApiError { status, code,
  message, details }` built from the Session-0 envelope. No component ever sees a raw
  `Response`.
- **`lib/api/<domain>.ts`** — one file per domain (catalog, cart, orders, auth):
  plain typed async functions (`getProducts(params)`, `addToCart(input)`).
  No React in here — testable in isolation.
- **`queries/<domain>.ts`** — the only place query keys and hooks are defined
  (`useProducts`, `useCart`, `useAddToCart`…). Components import hooks, never
  call the API layer or invent keys inline.

### Query key factory (single source, `queries/keys.ts`)

```ts
export const keys = {
  products: (p: { page?: number; category?: string; q?: string }) => ['products', p] as const,
  product:  (id: string) => ['product', id] as const,
  categories: ['categories'] as const,
  cart: ['cart'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  me: ['me'] as const,
};
```

## 3. Cache & invalidation policy

| Query | staleTime | Notes |
|---|---|---|
| products list | 60 s | `placeholderData: keepPreviousData` → no grid flash on page/filter change |
| product detail | 60 s | prefetched on card hover (`prefetchQuery`) for instant navigation |
| categories | 5 min | near-static |
| cart | 0 (always stale) | must be fresh; refetch on window focus ON |
| orders list / detail | 30 s | |
| me | 5 min | 401 → treated as logged-out, not an error |

**Mutation → invalidation map** (lives with each mutation hook, nowhere else):

| Mutation | Invalidates | Extra |
|---|---|---|
| add / update / remove cart line | `['cart']` | optimistic update (see §4) |
| place order | `['cart']`, `['orders']` | redirect to confirmation with returned id |
| cancel order | `['orders']`, `['orders', id]`, `['product', …]` | stock restored server-side (rule 3) |
| login / register | `['cart']` (merge, rule 5), `['me']`, `['orders']` | |
| logout | `queryClient.clear()` | nuke everything user-scoped |

## 4. Loading & error design (the UX contract)

Three loading tiers — pick by scope, never stack spinners:

1. **Route tier — `loading.tsx`** per segment (App Router streaming).
   Skeleton mirrors the real layout: product-grid skeleton for `/products`,
   detail skeleton for `/products/[id]`. Never a centered global spinner.
2. **Component tier — query states.**
   - `isPending` (first load, no data) → skeleton block in place.
   - `isFetching` with data (background refresh / next page) → keep old data visible
     (`keepPreviousData`), show a subtle top-of-grid progress hint; content must not jump.
   - Empty result is NOT loading and NOT an error → dedicated empty state
     ("No products match" + clear-filter action).
3. **Mutation tier — inline pending.** The button that fired it: disabled + spinner,
   label kept ("Adding…"). Never a full-page overlay for a cart action.

**Optimistic updates** — cart only (add/update qty/remove): `onMutate` snapshots
`['cart']`, applies the change locally, `onError` rolls back + toast, `onSettled`
invalidates. Orders/checkout are NEVER optimistic — placing an order shows real
pending state and waits for the server (stock/atomicity, rule 3).

**Error tiers** mirror loading tiers:

- Route render error → segment `error.tsx` with retry (`reset()`).
- Query error → inline error state in the component slot (message + Retry that
  calls `refetch()`), page shell stays alive.
- Mutation error → toast with the envelope's human `message`; form field errors:
  envelope `details[]` (`{field, issue}`) are mapped into RHF via `setError`,
  so server validation lands on the exact field, same UI as Zod client errors.
- `ApiError.code` (stable enum) decides behavior — e.g. `INSUFFICIENT_STOCK` → cart
  line message + refetch cart; `UNAUTHORIZED` → redirect to login. Never match on
  the human message string.

**Retry policy:** queries retry 2× (never on 4xx); mutations retry 0× — user retries.

## 5. Server/client component split (SEO rule)

- **Server components (default):** catalog list + product detail render on the server
  for SEO (the reason SSR was chosen, PLAN.md). Pattern: RSC reads `searchParams` →
  `queryClient.prefetchQuery` → `<HydrationBoundary>` → client grid takes over with
  the cache already warm. No client-side loading flash on first paint.
- **Client components (`'use client'`, leaves only):** anything with handlers or
  hooks — add-to-cart button, cart badge, quantity stepper, filter controls, forms.
  Push the boundary as deep as possible; a page is never wholly client.

## 6. Forms (RHF + Zod)

- One Zod schema per form in `lib/validation/<domain>.ts`; TS types are `z.infer<>` —
  never hand-written twice.
- `zodResolver` wires it into RHF; submit calls a mutation hook from `queries/`;
  server `details[]` → `setError` (see §4). Submit button disabled while
  `isSubmitting || mutation.isPending`.
- Quantity stepper on cart lines is a micro-form: clamp 1..stock client-side,
  server remains the authority (stock-cap rejection → rollback + toast).

## 7. Session state (feeds A-2)

- JWT lives in an **httpOnly cookie** set by the BE — JS never touches the token,
  the one API client sends it automatically via `credentials: 'include'`.
- FE "am I logged in" = `useMe()` (`['me']`, 401 ⇒ `null` = guest). Header renders
  from that query — no `isLoggedIn` boolean duplicated in Zustand.
- Login/logout are mutations with the invalidation rules in §3.

## 8. Folder layout (extends PLAN.md §File map — exact paths)

```
fe/src/
  app/                       # routes; each segment: page.tsx + loading.tsx + error.tsx
  lib/
    api/client.ts            # THE one fetch wrapper + ApiError
    api/{catalog,cart,orders,auth}.ts
    validation/{checkout,auth}.ts   # Zod schemas
    constants.ts             # storage keys, event names (PLAN.md shared-constants rule)
  queries/
    keys.ts                  # query-key factory (single source)
    {catalog,cart,orders,auth}.ts   # useX hooks + invalidation maps
  stores/
    ui.store.ts              # drawer, nav, toasts — the ONLY expected v1 store
  components/
    ui/                      # Skeleton, Spinner, Toast, EmptyState, Button
    {catalog,cart,checkout,orders}/ # domain components (client leaves)
  providers.tsx              # QueryClientProvider + defaults + Toaster
```

## 9. Hard FE rules (violations are bugs, same weight as PLAN.md rules)

1. Server data is read ONLY via a hook in `queries/` — no fetch in components, no
   API data in Zustand.
2. Filter/page/search live in the URL — back button and shared links must reproduce
   the exact view.
3. Every route segment ships `loading.tsx` + `error.tsx` with layout-shaped skeletons.
4. Optimistic updates: cart mutations only; checkout/orders always pessimistic.
5. Branch on `ApiError.code`, never on message text.
6. Query keys come from `queries/keys.ts` only.
7. New Zustand slice requires a note in this file first (expected v1: `ui` only).
