# 🔄 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## Quy Trình Quản Lý Thay Đổi (Change Request Process)
> **Version:** v1.0 · Tháng 4/2026
> **Mục đích:** Kiểm soát mọi yêu cầu thay đổi sau khi SRS đã được duyệt — tránh scope creep.

---

## 1. Tại Sao Cần Quy Trình CR?

Thực tế cho thấy khách hàng (hoặc nội bộ team) luôn có thay đổi yêu cầu trong quá trình phát triển. Không có quy trình kiểm soát dẫn đến:

- "Thêm nhỏ thôi" tích lũy → scope creep → overrun timeline
- Developer làm theo yêu cầu miệng → không có bằng chứng → tranh cãi sau
- Thay đổi ảnh hưởng module khác mà không ai biết → bug production

> **Nguyên tắc vàng:** Mọi thay đổi yêu cầu sau khi SRS được duyệt đều PHẢI đi qua quy trình CR — không có ngoại lệ, kể cả thay đổi "nhỏ".

---

## 2. Phân Loại Thay Đổi

| Loại | Ví Dụ Cụ Thể | Thời Gian Đánh Giá | Cần Điều Chỉnh Timeline? |
|---|---|---|---|
| **Minor** | Đổi nhãn button, đổi thứ tự field hiển thị, sửa văn bản thông báo lỗi | < 4 giờ | Không — absorb vào sprint hiện tại |
| **Medium** | Thêm 1 field vào form, thêm filter option, thêm 1 endpoint báo cáo đơn giản, đổi validation rule | 1–2 ngày | Có thể — Tech Lead quyết định |
| **Major** | Thêm module mới (VD: loyalty points), đổi luồng nghiệp vụ chính (VD: thêm bước approve đơn), tích hợp hệ thống thứ 3 mới | 3–5 ngày | Bắt buộc — KH phải duyệt sau báo cáo impact |

---

## 3. Quy Trình 6 Bước

```
[Yêu cầu thay đổi phát sinh]
        ↓
Bước 1: Lập Phiếu CR (KH hoặc BA)
        ↓
Bước 2: Đánh Giá Impact (Tech Lead + BA)
        ↓
Bước 3: Phân Loại (Tech Lead)
        ↓
Bước 4: Phê Duyệt (theo cấp)
        ↓
Bước 5: Cập Nhật Tài Liệu (BA + TL)
        ↓
Bước 6: Theo Dõi & Đóng CR (PM + QA)
```

### Bước 1 — Lập Phiếu CR

| Người Thực Hiện | Khách hàng hoặc BA |
|---|---|
| **Output** | Phiếu CR hoàn chỉnh theo §4 (Template) |
| **Lưu tại** | `docs/cr/CR-YYYY-NNN.md` (ví dụ: `docs/cr/CR-2026-001.md`) — tạo thư mục `docs/cr/` nếu chưa có |
| **Kênh gửi** | Email → BA → tạo ticket trong hệ thống theo dõi |

---

### Bước 2 — Đánh Giá Impact

| Người Thực Hiện | Tech Lead + BA |
|---|---|
| **Thời gian** | Minor: ngay hôm đó · Medium: 1 ngày · Major: 2–3 ngày |
| **Output** | Báo cáo impact bao gồm: |

**Nội dung báo cáo impact:**
- Công sức ước tính (giờ/ngày)
- Module nào bị ảnh hưởng (BE / FE / DB / DevOps)
- Sprint nào bị dời hoặc ảnh hưởng
- Chi phí phát sinh (nếu áp dụng)
- Rủi ro kỹ thuật
- Phương án thực hiện (nếu có nhiều cách)

---

### Bước 3 — Phân Loại

Tech Lead phân loại CR theo bảng §2 và gán mức độ ưu tiên:

| Mức Ưu Tiên | Định Nghĩa |
|---|---|
| **Critical** | Chặn Go-Live hoặc mất doanh thu ngay lập tức |
| **High** | Ảnh hưởng nghiệp vụ quan trọng — cần xử lý trong sprint hiện tại |
| **Medium** | Quan trọng nhưng có workaround — có thể lùi sang sprint tiếp |
| **Low** | Nice-to-have — backlog |

---

### Bước 4 — Phê Duyệt

| Loại CR | Người Phê Duyệt |
|---|---|
| **Minor** | Tech Lead tự quyết — không cần họp |
| **Medium** | Manager/PM duyệt sau khi xem báo cáo impact |
| **Major** | Khách hàng ký duyệt sau khi nhận báo cáo impact đầy đủ |

**Kết quả phê duyệt:**

| Trạng Thái | Ý Nghĩa | Hành Động |
|---|---|---|
| **Approved** | CR được chấp nhận — thực hiện theo plan | Chuyển sang Bước 5 |
| **Rejected** | CR bị từ chối — không thực hiện | Đóng CR, ghi lý do |
| **Deferred** | Hoãn sang phase/sprint sau | Đưa vào backlog, ghi sprint mục tiêu |
| **Pending Info** | Cần thêm thông tin từ người yêu cầu | Trả lại người lập phiếu |

---

### Bước 5 — Cập Nhật Tài Liệu

Sau khi CR được **Approved**, BA và Tech Lead bắt buộc cập nhật:

| Tài Liệu | Cập Nhật Gì |
|---|---|
| SRS / Spec file liên quan | Thêm/sửa requirement theo CR |
| API Contract | Thêm/sửa endpoint, request/response schema |
| DB Schema | Thêm column/table nếu cần — tạo migration mới |
| TASKS.md | Thêm task mới vào đúng phase |
| Backlog (Jira/Trello) | Thêm story/ticket cho CR |

> **Lưu ý:** KHÔNG bắt đầu code trước khi tài liệu được cập nhật và team được thông báo.

---

### Bước 6 — Theo Dõi & Đóng CR

| Người Thực Hiện | Manager/PM + QA |
|---|---|
| **Theo dõi** | CR ticket trong hệ thống tracking, cập nhật % hoàn thành |
| **Verify** | QA kiểm tra Acceptance Criteria của CR được pass |
| **Đóng CR** | Update CR status = Closed, ghi ngày hoàn thành |

---

## 4. Template Phiếu Change Request

> Sao chép template này, đặt tên file `CR-YYYY-NNN.md` trong thư mục `docs/cr/`.

```markdown
# CR-2026-001 — [Tiêu đề ngắn gọn]

| Field              | Nội Dung |
|---|---|
| **Mã CR**          | CR-2026-001 |
| **Ngày yêu cầu**   | DD/MM/YYYY |
| **Người yêu cầu**  | Tên · Vai trò · Email |
| **Loại**           | Minor / Medium / Major |
| **Mức ưu tiên**    | Critical / High / Medium / Low |
| **Trạng thái**     | Draft / Approved / Rejected / Deferred / Closed |
| **Người phê duyệt**| Tên · Ngày duyệt |

## Mô Tả Thay Đổi

**Hiện tại hệ thống đang làm gì?**
> [Mô tả hành vi hiện tại]

**Cần thay đổi thành gì?**
> [Mô tả hành vi mong muốn]

**Tại sao cần thay đổi?**
> [Lý do kinh doanh hoặc kỹ thuật]

## Phạm Vi Ảnh Hưởng

| Thành Phần | Bị Ảnh Hưởng? | Chi Tiết |
|---|---|---|
| Backend (API) | ✅ / ❌ | Endpoint nào, logic gì |
| Frontend (UI) | ✅ / ❌ | Trang nào, component gì |
| Database | ✅ / ❌ | Table/column nào, migration cần không |
| DevOps/Infra | ✅ / ❌ | Config, env var, deployment |
| Tài liệu | ✅ / ❌ | SRS, API Spec, Schema doc |

## Báo Cáo Impact (do Tech Lead điền)

- **Công sức ước tính:** ___ giờ / ___ ngày
- **Sprint bị ảnh hưởng:** Sprint ___
- **Timeline delay:** Có / Không — ___ ngày
- **Rủi ro:** [Liệt kê rủi ro nếu có]

## Tiêu Chí Chấp Nhận (AC)

- [ ] [AC-1: Mô tả kịch bản pass/fail]
- [ ] [AC-2: ...]

## Deadline Mong Muốn

> DD/MM/YYYY — Lý do: [Campaign, event, v.v.]

## Lịch Sử Thay Đổi

| Ngày | Người | Hành Động |
|---|---|---|
| DD/MM/YYYY | BA | Tạo phiếu CR |
| DD/MM/YYYY | Tech Lead | Đánh giá impact |
| DD/MM/YYYY | PM/KH | Phê duyệt |
| DD/MM/YYYY | QA | Đóng CR |
```

---

## 5. Quy Tắc Vàng

| # | Quy Tắc |
|---|---|
| 1 | **Không code không có CR** — Mọi thay đổi sau SRS đều phải có phiếu CR được duyệt |
| 2 | **Không verbal request** — Yêu cầu miệng không được tính — phải lập phiếu |
| 3 | **Cập nhật tài liệu trước khi code** — Code theo tài liệu đã cập nhật, không theo ký ức |
| 4 | **Một CR một phạm vi** — Không gom nhiều thay đổi không liên quan vào 1 CR |
| 5 | **Thông báo toàn team** — Sau khi CR approved, BA thông báo tất cả team liên quan ngay |

---

## 6. Hệ Thống Tracking CR

| Công Cụ | Cách Dùng |
|---|---|
| File Markdown | `docs/cr/CR-YYYY-NNN.md` — nguồn gốc, chi tiết đầy đủ |
| TASKS.md | Thêm task CR vào đúng phase — theo dõi tiến độ (không dùng Jira/Trello nếu chưa có) |
| Git commit | Mỗi commit liên quan CR phải có reference `[CR-2026-001]` trong commit message |

---

> 🍜 BanhCuon System · CR Process v1.0 · Tháng 4/2026
