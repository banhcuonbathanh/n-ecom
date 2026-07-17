```markdown
# Page: Menu (Ordering Experience)
**Route:** `/(shop)/menu/page.tsx`  
**Spec Ref:** `Spec_3 §4` & `Spec_4 §5`  
**Version:** v2 (Updated 2026-05-24)  
**Status:** ✅ Approved for Development

---

## 📐 Visual Wireframe

```text
┌────────────────────────────────────────────────┐
│ [A] Quán Bánh Cuốn        [Đặt hàng →] 🛒 2   │ ← sticky top-0 z-20
│       Bàn 3                                    │
├────────────────────────────────────────────────┤
│ [B] 🔍 Tìm món nhanh...                        │ ← sticky top-[52px] z-10
├────────────────────────────────────────────────┤
│ [C] [Tất cả]  Bánh Cuốn  Chả  Nước →          │ ← sticky top-[108px] z-10
├────────────────────────────────────────────────┤
│ [D] YÊU THÍCH              [xem thêm →]        │
│ ┌──────────────┐ ┌──────────────┐             │
│ │❤️ Combo Gia  │ │❤️ Bánh Cuốn  │             │
│ │  180,000 ₫ [+]│ │  45,000 ₫ [+]│             │
│ └──────────────┘ └──────────────┘             │
├────────────────────────────────────────────────┤
│ [E] COMBO (only if selectedCategory === null)  │
│ ┌──────────────────────────────────────────┐   │
│ │ [img] Combo Gia Đình          180,000 ₫  │   │
│ │       2 Bánh Cuốn Thịt      180,000 ₫    │   │
│ │       1 Chả Chiên         180,000 ₫      │   │
│ │       1 Nước Chấm                        │   │
│ │       □ Rau Sống  □ Tương Ớt  ☑ Hành     │   │
│ │       Chi tiết #001 →   [-] 1 [+]  ❤️    │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ [img] Combo Tiêu Chuẩn        120,000 ₫  │   │
│ │       1 Bánh Cuốn Thịt      120,000 ₫    │   │
│ │       1 Nước Chấm                        │   │
│ │       ☑ Rau Sống  □ Tương Ớt  □ Hành     │   │
│ │       Chi tiết #002 →   [-] 2 [+]  ❤️    │   │
│ └──────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│ [F] MÓN LẺ (2-col grid)                        │
│ ┌──────────────┐ ┌──────────────┐             │
│ │[img]         │ │[img]         │             │
│ │Bánh Cuốn Thịt│ │Bánh Cuốn Tôm │             │
│ │45,000 ₫      │ │50,000 ₫      │             │
│ │□ Rau □Tương  │ │□ Rau ☑Tương  │             │
│ │☑ Hành        │ │□ Hành        │             │
│ │Chi tiết #P001│ │Chi tiết #P002│             │
│ │[-] 1 [+] ❤️  │ │[-] 1 [+] ♡   │             │
│ └──────────────┘ └──────────────┘             │
│ ┌──────────────┐                               │
│ │[img]         │                               │
│ │Chả Chiên     │                               │
│ │30,000 ₫      │                               │
│ │☑ Rau □Tương  │                               │
│ │□ Hành        │                               │
│ │Chi tiết #P003│                               │
│ │[-] 1 [+] ♡   │                               │
│ └──────────────┘                               │
├────────────────────────────────────────────────┤
│ [G] NƯỚC DÙNG                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ Rau: (•) Rau nhiều  ( ) Rau vừa  ( ) Không│  │
│ │ Số bát: [-] 2 [+]                        │   │
│ └──────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│ [H] GHI CHÚ                                    │
│ ┌──────────────────────────────────────────┐   │
│ │ Nhập ghi chú cho nhà hàng...             │   │
│ └──────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│ [I] TÓM TẮT ĐƠN HÀNG (Collapsible)             │
│ ┌──────────────────────────────────────────┐   │
│ │ Tóm tắt đơn hàng              [▼ Ẩn]     │   │
│ ├──────────────────────────────────────────┤   │
│ │ COMBO                                      │   │
│ │ • Combo Gia Đình x1      180,000 ₫ [▼]   │   │
│ │   · Bánh Cuốn Thịt x2                      │   │
│ │   · Chả Chiên x1                           │   │
│ │   · Nước Chấm x1                           │   │
│ │   Topping: ☑ Rau Sống  □ Tương Ớt  ☑ Hành │   │
│ │                                            │   │
│ │ • Combo Tiêu Chuẩn x2    240,000 ₫ [▶]    │   │
│ │                                            │   │
│ │ Subtotal:                  420,000 ₫       │   │
│ ├──────────────────────────────────────────┤   │
│ │ MÓN LẺ                                     │   │
│ │ • Bánh Cuốn Thịt x1       45,000 ₫ [▼]    │   │
│ │   □ Rau Sống  □ Tương Ớt  ☑ Hành          │   │
│ │ • Bánh Cuốn Tôm x1        50,000 ₫ [▶]    │   │
│ │ • Chả Chiên x1            30,000 ₫ [▶]    │   │
│ │                                            │   │
│ │ Subtotal:                  125,000 ₫       │   │
│ ├──────────────────────────────────────────┤   │
│ │ TỔNG CỘNG:                 545,000 ₫       │   │
│ ├──────────────────────────────────────────┤   │
│ │ NƯỚC DÙNG:                                 │   │
│ │ Rau: Nhiều rau            Tớ: 2 tô        │   │
│ │ Canh: Ít cay                             │   │
│ ├──────────────────────────────────────────┤   │
│ │ GHI CHÚ:                                   │   │
│ │ "Không cay · Ít muối · dị ứng hành"      │   │
│ └──────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│ [J] [ 3 ]  Xem giỏ hàng      125,000 ₫        │ ← fixed bottom-6 z-30
└────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky Position |
|------|-----------|---------------------|-----------------|
| **A** | Header | Always | `top-0 z-20` |
| **B** | SearchBar | Always | `top-[52px] z-10` |
| **C** | CategoryTabs | Always | `top-[108px] z-10` |
| **D** | FavoritesRail | `selectedCategory === null` | Scrollable |
| **E** | ComboSection | `selectedCategory === null` | Scrollable |
| **F** | ProductGrid | Always | Scrollable |
| **G** | NướcDùngCustomize | Always | Scrollable |
| **H** | OrderNoteInput | Always | Scrollable |
| **I** | OrderSummary | Always (collapsible) | `z-20` when expanded |
| **J** | CartFAB | `cart.itemCount > 0` | `fixed bottom-6 z-30` |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| **A** | `settingsStore.tableLabel` | Zustand (in-memory) | N/A | Table number & order status |
| **B** | Local state + API | Debounced search (300ms) | `['products', 'search', query]` | Filters ProductGrid |
| **C** | `GET /api/v1/categories` | TanStack Query | `['categories']` | `staleTime: 5min` |
| **D** | `userStore.favorites` | Zustand + localStorage | N/A | Horizontal scroll rail |
| **E** | `GET /api/v1/combos` | TanStack Query | `['combos']` | Hidden if category selected |
| **F** | `GET /api/v1/products` | TanStack Query | `['products', categoryId]` | `is_available=true` filter |
| **G** | `cartStore.drinkConfig` | Zustand | N/A | Global water/veg settings |
| **H** | `cartStore.orderNote` | Zustand + localStorage | N/A | Persists across sessions |
| **I** | `cartStore.items` | Zustand (computed) | N/A | Grouped by type (Combo/Item) |
| **J** | `cartStore.total()` | Zustand (computed) | N/A | Shows if `count > 0` |

---

## 🧩 Component Specifications

| Zone | Component | File | Spec Ref | Props/Interface |
|------|-----------|------|----------|-----------------|
| **A** | `Header` | `menu/page.tsx` | `Spec_3 §4.1` | Inline component |
| **B** | `SearchBar` | `components/menu/SearchBar.tsx` | `Spec_3 §4.2` | `onSearch: (query: string) => void` |
| **C** | `CategoryTabs` | `components/menu/CategoryTabs.tsx` | `Spec_3 §4.8` | `selectedCategory: string \| null` |
| **D** | `FavoritesRail` | `components/menu/FavoritesRail.tsx` | `Spec_3 §4.9` | `favorites: Product[]` |
| **E** | `ComboCard` | `components/menu/ComboCard.tsx` | `Spec_3 §4.5` | `ComboCardProps` (see below) |
| **F** | `ProductGridCard` | `components/menu/ProductGridCard.tsx` | `Spec_3 §4.3` | `ProductGridCardProps` (see below) |
| **G** | `NướcDùngCustomize` | `components/menu/DrinkCustomize.tsx` | `Spec_3 §4.10` | `drinkConfig: DrinkConfig` |
| **H** | `OrderNoteInput` | `components/menu/OrderNote.tsx` | `Spec_3 §4.11` | `note: string` |
| **I** | `OrderSummary` | `components/menu/OrderSummary.tsx` | `Spec_3 §4.12` | `items: CartItem[]` |
| **J** | `CartFAB` | `components/menu/CartFAB.tsx` | `Spec_3 §4.1` | `count: number, total: number` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// types/menu.ts

export interface ProductConfig {
  quantity: number;
  toppings: Record<string, boolean>; // e.g., { "Rau Song": true, "Hanh": false }
  note?: string;
}

export interface DrinkConfig {
  vegetableAmount: 'none' | 'little' | 'normal' | 'extra';
  bowlCount: number;
  spiceLevel: 'mild' | 'normal' | 'spicy';
}

export interface ComboCardProps {
  id: string;
  name: string;
  price: number;
  items: Array<{ name: string; quantity: number }>;
  defaultToppings: Record<string, boolean>;
  onAdd: (id: string, config: ProductConfig) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
}

export interface ProductGridCardProps {
  id: string; // UUID - NEVER number
  name: string;
  price: number; // Raw number, formatted client-side
  image_path: string | null;
  is_available: boolean;
  defaultToppings: Record<string, boolean>;
  onAdd: (id: string, config: ProductConfig) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
}

export interface CartItem {
  id: string;
  type: 'combo' | 'single';
  name: string;
  quantity: number;
  price: number;
  toppings: Record<string, boolean>;
  details?: string[]; // For combo items
}
```

### Query Configuration

```typescript
// src/hooks/useMenuQueries.ts

import { useQuery } from '@tanstack/react-query';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/v1/categories').then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes - matches Redis TTL
    gcTime: 10 * 60 * 1000,
  });
};

export const useProducts = (categoryId: string | null, searchQuery?: string) => {
  const params = new URLSearchParams();
  if (categoryId) params.set('category_id', categoryId);
  params.set('is_available', 'true');
  if (searchQuery) params.set('search', searchQuery);

  return useQuery({
    queryKey: ['products', categoryId, searchQuery],
    queryFn: () => fetch(`/api/v1/products?${params}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCombos = () => {
  return useQuery({
    queryKey: ['combos'],
    queryFn: () => fetch('/api/v1/combos').then(res => res.json()),
    staleTime: 5 * 60 * 1000,
    enabled: selectedCategory === null,
  });
};
```

### State Management (Zustand)

```typescript
// src/store/cart.ts

import { create } from 'zustand';

interface CartState {
  items: CartItem[];
  drinkConfig: DrinkConfig;
  orderNote: string;
  
  // Actions
  addItem: (product: Product, config: ProductConfig) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateToppings: (id: string, toppings: Record<string, boolean>) => void;
  setDrinkConfig: (config: DrinkConfig) => void;
  setOrderNote: (note: string) => void;
  clearCart: () => void;
  
  // Computed
  itemCount: () => number;
  total: () => number;
}

// Memory-only — NO persist middleware (cart is cleared on page close by design)
export const useCartStore = create<CartState>()((set, get) => ({
  items: [],

  addItem: (item) => set((s) => {
    const existing = s.items.find(i => i.id === item.id)
    if (existing) {
      return { items: s.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i) }
    }
    return { items: [...s.items, item] }
  }),

  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),

  updateQty: (id, qty) => set((s) => ({
    items: s.items.map(i => i.id === id ? { ...i, quantity: qty } : i).filter(i => i.quantity > 0),
  })),

  clearCart: () => set({ items: [], tableId: null, activeOrderId: null, paymentMethod: null }),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
```

---

## 🎨 Customer UX & Usability

### Microcopy (Vietnamese)

| Technical Term | Customer-Friendly Text |
|----------------|------------------------|
| `selectedCategory === null` | Tab "Tất cả" |
| `is_available: false` | Badge "Hết hàng" (red) |
| `cart.itemCount()` | `🛒 {count} món` |
| Search placeholder | "Tìm món nhanh..." |
| Favorites section | "Yêu thích" |
| Water customization | "Nước Dùng" |
| Order note | "Ghi chú" |
| Order summary | "Tóm tắt đơn hàng" |
| Cart button | "Xem giỏ hàng" |
| Expand details | "Chi tiết ▼" / "Chi tiết ▶" |
| Topping toggle | "Topping ▼" / "Topping ▶" |

### Feedback & Affordance

1. **Add to Cart:**
   - Button `+` turns orange on hover/active
   - On success: Brief toast "✓ Đã thêm vào giỏ" (1.2s)
   - CartFAB pulses once
   - Quantity selector shows immediately after first add

2. **Favorites:**
   - Heart icon fills (orange) on tap
   - Toast: "✓ Đã lưu vào Yêu thích"
   - Appears in FavoritesRail (Zone D)

3. **Toppings:**
   - Checkboxes: Orange dot when checked, gray square when unchecked
   - Changes reflect immediately in UI
   - Only saved to cart when quantity changes or "Add" pressed

4. **Order Summary:**
   - Auto-collapses after 10s of inactivity
   - Tap `▼ Chi tiết` to expand combo items
   - Tap `▶ Topping` to view customizations
   - Tap `✏️` to edit item directly

5. **Search:**
   - Debounced 300ms
   - Shows loading spinner in search icon
   - Clear button (×) appears when typing

### Empty & Onboarding States

```markdown
## Empty States

### No Search Results
- Icon: 🔍
- Text: "Không tìm thấy món nào"
- Subtext: "Thử từ khóa khác nhé!"
- Action: Clear search button

### Empty Cart
- Icon: 🛒
- Text: "Giỏ hàng trống"
- Subtext: "Hãy chọn món ngon nhé!"
- Action: Scroll-to-top CTA "Xem thực đơn"

### No Favorites
- Hide FavoritesRail entirely
- No empty state needed

### First Visit Onboarding
- Highlight CategoryTabs with tooltip: "👆 Chọn nhóm món"
- Auto-hide after 5 seconds
- Show only once per session (localStorage flag)
```

### Accessibility Requirements

```typescript
// Accessibility checklist for all components

// 1. Touch Targets
className="min-h-[44px] min-w-[44px]" // All interactive elements

// 2. Screen Readers
<button aria-label={`Thêm ${productName} vào giỏ`} />
<div aria-live="polite" aria-atomic="true">
  {cart.itemCount()} món trong giỏ
</div>
<section aria-label="Danh mục món ăn" />

// 3. Keyboard Navigation
// Tab order: Search → Tabs → Items → Water → Note → Summary → FAB
// Esc closes CartDrawer
// Enter/Space activates buttons

// 4. Focus Management
// CartDrawer traps focus when open
// Returns focus to trigger button when closed
// Visible focus rings: className="focus:ring-2 focus:ring-orange-500"

// 5. Motion Preferences
@media (prefers-reduced-motion: reduce) {
  // Disable pulse, slide, and fade animations
  // Instant state changes only
}
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| **Image fails to load** | `onError` on `<img>` | Show placeholder SVG | Gray `aspect-square` with `🍽️` icon |
| **Category returns 0 products** | `data.length === 0` | Show empty state | "Không có món nào trong nhóm này" + CTA |
| **Network offline** | `query.isError` + `retry: false` | Show error banner | "Kết nối mạng yếu. Nhấn thử lại" |
| **Price > 10M VND** | `price > 10000000` | Auto-abbreviate | Show as `10,5tr ₫` instead of `10,500,000 ₫` |
| **Cart sync fails** | API returns 4xx/5xx | Rollback optimistic update | Toast "❌ Không thể thêm món. Thử lại?" |
| **Concurrent edits** | Version mismatch | Show conflict modal | "Giỏ hàng đã thay đổi. Tải lại?" |
| **Search query < 2 chars** | `query.length < 2` | Don't trigger API | Show "Nhập ít nhất 2 ký tự" |
| **Quantity > 99** | `quantity > 99` | Disable `+` button | Tooltip "Tối đa 99 phần/món" |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] **Zone A:** Table label updates dynamically from `settingsStore`
- [ ] **Zone B:** Search filters correctly; 300ms debounce prevents API spam
- [ ] **Zone C:** Category selection filters list; "Tất cả" shows Combos
- [ ] **Zone D:** Favorites load from localStorage; add/remove works
- [ ] **Zone E:** Combos hide when specific category selected
- [ ] **Zone F:** Inline toppings toggle without lag; state persists on add
- [ ] **Zone G:** Water settings save to Zustand; reflect in OrderSummary
- [ ] **Zone H:** Note persists across page reload (localStorage)
- [ ] **Zone I:** Summary updates instantly; expand/collapse works; grouping correct
- [ ] **Zone J:** FAB appears only when `items > 0`; price matches summary

### Edge Case Tests
- [ ] Image fails to load → placeholder shows
- [ ] Network offline → error banner appears
- [ ] Empty cart → FAB hidden
- [ ] Max quantity (99) → `+` button disabled
- [ ] Long product names → text truncates with ellipsis
- [ ] Rapid clicking → no duplicate cart items

### Performance Tests
- [ ] No layout shift (CLS) when images load
- [ ] Scroll performance smooth (60fps)
- [ ] TanStack Query cache hits on category switch
- [ ] Zustand updates don't cause unnecessary re-renders

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Screen reader announces cart count changes
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Focus visible on all interactive elements
- [ ] `prefers-reduced-motion` respected

### Cross-Browser Tests
- [ ] Chrome (latest)
- [ ] Safari (iOS + macOS)
- [ ] Firefox (latest)
- [ ] Mobile viewport (375px width)
- [ ] Tablet viewport (768px width)

---

## 📋 Task Rows

| ID | Owner | Task | Status | Spec Ref | Draw Ref |
|----|-------|------|--------|----------|----------|
| P-MENU-1 | FE | Wireframe + zone table (menu.excalidraw + menu.md) | ✅ | Spec_3 §4 | wireframes/menu.md |
| P-MENU-2 | FE | ProductGridCard component + 2-col grid layout | ✅ | Spec_3 §4.1 §4.3 | Zone F |
| P-MENU-3 | FE | SearchBar with debounce + API integration | 🔄 | Spec_3 §4.2 | Zone B |
| P-MENU-4 | FE | FavoritesRail component + localStorage sync | 🔄 | Spec_3 §4.9 | Zone D |
| P-MENU-5 | FE | ComboCard with inline toppings | 🔄 | Spec_3 §4.5 | Zone E |
| P-MENU-6 | FE | DrinkCustomize + OrderNote components | 🔄 | Spec_3 §4.10-11 | Zone G-H |
| P-MENU-7 | FE | OrderSummary collapsible with grouping | 🔄 | Spec_3 §4.12 | Zone I |
| P-MENU-8 | FE | CartFAB + CartDrawer integration | 🔄 | Spec_3 §4.1 §4.7 | Zone J |
| P-MENU-9 | FE | Zustand cart store + persistence | 🔄 | Spec_3 §4.6 | Global |
| P-MENU-10 | FE | TanStack Query setup + caching | 🔄 | Spec_3 §4.4 | Global |
| P-MENU-11 | FE | Accessibility audit + fixes | ⏳ | Spec_3 §4.13 | Global |
| P-MENU-12 | FE | E2E tests (Playwright) | ⏳ | Spec_3 §4.14 | Global |

---

## 📝 Changelog

**v2 (2026-05-24)**
- Added SearchBar (Zone B)
- Added FavoritesRail (Zone D)
- Added inline toppings to ProductGridCard
- Added Nước Dùng customization (Zone G)
- Added Order Note input (Zone H)
- Replaced AddToOrderBanner with collapsible OrderSummary (Zone I)
- Updated CartFAB to show total price
- Added TypeScript contracts
- Added accessibility requirements
- Added edge cases & fallbacks table
- Added comprehensive testing checklist

**v1 (2026-05-17)**
- Initial wireframe
- Basic zones (A-F, G as AddToOrderBanner)
- Simple ProductGrid (2-col)
- CategoryTabs + ComboSection

---

*Last Updated: 2026-05-24*  
*Approved by: Dev Team, UX Team*  
*Next Review: After P-MENU-8 completion*
```

You can now copy this entire content and save it as `menu_wireframe.md`. This comprehensive file includes:

✅ **Visual wireframe** with all zones from your image  
✅ **Zone mapping table** with visibility conditions  
✅ **Data sources** with TanStack Query configuration  
✅ **TypeScript contracts** for all components  
✅ **Zustand store** implementation  
✅ **Customer-friendly microcopy** (Vietnamese)  
✅ **Accessibility requirements**  
✅ **Edge cases & fallbacks**  
✅ **Comprehensive testing checklist**  
✅ **Task tracking table**  

This single file serves as both a **developer guide** and **UX specification** document.