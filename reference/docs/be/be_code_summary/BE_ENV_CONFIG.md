# BE Environment & Config Reference

> Last generated: 2026-06-05 (P-BEDOC-2).
> Source of truth: every `os.Getenv(...)` call in `be/`. Re-grep after adding a new env read:
> `grep -rnE 'os.Getenv\("[A-Z_]+"\)' be/cmd be/internal be/pkg`
>
> Rule (from MASTER): **No hardcoded config** — all runtime config flows through these vars.
> "Required" = process fails or feature breaks if unset. "Default" = value used when unset.

---

## Core / Server

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `PORT` | HTTP listen port | no | `8080` | `cmd/server/main.go` |
| `CORS_ORIGINS` | `Access-Control-Allow-Origin` value (single origin) | no | `http://localhost:3000` | `cmd/server/main.go` |
| `MIGRATIONS_DIR` | Goose migrations dir, auto-run on boot when `DB_DSN` set | no | `/migrations` | `cmd/server/main.go` |

## Database

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `DB_DSN` | MySQL DSN (`user:pass@tcp(host:3306)/db?...`). Empty → skips migrations + DB unusable | **yes** (prod) | — | `cmd/server`, `cmd/seed`, `cmd/qr`, `cmd/demo_order` |

> Pool is fixed in code, not env: `MaxOpenConns=25`, `MaxIdleConns=5`, `ConnMaxLifetime=5m` (`main.go`).

## Redis

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `REDIS_ADDR` | `host:port` for the main server Redis client | no | `redis:6379` | `cmd/server/main.go` |
| `REDIS_URL` | Full `redis://` URL parsed by `pkg/redis.New()` | **yes** where `pkg/redis.New()` is used (errors if empty) | — | `pkg/redis/client.go` |

> ⚠️ FLAG: two different Redis env vars exist (`REDIS_ADDR` in main wiring vs `REDIS_URL` in `pkg/redis`). Keep both pointed at the same instance. Candidate for consolidation.

## JWT / Auth

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `JWT_SECRET` | HMAC signing secret for access + refresh tokens | **yes** (sign/verify return error if empty) | — | `pkg/jwt/jwt.go` |
| `JWT_ACCESS_TTL` | Access token lifetime, **seconds** | no | `86400` (24h) | `pkg/jwt/jwt.go` |
| `JWT_REFRESH_TTL` | Refresh token lifetime, **seconds** | no | `2592000` (30d) | `pkg/jwt/jwt.go` |

## Storage / Files

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `STORAGE_BASE_PATH` | Disk root for uploads. Empty → `/uploads` static route NOT mounted | no (feature-gated) | — | `cmd/server/main.go`, `internal/handler/file_handler.go`, `internal/jobs/file_cleanup.go` |
| `STORAGE_BASE_URL` | Public URL prefix prepended to `image_path` for product responses | no | — | `internal/handler/product_handler.go` |

## Payments — VNPay

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `VNPAY_TMN_CODE` | Merchant terminal code | yes (for VNPay) | — | `internal/payment/vnpay.go` |
| `VNPAY_HASH_SECRET` | HMAC secret for redirect URL + webhook verify | yes (for VNPay) | — | `internal/payment/vnpay.go` |
| `VNPAY_BASE_URL` | Gateway redirect base URL | yes (for VNPay) | — | `internal/payment/vnpay.go` |

## Payments — MoMo

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `MOMO_PARTNER_CODE` | Partner code | yes (for MoMo) | — | `internal/payment/momo.go` |
| `MOMO_ACCESS_KEY` | Access key (signature) | yes (for MoMo) | — | `internal/payment/momo.go` |
| `MOMO_SECRET_KEY` | HMAC-SHA256 secret | yes (for MoMo) | — | `internal/payment/momo.go` |
| `MOMO_ENDPOINT` | MoMo API v2 endpoint URL | yes (for MoMo) | — | `internal/payment/momo.go` |

## Payments — ZaloPay

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `ZALOPAY_APP_ID` | App ID | yes (for ZaloPay) | — | `internal/payment/zalopay.go` |
| `ZALOPAY_ENDPOINT` | API endpoint URL | yes (for ZaloPay) | — | `internal/payment/zalopay.go` |

> ⚠️ FLAG: ZaloPay reads only `ZALOPAY_APP_ID` + `ZALOPAY_ENDPOINT` — no `ZALOPAY_KEY1/KEY2` HMAC secret env. Confirm the ZaloPay HMAC path is complete before relying on it in prod.

## Webhooks

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `WEBHOOK_BASE_URL` | Public base URL gateways call back to (build return/IPN URLs) | yes (for online payment callbacks) | — | `internal/service/payment_service.go` |

## CLI Tools (non-server binaries)

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `FE_HOST` | FE host baked into generated QR code URLs | yes (for `cmd/qr`) | — | `cmd/qr/main.go` |

## Test-only

| Var | Purpose | Required? | Default | Read in |
|---|---|---|---|---|
| `TEST_DB_DSN` | MySQL DSN for integration tests | yes (integration tests) | — | `internal/testhelper/testhelper.go` |
| `TEST_REDIS_ADDR` | Redis addr for integration tests | yes (integration tests) | — | `internal/testhelper/testhelper.go` |
| `JWT_SECRET` | testhelper sets it if empty so token gen works in tests | — | (set by helper) | `internal/testhelper/testhelper.go` |

---

> See also: [`BE_STRUCTURE.md`](BE_STRUCTURE.md) (folders + routes) · root `.env.example` (DevOps-maintained sample values).
