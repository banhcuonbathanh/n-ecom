# Customer Settings — So Sánh Chi Tiết Tài Liệu vs. Code

> **Phạm vi:** kiểm tra bộ tài liệu `customer_settings` (`customer_settings.md` — file tài liệu duy
> nhất của trang) đối chiếu với code FE thực tế đang chạy cho `/menu/settings`.
> **Các trục:** (1) Hình ảnh component · (2) Luồng dữ liệu cross-component · (3) Luồng dữ liệu
> cross-page. Trục 4 (loading) và 5 (FE⇄BE) **N/A** — trang không có async query và **không gọi
> backend**.
> **Chỉ đọc** — không sửa code hay tài liệu. **Code thắng** — mọi ô "Code thực tế" đều truy nguồn từ
> source trên branch hiện tại.
> **Thực hiện:** inline (trang nhỏ — 1 file tài liệu, `page.tsx` ~80 dòng, store Zustand local thuần);
> không cần subagent. 🔴 được kiểm lại bằng tay.
> **Branch:** `experience_claude.md_system_1_test_iphon2_change_code` · **Ngày:** 2026-06-21

---

## Tóm Tắt Điều Hành

| Khu vực | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Hình ảnh component (ASCII + Zones) | Phần lớn đúng; lệch copy & helper-text | 1 | 4 | 2 |
| 2 — Luồng dữ liệu cross-component | Đúng | 0 | 0 | 1 |
| 3 — Luồng dữ liệu cross-page | Đúng; một lưu ý về store dùng chung | 0 | 0 | 1 |
| 4 — Loading | N/A (không async) | — | — | — |
| 5 — Mô hình dữ liệu FE⇄BE | N/A (không gọi backend) | — | — | — |
| **Tổng** | **Lệch thấp; 1 🔴 về hành vi** | **1** | **4** | **4** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG (đã kiểm bằng tay)

1. **"Lưu → quay lại trang trước" là SAI — nút Lưu KHÔNG điều hướng.**
   `customer_settings.md:37` (Key Interactions) ghi: *"**Lưu** → persists to settings store
   (localStorage) **and navigates back**."* Code `handleSave` (`menu/settings/page.tsx:14-19`) làm ba
   việc: `setCustomerName` + `setTableLabel`, `setSaved(true)`, và `setTimeout(() => setSaved(false),
   2000)` trong 2 giây. **Không có** `router.back()` / `router.push()` trong `handleSave`. Điều hướng
   duy nhất trên trang là **mũi tên** quay lại (`page.tsx:26`, `router.back()`). Khi Lưu, người dùng
   **ở lại trang**; nhãn nút đổi thành **"Đã lưu!"** trong 2 giây (`page.tsx:74`) để xác nhận. **Lệch
   tài liệu** (không phải lỗi code — toast inline là lựa chọn UX hợp lệ), nhưng tài liệu mô tả một
   luồng không tồn tại.

---

## Các Component Chết / Không Thể Tới

- Không có. Trang là một component tự chứa duy nhất; cả hai input, nút lưu, và mũi tên quay lại đều
  có thể tới và được nối dây đầy đủ.

---

## Khu vực 1 — Hình Ảnh Component (ASCII wireframe + bảng Zones)

**Kết luận:** đúng về cấu trúc (header · 2 input có nhãn · save · nav shell), nhưng ASCII đã cũ về
copy của field, copy của nút, và bỏ sót hai dòng helper-text cùng trạng thái đã-lưu.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Nhãn field tên | "**Tên của bạn**" (`customer_settings.md:16`) | `Tên hiển thị` (`menu/settings/page.tsx:39`) | 🟡 | Cập nhật nhãn ASCII thành "Tên hiển thị" |
| Helper-text tên | (không vẽ) | `Hiển thị trong giỏ hàng và xác nhận đơn.` (`page.tsx:49`) | 🟡 | Thêm dòng helper dưới input tên trong ASCII |
| Nhãn field bàn | "Nhãn bàn" (`:18`) | `Nhãn bàn` (`page.tsx:55`) | 🟢 | ✅ khớp |
| Helper-text bàn | (không vẽ) | `Hiển thị trong header menu và giỏ hàng.` (`page.tsx:65`) | 🟡 | Thêm dòng helper dưới input bàn trong ASCII |
| Copy nút Lưu | "💾 Lưu" (`:21`) | `Lưu cài đặt` + icon lucide `Save` (`page.tsx:73-74`) | 🟡 | Cập nhật ASCII thành "💾 Lưu cài đặt" |
| Nút Lưu — trạng thái đã lưu | (không vẽ) | đổi thành `Đã lưu!` trong 2s sau khi lưu (`page.tsx:74` + `:17-18`) | 🟡 | Ghi chú trạng thái "Đã lưu!" sau khi lưu vào ASCII / Key Interactions |
| Placeholder tên | "Nguyễn Văn A" (`:17`) | `Ví dụ: Anh Minh` (`page.tsx:46`) | 🟢 | Mỹ thuật — chỉnh ví dụ hoặc bỏ khỏi ASCII |
| Placeholder bàn | "Bàn 03" (`:19`) | `Ví dụ: Bàn 3` (`page.tsx:62`) | 🟢 | Mỹ thuật |
| Header (back + tiêu đề) | `[←] Cài đặt` (`:13`) | `ArrowLeft` + `Cài đặt` (`page.tsx:30,32`) | 🟢 | ✅ khớp |
| Tab nav dưới "Cài Đặt" + thứ tự | `[Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt]` (`:23`) | đúng thứ tự + tab `Cài Đặt` → `/menu/settings` (`ClientBottomNav.tsx:58-98`), render bởi `(shop)/layout.tsx:13` | 🟢 | ✅ khớp |
| Key interaction: hành vi lưu | "persists … và **navigates back**" (`:37`) | persists + hiện toast "Đã lưu!"; **không điều hướng** (`page.tsx:14-19`) | 🔴 | Xem headline #1 — sửa tài liệu thành "persists + hiện xác nhận 'Đã lưu!', ở lại trang" |

**Đã xác minh khớp:** route `/menu/settings`; mũi tên back → `router.back()` (`page.tsx:26`); cả hai
input đều controlled (`page.tsx:44-45,60-61`); icon save là lucide `Save` (`page.tsx:73`); tab "Cài
Đặt" là highlight route active (`ClientBottomNav.tsx:43,98`).

---

## Khu vực 2 — Luồng Dữ Liệu Cross-Component

**Kết luận:** đúng. Không có file `_crosscomponent_dataflow.md` riêng; claim "Data source =
`useSettingsStore`" trong bảng Zones là chính xác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Nguồn dữ liệu của input | "inline controlled inputs … `useSettingsStore`" (`:32`) | input bind vào `useState` **local** seed từ store (`page.tsx:10-11`), chỉ ghi vào store khi Lưu (`page.tsx:15-16`) | 🟢 | Sắc thái nhỏ — giá trị là bản nháp local cho tới khi Lưu commit vào store; "data source" của tài liệu ổn như cách nói tắt |

**Đã xác minh khớp:** `customerName`/`tableLabel` + các setter đều từ `useSettingsStore`
(`page.tsx:9`); store expose đúng 4 thành phần đó (`store/settings.ts:5-10`).

---

## Khu vực 3 — Luồng Dữ Liệu Cross-Page

**Kết luận:** đúng. Claim "lưu trong localStorage, chỉ để hiển thị, không bao giờ override binding bàn
phía server" của tài liệu là đúng, và store là writer duy nhất cấp dữ liệu cho component của hai trang
khác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Lưu trữ | "stored in `useSettingsStore` (localStorage)" + "all keys via `lib/storage-keys.ts`" (`:5,42`) | middleware `persist`, key `STORAGE_KEYS.CUSTOMER_SETTINGS = 'customer-settings'` (`store/settings.ts:13,20` + `storage-keys.ts:5`); toàn bộ store được persist (không `partialize`) | 🟢 | ✅ khớp |
| Chỉ hiển thị, không override server | "display-only — never override the server-side table binding" (`:43-44`) | giá trị chỉ đọc để hiển thị: `tableLabel`→`MenuHeader.tsx:28`, `customerName`+`tableLabel`→`CartDrawer.tsx:77-79`; không code order/payload nào đọc chúng | 🟢 | ✅ khớp (xem ghi chú cross-page) |
| Không gọi backend | TL;DR "No backend calls" (`:5`) | trang chỉ import `useState`/`useRouter`/lucide/`useSettingsStore`; không `api-client`, không query/mutation (`page.tsx:1-5`) | 🟢 | ✅ khớp |

**Đã xác minh khớp:** writer duy nhất của các field này là trang này (`setTableLabel`/`setCustomerName`,
`page.tsx:15-16`) và `useCustomerProfile.ts:44,51` (ghi `customerName` từ profile fetch — **không**
`tableLabel`). Grep xác nhận `setTableLabel` **không được gọi ở đâu khác** trong `fe/src`.

---

## Danh Sách Hành Động Tổng Hợp (theo độ ưu tiên)

| # | Loại | Hành động | File đích |
|---|---|---|---|
| 1 | 🔴 Sửa tài liệu | Sửa Key Interactions: Lưu persists + hiện xác nhận "Đã lưu!" và **ở lại trang** (không quay lại) | `customer_settings.md:37` |
| 2 | 🟡 Sửa tài liệu | Cập nhật ASCII: nhãn tên "Tên của bạn" → **"Tên hiển thị"** | `customer_settings.md:16` |
| 3 | 🟡 Sửa tài liệu | Cập nhật ASCII: nút lưu "💾 Lưu" → **"💾 Lưu cài đặt"** + ghi chú trạng thái "Đã lưu!" sau lưu | `customer_settings.md:21` |
| 4 | 🟡 Sửa tài liệu | Thêm hai dòng helper-text dưới mỗi input trong ASCII | `customer_settings.md:16-20` |
| 5 | 🟢 Sửa tài liệu | Chỉnh/cắt các ví dụ placeholder trong ASCII | `customer_settings.md:17,19` |

> Theo CLAUDE.md: sửa tài liệu là **một** task; skill này không thay đổi gì. Mọi thay đổi code phải
> được đăng ký trong `MASTER_TASK.md` trước khi đụng file — ở đây **không cần thay đổi code** (🔴 là
> lệch tài liệu, không phải lỗi code).
