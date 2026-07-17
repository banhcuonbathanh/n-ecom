> Dành cho: Nhân viên, quản lý, hướng dẫn onboarding in-app, FAQ hỗ trợ.

---

# Hướng dẫn sử dụng: Admin — Danh sách Công Việc

Trang thiết kế theo nguyên tắc **một trang, một nhìn** — toàn bộ công việc của ca hiện tại
hiện ra ngay sau khi lọc, không cần chuyển tab hay mở thêm màn hình.

---

## Bước 1: Xem danh sách công việc (Zone A, B, C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| **Zone A — Tiêu đề** | Hiển thị tên trang và nút tạo việc mới | Nhìn vào góc phải trên: nếu thấy nút **"+ Tạo công việc"** — bạn là quản lý và có quyền tạo việc |
| **Zone B — Bộ lọc** | Chọn nhân viên, khoảng ngày, và trạng thái cần xem | Mặc định hiển thị toàn bộ công việc hôm nay. Thay đổi bộ lọc → nhấn **"Lọc"** để cập nhật danh sách |
| **Zone C — Danh sách** | Bảng công việc (máy tính) hoặc thẻ việc (điện thoại) | Cuộn xuống để xem thêm. Phân trang ở cuối nếu có nhiều hơn 15 công việc |

**Lưu ý lọc nhanh:**
- Muốn xem việc của một nhân viên cụ thể → chọn tên từ dropdown **"Chọn nhân viên"**
- Muốn xem việc trong tuần trước → chọn ngày bắt đầu và kết thúc ở **bộ lọc ngày**
- Muốn xem riêng việc chưa xong → chọn **"Đang chờ"** hoặc **"Quá hạn"** trong dropdown trạng thái

---

## Bước 2: Đánh dấu hoàn thành (Zone C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| **Checkbox (☐ / ☑)** | Đánh dấu công việc đã hoàn thành | Nhấn vào ô vuông bên trái tên công việc. Trạng thái chuyển ngay — không cần nhấn "Lưu" |
| **Badge màu** | Cho biết trạng thái hiện tại | 🟡 Đang chờ · ✅ Hoàn thành · 🔴 Quá hạn |

**Ai được tích checkbox?**
- Nhân viên: chỉ tích được việc **được giao cho chính mình**
- Quản lý: có thể tích bất kỳ việc nào trong danh sách

---

## Bước 3: Tạo công việc mới — Quản lý (Zone A → D)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| **Zone A — nút "+ Tạo"** | Mở form tạo việc | Nhấn **"+ Tạo công việc"** ở góc phải trên trang |
| **Zone D — Modal** | Điền thông tin công việc | Điền tiêu đề → chọn nhân viên → chọn ngày và giờ hạn → thêm ghi chú nếu cần → nhấn **"Lưu công việc"** |

**Các trường bắt buộc:**
- Tiêu đề công việc
- Giao cho (chọn nhân viên)
- Hạn hoàn thành (ngày + giờ)

---

## Bước 4: Sửa hoặc xóa công việc — Quản lý (Zone C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| **Nút ✏️ Sửa** | Mở form chỉnh sửa công việc | Nhấn ✏️ ở cuối hàng. Form mở với thông tin hiện tại đã điền sẵn. Chỉnh sửa → nhấn **"Lưu công việc"** |
| **Nút 🗑️ Xóa** | Xóa công việc | Nhấn 🗑️ → xác nhận xóa. Thao tác không thể hoàn tác |

---

## Mẹo & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho người dùng |
|---|---|---|
| Công việc quá hạn | Tự động chuyển sang trạng thái 🔴 Quá hạn khi qua giờ hẹn | Quản lý cần kiểm tra và xử lý ngay các việc đánh đỏ |
| Không tìm thấy việc nào | Hiển thị thông báo "Không có công việc nào cho bộ lọc này" | Thử mở rộng khoảng ngày hoặc bỏ chọn bộ lọc nhân viên |
| Mất kết nối khi tích checkbox | Hệ thống hiển thị thông báo lỗi và hoàn tác trạng thái | Kiểm tra kết nối mạng → thử lại thao tác |
| Khoảng ngày lọc quá dài | Hệ thống giới hạn tối đa 90 ngày | Lọc theo từng tháng nếu cần xem lịch sử dài hạn |
| Nhân viên đã nghỉ việc | Tên vẫn hiển thị trên các công việc cũ | Dữ liệu công việc lịch sử vẫn được giữ nguyên để tra cứu |

---

## Luồng chuẩn 4 bước

```
Quản lý mở trang
        ↓
Chọn bộ lọc (nhân viên + ngày + trạng thái) → nhấn "Lọc"
        ↓
Xem danh sách → tích checkbox hoàn thành / tạo việc mới / sửa / xóa
        ↓
Danh sách cập nhật ngay lập tức
```
