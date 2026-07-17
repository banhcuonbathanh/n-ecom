| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
SPEC 3 — Menu & Checkout UI (Frontend)
v2.0 · Corrections Applied · Next.js 14 · TypeScript · Tailwind · Zustand · React Query · SSE |
| --- |

| 📋  CORRECTIONS APPLIED — v2.0 (từ SPEC_CORRECTION_SHEET_v1.0) |
| --- |
| 🔴 #1  — Tất cả TypeScript id: number → id: string (UUID) |
| 🔴 #3  — SSE endpoint /orders/:id/sse?token= → /orders/:id/events (Bearer header) |
| 🔴 #4  — localStorage → Zustand store trong useOrderSSE (security fix) |
| 🔴 #8  — base_price→price, image_url→image_path, price_delta→price, slug removed |
| 🟠 #6  — Xóa payment_method khỏi POST /orders payload; thêm cartStore.setPaymentMethod() |
| 🟡 #7  — QR /table/[tableId]: ghi chú POST /auth/guest cần thêm vào API_CONTRACT trước |

| ℹ️  Frontend Phase 1 — 3 trang customer flow: /menu → /checkout → /order/[id]. |
| --- |
| Zustand CartStore, ToppingModal, ComboModal, SSE realtime tracking với exponential backoff. |
| Model: Sonnet  |  Branch: feat/3-menu-checkout-ui  |  Phụ thuộc: Spec 2 (Products API) |

# 1. Mục Tiêu
Xây dựng 3 trang Frontend Phase 1 cho customer flow:
/menu  →  /checkout  →  /order/[id]
Customer online đặt hàng qua web, chọn topping/combo, checkout, theo dõi đơn realtime qua SSE.

# 2. Phạm Vi
| Trang | Route | Real-time |
| --- | --- | --- |
| Menu & Giỏ Hàng | /menu | — |
| QR Tại Bàn | /table/[tableId] | — |
| Thanh Toán | /checkout | — |
| Theo Dõi Đơn | /order/[id] | ✅ SSE |

| ℹ️  Không thuộc spec này: /kitchen, /cashier, /manager/* (spec riêng) |
| --- |

# 3. Design Tokens (Bắt Buộc)
| /* Chỉ dùng các token này — không tự ý thêm màu mới */ |
| --- |
| --primary-accent: #FF7A1A;     /* Giá tiền, badge highlight, border accent */ |
| --action-button:  #1F3864;     /* Primary button background */ |
| --dark-bg:        #0A0F1E;     /* Background trang tối */ |
| --card-bg:        #1F2937;     /* Card, modal background */ |
| --success:        #3DB870;     /* Done, badge success */ |
| --warning:        #FCD34D;     /* Preparing, alert */ |
| --error:          #FC8181;     /* Hết hàng, huỷ, urgent */ |
| --gray-text:      #9CA3AF;     /* Text phụ, placeholder */ |

# 4. Trang /menu — Menu & Giỏ Hàng
## 4.1 Layout
| ┌─────────────────────────────────────┐ |
| --- |
| │  [Logo]  BanhCuon  [♡][⚙]  [🛒]   │  ← Header sticky; ♡ → /menu/favourites |
| ├─────────────────────────────────────┤ |
| │  [● 3 món]  Combo ×2 · Bánh ×1  45k│  ← Mini cart strip (sticky, count > 0) |
| ├─────────────────────────────────────┤ |
| │  [Tất cả] [Bánh Cuốn] [Chả] [Combo]│  ← Category tabs sticky |
| ├─────────────────────────────────────┤ |
| │  ┌──────┐  ┌──────┐  ┌──────┐      │ |
| │  │ img  │  │ img  │  │ img  │      │  ← Product list (single column) |
| │  │ tên  │  │ tên  │  │ tên  │      │ |
| │  │ giá  │  │ giá  │  │ giá  │      │ |
| │  │[+]   │  │[+]   │  │[+]   │      │ |
| │  └──────┘  └──────┘  └──────┘      │ |
| ├─────────────────────────────────────┤ |
| │        [Xem giỏ hàng  3 món]        │  ← Cart FAB fixed bottom |
| └─────────────────────────────────────┘ |

### Mini Cart Strip (Zone A.5)
- Renders between header and restaurant banner when `itemCount > 0`
- `sticky top-[57px] z-10` — stays visible while scrolling
- Shows pill badges for every cart item: `{name} ×{qty}`
- Clicking anywhere on the strip opens the CartDrawer
- Purpose: customer can always see what they've ordered without scrolling to the bottom

## 4.2 Data Fetching
| // useQuery — React Query, không dùng useState |
| --- |
| const { data: categories } = useQuery({ |
| queryKey: ['categories'], |
| queryFn: () => api.get('/categories').then(r => r.data), |
| staleTime: 5 * 60 * 1000,   // 5 phút, khớp với Redis TTL |
| }) |
|  |
| const { data: products, isLoading } = useQuery({ |
| queryKey: ['products', selectedCategory], |
| queryFn: () => api.get('/products', { |
| params: { category_id: selectedCategory, available: true } |
| }).then(r => r.data), |
| staleTime: 5 * 60 * 1000, |
| }) |

## 4.3 ProductCard Component
| ✅  CORRECTION #1 & #8: id: string (UUID); price thay vì base_price; image_path thay vì image_url |
| --- |

| // src/components/menu/ProductCard.tsx |
| --- |
| interface ProductCardProps { |
| product: Product  // { id: string, name, price, image_path, is_available, toppings[] } |
| onAdd: () => void // mở ToppingModal nếu có toppings, hoặc thêm thẳng |
| } |
|  |
| // Hiển thị: |
| // - Ảnh (aspect-square object-cover, fallback placeholder) |
| // - Tên product (text-sm font-semibold) |
| // - Giá: formatVND(price) — màu #FF7A1A   ← price (không phải base_price) |
| // - Nút "+ Thêm" (bg-[#1F3864] text-white rounded-full) |
| // - Badge "Hết" nếu is_available=false (bg-red-100 text-red-600, disabled button) |

## 4.4 ToppingModal Component
| ✅  CORRECTION #1 & #8: id: string; price thay vì price_delta; tổng giá dùng product.price |
| --- |

| // src/components/menu/ToppingModal.tsx |
| --- |
| // Mở khi click "+ Thêm" trên product có toppings |
|  |
| interface ToppingModalProps { |
| product: Product |
| open: boolean |
| onClose: () => void |
| onConfirm: (selectedToppings: Topping[]) => void |
| } |
|  |
| // Layout: |
| // - Header: tên product |
| // - List toppings với checkbox |
| // - Mỗi topping: name + "+{price} ₫"   ← price (không phải price_delta) |
| // - Footer: tổng giá = product.price + sum(selected topping.price) |
| //                        ^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^^^^^ |
| //                        (không phải base_price)   (không phải price_delta) |
| // - Nút "Thêm vào giỏ" (primary button) |
| // - Nút "Đóng" (ghost button) |

## 4.5 ComboModal Component
| ✅  CORRECTION #1 & #8: id: string; image_path thay vì image_url |
| --- |

| // src/components/menu/ComboModal.tsx |
| --- |
| // Mở khi click vào combo card |
|  |
| interface ComboModalProps { |
| combo: Combo  // { id: string, name, price, image_path, items[{ product_name, quantity }] } |
| open: boolean |
| onClose: () => void |
| onConfirm: () => void |
| } |
|  |
| // Layout: |
| // - Ảnh combo (dùng image_path, không phải image_url) |
| // - Tên combo + giá combo cố định (màu #FF7A1A) |
| // - List items: "2x Bánh Cuốn Thịt", "1x Chả Lụa" |
| // - Nút "Thêm combo vào giỏ" |

## 4.6 Zustand Cart Store
| ✅  CORRECTION #1: productId?: string; comboId?: string (UUID — không phải number) |
| --- |

| // src/store/cart.ts |
| --- |
| interface CartItem { |
| id: string                // `product_${product.id}_${toppingIds.join('-')}` (UUID parts) |
| type: 'product' | 'combo' |
| productId?: string        // ✅ string UUID (không phải number) |
| comboId?: string          // ✅ string UUID (không phải number) |
| name: string |
| quantity: number |
| unit_price: number        // product.price + sum(selected topping.price) |
| selected_toppings: Topping[]  // snapshot khi add |
| topping_snapshot: object      // JSON để gửi API |
| } |
|  |
| interface CartStore { |
| items: CartItem[] |
| tableId: string | null        // ← set bởi /table/[tableId] page |
| paymentMethod: string | null  // ← set bởi /checkout (Issue #6) |
| addItem: (item: Omit<CartItem, 'quantity'>) => void  // tăng qty nếu trùng id |
| removeItem: (id: string) => void |
| updateQty: (id: string, qty: number) => void |
| clearCart: () => void |
| setTableId: (tableId: string) => void |
| setPaymentMethod: (method: string) => void  // ← NEW (Issue #6) |
| total: number           // computed: sum(unit_price * quantity) |
| itemCount: number       // computed: sum(quantity) |
| } |

## 4.6b DrinkCustomize Component (Nước dùng)
- **Visibility:** only renders when cart contains at least one combo item OR at least one product whose name (case-insensitive) contains "nước dùng"
- If cart has no combo and no nước dùng product → component returns null
- **DrinkConfig shape** (updated):
  ```ts
  interface DrinkConfig {
    bowls:    number   // total bowls (1–99)
    vegBowls: number   // bowls with vegetables (0–bowls)
  }
  ```
- **UI:** two steppers — "Số bát" and "Bát có rau" — with summary text: "2 bát có rau · 3 bát không rau"
- `vegBowls` is automatically clamped to `bowls` when `bowls` decreases
- Default: `{ bowls: 1, vegBowls: 0 }`

## 4.6c OrderNote Component
- Auto-saves to Zustand cart store on every keystroke (no submit button needed)
- Shows debounced `✓ Đã lưu` indicator 800ms after the user stops typing
- Helper text below textarea: "Ghi chú sẽ gửi cùng đơn hàng khi bạn thanh toán."
- Note is submitted as part of the order payload at checkout

## 4.7 Cart Drawer / Sidebar
| // src/components/menu/CartDrawer.tsx |
| --- |
| // Slide-in từ bên phải khi click Cart FAB |
|  |
| // Nội dung: |
| // - Header "Giỏ hàng ({count} món)" |
| // - List CartItem: tên, toppings nhỏ, qty stepper, remove button |
| // - Tổng tiền: formatVND(total) — màu #FF7A1A, text-xl font-bold |
| // - Nút "Thanh toán" → navigate /checkout |
| // - Nút "Tiếp tục chọn" → đóng drawer |

## 4.8 Category Tabs
| // src/components/menu/CategoryTabs.tsx |
| --- |
| // Sticky top-16 (below header) |
| // Horizontal scroll trên mobile |
| // Active tab: border-b-2 border-[#FF7A1A] text-[#FF7A1A] |
| // Inactive: text-gray-500 |
|  |
| // State: selectedCategory (null = tất cả) |
| // Click tab → update selectedCategory → React Query auto-refetch |

# 5. Trang /table/[tableId] — QR Tại Bàn
| ⚠️  CORRECTION #7 (🟡 MEDIUM): POST /api/v1/auth/guest CHƯA CÓ trong API_CONTRACT v1.1. |
| --- |
| Action: Thêm endpoint vào API_CONTRACT v1.2 TRƯỚC KHI code phần này. |
| Cần define: token TTL, có lưu vào refresh_tokens không, rate limit. |
|  |
| ⚠️  CORRECTION #4: Token phải lưu vào Zustand store (in-memory), KHÔNG localStorage. |
| MASTER.docx §6.1 là rule bất biến — vi phạm = XSS risk. |

| ✗  localStorage (WRONG) | ✅  Zustand Store (CORRECT) |
| --- | --- |
| ✗  HIỆN TẠI (SAI) // 1. Lấy tableId từ params // 2. Gọi POST /auth/guest { table_id: tableId } // 3. Lưu token vào localStorage  ← XSS RISK // 4. Lưu tableId vào Zustand store // 5. Redirect sang /menu  // Error: // - toast.error("Mã bàn không hợp lệ") | ✅  PHẢI SỬA THÀNH // 1. Lấy tableId từ params // 2. Gọi POST /api/v1/auth/guest { table_id: tableId } //    ⚠️  Thêm endpoint vào API_CONTRACT trước! // 3. Lưu token vào Zustand (in-memory): //    useAuthStore.setState({ accessToken: data.access_token }) // 4. Lưu tableId: cartStore.setTableId(tableId) // 5. Redirect sang /menu  // Error: toast.error("Mã bàn không hợp lệ") → /menu |

| // src/app/table/[tableId]/page.tsx |
| --- |
|  |
| export default function TablePage({ params }: { params: { tableId: string } }) { |
| const cartStore = useCartStore() |
| const setAuth = useAuthStore(state => state.setAuth)  // Zustand (in-memory) |
| const router = useRouter() |
|  |
| useEffect(() => { |
| // ⚠️ POST /api/v1/auth/guest — endpoint cần được thêm vào API_CONTRACT v1.2 |
| api.post('/auth/guest', { table_id: params.tableId }) |
| .then(res => { |
| // ✅ ĐÚNG: lưu vào Zustand store (memory), KHÔNG localStorage |
| setAuth({ accessToken: res.data.access_token, role: 'customer' }) |
| cartStore.setTableId(params.tableId) |
| router.replace('/menu') |
| }) |
| .catch(() => { |
| toast.error('Mã bàn không hợp lệ') |
| router.replace('/menu') |
| }) |
| }, [params.tableId]) |
|  |
| return ( |
| <div className="flex flex-col items-center justify-center min-h-screen"> |
| <Spinner /> |
| <p className="text-gray-500 mt-4">Đang tải menu...</p> |
| <p className="text-lg font-bold mt-2">Bàn {params.tableId}</p> |
| </div> |
| ) |
| } |

# 6. Trang /checkout — Thanh Toán
## 6.1 Layout
| ┌─────────────────────────────────────┐ |
| --- |
| │  ← Quay lại    Xác Nhận Đơn Hàng   │ |
| ├─────────────────────────────────────┤ |
| │  Đơn hàng của bạn                   │ |
| │  ┌─────────────────────────────────┐│ |
| │  │ 2x Bánh Cuốn Thịt    90,000 ₫  ││  ← Order summary |
| │  │    + Chả lụa                    ││ |
| │  │ 1x Combo Gia Đình   180,000 ₫  ││ |
| │  └─────────────────────────────────┘│ |
| │  Tổng cộng:             270,000 ₫   │  ← màu #FF7A1A |
| ├─────────────────────────────────────┤ |
| │  Thông tin liên hệ                  │ |
| │  [Họ tên *                        ] │ |
| │  [Số điện thoại *                 ] │ |
| │  [Ghi chú (tuỳ chọn)             ] │ |
| ├─────────────────────────────────────┤ |
| │  Phương thức thanh toán             │ |
| │  ○ 💳 VNPay                         │ |
| │  ○ 📱 MoMo                          │ |
| │  ○ 🏦 ZaloPay                       │ |
| │  ● 💵 Tiền mặt COD                  │  ← Radio buttons |
| ├─────────────────────────────────────┤ |
| │        [  Đặt hàng  270,000 ₫  ]    │  ← primary button |
| └─────────────────────────────────────┘ |

## 6.2 Form Validation (Zod + React Hook Form)
Schema không thay đổi — payment_method vẫn validate ở form, nhưng KHÔNG gửi trong POST /orders:
| // src/app/checkout/schema.ts |
| --- |
| const checkoutSchema = z.object({ |
| customer_name: z.string().min(2, 'Vui lòng nhập tên').max(100), |
| customer_phone: z |
| .string() |
| .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'), |
| note: z.string().max(500).optional(), |
| payment_method: z.enum(['vnpay', 'momo', 'zalopay', 'cash']), |
| // ✅ payment_method validate ở form, nhưng KHÔNG gửi trong POST /orders payload |
| }) |
|  |
| type CheckoutForm = z.infer<typeof checkoutSchema> |

## 6.3 Submit Logic
| ✅  CORRECTION #6: Xóa payment_method khỏi POST /orders payload. |
| --- |
| payment_method lưu vào cartStore để dùng sau khi tạo payment khi order.status = ready. |
| Thêm source: tableId ? "qr" : "online" vào payload (orders.source column). |

| ✗  SAI (payment_method trong payload) | ✅  ĐÚNG (payment_method vào store) |
| --- | --- |
| ✗  TRƯỚC (SAI — Issue #6) const payload = {   customer_name: form.customer_name,   customer_phone: form.customer_phone,   note: form.note,   payment_method: form.payment_method, // ❌ SAI   table_id: cartStore.tableId ?? null,   items: cartStore.items.map(...) } return api.post('/orders', payload) | ✅  SAU (ĐÚNG) const payload = {   customer_name: form.customer_name,   customer_phone: form.customer_phone,   note: form.note,   // ✅ KHÔNG gửi payment_method   table_id: cartStore.tableId ?? null,   source: cartStore.tableId ? 'qr' : 'online',   items: cartStore.items.map(...) } // Lưu method vào store để dùng sau: cartStore.setPaymentMethod(form.payment_method) return api.post('/orders', payload) |

| // src/app/checkout/page.tsx — Full submit logic |
| --- |
| const submitOrder = useMutation({ |
| mutationFn: async (form: CheckoutForm) => { |
| // ✅ Lưu payment method vào store TRƯỚC khi gọi API |
| cartStore.setPaymentMethod(form.payment_method) |
|  |
| const payload = { |
| customer_name: form.customer_name, |
| customer_phone: form.customer_phone, |
| note: form.note ?? null, |
| table_id: cartStore.tableId ?? null, |
| source: cartStore.tableId ? 'qr' : 'online',  // ✅ thêm source |
| // ✅ payment_method KHÔNG có ở đây — orders table không có column này |
| items: cartStore.items.map(item => ({ |
| product_id: item.productId ?? null,   // string UUID | null |
| combo_id: item.comboId ?? null,        // string UUID | null |
| quantity: item.quantity, |
| topping_snapshot: item.topping_snapshot, |
| unit_price: item.unit_price, |
| })) |
| } |
| return api.post('/orders', payload).then(r => r.data) |
| }, |
| onSuccess: (data) => { |
| cartStore.clearCart() |
| router.push(`/order/${data.id}`)  // data.id is string UUID |
| }, |
| onError: (err) => { |
| toast.error(err.response?.data?.message ?? 'Đặt hàng thất bại') |
| } |
| }) |

## 6.4 Guard
| // Nếu cart rỗng → redirect /menu |
| --- |
| useEffect(() => { |
| if (cartStore.itemCount === 0) router.replace('/menu') |
| }, [cartStore.itemCount]) |

# 7. Trang /order/[id] — Theo Dõi Đơn (SSE)
## 7.1 Layout
| ┌─────────────────────────────────────┐ |
| --- |
| │  Đơn hàng #ORD-20260424-001         │  ← order_number (không phải id int) |
| │  Bàn A3 · 14:30 09/04/2026          │ |
| ├─────────────────────────────────────┤ |
| │  Tiến độ                            │ |
| │  [████████░░░░░░░░░] 50%            │  ← Progress bar (màu #3DB870) |
| ├─────────────────────────────────────┤ |
| │  ┌─────────────────────────────────┐│ |
| │  │ Bánh Cuốn Thịt          [●●○○] ││  ← 2/4 done indicator |
| │  │ + Chả lụa                      ││ |
| │  │ 4 phần · 2 đã xong             ││ |
| │  │ [preparing]                    ││  ← StatusBadge |
| │  ├─────────────────────────────────┤│ |
| │  │ Combo Gia Đình          [●○○]   ││ |
| │  │ 3 phần · 1 đã xong             ││ |
| │  └─────────────────────────────────┘│ |
| ├─────────────────────────────────────┤ |
| │  Tổng: 270,000 ₫                    │ |
| ├─────────────────────────────────────┤ |
| │  [  Huỷ đơn  ]   ← chỉ hiện <30%   │ |
| └─────────────────────────────────────┘ |

## 7.2 SSE Hook (useOrderSSE)
| ✅  CORRECTION #4 (🔴 CRITICAL): localStorage → Zustand store. |
| --- |
| ✅  CORRECTION #3 (🔴 CRITICAL): endpoint /orders/:id/sse?token= → /orders/:id/events. |
| Auth via Authorization: Bearer header (không phải query param). |
| ✅  CORRECTION #1: orderId: string (UUID) thay vì number. |

| ✗  SAI (localStorage + query param) | ✅  ĐÚNG (Zustand + Bearer header) |
| --- | --- |
| ✗  TRƯỚC (SAI) export function useOrderSSE(orderId: number) {   ...   const connect = () => {     // ❌ SAI: localStorage XSS risk     const token = localStorage.getItem('access_token')     es = new EventSource(       `${API_URL}/orders/${orderId}/sse?token=${token}`       // ❌ token trong URL query param     )   } } | ✅  SAU (ĐÚNG) export function useOrderSSE(orderId: string) {   ...   // ✅ Đọc từ Zustand store (in-memory, không XSS)   const token = useAuthStore(state => state.accessToken)   const connect = () => {     es = new EventSource(       `${API_URL}/orders/${orderId}/events`,       { headers: { Authorization: `Bearer ${token}` } }       // ✅ Bearer header, endpoint /events     )   } } |

| // src/hooks/useOrderSSE.ts — CORRECTED v2.0 |
| --- |
|  |
| const WS_RECONNECT = { |
| maxAttempts: 5, |
| baseDelay: 1000,    // ms, tăng x2 mỗi lần retry |
| maxDelay: 30_000, |
| showBannerAfter: 3, // hiện "Mất kết nối" sau 3 lần thất bại |
| } |
|  |
| // ✅ orderId: string (UUID) — CORRECTION #1 |
| export function useOrderSSE(orderId: string) { |
| const [order, setOrder] = useState<Order | null>(null) |
| const [connectionError, setConnectionError] = useState(false) |
| const attemptsRef = useRef(0) |
|  |
| // ✅ Token từ Zustand store (in-memory) — CORRECTION #4 |
| const token = useAuthStore(state => state.accessToken) |
|  |
| useEffect(() => { |
| let es: EventSource |
| let retryTimeout: NodeJS.Timeout |
|  |
| const connect = () => { |
| // ✅ CORRECTION #3: endpoint /events, auth via Bearer header |
| es = new EventSource( |
| `${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}/events`, |
| { headers: { Authorization: `Bearer ${token}` } } |
| ) |
|  |
| es.onopen = () => { |
| attemptsRef.current = 0 |
| setConnectionError(false) |
| } |
|  |
| // Event: order_status_changed |
| es.addEventListener('order_status_changed', (e) => { |
| const data = JSON.parse(e.data) |
| setOrder(prev => prev ? { ...prev, status: data.status } : prev) |
| }) |
|  |
| // Event: item_progress |
| es.addEventListener('item_progress', (e) => { |
| const data = JSON.parse(e.data) |
| // data: { item_id: string, qty_served: number } |
| setOrder(prev => prev ? updateItemProgress(prev, data) : prev) |
| }) |
|  |
| // Event: order_completed |
| es.addEventListener('order_completed', () => { |
| setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev) |
| es.close() |
| }) |
|  |
| es.onerror = () => { |
| es.close() |
| attemptsRef.current++ |
| if (attemptsRef.current >= WS_RECONNECT.showBannerAfter) { |
| setConnectionError(true) |
| } |
| if (attemptsRef.current < WS_RECONNECT.maxAttempts) { |
| const delay = Math.min( |
| WS_RECONNECT.baseDelay * Math.pow(2, attemptsRef.current - 1), |
| WS_RECONNECT.maxDelay |
| ) |
| retryTimeout = setTimeout(connect, delay) |
| } |
| } |
| } |
|  |
| connect() |
| return () => { |
| es?.close() |
| clearTimeout(retryTimeout) |
| } |
| }, [orderId, token]) |
|  |
| const progress = useMemo(() => { |
| if (!order?.items?.length) return 0 |
| const total = order.items.reduce((s, i) => s + i.quantity, 0) |
| const served = order.items.reduce((s, i) => s + i.qty_served, 0) |
| return Math.round((served / total) * 100) |
| }, [order]) |
|  |
| return { order, progress, connectionError } |
| } |
|  |
| // Helper: update item progress in order state |
| function updateItemProgress(order: Order, data: { item_id: string; qty_served: number }): Order { |
| return { |
| ...order, |
| items: order.items.map(item => |
| item.id === data.item_id ? { ...item, qty_served: data.qty_served } : item |
| ) |
| } |
| } |

## 7.3 Nút Huỷ Đơn
| // Chỉ hiển thị khi progress < 30 |
| --- |
| // Confirm modal trước khi gọi API |
|  |
| const cancelOrder = useMutation({ |
| mutationFn: () => api.delete(`/orders/${orderId}`), |
| onSuccess: () => { |
| toast.success('Đã huỷ đơn hàng') |
| router.push('/menu') |
| }, |
| onError: (err) => { |
| // ORDER_002 → "Đơn đã xử lý trên 30%, không thể huỷ" |
| toast.error(err.response?.data?.message ?? 'Không thể huỷ đơn') |
| } |
| }) |
|  |
| // UI: |
| {progress < 30 && order?.status !== 'delivered' && ( |
| <Button |
| variant="destructive" |
| onClick={() => setShowCancelConfirm(true)} |
| > |
| Huỷ đơn |
| </Button> |
| )} |

## 7.4 Connection Error Banner
| // Hiển thị khi connectionError=true (sau 3 lần retry thất bại) |
| --- |
| {connectionError && ( |
| <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center p-2 text-sm z-50"> |
| ⚠️ Mất kết nối — đang thử lại... |
| </div> |
| )} |

# 8. Shared Components
## 8.1 StatusBadge
| // src/components/shared/StatusBadge.tsx |
| --- |
| const STATUS_STYLES = { |
| pending:   'bg-gray-100 text-gray-600', |
| confirmed: 'bg-blue-100 text-blue-700', |
| preparing: 'bg-yellow-100 text-yellow-700', |
| ready:     'bg-green-100 text-green-700', |
| delivered: 'bg-teal-100 text-teal-700', |
| cancelled: 'bg-red-100 text-red-700', |
| } |
|  |
| const STATUS_LABELS = { |
| pending:   'Chờ xác nhận', |
| confirmed: 'Đã xác nhận', |
| preparing: 'Đang làm', |
| ready:     'Sẵn sàng', |
| delivered: 'Đã giao', |
| cancelled: 'Đã huỷ', |
| } |

## 8.2 Utility Functions — /lib/utils.ts
| export const formatVND = (amount: number): string => |
| --- |
| new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }) |
| .format(amount) |
| // Output: "45.000 ₫" |
|  |
| export const formatDateTime = (date: string): string => { |
| const d = new Date(date) |
| return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} · ${d.toLocaleDateString('vi-VN')}` |
| } |
| // Output: "14:30 · 09/04/2026" |
|  |
| export const formatPercent = (n: number): string => |
| `${n.toFixed(1).replace('.', ',')}%` |
| // Output: "12,5%" |

# 9. Loading / Error / Empty States
| State | Pattern | Component |
| --- | --- | --- |
| Products loading | <Skeleton> grid (4–6 cards) | shadcn Skeleton |
| Products empty | <EmptyState icon="🍜" message="Không có món nào" /> | Custom |
| Category empty | Filter reset button | Inline |
| Cart rỗng | Redirect /menu | useEffect guard |
| SSE error | Red banner top (connectionError) | Fixed position |
| API error | toast.error(message) | sonner |
| Form validation | Inline text đỏ dưới field | <p className="text-xs text-red-500"> |

# 10. File Structure
| src/ |
| --- |
| app/ |
| menu/ |
| page.tsx                // /menu — Server Component shell |
| _components/            // Client components cho page này |
| MenuClient.tsx        // Main client component |
| table/ |
| [tableId]/ |
| page.tsx              // /table/[tableId] — QR redirect logic |
| checkout/ |
| page.tsx                // /checkout |
| schema.ts               // Zod schema |
| order/ |
| [id]/ |
| page.tsx              // /order/[id] |
| components/ |
| menu/ |
| ProductCard.tsx |
| ToppingModal.tsx |
| ComboModal.tsx |
| CategoryTabs.tsx |
| CartDrawer.tsx |
| shared/ |
| StatusBadge.tsx |
| EmptyState.tsx |
| ConnectionErrorBanner.tsx |
| hooks/ |
| useOrderSSE.ts |
| store/ |
| cart.ts                   // Zustand cart store |
| lib/ |
| api.ts                    // axios instance (từ spec 1) |
| utils.ts                  // formatVND, formatDateTime, etc. |
| types/ |
| product.ts                // Product, Category, Topping, Combo types |
| order.ts                  // Order, OrderItem types |
| cart.ts                   // CartItem, CartStore types |

# 11. Types — CORRECTED v2.0
| ✅  CORRECTION #1 & #8: Tất cả id: number → id: string (UUID). base_price→price, |
| --- |
| image_url→image_path, price_delta→price (toppings). Xóa slug. OrderItem.status tạm thời |
| comment out (pending Issue #5 decision về migration 008). |

| // src/types/product.ts |
| --- |
|  |
| export interface Topping { |
| id: string          // ✅ UUID (không phải number) |
| name: string |
| price: number       // ✅ "price" (không phải price_delta) — migration 002 |
| is_available: boolean |
| } |
|  |
| export interface Product { |
| id: string          // ✅ UUID |
| category_id: string // ✅ UUID FK |
| category_name: string |
| name: string |
| // slug REMOVED — không có trong migration 002 |
| description: string | null |
| price: number       // ✅ "price" (không phải base_price) — migration 002 |
| image_path: string | null  // ✅ "image_path" (không phải image_url) |
| is_available: boolean |
| toppings: Topping[] |
| } |
|  |
| export interface ComboItem { |
| product_id: string   // ✅ UUID |
| product_name: string |
| quantity: number |
| } |
|  |
| export interface Combo { |
| id: string           // ✅ UUID |
| category_id: string | null  // ✅ thêm (migration 004 v1.1) |
| name: string |
| price: number |
| image_path: string | null  // ✅ "image_path" (không phải image_url) |
| sort_order: number   // ✅ thêm (migration 004 v1.1) |
| is_available: boolean |
| items: ComboItem[] |
| } |

| // src/types/order.ts |
| --- |
|  |
| export interface OrderItem { |
| id: string             // ✅ UUID (không phải number) |
| product_id: string | null  // ✅ UUID |
| combo_id: string | null    // ✅ UUID |
| combo_ref_id: string | null // ✅ UUID (self-ref cho combo sub-item) |
| name: string |
| quantity: number |
| qty_served: number |
| unit_price: number |
| // status và flagged: PENDING Issue #5 — chờ quyết định Approach A/B |
| // Nếu Approach A: status: 'pending' | 'preparing' | 'done' sẽ được thêm |
| // Nếu Approach B: derive từ qty_served (0=pending, 0<x<qty=preparing, x=qty=done) |
| note: string | null    // ✅ thêm — có trong migration 005 |
| topping_snapshot: object | null |
| } |
|  |
| export interface Order { |
| id: string             // ✅ UUID |
| order_number: string   // ORD-YYYYMMDD-NNN |
| status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' |
| source: 'online' | 'qr' | 'pos'  // ✅ source (không phải payment_method trên order) |
| table_id: string | null |
| customer_name: string | null |
| customer_phone: string | null |
| // payment_method REMOVED từ Order — thuộc về payments table |
| total_amount: number |
| note: string | null |
| created_at: string |
| items: OrderItem[] |
| } |

# 12. Acceptance Criteria
| # | Acceptance Criterion | Liên Quan |
| --- | --- | --- |
| AC-01 | Category tabs filter products đúng — không re-fetch khi switch về cached category | React Query staleTime |
| AC-02 | ToppingModal hiện đúng toppings theo product, tổng giá update realtime (dùng .price) | Correction #8 |
| AC-03 | ComboModal hiện đúng combo_items | — |
| AC-04 | Thêm cùng 1 product+topping combo → tăng qty (không duplicate) | CartStore |
| AC-05 | Cart drawer hiện đúng items, tổng giá | — |
| AC-06 | /table/[tableId] call POST /auth/guest, lưu token vào Zustand (KHÔNG localStorage) | Correction #4,#7 |
| AC-07 | Checkout form validate đúng (phone regex Việt Nam) | Zod schema |
| AC-08 | POST /orders payload KHÔNG có payment_method; có source field | Correction #6 |
| AC-09 | cartStore.setPaymentMethod() được gọi trước api.post('/orders') | Correction #6 |
| AC-10 | Sau đặt hàng → redirect /order/${data.id} → SSE connect ngay | useOrderSSE |
| AC-11 | SSE connect tới /orders/:id/events với Authorization: Bearer header | Correction #3 |
| AC-12 | Token đọc từ useAuthStore (Zustand), KHÔNG từ localStorage | Correction #4 |
| AC-13 | SSE cập nhật progress bar và StatusBadge realtime khi nhận item_progress event | — |
| AC-14 | Nút huỷ chỉ hiện khi progress < 30% | Cancel rule §4.2 |
| AC-15 | SSE reconnect với exponential backoff, hiện error banner sau 3 lần thất bại | WS_RECONNECT config |
| AC-16 | Tất cả id trong store và API calls là string UUID (không phải number) | Correction #1 |
| AC-17 | Tất cả giá tiền hiển thị qua formatVND() — format chuẩn VND | utils.ts |

| ⚠️  PENDING — Chưa resolve từ Correction Sheet: |
| --- |
| Issue #5: order_items.status + flagged — chờ quyết định Approach A vs B (migration 008 hay derive từ qty_served) |
| Issue #7: POST /api/v1/auth/guest — chờ Lead thêm vào API_CONTRACT v1.2 trước khi code /table/[tableId] |

🍜  BanhCuon System  ·  SPEC 3 — Menu & Checkout UI (Frontend)  ·  v2.0  ·  Corrections Applied  ·  Tháng 4/2026