# Menu Thực Tế — Quán Bánh Cuốn

> **Nguồn gốc:** Tài liệu này là menu thực tế của quán, dùng làm căn cứ cho seed data và FE hiển thị.
> **Seed file:** `scripts/seed_real_menu.sql`

---

## 1. Nhân (Fillings)

Mỗi loại bánh đều có thể chọn **một trong hai loại nhân**. Nhân không tính thêm phí.

| Nhân | Ghi chú |
|---|---|
| Nhân thịt | Thịt heo xay trộn hành phi |
| Nhân thịt mộc nhĩ | Mộc nhĩ (nấm tai mèo) băm nhỏ — chay |

---

## 2. Thực Đơn Bánh

Khách chọn **bánh gì** + **nhân gì** → mỗi bánh là 1 dòng order_item độc lập.

| # | Tên | Đơn giá | Ghi chú |
|---|---|---|---|
| 1 | Giò | 9,000 ₫ | Giò lụa / chả lụa cắt khoanh, ăn kèm bánh |
| 2 | Bánh Trứng Tái | 9,000 ₫ | Trứng lòng đào (half-cooked) |
| 3 | Bánh Trứng Chín | 9,000 ₫ | Trứng chín hoàn toàn |
| 4 | Bánh Trứng Vàng | 9,000 ₫ | Trứng chiên vàng |
| 5 | Bánh Cuốn | 4,000 ₫ | Bánh cuốn thuần, cuộn nhân |

---

## 3. Canh

Mỗi suất / mỗi bàn ăn bánh đều **kèm theo canh** (không tính thêm tiền).
Khách có thể yêu cầu thêm **rau mùi tàu** vào canh (miễn phí).

| Món | Giá | Ghi chú |
|---|---|---|
| Canh | 0 ₫ | Kèm theo, không tính tiền riêng |
| Rau mùi tàu | 0 ₫ | Topping cho canh, miễn phí |

---

## 4. Suất / Combo

Suất là gói đặt sẵn tiện lợi. Giá = tổng các món thành phần (không chiết khấu — điều chỉnh nếu cần).

| # | Tên Suất | Gồm có | Giá |
|---|---|---|---|
| 1 | Suất Đầy Đủ Trứng Chín | 1× Bánh Trứng Chín + 1× Giò + 3× Bánh Cuốn + 1× Canh | 30,000 ₫ |
| 2 | Suất Đầy Đủ Trứng Tái | 1× Bánh Trứng Tái + 1× Giò + 3× Bánh Cuốn + 1× Canh | 30,000 ₫ |
| 3 | Suất Giò | 1× Giò + 3× Bánh Cuốn + 1× Canh | 21,000 ₫ |
| 4 | Suất Trứng Bánh Không | 1× Bánh Trứng Vàng + 3× Bánh Cuốn (không nhân) + 1× Canh | 21,000 ₫ |
| 5 | Bánh Chay | 3× Bánh Cuốn (nhân mộc nhĩ) + 1× Canh | 12,000 ₫ |

> **Lưu ý Bánh Chay:** Nhân thịt mộc nhĩ → không có thịt. Toppings chọn nhân sẽ bị ẩn hoặc chỉ hiện nhân mộc nhĩ trên FE.
> **Lưu ý Suất Trứng Bánh Không:** Bánh cuốn trong suất này không được chọn nhân (combo_items fixed, nhân chọn khi order standalone).

---

## 5. Quy Tắc Đặt Hàng

| Quy tắc | Chi tiết |
|---|---|
| Chọn nhân | Áp dụng cho tất cả 5 loại bánh — nhân thịt hoặc nhân mộc nhĩ |
| Canh | Kèm tự động với mỗi suất. Nếu gọi lẻ thì thêm canh riêng |
| Rau mùi tàu | Topping của canh, khách tự chọn thêm |
| Bánh chay | Nhân thịt mộc nhĩ, không dùng thịt |
| Suất vs lẻ | Khách có thể gọi lẻ từng bánh hoặc chọn suất |

---

## 6. ID Tham Chiếu (Seed Data)

> Dùng để tra nhanh khi debug hoặc viết test.

### Categories
| ID | Tên |
|---|---|
| `aaaaaaaa-aaaa-aaaa-aaaa-000000000001` | Bánh Cuốn |
| `aaaaaaaa-aaaa-aaaa-aaaa-000000000002` | Canh |
| `aaaaaaaa-aaaa-aaaa-aaaa-000000000003` | Suất / Combo |

### Toppings (Nhân)
| ID | Tên |
|---|---|
| `bbbbbbbb-bbbb-bbbb-bbbb-000000000001` | Nhân thịt |
| `bbbbbbbb-bbbb-bbbb-bbbb-000000000002` | Nhân thịt mộc nhĩ |
| `bbbbbbbb-bbbb-bbbb-bbbb-000000000003` | Rau mùi tàu |

### Products (Bánh)
| ID | Tên | Giá |
|---|---|---|
| `cccccccc-cccc-cccc-cccc-000000000001` | Giò | 9,000 |
| `cccccccc-cccc-cccc-cccc-000000000002` | Bánh Trứng Tái | 9,000 |
| `cccccccc-cccc-cccc-cccc-000000000003` | Bánh Trứng Chín | 9,000 |
| `cccccccc-cccc-cccc-cccc-000000000004` | Bánh Trứng Vàng | 9,000 |
| `cccccccc-cccc-cccc-cccc-000000000005` | Bánh Cuốn | 4,000 |
| `cccccccc-cccc-cccc-cccc-000000000006` | Canh | 0 |

### Combos (Suất)
| ID | Tên | Giá |
|---|---|---|
| `dddddddd-dddd-dddd-dddd-000000000001` | Suất Đầy Đủ Trứng Chín | 30,000 |
| `dddddddd-dddd-dddd-dddd-000000000002` | Suất Đầy Đủ Trứng Tái | 30,000 |
| `dddddddd-dddd-dddd-dddd-000000000003` | Suất Giò | 21,000 |
| `dddddddd-dddd-dddd-dddd-000000000004` | Suất Trứng Bánh Không | 21,000 |
| `dddddddd-dddd-dddd-dddd-000000000005` | Bánh Chay | 12,000 |
