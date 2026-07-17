> Dành cho: Nhân viên phục vụ, bếp trưởng, quản lý tầng. Hướng dẫn thao tác thực tế tại quán.

---

# Hướng dẫn sử dụng: Trang Tổng Quan

Trang được thiết kế theo nguyên tắc **thấy ngay — làm ngay** — mọi thông tin cần thiết hiện trên một màn hình, cập nhật liên tục, không cần gọi điện hỏi thêm.

---

## Bước 1: Kiểm tra bức tranh tổng thể (Zone A — 4 ô thống kê)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Bàn đang phục vụ | Hiện số bàn đang có khách / tổng bàn | Nhìn nhanh khi quán đông — biết còn bàn trống không |
| Món chờ làm | Tổng số phần chưa bếp bắt đầu | Nếu con số này lớn → bếp đang bị tồn đơn |
| Món đang làm | Số phần bếp đang chế biến | Con số > 0 nghĩa là bếp đang hoạt động bình thường |
| Khẩn cấp / Cảnh báo | Số đơn quá 20 phút / 10–20 phút | **Ô đỏ = hành động ngay** — tìm bàn đó trong Zone B bên dưới |

---

## Bước 2: Xử lý hàng đợi bếp (Zone B — Danh sách cần chuẩn bị)

Mỗi bàn hiện thành một ô riêng. Màu đường viền cho biết ngay trạng thái:

| Màu viền | Trạng thái | Hành động |
|----------|-----------|-----------|
| Xám | Đang chờ — chưa bắt đầu | Nhấn **Bắt đầu làm** khi bếp sẵn sàng |
| Tím | VIP — đã xác nhận ưu tiên | Nhấn **Bắt đầu làm** — xử lý trước |
| Xanh lam | Đang làm | Nhấn **▼** → chọn **Sẵn sàng** khi xong |
| Xanh lá | Sẵn sàng mang ra | Nhân viên bàn nhấn **Đã giao** sau khi mang ra |
| **Đỏ + ⚠** | **Khẩn cấp — quá 20 phút** | Ưu tiên xử lý ngay, thông báo quản lý |

**Mẹo nhanh:** Nhấn **Expand ▾** trên ô bàn để xem chi tiết từng món và số lượng.

---

## Bước 3: Theo dõi tiến độ phục vụ (Zone C — Đang phục vụ)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Thanh "Tổng cần làm" | Tổng hợp tất cả món còn thiếu toàn quán | Nhìn qua để biết áp lực tổng thể |
| Danh sách món theo hàng | Từng loại món, bao nhiêu phần, bàn nào cần | Bếp dùng khi cần gom lô (ví dụ: làm Bánh Cuốn cho 3 bàn cùng lúc) |
| Thẻ bàn (tổng / ra / còn) | Mỗi bàn hiện tổng món đặt, đã mang ra, còn lại | Nhân viên bàn xem để biết bàn nào gần xong, chuẩn bị hóa đơn |

**Chú ý màu thẻ bàn:**
- Viền đỏ = bàn đã ngồi > 20 phút, chưa nhận đủ món → ưu tiên
- Viền tím = bàn VIP → hiện thêm tổng tiền

---

## Bước 4: Điều phối chỗ ngồi (Zone D — Bàn trống)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Lưới bàn trống | Hiện tất cả bàn chưa có khách, số chỗ ngồi | Nhân viên lễ tân dùng khi khách mới vào — biết ngay bàn nào phù hợp |
| Badge "Trống" | Xác nhận bàn sẵn sàng tiếp khách | Khi bàn có khách, tự động biến mất khỏi Zone D |

---

## Mẹo sử dụng & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho nhân viên |
|------------|---------------------|---------------------|
| Mất kết nối mạng | Banner đỏ hiện ở đầu trang: "Mất kết nối — dữ liệu có thể lỗi thời" | Tải lại trang — kết nối tự phục hồi sau vài giây |
| Đơn cũ >20 phút | Ô bàn chuyển viền đỏ + icon ⚠ tự động | Gặp quản lý tầng để xử lý — không tự ý huỷ đơn |
| Quán vắng, Zone B trống | Hiện thông báo "Chưa có đơn hàng — quán đang yên tĩnh" | Bình thường, không cần lo |
| Tất cả bàn đã có khách | Zone D hiện "Tất cả bàn đang có khách" | Thông báo khách mới vui lòng chờ hoặc xếp hàng |
| Cần đổi trạng thái nhưng không thấy nút | Kiểm tra màu ô — mỗi trạng thái chỉ hiện nút phù hợp | Ví dụ: ô "Sẵn sàng" chỉ có nút "Đã giao", không có "Bắt đầu làm" |

---

## Luồng chuẩn 5 bước

```
Khách đặt món
      ↓
[Đang chờ — Zone B, viền xám]
      ↓  Bếp nhấn "Bắt đầu làm"
[Đang làm — Zone B, viền xanh lam]
      ↓  Bếp nhấn "Sẵn sàng"
[Sẵn sàng — Zone B, viền xanh lá]
      ↓  Nhân viên nhấn "Đã giao"
[Zone C cập nhật: cột "ra" tăng, cột "còn" giảm]
      ↓  Khách trả tiền
[Bàn được giải phóng — hiện lại trong Zone D]
```
