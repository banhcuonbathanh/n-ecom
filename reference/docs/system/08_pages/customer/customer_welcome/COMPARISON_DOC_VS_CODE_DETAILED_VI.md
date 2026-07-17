# So Sánh — Tài Liệu vs. Code: `customer_welcome` (`/welcome`)

> **Phạm vi:** đối chiếu bộ tài liệu của trang này (`customer_welcome.md` wireframe +
> `SCENARIO_WELCOME.md`) với code FE đang chạy. Trang là một **Server Component hoàn toàn tĩnh** — nên
> chỉ **Vùng 1 (Hình ảnh component)** thực sự áp dụng; Vùng 2–5 (store cross-component, persist
> cross-page, loading, mô hình dữ liệu FE⇄BE) là **N/A thật sự** (không store, không persist, không
> async, không backend) và chính bộ tài liệu cũng nói vậy.
> **Chỉ đọc — không sửa code hay tài liệu.** Làm trực tiếp (một trang tĩnh nhỏ, không cần tách agent);
> mọi ô "Code thực tế" đều trace từ source; các mục `🔴` (ở đây không có) sẽ được kiểm lại thủ công.
> Nguồn: `fe/src/app/welcome/page.tsx` (toàn bộ trang, 256 dòng, khép kín).
> Nhánh: `experience_claude.md_system_1_test_iphon2_change_code` · Ngày: 2026-06-22.

---

## Tóm Tắt Điều Hành

| Vùng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Hình ảnh component | **Độ trung thực cao.** ASCII wireframe + bảng Zones + Key Interactions đều khớp với render; chỉ có rút gọn kiểu wireframe + một chỗ làm tròn nhãn giờ. | 0 | 1 | 8 |
| 2 — Dataflow cross-component | **N/A** — không store chung, không luồng dữ liệu giữa widget (tài liệu xác nhận). | — | — | — |
| 3 — Dataflow cross-page | **N/A** — trang không ghi gì (không Zustand / localStorage / URL state); chỉ có ý định điều hướng. | — | — | — |
| 4 — Hành vi loading | **N/A** — không `loading.tsx`, không Suspense, không `useQuery`, không fetch. First paint = final paint. | — | — | — |
| 5 — Mô hình dữ liệu FE⇄BE | **N/A** — không request nào rời trang; "món đặc trưng" là hằng `dishes` trong file, **không phải** `GET /products` (đã xác nhận). | — | — | — |
| **Provenance (SCENARIO)** | Mọi `file:line` trong `SCENARIO_WELCOME.md` đều **chính xác**; chỉ tag nhánh ở header bị cũ. | 0 | 0 | 1 |

**Kết luận:** `customer_welcome` là một trong những bộ tài liệu chính xác nhất repo — ngang hàng
`customer_table_qr` / `customer_profile`. **Không có mâu thuẫn 🔴 doc-vs-code và không có bug code.**
Câu hỏi tồn đọng của SCENARIO ("món đặc trưng có thể là `GET /products` — xác nhận khi chạy") đã
**được giải quyết: chúng là tĩnh**, không bao giờ fetch.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG 🔴

**Không có.** Không có mâu thuẫn cứng nào giữa tài liệu và code, và không có bug sản phẩm trên trang
này. 🟡 duy nhất là một chỗ làm tròn câu chữ trong wireframe (giờ đóng cửa cuối tuần), không phải
drift hành vi.

---

## Component chết / không thể tới được

**Không có.** Trang là một `WelcomePage` khép kín (`page.tsx:32`), không có sub-component, không
nhánh điều kiện, không import thừa — mọi import (`Link`, `Button`, `Badge`, `Card`, `CardContent`, và
7 icon lucide) đều được render.

---

## Vùng 1 — Hình ảnh component

**Kết luận:** ASCII wireframe, bảng Zones, Key Interactions và phần Business-Logic trong
`customer_welcome.md` đều khớp `page.tsx`. Drift dữ liệu thật duy nhất là nhãn giờ; phần còn lại là
trừu tượng hóa wireframe bình thường (một khung ASCII không thể hiện hết mọi đoạn văn/badge).

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **Navbar** | logo + "Bánh Cuốn Bà Hoa" + `[Xem Thực Đơn]` | nav sticky: `ChefHat` trong khung `bg-primary` + "Bánh Cuốn Bà Hoa" + `Button`(`QrCode` + "Xem Thực Đơn") `asChild` → `<Link href="/menu">` (`page.tsx:37-52`) | 🟢 | Chính xác. ASCII bỏ icon QrCode — chỉ là hình thức. |
| **Hero** | badge "⭐ … Từ 1995"; tiêu đề "Hương Vị Bánh Cuốn **—** Đúng Vị Hà Nội"; `[Đặt Món Ngay]` `[Tìm Hiểu Thêm ↓]` | `Badge`+`Star` "Quán Bánh Cuốn Truyền Thống Từ 1995" (`:57-60`); `h1` "Hương Vị **Bánh Cuốn**`<br/>`Đúng Vị Hà Nội" — một dấu xuống dòng, **không có gạch ngang** (`:62-66`); một `<p>` mô tả (`:68-71`, không vẽ); CTA `Đặt Món Ngay` → `<Link href="/menu">` (`:74-79`) + `Tìm Hiểu Thêm` → `<a href="#about">` (`:80-85`) | 🟢 | Dấu "—" của tài liệu là `<br/>` trong code; ASCII bỏ đoạn phụ của hero. Hình thức. |
| **About (`#about`)** | "Câu Chuyện Của Chúng Tôi" + 2 đoạn văn + placeholder ảnh | `Badge` "Câu Chuyện Của Chúng Tôi" + `h2` "Gần 30 Năm / Trao Truyền Hương Vị" (`:94-98`, không có trong ASCII) + 2 `<p>` story (`:99-109`) + placeholder ảnh `ChefHat` "Ảnh quán sẽ được thêm vào đây" (`:112-118`) | 🟢 | Chính xác. ASCII bỏ `h2` của section. Hình thức. |
| **Món đặc trưng** | 3 card "Nhân Thịt / Tôm Thịt / Chay" + `[Xem Toàn Bộ Thực Đơn →]` | `dishes.map` → 3 `Card`, tên **đầy đủ** "Bánh Cuốn Nhân Thịt / Tôm Thịt / Chay" + `Badge` tag + desc (`:131-150`); section còn có `Badge` "Thực Đơn Nổi Bật" + `h2` "Món Đặc Trưng" + phụ đề (`:125-129`, không vẽ); CTA → `<Link href="/menu">` (`:153-158`) | 🟢 | Tài liệu rút gọn tên món ("Nhân Thịt" vs "Bánh Cuốn Nhân Thịt") + bỏ header section. Hình thức. |
| **Giờ & địa chỉ — giờ** | 🕐 "T2–T6 06:30–21h" · "T7–CN 06:00–**21h**" | hằng `hours`: `{ "Thứ 2 – Thứ 6", "06:30 – 21:00" }`, `{ "Thứ 7 – Chủ Nhật", "06:00 – 21:30" }` (`page.tsx:27-30`), render bởi `hours.map` (`:180-185`) | 🟡 | Tài liệu làm tròn **cả hai** giờ đóng thành "21h", giấu mất việc **cuối tuần đóng 21:30, không phải 21:00**. Sửa ASCII thành "06:30–21:00" / "06:00–21:30". |
| **Giờ & địa chỉ — địa chỉ** | 📍 địa chỉ + sđt + placeholder bản đồ | "123 Đường Ẩm Thực, Phường Hàng Bông, Quận Hoàn Kiếm, Hà Nội" + `Phone` "0901 234 567" + placeholder `MapPin` "Bản đồ sẽ được nhúng vào đây" (`:197-211`) | 🟢 | Chính xác. |
| **QR CTA** | "Sẵn Sàng Đặt Món?" + `[Xem Thực Đơn & Đặt Món]` | khung icon `QrCode` + `h2` "Sẵn Sàng Đặt Món?" + một `<p>` (`:218-227`, không vẽ) + `Button` → `<Link href="/menu">` (`:228-233`) | 🟢 | Chính xác. ASCII bỏ icon QR + đoạn văn. Hình thức. |
| **Footer** | "Thực Đơn · Chính Sách · Điều Khoản" | logo + "© 2026 · Hà Nội, Việt Nam" + 3 link: "Thực Đơn" → `/menu`, "Chính Sách" → **`/privacy-policy`**, "Điều Khoản" → **`/terms`** (`:238-252`) — cả hai route đích **tồn tại** (`app/privacy-policy/page.tsx`, `app/terms/page.tsx`) | 🟢 | Chính xác; đích link đã kiểm tra là có thật. |
| **Bảng Zones** | JSX inline trong `app/welcome/page.tsx`; hằng `dishes`/`hours`; atoms `Button`/`Badge`/`Card`; placeholder ảnh/bản đồ | Đúng y: import `Button`/`Badge`/`Card`/`CardContent` (`:2-4`); 2 hằng mảng cấp module (`:9-30`); placeholder `ChefHat`/`MapPin`. | 🟢 | Chính xác. |
| **Business Logic "hoàn toàn tĩnh — không API"** | tĩnh, không API | Xác nhận — không import `api-client`, không hook, không `fetch`; Server Component mặc định (không `'use client'`). | 🟢 | Chính xác. |
| **🔮 PLANNED — navbar link → `/introduction`** | đánh dấu PLANNED, chưa code | route `/introduction` **không** tồn tại (`find app -ipath '*introduction*'` → không có) — và không có banner bàn QR | 🟢 | Tài liệu trung thực: đánh dấu đúng 🔮 PLANNED. |

**Đã xác nhận khớp:** cả ba CTA chính (`Đặt Món Ngay`, `Xem Toàn Bộ Thực Đơn`,
`Xem Thực Đơn & Đặt Món`) và nút navbar đều dẫn về `/menu`; `Tìm Hiểu Thêm` là anchor `#about`
trong trang; footer dẫn `/menu` / `/privacy-policy` / `/terms`. Mọi tuyên bố Key-Interactions đều
đúng.

---

## Vùng 2–5 — N/A (đã xác nhận, không phải bỏ qua)

- **Vùng 2 (Cross-component):** không store chung, không luồng giữa widget — mỗi section là JSX tĩnh
  độc lập trên hai hằng cấp module. (`SCENARIO_WELCOME.md` §A) ✅
- **Vùng 3 (Cross-page):** trang không ghi gì — không Zustand, không localStorage, không URL state.
  Output duy nhất là ý định điều hướng. (`SCENARIO_WELCOME.md` §B) ✅
- **Vùng 4 (Loading):** không `loading.tsx` (đã xác nhận vắng mặt), không `<Suspense>`, không
  `useQuery`. First paint = final paint. (`SCENARIO_WELCOME.md` §E) ✅
- **Vùng 5 (FE⇄BE):** không request nào rời `/welcome`. "Món đặc trưng" là hằng `dishes`
  (`page.tsx:9-25`), **không phải** `GET /products` — câu hỏi tồn đọng của tracker đã được giải.
  (`SCENARIO_WELCOME.md` §D) ✅

---

## Kiểm tra provenance — `SCENARIO_WELCOME.md`

Mọi trích dẫn `file:line` trong scenario đã được mở lại và **chính xác**: `WelcomePage` `:32`;
`dishes` `:9-25`; `hours` `:27-30`; link navbar `:45-50`; CTA hero `:74-79` / `:80-85`; ảnh about
`:112-118`; `dishes.map` `:131-150`; CTA dishes `:153-158`; `hours.map` `:180-185`; placeholder bản
đồ `:205-211`; CTA QR `:228-233`; footer `:247-251`. Tuyên bố "256 dòng, khép kín" là đúng.

| Chủ đề | Tài liệu nói | Code thực tế | Mức | Giải pháp |
|---|---|---|---|---|
| Provenance ở header SCENARIO | "Traced from source on branch `experience_claude.md_system_1`" (`SCENARIO_WELCOME.md:9`) | Nhánh hiện tại là `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Tag nhánh cũ — cập nhật ở lần sau (cùng loại với drift provenance của mọi trang khác). |

---

## Danh Sách Việc Cần Làm (theo thứ tự ưu tiên)

| # | Loại | Hành động | File đích |
|---|---|---|---|
| 1 | 🟡 Sửa doc | Ngừng làm tròn giờ đóng cuối tuần thành "21h" trong ASCII — hiển thị `06:30–21:00` (T2–T6) / `06:00–21:30` (T7–CN) để khớp hằng `hours` | `customer_welcome.md` (ASCII, khối giờ) |
| 2 | 🟢 Sửa doc | Cập nhật tag nhánh provenance của SCENARIO sang nhánh hiện tại | `SCENARIO_WELCOME.md:9` |
| 3 | 🟢 Doc (tùy chọn) | Có thể ghi chú trong ASCII rằng các section hero/about/dishes/QR mỗi cái mang một `Badge`+`h2`+đoạn phụ mà khung không thể hiện (để người đọc sau không tưởng là thiếu) | `customer_welcome.md` |

> Theo CLAUDE.md: sửa doc là **một** task ALIGNed (trang này chỉ cần chạm doc — **không có bug code**
> để đăng ký). Không mục nào ở đây cần dòng `MASTER_TASK.md` ngoài task sửa doc.
