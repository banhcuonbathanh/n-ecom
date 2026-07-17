
**SOFTWARE REQUIREMENTS SPECIFICATION**
**Section 1.3 — Yêu Cầu Phi Chức Năng (NFR)**
He Thong Quan Ly Quan Banh Cuon — Phase 1

| Document | SRS v1.1 — NFR Supplement |
| --- | --- |
| Version | 1.1 (NFR section expanded) |
| Date | Thang 4 / 2026 |
| Status | Approved |
| NFR Categories | Hieu nang · Chiu tai · Bao mat · Sao luu · Da nen tang · SEO · Kha dung |
| Replaces | SRS v1.0 §5 — System Quality Attributes (merged + expanded here) |

# 1.3  Yêu Cầu Phi Chức Năng (Non-Functional Requirements)
Cac NFR duoc to chuc theo 7 nhom chinh. Moi nhom co nguong do luong cu the, co the kiem chung bang cong cu, khong chi la mo ta dinh tinh.

| Nhom NFR | Yeu Cau Chinh | Nguong Do Luong | Priority |
| --- | --- | --- | --- |
| NFR-PERF Hieu Nang | LCP < 3s, API p95 < 500ms, TTFB < 800ms | Lighthouse score >= 80, k6 load test | MUST |
| NFR-LOAD Chiu Tai | 1.000 CCU khong degradation, scale ngang | k6: 1000 VU, error rate < 1% | MUST |
| NFR-SEC Bao Mat | HTTPS, chong SQLi/XSS/CSRF, bcrypt, HMAC, JWT | OWASP Top 10 audit pass | MUST |
| NFR-BACK Sao Luu | Backup hang ngay, luu 30 ngay, off-site, RTO < 4h | Drill restore test hang thang | MUST |
| NFR-PLAT Da Nen Tang | Mobile iOS/Android, Tablet, Desktop. Min 360px. | BrowserStack test, Lighthouse mobile | MUST |
| NFR-SEO SEO | URL sach, meta tag, sitemap.xml, Schema.org | Google Search Console, Lighthouse SEO >= 90 | SHOULD |
| NFR-AVAIL Kha Dung | SLA 99.5% uptime = toi da ~3.6h downtime/thang | UptimeRobot monitor, monthly report | MUST |

## 1.3.1  NFR-PERF — Hiệu Năng (Performance)
**Muc tieu:  **He thong phai phan hoi nhanh tren moi kenh (web, API, realtime) nham dam bao trai nghiem nguoi dung tot va giu chan khach hang.

**A. Frontend Web Performance**
| Chi So | Nguong Bat Buoc | Do Luong Bang |
| --- | --- | --- |
| LCP (Largest Contentful Paint) | < 3.0 giay (Good: < 2.5s, Needs Improvement: 2.5-4.0s) | Lighthouse, Chrome UX Report, Web Vitals |
| FID / INP (Input Delay) | < 200ms (INP: < 200ms = Good) | Lighthouse, Field data CrUX |
| CLS (Cumulative Layout Shift) | < 0.1 (Good threshold) | Lighthouse |
| TTFB (Time To First Byte) | < 800ms (server response) | Chrome DevTools Network tab |
| Total Page Weight | < 1.5 MB trang /menu (anh da duoc compress) | Chrome DevTools, WebPageTest |
| Lighthouse Performance Score | >= 80 / 100 tren Desktop, >= 70 tren Mobile | Lighthouse CI trong pipeline |

**Cach dat duoc LCP < 3s:  **Next.js 14 Image Optimization (WebP/AVIF tu dong). Static generation cho /menu (ISR 5 phut). Redis cache product list giam TTFB. CDN cho anh san pham (STORAGE_BASE_URL tro CDN). Font preload trong <head>.

**B. API Response Time**
| Endpoint Loai | Nguong p95 | Nguong p99 |
| --- | --- | --- |
| GET (public, co Redis cache) | < 100ms | < 200ms |
| GET (auth required, DB query) | < 300ms | < 500ms |
| POST (create order, expand combo) | < 500ms | < 800ms |
| POST /payments (goi gateway ngoai) | < 2.000ms (phu thuoc VNPay/MoMo) | < 5.000ms |
| Webhook handler | < 200ms (khong khi verify HMAC xong) | < 500ms |
| WebSocket event (KDS broadcast) | < 100ms end-to-end (same DC) | < 200ms |

**Luu y:  **Thoi gian goi ra VNPay/MoMo/ZaloPay khong tinh vao SLA cua he thong. Context timeout: 5s cho DB query, 10s cho external API call (Go ctx).

**C. Realtime Latency**
| Tinh Huong | Nguong Mong Doi | Ghi Chu |
| --- | --- | --- |
| Chef click item → Customer nhan SSE item_progress | < 500ms | Qua Redis Pub/Sub + SSE stream |
| POST /orders → KDS nhan new_order WS event | < 100ms | WS Hub broadcast, same datacenter |
| SSE reconnect sau khi mat mang | < 1 giay lan dau (baseDelay 1000ms) | Exponential backoff FE config |

**D. Cong Cu Kiem Tra Hieu Nang**
| Cong Cu | Ung Dung |
| --- | --- |
| Lighthouse CI | Chay tu dong trong GitHub Actions sau moi PR. Fail build neu score < 70. |
| k6 (Grafana k6) | Load test: 1000 VU, 5 phut. Script test /menu, /checkout, POST /orders. |
| Go pprof | Profile CPU va memory cua BE trong qua trinh load test. |
| Redis INFO stats | Monitor hit ratio, memory usage, connected clients. |
| MySQL EXPLAIN ANALYZE | Kiem tra query plan cho cac query phuc tap (order join, combo expand). |

## 1.3.2  NFR-LOAD — Khả Năng Chịu Tải (Scalability)
**Muc tieu:  **He thong phai xu ly 1.000 nguoi dung dong thoi (CCU) ma khong co degradation — API laten, error rate va WebSocket connections deu phai nam trong nguong.

**A. Nguong Chiu Tai**
| Chi So | Nguong Phase 1 | Muc Tieu Phase 2 |
| --- | --- | --- |
| Concurrent Users (CCU) | 1.000 CCU khong degradation | 5.000 CCU (scale ngang) |
| HTTP Throughput | >= 500 req/s tai 1000 CCU | >= 2.500 req/s |
| Error Rate | < 1% tai max load | < 0.5% |
| WS Concurrent Connections | >= 50 KDS/cashier clients | >= 200 clients |
| SSE Concurrent Streams | >= 200 order tracking streams | >= 1.000 streams |
| MySQL Connections | Pool size: 25 idle, 100 max | Read replica cho Phase 2 |
| Redis Connections | Pool: 10 min, 50 max per service | Redis Cluster Phase 2 |

**B. k6 Load Test Script (Chuan)**
// k6 load test — 1000 VU, 5 phut

export const options = {

  stages: [

    { duration: '1m', target: 200 },    // ramp-up

    { duration: '3m', target: 1000 },   // sustain 1000 CCU

    { duration: '1m', target: 0 },      // ramp-down

  ],

  thresholds: {

    http_req_duration: ['p(95)<500'],  // API p95 < 500ms

    http_req_failed:   ['rate<0.01'],  // error rate < 1%

  },

}


export default function () {

  // Simulate customer: browse menu → add to cart → checkout

  http.get(`${BASE_URL}/api/v1/products?available=true`)

  sleep(1)

  http.post(`${BASE_URL}/api/v1/orders`, orderPayload, { headers })

}

**C. Chien Luoc Scale Ngang (Phase 2)**
| Component | Chien Luoc Scale |
| --- | --- |
| Backend (Go) | Them container replicas trong docker-compose / k8s. Stateless design. Load balancer truoc cac replicas. |
| WebSocket Hub | Khi nhieu replica: dung Redis Pub/Sub lam message broker giua cac hub (thay vi in-memory map). Tat ca replicas subscribe cung channel. |
| MySQL | Read replica cho SELECT nang. Write lai primary. Connection pooling toi uu. |
| Redis | Redis Cluster hoac Redis Sentinel cho HA. Phan sharding key theo domain. |
| Frontend (Next.js) | Vercel edge deployment hoac them container. CDN cho static assets va anh. |

## 1.3.3  NFR-SEC — Bảo Mật (Security)
**Nguyen tac:  **Defense in depth — nhieu lop bao ve. Khong co single point of failure ve security. Moi lop phai hoat dong doc lap.

**A. Transport Security**
| Requirement | Implementation Detail |
| --- | --- |
| HTTPS bat buoc | Caddy tu dong cap TLS certificate qua ACME/Let's Encrypt. HTTP redirect sang HTTPS. HSTS header. |
| TLS Version | TLS 1.2 minimum. TLS 1.3 preferred. Tat SSLv3, TLSv1, TLSv1.1. |
| WebSocket Security | wss:// bat buoc tren production. KHONG cho phep ws:// tren domain chinh. |
| Security Headers | X-Frame-Options: DENY. X-Content-Type-Options: nosniff. Referrer-Policy: strict-origin. Content-Security-Policy. |

**B. Authentication & Authorization Security**
| Requirement | Implementation Detail |
| --- | --- |
| Password Hashing | bcrypt cost=12 (~200ms per hash). KHONG MD5/SHA1/plain text. KHONG reversible encryption. |
| Token Storage | Access token: Zustand in-memory ONLY. KHONG localStorage/sessionStorage. Refresh token: httpOnly; Secure; SameSite=Strict cookie. |
| JWT Algorithm | HMAC-SHA256. Verify t.Method == jwt.SigningMethodHMAC TRUOC parse. Reject 'none' algorithm va RS256. |
| Brute Force | Login rate limit: 5 lan/phut/IP. Redis key: login_fail:{ip} TTL 15 phut. Tra 429 COMMON_003. |
| Session Revocation | Logout: DEL Redis key auth:refresh:{staff_id}:{hash}. Admin deactivate: DEL auth:staff:{id} (tuc thoi, khong doi 5p cache). |
| RBAC Enforcement | roleValue map so sanh nguyen (khong dung string). Middleware RequireRole() check TRUOC moi protected endpoint. |

**C. Input Validation & Injection Prevention**
| Attack Vector | Mitigation |
| --- | --- |
| SQL Injection | sqlc sinh parameterized queries 100%. KHONG string concatenation. KHONG raw query voi user input. Review moi query trong code gen. |
| XSS (Cross-Site Scripting) | React DOM auto-escape. KHONG dangerouslySetInnerHTML voi user content. CSP header. Token KHONG trong DOM/localStorage. |
| CSRF | SameSite=Strict cookie cho refresh token. JWT trong memory (KHONG cookie) cho access token. Double Submit cookie pattern cho form. |
| Path Traversal | File upload: validate MIME type + extension whitelist. Khong dung user-supplied filename lam duong dan luu tru. |
| Mass Assignment | BE: bind request vao DTO struct cu the, KHONG bind thang vao DB model. Zod validation tren FE truoc khi submit. |
| Webhook Forgery | HMAC-SHA512 (VNPay) / HMAC-SHA256 (MoMo, ZaloPay) verify TRUOC bat ky logic nao. Reject neu sai signature. |

**D. Data Security**
| Requirement | Detail |
| --- | --- |
| Secret Management | Tat ca secrets (JWT_SECRET, VNPAY_HASH_SECRET, ...) chi trong env vars. KHONG hardcode. .env trong .gitignore. Pre-commit hook kiem tra. |
| PII Handling | customer_name, customer_phone chi luu khi can (order tracking). Khong log PII trong application logs. |
| Payment Data | KHONG luu raw card number, CVV. Chi luu gateway_ref va gateway_data (webhook payload). Tuan thu PCI-DSS scope reduction. |
| Audit Log | payment.gateway_data luu raw webhook payload de audit sau nay. payments: khong hard delete (dung deleted_at). |

**E. OWASP Top 10 Checklist**
| OWASP Risk | Status | Bien Phap |
| --- | --- | --- |
| A01 Broken Access Control | COVERED | RBAC middleware, ownership check |
| A02 Cryptographic Failures | COVERED | bcrypt, HTTPS, HMAC verify |
| A03 Injection | COVERED | sqlc parameterized queries |
| A04 Insecure Design | COVERED | Threat model + spec review |
| A05 Security Misconfiguration | COVERED | Caddy hardened, env vars only |
| A06 Vulnerable Components | MONITOR | Dependabot / go mod tidy audit |
| A07 Auth Failures | COVERED | Rate limit, multi-session, is_active |
| A08 Software Integrity Failures | COVERED | CI/CD signed builds, no untrusted CDN |
| A09 Logging & Monitoring Failures | PARTIAL | Application logging (Phase 1). SIEM Phase 2. |
| A10 SSRF | COVERED | Khong fetch URL tu user input tren BE |

## 1.3.4  NFR-BACK — Sao Lưu & Phục Hồi (Backup & Recovery)
**Muc tieu:  **Dam bao du lieu khong bi mat khi co su co. RTO (Recovery Time Objective) < 4 gio. RPO (Recovery Point Objective) < 24 gio (mat toi da 1 ngay data).

**A. Backup Strategy**
| Loai Backup | Cau Hinh | Ghi Chu |
| --- | --- | --- |
| MySQL Full Backup | Hang ngay luc 2:00 AM. mysqldump hoac Percona XtraBackup. | Toan bo du lieu, tat ca bang. |
| MySQL Binary Log | Bat buoc bat binlog. Luu toi 7 ngay bin log. | Point-in-time recovery neu can. |
| Redis Snapshot (RDB) | Moi 1 gio: save 900 1. Moi 5 phut neu > 10 changes: save 300 10. | Du phong cache. Co the tai tao tu DB. |
| File Attachments | Dong bo hang ngay len object storage (S3/MinIO). Luu 30 ngay. | Anh san pham, anh xac nhan TT. |
| Luu Tru Backup | On-site: cung VPS. Off-site: S3-compatible bucket khac region. | 2-1 rule toi thieu (2 ban, 1 off-site). |
| Thoi Gian Luu | 30 ngay ban daily. 12 thang ban cuoi thang. | Dat theo yeu cau kiem toan. |

**B. Recovery Objectives**
| Objective | Gia Tri | Do Dat Duoc Nhu The Nao |
| --- | --- | --- |
| RTO (Recovery Time Objective) | < 4 gio | Docker image pull + restore script + verify. Pre-tested procedure. |
| RPO (Recovery Point Objective) | < 24 gio (mat toi da 1 ngay data) | Daily backup. Binary log cho point-in-time recovery. |
| Restore Test | Hang thang (monthly drill) | Restore vao staging environment va verify data integrity. |
| Monitoring Alert | Alert ngay neu backup job that bai | Cron job + alerting (email/Slack). |

**C. Restore Procedure (RTO < 4h)**
# scripts/restore.sh — Procedure khoi phuc < 4 gio


# Buoc 1 (~15 phut): Pull Docker images tu registry

docker pull registry.example.com/banhcuon-be:latest

docker pull registry.example.com/banhcuon-fe:latest


# Buoc 2 (~30 phut): Restore MySQL tu ban backup moi nhat

mysql -u root -p banhcuon < /backups/daily/banhcuon_$(date +%Y%m%d).sql


# Buoc 3 (~5 phut): Chay migrations (idempotent)

goose -dir migrations mysql "$DB_DSN" up


# Buoc 4 (~5 phut): Start docker-compose

docker-compose up -d --force-recreate


# Buoc 5 (~10 phut): Smoke test

curl https://banhcuon.vn/api/v1/products | jq '.data | length'

# Tong: ~65 phut active work. RTO 4 gio du buffer cho verify + DNS.

## 1.3.5  NFR-PLAT — Đa Nền Tảng & Responsive
**Muc tieu:  **He thong phai hoat dong tot tren moi nen tang ma nguoi dung truy cap: khach hang tren mobile, bep tren tablet KDS, thu ngan tren POS terminal, quan ly tren desktop.

**A. Breakpoint & Layout Requirements**
| Nen Tang | Viewport | Yeu Cau UI |
| --- | --- | --- |
| Mobile (khach) | 360px - 767px | Touch-first. Nut toi thieu 44x44px. Cart FAB fixed bottom. Category tabs scroll ngang. |
| Tablet KDS (bep) | 768px - 1199px | Fullscreen KDS, card lon de bam, chu to de doc tu xa. Khong can scroll tren man hinh chinh. |
| Tablet POS (thu ngan) | 768px - 1199px | 2-column POS layout. Column trai: browse menu. Column phai: order summary. |
| Desktop (manager) | >= 1200px | Dashboard day du: sidebar nav, table pagination, charts, modal forms. |
| Min supported width | 360px | Tat ca trang phai hien thi tot, khong overflow ngang. |

**B. Browser & OS Support**
| Browser / OS | Version Toi Thieu | Ly Do / Note |
| --- | --- | --- |
| Chrome (Android/Desktop) | Chrome 90+ (released Apr 2021) | Largest user base. CSS Grid, ESM, WebP support. |
| Safari (iOS / macOS) | iOS 14.5+, macOS Safari 14+ | iOS la nen tang chinh cua khach quet QR. |
| Firefox (Desktop) | Firefox 90+ | Staff management pages. |
| Edge (Desktop) | Edge 90+ (Chromium based) | Cashier POS terminal. |
| Android | Android 11+ (API level 30) | Khach QR tai ban, khach online. |
| iOS | iOS 14+ | Khach QR tai ban. |

**C. Touch & Accessibility**
- Touch target size: Tat ca nut interactive phai >= 44x44 CSS px (WCAG 2.1 guideline).
- Font size: Body text toi thieu 14px. Khong dung don vi nho hon rem = 0.875rem.
- Contrast ratio: Text chinh >= 4.5:1. Large text >= 3:1 (WCAG AA).
- No horizontal scroll: Trang khong duoc scroll ngang tren mobile (max-width: 100vw).
- KDS text: KDS order card su dung chu cua >= 16px, ten mon >= 18px de bep doc tu xa 1-2 met.

**D. Test Coverage**
| Test Type | Tool / Process |
| --- | --- |
| Cross-browser test | BrowserStack hoac Playwright multi-browser: Chrome, Safari, Firefox, Edge. |
| Mobile emulation | Chrome DevTools: iPhone 12 (390px), Pixel 5 (393px), iPad (820px). |
| Lighthouse Mobile | Run Lighthouse voi 'Mobile' preset. Target: Performance >= 70, Accessibility >= 85. |
| Real device (QA) | Test tren it nhat 1 iPhone (iOS 15+) va 1 Android device truoc moi major release. |

## 1.3.6  NFR-SEO — Tối Ưu Hóa Công Cụ Tìm Kiếm (SEO)
**Muc tieu:  **Trang /menu va cac trang san pham phai xuat hien tren Google khi khach hang tim kiem 'quan banh cuon [thanh pho]'. Nho Next.js 14 SSR/SSG de Google crawl duoc.

**A. Technical SEO Requirements**
| Requirement | Implementation Detail |
| --- | --- |
| Canonical URL | Moi trang co <link rel='canonical' href='...'/>. Khong de trung lap URL giua /menu va /menu?category=... |
| URL Than Thien | KHONG dung query param cho SEO page. /menu/banh-cuon thay vi /menu?id=123. Phan cap ro rang. |
| Meta Tag | <title> unique moi trang. <meta name='description'> 120-160 ki tu. <meta name='robots' content='index, follow'>. |
| Open Graph | og:title, og:description, og:image (anh san pham 1200x630px), og:url. De share len Zalo/Facebook. |
| sitemap.xml | /sitemap.xml tu dong sinh tu Next.js sitemap API. Bao gom: /menu, /products/[id], /combos. Submit Google Search Console. |
| robots.txt | /robots.txt cho phep crawl /menu, /products. Chan /dashboard, /cashier, /kitchen, /admin. |
| Core Web Vitals | Dap ung nguong Google Page Experience: LCP < 2.5s, FID < 100ms, CLS < 0.1 (dat duoc bang NFR-PERF). |
| Indexability | Trang cong khai: SSG hoac SSR (Next.js). KHONG dung client-only rendering cho noi dung SEO. |

**B. Structured Data — Schema.org**
| Schema Type | Applied To / Fields |
| --- | --- |
| Restaurant | Trang chu / /menu. Fields: name, address, telephone, servesCuisine, openingHours, priceRange. |
| Menu | Trang /menu. Liet ke tung MenuItem: name, description, offers.price, image. |
| MenuItem | Moi product card. Fields: name, description, image, offers.price, suitableForDiet. |
| BreadcrumbList | Trang chi tiet san pham. Home > Banh Cuon > [Ten san pham]. Giup rich snippets. |
| WebSite / SearchAction | Trang chu. Khai bao sitelinks searchbox neu Google hien thi. |

// Schema.org JSON-LD example — MenuItem (trong <script type='application/ld+json'>)

{

  "@context": "https://schema.org",

  "@type": "MenuItem",

  "name": "Banh Cuon Thit",

  "description": "Banh cuon nhan thit heo xay...",

  "image": "https://cdn.banhcuon.vn/products/banh-cuon-thit.jpg",

  "offers": { "@type": "Offer", "price": "45000", "priceCurrency": "VND" }

}

**C. SEO Monitoring & KPIs**
| KPI / Tool | Target / Detail |
| --- | --- |
| Lighthouse SEO Score | >= 90 / 100 tren trang /menu va /products. Check trong CI pipeline. |
| Google Search Console | Submit sitemap.xml. Monitor Coverage, Core Web Vitals, Mobile Usability reports. |
| Indexing Rate | >= 90% cac trang public duoc Google index sau 2 tuan deploy. |
| Rich Result Test | Schema.org Validator (validator.schema.org) pass khong loi cho moi loai markup. |
| Crawl Budget | robots.txt chan /dashboard, /cashier, /kitchen, /admin, /api/* de Google khong lang phi crawl budget. |

## 1.3.7  NFR-AVAIL — Khả Dụng (Availability)
**SLA Target:  **99.5% uptime = toi da 3 gio 39 phut 29 giay downtime moi thang. Ngoai cua so bao tri co ke hoach.

**A. Uptime SLA Breakdown**
| SLA Level | Max Downtime / Thang | Max Downtime / Nam |
| --- | --- | --- |
| 99.0% (minimum acceptable) | 7 gio 18 phut | 87 gio 36 phut |
| 99.5% (Phase 1 target) | 3 gio 39 phut  ← Target nay | 43 gio 49 phut |
| 99.9% (Phase 2 target) | 43 phut 49 giay | 8 gio 45 phut |
| Planned Maintenance | KHONG tinh vao downtime neu thong bao truoc 24h | Cua so bao tri: 2-4 AM, cuoi tuan |

**B. Health Check & Monitoring**
| Monitoring Component | Implementation |
| --- | --- |
| External Uptime Monitor | UptimeRobot (free tier): ping https://banhcuon.vn moi 5 phut. Alert email + Slack khi down. |
| Docker Health Checks | Moi service trong docker-compose co healthcheck: mysql (mysqladmin ping), redis (redis-cli ping), be (/health endpoint), fe. |
| BE Health Endpoint | GET /api/v1/health tra { status: 'ok', db: 'ok', redis: 'ok', version: '...' }. Caddy dung de upstream health check. |
| depends_on health | docker-compose: backend depends_on mysql (condition: service_healthy), redis (condition: service_healthy). |
| Alerting | Khi healthcheck fail: Docker restart policy (on-failure: 3). Alert truoc khi nguoi dung bao cao. |

**C. Docker Compose Resilience Config**
# docker-compose.yml — Resilience config

services:

  mysql:

    restart: unless-stopped

    healthcheck:

      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost']

      interval: 10s

      timeout: 5s

      retries: 5

  backend:

    restart: unless-stopped  # Tu dong restart khi crash

    depends_on:

      mysql: { condition: service_healthy }

      redis: { condition: service_healthy }

    deploy:

      restart_policy:

        condition: on-failure

        max_attempts: 3

        delay: 10s

**D. Incident Response**
| Severity | Dinh Nghia | Response Time | Quy Trinh |
| --- | --- | --- | --- |
| P0 — Critical | He thong down hoan toan (khong truy cap duoc) | < 15 phut | Alert ngay → DevOps + Lead → hotfix → postmortem 24h |
| P1 — High | Payment fail, KDS khong nhan don | < 1 gio | Alert → investigation → fix trong gio lam |
| P2 — Medium | Tinh nang bi loi, co workaround | < 4 gio | Ticket tao, fix trong sprint hien tai |
| P3 — Low | Bug nho, UI loi, khong anh huong nghiep vu | < 2 ngay lam | Ticket, fix sprint tiep theo |

## 1.3.8  NFR Acceptance Checklist (Tong Hop)
Day la danh sach kiem tra tong hop. Moi hang phai duoc xac nhan PASS truoc khi deploy production.

| ID | Criterion | Test Method | Result |
| --- | --- | --- | --- |
| PERF | Lighthouse Performance >= 80 tren Desktop, >= 70 tren Mobile | Lighthouse CI | [ ] PASS / FAIL |
| PERF | API p95 < 500ms tai 500 CCU (k6 test) | k6 load test | [ ] PASS / FAIL |
| PERF | LCP < 3s tren /menu trang chu (real device) | Chrome DevTools | [ ] PASS / FAIL |
| LOAD | 1.000 CCU: error rate < 1%, p95 < 500ms | k6 1000VU 5min | [ ] PASS / FAIL |
| LOAD | >= 50 concurrent WebSocket connections khong drop | k6 websockets | [ ] PASS / FAIL |
| SEC | HTTPS bat buoc, HTTP redirect sang HTTPS | curl -I http://... | [ ] PASS / FAIL |
| SEC | Khong tim thay access_token trong localStorage | Browser console | [ ] PASS / FAIL |
| SEC | SQL Injection test tren cac input field (OWASP ZAP) | OWASP ZAP scan | [ ] PASS / FAIL |
| SEC | Webhook sai HMAC → bi reject, payment khong update | Postman wrong sig | [ ] PASS / FAIL |
| SEC | Rate limit login hoat dong: 5 fail → 429 trong 15 phut | Automated loop test | [ ] PASS / FAIL |
| BACK | Backup daily job chay thanh cong, file co tren off-site storage | Check cron log + S3 | [ ] PASS / FAIL |
| BACK | Restore drill: khoi phuc staging tu backup, verify data, < 4 gio | Manual drill | [ ] PASS / FAIL |
| PLAT | Layout dung tren iPhone (390px) va Android (360px) | BrowserStack / real device | [ ] PASS / FAIL |
| PLAT | KDS fullscreen hoat dong tren tablet 768px, chu to, nut de bam | Manual test | [ ] PASS / FAIL |
| SEO | Lighthouse SEO score >= 90 tren /menu | Lighthouse | [ ] PASS / FAIL |
| SEO | sitemap.xml accessible, submit Google Search Console | curl + GSC | [ ] PASS / FAIL |
| SEO | Schema.org MenuItem valid (schema.org validator) | Validator tool | [ ] PASS / FAIL |
| AVAIL | UptimeRobot configured va alert duoc gui khi down | Manual trigger test | [ ] PASS / FAIL |
| AVAIL | Docker restart policy: backend tu restart sau crash (on-failure: 3) | docker stop + watch | [ ] PASS / FAIL |
| AVAIL | GET /api/v1/health tra { status:'ok', db:'ok', redis:'ok' } | curl test | [ ] PASS / FAIL |

BanhCuon System — SRS v1.1 — Section 1.3 NFR — Thang 4/2026 — Confidential