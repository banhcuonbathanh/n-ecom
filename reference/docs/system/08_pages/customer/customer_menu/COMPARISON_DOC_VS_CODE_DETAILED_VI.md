# Customer Menu — So Sánh Chi Tiết Tài Liệu vs. Code (5 Mảng)

> **Phạm vi:** rà soát sâu bộ tài liệu `customer_menu` so với code thật của trang `/menu` theo 5 trục:
> (1) giao diện component · (2) luồng dữ liệu cross-component Zustand · (3) luồng dữ liệu cross-page
> Zustand · (4) hành vi loading · (5) mô hình dữ liệu FE⇄BE. **Chỉ đọc — KHÔNG sửa code/tài liệu.**
> Thực hiện bởi 5 sub-agent Sonnet chạy song song; mọi mục 🔴 đã được **tự tay kiểm chứng lại** (kèm file:line).
> Nhánh được rà soát: `docs/customer-menu-alignment`. Ngày: 2026-06-25.

> ⚠️ **HƯỚNG DRIFT ĐÃ ĐẢO CHIỀU (2026-06-25).** Lần chạy trước (2026-06-20/23) coi
> `DESIGN_PROMPT.md` như một thiết kế *tương lai* mà code chưa xây ("8 gap cần rebuild"). **Điều đó
> không còn đúng nữa: code đã được xây lại** — MenuHeader là banner ảnh, scroll-spy nav
> (`MenuCategoryNav` + `MenuSections`) đã thay thế filter tabs, `CartBottomBar` là hai pill nổi,
> nhân `ComboCard` là multi-select, `OrderSummary` có vòng quay "Bàn 04" và không có badge "Gọi thêm",
> và `TableConfirmModal` nay gọi `setActiveOrderId`. Vậy là hầu hết "🔴 gap rebuild" đã ĐÓNG.
> Drift nay chạy ngược lại: **`customer_menu.md` tràn ngập các marker stale
> "⚠️ NEW DESIGN — code pending rebuild" đã lỗi thời — code đã ở đó rồi.** Các mục thực sự còn lại
> là danh sách ngắn các lệch lạc thực sự giữa code và thiết kế (bên dưới) cùng các việc dọn tài liệu.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 · Giao diện component | Hầu hết "gap rebuild" đã ĐÓNG; 3 lệch lạc code thực sự + marker tài liệu stale | 3 | 6 | nhiều ✅ |
| 2 · Luồng cross-component | Store/selectors/cổng canh đều khớp; 1 lỗi thực sự về ngắt kết nối ghi chú | 1 | 1 | nhiều ✅ |
| 3 · Luồng cross-page | Handoff 201 nay ĐÚNG (vốn là tiêu đề cũ); chỉ còn nit về diễn đạt/số dòng | 0 | 3 | nhiều ✅ |
| 4 · Loading | Hành vi hoàn hảo; tài liệu có 3 lỗi mô tả nghiêm trọng | 3 | 4 | nhiều ✅ |
| 5 · Mô hình FE⇄BE | Object model chính xác; chỉ có nit nullable-type + code chết | 0 | 4 | vài ✅ |

**🔴 NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG (đã tự tay kiểm chứng):**

1. **`TableConfirmModal` bỏ mất ghi chú mà khách đã nhập.** Modal xác nhận QR giữ
   `const [note, setNote] = useState('')` riêng của nó ([TableConfirmModal.tsx:15](../../../../fe/src/features/menu/components/TableConfirmModal.tsx#L15))
   và POST `note: note.trim() || null` ([:23](../../../../fe/src/features/menu/components/TableConfirmModal.tsx#L23)).
   Nó không bao giờ đọc `cart.orderNote`. Nhưng textarea GHI CHÚ của `OrderSummary` ghi `orderNote` vào
   store qua `setOrderNote` ([OrderSummary.tsx:62,300-304](../../../../fe/src/features/menu/components/OrderSummary.tsx#L62)).
   → Một khách hàng gõ ghi chú trong order summary, rồi nhấn "Thanh toán", sẽ thấy ô ghi chú **trống**
   trong modal và **ghi chú của họ bị âm thầm bỏ khỏi POST**. Mất dữ liệu thực sự.
   *Sửa (code):* khởi tạo note modal từ store (`useState(cart.orderNote)`) hoặc bỏ textarea trong modal
   và gửi `cart.orderNote` lúc POST. Đăng ký vào MASTER trước.

2. **Tiêu đề `ComboSection` hiện "Combo" nhưng tab nav hiện "Suất" và thiết kế ghi "SUẤT".**
   `ComboSection.tsx:16` render `<h2>Combo</h2>` ([ComboSection.tsx:16](../../../../fe/src/features/menu/components/ComboSection.tsx#L16)),
   trong khi `buildMenuSections` đặt nhãn tab nav của cùng section là `'Suất'`
   ([MenuSections.tsx:29](../../../../fe/src/features/menu/components/MenuSections.tsx#L29)) và
   `DESIGN_PROMPT.md` gọi nó là **SUẤT**. Ba chiều không nhất quán, hiển thị trực tiếp trên màn hình.
   *Sửa (code):* đổi tiêu đề thành "SUẤT" (hoặc "Suất") để khớp tab + thiết kế.

3. **Một `RestaurantBanner` thứ hai, chưa được tài liệu hoá, xếp chồng dưới banner ảnh chính.** `page.tsx:131` render
   `<RestaurantBanner />` ([page.tsx:131](../../../../fe/src/app/(shop)/menu/page.tsx#L131)) — một banner
   `h-44` đầy đủ với `<img src="/restaurant-banner.jpg">` + tagline "Bánh cuốn tươi — ngon mỗi ngày"
   ([RestaurantBanner.tsx:3-21](../../../../fe/src/features/menu/components/RestaurantBanner.tsx#L3)).
   `DESIGN_PROMPT.md` chỉ có MỘT banner header; không có zone banner thứ hai. File ảnh nhiều khả năng
   vắng mặt trong `/public` (handler `onError` thay thế bằng gradient một cách âm thầm), nên trên màn
   hình đây là một dải gradient thừa. *Sửa:* bỏ khỏi `page.tsx`, hoặc chính thức đưa vào thiết kế
   như một zone và ship asset. Quyết định của owner.

**Đã giải quyết từ lần chạy trước (không còn là 🔴):**
- Tiêu đề cũ "`TableConfirmModal` KHÔNG gọi `setActiveOrderId`" đã được **sửa** — nó được gọi tại
  [TableConfirmModal.tsx:51](../../../../fe/src/features/menu/components/TableConfirmModal.tsx#L51).
- "Header đọc `settings.tableLabel`" — đã biến mất; `MenuHeader.tsx` không dùng store, là banner ảnh tĩnh.
- "CategoryTabs là filter, không phải scroll-spy" — đã được thay thế bởi `MenuCategoryNav` (scroll-spy anchors).

**Component chết/không thể chạm tới phát hiện được:**
- `ToppingModal.tsx` — không có import nào ở bất kỳ đâu; chết hoàn toàn. *(Owner xoá sau — để yên.)*
- `ComboModal` — được `ComboCard` import & mount nhưng `setModalOpen(true)` **không bao giờ được gọi**
  ([ComboCard.tsx:17,97,201-206](../../../../fe/src/features/menu/components/ComboCard.tsx#L17)); luôn
  render `null`. Không thể chạm tới. *(Owner xoá sau — để yên.)*
- `CategoryTabs.tsx` — **không** chết hoàn toàn (POS dùng, `/pos/page.tsx:9,255`), nhưng chết với `/menu`.
  Bảng Zones trong tài liệu menu vẫn gọi nó là component menu; nên đổi thành `MenuCategoryNav`.

---

## Mảng 1 — Giao Diện Component

**Kết luận:** thiết kế mới đã được xây. Hầu hết zone đều khớp; các marker stale "code pending rebuild"
trong `customer_menu.md` là drift chủ yếu, cộng thêm 3 lệch lạc code thực sự (tiêu đề 2–3 + claim
pre-fill ghi chú).

| Component/Zone | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| A · MenuHeader | banner ảnh, tiêu đề Playfair, không pill/bàn/đăng nhập | đúng vậy (`MenuHeader.tsx:15-33`) | 🟢 | marker chính xác |
| Mini · MiniCartStrip | `🛒 13 món · 103.000đ [Xem giỏ →]` | pill cam "N món" + hàng chip món cuộn + giá, một vùng nhấn, không có nhãn "Xem giỏ →" (`MiniCartStrip.tsx:20-38`) | 🟡 | tài liệu: bỏ nhãn / ghi nhấn ngầm |
| Banner · RestaurantBanner | liệt kê "static" trong Zones; vắng mặt khỏi DESIGN_PROMPT | banner `h-44` thứ 2 đầy đủ, ảnh thiếu → fallback gradient (`RestaurantBanner.tsx:3-21`, `page.tsx:131`) | 🔴 | **tiêu đề 3** — bỏ hoặc đưa vào làm zone chính thức |
| AddToOrderBanner | `▸ Đang thêm món vào đơn #123 [Xem đơn]` | "Chọn món để thêm vào đơn hàng hiện tại" + "Xem đơn"; không có số đơn (`AddToOrderBanner.tsx:14-25`) | 🟡 | tài liệu: khớp copy |
| ActiveOrderRecoveryBanner | `Đơn hàng #123 đang xử lý — thêm món?` | khớp, dùng `order.order_number` (`ActiveOrderRecoveryBanner.tsx:55-70`) | 🟢 | — |
| B · SearchBar | `🔍 Tìm món nhanh...`, ≥2 ký tự | "Tìm món nhanh..." debounce 300ms, cổng ≥2, gợi ý 1-ký-tự (`SearchBar.tsx:26,38-40`) | 🟢 | — |
| C · Nav | Zones đặt tên `CategoryTabs`; "code pending rebuild" | page render `MenuCategoryNav` scroll-spy (`page.tsx:9,147-153`; `MenuCategoryNav.tsx:13-36`); `CategoryTabs` là component filter của POS | 🟡 | tài liệu: đổi tên zone → `MenuCategoryNav`; bỏ marker |
| D · FavouritesRail | "code pending rebuild"; chữ hoa "YÊU THÍCH" | render khi có ≥1 yêu thích, "Yêu thích" + icon Heart, nhấn → detail (`FavouritesRail.tsx:23-54`) | 🟡 | tài liệu: bỏ marker; nit về casing |
| E · Tiêu đề ComboSection | "SUẤT" | `<h2>Combo</h2>` (`ComboSection.tsx:16`) trong khi tab = "Suất" (`MenuSections.tsx:29`) | 🔴 | **tiêu đề 2** — đặt tiêu đề thành SUẤT |
| E · Nhân ComboCard | multi-select, cả hai mặc định, ≥1; "code pending rebuild" | multi-select Set, `toggleNhan` chặn bỏ chọn cuối, tim yêu thích (`ComboCard.tsx:39-57,116-198`) | 🟢 | bỏ marker |
| E · Items ComboCard | inline "1 bánh trứng chín + 3 bánh cuốn…" | `<ul>` các hàng `×N product_name` (`ComboCard.tsx:131-142`) | 🟡 | tài liệu: vẽ lại thành danh sách |
| F · ProductCard / GridCard | pill nhân inline, stepper, tim, không modal | khớp; `ProductGridCard` là biến thể grid desktop (`ProductCard.tsx:53-151`, `ProductGridCard.tsx:53-145`) | 🟢 | tài liệu: ghi nhận biến thể grid tồn tại |
| I · OrderSummary — pill | vòng quay "Bàn 04"; "code pending rebuild" | `running-border` conic-gradient trên span tableName (`OrderSummary.tsx:148`; keyframes `globals.css`) | 🟢 | bỏ marker |
| I · OrderSummary — ghi chú | textarea **pre-filled** "Gia đình (mẹ + 2…)" | `value={orderNote}`, chỉ là placeholder, bắt đầu trống (`OrderSummary.tsx:300-304`) | 🔴→doc | **owner quyết định KHÔNG pre-fill** → sửa tài liệu: ghi chú bắt đầu trống |
| I · OrderSummary — Gọi thêm | "không có badge Gọi thêm" | vắng mặt (toàn bộ file) | 🟢 | bỏ marker |
| I · OrderSummary — Tổng số món | bảng 5 cột thu gọn được | khớp (`OrderSummary.tsx:240-287`) | 🟢 | — |
| J · CartBottomBar | hai pill xếp chồng, không tổng; "code pending rebuild" | khớp (`CartBottomBar.tsx:19-41`) | 🟢 | bỏ marker |
| Cart drawer | "slide-up" | trượt từ bên PHẢI (`CartDrawer.tsx:69-71`) | 🟡 | tài liệu: sửa hướng |
| TableConfirmModal | "Xác nhận đặt hàng" / "Đặt hàng" + textarea ghi chú | copy khớp (`TableConfirmModal.tsx:64-103`) | 🟢 | — (nhưng xem lỗi ghi chú ở Mảng 2) |

**Đã xác nhận khớp:** MenuHeader, ActiveOrderRecoveryBanner, SearchBar, multi-select+tim ComboCard,
ProductCard/GridCard, OrderSummary vòng quay + không-Gọi-thêm + bảng Tổng-số-món, CartBottomBar,
copy TableConfirmModal.

---

## Mảng 2 — Luồng Cross-Component (Zustand)

**Kết luận:** hình dạng store, tên action, công thức selector, cổng canh và quy tắc "không truyền
props giữa zone→zone" đều khớp. Một lỗi thực sự: ngắt kết nối ghi chú (tiêu đề 1).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Ghi chú TableConfirmModal | xây payload từ store | `useState('')` cục bộ, POST ghi chú cục bộ; `cart.orderNote` bị bỏ qua (`TableConfirmModal.tsx:15,23`) | 🔴 | **tiêu đề 1** — khởi tạo từ `cart.orderNote` hoặc đọc store lúc POST |
| Cổng canh OrderSummary | tài liệu ngụ ý `id.startsWith('canh_')` ở cả hai | ở đây là `totalCanh === 0` (tổng qty `canh_<id>_rau/plain`) (`OrderSummary.tsx:83-90`) | 🟡 | tài liệu: ghi nhận sự khác biệt cấu trúc (kết quả tương đương) |
| partialize, dedup `addItem`, `total()`/`itemCount()`, chữ ký `setCanhQty`, danh sách `clearCart`, MenuHeader không store, không-zone→zone | như tài liệu | xác nhận (`cart.ts:51-59,94,129-130,35,158`; `MenuHeader.tsx`) | 🟢 | — |

**Đã xác nhận khớp:** partialize `{orderNote, activeOrderId}`; cổng canh trong `page.tsx:41`; dedup `addItem`;
`total()`/`itemCount()`; `setCanhQty` 4 arg + `canh_<id>_rau/plain`; MenuHeader không store;
phạm vi `clearCart`; selectors MiniCartStrip; quy tắc không-zone→zone.

---

## Mảng 3 — Luồng Cross-Page (Zustand)

**Kết luận:** các luồng lớn đều đúng — và **tiêu đề cũ (handoff 201 thiếu
`setActiveOrderId`) đã được SỬA**. Chỉ còn nit về diễn đạt + số dòng.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Handoff 201 | `clearCart() → setActiveOrderId(id) → router.replace` | đúng vậy (`TableConfirmModal.tsx:48,51,53`; `checkout/page.tsx` tương tự) — **đã giải quyết** | 🟢 | — |
| "clearCart GIỮ activeOrderId" | diễn đạt trong `customer_menu.md:269` / crosspage §2 | `clearCart` chỉ reset `items/paymentMethod/orderNote` (`cart.ts:94`); không động vào `activeOrderId`, và `setActiveOrderId(id)` ghi đè nó ở dòng tiếp theo | 🟡 | tài liệu: diễn đạt lại — không phải "giữ", chỉ là không reset, rồi bị ghi đè |
| Chuỗi key CART_CONFIG | tài liệu nói "v5" | persist `version: 5` (`cart.ts:134`) nhưng chuỗi KEY localStorage là `'cart-config-v3'` (`storage-keys.ts:6`) | 🟡 | tài liệu: làm rõ version 5 vs chuỗi key `cart-config-v3` |
| Tham chiếu dòng "Theo dõi" | trích dẫn dòng 564 | thực tế `order/[id]/page.tsx:572` | 🟡 | tài liệu: cập nhật số dòng |
| partialize, order_cache (3 nơi ghi / quét list), dừng SSE, xoá terminal, add-to-order, QR scan, cô lập admin | như tài liệu | tất cả xác nhận (`cart.ts:158`; `storage-keys.ts:3`; `order/page.tsx:10-24`; `useOrderSSE.ts:101-121`; `order/[id]/page.tsx:65-69,583`; `table/[tableId]/page.tsx:30-31`) | 🟢 | — |

**Đã xác nhận khớp:** tất cả các hàng 🟢 ở trên.

---

## Mảng 4 — Hành Vi Loading

**Kết luận:** hành vi hoàn hảo; TÀI LIỆU có ba lỗi mô tả nghiêm trọng (một segment query-key ma,
một nhánh bị bỏ sót, một điều kiện guard sai) cộng thêm số dòng stale.

| # | Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|---|
| 1 | queryKey products | `['products', selectedCategory, searchQuery]` | `['products', searchQuery]` — không có `selectedCategory` (`page.tsx:67`) | 🔴 | tài liệu: bỏ segment `selectedCategory` |
| 2 | Nhánh main-content | 3 trạng thái (error/loading/empty) | 5 nhánh bao gồm một nhánh `searching` riêng biệt (`page.tsx:162-200`) | 🔴 | tài liệu: thêm nhánh `searching` ở ưu tiên 3 |
| 3 | Guard category-empty | `products.length===0 && !showCombos` | `products.length===0 && combos.length===0` — không có biến `showCombos` (`page.tsx:190`) | 🔴 | tài liệu: sửa guard |
| 4 | Thứ tự khai báo query | categories→all→combos→products | categories→all→**products**→combos (`page.tsx:53,60,66,79`) | 🟡 | tài liệu: đổi chỗ hàng 3/4 |
| 5–7 | Tham chiếu dòng stale | Suspense 201-207, skeleton 151-165, empty 166-170 | Suspense 224-229, skeleton 170-183, empty 184-191 | 🟡 | tài liệu: cập nhật |
| — | staleTime, cổng enabled, isLoading/isError/refetch chỉ products, hình dạng skeleton, copy lỗi, `min-h-[44px]` trên Button, Suspense không fallback, spinner route | như tài liệu | tất cả xác nhận (`page.tsx:56,76,66,172-182,164-165,226`; `loading.tsx`) | 🟢 | — |

**Đã xác nhận khớp:** staleTime (4×5m), cổng enabled, products-drives-loading, cả hai hình dạng skeleton,
copy lỗi + Button `min-h-[44px]`, Suspense không fallback, spinner route, ProductList không có skeleton riêng.

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** Object Model §1–§6 chính xác; chỉ có nit nullable-type + `buildImageURL` chết.

| Object.Attr / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Flag 1 — params filter products | BE bỏ qua `category_id`/`search` | `ListProducts` có zero lời gọi `c.Query` (`product_handler.go:42-54`) | 🟢 | chính xác |
| Flag 2 — quy ước null | BE gửi `""` không phải `null`; FE typed `string\|null` | `enrichProduct`/`enrichCombo` gộp NULL→`""` (`product_service.go:627-695`); FE `product.ts:19-20,38-46` | 🟡 | FE: bỏ `\| null` (hoặc BE gửi null thật) |
| Flag 3 — Category bỏ sót field | BE gửi `description`+`is_active`; FE bỏ | xác nhận (`product_handler.go:169-190`; `product.ts:1-5`) | 🟡 | thêm field optional nếu cần |
| Flag 4 — combo enrichment xuống cấp | product thiếu → UUID thô | xác nhận cấu trúc qua type `ComboItem`; `page.tsx:99-102` | 🟡 | chấp nhận / thêm error path |
| `buildImageURL` | "đường dẫn object, không phải URL đầy đủ" | định nghĩa tại `product_handler.go:31-37`, **zero call site**; gửi path thô | 🟡 | gọi nó hoặc xoá |
| OrderItemPayload | `{product_id,combo_id,quantity,topping_ids,note?,combo_items?}` | khớp `createOrderItemReq` (`order_handler.go:33-40`); XOR `:77-86`; JSON null→`""` | 🟢 | — |
| Cột `filling` | vắng mặt (016 thêm, 017 xoá) | 016 thêm, 017 UP xoá; zero tham chiếu Go/FE | 🟢 | chính xác |
| `note` cấp đơn | — | `""` cả hai phía (`order_handler.go:331-334`) | 🟢 | — |

**Đã xác nhận khớp:** Flag 1, Flag 3, XOR, note đơn `""`, vắng mặt `filling`, hình dạng struct `ProductDetails`/
`ComboDetails`, hình dạng wire `combo_items`, `buildImageURL` chết, căn chỉnh OrderItemPayload.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | Mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | `TableConfirmModal`: khởi tạo note từ `cart.orderNote` (hoặc đọc store lúc POST) để ghi chú đã nhập không bị mất | `TableConfirmModal.tsx:15,23` |
| 2 | 🔴 Sửa code | Tiêu đề `ComboSection` "Combo" → "SUẤT" (khớp tab nav + DESIGN_PROMPT) | `ComboSection.tsx:16` |
| 3 | 🔴 Code/owner | Bỏ `RestaurantBanner` thứ 2 (hoặc đưa vào làm zone thiết kế + ship `/restaurant-banner.jpg`) | `page.tsx:131`, `RestaurantBanner.tsx` |
| 4 | 🔴 Sửa tài liệu | Gỡ tất cả marker stale "⚠️ NEW DESIGN — code pending rebuild" (C/D/E/I/J đã được xây) | `customer_menu.md` |
| 5 | 🔴 Sửa tài liệu | Bảng Zones: `CategoryTabs` → `MenuCategoryNav` | `customer_menu.md` |
| 6 | 🔴 Sửa tài liệu | Ghi chú KHÔNG pre-filled — bỏ claim pre-fill "Gia đình…" (owner: giữ trống) | `customer_menu.md` |
| 7 | 🔴 Sửa tài liệu | Loading: bỏ `selectedCategory` khỏi queryKey; thêm nhánh `searching`; sửa `!showCombos`→`combos.length===0`; đổi chỗ thứ tự products/combos; cập nhật số dòng | `customer_menu_loading.md` |
| 8 | 🟡 Sửa tài liệu | Diễn đạt clearCart "giữ activeOrderId"; key CART_CONFIG `cart-config-v3` vs version 5; dòng "Theo dõi" 572 | `customer_menu.md`, `_crosspage_dataflow.md` |
| 9 | 🟡 Sửa tài liệu | Copy/layout: nhãn MiniCartStrip, copy AddToOrderBanner, hướng trượt CartDrawer, danh sách item ComboCard, casing (Combo/Canh/Yêu thích), cấu trúc cổng canh OrderSummary | bộ tài liệu |
| 10 | 🟡 Sửa type | Nullable types FE (`description`/`image_path`/combo `category_id`) → `string` | `fe/src/types/product.ts` |
| 11 | 🟡 Dọn code | `buildImageURL` — gọi trong serializer hoặc xoá | `product_handler.go` |
| 12 | ⬜ Hoãn lại | `ToppingModal` chết / `ComboModal` không thể chạm — owner xoá sau (ngoài phạm vi) | `features/menu/components/` |

> Theo `CLAUDE.md` (MASTER trước + scope contract): các sửa tài liệu là một task; mỗi thay đổi code
> (#1, #2, #3, #11) phải được đăng ký vào `MASTER_TASK.md` trước khi chạm vào bất kỳ file nào.
