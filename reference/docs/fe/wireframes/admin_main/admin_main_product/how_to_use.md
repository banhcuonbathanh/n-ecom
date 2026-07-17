> Dành cho: Quản trị viên, onboarding in-app, FAQ hỗ trợ.

---

# Hướng dẫn sử dụng: Trang Sản phẩm

Trang được thiết kế theo nguyên tắc **quản lý tập trung** — toàn bộ thực đơn, giá cả và trạng thái bán đều nằm ở một chỗ, không cần chuyển sang trang khác.

---

## Bước 1: Xem danh sách sản phẩm (Zone B)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone B — Bảng sản phẩm | Hiển thị toàn bộ sản phẩm đang có | Cuộn xuống để xem hết danh sách |
| Cột Ảnh | Hình thu nhỏ của sản phẩm | Hiển thị tự động nếu đã có ảnh; icon mặc định nếu chưa có |
| Cột Tên sản phẩm | Tên đầy đủ của món | Tên chính xác theo thực đơn |
| Cột Danh mục | Loại món (Bánh cuốn / Đồ uống / Món thêm...) | Giúp phân loại nhanh |
| Cột Topping | Badge các topping đi kèm | Hiển thị tối đa 2 badge + "+N more" nếu có nhiều hơn |
| Cột Giá | Giá bán (đơn vị ₫) | Giá gốc sản phẩm, chưa tính topping |
| Cột Trạng thái | Đang bán (xanh) hoặc Hết hàng (xám) | Phản ánh tình trạng hiện tại |

---

## Bước 2: Thêm sản phẩm mới (Zone A + Modal M1)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone A — Nút "+ Thêm sản phẩm" | Mở form thêm món mới | Nhấn nút cam góc phải |
| Modal M1 — Danh mục | Chọn nhóm món | Bắt buộc — chọn từ danh sách đã có |
| Modal M1 — Tên sản phẩm | Nhập tên món | Bắt buộc — tên phải duy nhất |
| Modal M1 — Mô tả | Ghi chú thêm về món | Tuỳ chọn |
| Modal M1 — Hình ảnh | Tải ảnh lên cho sản phẩm | Nhấn "Chọn ảnh", chọn file từ máy tính |
| Modal M1 — Giá (₫) | Giá bán chính | Bắt buộc — phải lớn hơn 0 |
| Modal M1 — Thứ tự | Số thứ tự hiển thị trong danh sách | Số nhỏ hơn hiển thị trước |
| Modal M1 — Topping | Gán các topping có thể chọn thêm | Tick chọn các topping phù hợp với món này |
| Nút Lưu | Lưu sản phẩm mới | Sản phẩm xuất hiện ngay trong bảng |

---

## Bước 3: Sửa thông tin sản phẩm (Zone B + Modal M1)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone B — Nút "Sửa" | Mở form chỉnh sửa sản phẩm | Nhấn nút ở cùng dòng với sản phẩm cần sửa |
| Modal M1 | Form đã điền sẵn thông tin hiện tại | Sửa trực tiếp các trường cần thay đổi |
| Trạng thái trong form | Chỉnh "Đang bán" ↔ "Hết hàng" | Dùng để tạm ngưng bán khi hết nguyên liệu |
| Nút Lưu | Cập nhật thông tin | Thay đổi áp dụng ngay lập tức |

---

## Bước 4: Xoá sản phẩm (Zone B)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone B — Nút "Xóa" | Xoá sản phẩm khỏi hệ thống | Nhấn nút đỏ → xác nhận trong hộp thoại → sản phẩm bị xoá vĩnh viễn |

> ⚠️ Không thể xoá sản phẩm đang có trong đơn hàng chưa hoàn tất.

---

## Mẹo & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho bạn |
|------------|---------------------|---------------|
| Hết nguyên liệu tạm thời | Sửa sản phẩm → đổi trạng thái sang "Hết hàng" | Khách sẽ không thấy món này trên thực đơn |
| Muốn bán lại | Sửa sản phẩm → đổi trạng thái sang "Đang bán" | Món xuất hiện lại ngay trên thực đơn |
| Thêm nhiều sản phẩm cùng lúc | Dùng nút "🌱 Dữ liệu mẫu" (nếu có quyền) | Tạo nhanh dữ liệu thử nghiệm |
| Sản phẩm có quá nhiều topping | Chỉ 2 badge hiển thị trong bảng, phần còn lại là "+N more" | Xem đầy đủ khi mở form Sửa |
| Lưu thất bại | Hệ thống giữ nguyên form, hiển thị thông báo lỗi | Kiểm tra kết nối mạng và thử lại |
| Tên sản phẩm trùng | Hệ thống báo lỗi ngay tại ô tên | Đổi tên thành tên khác chưa có trong hệ thống |

---

## Luồng chuẩn thêm sản phẩm

```
[Zone A] Nhấn "+ Thêm sản phẩm"
         ↓
[M1] Chọn danh mục
         ↓
[M1] Nhập tên + giá (bắt buộc)
         ↓
[M1] Chọn ảnh + nhập mô tả (tuỳ chọn)
         ↓
[M1] Tick topping áp dụng (tuỳ chọn)
         ↓
[M1] Nhấn "Lưu"
         ↓
[Zone B] Sản phẩm xuất hiện trong bảng ✅
```

---

*Cập nhật lần cuối: 2026-05-26*
