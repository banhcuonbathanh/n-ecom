> Dành cho: Nhân viên quản lý kho, onboarding in-app, FAQ hỗ trợ.

---
# Hướng dẫn sử dụng: Kho nguyên liệu

Mọi thao tác diễn ra ngay tại chỗ — không cần chuyển trang, không popup rườm rà.

---

## Bước 1: Xem tổng quan kho (Zone A, B, C, D)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone A — Thanh điều hướng | Hiển thị tên hệ thống và thông tin đăng nhập | Chỉ xem; nhấn "Đăng xuất" để thoát |
| Zone B — Tab điều hướng | Chuyển giữa các trang quản trị | Nhấn vào tab muốn mở; tab **Kho nguyên liệu** đang hiện màu cam |
| Zone C — Thanh tiêu đề | Tên trang + tìm kiếm + nút thêm mới | Dùng ô tìm kiếm để lọc; nhấn "+ Thêm" để mở form |
| Zone D — Bảng nguyên liệu | Danh sách toàn bộ nguyên liệu trong kho | Đọc thông tin từng dòng; dùng màu để nhận biết trạng thái |

---

## Bước 2: Đọc trạng thái nguyên liệu (Zone D)

| Dòng / Màu | Ý nghĩa | Nên làm gì |
|------------|---------|------------|
| Nền trắng + badge xanh "Còn hàng" | Nguyên liệu bình thường, đủ hàng | Không cần xử lý |
| Nền cam nhạt + badge vàng "Sắp hết hạn" | Nguyên liệu sắp hết hạn hoặc gần hết tồn kho | Ưu tiên dùng trước; lên kế hoạch nhập thêm |
| Số lượng màu đỏ | Tồn kho xuống dưới ngưỡng cảnh báo | Đặt hàng nhập kho ngay |
| Ngày hạn màu đỏ | Ngày hết hạn sử dụng rất gần | Dùng ngay hoặc kiểm tra lại chất lượng |

---

## Bước 3: Thêm nguyên liệu mới (Zone C → Zone E)

| Bước | Hành động | Lưu ý |
|------|-----------|-------|
| 1 | Nhấn nút **"+ Thêm nguyên liệu"** | Form xuất hiện ở giữa màn hình |
| 2 | Điền **Tên nguyên liệu** | Bắt buộc; không trùng tên đã có |
| 3 | Chọn **Đơn vị** (kg, g, lít, cái…) | Chọn từ danh sách thả xuống |
| 4 | Nhập **Số lượng ban đầu** | Số >= 0 |
| 5 | Nhập **Ngưỡng cảnh báo** | Khi tồn kho dưới mức này → hệ thống cảnh báo tự động |
| 6 | Chọn **Ngày nhập kho** | Định dạng dd/mm/yyyy |
| 7 | Nhập **Số ngày bảo quản** | Hệ thống tự tính ngày hết hạn |
| 8 | Nhấn **"Lưu"** | Nguyên liệu xuất hiện ngay trong bảng |

---

## Bước 4: Sửa hoặc xóa nguyên liệu (Zone D)

| Hành động | Cách làm | Kết quả |
|-----------|----------|---------|
| **Sửa** | Nhấn nút "Sửa" ở cuối dòng | Form mở lại với dữ liệu đã điền sẵn; chỉnh sửa rồi nhấn "Lưu" |
| **Xóa** | Nhấn nút "Xóa" ở cuối dòng | Hệ thống hỏi xác nhận; nhấn đồng ý để xóa vĩnh viễn |

> ⚠️ Không thể xóa nguyên liệu đang được liên kết với công thức món ăn.

---

## Mẹo & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho nhân viên |
|------------|---------------------|---------------------|
| Tìm kiếm không ra kết quả | Bảng hiển thị "Không tìm thấy nguyên liệu nào" | Kiểm tra lại cách viết (viết hoa, dấu) |
| Bảng trống (chưa có nguyên liệu) | Hiển thị thông báo trống kèm nút thêm mới | Nhấn nút ngay để bắt đầu nhập kho |
| Mạng bị ngắt khi đang lưu | Hiện thông báo lỗi; dữ liệu chưa được lưu | Kiểm tra kết nối rồi thử lại |
| Tên nguyên liệu bị trùng | Form báo lỗi ngay ô tên | Đổi tên hoặc cập nhật nguyên liệu đã có bằng "Sửa" |
| Nhập số ngày bảo quản quá ít (< 1) | Form không cho lưu | Nhập tối thiểu 1 ngày |

---

## Luồng chuẩn nhập kho

```
Nhấn "+ Thêm nguyên liệu"
        ↓
   Điền 6 trường
(Tên · Đơn vị · Số lượng · Ngưỡng · Ngày nhập · Số ngày BQ)
        ↓
   Nhấn "Lưu"
        ↓
Bảng cập nhật ngay — dòng mới xuất hiện với badge "Còn hàng"
```
