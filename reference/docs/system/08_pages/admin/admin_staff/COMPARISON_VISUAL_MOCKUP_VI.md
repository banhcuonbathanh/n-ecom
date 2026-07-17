# So Sánh Trực Quan Theo Zone — `/admin/staff` (Quản lý nhân viên)

> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — cần `docker compose up -d --build fe` + Playwright (stack
> chưa được xác nhận chạy trong phiên này). Phần ② code-render-thật bên dưới được dựng **từ code**
> (`page.tsx` + các component con), không phải từ ảnh. Cột 📷 để `⏳ chưa chụp`.
>
> **Lưu ý:** đây là trang HIẾM có **drift trực quan thật** — wireframe ASCII trong `admin_staff.md` vẽ
> hai zone (B StatsBar, D nút hành động) khác với render thực. Đó là 2 zone đáng vẽ. Các zone còn lại
> (A header, C filter, E pagination, M1/M2 modal) khớp tài liệu → bỏ qua. Cột 💬 để trống cho chủ sở
> hữu điền. Nhánh: `experience_claude.md_system_1_test_iphon2_change_code`.

---

## 🟡 Zone B — `StaffStatsBar`
Nguồn code: `StaffStatsBar.tsx:30-50`

### ① Doc đang vẽ (`admin_staff.md:21`)
```
B  ┌Tổng: 12┐ ┌Admin: 1┐ ┌Cashier: 4┐ ┌Chef: 5┐ ┌Inactive: 2┐     ← 5 thẻ, mỗi role 1 thẻ
```

### ② Code render THẬT
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐
│Tổng nhân viên│ │Đang hoạt động│ │ Vô hiệu hóa  │ │ Theo vai trò           │  ◀── 4 thẻ (grid-cols-4)
│      12      │ │   10 [Đang HĐ]│ │  2 [Vô hiệu] │ │ 12                     │      StaffStatsBar.tsx:31
│              │ │   (badge xanh)│ │  (badge đỏ)  │ │ Bếp:5 · Thu ngân:4 ·   │  ◀── role breakdown KHÔNG
└──────────────┘ └──────────────┘ └──────────────┘ │ Admin:1 · ... (subLabel)│      phải thẻ riêng — gộp
                                                     └────────────────────────┘      vào subLabel thẻ #4
                                                                                      (StaffStatsBar.tsx:26-28,45-49)
```

### ③ Đề xuất sửa doc
```
Vẽ lại Zone B thành 4 thẻ KPICard:
  [Tổng nhân viên: N]  [Đang hoạt động: N (badge)]  [Vô hiệu hóa: N (badge)]  [Theo vai trò: chuỗi]
FLAG 🟡 (chỉ sửa doc): không có thẻ riêng cho từng role; breakdown là subLabel "Bếp:N · Thu ngân:N · …".
  KHÔNG có lỗi code — chỉ wireframe vẽ sai số thẻ.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** đếm thẻ StatsBar = 4 (không phải 5); thẻ #4 "Theo vai trò" có sub-label breakdown |  |

---

## 🟡 Zone D — `StaffTable` (cột hành động)
Nguồn code: `StaffTable.tsx:117-159`

### ① Doc đang vẽ (`admin_staff.md:25-29`)
```
D  │ Họ tên      Username  Vai trò   Trạng thái   Hành động   │
   │ Ng. Văn A   chef01    chef      ● active   [👁][✎][⏻][🗑]│   ← 4 icon emoji nhóm lại 1 cột
   │ Tr. Thị B   cash02    cashier   ○ inactive [👁][✎][⏻][🗑]│
```

### ② Code render THẬT
```
│ ... │ Hiệu suất        │ Trạng thái        │ Hành động                       │
│ ... │ ▓▓░░░░ 0%        │ [Đang HĐ] (nút)   │ [Chi tiết] [Sửa] [Xóa]          │
│     │ ◀── progress bar │ ◀── toggle là CỘT │ ◀── nút TEXT, không emoji        │
│     │ performance_score│    RIÊNG (xanh/đỏ),│    (StaffTable.tsx:138-157);     │
│     │ luôn 0 từ BE     │    disabled cho self│    [Xóa] chỉ hiện nếu canDelete  │
│     │ (:119-120)       │    (:124-134, :126) │    (:150)                        │
```
Bố cục cột thật (từ trái): Họ tên · Username · Vai trò · **Hiệu suất** · Trạng thái(toggle) · Hành động.
Toggle trạng thái và 3 nút Chi tiết/Sửa/Xóa nằm ở **hai cột khác nhau**, không phải 1 nhóm 4 icon.

### ③ Đề xuất sửa doc
```
Vẽ lại Zone D:
  • thêm cột "Hiệu suất" (progress bar + N%) — hiện luôn 0% (stub BE, Flag 8)
  • "Trạng thái" là NÚT toggle [Đang HĐ]/[Vô hiệu] (disabled cho chính mình), cột riêng
  • "Hành động" = nút TEXT [Chi tiết] [Sửa] [Xóa] — [Xóa] ẩn theo canDelete (manager/self/role≥caller)
FLAG 🟡 (chỉ sửa doc): emoji 👁✎⏻🗑 chỉ là tốc ký; code dùng nút chữ. KHÔNG có lỗi code.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** hàng staff hiện cột Hiệu suất 0% + toggle riêng + 3 nút text; dòng admin cuối ẩn nút Xóa |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| B — `StaffStatsBar` | Vẽ lại ASCII thành 4 thẻ (thẻ cuối "Theo vai trò" + sub-label) | Không cần |
| D — `StaffTable` | Vẽ lại ASCII: thêm cột Hiệu suất; toggle cột riêng; nút text thay emoji | Không cần (drift wireframe). Riêng `StaffDetailDrawer` thiếu nhánh `isError` → task code, xem EN action #5 |
