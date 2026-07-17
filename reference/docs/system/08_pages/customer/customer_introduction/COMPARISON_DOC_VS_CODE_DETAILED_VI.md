# So Sánh Chi Tiết — Tài Liệu vs. Code · `/introduction` (customer_introduction)

> **Phạm vi:** rà soát bộ tài liệu `customer_introduction` (`customer_introduction.md` — file duy nhất
> trong thư mục) so với code FE thật trên nhánh `experience_claude.md_system_1_test_iphon2_change_code`.
> Trục kiểm tra: ① giao diện component · ② luồng dữ liệu cross-component · ③ luồng dữ liệu cross-page · ④ loading · ⑤ FE⇄BE.
> **Mảng 2, 4, 5 là N/A** — trang này là Server Component tĩnh hoàn toàn: không có store, không có query, không có BE
> (xác nhận tại `app/introduction/page.tsx:12`, "no auth, no BE"). · **Chỉ đọc — KHÔNG sửa code hay tài liệu.**
> Thực hiện inline (không dùng sub-agent — trang tĩnh nhỏ); mọi mục 🔴 đã được tự tay kiểm chứng bằng grep/Read với `file:line`.
> Ngày: 2026-06-23.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component | Lệch thật sự — tài liệu là bản vẽ *đề xuất*, code đã ship layout phong phú hơn | 0 | 3 | 4 |
| 2 — Luồng cross-component | **N/A** — không có Zustand store, không có shared selector (trang tĩnh) | — | — | — |
| 3 — Luồng cross-page | Trang đã build nhưng **mồ côi** (không có link trỏ vào); vị trí shell là cố ý & đúng | 1 | 0 | 1 |
| 4 — Hành vi loading | **N/A** — Server Component tĩnh, không có query, không có skeleton | — | — | — |
| 5 — Mô hình dữ liệu FE⇄BE | **N/A** — không có lời gọi BE nào (toàn bộ nội dung là hằng số tĩnh trong component) | — | — | — |
| **Trạng thái trang** | **Tài liệu ghi 🔮 PLANNED / "đề xuất"; code đã build & ship hoàn chỉnh** | 1 | 0 | 0 |
| **Tổng cộng** | | **2** | **3** | **5** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **Tài liệu đánh dấu trang này là 🔮 PLANNED / "đề xuất — chờ owner xác nhận", nhưng trang đã được build và ship hoàn chỉnh.**
   `customer_introduction.md:3` ghi *"🔮 PLANNED (owner decision 2026-06-12)"*, `:6` ghi
   *"Wireframe below is **proposed — owner to confirm**"*, và các tiêu đề Zones / Interactions / Business-Logic
   đều được gắn nhãn *"(proposed)"* (`:43`, `:53`). `PAGES_INDEX.md:31` cũng liệt kê là `🔮 PLANNED`.
   **Thực tế code:** route đã tồn tại và render — `fe/src/app/introduction/page.tsx:16-63` cùng với năm
   component thật `fe/src/features/introduction/IntroHero.tsx`, `IntroStory.tsx`, `IntroGallery.tsx`,
   `IntroMap.tsx`, `IntroContact.tsx`. **Tại sao quan trọng:** nguồn sự thật duy nhất cho câu hỏi "trang này có thật không"
   đang sai ở hai nơi — bất kỳ ai đọc tài liệu cũng sẽ cho rằng trang chưa tồn tại. Sửa tài liệu:
   đổi trạng thái thành ✅ trong `customer_introduction.md` + `PAGES_INDEX.md` và bỏ các nhãn "(proposed)".

2. **Trang đã build nhưng MỒ CÔI — không có gì trong app link tới `/introduction`.**
   `grep -rn "introduction" fe/src` (loại trừ `app/introduction` + `features/introduction` tự tham chiếu)
   trả về **zero** kết quả — không có `href="/introduction"`, không có `router.push("/introduction")` ở đâu cả. Mũi tên quay lại
   của chính trang trỏ *tới* `/welcome` (`page.tsx:22-28`), ngụ ý một vòng khứ hồi, nhưng `/welcome`
   lại **không** link *tới* `/introduction` (đã kiểm chứng lại với lần chạy `customer_welcome`, vốn ghi chú
   "/introduction correctly absent" từ footer welcome). **Tại sao quan trọng:** trang chỉ vào được bằng cách gõ URL thủ công —
   đây là khoảng trống sản phẩm thật (tính năng đã build nhưng không có điểm vào), không phải lỗi tài liệu. Cần quyết định sản phẩm:
   thêm link từ `/welcome` (và cập nhật trạng thái), hoặc để trang tối có chủ đích.
   *(Đây là khoảng trống code/sản phẩm, không phải bug code — cần đăng ký trước khi thêm bất kỳ link nào.)*

---

## Component chết / không thể chạm tới

- **Toàn bộ route `/introduction` không thể vào qua UI** — xem headline #2. Năm component `features/introduction/*`
  chỉ render dưới một route mồ côi duy nhất này, nên toàn bộ tính năng đang tối cho đến khi có link được thêm vào. Không có *dead code nội bộ* (mọi component đều được import bởi `page.tsx:4-8` và render tại `:38-42`).
- **Gallery lightbox** trong tài liệu (`customer_introduction.md:57`, "phase 2, optional") đúng là **chưa
  được build** — comment trong `IntroGallery.tsx:7` ghi "Lightbox is phase-2 … not built here". Nhất quán, không phải dead code.

---

## Mảng 1 — Giao Diện Component

**Kết luận:** ASCII trong tài liệu là một *đề xuất* trung thực và trang đã ship theo đúng thứ tự zone,
nhưng mỗi zone phong phú hơn bản vẽ (thêm Badge, tiêu đề h2, phụ đề) và ảnh hero + gallery + ảnh founder
là **placeholder** có chủ đích, không phải ảnh thật như ASCII ngụ ý.

| Khu vực | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Top nav | Bảng Zones đề xuất **`CustomerTopNav` (dùng chung, tái sử dụng)** (`customer_introduction.md:47`) | `<nav>` inline trong chính trang (`page.tsx:20-36`): link quay lại → `/welcome` ("Giới Thiệu" + `ArrowLeft`) + một `Button` → `/menu` ("Xem Thực Đơn" + `QrCode`). **Không** dùng `CustomerTopNav`. Tái sử dụng không khả thi: `CustomerTopNav` là `'use client'`, nhận callback `onBack: () => void` + render icon **giỏ hàng** (`CustomerTopNav.tsx:1,7,29`) — không phù hợp với trang Server tĩnh có slot phải là CTA "Xem Thực Đơn" | 🟡 | Sửa tài liệu: bỏ "CustomerTopNav (shared, reuse)" khỏi bảng Zones — code dùng đúng nav server riêng biệt |
| Hero | "HERO PHOTO (full-width restaurant photo)" + "Bánh Cuốn Bà Hoa — Từ 1995" (`:16-17`) | Khối **placeholder**, không phải ảnh — `IntroHero.tsx:11-17` (icon Star + "Ảnh quán toàn cảnh sẽ được thêm vào đây"). Tiêu đề `Bánh Cuốn Bà Hoa / Từ 1995` ✅ (`:24-28`). Code **thêm** một `Badge` "Quán Bánh Cuốn Truyền Thống" (`:20-23`) + phụ đề "Gần 30 năm…" (`:29-31`) không có trong ASCII. Placeholder được đánh dấu (`:5-6`) | 🟡 | Sửa tài liệu: vẽ lại hero là khối placeholder + thêm Badge/phụ đề; ghi chú "ảnh thật chờ assets" |
| Câu Chuyện | "long-form story text (multiple paragraphs, founder photo inline)" (`:19-21`) | `IntroStory.tsx`: lưới 2 cột, Badge "Câu Chuyện" (`:12-14`), **h2** "Gần 30 Năm / Trao Truyền Hương Vị" (`:15-19`, không có trong ASCII), 3 đoạn văn (`:20-33`), ảnh founder là **placeholder** (icon ChefHat, `:36-42`), không phải ảnh thật inline | 🟢 | Sửa tài liệu: thêm h2; đánh dấu ảnh founder là placeholder |
| Hình Ảnh | Gallery **3** ảnh, "(swipeable on mobile)" (`:23-26`) | `IntroGallery.tsx`: **6** ô placeholder (`PLACEHOLDER_COUNT = 6`, `:9`), **grid tĩnh** `grid-cols-2 sm:grid-cols-3` (`:25`) — **không swipeable**. Tiêu đề "Không Gian Quán" (`:19`) | 🟡 | Sửa tài liệu: vẽ lại thành grid 6 ô, bỏ "swipeable" (không có carousel trong code) |
| Vị Trí | Google Map nhúng + "123 Đường Ẩm Thực, Hoàn Kiếm, Hà Nội" + "[ Chỉ đường ]" (`:28-33`) | `IntroMap.tsx`: Google Maps `iframe ?output=embed` (`:23-29`), địa chỉ đầy đủ hơn — "123 Đường Ẩm Thực, **Phường Hàng Bông**, Quận Hoàn Kiếm, Hà Nội" (`:9`); "Chỉ đường" mở maps trong tab mới (`:34-42`). Bảng Zones ghi "static coordinates" nhưng code dùng **text address query** cho cả hai (`:10`) | 🟢 | Sửa tài liệu: cập nhật chuỗi địa chỉ; làm rõ đây là address query, không phải tọa độ |
| Giờ Mở Cửa / Liên Hệ | T2–T6 06:30–21:00 · T7–CN 06:00–21:30 · 0901 234 567 · (Zalo / Facebook) (`:35-37`) | `IntroContact.tsx`: giờ mở cửa **khớp chính xác** (`:8-11`), số điện thoại **khớp** "0901 234 567" (`:14`); code thêm URL fb thật "fb.com/banhcuonbahoa" (`:15`). Render thành hai atom `Card` (`:24,45`) — khớp bảng Zones "Card atoms (reuse)" | 🟢 | Không cần làm (hoặc ghi chú URL fb) |
| CTA | "[ Xem Thực Đơn & Đặt Món ]" (`:39`) | `page.tsx:44-60`: section với h2 "Sẵn Sàng Thưởng Thức?" (`:47-49`) + phụ đề (`:50-52`, không có trong ASCII) + `Button` "Xem Thực Đơn & Đặt Món" → `/menu` (`:53-58`) | 🟢 | Sửa tài liệu: thêm tiêu đề + phụ đề vào ASCII |

**Khớp đúng:** **thứ tự** zone (nav → hero → story → gallery → map → hours/contact → CTA) giống hệt ASCII;
bảng giờ mở cửa và số điện thoại chính xác; map iframe, "Chỉ đường", và cả hai CTA `/menu` đều hoạt động
đúng như danh sách Key-Interactions mô tả (`:55-58`); tái sử dụng atom `Card` + `Button` khớp bảng Zones.

---

## Mảng 3 — Luồng Cross-Page

**Kết luận:** mối lo ngại thật sự duy nhất là khả năng vào trang (headline #2). Vị trí shell cố ý là một
điểm *cộng* — trang tránh được va chạm fixed-footer thấy ở các trang customer khác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Khả năng vào trang / entry point | mũi tên quay lại → `/welcome` (`:58`), ngụ ý vòng khứ hồi `/welcome` ↔ `/introduction` | Không có gì link **tới** `/introduction` — grep trên `fe/src` = 0 kết quả inbound; `/welcome` không có link tới nó. Trang chỉ vào được qua URL | 🔴 | Quyết định sản phẩm: thêm link từ `/welcome` (+ đổi trạng thái), hoặc ghi tài liệu là cố ý tối |
| Vị trí shell | ASCII không vẽ bottom nav (`:12-41`) | Route là **top-level**, KHÔNG nằm dưới `(shop)` (`page.tsx:13` comment) → `ClientBottomNav` dùng chung **không** render → **không** có va chạm fixed-footer (tương phản với các 🔴 của `customer_product_detail` / `customer_favourites` / `customer_checkout`). Cố ý & đúng | 🟢 | Không cần làm — thiết kế tốt; nên ghi chú trong tài liệu |

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | Mục tiêu |
|---|---|---|---|
| 1 | 🔴 Sửa tài liệu | Đổi trạng thái 🔮 PLANNED → ✅ và bỏ tất cả nhãn "(proposed)" — trang đã build & ship | `customer_introduction.md:3,6,43,53` + `PAGES_INDEX.md:31` |
| 2 | 🔴 Khoảng trống code/sản phẩm | Thêm entry point tới `/introduction` (link từ `/welcome`) **hoặc** ghi tài liệu là cố ý tối — đăng ký vào `MASTER_TASK.md` trước | `fe/src/app/welcome/page.tsx` (+ quyết định sản phẩm) |
| 3 | 🟡 Sửa tài liệu | Vẽ lại hero + gallery là khối **placeholder**; gallery là **6 ô tĩnh**, không phải 3 ô swipeable; thêm Badge/h2/phụ đề mà mỗi zone thực sự render | `customer_introduction.md:12-41` |
| 4 | 🟡 Sửa tài liệu | Bỏ "CustomerTopNav (shared, reuse)" khỏi bảng Zones — code dùng đúng nav server tĩnh riêng biệt | `customer_introduction.md:47` |
| 5 | 🟢 Sửa tài liệu | Cập nhật địa chỉ Vị Trí theo chuỗi đầy đủ trong code; đánh dấu map là address-query (không phải tọa độ); thêm URL fb + tiêu đề CTA | `customer_introduction.md:32,39,49` |
| 6 | 🟢 Sửa tài liệu | Ghi chú việc đặt top-level (không phải `(shop)`) có chủ đích để tránh va chạm `ClientBottomNav` | `customer_introduction.md:60-64` |

> Theo `CLAUDE.md` (MASTER trước + scope contract): các bản sửa tài liệu (#1, #3–#6) là **một** task ALIGN;
> khoảng trống code/sản phẩm (#2) phải được đăng ký vào `MASTER_TASK.md` **trước** khi chạm vào bất kỳ file nào. Audit này không thay đổi bất cứ điều gì.
