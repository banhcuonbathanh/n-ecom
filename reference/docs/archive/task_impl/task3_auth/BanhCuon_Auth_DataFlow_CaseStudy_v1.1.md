| 🍜  BANH CUON SYSTEM — AUTH MODULE
DATA FLOW & CASE STUDY  │  Go Gin · JWT · bcrypt · Redis · MySQL
v1.1  ·  Updated after Code Review  ·  Thang 4 / 2026 |
| --- |

| Pham Vi: Auth module xu ly 4 viec: (1) xac thuc danh tinh bang bcrypt, (2) cap JWT access + refresh token, (3) bao ve moi request qua middleware, (4) thu hoi token khi logout bang Redis blacklist. |
| --- |

# Section 0 — Tong Quan Auth Module
## 0.1 — File Structure & Trach Nhiem
| ✅ UPDATED v1.1: Added pkg/crypto/hash.go (new shared hash utility extracted from auth_repo + auth_service). |
| --- |

| File | Package | Trach Nhiem Chinh |
| --- | --- | --- |
| pkg/jwt/jwt.go | jwt | Tao / verify JWT. Generate random refresh token. Redis key helpers. newJTI() thay newUUID(). |
| pkg/bcrypt/bcrypt.go | bcrypt | Hash password bcrypt cost=12. Verify gia tri bang timing-safe compare. |
| pkg/crypto/hash.go | crypto | ✅ NEW — HashToken(raw) SHA256 chung. Thay the hashRaw() trong service va hashToken() trong repo — ngan duplicate. |
| internal/repository/auth_repo.go | repository | Wraps sqlc Querier + Redis. toNullString() chuyen string -> sql.NullString. CreateSession() co transaction. Rate limit Redis methods. |
| internal/service/auth_service.go | service | Business logic: Login (co rate limit), Refresh, Logout, Me, ValidateAccessToken. AppError mapping. slog thay fmt.Printf. |
| internal/middleware/auth.go | middleware | AuthRequired: extract Bearer -> verify -> inject claims vao gin.Context. |
| internal/middleware/rbac.go | middleware | RequireRole, AtLeast, RequireOwner, CustomerOrStaff — chay sau AuthRequired. |
| internal/handler/auth_handler.go | handler | 4 HTTP handlers. RegisterRoutes. Map service output -> JSON response. |

## 0.2 — Cac Endpoint Auth
| Method | Endpoint | Role | Mo Ta Ngan |
| --- | --- | --- | --- |
| POST | /api/v1/auth/login | Public | Xac thuc + cap access token (JSON) + refresh token (httpOnly cookie). Co rate limit: login_fail:{ip} max 5 lan. |
| POST | /api/v1/auth/refresh | Public | Doc cookie -> cap access token moi (khong doi refresh token) |
| POST | /api/v1/auth/logout | Any auth | Xoa session DB + blacklist JTI trong Redis |
| GET | /api/v1/auth/me | Any auth | Tra ve thong tin staff hien tai (doc tu DB, khong chi tu claims) |

## 0.3 — Token Design
| Security: Access token TUYET DOI KHONG duoc luu vao localStorage — XSS co the doc duoc. Refresh token trong httpOnly cookie: JS khong the truy cap. SHA256(raw_token) moi duoc luu vao DB — raw token chi ton tai trong memory va cookie. |
| --- |

| Token | TTL | Luu o Dau | Truyen Nhu The Nao | Thu Hoi Bang Cach Nao |
| --- | --- | --- | --- | --- |
| Access Token | 24 gio | Zustand (RAM) — KHONG localStorage | Authorization: Bearer <token> | Redis blacklist logout:{jti} khi logout |
| Refresh Token | 30 ngay | httpOnly Secure cookie /api/v1/auth | Browser tu dong dinh kem (khong JS nao doc duoc) | DELETE refresh_tokens row trong MySQL |

# Section 1 — Data Flow Chi Tiet
## 1.1 — Login Flow
| POST /api/v1/auth/login  ·  Input: { username, password }  ·  Output: access_token (JSON) + refresh_token (cookie) |
| --- |

| ✅ UPDATED v1.1: Steps 1A-1C added (rate limit). Steps 7-8 now run inside a DB transaction (atomic). Step 9 added (ResetLoginFail on success). |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1A | AuthRepo (Redis) | GetLoginFailCount('login_fail:{ip}'): kiem tra so lan that bai tu IP nay. Neu >= 5 -> 429 COMMON_003 'Qua nhieu lan thu. Vui long thu lai sau 15 phut' | Block ngay — khong cham den DB hay bcrypt |
| 1 | Client (Browser) | POST /api/v1/auth/login { username, password } | JSON body den Gin router |
| 2 | Handler | ShouldBindJSON(&loginRequest) — validate: required, min=3,max=50 / min=8,max=100 | LoginInput hop le hoac 400 COMMON_001 |
| 3 | AuthService.Login | repo.GetByUsername(ctx, username) -> sqlc SELECT staff WHERE username=? AND deleted_at IS NULL | Staff row hoac sql.ErrNoRows |
| 4 | AuthService.Login | SECURITY: neu ErrNoRows -> chay bcrypt.Verify(fake_hash, password) de waste ~80ms. IncrLoginFail(ctx, IP) tang counter. | Luon mat ~80ms du user ton tai hay khong |
| 5 | AuthService.Login | Kiem tra staff.IsActive == true. bcrypt.Verify(staff.PasswordHash, password) — cost=12, timing-safe. Neu sai: IncrLoginFail(ctx, IP). | nil = hop le; ErrInvalidCredentials = sai + counter++ |
| 1B | AuthRepo (Redis) | IncrLoginFail(ctx, IP): INCR login_fail:{ip} + EXPIRE 15 phut (pipeline, atomic). Goi sau MOI lan that bai (no-user, inactive, wrong-pw). | Counter tang len. Khi dat 5 -> step 1A se block |
| 6 | pkg/jwt | GenerateTokenPair(staffID, role): tao jti=newJTI(), sign HMAC-SHA256, exp=now+24h. Generate 32-byte random hex refresh | TokenPair{ AccessToken, RefreshToken } |
| 1C | AuthRepo (Redis) | ResetLoginFail(ctx, IP): DEL login_fail:{ip}. Goi khi login THANH CONG de xoa counter cu. | IP duoc xoa history — fresh start cho cac request sau |
| 7 | AuthRepo (TX) | BEGIN TRANSACTION: CountActiveSessionsByStaffID() >= 5 ? DeleteOldestSessionByStaffID(LRU) : skip. INSERT refresh_tokens(SHA256(raw), expires_at, UA, IP). COMMIT. | Atomic — khong the co race condition. Max 5 sessions dam bao. |
| 8 | Handler | SetRefreshCookie(rawToken): HttpOnly Secure SameSite=Strict Path=/api/v1/auth Max-Age=2592000 | Cookie set — JS khong the doc (XSS safe) |
| 9 | Handler | JSON 200 { access_token, staff{ id, username, role, full_name } } | FE luu access_token vao Zustand. KHONG vao localStorage |

## 1.2 — Request Authentication Flow (moi API call)
| Moi request den protected endpoint deu di qua pipeline nay truoc khi vao handler. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | Dinh kem header: Authorization: Bearer <access_token> | Header co trong request |
| 2 | AuthRequired MW | extractBearer(header) — trim prefix 'Bearer '. Neu rong -> 401 AUTH_001 | Token string sach |
| 3 | AuthService | jwtpkg.ParseClaims(tokenStr): verify chu ky HMAC-SHA256 + exp timestamp | Claims{ sub=staffID, role, jti, exp } hoac ErrTokenExpired / ErrTokenInvalid |
| 4 | AuthRepo (Redis) | rdb.Exists('logout:{jti}'): kiem tra token bi blacklist sau logout | Neu ton tai -> ErrTokenRevoked -> 401 AUTH_001 |
| 5 | AuthRequired MW | c.Set('auth_claims', claims), c.Set('auth_staff_id', sub), c.Set('auth_role', role) | Claims available cho moi handler / RBAC phia sau |
| 6 | RBAC MW | RequireRole(...) hoac AtLeast(minRole): doc role tu gin.Context, so sanh voi roleLevel map | Pass -> c.Next(). Fail -> 403 AUTH_003 |
| 7 | Handler | ClaimsFromContext(c) hoac StaffIDFromContext(c) — lay thong tin xac thuc da verify | Handler xu ly request voi bao dam xac thuc |

## 1.3 — Token Refresh Flow
| POST /api/v1/auth/refresh  ·  Khong can body — doc tu cookie. FE Interceptor goi tu dong khi nhan 401. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | FE Interceptor | Bat 401 Unauthorized tu bat ky API call. Tu dong POST /api/v1/auth/refresh (khong body) | Browser tu dong gui cookie — user khong hay biet |
| 2 | Handler.Refresh | RefreshTokenFromCookie(c): doc raw token tu cookie 'refresh_token'. Neu khong co -> 401 AUTH_002 | Raw refresh token string |
| 3 | AuthRepo | GetSessionByRawToken(raw): tinh crypto.HashToken(raw) -> SELECT refresh_tokens WHERE token_hash=? | RefreshToken row hoac sql.ErrNoRows -> AUTH_002 |
| 4 | AuthService | Kiem tra row.ExpiresAt > time.Now(). Neu het han -> AUTH_002 | Session con hieu luc |
| 5 | AuthRepo | GetByID(row.StaffID): lay staff hien tai voi role MOI NHAT (co the role da thay doi sau khi login) | Staff row voi role cap nhat |
| 6 | AuthService | Kiem tra staff.IsActive. GenerateTokenPair(staffID, currentRole): access token moi 24h | Access token moi voi role chinh xac |
| 7 | AuthRepo (async) | go TouchSession(raw): UPDATE last_used_at=NOW() — chay background, non-blocking, best-effort | Audit trail cho admin. Khong anh huong den response time |
| 8 | Handler | JSON 200 { access_token: '<new_token>' } | FE cap nhat Zustand. Retry original request voi token moi |

## 1.4 — Logout Flow
| POST /api/v1/auth/logout  ·  Yeu cau: Bearer token + cookie. Thu hoi 2 lan: DB row (refresh) + Redis blacklist (access). |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | POST /api/v1/auth/logout  Authorization: Bearer <access_token> + cookie tu dong | Ca 2 tokens co trong request |
| 2 | AuthRequired MW | Xac thuc access token binh thuong -> inject claims vao context (co jti) | Claims voi jti san sang de blacklist |
| 3 | Handler.Logout | ClaimsFromContext(c) lay claims. RefreshTokenFromCookie(c) lay raw refresh token | Ca 2 tokens san sang |
| 4 | AuthService.Logout | repo.RevokeSession(rawToken): DELETE refresh_tokens WHERE token_hash=crypto.HashToken(raw) | Session bi xoa -> refresh khong the dung nua |
| 5 | AuthService.Logout | Tinh remaining = claims.ExpiresAt - time.Now(). repo.BlacklistJTI(jti, remaining) | Redis SET logout:{jti} = '1' EX <remaining_seconds> |
| 6 | Handler | ClearRefreshCookie(c): Set-Cookie: refresh_token=; Max-Age=-1 | Cookie bi xoa khoi browser |
| 7 | Handler | JSON 200 { message: 'Dang xuat thanh cong' } | Xuat thanh cong. Token cu khong the dung duoc nua |

| Fail-open policy: Neu Redis down, ValidateAccessToken() chap nhan token (fail-open) de tranh Redis outage lam sap toan bo auth. DB session row la security guarantee cung hon — neu da xoa thi refresh khong the tao token moi. |
| --- |

## 1.5 — Get Me Flow
| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | GET /api/v1/auth/me  Authorization: Bearer <token> | Request voi Bearer token |
| 2 | AuthRequired MW | Xac thuc token -> inject claims (staffID, role) vao gin.Context | Claims san sang |
| 3 | Handler.Me | StaffIDFromContext(c) -> lay staffID tu claims | staffID string |
| 4 | AuthService.Me | repo.GetByID(ctx, staffID): SELECT id, username, role, full_name, is_active WHERE id=? AND deleted_at IS NULL | Staff row KHONG co password_hash |
| 5 | AuthService.Me | Kiem tra staff.IsActive. Neu false -> ErrTokenInvalid (tai khoan bi vo hieu hoa sau khi cap token) | Bao ve truong hop account bi khoa sau khi da login |
| 6 | Handler | JSON 200 { id, username, role, full_name } | Profile sach, khong bao gio expose password_hash |

# Section 2 — RBAC Middleware Reference
| 3 loai middleware RBAC. Phai chain SAU AuthRequired. Doc role tu gin.Context — khong parse lai JWT. |
| --- |

## 2.1 — Role Hierarchy & Levels
| Role | Level | Pham Vi Truy Cap | Ghi Chu |
| --- | --- | --- | --- |
| customer | 0 | Menu, dat don, theo doi don cua minh, huy (<30%) | Isolated — khong thuoc staff hierarchy |
| chef | 1 | Xem KDS, cap nhat qty_served, flag mon | Peer voi cashier (cung level 1) |
| cashier | 1 | Tao don POS, xu ly thanh toan, upload anh | Peer voi chef (cung level 1) |
| staff | 2 | Chef + Cashier + upload file | Nguong de AtLeast('staff') pass |
| manager | 3 | Staff + Dashboard, Reports, CRUD san pham/kho | Co the act on any resource (RequireOwner) |
| admin | 4 | Manager + cau hinh he thong, xoa data, quan ly accounts | Cap cao nhat, moi quyen |

## 2.2 — 3 Loai RBAC Middleware
| Middleware | Dung Khi Nao | Vi Du Su Dung |
| --- | --- | --- |
| RequireRole(roles...) | Chi mot so role cu the duoc phep. Whitelist chinh xac. | RequireRole("admin") — chi admin moi xoa duoc account |
| AtLeast(minRole) | Role >= minRole trong hierarchy. Dung cho pham vi rong hon. | AtLeast("cashier") — cashier, staff, manager, admin |
| RequireOwner(fn) | Chi resource owner HOAC manager/admin. Dung cho du lieu ca nhan. | Cancel don: customer chi huy don cua minh, manager huy bat ky don |

| // Chain order (quan trong — phai dung thu tu nay):
router.PATCH('/api/v1/orders/:id/cancel',
    middleware.AuthRequired(authSvc),              // 1. Xac thuc token
    middleware.RequireOwner(func(c *gin.Context) string {
        return orderSvc.GetCreatedBy(c.Param('id'))// 2. Lay owner ID
    }),
    orderHandler.Cancel,                           // 3. Handler
) |
| --- |

## 2.3 — Error Codes Auth
| ✅ UPDATED v1.1: COMMON_003 / HTTP 429 added — rate limit exceeded from new login rate limiting. |
| --- |

| Code | HTTP | Nguyen Nhan | Middleware / Layer |
| --- | --- | --- | --- |
| AUTH_001 | 401 | Token het han, sai chu ky, hoac bi blacklist sau logout | AuthRequired MW -> AuthService.ValidateAccessToken |
| AUTH_002 | 401 | Refresh token khong co trong cookie, sai hash, hoac het han | Handler.Refresh -> AuthService.Refresh |
| AUTH_003 | 403 | Role khong du quyen theo RequireRole / AtLeast / RequireOwner | RBAC MW (chay sau AuthRequired) |
| COMMON_003 | 429 | Qua 5 lan dang nhap that bai trong 15 phut tu cung IP | ✅ NEW — AuthService.Login -> GetLoginFailCount >= 5 -> ErrRateLimited |
| COMMON_001 | 400 | Request body validation fail (required, min/max length) | Handler (ShouldBindJSON) |
| COMMON_002 | 500 | Unexpected internal error | handleServiceError fallback |

| // Error Response Format (moi loi deu tra ve dung cu phap nay):
{
  "code":    "AUTH_001",
  "message": "Token da het han"
} |
| --- |

# Section 3 — Case Studies

| Case Study 1  ·  Login Thanh Cong — Chef Dang Nhap Vao He Thong
Actor: Chef · Handler -> Service -> bcrypt -> JWT -> DB -> Redis |
| --- |

| ✅ UPDATED v1.1: Step 1A added (rate limit check). Step 6 now wraps COUNT+DELETE+INSERT in transaction. Step 8A added (ResetLoginFail on success). |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1A | AuthRepo (Redis) | GetLoginFailCount('login_fail:10.0.0.5') -> 0. Chua qua gioi han. | Pass — tiep tuc xu ly |
| 1 | Chef Browser | POST /auth/login { username: "chef01", password: "Secret@123" } | JSON body |
| 2 | Handler | ShouldBindJSON pass. Goi AuthService.Login(ctx, LoginInput{username, password, UA, IP}) | LoginInput hop le |
| 3 | AuthRepo | sqlc: SELECT id, username, password_hash, role, full_name, is_active FROM staff WHERE username='chef01' AND deleted_at IS NULL | Staff row: role='chef', is_active=true |
| 4 | pkg/bcrypt | bcrypt.CompareHashAndPassword(hash, 'Secret@123') — cost=12, mat ~80ms | nil (match) -> tiep tuc |
| 5 | pkg/jwt | GenerateTokenPair('staff-uuid-001', 'chef'): jti=newJTI(), exp=now+24h, sign HS256. Raw refresh=64-char hex | AccessToken='eyJ...', RefreshToken='a3f9...' |
| 8A | AuthRepo (Redis) | ResetLoginFail(ctx, '10.0.0.5'): DEL login_fail:10.0.0.5. Login thanh cong -> xoa counter. | Counter xoa. IP bat dau fresh |
| 6 | AuthRepo (TX) | BEGIN TRANSACTION: CountActiveSessionsByStaffID('staff-uuid-001') -> 1 < 5. INSERT refresh_tokens(crypto.HashToken('a3f9...'), expires_at=now+30d, UA='Chrome/...', ip='10.0.0.5'). COMMIT. | Session row duoc tao atomic. Raw token KHONG BAO GIO vao DB |
| 7 | Handler | SetRefreshCookie('a3f9...'): HttpOnly Secure SameSite=Strict Path=/api/v1/auth Max-Age=2592000 | Cookie set — JS khong the doc |
| 8 | Handler | JSON 200 { access_token: "eyJ...", staff: { id, username: "chef01", role: "chef", full_name: "Nguyen Van A" } } | Chef luu access_token vao Zustand |

| Case Study 2  ·  Login That Bai — Timing Attack Defense & Rate Limiting
Actor: Attacker · AuthService · Redis |
| --- |

| Security Goal: (1) Attacker khong the phan biet 'username khong ton tai' voi 'sai password' — response time phai giong nhau. (2) Sau 5 lan that bai, IP bi khoa 15 phut. |
| --- |

| ✅ UPDATED v1.1: IncrLoginFail steps added sau moi lan that bai (buoc 1B va 2B). Rate limit block case added (buoc 0). |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 0 | Attacker (lan thu 6) | POST /auth/login { username: 'any', password: 'any' } — da co 5 lan that bai truoc | AuthRepo: GetLoginFailCount -> 5 >= 5 -> 429 COMMON_003 'Qua nhieu lan thu'. Khong cham bcrypt hay DB. |
| — | — | ─── TRUONG HOP A: Username khong ton tai ─── | ───────────────────────────────────── |
| 1A | Attacker | POST /auth/login { username: "notexist", password: "anything" } (lan dau) | JSON body |
| 2A | AuthRepo | sqlc: SELECT ... WHERE username='notexist' -> sql.ErrNoRows | Khong co row nao |
| 3A | AuthService | errors.Is(err, sql.ErrNoRows) -> bcrypt.Verify('$2a$12$invalid...', 'anything') de waste ~80ms | Luon mat ~80ms giong nhu truong hop co user |
| 1B | AuthRepo (Redis) | IncrLoginFail(ctx, IP): INCR login_fail:{ip} + EXPIRE 15min (pipeline). Return ErrInvalidCredentials. | Counter tang 1 -> 2 -> ... -> 5 roi bi block |
| — | — | ─── TRUONG HOP B: Sai password ─── | ───────────────────────────────────── |
| 4B | AuthRepo | SELECT ... WHERE username='chef01' -> Staff row tim thay | Co row |
| 5B | pkg/bcrypt | bcrypt.CompareHashAndPassword(realHash, 'WrongPass') -> bcrypt.ErrMismatch | Sai password, mat ~80ms |
| 2B | AuthRepo (Redis) | IncrLoginFail(ctx, IP): INCR login_fail:{ip} + EXPIRE 15min. Return ErrInvalidCredentials. | Counter tang. Cung response nhu TH-A. |
| — | — | ─── KET QUA CA 2 TRUONG HOP ─── | ───────────────────────────────────── |
| END | Handler | JSON 401 { code: 'AUTH_001', message: 'Thong tin dang nhap khong hop le' } — y het nhau | Attacker khong biet username co ton tai khong. Counter tang. |

| Case Study 3  ·  Access Token Expired — FE Interceptor Silent Refresh
Actor: Customer Browser · FE Interceptor · AuthService |
| --- |

| Sau 24h, access token het han. FE Interceptor tu dong refresh ma khong gian doan UX. User khong thay bat ky thong bao gi. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer FE | GET /api/v1/orders  Authorization: Bearer <expired_token>  (token het han sau 24h) | Request voi token cu |
| 2 | AuthRequired MW | jwt.ParseClaims(expired_token) -> jwt.ErrTokenExpired -> ErrTokenExpired | HTTP 401 { code:'AUTH_001', message:'Token da het han' } |
| 3 | FE Interceptor | Bat 401. Flag 'refreshing=true' de khong gui nhieu refresh request cung luc (deduplicate) | Refresh deduplicated |
| 4 | FE Interceptor | POST /api/v1/auth/refresh (khong body — browser tu dong gui httpOnly cookie) | Refresh request den BE |
| 5 | Handler.Refresh | RefreshTokenFromCookie -> crypto.HashToken -> SELECT DB -> validate ExpiresAt. GetByID lay role moi nhat | Token con han, role hien tai cua customer |
| 6 | AuthService | GenerateTokenPair(customerID, 'customer') -> access token moi 24h. go TouchSession() background | New access token |
| 7 | FE Interceptor | Cap nhat Zustand voi token moi. Flag 'refreshing=false'. Retry original GET /api/v1/orders | Retry voi token moi |
| 8 | Customer | Nhan du lieu orders binh thuong — khong thay bat ky man hinh login nao | UX seamless, trong suot hoan toan |

| Case Study 4  ·  Logout — Thu Hoi Token Ngay Lap Tuc Truoc Khi Het Han
Actor: Cashier · AuthService · Redis · MySQL |
| --- |

| Cashier logout. Access token van con 18 gio. He thong phai dam bao token nay khong the dung nua du chua het han tu nhien. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Cashier | POST /api/v1/auth/logout  Authorization: Bearer <valid_token_18h_left> | Token con 18h nua moi het han |
| 2 | AuthRequired MW | ParseClaims -> hop le. Inject claims{ jti='abc-def', exp=now+18h, role='cashier' } vao context | Claims co jti |
| 3 | Handler.Logout | ClaimsFromContext: jti='abc-def'. RefreshTokenFromCookie: raw='a3f9...' | Ca 2 tokens san sang |
| 4 | AuthService | repo.RevokeSession('a3f9...'): DELETE FROM refresh_tokens WHERE token_hash=crypto.HashToken('a3f9...') | Session xoa khoi DB — refresh khong the dung nua |
| 5 | AuthService | remaining = 18 gio. repo.BlacklistJTI('abc-def', 18h): Redis SET logout:abc-def = '1' EX 64800 | Redis blacklist: token bi block 18h toi khi het han tu nhien |
| 6 | Handler | ClearRefreshCookie: Set-Cookie: refresh_token=; Max-Age=-1 | Cookie bi xoa khoi browser |
| 7 | Handler | JSON 200 { message: 'Dang xuat thanh cong' } | Logout hoan tat |
| 8 | Attacker (stolen token) | Thu dung lai Bearer token bi danh cap sau logout | AuthMiddleware: Redis EXISTS logout:abc-def = 1 -> 401 AUTH_001 'Token da bi thu hoi' |

| Case Study 5  ·  Session Cap — Nhan Vien Dang Nhap Qua 5 Thiet Bi (Atomic)
Actor: Manager · AuthRepo · MySQL Transaction |
| --- |

| ✅ UPDATED v1.1: Steps 2-4 gio chay trong 1 transaction (BEGIN/COMMIT). Race condition da duoc fix — 2 login dong thoi khong the bypass cap. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Manager | Dang nhap tren thiet bi thu 6 (da co 5 sessions: PC, Laptop, iPad, Phone1, Phone2) | Login attempt thu 6 |
| 2-4 | AuthRepo (TX) | BEGIN TRANSACTION: CountActiveSessionsByStaffID(managerID) -> 5 >= max(5). DeleteOldestSessionByStaffID(managerID): xoa 'Phone1' (it dung nhat theo last_used_at ASC). INSERT session moi. COMMIT. | Atomic. Khong co race giua 2 login dong thoi. Session 'Phone1' bi xoa. |
| 5 | Phone1 | Thu goi /auth/refresh voi cookie cua Phone1 — row da bi xoa | AuthService.Refresh: sql.ErrNoRows -> AUTH_002 'Refresh token khong hop le' |
| 6 | Phone1 FE | Interceptor nhan AUTH_002 tu refresh endpoint -> clear token -> redirect /login | Phone1 bi dang xuat, manager phai dang nhap lai neu muon dung |

| Case Study 6  ·  RBAC — Customer Thu Truy Cap Admin Endpoint
Actor: Customer · RBAC Middleware · RequireRole |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer | GET /api/v1/staff  (endpoint chi cho admin/manager) — dung access token hop le cua minh | Token hop le nhung role=customer |
| 2 | AuthRequired MW | ParseClaims hop le. claims.Role='customer'. Inject vao context. | Context co role='customer' |
| 3 | RBAC MW | RequireRole("admin", "manager"): roleLevel["customer"]=0, allowed={admin:4, manager:3}. 0 khong co trong whitelist | HTTP 403 { code: 'AUTH_003', message: 'Khong du quyen truy cap' } |
| 4 | Handler | Khong bao gio duoc goi — abort tai buoc 3 | Request bi block truoc khi vao handler |
| — | — | ─── TRUONG HOP KHAC: Chef thu truy cap Dashboard (AtLeast manager) ─── | ───────── |
| 5 | Chef | GET /api/v1/dashboard — AtLeast('manager') required | Token hop le, role='chef' |
| 6 | RBAC MW | AtLeast("manager"): roleLevel["chef"]=1 < roleLevel["manager"]=3 | HTTP 403 { code: 'AUTH_003' } — chef bi chan |

# Section 4 — Security Considerations
| ✅ UPDATED v1.1: Added brute force / credential stuffing row (new rate limiting defense). |
| --- |

| Moi De Doa | Bien Phap Bao Ve | Implementation |
| --- | --- | --- |
| XSS doc access token | Khong bao gio luu vao localStorage / sessionStorage | Zustand in-memory. Token mat khi reload (dung — refresh se lay lai tu cookie) |
| XSS doc refresh token | httpOnly cookie: JS khong the truy cap | HttpOnly Secure SameSite=Strict — browser gui tu dong, JS mu |
| Username enumeration (timing) | Luon chay bcrypt du user co ton tai hay khong | Fake hash bcrypt.Verify khi sql.ErrNoRows — mat ~80ms nhu that |
| Brute force / credential stuffing | login_fail:{ip} Redis counter max 5 lan, khoa 15 phut | ✅ NEW — IncrLoginFail + GetLoginFailCount trong auth_repo.go. Pipeline atomic. |
| Token replay sau logout | Redis blacklist logout:{jti} voi TTL = remaining access TTL | Neu Redis down: fail-open (accept). DB row la hard guarantee |
| Session hijack (refresh token) | SHA256(raw) moi vao DB — raw chi trong cookie | Ke tan cong lay duoc DB khong dung duoc hash de refresh |
| CSRF (refresh endpoint) | SameSite=Strict cookie: khong gui trong cross-site request | Attacker khong the trigger /auth/refresh tu domain khac |
| Session bung no | Max 5 sessions per staff — LRU eviction trong transaction | ✅ UPDATED — Login thu 6 xoa session cu nhat. Atomic: race condition da duoc fix. |
| Role escalation | Role lay tu DB moi lan refresh — khong chi tin vao JWT claims | GetByID() khi refresh tra ve role hien tai, khong phai role luc login |

🍜  BanhCuon System  ·  Auth Module  ·  Data Flow & Case Study  ·  v1.1  ·  Thang 4/2026