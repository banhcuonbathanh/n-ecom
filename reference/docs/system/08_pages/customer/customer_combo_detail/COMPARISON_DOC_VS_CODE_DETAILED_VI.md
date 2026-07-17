# Combo Detail — Tài Liệu vs. Code (Đối Chiếu Chi Tiết)

> **Phạm vi:** đối chiếu read-only bộ tài liệu trang `customer_combo_detail` với code đang chạy thật
> trên nhánh `experience_claude.md_system_1_test_iphon2_change_code`.
> **Các trục (4):** ① Hình ảnh component · ③ Luồng dữ liệu cross-page · ④ Hành vi loading · ⑤ Mô hình
> dữ liệu FE⇄BE.
> (Trục ② Cross-component dataflow **N/A** — trang này không có store dùng chung; client state duy nhất
> là một biến `qty` `useState` cục bộ + một lời gọi `addItem`. Không có `_crosscomponent_dataflow.md`.)
> **Read-only** — không sửa code ứng dụng, không sửa bộ tài liệu của trang; chỉ phơi bày drift, không
> sửa nó.
> **Làm inline** (một component inline nhỏ — `page.tsx` 217 dòng, 2 GET public); mọi `file:line` trace
> từ source trên nhánh hiện tại, **các claim loại 🔴 đã được xác minh lại bằng tay**.
> **Route:** `/menu/combo/:id` → `fe/src/app/(shop)/menu/combo/[id]/page.tsx`.
> **Ngày:** 2026-06-20.

---

## Tóm Tắt Điều Hành

| Khu vực | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Hình ảnh component | Phần lớn chính xác; lệch nhỏ về layout/copy + UI "hết hàng" là dead code | 0 | 2 | 3 |
| ③ Luồng cross-page | Chính xác — handoff, partialize, builder đều khớp source | 0 | 0 | 1 |
| ④ Hành vi loading | Hoàn toàn chính xác — gate, nhánh, skeleton, flash đều khớp | 0 | 0 | 0 |
| ⑤ Mô hình dữ liệu FE⇄BE | Logic/auth đúng; **số dòng** route đã lệch (~13 dòng) | 0 | 1 | 2 |
| **Tổng** | **Bộ tài liệu ít drift, được trace từ source** | **0** | **3** | **6** |

**Kết luận một dòng:** Bộ tài liệu này được tạo bằng cách trace source (có cả `COMBO_BUGS.md` riêng),
nên **rất chính xác**. **Không có mâu thuẫn 🔴 nào giữa tài liệu và code.** Vấn đề thực sự là hai bug
**code** (đã ghi nhận, được xác nhận lại ở đây) cộng với drift nhỏ: số dòng route BE đã cũ và vài chỗ
lệch cosmetic trong wireframe.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG

**Không tìm thấy mâu thuẫn 🔴 nào giữa tài liệu và code** — bộ tài liệu khớp với code. Đó là headline
trung thực: đây là một bộ tài liệu sạch, được trace từ source.

**Tuy nhiên, hai bug CODE thật (đã ghi trong `COMBO_BUGS.md`) vẫn tồn tại trên nhánh này và được audit
này xác nhận lại.** Chúng là lỗi code, *không phải* drift tài liệu — tài liệu mô tả chúng đúng:

1. **Bug 1 — UI combo hết hàng là dead code.** Trang render badge "Hết hàng" (`page.tsx:122-126`) và
   CTA bị disable "Combo tạm hết" (`page.tsx:180-185`), nhưng `GET /combos` được phục vụ bởi
   `ListCombosAvailable` với SQL `WHERE is_available = 1 AND deleted_at IS NULL`
   (`be/internal/db/products.sql.go:387`). Vì vậy combo hết hàng không bao giờ ra tới wire → combo
   được render **luôn** có `is_available === true` → cả hai nhánh không bao giờ chạy. Một combo hết
   hàng sẽ hiện "Không tìm thấy combo." Mức 🟡 (dead code / not-found gây hiểu nhầm).

2. **Bug 2 — một sub-item của combo hiện UUID thô làm tên.** Tên/giá sub-item được resolve bằng cách
   join `combo_items` với `GET /products` (`page.tsx:33`), nhưng endpoint đó (`ListProductsAvailable`,
   `products.sql.go:469`) cũng loại bỏ sản phẩm không khả dụng. Khi một combo tham chiếu món đã bị tắt,
   map FE miss và fallback về `product_id` thô:
   `product_name: productMap.get(ci.product_id)?.name ?? ci.product_id` (`page.tsx:45`), với
   `unit_price` undefined. Người dùng thấy một dòng UUID trong "Gồm có". Mức 🟡 (người dùng thấy được
   nhưng có điều kiện).

> Cả hai được theo dõi trong [`COMBO_BUGS.md`](COMBO_BUGS.md) và ghi trong Decision Log của
> `07_business_logic`. Chúng **chưa** có trên `MASTER_TASK.md` — một fix phải được đăng ký + ALIGN
> trước (CLAUDE.md).

---

## Component dead / không thể chạm tới

Trang này là **một component inline duy nhất** với **zero component con** (không có
`ComboModal`/`ToppingModal` — chúng thuộc `customer_menu`). Dead code duy nhất nằm **bên trong**
`page.tsx`:

- **Badge "Hết hàng"** — `page.tsx:122-126` — không thể chạm tới (Bug 1; `is_available` luôn true khi
  render).
- **Nhánh CTA disable "Combo tạm hết"** — `page.tsx:180-185` (`disabled={!combo.is_available}` + chữ
  `: 'Combo tạm hết'`) — không thể chạm tới (cùng gốc).

Không có component zero-import và không có modal bị kẹt trên trang này.

---

## Khu vực ① — Hình ảnh component

**Kết luận:** bảng Zones và ánh xạ zone đều đúng; drift chỉ giới hạn ở layout ASCII của wireframe (giá
nằm dòng riêng), chữ trên nút, và hai nhánh dead.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Zone B layout — tên + giá | ASCII vẽ tên và giá trên **cùng dòng**: `Combo Đầy Đặn      42.000đ` (`customer_combo_detail.md:18`) | Tên (+ badge) ở một flex row (`page.tsx:118-127`); giá là `<p className="text-2xl …">` **riêng** **bên dưới** (`page.tsx:129`) | 🟡 | Vẽ lại Zone B ASCII với giá ở dòng riêng dưới tên |
| Zone E — chữ CTA | ASCII + Zones ghi "Thêm vào giỏ" / `[ Thêm vào giỏ · 42.000đ ]` (`customer_combo_detail.md:28,47`) | Chữ nút là `` `Thêm vào giỏ hàng · ${formatVND(total)}` `` (`page.tsx:184`) | 🟢 | Dùng "Thêm vào giỏ hàng" trong tài liệu |
| Zone C — sự hiện diện của "Gồm có" | ASCII luôn hiện khối "Gồm có" (`customer_combo_detail.md:21-24`) | Khối render **có điều kiện** chỉ khi `combo.items.length > 0` (`page.tsx:137`) | 🟢 | Ghi chú điều kiện trong tài liệu |
| Zone A — fallback hero | ASCII chỉ hiện `HERO IMAGE` (`customer_combo_detail.md:13-17`) | Khi `image_path` null, render placeholder emoji 🍱 + overlay `bg-gradient-to-t` (`page.tsx:108-113`) | 🟢 | Thêm fallback no-image vào tài liệu |
| Badge "Hết hàng" / CTA "Combo tạm hết" | Bảng Zones liệt kê "availability" ở Zone B (`customer_combo_detail.md:39`); tài liệu tự flag nó là unreachable (BE Flag 3 / Bug 1) | Badge `page.tsx:122-126`, CTA disable `page.tsx:180-185` — **dead code** (Bug 1) | 🟡 | Sửa code (xóa nhánh dead) — đăng ký MASTER trước |

**Đã xác minh khớp:** Zone A hero `next/image` với `aspect-[4/3]` (`page.tsx:98-114`); Zone C render
**chỉ badge số lượng + tên, không có giá từng món** (`page.tsx:141-148`) đúng như ghi chú inline của
tài liệu; Zone D `[−]/[+]` inline dùng lucide `Minus`/`Plus` với disable khi `qty<=1`
(`page.tsx:154-174`); Zone E footer sticky gọi `addItem` mang theo `combo_items[]` có `product_id` cho
từng sub-item (`page.tsx:60-69`); nút back render **ngoài** mọi nhánh (`page.tsx:76-82`).

---

## Khu vực ③ — Luồng dữ liệu cross-page

**Kết luận:** chính xác. Mọi claim về handoff, persistence và builder đều khớp source trên nhánh này.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Key `CART_CONFIG` vs persist version | Ghi chú drift: key là `'cart-config-v3'` trong khi persist `version` là `5` — lệch vô hại (`_crosspage_dataflow.md:107-109`) | `STORAGE_KEYS.CART_CONFIG = 'cart-config-v3'` (`storage-keys.ts:6`); `version: 5` (`cart.ts:129`) | 🟢 | Không cần — ghi chú của tài liệu đúng; chỉ đổi tên key nếu owner muốn |

**Đã xác minh khớp:** `handleAddToCart` ghi đúng một `CartItem` `type:'combo'` rồi `router.back()`
(`page.tsx:58-71`); dedup-by-id tăng `quantity` (`cart.ts:50-60`); `partialize` chỉ persist
`orderNote` + `activeOrderId` → `items[]` chỉ tồn tại trong session, mất khi F5 (`cart.ts:153`);
`combo_id` chảy tới order row và builder loại bỏ sub-item canh và map `item.toppings → topping_ids`
trên mỗi override (`order-payload.ts:34-36`, `:40`); shape của cart item (`product_id?`, `combo_id?`,
`combo_items?: ComboItemSummary[]`) khớp `types/cart.ts:11-21`.

---

## Khu vực ④ — Hành vi loading

**Kết luận:** hoàn toàn chính xác — không drift.

**Đã xác minh khớp (mọi claim đều đúng):**
- Hai query `['combos']` + `['products-all']`, cả hai `staleTime: 5 * 60 * 1000` (`page.tsx:18-28`).
- **Gate chỉ là `combos.isLoading`**; query `products` chỉ destructure **`data` (mặc định `[]`)** và
  không bao giờ chặn paint (`page.tsx:24-28`).
- Thứ tự nhánh: `isLoading` → `<ComboDetailSkeleton />` (`page.tsx:84`); `isError || (!isLoading &&
  !combo)` → khối "Không tìm thấy combo." dùng chung (`page.tsx:86-93`); còn lại là trang đầy đủ
  (`page.tsx:95-189`).
- Error và not-found **gộp vào một UI** (`page.tsx:86`) — đã xác nhận.
- Skeleton tại `page.tsx:194-217` (hero + title + giá + 2 dòng mô tả + 3 dòng item).
- Flash UUID-name: combo memo join qua `productMap`, fallback về `product_id` thô (`page.tsx:45`) — đã
  xác nhận; cũng là gốc bền vững của Bug 2.
- Không có `loading.tsx` trong segment; nút back ngoài mọi nhánh (`page.tsx:76-82`).

---

## Khu vực ⑤ — Mô hình dữ liệu FE⇄BE

**Kết luận:** logic BE, auth, caching và serializer đều **đúng**; drift duy nhất là **số dòng route đã
cũ** trong `_be.md` (route group đã dịch xuống ~13 dòng kể từ lúc trace).

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Dòng route `GET /products` | `main.go:168` (`_be.md:26,27`) | `prodR.GET("", productH.ListProducts)` tại `be/cmd/server/main.go:181` | 🟡 | Cập nhật `_be.md` thành `:181` |
| Dòng route `GET /combos` | `main.go:216` (`_be.md:26`) | `comboR.GET("", productH.ListCombos)` tại `be/cmd/server/main.go:229` | 🟡 | Cập nhật `_be.md` thành `:229` |
| Khoảng dòng combo writes | `main.go:215-227` (`_be.md:29,42`) | combo group writes tại `be/cmd/server/main.go:230-239` (manager `POST/PATCH`, admin `DELETE`) | 🟢 | Cập nhật `_be.md` thành `:230-239` |
| Dòng hằng cache key | "constants `product_service.go:25,27`" (`_be.md:79`) | `cacheKeyProductsList = "products:list"` `:25`; `cacheKeyCombos = "combos:list"` `:27` (`product_service.go`) | 🟢 | Dòng đúng; giá trị đã xác minh |

**Đã xác minh khớp:** cả hai GET đều **public hoàn toàn** — không có `authMW` trên route nào
(`main.go:181,229`); combo mutations là manager+ và delete là admin (`main.go:230-239`); **không có
`GET /combos/:id`** — combo group chỉ đăng ký `GET ""` + writes (`main.go:228-239`), xác nhận trang
over-fetch và resolve theo id phía client; SQL `ListCombosAvailable` `WHERE is_available = 1 AND
deleted_at IS NULL` (`products.sql.go:387`); `ListProductsAvailable` cùng filter
(`products.sql.go:469`); service `ListCombos` đi đường Redis-rồi-repo + `enrichCombo` mỗi combo
(`product_service.go:497-517`); serializer combo emit `combo_items` **chỉ id** `{id, product_id,
quantity}` (`product_handler.go:337-341`); `productCacheTTL = 5 * time.Minute`
(`product_service.go:21`).

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Bug code | Thay fallback UUID bằng placeholder trung tính (vd `'Món tạm hết'`) để sub-item không bao giờ hiện `product_id` (Bug 2) | `fe/src/app/(shop)/menu/combo/[id]/page.tsx:45` |
| 2 | 🔴 Bug code | Xóa nhánh dead badge "Hết hàng" + CTA disable "Combo tạm hết" (Bug 1) — hoặc, nếu muốn trang hết-hàng thật, thêm `GET /combos/:id` (feature, không phải bugfix) | `fe/src/app/(shop)/menu/combo/[id]/page.tsx:122-126,180-185` |
| 3 | 🟡 Sửa tài liệu | Cập nhật số dòng route trong `_be.md`: `GET /products` `:181`, `GET /combos` `:229`, combo writes `:230-239` | `customer_combo_detail_be.md` |
| 4 | 🟡 Sửa tài liệu | Vẽ lại Zone B ASCII với giá ở dòng riêng dưới tên | `customer_combo_detail.md:18` |
| 5 | 🟢 Sửa tài liệu | Sửa chữ CTA thành "Thêm vào giỏ hàng"; ghi chú Zone C render có điều kiện + fallback 🍱 no-image của Zone A | `customer_combo_detail.md` |
| 6 | 🟢 Sửa tài liệu | Làm mới header nhánh provenance (`experience_claude.md_system_1` → `…_test_iphon2_change_code`) trong cả bộ tài liệu | header bộ tài liệu |

> **Ghi chú CLAUDE.md:** các sửa tài liệu (dòng 3–6) là một task ALIGN; mỗi thay đổi **code** (dòng
> 1–2) phải được đăng ký trong `docs/tasks/MASTER_TASK.md` **trước khi chạm vào bất kỳ file nào**.
> Audit này không thay đổi cái nào — nó chỉ ghi lại drift.
