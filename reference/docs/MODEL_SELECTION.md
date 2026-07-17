# MODEL_SELECTION.md — Khi nào dùng model nào

> One fact, one home. Tiêu chí chọn model để **tiết kiệm chi phí** mà không mất chất lượng.
> Referenced từ `CLAUDE.md`. Đọc trước khi quyết định tự làm hay spawn sub-agent.

---

## Nguyên tắc gốc

Phiên làm việc chính chạy bằng **Opus 4.8** (driver) — mạnh nhất nhưng đắt nhất.
Để tiết kiệm: **giao việc thường (normal) cho sub-agent Sonnet 4.6**, chỉ giữ Opus 4.8 cho việc khó (difficult).

```
Việc thường  → spawn sub-agent  model: "sonnet"   (4.6)
Việc khó     → tự làm bằng driver Opus 4.8 (KHÔNG spawn)
Việc cơ học lặp lại, khối lượng lớn → có thể "haiku" nếu chỉ là tra cứu/liệt kê
```

Quy tắc vàng: **khi phân vân giữa hai mức → chọn mức rẻ hơn trước.** Nếu sub-agent Sonnet trả về kết quả không đạt, lúc đó mới nâng lên Opus.

---

## Dùng Sonnet 4.6 (spawn sub-agent) khi việc là "normal"

Đặc điểm: yêu cầu rõ ràng, ít phán đoán, dễ kiểm tra đúng/sai.

- Sửa cơ học, boilerplate, đổi tên, format
- Cập nhật/đồng bộ tài liệu theo mẫu có sẵn
- Tìm kiếm, dò code, khám phá codebase (dùng agent `Explore`)
- Viết test từ spec/AC đã rõ
- Thay đổi 1–2 file với **1 AC rõ ràng** (đúng "task fits 1 session" trong CLAUDE.md)
- Scaffold wireframe, việc lặp lại nhiều bước giống nhau
- Tổng hợp/tóm tắt nội dung đã có

## Dùng Opus 4.8 (driver, KHÔNG delegate) khi việc là "difficult"

Đặc điểm: cần phán đoán, ảnh hưởng chéo, rủi ro cao, yêu cầu mơ hồ.

- Quyết định kiến trúc, thiết kế giải pháp, lập kế hoạch (PLAN/ALIGN)
- Refactor đa file có ảnh hưởng cross-cutting (3+ file, 3+ scenario)
- Debug lỗi tinh vi, lỗi không rõ nguyên nhân
- Diễn giải spec / yêu cầu mơ hồ → cần `❓ CLARIFY`
- Code nhạy cảm: auth, payment, RBAC, business rules
- Bất kỳ bước nào cần đánh giá theo 7-step (đặc biệt ALIGN + SELF-REVIEW)
- Review chất lượng / quyết định cuối cùng trên kết quả của sub-agent

---

## Bảng quyết định nhanh

| Tín hiệu của task | Model |
|---|---|
| 1–2 file · 1 AC rõ · ít phán đoán | **Sonnet 4.6** (spawn) |
| Tìm kiếm / dò code / liệt kê | **Sonnet 4.6** (Explore) hoặc Haiku nếu thuần tra cứu |
| Doc update theo mẫu | **Sonnet 4.6** (spawn) |
| 3+ file HOẶC 3+ scenario | **Opus 4.8** (tự làm) |
| Auth / payment / RBAC / business rules | **Opus 4.8** (tự làm) |
| Yêu cầu mơ hồ, cần CLARIFY | **Opus 4.8** (tự làm) |
| Kiến trúc / kế hoạch / review cuối | **Opus 4.8** (tự làm) |

---

## Cách spawn sub-agent Sonnet 4.6

Dùng tool `Agent` với tham số `model: "sonnet"`:

- `subagent_type: "Explore"` — tìm kiếm/dò code read-only.
- `subagent_type: "general-purpose"` — task nhiều bước, được sửa file.
- `subagent_type: "claude"` — catch-all khi không khớp loại cụ thể.

Lưu ý quan trọng:
- Sub-agent **bắt đầu từ context trống** — viết prompt đầy đủ: mục tiêu, file liên quan, AC, ràng buộc (đặc biệt các rule CLAUDE.md áp dụng).
- **Không spawn nếu tự làm nhanh hơn.** Spawn tốn chi phí khởi động; chỉ spawn khi việc đủ lớn/độc lập hoặc user yêu cầu.
- Driver (Opus 4.8) luôn **review kết quả** sub-agent trước khi coi là DONE.

---

## Không spawn khi

- Việc chỉ vài dòng, tự làm xong ngay.
- Việc cần quyết định mà chỉ driver có đủ context.
- Đang ở bước ALIGN/SELF-REVIEW của 7-step — đó là việc của driver.
