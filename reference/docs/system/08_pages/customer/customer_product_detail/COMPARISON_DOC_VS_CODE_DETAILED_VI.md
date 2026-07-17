# So Sánh Chi Tiết Tài Liệu vs. Code · `customer_product_detail` (`/menu/product/:id`)

> **Phạm vi:** rà soát sâu bộ tài liệu trang này so với code thật của FE/BE, theo các trục áp dụng:
> **① giao diện component · ③ luồng dữ liệu cross-page · ④ loading · ⑤ mô hình dữ liệu FE⇄BE**.
> Trục ② (luồng dữ liệu cross-component) **không áp dụng** — trang này không có store dùng chung; các
> widget phối hợp qua local React state (`selectedToppingIds`, `qty`) trong `page.tsx`, đó là lý do
> thư mục không có file `_crosscomponent_dataflow.md`.
>
> **Chỉ đọc — không sửa code lẫn tài liệu trang.** File này + bản VI mirror + visual mockup +
> `COMPARISON_TRACKER.md` dùng chung là các file duy nhất được ghi.
> **Code wins:** mọi ô "Code thực tế" đều được truy nguồn từ code trên branch
> `experience_claude.md_system_1_test_iphon2_change_code`; mục 🔴 đã được **tự tay kiểm chứng lại**. Thực
> hiện inline (trang nhỏ: 1 BE endpoint, 5 component, không có store dùng chung, không có SSE) — không
> spawn sub-agent.
> Ngày: 2026-06-21.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component | ⚠️ Một số drift thật; một xung đột nghiêm trọng | 1 | 4 | 3 |
| 3 — Luồng cross-page | ✅ Chính xác — trace khớp code 1:1 | 0 | 0 | 0 |
| 4 — Hành vi loading | ✅ Chính xác — kể cả cờ prop dead | 0 | 0 | 0 |
| 5 — Mô hình dữ liệu FE⇄BE | ✅ Object model khớp; line anchor trong BE doc bị lỗi thời | 0 | 1 | 1 |
| **Tổng** | | **1** | **5** | **4** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **Hai thanh `fixed bottom-0` cùng tồn tại trên route này — CTA và thanh tab toàn cục đè lên nhau.**
   ASCII của trang (`customer_product_detail.md:32-34`) vẽ **CTAFooter** và **ClientBottomNav** như hai
   thanh **xếp chồng gọn gàng**. Trong code, cả hai đều **neo vào cùng một dải đáy**:
   - `CTAFooter` → `fixed bottom-0 left-0 right-0 … pb-safe-4`, **không có z-index** (`CTAFooter.tsx:12`).
   - `ClientBottomNav` → `fixed bottom-0 left-0 right-0 z-20 …`, được render bởi shell trên **mọi**
     route `(shop)` bao gồm route này (`fe/src/app/(shop)/layout.tsx:12`, `ClientBottomNav.tsx:48`).

   Vì cả hai đều pin tại `bottom-0` và nav mang `z-20` trong khi CTA không có stacking context, thanh
   tab đáy sẽ vẽ **đè lên** nút "Thêm vào giỏ hàng" — chúng không xếp chồng mà chồng đè nhau. Spacer
   `pb-32` của trang (`page.tsx:90`) và `pb-[72px]` của layout (`layout.tsx:11`) chỉ giải phóng
   không gian cuộn cho nội dung nhưng **không** tách hai thanh fixed ra khỏi nhau. **Đây là lỗi
   thật về visual/product, không chỉ là tài liệu cũ** — CTA chính của trang detail có thể bị thanh
   tab che khuất. (Pixel overlap chính xác cần screenshot — stack đang tắt; xung đột CSS được xác nhận
   từ source.)
   → Fix là thay đổi **code** (nâng CTA lên trên nav, ví dụ `bottom-[72px]`, hoặc ẩn nav trên route
   detail) và phải được đăng ký vào `MASTER_TASK.md` trước.

---

## Component chết / không thể chạm tới

- **Prop `loading?` của `CTAFooter` là dead trên branch này.** `CTAFooter` nhận `loading?: boolean`
  và dùng nó cho `aria-label` + `disabled` (`CTAFooter.tsx:6,15-16`), nhưng call site duy nhất
  (`page.tsx:98-102`) không bao giờ truyền prop này — `handleAddToCart` là Zustand write đồng bộ +
  `router.back()`. Đã ghi trong `customer_product_detail_loading.md` Flag 1; xác nhận lại.

---

## Mảng 1 — Giao Diện Component

**Kết luận:** ⚠️ Các zone chứa dữ liệu (Hero, Info, Quantity) khớp, nhưng **ToppingSelector** và
**CTAFooter** trong code khác với ASCII, và hai thanh đáy xung đột nhau (🔴 ở trên).

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| CTA vs bottom nav | ASCII xếp `CTAFooter` rồi `ClientBottomNav` thành hai thanh gọn gàng (`customer_product_detail.md:32-34`) | cả hai đều `fixed bottom-0`; CTA không có z-index (`CTAFooter.tsx:12`), nav là `z-20` và được shell render trên mọi route (`(shop)/layout.tsx:12`, `ClientBottomNav.tsx:48`) → đè nhau | 🔴 | **Code:** tách hai thanh (CTA dùng `bottom-[72px]` hoặc ẩn nav ở đây) — đăng ký vào MASTER. Sau đó vẽ lại ASCII. |
| Tiêu đề nav | `[←]  Chi tiết món` (`customer_product_detail.md:16`) | `title="Chi tiết sản phẩm"` (`page.tsx:52`) | 🟡 | Cập nhật ASCII thành "Chi tiết sản phẩm". |
| Heading ToppingSelector | `Topping (chọn thêm)` (`customer_product_detail.md:26`) | `Chọn topping (chọn nhiều · thêm vào giá)` (`ToppingSelector.tsx:25-27`) | 🟡 | Cập nhật chữ heading trong tài liệu. |
| Layout ToppingSelector | danh sách checkbox dọc, một topping mỗi hàng (`customer_product_detail.md:27-28`) | **grid 2 cột gồm các card có viền** (`grid grid-cols-2`, `ToppingSelector.tsx:29`) + một **dòng tóm tắt tổng** `Tổng: base + sum = …` khi chọn ≥1 (`ToppingSelector.tsx:63-67`) — không có trong ASCII | 🟡 | Vẽ lại zone C thành card grid 2 cột; thêm dòng tổng. |
| Chữ CTA khi hết hàng | "CTA disabled với trạng thái **'Hết hàng'**" (`customer_product_detail.md:57`) | render **"Sản phẩm tạm hết"** khi `!isAvailable` (`CTAFooter.tsx:21`) | 🟡 | Cập nhật tài liệu theo chuỗi thực tế. |
| Badge trạng thái | Zone B là `(name · price · desc · availability)` — chung chung (`customer_product_detail.md:24,45`) | render `Badge` "✓ Còn hàng" / "Hết hàng" (`ProductInfo.tsx:16-20`) | 🟢 | Thêm badge vào ASCII. |
| Zones table thiếu nav | Bảng Zones liệt kê Nav, A–E, Skeleton thôi (`customer_product_detail.md:41-49`); ASCII vẽ `ClientBottomNav` là "(shell)" | `ClientBottomNav` được render bởi `(shop)/layout.tsx:12` trên route này | 🟢 | Thêm hàng Zones cho shell bottom-nav. |
| Độ phong phú của Hero | ASCII chỉ là khối "HERO IMAGE" đơn giản (`customer_product_detail.md:18-22`) | thêm gradient overlay ở đỉnh + fallback 2 chữ cái khi không có/hỏng ảnh (`ProductHeroImage.tsx:27-34`) | 🟢 | Ghi chú gradient + fallback vào tài liệu. |

**Đã khớp:** Hero aspect `aspect-[390/220]` (`ProductHeroImage.tsx:15` = tài liệu), `QuantityStepper`
`min=1` với `[−]` bị disabled tại sàn (`QuantityStepper.tsx:12,20-22` = tài liệu), tổng live trong CTA
(`page.tsx:31,99` = tài liệu), toggle topping cập nhật tổng (`ToppingSelector.tsx:12-18` = tài liệu), topping
hết hàng hiện disabled không bị lọc bỏ (`ToppingSelector.tsx:37,48` = `_be.md` Flag 3).

---

## Mảng 3 — Luồng Cross-Page

**Kết luận:** ✅ Chính xác. `customer_product_detail_crosspage_dataflow.md` trace khớp code 1:1 —
không tìm thấy drift.

**Đã khớp (kiểm tra từng mục):**
- Handoff build một `CartItem` `id = product_<id>_<sortedToppingIds|plain>`, `type:'product'`,
  `unitPrice` định giá phía FE (`page.tsx:33-46` = tài liệu §1).
- `addItem` dedup theo `CartItem.id`, tăng quantity khi khớp (`cart.ts:50-60` = tài liệu §2).
- `partialize` chỉ persist **duy nhất** `{ orderNote, activeOrderId }`; `items[]` / `tableId` / `tableName`
  chỉ là session-memory và mất khi F5 (`cart.ts:153` = tài liệu §5, ma trận Durability).
- Persist target `STORAGE_KEYS.CART_CONFIG = 'cart-config-v3'`, Zustand `version: 5`
  (`storage-keys.ts:6`, `cart.ts:128-129` = tài liệu §5 — cả key **lẫn** version 5 đều đúng).
- Sản phẩm đơn lẻ → `{ product_id, combo_id:null, quantity, topping_ids: toppings.map(t=>t.id) }`
  qua `buildOrderItemsPayload` duy nhất (`order-payload.ts:46-54` = tài liệu §4).
- Không có SSE / BroadcastChannel / BE cart — đa thiết bị không chia sẻ gì trước khi đặt hàng (= tài liệu §6).

---

## Mảng 4 — Hành Vi Loading

**Kết luận:** ✅ Chính xác, kể cả các flag riêng. `customer_product_detail_loading.md` khớp code.

**Đã khớp:**
- Ba nhánh loại trừ nhau `isLoading → Skeleton`, `isError → panel`, `product → content`
  (`page.tsx:57,59-69,71-104` = bảng tài liệu).
- `ProductDetailSkeleton` = 4 zone, grid topping 2×2 cố định bất kể số topping thực
  (`ProductDetailSkeleton.tsx:5,8-19,22-29,32-39` = tài liệu).
- `useProductDetail` `queryKey ['products', id]`, `staleTime 5m`, `enabled: !!id`
  (`useProductDetail.ts:6-11` = tài liệu Hook Semantics).
- Copy lỗi chung "Không tìm thấy sản phẩm." cho mọi lỗi, không có retry (`page.tsx:61` = tài liệu Flag 3).
- **Prop `loading?` dead trên `CTAFooter`** xác nhận (`CTAFooter.tsx:6,15-16` vs call site
  `page.tsx:98-102` = tài liệu Flag 1) — xem danh sách Dead-code ở trên.

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** ✅ Object model khớp hoàn toàn. Chỉ có **line anchor của `main.go`** trong BE doc bị lỗi
thời (file đã dịch chuyển ~13 dòng kể từ khi trace) — nội dung đúng, số dòng cũ.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Line anchor của route | route tại `main.go:169`, group tại `:167`, subgroup mgr/adm `:170-182` (`_be.md:23-26,42`) | group `main.go:180`, `GET /:id` `main.go:182`, khối mgr `:183-190`, khối adm `:191-194` | 🟡 | Cập nhật lại số dòng `main.go` trong `_be.md`. |
| Branch xuất xứ | header ghi branch `experience_claude.md_system_1` (`_be.md:6`, các file khác) | branch hiện tại `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Cập nhật branch trong header xuất xứ ở lần refresh tài liệu tiếp theo. |

**Đã khớp:**
- `productJSON` emit chính xác `id, name, price, description, image_path, is_available, sort_order,
  category_id, category_name, toppings[]` (`product_handler.go:448-459`) = type FE `Product`
  (`types/product.ts:14-25`) = shape Response trong `_be.md`.
- Topping JSON `{id, name, price, is_available}` (`product_handler.go:446`) = FE `Topping`
  (`types/product.ts:7-12`).
- Luồng `GetProduct`: Redis `product:<id>` hit → unmarshal → return; miss → `GetProductByID`
  (`ErrNoRows → ErrNotFound`) → `buildCategoryMap` → `GetToppingsByProductID` → `enrichProduct` →
  `setCacheJSON` (`product_service.go:212-234`) = Per-Endpoint Detail trong `_be.md`.
- Cache key `product:<id>` + `productCacheTTL = 5m` (`product_service.go:21,213`) = tài liệu.
- Sửa topping **không** bust `product:<id>` (`invalidateToppingCaches` chỉ Del
  toppings/products lists, `product_service.go:719-721`) = `_be.md` Flag 2 (lỗ hổng code thật, không phải drift).

---

## Danh Sách Hành Động Gộp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Tách hai thanh `fixed bottom-0` — nâng `CTAFooter` lên trên nav (`bottom-[72px]`) hoặc ẩn `ClientBottomNav` trên `/menu/product/:id` | `fe/src/components/product-detail/CTAFooter.tsx` hoặc `fe/src/app/(shop)/layout.tsx` |
| 2 | 🟡 Sửa tài liệu | Vẽ lại ASCII zone C thành card grid 2 cột + dòng tổng; sửa tiêu đề nav → "Chi tiết sản phẩm"; heading topping; chữ CTA hết hàng "Sản phẩm tạm hết" | `customer_product_detail.md` |
| 3 | 🟡 Sửa tài liệu | Cập nhật lại line anchor của `main.go` (group 180 / GET 182 / mgr 183-190 / adm 191-194) | `customer_product_detail_be.md` |
| 4 | 🟢 Sửa tài liệu | Thêm hàng ClientBottomNav vào bảng Zones; thêm availability badge + gradient/fallback hero vào ASCII; cập nhật branch xuất xứ | `customer_product_detail.md`, tất cả header `_*.md` |

> Theo `CLAUDE.md`: các sửa tài liệu (#2–#4) là **một** task doc đã ALIGN; thay đổi code (#1) phải được
> đăng ký vào `MASTER_TASK.md` **trước khi chạm vào bất kỳ file nào**. Skill này không thay đổi gì cả.
