| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
⚙️  BACKEND DEVELOPER
Go 1.22 · Gin · sqlc · database/sql · REST API
CLAUDE_BE.docx  ·  v1.0  ·  ECC-Free  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  Đọc đúng file trước khi code. Không cần hỏi lại nếu thông tin đã có trong doc.
API shape → API_CONTRACT.docx. Business logic → MASTER.docx §4. DB schema → DB_SCHEMA.docx §3. |
| --- |

**§  ****Section 1 — Role & Responsibilities**
| Owns | Không Sửa | Coordinate With |
| --- | --- | --- |
| be/internal/handler/ | fe/ (FE Dev) | DB Dev: schema changes |
| be/internal/service/ | migrations/*.sql (DB Dev) | System Dev: WS, SSE, payments |
| be/internal/repository/ | docs/MASTER.docx (Lead) | Lead: API contract changes |
| be/internal/middleware/ | docs/API_CONTRACT.docx (Lead) | BA: AC clarification |
| be/cmd/server/main.go | be/internal/websocket/ (System Dev) | DevOps: env vars |
| be/pkg/ (jwt, bcrypt, ...) | be/internal/payment/ (System Dev) |  |

**§  ****Section 2 — Tài Liệu Đọc Trước Khi Code**
| Cần Gì | Đọc File | Xem Section |
| --- | --- | --- |
| Request/response shape | `docs/contract/API_CONTRACT_v1.2.md` | §2 Auth, §3 Products, §4 Orders, §5 Payments |
| Business logic unique của domain | `docs/spec/Spec1_Auth_Updated_v2.md` | B1 Business Logic, B2 sqlc Queries |
| Go conventions (package, error wrap, ctx) | `docs/core/MASTER_v1.2.md` | §7.1 — Go Backend Rules |
| HTTP error codes cần trả về | `docs/contract/ERROR_CONTRACT_v1.1.md` | §2, §3 |
| DB columns và types | `docs/be/DB_SCHEMA_SUMMARY.md` | — |
| RBAC check logic | `docs/core/MASTER_v1.2.md` | §3 — RBAC & Role Hierarchy |
| JWT payload structure | `docs/core/MASTER_v1.2.md` | §6 — JWT Config |
| Business rules (order cancel, payment) | `docs/core/MASTER_v1.2.md` | §4 — Business Rules |
| BE scaffold status + DI wiring | `docs/be/BE_DOC_INDEX.md` | §1 Scaffold · §3 DI Wiring |

**§  ****Section 3 — Package Structure (Rule: MASTER.docx §7.1)**
| be/
├── cmd/server/main.go          ← entry point, DI wiring
├── internal/
│   ├── handler/                ← HTTP handlers (gin.Context)
│   │   └── auth_handler.go     ← LoginHandler, RefreshHandler, ...
│   ├── service/                ← business logic (testable)
│   │   └── auth_service.go     ← Login(), Refresh(), ValidateQRToken()
│   ├── repository/             ← DB access (sqlc wrappers)
│   │   └── auth_repo.go
│   ├── middleware/             ← auth.go, rbac.go, ratelimit.go
│   └── model/                  ← shared structs (request/response DTOs)
└── pkg/                        ← reusable, no import cycle
    ├── jwt/jwt.go
    └── bcrypt/bcrypt.go |
| --- |

**§  ****Section 4 — Phase 4 Status**
**Full scaffold status + per-domain reading guide → `docs/be/BE_DOC_INDEX.md`**

**✅  **pkg/jwt/jwt.go — implemented
**✅  **pkg/bcrypt/bcrypt.go — implemented
**✅  **internal/service/errors.go — all sentinel errors
**✅  **internal/service/deps.go — cross-service interfaces
**✅  **internal/handler/respond.go — respondError() helper
**⚠️  **internal/repository/auth_repo.go — stub (body missing)
**⚠️  **internal/service/auth_service.go — stub (body missing)
**⚠️  **internal/middleware/auth.go — stub (body missing)
**⚠️  **internal/middleware/rbac.go — stub (body missing)
**⬜  **internal/handler/auth_handler.go — not created yet
**⬜  **internal/model/ — not created yet (DTOs go here)

**Critical Implementation Notes**
| Login error: KHÔNG tiết lộ 'username không tồn tại' vs 'sai password' → luôn trả ErrInvalidCredentials.
Rate limit: Redis key login_fail:{ip} — max 5 lần/phút, lock 15 phút. Xem 001_auth.docx B1.
Refresh token: hash SHA256 trước khi lưu DB. Redis là fast-path, DB là fallback.
Middleware order: Logger → Recovery → CORS → RateLimit → Auth → RoleCheck → Handler. Xem MASTER §7.1.
Context timeout: 5s cho DB queries, 10s cho external calls. Luôn truyền ctx qua mọi layer. |
| --- |

**§  ****Section 5 — Working Protocol**
| Situation | Action |
| --- | --- |
| API shape unclear | Check API_CONTRACT.docx trước. Nếu vẫn unclear → hỏi Lead, không tự assume. |
| DB schema cần thêm column | Coordinate với DB Dev. KHÔNG modify migrations/*.sql trực tiếp. |
| Business rule conflict | MASTER.docx §4 là source of truth. Notify BA nếu spec contradicts. |
| Cần endpoint mới (ngoài API_CONTRACT) | Propose cho Lead → Lead updates API_CONTRACT → then implement. |
| WS / SSE integration | Coordinate với System Dev — họ own be/internal/websocket/ và be/internal/payment/ |
