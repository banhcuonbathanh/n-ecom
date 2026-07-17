Based on the wireframe image and the accompanying `menu_wireframe_v1.md` specification, here is a structured UX/UI review. The documentation is already highly detailed and well-architected; these comments focus on **implementation pitfalls, interaction polish, and mobile usability optimizations**.

---

### ✅ **UX Strengths**

1. **Logical Information Hierarchy:** The flow (Header → Search → Categories → Favorites → Combos → Singles → Customization → Note → Summary → Cart) follows a natural decision-making path for food ordering.
2. **Progressive Disclosure:** Collapsible order summary, expandable combo details, and toggleable toppings effectively manage cognitive load.
3. **Contextual Awareness:** Table number, conditional combo visibility, and persistent cart state show strong situational design.
4. **Microcopy & Localization:** Vietnamese labels are customer-friendly, consistent, and action-oriented (`Tìm món nhanh...`, `Xem giỏ hàng`, `Rau nhiều`).
5. **Robust Spec Coverage:** The markdown already addresses edge cases, accessibility, state management, and testing. This is production-ready documentation.

---

### ⚠️ **UX Recommendations**

| Area                                 | Observation                                                                                                                                | Recommendation                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sticky Stack (Zones A-C)**         | 3 sticky bars will consume ~150–180px vertically. On a 375px screen, this leaves <50% for content.                                         | Implement **dynamic sticky behavior**: Collapse Search + Tabs into a single compact bar on scroll, or use a shrinking app bar.                   |
| **Card Density**                     | Combo & single cards pack image, name, price, toppings, quantity, favorites, and detail links into one view.                               | Defer complex interactions: Show only core info by default. Tap `+` or `Chi tiết` to open a **bottom sheet** for topping/quantity configuration. |
| **Order Summary Placement (Zone I)** | Inline collapsible summary sits above the fixed cart bar. When expanded, it may push content off-screen or cause awkward scroll anchoring. | Convert to a **persistent bottom bar** that expands into a modal/bottom sheet. Keeps summary accessible without consuming scroll space.          |
| **Favorites Rail (Zone D)**          | Horizontal scroll is easy to miss on mobile.                                                                                               | Add a **peeking next card** (10–15% visible) and a subtle fade/arrow indicator. Consider `snap-x` + `scroll-smooth`.                             |
| **Topping Logic**                    | Inline checkboxes on combos imply toppings apply to the whole combo, but combos contain multiple items.                                    | Clarify scope: Either apply toppings globally to the combo, or group them per sub-item. Add a tooltip: `Áp dụng cho toàn bộ combo`.              |

---

### 🎨 **UI & Visual Recommendations**

| Element                       | Issue                                                                                                                                          | Fix                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Price Repetition (Combos)** | Each sub-item repeats the combo price. Creates visual noise and implies separate pricing.                                                      | Show **only the combo total** prominently. Sub-items should list names & quantities without prices.                   |
| **Layout Consistency**        | Docs say `2-col grid` for singles (Zone F), but image shows a vertical list.                                                                   | Stick to **vertical list** for singles. Toppings + quantity controls break gracefully in 1-col. Update docs to match. |
| **Touch Targets**             | `-`/`+` buttons, checkboxes, and `Chi tiết` links may fall below 44×44px.                                                                      | Add `p-2` or invisible `::after` hit-area expansion. Ensure minimum `min-h-[44px]`.                                   |
| **Color & Contrast**          | Orange action buttons vs light backgrounds need WCAG AA verification. Topping checkboxes (gray/orange) may lack contrast for colorblind users. | Run through `contrast-ratio` tool. Add icon states (✓/□) alongside color. Use `aria-checked` for screen readers.      |
| **Cart Bar Terminology**      | Docs call it `CartFAB`, but image shows a full-width bottom bar.                                                                               | Rename to `CartBottomBar` or `PersistentCartBar`. FAB implies a circular floating button; this is a fixed action bar. |

---

### 🔍 **Spec vs. Image Alignment Checks**

| Zone              | Doc Says              | Image Shows          | Action                                                                                                           |
| ----------------- | --------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Zone F**        | `2-col grid`          | Vertical list        | Update doc to `1-col list` for better readability with inline controls                                           |
| **Zone G**        | `Nước Dùng`           | `Nước Dùng`          | Verify terminology: Bánh Cuốn typically uses `Nước chấm` & `Rau sống`. Consider renaming to `Gia vị & Nước chấm` |
| **Zone J**        | `fixed bottom-6 z-30` | Full-width bar       | Clarify in docs: `fixed bottom-0 left-0 right-0` with safe-area insets                                           |
| **Combo Pricing** | Shows price per line  | Shows price per line | Simplify to combo-level pricing only; break down on expand                                                       |

---

### ♿ **Accessibility & Edge Case Notes**

- **Screen Readers:** Group combo sub-items under `role="list"` with `aria-label="Chi tiết combo"`. Ensure quantity changes announce `Đã thêm 1 phần`.
- **Reduced Motion:** Disable sticky scroll morphing and pulse animations if `prefers-reduced-motion: reduce` is active.
- **Offline/Error States:** Place network error banners **above Zone B** (search) to avoid pushing content down unexpectedly.
- **Max Quantity (99):** Disable `+` at 99, but also add `aria-disabled="true"` and visually dim the button.

---

### 🚀 **Recommended Next Steps**

1. **Prototype Sticky Behavior:** Test scroll performance with 3 sticky zones on iPhone SE (375px) and iPhone 15 (393px).
2. **User Test Configuration Flow:** Compare inline toppings vs. bottom-sheet configuration. Measure task completion time & error rate.
3. **Audit Touch Targets & Contrast:** Run automated Lighthouse + manual tap testing on all interactive elements.
4. **Finalize Terminology:** Confirm `Nước Dùng` vs `Nước chấm` with restaurant stakeholders.
5. **Update Docs:** Align Zone F layout, rename CartFAB → CartBottomBar, and clarify topping scope.

---

**Overall:** This is a **strong, production-ready spec** with clear UX intent. The main risks are **vertical space consumption** and **card density**. Shifting complex interactions to bottom sheets, simplifying pricing display, and refining sticky behavior will elevate this from "functional" to "delightful" on mobile.

Let me know if you'd like Figma component suggestions, Tailwind utility mappings, or Playwright test scaffolding for these zones.

3. Scaling to 10 Pages: Managing Components, State, and Performance
   Since you have 10 other pages, you cannot treat this as a standalone project. You need an Architecture Strategy to ensure the app remains fast and maintainable.
   Here is the recommended approach based on your current tech stack (Next.js, Zustand, TanStack Query):
   A. Managing Shared Components (Don't Repeat Code)
   You need a Design System. Do not duplicate UI elements across the 10 pages.
   Strategy: Create a components/ui/ folder (Atomic Design).
   Atoms: Button, Input, Checkbox, Badge, Skeleton.
   Molecules: ProductCard, CartItem, SearchBar (reuse the one you built in menu_wireframe_v1.md).
   Organisms: Header, Footer, BottomNav.
   Example: The OrderSummary (Zone I) logic might be needed on a "Review Order" page. Move the logic out of the menu page and make it a reusable OrderSummary component.
   B. State Management Architecture (Global vs. Page)
   With 10 pages, a single cartStore file will become unmanageable. You need to separate concerns.
   Global State (Zustand):
   Only put data needed by multiple pages here.
   Examples: authUser, globalSettings (language/theme), cart (if used across menu/checkout).
   Implementation: Use Zustand's persist middleware sparingly (only for cart and user preferences) to save storage space.
   Page-Specific State:
   Keep logic inside the feature folder (e.g., features/menu/, features/history/).
   Use useState or useReducer for temporary data that disappears when the user leaves the page (e.g., "Show/Hide History Filter").
   Server State (TanStack Query):
   You already have a good start (staleTime: 5min).
   Optimization: Use queryKey prefixes to avoid collisions.
   ['menu', 'products']
   ['history', 'orders']
   Optimistic Updates: For actions like "Add to Favorite," update the UI immediately before the API responds (as noted in your tech_description.md). This makes the app feel "instant."
   C. Performance Optimization (Seamless UX)
   To ensure the app feels native and smooth across all 10 pages:
   Route-based Code Splitting:
   Since you are using Next.js App Router (/(shop)/menu/), code splitting happens automatically. Each page loads its own JS bundle.
   Image Optimization:
   Never use raw <img> tags. Use next/image to auto-compress and lazy-load images. This is critical for a menu page with many food photos.
   Loading States (Skeleton Screens):
   Don't show a spinning wheel. Show gray skeleton shapes (placeholders) matching the layout of the menu_wireframe. This reduces the "Time to Interactive" feel.
   Prefetching:
   If a user is on the Menu, use next/link prefetch to load the "Checkout" page data in the background before they even click the button.
   D. Navigation & Layout
   Shared Layout:
   Create a layout.tsx in the /(shop)/ folder.
   Put the Header (Zone A) and BottomNav (if you have one) here.
   This ensures the transition between pages is seamless (the header doesn't flicker or reload).
   Scroll Restoration:
   Ensure that if a user clicks back to the Menu, they return to the exact scroll position they left at (Next.js handles this by default, but test it).
   Summary Checklist for Your Next 10 Pages:
   Audit: Does the new page reuse existing components (Cards, Buttons)? If not, build it in components/ui/ first.
   State: Is the new state global or local? If local, keep it in the page folder.
   Data: Are you using TanStack Query for API calls? Ensure staleTime is set.
   UX: Is there a skeleton loading state? Is the touch target 44px?
   By following this structure, you turn your Menu page spec into a Template for the rest of the application, ensuring consistency and speed.
