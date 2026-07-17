# 🍜 Claude Code Prompt — /menu Page (Next.js 14)

> Copy toàn bộ prompt này vào Claude Code để generate trang /menu cho BanhCuon System.

---

## CONTEXT — ĐỌC TRƯỚC KHI CODE

Bạn đang implement trang `/menu` cho **Hệ Thống Quản Lý Quán Bánh Cuốn**.

**Tech stack (không thay đổi):**
- Next.js 14 App Router + TypeScript (strict mode)
- Tailwind CSS v3 — utility-first, NO custom CSS files
- Zustand v4 — client state (cart store)
- React Query v5 (TanStack) — server state / API calls
- shadcn/ui — base components (KHÔNG override style)

**Code rules (ECC-Free, bắt buộc tuân thủ):**
- `Never useState for API data` — dùng React Query
- All API calls qua `/lib/api.ts` (axios instance tự attach JWT)
- On 401 → call `/auth/refresh` → retry once → redirect `/login`
- SSE dùng `EventSource` trong custom hook, cleanup khi unmount
- `No hardcode` — config đọc từ env, price format qua `formatVND()`
- Toppings lưu dưới dạng **JSONB snapshot** (giá tại thời điểm đặt)

---

## DESIGN SYSTEM — SINGLE SOURCE (không tự thêm màu khác)

```ts
// CSS variables / Tailwind arbitrary values cần dùng
--primary:    #FF7A1A   // giá tiền, border highlight, accent button
--bg-dark:    #0A0F1E   // background toàn trang
--bg-card:    #1F2937   // card, modal background
--success:    #3DB870   // badge done, available
--warning:    #FCD34D   // topping count tag, cảnh báo
--error:      #FC8181   // hết hàng, urgent
--muted:      #9CA3AF   // text phụ, placeholder
--white:      #F9FAFB   // text chính trên nền tối
--border:     rgba(255,255,255,0.07)  // border card, divider
```

**Fonts:**
- Display / Logo: `Playfair Display` (serif, Google Fonts)
- Body: `Be Vietnam Pro` (sans-serif, Google Fonts)

**Typography classes (Tailwind):**
| Element | Class |
|---|---|
| Page title | `text-2xl font-bold font-[Playfair_Display]` |
| Section head | `text-lg font-semibold font-[Playfair_Display]` |
| Body text | `text-sm text-[#F9FAFB]` |
| Caption/meta | `text-xs text-[#9CA3AF]` |
| Price | `text-[#FF7A1A] font-bold` |
| Badge text | `text-xs font-medium` |

---

## TASK — TẠO FILE SAU

```
src/
  app/
    menu/
      page.tsx              ← Page component (Server Component shell)
  components/
    menu/
      MenuPage.tsx          ← Client Component chính (use client)
      CategoryTabs.tsx      ← Sticky tabs: Combo | Bánh Cuốn | Thêm Món | Đồ Uống | Tráng Miệng
      ComboStrip.tsx        ← Horizontal scroll strip của combo cards
      ProductSection.tsx    ← Section tiêu đề + product grid
      ProductCard.tsx       ← Card đơn lẻ (ảnh emoji, tên, giá, nút +)
      ToppingModal.tsx      ← Bottom sheet: chọn topping, qty, ghi chú
      ComboModal.tsx        ← Bottom sheet: xem combo items, qty
      CartFAB.tsx           ← Fixed "Xem Giỏ Hàng" button
      CartPanel.tsx         ← Slide-in panel: list items, tóm tắt, checkout
  stores/
    cartStore.ts            ← Zustand store: items, addItem, removeItem, updateQty, clearCart
  lib/
    api.ts                  ← Axios instance (đã có — KHÔNG tạo lại nếu tồn tại)
    utils.ts                ← formatVND, cn (đã có — chỉ thêm nếu thiếu)
  types/
    menu.ts                 ← TypeScript interfaces: Product, Topping, Combo, CartItem
```

---

## FEATURE SPEC — CHI TIẾT TỪNG COMPONENT

### 1. `CategoryTabs.tsx`
- `position: sticky; top: 62px; z-index: 90` (bên dưới header)
- Background: `rgba(10,15,30,0.95)` + `backdrop-filter: blur(12px)`
- Border bottom: `1px solid rgba(255,255,255,0.07)`
- Horizontal scroll, ẩn scrollbar (`scrollbar-width: none`)
- Tab items: `Combo`, `Bánh Cuốn`, `Thêm Món`, `Đồ Uống`, `Tráng Miệng`
- Active tab: `color: #FF7A1A; border-bottom: 2px solid #FF7A1A`
- Click tab → `scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Scroll spy: `IntersectionObserver` → auto-highlight tab khi section vào viewport

### 2. `ComboStrip.tsx`
- Horizontal scroll strip, `gap: 12px`, `overflow-x: auto`
- Mỗi `ComboCard` width `220px`, fixed (flex: 0 0 220px)
- Card style:
  - Background: `linear-gradient(135deg, #2a1500 0%, #1F2937 100%)`
  - Border: `1px solid rgba(255,122,26,0.22)`, `border-radius: 14px`
  - Hover: `translateY(-3px)` + `box-shadow: 0 12px 32px rgba(255,122,26,0.15)`
- Card layout:
  - Phần ảnh (110px): emoji lớn trên nền gradient `#3d1f00 → #1a0d00`
  - Badge "COMBO" màu `#FF7A1A`, text đen, top-left
  - Body: tên combo, list items ngắn gọn (join ", "), giá + nút `+`
- Click card → mở `ComboModal`
- Nút `+` nhỏ → `addComboToCart()` trực tiếp (không mở modal)

### 3. `ProductCard.tsx`
Props: `product: Product`

- Card: `background: #1F2937; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px`
- Hover: `translateY(-3px)` + `box-shadow: 0 10px 28px rgba(0,0,0,0.35)`
- Unavailable (is_available = false): `opacity: 0.45; pointer-events: none`
- Phần ảnh (120px cao): emoji centered, background gradient theo category:
  - main: `linear-gradient(135deg, #1c2b1a, #0f1a10)` (xanh lá tối)
  - addons: `linear-gradient(135deg, #2a1a0a, #1a100a)` (nâu tối)
  - drinks: `linear-gradient(135deg, #0a1a2a, #0d1f30)` (xanh dương tối)
  - desserts: `linear-gradient(135deg, #1a0a2a, #120815)` (tím tối)
- Overlay "HẾT HÀNG" khi unavailable: badge đỏ centered
- Body:
  - Tên sản phẩm: `font-size: 0.84rem; font-weight: 600`
  - Mô tả: `font-size: 0.69rem; color: #9CA3AF`
  - Tag topping count nếu có: `✦ N tuỳ chọn thêm` — màu `#FCD34D`, border vàng mờ
  - Footer: giá (primary color) + nút `+` tròn (30px, primary bg)
- Click card hoặc nút `+` → `openToppingModal(product.id)`

### 4. `ToppingModal.tsx`
- Bottom sheet modal, `position: fixed; bottom: 0; left: 0; right: 0`
- Backdrop click → close
- Animation: slide up từ dưới (CSS transform translateY)
- Handle bar trên cùng (drag indicator)
- Header: emoji lớn + tên + mô tả + giá gốc
- Topping list:
  - Mỗi item: checkbox custom, tên topping, giá (`+5.000 ₫` hoặc `Miễn phí`)
  - Toggle selected: border primary, background primary glow
- Nếu không có topping: text "Món này không có tuỳ chọn thêm"
- Textarea ghi chú: placeholder "Ghi chú (VD: không hành, ít cay…)"
- Footer:
  - Qty control: `−` | số | `+` (min 1)
  - Nút "Thêm Vào Giỏ · {tổng tiền}" — full width, primary color
  - Tổng tiền = (giá gốc + topping selected) × qty

### 5. `ComboModal.tsx`
- Tương tự ToppingModal nhưng không có topping selection
- Header: emoji lớn combo
- Badge: "✅ Tiết kiệm {X}₫ so với đặt lẻ" — màu success
- List combo items: emoji | tên | sub text | ×qty
- Footer: qty control + nút "Chọn Combo · {tổng}"

### 6. `CartFAB.tsx`
- `position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%)`
- Background: `#FF7A1A`, text đen, `border-radius: 100px`
- `box-shadow: 0 8px 32px rgba(255,122,26,0.45)`
- Layout: [badge số món] [Xem Giỏ Hàng] [tổng tiền]
- Ẩn (`opacity: 0; pointer-events: none`) khi cart rỗng
- Hiện (`opacity: 1`) khi có ≥ 1 item — animate transition
- Click → mở `CartPanel`

### 7. `CartPanel.tsx`
- Slide in từ phải (hoặc bottom trên mobile)
- Header: nút back ← | "Giỏ Hàng" | "N món"
- Cart rỗng: icon 🛒 + text "Giỏ hàng trống"
- Cart items:
  - Mỗi item: emoji | tên + toppings + ghi chú | qty control + giá
  - Qty control inline: `−` | số | `+` → min 0 (= xóa item)
- Summary (hiện khi có item):
  - Tạm tính
  - Phí phục vụ 5%
  - **Tổng cộng** (in đậm)
  - Nút "🛒 Đặt Món Ngay" → `POST /api/v1/orders` → redirect `/order/[id]`

### 8. `cartStore.ts` (Zustand)

```ts
interface CartItem {
  id: string          // product_id + timestamp
  productId: string
  name: string
  emoji: string
  unitPrice: number   // base price + toppings price (snapshot tại thời điểm add)
  quantity: number
  toppings: { id: string; name: string; price: number }[]  // snapshot
  note: string
}

interface CartStore {
  items: CartItem[]
  tableId: string | null         // từ QR scan (nếu có)
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  setTableId: (tableId: string) => void
  totalAmount: () => number      // computed: sum(unitPrice × qty)
  totalItems: () => number       // computed: sum(qty)
}
```

### 9. `types/menu.ts`

```ts
interface Topping {
  id: string
  name: string
  price: number
  is_available: boolean
}

interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number              // DECIMAL → number (VND)
  image_path: string | null  // object_path, ghép với STORAGE_BASE_URL
  is_available: boolean
  sort_order: number
  toppings: Topping[]        // joined từ product_toppings
}

interface ComboItem {
  product_id: string
  product_name: string
  quantity: number
}

interface Combo {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_path: string | null
  is_available: boolean
  sort_order: number
  items: ComboItem[]
}

interface Category {
  id: string
  name: string
  sort_order: number
}
```

---

## API INTEGRATION

```ts
// React Query hooks (tạo trong hooks/ hoặc inline trong component)

// GET /api/v1/categories → Category[]
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => api.get('/categories').then(r => r.data),
})

// GET /api/v1/products?is_available=true → Product[] (với toppings)
const { data: products } = useQuery({
  queryKey: ['products', 'available'],
  queryFn: () => api.get('/products', { params: { is_available: true } }).then(r => r.data),
})

// GET /api/v1/combos?is_available=true → Combo[]
const { data: combos } = useQuery({
  queryKey: ['combos', 'available'],
  queryFn: () => api.get('/combos', { params: { is_available: true } }).then(r => r.data),
})

// POST /api/v1/orders → { id: string, order_number: string }
const createOrder = useMutation({
  mutationFn: (payload: CreateOrderPayload) => api.post('/orders', payload),
  onSuccess: (res) => router.push(`/order/${res.data.id}`),
  onError: (err) => toast.error(err.response?.data?.message ?? 'Không thể tạo đơn'),
})
```

**CreateOrderPayload:**
```ts
interface CreateOrderPayload {
  table_id?: string          // null nếu online
  source: 'online' | 'qr'
  customer_name?: string
  customer_phone?: string
  note?: string
  items: {
    product_id?: string
    combo_id?: string
    quantity: number
    toppings_snapshot: { id: string; name: string; price: number }[]
    note?: string
  }[]
}
```

---

## BUSINESS RULES (từ MASTER.docx §4)

1. **One Active Order Rule**: Trước khi tạo order, nếu API trả `ORDER_001 (409)` → hiện toast "Bàn này đang có đơn chưa hoàn thành"
2. **Topping snapshot**: Khi add vào cart, lưu `{ id, name, price }` tại thời điểm đó — không reference live price
3. **Unavailable products**: Không cho thêm vào giỏ (`is_available = false`), hiện overlay "HẾT HÀNG"
4. **Cancel rule**: KHÔNG implement trên trang này — chỉ relevant tại `/order/[id]`
5. **Table ID**: Đọc từ `cartStore.tableId` (được set khi QR scan), gửi kèm `POST /orders`

---

## VISUAL REFERENCE (từ menu.html đã có)

Implement layout và visual GIỐNG VỚI thiết kế này:

**Header (sticky top):**
```
[ 🍜 Bánh Cuốn <italic>Gia Truyền</italic> ]         [ Bàn 05 ]
```
- Height 62px, backdrop blur, border bottom mờ

**Hero band (dưới header):**
- Background: `linear-gradient(135deg, #1a0a00 0%, #0A0F1E 60%)`
- Radial glow bên phải: `rgba(255,122,26,0.12)`
- Title: "Thực Đơn *Hôm Nay*" (em = primary color, italic)
- Sub: text mờ nhỏ

**Category tabs (sticky dưới header):**
```
[ Combo ] [ Bánh Cuốn ] [ Thêm Món ] [ Đồ Uống ] [ Tráng Miệng ]
```

**Combo strip:**
- Horizontal scroll, 3+ combo cards

**Product sections** (mỗi category là 1 section với ID để scroll-spy):
- Section title (Playfair Display) + subtitle mờ
- Grid: `repeat(auto-fill, minmax(175px, 1fr)), gap: 14px`

**Cart FAB** (fixed bottom center, ẩn khi cart rỗng):
```
[3] Xem Giỏ Hàng    95.000 ₫
```

---

## LOADING / ERROR STATES

| State | Component |
|---|---|
| Loading products | `<Skeleton>` grid (4 cards placeholder) |
| Empty category | `<EmptyState message="Chưa có sản phẩm" />` |
| API error | `toast.error(message)` — KHÔNG dùng alert() |
| Adding to cart | Nút `+` hiện spinner ngắn (150ms) rồi show toast |

---

## FILE STRUCTURE — OUTPUT CUỐI CÙNG

Sau khi code xong, đảm bảo `go build` (BE) và `next build` (FE) không lỗi.

Tạo theo thứ tự:
1. `src/types/menu.ts`
2. `src/stores/cartStore.ts`
3. `src/components/menu/` — tất cả components
4. `src/app/menu/page.tsx`

**KHÔNG tạo:**
- CSS module riêng (dùng Tailwind)
- Global CSS mới (chỉ thêm vào `globals.css` nếu cần Google Fonts import)
- Mock data hardcode trong component (dùng React Query gọi API thật)

---

## DEFINITION OF DONE

- [ ] Trang `/menu` render được với React Query (loading skeleton → data)
- [ ] Category tabs sticky, scroll-spy hoạt động
- [ ] Combo strip horizontal scroll với combo cards
- [ ] Product grid đúng layout, card hover effect
- [ ] ToppingModal mở/đóng, toggle topping, qty, tính tổng tiền
- [ ] ComboModal mở/đóng, qty, tính tổng tiền
- [ ] CartStore Zustand: add/remove/update hoạt động
- [ ] CartFAB hiện/ẩn theo cart state
- [ ] CartPanel slide in/out, qty control, summary với phí 5%
- [ ] Nút "Đặt Món Ngay" → POST /orders → redirect /order/[id]
- [ ] TypeScript strict: không có `any`, không có type error
- [ ] Tailwind only: không có inline style ngoại trừ dynamic values (màu từ data)
- [ ] Responsive: mobile-first, max-width 900px centered trên desktop

---

*🍜 BanhCuon System · Menu Page Prompt · v1.0 · ECC-Free · Tháng 4/2026*
