| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN   👥  TEAM HANDBOOK
Ownership Matrix · Cross-Team Protocol · Decision Flow · Branch Convention
TEAM_HANDBOOK.docx  ·  v1.1  ·  Updated after Task 01  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  Tài liệu này dành cho toàn team. Đọc khi onboard, khi cross-team conflict, khi không biết hỏi ai. Mỗi role có CLAUDE_{ROLE}.docx riêng chứa session pointer + current work. |
| --- |

**§  Section 1 — Team Structure**
| Role | File | Owns | Không Sửa |
| --- | --- | --- | --- |
| 📋 BA | CLAUDE_BA.docx | docs/specs/001-006.docx | migrations/, be/, fe/ |
| 🎯 Lead | CLAUDE_LEAD.docx | MASTER.docx, API_CONTRACT.docx | Application code |
| ⚙️ BE Dev | CLAUDE_BE.docx | be/internal/, be/cmd/, be/pkg/ | fe/, migrations/, WS/payment |
| ⚛️ FE Dev | CLAUDE_FE.docx | fe/app/, fe/features/, fe/lib/ | be/, migrations/ |
| 🗄️ DB Dev | CLAUDE_DB.docx | migrations/*.sql, DB_SCHEMA.docx | be/, fe/, MASTER.docx |
| 🔌 System Dev | CLAUDE_SYSTEM.docx | be/internal/websocket/, payment/, jobs/ | be/internal/handler/ (BE Dev) |
| 🚀 DevOps | CLAUDE_DEVOPS.docx | Dockerfile, docker-compose, Caddy, CI/CD | Source code (all) |

**§  Section 2 — Shared Documents (Cross-Team)**
| File | Owner (có thể sửa) | Ai đọc | Khi nào |
| --- | --- | --- | --- |
| MASTER.docx | Lead only | ALL roles | Trước khi code bất kỳ logic nào |
| API_CONTRACT.docx | Lead (BE Dev đề xuất) | BE Dev, FE Dev, Lead | Trước khi implement/call endpoint |
| DB_SCHEMA.docx | DB Dev (Lead reviews) | BE Dev, System Dev, DB Dev, Lead | Khi query DB hoặc design schema |
| docs/specs/NNN_*.docx | BA (Dev reference) | ALL roles theo feature | Khi implement feature đó |
| TEAM_HANDBOOK.docx | Lead | ALL roles | Onboarding + cross-team issues |

**§  Section 3 — Cross-Team Communication Rules**
| Câu Hỏi / Situation | Hỏi Ai |
| --- | --- |
| Chức năng này nên làm gì? / AC không rõ | 📋 BA |
| Endpoint này trả gì? / API shape | ⚙️ BE Dev → check API_CONTRACT.docx trước |
| Màu nút này là gì? / design token | MASTER.docx §1 → nếu không có → 🎯 Lead |
| Cần thêm column trong DB? / schema change | 🗄️ DB Dev → 🎯 Lead approval |
| WS event format là gì? / realtime | 🔌 System Dev → MASTER.docx §5.3 |
| Env var nào cần set? / deployment | MASTER.docx §8 → 🚀 DevOps |
| Business rule này có đúng không? / conflict | MASTER.docx §4 là truth → nếu mâu thuẫn → 🎯 Lead |
| Deploy bị fail, lỗi gì? / production issue | 🚀 DevOps → 🎯 Lead nếu > 2h |

**§  Section 4 — Branch Naming Convention**
| Pattern | Ví Dụ | Dùng Khi |
| --- | --- | --- |
| feature/spec-NNN-short-name | feature/spec-001-auth | New feature theo spec |
| fix/domain-description | fix/auth-refresh-token-null | Bug fix |
| chore/scope-description | chore/docker-compose-redis-stack | Config, tooling, no business logic |
| docs/scope-description | docs/master-payment-rules | Documentation update |
| db/NNN-description | db/006-add-marketing-tables | Migration files only |

**§  Section 5 — Decision Escalation Path**
| Loại Quyết Định | Ai Quyết | Thời Gian |
| --- | --- | --- |
| API endpoint shape (new/change) | Lead (sau khi BE Dev + FE Dev align) | 1 ngày |
| Schema change (new column/table) | Lead (sau khi DB Dev propose) | 1 ngày |
| Business rule thay đổi | BA + Lead (confirm với stakeholder) | 2-3 ngày |
| Tech stack thay đổi | Lead (ADR required) | 1 tuần |
| Architecture decision (major) | Lead + team discussion | 1 sprint planning |
| Production incident (P0) | Lead immediate → postmortem 24h | Ngay lập tức |

**§  Section 6 — Commit Convention**
| Format: <type>(<scope>): <description>
Types:  feat | fix | chore | docs | refactor | test | style
Scopes: auth | products | orders | payments | kds | pos | staff | db | infra | docs

Examples:
  feat(auth): implement JWT refresh token rotation
  fix(orders): prevent duplicate active orders per table
  chore(db): add index on orders.status
  docs(master): update payment rules R-PAY-04
  feat(kds): add WebSocket heartbeat ping/pong

Rules:
  - Subject <= 72 chars
  - Imperative mood: 'add' not 'added'
  - Reference spec: 'feat(auth): implement login [spec-001]' |
| --- |

**§  Section 7 — Phase 1 Feature Checklist**
**✓  DB Dev migrations complete for all Phase 1 domains**
| Feature | Spec | BE Dev | FE Dev | DB Dev | System Dev |
| --- | --- | --- | --- | --- | --- |
| Auth & JWT | 001_auth.docx | ☐ TODO | ☐ TODO | ✓ Done | N/A |
| Products & Menu | 002_products.docx | ☐ TODO | ☐ TODO | ✓ Done | N/A |
| Orders & KDS | 003_orders_kds.docx | ☐ TODO | ☐ TODO | ✓ Done | ☐ TODO (WS) |
| Payments | 004_payments.docx | ☐ TODO | ☐ TODO | ✓ Done | ☐ TODO (gateway) |
| QR Tại Bàn + POS | 005_qr_pos.docx | ☐ TODO | ☐ TODO | N/A | N/A |
| Staff Management | 006_staff.docx | ☐ TODO | ☐ TODO | N/A | N/A |

🍜  BanhCuon System  ·  TEAM_HANDBOOK.docx  ·  v1.1  ·  Tháng 4/2026