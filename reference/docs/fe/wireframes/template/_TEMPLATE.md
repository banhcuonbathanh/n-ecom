---
page: [page-name]
route: /[route]
spec_ref: Spec_X §Y
created: YYYY-MM-DD
status: Draft | Approved for Development
---

# Page: [Page Name]
**Route:** `[route]/page.tsx`
**Spec Ref:** `Spec_X §Y`
**Version:** v1
**Status:** Draft

---

## Spec Summary

- Route: `[route]`, pattern [A/B/C], mobile [Npx] / desktop
- [N] zones: [list zone letters] · [N] modals: [names or "none"]
- Key data: [main API calls or state sources]
- Auth: [guest / staff / manager / admin / any-authenticated]

---

## 📐 Visual Wireframe

```text
┌─────────────────────────────────────────────────────────┐
│  [A] PageHeader                                          │  ← sticky top-0 z-20
├─────────────────────────────────────────────────────────┤
│  [B] SubHeader / Tabs / Filter                          │  ← sticky top-[52px] z-10
├──────────────────────────┬──────────────────────────────┤
│  [C] LeftPanel / Main    │  [D] RightPanel / Sidebar    │
│  data: GET /...          │  data: derived from C        │
│  interactions: ...       │  interactions: ...           │
├──────────────────────────┴──────────────────────────────┤
│  [E] ActionBar / FAB                                     │  ← fixed bottom-6 z-30
└─────────────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| **A** | `PageHeader` | Always | `top-0 z-20` |
| **B** | `SubHeader` | Always | `top-[52px] z-10` |
| **C** | `MainPanel` | Always | Scrollable |
| **D** | `SidePanel` | [condition] | Scrollable |
| **E** | `ActionBar` | [condition] | `fixed bottom-6 z-30` |

---

## 🔐 Access Control

> Fill this section for every page — write "None" for public routes. Never leave blank.

| Rule | Value |
|------|-------|
| **Route protection** | None / `AuthGuard` / `RoleGuard([roles])` |
| **Allowed roles** | Guest · Staff · Manager · Admin · [combinations] |
| **Auth state used** | Fields read from `useAuthStore` / `useSettingsStore` |
| **Conditional UI by role** | Which zones/buttons/actions are hidden or disabled per role (e.g. "Edit button hidden for Staff") |
| **Unauthorized redirect** | Where the user goes when auth fails — login page · QR entry · 403 screen |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| **A** | `[store].[field]` | Zustand (in-memory) | N/A | |
| **B** | `GET /api/v1/[resource]` | TanStack Query | `['[resource]']` | `staleTime: 5min` |
| **C** | `GET /api/v1/[resource]` | TanStack Query | `['[resource]', id]` | |
| **D** | `[store].[field]` | Zustand (computed) | N/A | |
| **E** | SSE / WebSocket | Real-time push | N/A | |

---

## 🧩 Component Specifications

> Before filling this table: read [`shared/_INDEX_SHARING_COMPONENT.md`](../shared/_INDEX_SHARING_COMPONENT.md).
> Mark each component with one of three `Reuse?` values:
> - `✅ reuse` — already exists in the shared index; just import it
> - `new (local)` — only this page uses it; lives in the page folder
> - `new (shared)` — will be used by multiple pages; register in `_INDEX_SHARING_COMPONENT.md` when built

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|------------------|
| **A** | `PageHeader` | new (local) | `[page]/page.tsx` | Inline component |
| **B** | `StatusBadge` | ✅ reuse | `shared/StatusBadge.tsx` | `status: OrderStatus` |
| **C** | `MainPanel` | new (local) | `components/[page]/MainPanel.tsx` | `MainPanelProps` |
| **D** | `SidePanel` | new (shared) | `components/[page]/SidePanel.tsx` | `SidePanelProps` |
| **E** | `ActionBar` | new (local) | `components/[page]/ActionBar.tsx` | `ActionBarProps` |

---

## 👨‍💻 Developer Implementation Details

<!-- Add TypeScript contracts, query hooks, and store slices for complex pages only.
     Skip for simple/static pages. -->

### TypeScript Contracts

```typescript
// types/[page].ts

export interface [Entity] {
  id: string; // UUID - NEVER number
  // ...
}
```

### Query Configuration

```typescript
// hooks/use[Page]Queries.ts

import { useQuery } from '@tanstack/react-query';

export const use[Resource] = () => {
  return useQuery({
    queryKey: ['[resource]'],
    queryFn: () => fetch('/api/v1/[resource]').then(res => res.json()),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
```

### Rendering Strategy

> See pattern definitions: [`shared/_INDEX_RENDERING_STRATEGY.md`](../shared/_INDEX_RENDERING_STRATEGY.md)

| Layer | What | Why |
|---|---|---|
| **ISR** (`revalidate: [N]s`) | [list query keys prefetched in `page.tsx`] | Data changes at admin cadence, not per user |
| **RSC** | `page.tsx` only — prefetch + HydrationBoundary | No per-user server data |
| **Client** (`'use client'`) | Zones [list zone letters] | Zustand / localStorage / user interaction |

> Gap: [any data not prefetched server-side that causes a loading wait — note it here]

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| **Image fails to load** | `onError` on `<img>` | Show placeholder SVG | Gray block with icon |
| **Empty list** | `data.length === 0` | Show empty state | "[Empty state text]" + CTA |
| **Network offline** | `query.isError` | Show error banner | "Kết nối mạng yếu. Nhấn thử lại" |
| **No permission** | API returns 403 | Redirect or hide UI | Toast "Không có quyền truy cập" |
| **[page-specific case]** | `[detection]` | `[dev action]` | `[UX fallback]` |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] **Zone A:** [describe expected behaviour]
- [ ] **Zone B:** [describe expected behaviour]
- [ ] **Zone C:** [describe expected behaviour]
- [ ] **Zone D:** [describe expected behaviour]
- [ ] **Zone E:** [describe expected behaviour]

### Edge Case Tests
- [ ] Image fails to load → placeholder shows
- [ ] Network offline → error banner appears
- [ ] Empty list → empty state shows correctly
- [ ] [page-specific edge case]

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Focus visible on all interactive elements

### Cross-Device Tests
- [ ] Mobile viewport (375px)
- [ ] Tablet viewport (768px)
- [ ] Desktop (1280px+)

---

## 📋 Task Rows

| ID | Owner | Task | Status | Spec Ref | Draw Ref |
|----|-------|------|--------|----------|----------|
| X-1 | FE | Wireframe + zone table | ⬜ | Spec_X §Y | wireframes/[page].md |
| X-2 | FE | `[Component]` component | ⬜ | Spec_X §Y.2 | Zone C |
| X-3 | FE | `[page]/page.tsx` — assemble | ⬜ | Spec_X §Y | wireframes/[page].md |

---

## 📝 Changelog

**v1 (YYYY-MM-DD)**
- Initial wireframe

---

*Last Updated: YYYY-MM-DD*
*Approved by: —*
*Next Review: —*
