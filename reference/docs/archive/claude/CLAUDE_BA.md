| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
📋  BUSINESS ANALYST
Requirements · Specs · Acceptance Criteria
CLAUDE_BA.docx  ·  v1.0  ·  ECC-Free  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  Đây là SESSION POINTER của BA. File này chỉ chứa pointers và current work.
Đọc MASTER.docx §4 trước khi write/update bất kỳ business rule nào. |
| --- |

**§  ****Section 1 — Role & Responsibilities**
| Trách Nhiệm | Output / Artifact | Tần Suất |
| --- | --- | --- |
| Viết và maintain Feature Specs | docs/specs/001-006.docx | Per Sprint |
| Define Acceptance Criteria (testable) | AC tables trong mỗi spec | Per Feature |
| Clarify business rules với stakeholders | MASTER.docx §4 update | On Change |
| Validate API endpoints vs nghiệp vụ | Comments trên API_CONTRACT.docx | Per Sprint |
| Impact analysis khi requirements thay đổi | Change log trong spec | On Request |

**§  ****Section 2 — Tài Liệu Phải Đọc**
| Cần Làm Gì | Đọc File | Section |
| --- | --- | --- |
| Xem business rules | MASTER.docx | §4 — Business Rules |
| Validate endpoint vs nghiệp vụ | API_CONTRACT.docx | §2-§6 |
| Hiểu database structure | DB_SCHEMA.docx | §3 — Chi tiết tables |
| Update feature spec | docs/specs/NNN_*.docx | Full file — BA owns |
| Xem RBAC / permissions | MASTER.docx | §2 — RBAC Matrix |
| Xem error codes | MASTER.docx | §6 — Error Codes |

**§  ****Section 3 — Ownership Boundaries**
**✅  BA Owns (có thể sửa)**
| File / Folder | Mô Tả |
| --- | --- |
| docs/specs/001_auth.docx | Auth spec — AC, business logic FE+BE |
| docs/specs/002_products.docx | Products & Menu spec |
| docs/specs/003_orders_kds.docx | Orders & KDS spec |
| docs/specs/004_payments.docx | Payments spec |
| docs/specs/005_qr_pos.docx | QR + POS spec |
| docs/specs/006_staff.docx | Staff Management spec |

| ⚠️  KHÔNG tự sửa: migrations/*.sql (DB Dev), be/ code (BE Dev), fe/ code (FE Dev),
     MASTER.docx (Lead owns). Muốn thay đổi → raise với Lead. |
| --- |

**§  ****Section 4 — Current Work (Sprint 1)**
**☐  **Review AC-001-01 → AC-001-06 trong spec 001_auth.docx — đủ testable chưa?
**☐  **Draft spec 002_products.docx — AC cho CRUD products, toppings, combos
**☐  **Clarify combo expand flow với Lead — bếp thấy combo_child như thế nào trên KDS?
**☐  **Xác nhận cancel order rule: progress < 30% — unit là % hay số lượng?
**✓  **MASTER.docx §4 business rules (order + payment) đã review và confirm
**✓  **Tất cả 6 spec files đã có structure — cần fill AC chi tiết hơn

**§  ****Section 5 — Cross-Team Communication**
| Khi nào | Làm gì | Với ai |
| --- | --- | --- |
| AC không rõ ràng | Clarify với BA trước khi code | → BE Dev / FE Dev gửi câu hỏi cho BA |
| Business rule thay đổi | BA update MASTER.docx §4, thông báo Lead | Lead → forward cho all devs |
| Spec có gap blocking code | BA xử lý trong 24h hoặc mark TBD + estimate | BE/FE Dev → BA |
| New endpoint cần thiết | BA document trong API_CONTRACT.docx + spec | → Coordinate với Lead |
| Phase 2 feature được hỏi | Flag là Phase 2, không estimate cho Phase 1 | → Tất cả roles |

**§  ****Section 6 — Working Protocol**
| 🔴 Blocking: Thiếu business rule → DỪNG, clarify với stakeholder, update MASTER §4 trước khi spec.
🟡 Important: AC ambiguous → Draft best interpretation + flag, discuss với Dev trong 24h.
🟢 Minor: Typo hoặc wording → Fix và note trong spec changelog.
⚖️  Decision: Conflicting requirements → Đưa options lên Lead để arbitrate. |
| --- |
