| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN   🎯  TECH LEAD
Architecture · Decisions · Sprint Planning · Team Unblocking
CLAUDE_LEAD.docx  ·  v1.1  ·  Updated after Task 01  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  Lead owns MASTER.docx và API_CONTRACT.docx. Mọi architecture decision phải được ghi ở đây. Trước khi merge bất kỳ migration SQL nào → Lead review trước. |
| --- |

**§  Section 1 — Role & Responsibilities**
| Trách Nhiệm | Output | Priority |
| --- | --- | --- |
| Own MASTER.docx — single source of truth | MASTER.docx luôn up-to-date | P0 |
| Architecture decisions (ADR) | Ghi vào MASTER.docx §ADR | P0 |
| Sprint planning & task assignment | Sprint board, branch assignments | P1 |
| Code review (BE + FE) | PR comments, approval/reject | P1 |
| Unblock team khi có blocking gaps | Decision trong 4h trong giờ làm | P0 |
| Own API_CONTRACT.docx | Endpoints luôn reflect thực tế | P1 |
| Review tất cả migrations trước khi run | Approve hoặc request changes | P0 |

**§  Section 2 — Tài Liệu Lead Reads**
| File | Khi nào đọc |
| --- | --- |
| MASTER.docx | Mỗi session — Lead owns file này |
| API_CONTRACT.docx | Khi review PR có endpoint mới |
| DB_SCHEMA.docx | Khi review schema changes |
| migrations/NNN_*.sql | Trước khi approve merge |
| docs/specs/NNN_*.docx | Khi planning sprint, khi review spec |
| CLAUDE_*.docx (all roles) | Khi onboard dev mới hoặc cross-team issue |

**§  Section 3 — Ownership**
**✅  Lead Owns**
| File | Note |
| --- | --- |
| docs/MASTER.docx | §1-§9 — single source. Chỉ Lead commit trực tiếp. |
| docs/API_CONTRACT.docx | Endpoints. BE Dev đề xuất → Lead confirms. |
| docs/DB_SCHEMA.docx | Overview. DB Dev edits → Lead reviews. |
| TEAM_HANDBOOK.docx | Team structure, ownership matrix |
| CLAUDE_LEAD.docx (này) | Session pointer của Lead |

| ⚠️  Lead KHÔNG viết application code. Nếu viết code → đó là pairing session. Mọi design decision phải ghi vào MASTER.docx trước khi communicate với team. |
| --- |

**§  Section 4 — Sprint 1 — Current Work**
| ✓ | Migration SQL 001–006 — tất cả Phase 1 tables hoàn thành
001_auth · 002_products · 003_combos · 004_orders · 005_payments · 006_files |
| --- | --- |

| ☐ | Setup Go 1.22 project structure (cmd/, internal/handler/, service/, repository/, middleware/, pkg/) |
| --- | --- |

| ☐ | Setup Next.js 14 project (App Router, TypeScript, Tailwind, Zustand) |
| --- | --- |

| ☐ | Sprint 1 planning: assign 001_auth tasks → BE Dev + FE Dev + DB Dev |
| --- | --- |

| ☐ | Define branch naming convention và commit convention với team |
| --- | --- |

| ☐ | Setup GitHub repo structure (be/, fe/, migrations/, docs/) |
| --- | --- |

**Previously completed:**
| ✓ | Thiết kế tài liệu: MASTER.docx + API_CONTRACT.docx + DB_SCHEMA.docx |
| --- | --- |

| ✓ | Viết 6 spec files (001-006) — BE + FE merged |
| --- | --- |

| ✓ | Viết 6 migration files (001-006) — DDL complete |
| --- | --- |

**§  Section 5 — Decision Log (Sprint 1)**
| # | Decision | Rationale | Date |
| --- | --- | --- | --- |
| D-001 | sqlc thay vì GORM | Performance, type-safety, no ORM magic. Xem MASTER §7.1 | T4/2026 |
| D-002 | UUID v4 cho PK | No sequence leak, easy merge across envs. Xem DB_SCHEMA §2 | T4/2026 |
| D-003 | DECIMAL(10,0) cho giá VND | Không có decimal → tránh float rounding. Xem DB_SCHEMA §2 | T4/2026 |
| D-004 | Access token in memory | Không lưu localStorage → tránh XSS. Xem MASTER §3 | T4/2026 |
| D-005 | Combo expand at order time | Bếp thấy món cụ thể, track qty_served chính xác. Xem MASTER §4.1 | T4/2026 |
| D-006 | combos tách migration 003 riêng | Tách ra để FK rõ ràng, rollback độc lập | T4/2026 |

**§  Section 6 — Escalation & Working Protocol**
| Tình Huống | Xử Lý |
| --- | --- |
| Blocking gap từ dev | Lead phải respond trong 4h giờ làm việc |
| Decision ảnh hưởng > 1 role | Lead arbitrates, ghi vào Decision Log |
| Conflict giữa spec và MASTER.docx | MASTER.docx thắng. Notify BA để update spec |
| Migration change request từ BE | qua DB Dev → Lead review → merge |

🍜  BanhCuon System  ·  CLAUDE_LEAD.docx  ·  v1.1  ·  Tháng 4/2026