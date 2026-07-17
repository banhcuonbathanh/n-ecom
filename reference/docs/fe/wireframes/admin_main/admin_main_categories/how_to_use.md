> Dành cho: Quản trị viên, onboarding in-app, FAQ hỗ trợ.

---

# Hướng dẫn sử dụng: Admin — Danh Mục

Trang được thiết kế theo nguyên tắc **thao tác tại chỗ** — mọi thao tác thêm, sửa, xóa đều thực hiện ngay trên trang này, không cần chuyển sang trang khác.

---

## Bước 1: Xem danh sách danh mục (Zone A, B, C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone A — AdminTopNav | Điều hướng giữa các trang quản trị | Nhấn vào tab muốn chuyển; tab "Danh mục" đang được chọn (gạch cam bên dưới) |
| Zone B — PageHeader | Hiển thị tên trang + số lượng danh mục | Tiêu đề "Danh mục (5)" cho biết hiện có 5 danh mục |
| Zone C — CategoryTable | Bảng toàn bộ danh mục | Xem tên và thứ tự của từng danh mục; mỗi hàng có nút Sửa và Xóa |

---

## Bước 2: Thêm danh mục mới (Zone D)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone B | Mở form thêm mới | Nhấn nút "+ Thêm danh mục" (màu cam, góc phải) |
| Zone D — AddModal | Form nhập thông tin danh mục mới | Điền "Tên danh mục" (bắt buộc) và "Thứ tự" (tuỳ chọn, mặc định 0) |
| Zone D | Lưu hoặc hủy | Nhấn "Lưu" để lưu lại; nhấn "Hủy" hoặc ✕ để đóng mà không lưu |

---

## Bước 3: Chỉnh sửa danh mục (Zone E)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone C | Mở form chỉnh sửa | Nhấn nút "Sửa" trên hàng muốn chỉnh |
| Zone E — EditModal | Form điền sẵn thông tin hiện tại | Thông tin cũ đã được điền vào form (ô nhập có viền cam). Chỉnh phần cần thay đổi |
| Zone E | Lưu hoặc hủy | Nhấn "Lưu" để cập nhật; nhấn "Hủy" hoặc ✕ để thoát không lưu |

---

## Bước 4: Xóa danh mục (Zone C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone C | Xóa một danh mục | Nhấn nút "Xóa" (màu đỏ) trên hàng muốn xóa |
| Hệ thống | Xác nhận và xóa | Nếu danh mục đang có sản phẩm, hệ thống sẽ thông báo không thể xóa |

---

## Mẹo & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho quản trị viên |
|------------|--------------------|-----------------------|
| Tên danh mục đã tồn tại | Hiển thị lỗi ngay dưới ô nhập: "Tên danh mục đã tồn tại." | Đặt tên khác hoặc kiểm tra lại danh sách hiện có |
| Xóa danh mục có sản phẩm | Thông báo lỗi: "Không thể xóa — danh mục đang có sản phẩm." | Chuyển sản phẩm sang danh mục khác trước khi xóa |
| Mất kết nối mạng | Bảng hiển thị thông báo lỗi + nút "Thử lại" | Nhấn "Thử lại" sau khi có mạng trở lại |
| Danh sách trống | Hiển thị thông báo: "Chưa có danh mục nào." | Nhấn "+ Thêm danh mục" để tạo danh mục đầu tiên |
| Ô nhập Thứ tự để trống | Mặc định là 0 | Không cần điền nếu không quan trọng thứ tự hiển thị |

---

## Luồng chuẩn — Thêm danh mục

```
[ Vào trang /admin/categories ]
         ↓
[ Xem bảng danh mục hiện có ]
         ↓
[ Nhấn "+ Thêm danh mục" ]
         ↓
[ Điền Tên danh mục + Thứ tự ]
         ↓
[ Nhấn Lưu ]
         ↓
[ Bảng cập nhật — danh mục mới xuất hiện ]
```

## Luồng chuẩn — Sửa danh mục

```
[ Tìm hàng cần sửa trong bảng ]
         ↓
[ Nhấn "Sửa" ]
         ↓
[ Chỉnh thông tin trong form đã điền sẵn ]
         ↓
[ Nhấn Lưu ]
         ↓
[ Bảng cập nhật — thay đổi phản ánh ngay ]
```
