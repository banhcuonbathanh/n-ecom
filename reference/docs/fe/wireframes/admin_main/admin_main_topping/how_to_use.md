> Dành cho: Quản trị viên, Quản lý — onboarding in-app, FAQ hỗ trợ.

---

# Hướng dẫn sử dụng: Trang Topping

Trang Topping được thiết kế theo nguyên tắc **thao tác tại chỗ** — mọi việc thêm, sửa, xóa đều diễn ra ngay trên trang, không cần chuyển màn hình.

---

## Bước 1: Xem danh sách topping (Zone A, B, C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone A — Thanh điều hướng | Chuyển giữa các trang quản trị | Tab "Topping" đang được chọn (màu cam). Nhấn tab khác để đến trang khác |
| Zone B — Tiêu đề trang | Hiển thị tên trang, số lượng topping và nút thêm mới | Số trong ô cam (ví dụ: 23) là tổng số topping hiện có |
| Zone C — Bảng topping | Xem toàn bộ danh sách topping | Cuộn xuống để xem thêm. Mỗi hàng có: tên, sản phẩm áp dụng, giá thêm, trạng thái, và thao tác |

**Ý nghĩa từng cột trong bảng:**

| Cột | Ý nghĩa |
|-----|---------|
| Tên topping | Tên hiển thị trên menu khách hàng (Chả quế, Hành phi, Tôm tươi...) |
| Áp dụng cho sản phẩm | Sản phẩm nào đang dùng topping này. "Chưa gắn sản phẩm" = chưa liên kết với món nào |
| Giá thêm | "+N.000đ" là giá cộng thêm khi khách chọn. "Miễn phí" = không tính thêm tiền |
| Trạng thái | "Có sẵn" (xanh) = khách thấy và chọn được. "Hết" = ẩn khỏi menu khách |
| Thao tác | [Sửa] để chỉnh, [×] để xóa topping đó |

---

## Bước 2: Thêm topping mới (Zone B → Zone D)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone B — Nút "+ Thêm topping" | Mở form thêm mới | Nhấn nút cam ở góc phải tiêu đề trang |
| Zone D — Form thêm topping | Điền thông tin topping mới | Điền tên, giá thêm, chọn trạng thái rồi nhấn "Lưu topping" |

**Các trường trong form:**

| Trường | Mô tả | Lưu ý |
|--------|-------|-------|
| Tên topping * | Tên hiển thị trên menu | Bắt buộc. Ví dụ: "Chả quế", "Hành phi" |
| Giá thêm (đ) | Số tiền cộng thêm vào hóa đơn | Để 0 nếu miễn phí. Không điền số âm |
| Trạng thái | Công tắc "Có sẵn" / "Hết" | Bật = khách thấy topping này trên menu |

Sau khi nhấn **"Lưu topping"**, danh sách cập nhật ngay và form đóng lại.  
Nhấn **"Hủy"** để thoát mà không lưu.

---

## Bước 3: Sửa topping đã có (Zone C → Zone D)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone C — Nút [Sửa] | Mở form chỉnh sửa | Nhấn nút [Sửa] màu xanh ở cuối hàng topping muốn sửa |
| Zone D — Form sửa topping | Thay đổi thông tin | Form tự điền sẵn thông tin hiện tại. Chỉnh rồi nhấn "Lưu topping" |

Form sửa hoạt động giống form thêm mới — tên tiêu đề đổi thành "Sửa topping" để phân biệt.

---

## Bước 4: Xóa topping (Zone C)

Nhấn nút **[×]** màu đỏ ở cuối hàng topping muốn xóa.  
Hệ thống sẽ hỏi xác nhận trước khi xóa.

> ⚠️ Nếu topping đang được gắn với một hoặc nhiều sản phẩm, hệ thống sẽ thông báo trước. Xác nhận tiếp tục để gỡ liên kết và xóa.

---

## Mẹo & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho bạn |
|------------|---------------------|--------------|
| Topping hết nguyên liệu tạm thời | Tắt công tắc "Trạng thái" trong form Sửa → topping ẩn khỏi menu khách | Không cần xóa — bật lại khi có hàng |
| Topping miễn phí | Để giá thêm = 0; hệ thống hiển thị "Miễn phí" (chữ xanh) thay vì "+0đ" | Phù hợp cho gia vị đi kèm như hành phi, mắm tôm |
| Tên topping trùng | Hệ thống báo lỗi "Tên topping đã tồn tại" ngay trong form | Chọn tên khác hoặc kiểm tra xem topping đó đã có chưa |
| Lỗi mạng khi tải trang | Hệ thống hiển thị thông báo lỗi và nút "Thử lại" | Kiểm tra kết nối rồi tải lại |
| Không thấy topping trên menu khách | Kiểm tra cột Trạng thái — có thể đang ở trạng thái "Hết" | Bật công tắc "Có sẵn" trong form Sửa |
| Muốn gắn topping với sản phẩm | Thao tác này thực hiện ở trang **Sản phẩm**, không phải trang Topping | Vào tab "Sản phẩm" → Sửa sản phẩm → chọn topping trong form |

---

## Luồng chuẩn — Thêm topping mới

```
Mở trang Topping
       ↓
Nhấn "+ Thêm topping" (Zone B)
       ↓
Điền tên + giá + trạng thái (Zone D)
       ↓
Nhấn "Lưu topping"
       ↓
Bảng cập nhật tức thì (Zone C)
       ↓
Topping sẵn sàng để gắn vào sản phẩm (từ trang Sản phẩm)
```
