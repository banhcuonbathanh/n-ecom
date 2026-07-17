| ⚛️
HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
FRONTEND — Hướng Dẫn Triển Khai & Tài Liệu Kỹ Thuật
Next.js 14 · TypeScript · Tailwind · Zustand · React Query |
| --- |

| ℹ️  Tài liệu Frontend: 9 pages Phase 1, design system, Phase 2 UI specs, Phase 3 CV Dashboard. |
| --- |

# Design System & Tech Stack Frontend
### Stack
| Package | Version | Dùng Cho |
| --- | --- | --- |
| Next.js | 14 (App Router) | SSR + routing + layout |
| TypeScript | strict mode | Type safety toàn bộ codebase |
| Tailwind CSS | v3 | Utility-first styling |
| Zustand | v4 | Client state: cart, session |
| React Query | v5 (TanStack) | Server state, caching, refetch |
| React Hook Form | v7 | Form handling + validation |
| Recharts | v2 | Dashboard charts |
| react-big-calendar | latest | Staff schedule calendar |

### Design Tokens
| Token | HEX | Dùng Cho |
| --- | --- | --- |
| Primary / Accent | #FF7A1A | Giá tiền, badge highlight, icon accent, border highlight — KHÔNG dùng cho primary button (dùng #1F3864) |
| Action / Button | #1F3864 | Primary button, table header, page title — dùng cho mọi action chính |
| Dark Background | #0A0F1E | Background trang tối, section divider |
| Card Background | #1F2937 | Card, modal background |
| Success / Green | #3DB870 | Trạng thái xong, badge success |
| Warning / Yellow | #FCD34D | Ca sáng, cảnh báo, sắp hết hàng |
| Error / Red | #FC8181 | Hết hàng, huỷ đơn, urgent KDS |
| Gray Text | #9CA3AF | Text phụ, placeholder, metadata |

### Code Rules — Frontend
- Server state: React Query | **Client state:** Zustand | **Forms:** React Hook Form
- Never useState for API data — All API calls through /lib/api.ts
- On 401 → call /auth/refresh → retry once → redirect to login
- SSE: dùng EventSource trong custom hook, cleanup khi unmount
- WebSocket: single connection per role tại layout level

# Section 9 — Phase 1: 9 Pages Frontend
| Route | Tên Trang | Tính Năng Chính | Real-time |
| --- | --- | --- | --- |
| /menu | Menu & Giỏ Hàng | Category tabs, ToppingModal, ComboModal, Cart floating | — |
| /checkout | Thanh Toán | Xác nhận đơn, 4 phương thức, validate trước submit | — |
| /order/[id] | Theo Dõi Đơn | Tiến độ %, qty_served, huỷ đơn <30% done | SSE |
| /kitchen | KDS — Bếp | Full-screen, color-code 3 mức, click cycle, flag 🚩, sound | WS |
| /cashier | POS — Thu Ngân | Layout 2 cột, 4 phương thức, in hóa đơn | — |
| /orders/live | Đơn Live | Grid tất cả đơn, border color, progress bar | WS |
| /dashboard | Tổng Quan | KPI 4 cards, SVG BarChart, DonutChart, LineChart YoY | — |
| /products | Quản Lý Sản Phẩm | CRUD món/combo/topping, Filter, Upload ảnh | — |
| /inventory | Kho Nguyên Liệu | Stats, bảng tồn kho, nhập/xuất, alert min_alert_level | WS |

### /menu — Menu & Giỏ Hàng
- Category tabs nằm ngang, sticky top khi scroll
- Mỗi product card: ảnh, tên, giá, nút Thêm vào giỏ
- ToppingModal: danh sách topping với checkbox + price delta, confirm → Zustand store
- ComboModal: expand combo_items, xem chi tiết từng món trong combo
- Cart floating button: hiện khi cart > 0, badge số lượng, click → sidebar/drawer
- Zustand cart store: { items, addItem, removeItem, updateQty, clearCart }

### /checkout — Thanh Toán
- Summary đơn hàng: danh sách items, tổng tiền
- Chọn phương thức: VNPay / MoMo / ZaloPay QR / Tiền mặt COD
- Form thông tin: tên, số điện thoại, ghi chú
- Validate trước submit: React Hook Form + Zod schema
- POST /orders → redirect sang /order/[id] để theo dõi realtime

### /order/[id] — Theo Dõi Đơn (SSE)
- SSE EventSource connect ngay khi page load
- Hiển thị progress bar: (SUM qty_served / SUM quantity) × 100%
- List từng order_item: tên món, qty, qty_served, trạng thái badge
- Nút Huỷ Đơn: chỉ hiện khi progress < 30%, confirm modal trước khi gọi API
- SSE event types: order_status_changed, item_progress, order_completed

### /kitchen — KDS Bếp (WebSocket)
- Full-screen layout, background #0A0F1E, không có navbar
- Color-code 3 mức: Xanh lá (< 5 phút), Vàng (5–10 phút), Đỏ (> 10 phút)
- Mỗi order card: số bàn/đơn, list items, timestamp, elapsed time
- Click item → cycle: pending → preparing → done
- Flag 🚩 để đánh dấu đơn cần chú ý, hiện badge đỏ
- Sound alert khi đơn mới (Web Audio API hoặc audio file)
- WS reconnect tự động với exponential backoff — config chuẩn áp dụng cho cả WS lẫn SSE:
const WS_RECONNECT = {
maxAttempts: 5,
baseDelay: 1000,          // ms, tăng x2 mỗi lần retry
maxDelay: 30_000,         // ms cap
showBannerAfter: 3,       // lần thất bại trước khi hiện "Mất kết nối"
}  // Dùng chung cho /kitchen (WS), /orders/live (WS), /order/[id] (SSE)
### /cashier — POS Thu Ngân
- Layout 2 cột: trái = menu browse, phải = order summary
- Tạo đơn mới offline: chọn món trực tiếp từ danh sách
- 4 phương thức thanh toán: VNPay / MoMo / ZaloPay / Tiền mặt
- Upload ảnh xác nhận chuyển khoản (optional)
- In hóa đơn: Window.print() với print stylesheet
- Role guard: chỉ Cashier, Staff, Manager, Admin mới vào được

### /orders/live — Đơn Live (WebSocket)
- Grid layout tất cả đơn đang active
- Border color theo status: pending=gray, confirmed=blue, preparing=yellow, ready=green
- Progress bar per order dựa trên qty_served/quantity
- WS event: new_order, order_updated — auto re-render React Query cache

### /dashboard — Tổng Quan (Phase 2)
- 4 KPI Cards: Doanh thu hôm nay, Số đơn hôm nay, Đơn đang xử lý, Tồn kho cảnh báo
- BarChart (Recharts): Doanh thu theo giờ — 24 bars, tooltip format VND
- DonutChart: Phân bố phương thức: VNPay / MoMo / ZaloPay / COD
- LineChart: Doanh thu tháng này vs cùng kỳ năm ngoái (YoY) — 12 điểm
- Top Products table: top 10 tên, qty sold, revenue, % tổng

### /products — Quản Lý Sản Phẩm
- 3 tabs: Sản Phẩm / Combo / Topping
- Filter bar: category, trạng thái (active/inactive), search name
- CRUD modal: tên, giá, mô tả, category, ảnh upload, toppings
- Upload ảnh qua POST /files/upload → lưu object_path
- Soft delete: toggle is_active thay vì xóa hẳn

### /inventory — Kho Nguyên Liệu (Phase 2)
- Low-stock banner: toast notification + badge đỏ trên nav icon khi nhận WS event
- Bảng tồn kho: search, sort, inline edit qty, progress bar (qty / capacity)
- Recipe modal: chọn sản phẩm → list ingredients với qty_per_unit, unit, thêm/xóa
- WS event low_stock: realtime alert khi nguyên liệu xuống dưới threshold

# Phase 2 — Management UI Specs
### Reports Page
- 5 tab báo cáo: Revenue / Orders / Products / Inventory / Staff
- Filter bar: date range picker, granularity (hour/day/week/month), method, source
- DataTable với pagination, sort columns
- LineChart per report type
- Export CSV button: gọi streaming endpoint, download file

### Staff Page — /staff
- Staff table: avatar, tên, role badge, trạng thái, actions
- Calendar view: react-big-calendar, colour-code theo role, drag-to-create shift
- Profile modal: tab Thông tin / Lịch ca / Training — avatar upload qua /files/upload
- Training tab: progress bar per course, điểm số, download cert PDF

### Marketing Page — /marketing
- Campaign list: tên, channel, status badge, budget, start/end date
- Campaign detail: costs breakdown (ads/influencer/print/other), ROI %, CPA
- ROI formula: (Revenue − Total Spent) / Total Spent × 100
- CPA formula: Total Spent / Số đơn mới trong kỳ campaign

# Phase 3 — CV Dashboard Frontend
| ℹ️  Phase 3 thêm trang /cv-dashboard cho Manager xem realtime dish counts từ camera bếp qua YOLOv8. |
| --- |

### 17.1 Layout /cv-dashboard
| Component | Mô tả |
| --- | --- |
| Camera snapshot | Live JPEG preview từ GET /cv/snapshot (polling 5s) — xem bếp đang có gì |
| Count cards | Mỗi class YOLOv8 → 1 card: tên món, count hiện tại, icon, màu theo số lượng |
| Trend chart | LineChart (Recharts): số lượng từng món theo giờ trong ngày |
| History table | Bảng lịch sử counts: timestamp, camera, dish breakdown — pagination |
| Camera status | Badge: Online (xanh) / Offline (đỏ) / Reconnecting (vàng) theo health check |

### 17.4 Components & Hooks
| File / Component | Mô tả |
| --- | --- |
| /cv-dashboard | Page chính CV — layout 2-col: snapshot trái, count cards phải |
| CameraSnapshot | Component: img src polling /cv/snapshot mỗi 5s, loading skeleton |
| DishCountCard | Component: tên món, số lượng lớn, icon, màu (xanh<3, vàng 3-6, đỏ>6) |
| DishTrendChart | Recharts LineChart: 1 line per dish class, X-axis giờ trong ngày |
| CVStatusBadge | Component: polling /cv/health mỗi 15s → Online/Offline/Reconnecting |
| useCVStream (hook) | Custom hook: quản lý SSE connection, state, reconnect logic |

# Folder Structure (FE)
| src/
  app/                     ← Next.js App Router pages
  components/
    ui/                    ← shadcn base components (KHÔNG sửa)
    shared/                ← Dùng lại nhiều nơi: OrderCard, StatusBadge...
    [feature]/             ← Component của từng feature (orders/, kitchen/...)
  lib/
    api.ts                 ← axios instance (auto attach JWT)
    utils.ts               ← formatVND, formatDateTime, cn()
  hooks/                   ← Custom hooks: useOrder, useKDS...
  stores/                  ← Zustand stores
  types/                   ← TypeScript interfaces
  config/                  ← env vars, constants (BASE_URL, WS_URL, timeouts)
  providers/               ← QueryClientProvider, AuthProvider, ToastProvider
  middleware.ts             ← Next.js route guard (role-based redirect) |
| --- |

# Typography & Spacing Rules
### Typography (Tailwind classes)
| Element | Tailwind Class | Ví Dụ |
| --- | --- | --- |
| Page title | text-2xl font-bold text-[#1F3864] | Tên trang chính |
| Section head | text-lg font-semibold | Tiêu đề nhóm |
| Body text | text-sm text-gray-700 | Nội dung chính |
| Caption / meta | text-xs text-gray-400 | Thời gian, phụ chú |
| Table header | text-xs font-semibold text-white | bg-[#1E3A5F] |
| Badge text | text-xs font-medium | StatusBadge |

### Spacing Rules
| Token | Tailwind | Dùng Cho |
| --- | --- | --- |
| Base unit | p-1 = 4px | Đơn vị cơ bản |
| Card padding | p-4 | Tất cả card, modal |
| Section gap | space-y-6 | Khoảng cách giữa các section |
| Page padding | px-6 py-4 | Wrapper của mỗi trang |
| Button gap | gap-2 | Khoảng giữa icon và label |
| Form gap | space-y-4 | Giữa các form field |

# Component Conventions
### Button Variants
| Variant | Tailwind / shadcn | Dùng Khi Nào |
| --- | --- | --- |
| Primary | bg-[#1F3864] text-white hover:bg-[#2E5FA3] | Action chính: Submit, Tạo, Xác nhận |
| Danger | variant="destructive" (shadcn) | Huỷ đơn, Xoá, action không hoàn lại |
| Ghost | variant="ghost" | Action phụ: Đóng, Bỏ qua |
| Outline | variant="outline" | Secondary action: Export, Filter |
| Loading btn | disabled + spinner bên trong button | Khi submit form đang chờ API |

### Input & Form Rules
| // Input / Select: dùng shadcn/ui defaults — KHÔNG custom thêm style
<Input {...register('name')} />
<Select onValueChange={setValue} />

// Form wrapper: React Hook Form + Zod schema
const schema = z.object({ name: z.string().min(1) })
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })

// Error message: inline đỏ ngay dưới field
<p className='text-xs text-red-500'>{errors.name?.message}</p> |
| --- |

# Global UI Patterns
### Loading / Empty / Error States
| State | Pattern | KHÔNG làm |
| --- | --- | --- |
| Loading | <Skeleton> component | KHÔNG dùng spinner (trừ button submit) |
| Empty | <EmptyState icon={...} message='...' action={<Button>}/> | KHÔNG để trống màn hình |
| Error | toast (sonner) cho API error | KHÔNG alert() hoặc console.log |
| Form err | inline text đỏ ngay dưới field | KHÔNG toast cho form validation |

### Data Formatting Functions (lib/utils.ts)
| Function | Output Ví Dụ | Dùng Cho |
| --- | --- | --- |
| formatVND(amount) | "1.200.000 ₫" | Mọi giá tiền hiển thị ra UI |
| formatDateTime(date) | "14:30 · 09/04/2026" | Thời gian tạo đơn, log |
| formatDate(date) | "09/04/2026" | Ngày trong báo cáo, filter |
| formatPercent(n) | "12,5%" | Progress, ROI, tỉ lệ |
| cn(...classes) | clsx + tailwind-merge | Merge Tailwind classes an toàn |

### Status Badge — <StatusBadge status={...} />
| Status | Tailwind Classes | Màu |
| --- | --- | --- |
| pending | bg-gray-100 text-gray-600 | Xám |
| confirmed | bg-blue-100 text-blue-700 | Xanh dương |
| preparing | bg-yellow-100 text-yellow-700 | Vàng |
| ready | bg-green-100 text-green-700 | Xanh lá |
| delivered | bg-teal-100 text-teal-700 | Teal |
| cancelled | bg-red-100 text-red-700 | Đỏ |

### API Call Patterns
| // GET → TanStack Query (tự cache + refetch)
const { data, isLoading } = useQuery({
  queryKey: ['orders', id],
  queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
})

// POST / PATCH / DELETE → useMutation
const mutation = useMutation({
  mutationFn: (payload) => api.post('/orders', payload),
  onSuccess: () => queryClient.invalidateQueries(['orders']),
  onError: (err) => toast.error(err.response?.data?.message),
})

// Tất cả call qua /lib/api.ts — JWT tự động attach
// 401 → gọi /auth/refresh → retry 1 lần → redirect login |
| --- |

# Navigation Map
| Route | Màn Hình | Ai Truy Cập | Đến Từ / Đi Đến |
| --- | --- | --- | --- |
| /menu | Menu online — chọn món, thêm vào giỏ | Customer (web) | → /checkout |
| /table/[tableId] | QR scan → auto load menu + gắn tableId | Customer (tại bàn) | → /checkout |
| /checkout | Xác nhận order + chọn phương thức TT | Customer / Cashier | ← /menu → /order/[id] |
| /order/[id] | Order detail — items, status, progress | Customer / Cashier / Mgr | ← /checkout, /cashier |
| /kitchen | KDS — list items cần làm, click done | Chef only | Full-screen, no navbar |
| /cashier | POS — tạo order offline, list active | Cashier | → /cashier/payment/[id] |
| /cashier/payment/[id] | Tạo payment cho order đã ready | Cashier | ← /cashier |
| /manager/dashboard | KPI cards + charts realtime | Manager+ | SSE stream |
| /manager/inventory | Danh sách kho + điều chỉnh | Manager+ | WS low_stock alert |
| /manager/staff | Danh sách nhân sự + lịch làm việc | Manager+ | → profile modal |
| /manager/reports | Báo cáo doanh thu, export CSV | Manager+ | ← dashboard |
| /cv-dashboard | Realtime dish counts từ camera YOLOv8 | Manager+ | SSE cv:counts |
| /admin | System config, quản lý accounts | Admin only | — |

# Per-Screen Spec Pointer
| Keyword trong Task | Đọc Spec File |
| --- | --- |
| "order" | "KDS" | "cart" | "checkout" | @docs/specs/orders.fe.md |
| "dashboard" | "chart" | "KPI" | @docs/specs/dashboard.fe.md |
| "inventory" | "stock" | "kho" | @docs/specs/inventory.fe.md |
| "staff" | "schedule" | "training" | @docs/specs/staff.fe.md |
| "menu" | "topping" | "combo" | @docs/specs/menu.fe.md |
| "report" | "export" | "CSV" | @docs/specs/reports.fe.md |
| "marketing" | "campaign" | "ROI" | @docs/specs/marketing.fe.md |
| "cv" | "camera" | "YOLO" | "dish count" | @docs/specs/cv.fe.md |
| Task liên quan payment | LUÔN đọc lại Business Rules trong CLAUDE.md |
| Task liên quan WebSocket | Check role restriction trong spec tương ứng |

# Autorun Rules (FE)
| Task | Action |
| --- | --- |
| Tạo component mới, page mới, custom hook | ✅ Auto-run |
| Cập nhật design token, màu sắc global | ✅ Auto-run |
| Sửa /lib/api.ts (axios instance, interceptor) | ⛔ Confirm trước — ảnh hưởng toàn bộ API calls |
| Thay đổi Zustand store schema | ⛔ Confirm trước — có thể break nhiều component |
| Cập nhật auth flow (login, refresh, logout) | ⛔ Confirm trước — security risk |
| Thay đổi routing / middleware Next.js | ⛔ Confirm trước — ảnh hưởng navigation toàn app |
| WebSocket / SSE connection logic | ⛔ Confirm trước — khó debug reconnect issue |
| Payment UI flow (checkout, QR display) | ⛔ Confirm trước — ảnh hưởng tiền thật |

# Model Selection (FE Tasks)
| Model | Dùng Cho | Không Dùng Cho |
| --- | --- | --- |
| Opus (claude-opus-4-6) | WebSocket/SSE hook phức tạp, auth flow, state machine (order status), checkout flow | Simple UI, formatter |
| Sonnet (claude-sonnet-4-6) | Page mới, component feature, custom hook, TanStack Query integration, form + Zod | Heavy real-time logic |
| Haiku (claude-haiku-4-5) | StatusBadge, utility function, seed data UI, CSS tweak, simple formatter | Business logic UI |

🍜 BanhCuon System · FRONTEND REFERENCE · v13.0 · ECC-Free · Thang 4 / 2026