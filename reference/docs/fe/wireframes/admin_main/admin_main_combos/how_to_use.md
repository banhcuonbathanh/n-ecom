> Dành cho: Quản trị viên, onboarding in-app, FAQ hỗ trợ.

---

# Hướng dẫn sử dụng: Trang Quản lý Combo

Mọi thao tác đều thực hiện tại chỗ — không cần chuyển trang, không popup rườm rà.

---

## Bước 1: Xem danh sách combo (Zone A, B, C)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone A — Thanh điều hướng | Chuyển giữa các mục quản trị | Nhấn tab "Combo" để vào trang này; tab được gạch chân màu cam khi đang active |
| Zone B — Tiêu đề trang | Hiển thị tổng số combo, nút thêm mới | Số trong ngoặc "(N)" cập nhật tự động theo danh sách thực tế |
| Zone C — Bảng combo | Xem toàn bộ combo hiện có | Mỗi hàng hiển thị: tên combo, các món trong combo (chip cam), giá combo, giá lẻ, mức tiết kiệm |

**Đọc thông tin trên bảng:**
- **Tên combo** — tên hiển thị cho khách hàng, kèm số sản phẩm và mức tiết kiệm tóm tắt
- **Sản phẩm** — mỗi sản phẩm là một chip cam hiển thị tên × số lượng (vd: "Bánh Cuốn Thập Cẩm ×2")
- **Giá combo** — giá hiện tại (đậm) và giá cũ (gạch ngang, màu xám)
- **Giá lẻ** — tổng giá nếu mua từng món riêng lẻ
- **Tiết kiệm** — badge đỏ hiển thị số tiền khách tiết kiệm khi mua combo

---

## Bước 2: Thêm combo mới (Zone B → D)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone B — Nút "+ Thêm combo" | Mở form thêm mới | Nhấn nút cam góc phải để mở modal |
| Zone D — Form Thêm combo | Nhập thông tin combo mới | Điền lần lượt: tên → mô tả (tuỳ chọn) → chọn sản phẩm → nhập giá |

**Chi tiết từng trường trong form:**

1. **Tên combo** (bắt buộc) — nhập tên sẽ hiển thị cho khách (vd: "Combo Gia Đình")
2. **Mô tả** (tuỳ chọn) — mô tả ngắn về combo, không bắt buộc
3. **Sản phẩm trong combo** (bắt buộc, tối thiểu 2 sản phẩm):
   - Gõ tên vào ô tìm kiếm để lọc sản phẩm
   - Nhấn sản phẩm để thêm vào combo
   - Dùng nút **−** và **+** để điều chỉnh số lượng từng sản phẩm
4. **Giá combo** (bắt buộc) — nhập giá bán combo (bằng số, đơn vị đồng)
   - Hệ thống tự tính và hiển thị mức tiết kiệm ngay bên dưới: "✓ Tiết kiệm X ₫ so với giá lẻ"

Nhấn **Lưu combo** để hoàn tất. Danh sách cập nhật ngay lập tức.

---

## Bước 3: Sửa combo (Zone C → D)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone C — Nút "Sửa" | Mở form chỉnh sửa | Nhấn nút "Sửa" ở hàng combo cần thay đổi |
| Zone D — Form Sửa combo | Cập nhật thông tin combo | Form tự điền sẵn thông tin hiện tại; chỉnh sửa trường cần thay đổi rồi nhấn "Lưu combo" |

Form sửa giống hệt form thêm mới, nhưng tất cả trường đã được điền sẵn. Chỉ cần thay đổi phần cần cập nhật.

---

## Bước 4: Xóa combo (Zone C — chỉ Quản trị viên)

| Vùng | Chức năng | Cách dùng |
|------|-----------|-----------|
| Zone C — Nút "Xóa" | Xóa combo khỏi hệ thống | Nút chỉ hiển thị với tài khoản Quản trị viên |

Nhấn "Xóa" → xác nhận trong hộp thoại → combo bị xóa vĩnh viễn. Thao tác không thể hoàn tác.

---

## Mẹo & Hỗ trợ đặc biệt

| Tình huống | Cách hệ thống xử lý | Gợi ý cho người dùng |
|------------|--------------------|-----------------------|
| Chưa có combo nào | Hiển thị thông báo trống kèm hướng dẫn | Nhấn "+ Thêm combo" để tạo combo đầu tiên |
| Tìm sản phẩm không ra | Hiển thị "Không tìm thấy sản phẩm phù hợp" | Kiểm tra chính tả hoặc tìm bằng tên khác |
| Chọn ít hơn 2 sản phẩm | Nút "Lưu combo" bị vô hiệu hoá | Thêm ít nhất 2 sản phẩm để kích hoạt nút lưu |
| Giá combo ≥ tổng giá lẻ | Không hiển thị mức tiết kiệm | Điều chỉnh giá combo thấp hơn tổng giá lẻ nếu muốn khuyến mãi |
| Lỗi mạng khi lưu | Hiện thông báo lỗi, giữ nguyên form | Kiểm tra kết nối rồi thử lại, dữ liệu đã nhập không bị mất |
| Tài khoản không phải Admin | Nút "Xóa" không hiển thị | Liên hệ Quản trị viên để xóa combo |

---

## Luồng chuẩn thêm combo 4 bước

```
[+ Thêm combo]
      ↓
[Đặt tên + mô tả (tuỳ chọn)]
      ↓
[Chọn ≥ 2 sản phẩm + số lượng]
      ↓
[Nhập giá combo → xem mức tiết kiệm]
      ↓
[Lưu combo] → Danh sách cập nhật ngay
```

---

*Cập nhật: 2026-05-26*
