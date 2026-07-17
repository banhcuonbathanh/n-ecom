# Customer Favourites — So Sánh Chi Tiết Tài Liệu vs. Code (`/menu/favourites` · `/save` · `/sets`)

> **Phạm vi:** rà soát trung thực, có truy nguồn code của bộ tài liệu `customer_favourites` so với code
> FE thực tế, theo 5 trục: ① giao diện component · ② luồng dữ liệu cross-component · ③ luồng dữ liệu
> cross-page · ④ hành vi loading · ⑤ mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — KHÔNG sửa code hay tài liệu.** File này chỉ ghi nhận độ lệch; việc sửa là một task
> ALIGNed riêng (MASTER trước theo CLAUDE.md).
> Rà soát **trực tiếp bởi Opus orchestrator** (trang nhỏ — 9 file + 1 store, ~640 LOC tổng — nên không
> fan-out theo quy tắc "trang nhỏ có thể làm inline" của skill); mọi mục 🔴 đã được **tự tay kiểm
> chứng lại** bằng cách mở lại file được trích dẫn.
> **Code thắng.** Mọi ô "Code thực tế" đều kèm `file:line` trên nhánh
> `experience_claude.md_system_1_test_iphon2_change_code`. Điều nào không ghim được vào dòng cụ thể → `❓ CHƯA XÁC MINH`.
> **Ngày:** 2026-06-21.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component | **Lệch** — bản vẽ vẽ một CTA per-card không tồn tại + ghi sai nhãn nhiều control | 2 | 6 | 1 |
| 2 — Luồng cross-component | **Chính xác** — mọi `file:line` trong `_crosscomponent_dataflow.md` khớp code | 0 | 0 | 1 |
| 3 — Luồng cross-page | **Chính xác** — mọi call site consumer/producer đều đúng | 0 | 0 | 2 |
| 4 — Hành vi loading | **Chính xác** — sự nhập nhằng empty/loading/error được ghi tài liệu đúng | 0 | 0 | 1 |
| 5 — Mô hình dữ liệu FE⇄BE | **Phần lớn chính xác** — cite service/handler đúng; chỉ số dòng `main.go` bị cũ | 0 | 1 | 1 |
| **Tổng** | — | **2** | **7** | **6** |

Các tài liệu hành vi sâu (`_crosscomponent_dataflow.md`, `_crosspage_dataflow.md`, `_loading.md`,
`_be.md`, `SCENARIO_FAVOURITES.md`) là **gương phản chiếu trung thực, có truy nguồn** — rõ ràng được
viết từ code thực, và các cite dòng hầu như chính xác hoàn toàn. **Toàn bộ sự lệch tập trung ở một
file vẽ tay duy nhất, `customer_favourites.md`** (ASCII wireframe + bảng Zones + Key Interactions),
cộng thêm các số dòng `main.go` đã cũ thường gặp trong `_be.md`.

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

### 🔴 1 — Nút `[+ Giỏ]` per-card "thêm từng món vào giỏ" trong wireframe không tồn tại

`customer_favourites.md:20-21` vẽ một nút **`[+ Giỏ]`** trên mỗi `FavouriteItemCard`, và dòng Key
Interactions nêu thẳng:

> `customer_favourites.md:53` — "**[+ Giỏ]** per card → add that item to cart"

**Code thực tế:** `FavouriteItemCard` **không có control thêm vào giỏ** nào. Props của nó là
`{ item, onRemove, onQtyChange }` mà thôi (`FavouriteItemCard.tsx:8-12`); nó render một nút bỏ-yêu-thích
(`FavouriteItemCard.tsx:46-52`) và một `QuantityStepper` (`FavouriteItemCard.tsx:82-88`) — không có gì
khác. Trang list chỉ nối hai callback đó (`page.tsx:134-141`: `onRemove={removeItem}`,
`onQtyChange={updateQty}`). **Đường duy nhất** vào giỏ trên trang này là nút footer tổng hợp
`handleAddAllToCart` (`page.tsx:97-122`, `FavouritesFooter.tsx:25-30`). Không có thêm-từng-món ở bất
kỳ đâu trong toàn suite. **Một tương tác người dùng được tài liệu hóa hoàn toàn không có code.**

### 🔴 2 — Hai footer `fixed bottom-0` xung đột với `ClientBottomNav` của shell (lỗi chồng lấp)

Wireframe vẽ `FavouritesFooter` là thanh dưới cùng gọn gàng và ẩn nav toàn cục đi: *"Omitted from the
wireframe above to keep the 3-panel view compact"* (`customer_favourites.md:32-34`).

**Code thực tế:** các trang favourites nằm dưới `app/(shop)/menu/favourites/`, nên
`(shop)/layout.tsx` bọc chúng và render `ClientBottomNav` — **`fixed bottom-0 left-0 right-0 z-20`**
(`ClientBottomNav.tsx:48`) — *sau* `{children}` trong thứ tự DOM (`(shop)/layout.tsx:10-13`). Cả hai
footer trang cũng là **`fixed bottom-0 left-0 right-0 z-20`**:
- list: `FavouritesFooter.tsx:12`
- save: `save/page.tsx:103`

Với **`z-20` bằng nhau**, phần tử được vẽ sau thắng — và nav là sibling sau — nên
`ClientBottomNav` (~56-72px cao) vẽ **đè lên** phần dưới của mỗi footer:
- **Trang list:** footer ~172px (3 nút xếp chồng); nav che ~72px dưới cùng — đúng chỗ CTA chính
  **"🛒 Thêm tất cả vào giỏ hàng"** (`FavouritesFooter.tsx:25-30`).
- **Trang save:** footer là một hàng nút ~68px (`save/page.tsx:103-119`); nav ~56-72px che gần hết —
  **"Huỷ" / "💾 Lưu set này" phần lớn bị ẩn sau nav.**

Không footer nào tự đẩy lên trên nav (không có `bottom-[72px]`; padding trang `pb-[156px]`
`page.tsx:125` chỉ giải phóng *scroll content*, không phải nav cố định). Đây là **cùng một invariant
shared-layout** đã được đánh dấu 🔴 trên `customer_product_detail` (CTAFooter vs ClientBottomNav) và
được nêu trong tracker's cross-page concerns. **Lỗi code — va chạm visual thực sự mà wireframe che khuất.**
*(Suy luận CSS-stacking có truy code; screenshot ⏳ chưa có — stack đang tắt.)*

---

## Các Component Chết / Không Thể Chạm Tới

- **`useFavouritesStore.addItem`** (`favourites.ts:49-52`) — **không có caller nào.** Đường add công
  khai là `toggleFav` (được dùng bởi `ProductCard.tsx:70`, `ComboCard.tsx:95`, `FavouritesRail.tsx:36,47`).
  Mọi `addItem(` khác trong repo đều là `useCartStore.addItem` (các trang chi tiết product/combo, grid
  cards). `addItem` của favourites được khai báo trong interface (`favourites.ts:33`) và được implement
  nhưng không bao giờ được gọi. `_crosscomponent_dataflow.md §6` thừa nhận nửa vời điều này ("`toggleFav`
  is the public API") nhưng vẫn tài liệu hóa `addItem` như là bề mặt store còn sống (`:114`). **Code chết.**

---

## Mảng 1 — Giao Diện Component

**Kết luận: Lệch.** Wireframe vẽ tay + bảng Zones + Key Interactions trong
`customer_favourites.md` mang theo hai mục 🔴 ở trên cộng thêm một cụm nhãn copy/control bị ghi sai. Mọi
render thực của component đều đã được truy nguồn.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `FavouriteItemCard` CTA | `[+ Giỏ]` per card thêm món đó vào giỏ (`customer_favourites.md:20-21,53`) | Không có nút thêm; props chỉ có `onRemove`+`onQtyChange` (`FavouriteItemCard.tsx:8-12`); thêm giỏ chỉ có dạng tổng hợp (`page.tsx:97-122`) | 🔴 | Xóa `[+ Giỏ]` khỏi ASCII + Key Interactions, HOẶC build tính năng thêm per-card (quyết định sản phẩm) |
| Footer list + save vs nav shell | Footer là thanh dưới cùng gọn gàng; nav "omitted… to keep compact" (`customer_favourites.md:32-34`) | Cả hai footer `fixed bottom-0 z-20` (`FavouritesFooter.tsx:12`, `save/page.tsx:103`) xung đột với `ClientBottomNav` `fixed bottom-0 z-20` (`ClientBottomNav.tsx:48`) | 🔴 | Đẩy footer lên trên nav 72px (`bottom-[72px]`) hoặc tăng z-index; sau đó vẽ lại có nav |
| List TopNav slot phải | Nút `[Lưu bộ]` ở trên cùng bên phải (`customer_favourites.md:15`) | Icon giỏ hàng (`showCart`), không phải nút lưu (`FavouritesTopNav.tsx:26-37`); "Lưu bộ" nằm ở **footer** (`FavouritesFooter.tsx:19-24`) | 🟡 | Vẽ lại slot phải là badge 🛒; chuyển "Lưu bộ" xuống footer trong ASCII |
| Footer list | Một nút `[Thêm tất cả vào giỏ]` (`customer_favourites.md:27-28`) | Ba nút: "📋 Xem các set đã lưu (N)", "💾 Lưu thành set mới…", "🛒 Thêm tất cả vào giỏ hàng" (`FavouritesFooter.tsx:13-30`) | 🟡 | Vẽ đủ cả ba nút footer |
| Tiêu đề TopNav list | "Yêu Thích" (`customer_favourites.md:15`) | `"❤ Yêu thích"` (`page.tsx:126`) | 🟡 | Khớp copy |
| Tiêu đề TopNav save | "Lưu bộ yêu thích" (`customer_favourites.md:15`) | `"💾 Lưu thành set mới"` (`save/page.tsx:80`) | 🟡 | Khớp copy |
| Tiêu đề TopNav sets | "Bộ đã lưu" (`customer_favourites.md:15`) | `"📋 Các set của tôi"` (`sets/page.tsx:102`) | 🟡 | Khớp copy |
| Nhãn tab filter | `[Món]`, không có số đếm (`customer_favourites.md:17`) | `Món lẻ` + số đếm per-tab `(N)` (`FavouriteFilterTabs.tsx:18,37`) | 🟡 | "Món" → "Món lẻ"; thêm số đếm `(N)` |
| Các action của `SetCard` | `[Thêm vào giỏ] [Xoá]` (`customer_favourites.md:23,55-56`) | "Áp dụng" (icon giỏ) + **đổi tên** inline (bút chì) + xóa (thùng rác) (`SetCard.tsx:81-101`) | 🟡 | "Thêm vào giỏ"→"Áp dụng"; thêm action đổi tên; tài liệu bỏ sót hoàn toàn |
| Các nút save ZD | `[Lưu bộ] [Huỷ]` (`customer_favourites.md:23`) | "Huỷ" (trái) + "💾 Lưu set này" (phải) (`save/page.tsx:104-118`) | 🟢 | Sửa thứ tự + copy |

**Khớp đúng (không cần sửa):** nút back TopNav + sticky header (`FavouritesTopNav.tsx:11-24`); item-card
image / type-badge / price-`/phần` / topping & combo-item detail / qty stepper
(`FavouriteItemCard.tsx:18-89`); `FavouritesSummaryList` "Tóm tắt:" + các hàng per-item + tổng
(`FavouritesSummaryList.tsx:9-45`); panel empty-state sets + nút back (`sets/page.tsx:104-116`);
cấu trúc layout 3-panel tổng thể.

---

## Mảng 2 — Luồng Cross-Component

**Kết luận: Chính xác.** `_crosscomponent_dataflow.md` về cơ bản là trace 1:1 của code. Mọi cite
được kiểm tra đều chính xác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Bảng store mutations | addItem 49-51 · removeItem 54-55 · updateQty 57-60 · addSet 62-69 · renameSet 72-75 · deleteSet 77-79 · isFavourite 80-81 · toggleFav 83-90 (`_crosscomponent_dataflow.md:114-121`) | **Tất cả chính xác** (`favourites.ts:49,54,57,62,72,77,80,83`) | 🟢 | — (không cần) |
| Resolve / filter / counts | `page.tsx:52-85 / 87-89 / 91-95` (`_crosscomponent_dataflow.md:152-165`) | Chính xác (`page.tsx:52-85,87-89,91-95`) | 🟢 | — |
| `handleAddAllToCart` | `page.tsx:97-122` build `product_<id>_<sortedToppingIds>` / `combo_<id>` (`_crosscomponent_dataflow.md:287-306`) | Chính xác (`page.tsx:99-119`) | 🟢 | — |
| TopNav chỉ đọc giỏ | `useCartStore.itemCount()` `cart.ts:125` (`_crosscomponent_dataflow.md:80`) | Chính xác (`FavouritesTopNav.tsx:12`, `cart.ts:125`) | 🟢 | — |
| `addSet` snapshot `[...s.items]` | `favourites.ts:67` snapshot bất biến (`_crosscomponent_dataflow.md:362,418`) | Chính xác (`favourites.ts:68`) | 🟢 | — |

**Khớp đúng:** toàn bộ mô hình "hai store làm hub, không widget-to-widget"; lưu ý `useEffect`
dependency-array stale-removal (`page.tsx:49-50` `eslint-disable`); hardcode combo `toppings: []`
(`page.tsx:118`, `sets/page.tsx:94`).

---

## Mảng 3 — Luồng Cross-Page

**Kết luận: Chính xác.** Các call site consumer (toggle tim trên `/menu`) và producer (cart hand-off)
đều chính xác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Các site toggle consumer | `ProductCard.tsx:70`, `ComboCard.tsx:95`, `FavouritesRail.tsx:36,47` (`_crosspage_dataflow.md:42-44`) | **Tất cả chính xác** (xác minh bằng grep) | 🟢 | — |
| `toggleFav` bỏ qty/toppings | insert `{id,type,qty:1,toppingIds:[]}` `favourites.ts:88` (`_crosspage_dataflow.md:46-51`) | Chính xác (`favourites.ts:88`) | 🟢 | — |
| Cart `items[]` chỉ trong phiên | `store/cart.ts:151` (`_crosspage_dataflow.md:28`) | Lệch 2 dòng: partialize tại `cart.ts:153` (`items[]` không trong whitelist) | 🟢 | Cập nhật `:151`→`:153` |
| Khóa persist của Favourites | `STORAGE_KEYS.FAVOURITES='favourites'` `favourites.ts:92`, `storage-keys.ts:4` (`_crosspage_dataflow.md:27`) | Chính xác (`favourites.ts:92`, `storage-keys.ts:4`) | 🟢 | — |

**Khớp đúng:** bất cân xứng favourites-persist / session-cart; ngữ nghĩa "apply set" / "add all" theo
kiểu cộng thêm (`cart.ts:50` dedup); các cite điều hướng `router.push` trong suite
(`page.tsx:148-149`, `save/page.tsx:75`).

---

## Mảng 4 — Hành Vi Loading

**Kết luận: Chính xác.** `_loading.md` ghi tài liệu đúng đặc điểm nổi bật của suite — rằng
empty / cold-load / fetch-error trông giống nhau hoàn toàn — và mọi cite đều chính xác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Spinner route shop | `(shop)/loading.tsx:1-7` spinner cam ở giữa (`_loading.md:35-42`) | Chính xác (`(shop)/loading.tsx`, `border-t-orange-500`) | 🟢 | — |
| Nhập nhằng empty/loading/error | `resolvedItems.length===0` trong cả 3 trường hợp; không có spinner/error (`_loading.md:90-104,207`) | Chính xác (`page.tsx:128-129`, `flatMap` bỏ unresolved `page.tsx:52-85`) | 🟢 | — (tài liệu ghi đúng đây là điểm yếu code) |
| Guard stale-removal | `page.tsx:38-50`, deps `[productsLoaded,combosLoaded]` (`_loading.md:108-132`) | Chính xác (`page.tsx:38-50`) | 🟢 | — |
| Footer `SetCard` count từ snapshot | `{set.items.length} món` chưa resolve (`_loading.md:170-172,211`) | Chính xác (`SetCard.tsx:79`) | 🟢 | — |

**Khớp đúng:** `isSuccess` (`productsLoaded`/`combosLoaded`) là cổng thành công duy nhất trong suite;
các trang save/sets không destructure `isLoading`/`isError`; stub tổng bằng 0 của `FavouritesSummaryList`
(`FavouritesSummaryList.tsx:10`).

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận: Phần lớn chính xác.** `_be.md` xác định đúng suite là consumer chỉ-đọc của hai
GETs công khai, và các cite handler/service/serializer đều chính xác. **Sai lệch duy nhất** là các số
dòng `main.go` lặp lại vị trí cũ.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Số dòng route `main.go` | `GET /products` `:167-168`, `GET /combos` `:215-216`; auth `:168`/`:216`; mutations `:174-181`/`:220-226` (`_be.md:23-28,38-45`) | Cũ ~+13: products group `:180`, GET `:181`; combos group `:228`, GET `:229`; mutations `:184-`/`:231-239` (`main.go`) | 🟡 | Cập nhật cite sang dòng hiện tại, hoặc cite *tên group + handler* thay vì dòng tuyệt đối trong `main.go` |
| Cite handler / service / serializer | `ListProducts product_handler.go:42` / `product_service.go:164`; `ListCombos :327`/`:497`; `productJSON :443`; `ListProductsAvailable :173`; `ListCombosAvailable :505` (`_be.md:23-24,53-71`) | **Tất cả chính xác** (`product_handler.go:42,327,443`; `product_service.go:164,173,497,505`) | 🟢 | — |

**Khớp đúng:** cả hai GETs đều public (không có `authMW` trên `.GET("")` thuần); `productCacheTTL` 5 phút
(`product_service.go:21`) = FE `staleTime`; FE soft-fail cả hai query về `[]` nên fetch error render
EmptyState (Flag trong `_be.md:96-104`); `product_id`s của combo resolve từ danh sách products với
fallback `'Món không rõ tên'` (list, `page.tsx:73`) — **lưu ý** trang sets dùng raw id làm fallback
(`sets/page.tsx:40`), đúng như Flag 4 trong `_be.md` ghi.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Sửa tài liệu | Xóa nút `[+ Giỏ]` per-card khỏi ASCII + Key Interactions (không có code đằng sau) | `customer_favourites.md:20-21,53` |
| 2 | 🔴 Lỗi code | Sửa lỗi chồng lấp footer↔`ClientBottomNav` trên trang list + save (đẩy lên trên nav 72px hoặc tăng z-index) | `FavouritesFooter.tsx:12`, `save/page.tsx:103` |
| 3 | 🟡 Sửa tài liệu | Vẽ lại TopNav list (badge giỏ, không phải `[Lưu bộ]`) + vẽ đủ 3 nút footer + hiện nav toàn cục | `customer_favourites.md:13-34` |
| 4 | 🟡 Sửa tài liệu | Khớp cả ba tiêu đề TopNav + nhãn filter ("Món"→"Món lẻ" + số đếm) | `customer_favourites.md:15,17` |
| 5 | 🟡 Sửa tài liệu | Các action `SetCard`: "Thêm vào giỏ"→"Áp dụng"; thêm action đổi tên | `customer_favourites.md:23,55-56` |
| 6 | 🟡 Sửa tài liệu | Cập nhật số dòng route `_be.md` `main.go` (`:167-168`→`:180-181`, `:215-216`→`:228-229`, v.v.) | `customer_favourites_be.md:23-45` |
| 7 | 🟢 Sửa tài liệu | Tên method trong bảng Zones `saveSet`→`addSet`; `cart.ts:151`→`:153` | `customer_favourites.md:46`, `_crosspage_dataflow.md:28` |
| 8 | 🟢 Dọn code | Xóa `useFavouritesStore.addItem` chết (không có caller) hoặc ghi rõ lý do giữ | `favourites.ts:33,49-52` |
| 9 | 🟢 Sửa tài liệu | Cập nhật nhánh provenance trong tất cả file tài liệu sang `…_test_iphon2_change_code` | tất cả `customer_favourites/*.md` |

> Theo `CLAUDE.md`: các sửa tài liệu (#1, #3-7, #9) là **một** task ALIGNed. Mỗi thay đổi code (#2, #8)
> phải được đăng ký thành hàng riêng trong `docs/tasks/MASTER_TASK.md` **trước khi chạm vào bất kỳ file nào**.
