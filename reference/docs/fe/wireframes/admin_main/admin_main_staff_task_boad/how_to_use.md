> Dành cho: Quản lý, Admin — hướng dẫn sử dụng từng vùng màn hình theo thứ tự thao tác thực tế.

---

# Hướng dẫn sử dụng: Bảng Quản Lý Nhiệm Vụ Nhân Viên

Thiết kế theo nguyên tắc **nhìn tổng quan trước, đi sâu khi cần** — mọi thông tin quan trọng hiển thị ngay trên bảng; chi tiết nhiệm vụ chỉ mở ra khi bạn chủ động nhấn vào.

---

## Bước 1: Điều hướng và chọn phạm vi xem (Zone A, B)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone A — Thanh điều hướng trên cùng | Chuyển giữa các trang quản trị: Dashboard, Staff, Orders, Products, Reports | Nhấn vào tên mục để chuyển trang. Mục "Staff" đang được chọn khi bạn ở đây |
| Zone B — Thanh tiêu đề trang | Hiển thị đường dẫn "Admin > Staff > Task Board" và nút **+ Add Task** màu cam | Nhấn **+ Add Task** để mở form tạo nhiệm vụ mới cho bất kỳ nhân viên nào |

> **Mẹo:** Cả Zone A và Zone B đều cố định ở đầu trang (sticky) — bạn luôn thấy chúng khi cuộn xuống.

---

## Bước 2: Chọn ngày và lọc dữ liệu (Zone C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Ô **Date** | Chọn ngày cần xem nhiệm vụ | Nhập ngày theo định dạng YYYY-MM-DD hoặc dùng bộ chọn lịch. Mặc định là hôm nay |
| Dropdown **Role** | Lọc theo vai trò nhân viên | Chọn: All Roles / Kitchen / Cashier / Server / Manager. Bảng cập nhật ngay |
| Dropdown **Status** | Lọc theo trạng thái nhiệm vụ | Chọn: All Status / Pending / In Progress / Completed / Overdue |
| Ô **Search** | Tìm nhanh theo tên nhân viên | Gõ một phần tên — bảng lọc tức thì không cần Enter |

> **Mẹo:** Tất cả bộ lọc hoạt động đồng thời. Ví dụ: chọn Role = "Kitchen" + Status = "Overdue" để xem ngay ai ở bếp đang bị trễ việc.

---

## Bước 3: Đọc bảng số liệu tổng quan (Zone D)

| Ô | Ý nghĩa | Màu sắc |
|---|---------|---------|
| **Total Tasks Today** | Tổng số nhiệm vụ được giao trong ngày đã chọn | Xám — trung tính |
| **Completed ✓** | Số nhiệm vụ đã hoàn thành | Xanh lá — tốt |
| **In Progress** | Số nhiệm vụ đang được thực hiện | Xanh dương — bình thường |
| **Overdue !** | Số nhiệm vụ đã quá giờ mà chưa hoàn thành | Đỏ — cần chú ý ngay |

> **Mẹo:** Nếu ô "Overdue !" có số > 0, cuộn xuống bảng Zone E — các dòng nhân viên liên quan sẽ được tô nền cam.

---

## Bước 4: Xem và quản lý từng nhân viên (Zone E, F)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone E — Bảng nhân viên | Một dòng = một nhân viên. Hiển thị: Tên · Vai trò · Được giao · Đã xong · Tỉ lệ % · Điểm ★ | Đọc tỉ lệ hoàn thành và điểm chất lượng để đánh giá nhanh hiệu suất |
| Nút **View Tasks** (xanh dương) | Mở rộng dòng để xem danh sách nhiệm vụ chi tiết | Nhấn một lần để mở (▼), nhấn lại thành "Hide Tasks" để đóng |
| Nút **Assign** (xanh lá) | Mở form tạo nhiệm vụ mới, tên nhân viên đó đã được chọn sẵn | Nhấn rồi điền tên nhiệm vụ + mức ưu tiên + giờ hết hạn |
| Zone F — Danh sách nhiệm vụ chi tiết | Hiện bên trong dòng đang mở: Tên nhiệm vụ · Mức ưu tiên · Khung giờ · Trạng thái · Ghi chú | Đọc từng dòng để biết tiến độ từng việc. Màu ưu tiên: đỏ = HIGH, vàng = MEDIUM, xám = LOW |

> **Lưu ý quan trọng:** Dòng nền cam = nhân viên đó có ít nhất một nhiệm vụ quá hạn. Ưu tiên nhấn **View Tasks** trên dòng đó trước.

---

## Bước 5: Tạo nhiệm vụ mới (Modal M1)

Form mở ra khi bạn nhấn "+ Add Task" hoặc "Assign":

| Trường | Bắt buộc | Hướng dẫn |
|--------|----------|-----------|
| **Staff Member** | ✅ | Chọn nhân viên từ danh sách. Nếu mở từ nút "Assign", tên đã chọn sẵn |
| **Task Name** | ✅ | Tên rõ ràng, ngắn gọn. Ví dụ: "Chuan bi bot banh cuon buoi sang" |
| **Description** | Không | Hướng dẫn thêm nếu cần. Nhân viên sẽ thấy khi xem nhiệm vụ |
| **Priority** | ✅ | High = việc khẩn / quan trọng · Medium = bình thường · Low = có thể làm sau |
| **Due Date & Time** | ✅ | Giờ hết hạn. Nếu để quá giờ mà chưa xong → tự động thành Overdue |
| **Notes** | Không | Ghi chú nội bộ (ví dụ: "Chua xong luc 8h") |

Nhấn **Create Task** (cam) để lưu. Nhấn **Cancel** hoặc dấu ✕ để hủy.

---

## Mẹo & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho quản lý |
|------------|---------------------|-------------------|
| Không có nhiệm vụ nào khớp bộ lọc | Zone E ẩn, Zone G hiện "No tasks found" | Thử chọn "All Roles" và "All Status", hoặc đổi ngày |
| Nhân viên có điểm chất lượng "★ —" | Nhân viên mới chưa có dữ liệu đánh giá | Bình thường với nhân viên vừa vào; điểm sẽ xuất hiện sau khi có nhiệm vụ hoàn thành được đánh giá |
| Dòng nhân viên nền cam | Có ít nhất 1 nhiệm vụ quá hạn | Nhấn View Tasks để xem nhiệm vụ nào bị trễ và liên hệ nhân viên |
| Tạo nhiệm vụ thất bại | Thông báo lỗi hiện phía dưới ô nhập hoặc dạng toast | Kiểm tra lại các trường bắt buộc (Staff Member, Task Name, Priority, Due Date & Time) |
| Muốn xem lịch sử ngày trước | Chọn ngày trong quá khứ ở ô Date | Bảng hiển thị đúng nhiệm vụ của ngày đó; số liệu KPI cũng cập nhật theo |

---

## Luồng chuẩn — Phân công nhiệm vụ buổi sáng

```
Mở trang Task Board
      │
      ▼
Chọn ngày hôm nay (mặc định)
      │
      ▼
Đọc Zone D — có Overdue không?
      ├── Có → nhấn View Tasks dòng cam → xử lý trước
      └── Không → tiếp tục
      │
      ▼
Duyệt Zone E — nhân viên nào chưa đủ việc?
      │
      ▼
Nhấn Assign → điền form → Create Task
      │
      ▼
Bảng tự cập nhật — số liệu Zone D tăng
```
