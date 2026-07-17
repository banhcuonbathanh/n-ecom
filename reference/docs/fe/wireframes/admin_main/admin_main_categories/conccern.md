> Scratchpad: open questions, risks, undecided items for Admin — Categories.

---

## Open Questions

- [ ] **Delete confirmation modal**: Excalidraw không có modal xác nhận khi nhấn "Xóa". Hỏi owner: nên dùng confirm dialog (recommended cho destructive action) hay xóa thẳng + undo toast?
- [ ] **Sort order uniqueness**: Có bắt buộc `sort_order` là duy nhất không? Nếu 2 danh mục cùng thứ tự, server xử lý thế nào (reject hay allow)? Cần kiểm tra API spec.
- [ ] **Pagination**: Chưa có pagination trong excalidraw. Nếu danh mục > 50 hàng, có cần phân trang? Hay chủ quán sẽ không bao giờ có nhiều danh mục đến vậy?
- [ ] **AdminTopNav shared component**: Component này đã có sẵn từ các trang admin khác chưa, hay cần tạo mới? Kiểm tra `src/components/shared/` trước khi code.
- [ ] **Category name character limit**: Không rõ max length cho `name` field — API có validate không, hay chỉ validate FE? Cần confirm để đặt Zod `.max()` phù hợp.

## Risks

- Xóa danh mục có sản phẩm — API trả 409 hoặc 422. FE cần handle đúng error code và hiển thị thông báo rõ ràng, tránh silent fail hoặc xóa nhầm row khỏi UI (optimistic delete).
- Sort order không được validate unique trên excalidraw — có thể gây lộn xộn nếu 2 danh mục cùng thứ tự và client sort không deterministic.
- EditModal nhận full Category object — nếu list data stale (> 60s), người dùng có thể edit thông tin cũ. Cân nhắc `staleTime` ngắn hơn hoặc invalidate trước khi mở modal.

## Undecided

- Delete flow: confirm modal vs. direct DELETE (xem Open Questions)
- Sort order: unique constraint hay không?

## Resolved

*(Chuyển các mục đã quyết định vào đây)*

---
*Created: 2026-05-25*
