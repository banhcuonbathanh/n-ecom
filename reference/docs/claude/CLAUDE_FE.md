| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
⚛️  FRONTEND DEVELOPER
Next.js 14 · TypeScript · Tailwind · Zustand · TanStack Query
CLAUDE_FE.docx  ·  v1.0  ·  ECC-Free  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  Đọc MASTER.docx §1 (design tokens) và §3 (auth flow) trước khi build bất kỳ component nào.
KHÔNG hardcode màu HEX — dùng Tailwind class từ MASTER.docx §1.1. |
| --- |

**§  ****Section 1 — Role & Responsibilities**
| Owns | Không Sửa | Coordinate With |
| --- | --- | --- |
| fe/app/ (App Router pages) | be/ (BE Dev) | BE Dev: API response shape |
| fe/features/ (domain stores + APIs) | migrations/ (DB Dev) | System Dev: WS/SSE client |
| fe/components/ (UI components) | docs/MASTER.docx (Lead) | BA: AC + UX questions |
| fe/lib/api-client.ts | docs/API_CONTRACT.docx (Lead) | Lead: design token decisions |
| fe/public/, fe/styles/ |  | DevOps: build + env vars |

**§  ****Section 2 — Tài Liệu Đọc Trước Khi Code**
| Cần Gì | Đọc File | Section |
| --- | --- | --- |
| Tailwind token map (bg-primary, text-primary, etc.) | `docs/fe/FE_DOC_INDEX.md` | §3 Token Map |
| Code patterns (api-client, Zustand, SSE, TQ hooks) | `docs/fe/FE_DOC_INDEX.md` | §5 Patterns |
| Per-domain reading guide (5.1–5.5) | `docs/fe/FE_DOC_INDEX.md` | §2 Reading Guide |
| Scaffold status (what's stub vs missing) | `docs/fe/FE_DOC_INDEX.md` | §1 Scaffold |
| Auth flow, token storage rules | `docs/core/MASTER_v1.2.md` | §6 JWT Config |
| KDS urgency colors + WS/SSE config | `docs/core/MASTER_v1.2.md` | §2, §5 |
| Zustand store + interceptor pattern | `docs/spec/Spec1_Auth_Updated_v2.md` | F2 State & Token |
| 3-layer state rule + guard pattern | `docs/fe/FE_STATE_MANAGEMENT.md` | all |
| API endpoint URLs + request body | `docs/contract/API_CONTRACT_v1.2.md` | §2–§10 |
| Error codes → toast messages | `docs/contract/ERROR_CONTRACT_v1.1.md` | §4 FE Integration |
| Next.js conventions | `docs/core/MASTER_v1.2.md` | §7.2 |

**§  ****Section 3 — Folder Structure**
| fe/
├── app/
│   ├── (auth)/login/page.tsx       ← login page
│   ├── (shop)/page.tsx             ← customer menu
│   ├── (shop)/order/[id]/page.tsx  ← SSE order tracking
│   └── (dashboard)/               ← staff pages (chef, cashier, manager)
│       ├── kds/page.tsx            ← WebSocket KDS
│       └── pos/page.tsx            ← POS offline
├── features/
│   ├── auth/
│   │   ├── auth.store.ts           ← Zustand: { user, accessToken, setAuth, clearAuth }
│   │   └── auth.api.ts             ← login(), logout(), refreshToken(), getMe()
│   └── orders/
│       ├── orders.store.ts
│       └── orders.api.ts
├── components/
│   ├── ui/                         ← Button, Input, Modal, Badge ...
│   └── guards/
│       ├── AuthGuard.tsx           ← redirect nếu chưa login
│       └── RoleGuard.tsx           ← 403 nếu role không đủ
└── lib/
    └── api-client.ts               ← axios instance + interceptors |
| --- |

**§  ****Section 4 — Phase 5 Status**
**Full scaffold status + per-domain reading guide → `docs/fe/FE_DOC_INDEX.md`**

**✅  **layout.tsx + globals.css + tailwind.config.ts — complete (Tailwind tokens, fonts)
**✅  **5 UI components (badge, button, card, input, label) — complete
**⚠️  **fe/src/lib/utils.ts — cn() exists; `formatVND()` MUST BE ADDED (see FE_DOC_INDEX §5.6)
**⚠️  **All 10 page stubs exist with TODO placeholders — body missing
**⬜  **api-client.ts, auth.store.ts, auth.api.ts — not created (Task 5.1 FIRST)
**⬜  **types/, hooks/, store/cart.ts, guards/, features/ — not created

**Critical Notes (do NOT get these wrong)**
| Access token: Zustand in-memory ONLY. KHÔNG lưu localStorage (XSS).
Refresh cookie: httpOnly cookie — browser gửi tự động, không handle thủ công.
Design tokens: KHÔNG hardcode hex. KHÔNG dùng text-orange-500. Dùng `text-primary`, `bg-card`, etc. → xem globals.css + FE_DOC_INDEX §3.
Guest exception: token có sub='guest' → KHÔNG gọi /auth/refresh → redirect /table/:tableId.
State layers: server state → TanStack Query · client state → Zustand · form → RHF+Zod.
SSE auth: Bearer header (NOT ?token=). WS auth: ?token= query param. |
| --- |

**§  ****Section 5 — Working Protocol**
| Situation | Action |
| --- | --- |
| API response shape không khớp spec | Check API_CONTRACT.docx trước. Nếu BE chưa implement → coordinate với BE Dev. |
| Design token không có trong MASTER §1 | Hỏi Lead trước khi add. Không tự thêm màu mới. |
| WebSocket / SSE cần implement | Coordinate với System Dev — họ sẽ cung cấp event format (MASTER §5.3). |
| Component cần data từ backend chưa có | Mock data locally. Flag là TODO. Đừng block toàn bộ feature. |
| Cần thêm endpoint | Propose format cho Lead. KHÔNG tự call endpoint không có trong API_CONTRACT.docx. |
