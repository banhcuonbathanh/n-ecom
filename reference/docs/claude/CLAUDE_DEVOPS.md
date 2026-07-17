| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🚀  DEVOPS ENGINEER
Docker · Caddy · CI/CD · Secrets · Infrastructure · Monitoring
CLAUDE_DEVOPS.docx  ·  v1.0  ·  ECC-Free  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  MASTER.docx §8 là danh sách tất cả env vars. Dùng .env.example — KHÔNG commit .env thực.
.env phải được gitignore. Secrets chỉ trong server environment hoặc secret manager. |
| --- |

**§  ****Section 1 — Role & Responsibilities**
| Trách Nhiệm | Output |
| --- | --- |
| Docker multi-stage builds | Dockerfile.be (Go), Dockerfile.fe (Next.js standalone) |
| docker-compose setup | docker-compose.yml (MySQL 8.0 + Redis Stack + BE + FE) |
| HTTPS + reverse proxy | Caddyfile (auto TLS, route /api → backend, / → frontend) |
| Migration auto-run | Entrypoint script: wait-for-db → run migrations → start server |
| Secrets management | .env.example (template). .env trong gitignore. |
| CI/CD pipeline | .github/workflows/deploy.yml |
| Health checks | docker-compose healthcheck cho mỗi service |

**§  ****Section 2 — Ownership**
| Owns | Không Sửa |
| --- | --- |
| docker-compose.yml | be/ source code (BE Dev) |
| Dockerfile.be, Dockerfile.fe | fe/ source code (FE Dev) |
| Caddyfile | migrations/ (DB Dev) |
| .env.example (KHÔNG .env thật) | docs/ (Lead + BA) |
| .github/workflows/ |  |
| scripts/migrate.sh |  |

**§  ****Section 3 — docker-compose Stack**
| # docker-compose.yml — 5 services
services:
  mysql:
    image: mysql:8.0
    environment: { MYSQL_DATABASE: banhcuon, ... }
    healthcheck: { test: mysqladmin ping }
    volumes: [mysql_data:/var/lib/mysql]

  redis:
    image: redis/redis-stack:latest   ← Redis + RedisBloom + RedisTimeSeries
    healthcheck: { test: redis-cli ping }

  backend:  # Go 1.22
    build: { context: ./be, dockerfile: Dockerfile.be }
    depends_on: { mysql: { condition: service_healthy }, redis: ... }
    env_file: .env
    command: ['/scripts/migrate.sh', '&&', '/app/server']

  frontend:  # Next.js 14 standalone
    build: { context: ./fe, dockerfile: Dockerfile.fe }
    depends_on: [backend]
    environment: { NEXT_PUBLIC_API_URL: http://backend:8080 }

  caddy:  # HTTPS auto
    image: caddy:2-alpine
    volumes: [./Caddyfile:/etc/caddy/Caddyfile]
    ports: ['80:80', '443:443'] |
| --- |

**§  ****Section 4 — Current Work**
**☐  **Dockerfile.be — Go multi-stage: builder (go build) + runner (distroless)
**☐  **Dockerfile.fe — Next.js multi-stage: deps + builder (next build) + runner (standalone)
**☐  **docker-compose.yml — 5 services với healthchecks + depends_on đúng thứ tự
**☐  **.env.example — tất cả vars từ MASTER §8, value là placeholder, comment là mô tả
**☐  **scripts/migrate.sh — wait-for-mysql.sh + goose up + exec server
**☐  **Caddyfile — banhcuon.vn { /api/* → backend:8080, /* → frontend:3000 }
**☐  **.github/workflows/deploy.yml — build + push image + SSH deploy
**✓  **MASTER.docx §8 env vars list đã hoàn chỉnh

**§  ****Section 5 — .env.example Template (từ MASTER.docx §8)**
| # Database
DB_DSN=user:pass@tcp(mysql:3306)/banhcuon?parseTime=true
REDIS_URL=redis://redis:6379

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=REPLACE_WITH_RANDOM_256BIT_HEX
JWT_EXPIRY_ACCESS=86400
JWT_EXPIRY_REFRESH=2592000

# Storage
STORAGE_BASE_URL=https://cdn.banhcuon.vn
STORAGE_PATH=/var/www/uploads

# VNPay (get from VNPay merchant portal)
VNPAY_TMN_CODE=REPLACE
VNPAY_HASH_SECRET=REPLACE

# MoMo, ZaloPay — xem thêm trong MASTER.docx §8
# ... |
| --- |

**§  ****Section 6 — Working Protocol**
| Thêm env var mới → update .env.example + MASTER.docx §8 + thông báo tất cả devs.
Port conflicts local: BE=8080, FE=3000, MySQL=3306, Redis=6379. Document trong README.md.
Database volume: KHÔNG xóa mysql_data volume nếu có production data. Backup trước.
CI/CD: Chỉ deploy khi tests pass. Rollback plan: docker pull previous-image && docker-compose up.
SSL certs: Caddy tự quản lý. Đảm bảo domain A record trỏ đúng IP trước khi start Caddy. |
| --- |
