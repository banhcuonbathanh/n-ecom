| BANH CUON SYSTEM — AUTH MODULE
DATA FLOW & CASE STUDY  —  Complete Explanation with Visual Diagrams
Go Gin · JWT · bcrypt · Redis · MySQL  ·  v1.2  ·  Thang 4 / 2026 |
| --- |

| Pham vi tai lieu nay: Giai thich day du bang ca van ban va so do truc quan toan bo Auth Module — bao gom 4 data flows chinh (Login, Request Auth, Refresh, Logout), he thong RBAC 6 roles, 9 case studies co that, va QR Guest Session design (v1.2). Moi section bao gom 'tai sao' (why), 'cai gi' (what), va 'nhu the nao' (how). |
| --- |

# Section 0 — Tong Quan Auth Module
| Auth Module Lam Gi?
Auth module xu ly 4 nhiem vu cot loi: (1) Xac thuc danh tinh bang bcrypt cost=12 — timing-safe, chong brute force. (2) Cap JWT access token (24h, in-memory) + refresh token (30d, httpOnly cookie) sau khi xac thuc thanh cong. (3) Bao ve moi API request qua AuthRequired middleware — verify JWT, check Redis blacklist, inject claims vao context. (4) Thu hoi token khi logout — xoa DB row (refresh) va blacklist JTI trong Redis (access). Tat ca thiet ke xung quanh 3 nguyen tac: zero localStorage (XSS-safe), timing-safe responses (chong enumeration), va dual-path revocation (DB + Redis). |
| --- |

**0.1 — File Structure & Trach Nhiem Tung File**
| File | Trach Nhiem Chinh |
| --- | --- |
| pkg/jwt/jwt.go | Tao / verify JWT (HS256). Generate random refresh token 32-byte. Redis key helpers. newJTI() unique per token. |
| pkg/bcrypt/bcrypt.go | Hash password bcrypt cost=12. Verify bang timing-safe compare (~80ms bat ke dung sai). |
| pkg/crypto/hash.go | [NEW v1.1] SHA256 chung cho token hashing. Thay the code trung lap giua service va repo. |
| internal/repository/auth_repo.go | Wraps sqlc Querier + Redis. CRUD sessions. Rate limit Redis methods. Transaction-aware. |
| internal/service/auth_service.go | Business logic: Login (rate limit), Refresh, Logout, Me, ValidateAccessToken. AppError mapping. |
| internal/middleware/auth.go | AuthRequired: extract Bearer -> verify -> inject claims vao gin.Context cho moi handler sau. |
| internal/middleware/rbac.go | RequireRole, AtLeast, RequireOwner, CustomerOrStaff — chain SAU AuthRequired. |
| internal/handler/auth_handler.go | 4 HTTP handlers. RegisterRoutes. Map service output -> JSON response. Cookie management. |

**0.2 — Token Design: Tai Sao 2 Tokens?**
| Access Token vs Refresh Token — Phan Tach Vai Tro
Access token (24h, Zustand RAM): Ngan hon de giam thoi gian exposure neu bi danh cap. Khong vao localStorage vi XSS co the doc. Het han -> FE Interceptor tu dong goi refresh ma khong interrupt UX.

Refresh token (30d, httpOnly cookie): Ton tai lau hon. httpOnly = JS hoan toan khong the doc — XSS mu hoan toan. Browser tu dong gui cookie voi moi request den /api/v1/auth/*. Chi SHA256(raw) vao DB — key bi lo khong dung duoc.

Su phan tach nay tao defense-in-depth: neu access token bi lo (man hinh, log), no het han sau 24h. Neu refresh token bi lo, ke tan cong phai biet CA URL va domain — bi chan boi SameSite=Strict. |
| --- |

# Section 1 — Data Flow Chi Tiet
## 1.1 — Login Flow: POST /api/v1/auth/login
| Giai Thich Tong The Login Flow
Login flow co 3 giai doan chinh:

GIAI DOAN 1 — KIEM TRA TRUOC (Steps 1A): Rate limiter check truoc tien. Neu IP da that bai >= 5 lan trong 15 phut, tra ve 429 ngay — khong cham den DB hay bcrypt. Nay cuc ky quan trong vi bcrypt cost=12 mat ~80ms, va Redis la fast-path, tiet kiem resource server.

GIAI DOAN 2 — XAC THUC (Steps 1-5): Lay staff record tu DB -> bcrypt verify password (luon mat ~80ms du user co hay khong, chong timing attack). Neu that bai -> IncrLoginFail -> counter tang.

GIAI DOAN 3 — TAO SESSION (Steps 6-9): Generate TokenPair (JWT access + raw refresh). DB Transaction (atomic): dem sessions hien co, xoa cai cu nhat neu >= 5 (LRU), INSERT refresh token hash. Set httpOnly cookie. ResetLoginFail xoa counter. Tra access_token qua JSON. |
| --- |

*Hinh 1.1 — Login Flow: Swimlane diagram 5 actors. Mau: cam=primary path, do=error/block, xanh la=success path.*

**Sequence Steps — Login Flow**
| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1A | AuthRepo (Redis) | GetLoginFailCount('login_fail:{ip}'): kiem tra so lan that bai tu IP nay. Neu >= 5 -> 429 COMMON_003. | BLOCK 429 — khong cham DB/bcrypt |
| 1 | Client (Browser) | POST /api/v1/auth/login { username, password } | JSON body den Gin router |
| 2 | Handler | ShouldBindJSON(&loginRequest) — validate required, min=3/max=50, min=8/max=100 | LoginInput hop le hoac 400 COMMON_001 |
| 3 | AuthService | repo.GetByUsername(ctx, username) -> sqlc SELECT staff WHERE username=? AND deleted_at IS NULL | Staff row hoac sql.ErrNoRows |
| 4 | AuthService | SECURITY: neu ErrNoRows -> chay bcrypt.Verify(fake_hash) de waste ~80ms. IncrLoginFail tang counter. | Luon mat ~80ms du user co hay khong — chong timing attack |
| 5 | AuthService | Kiem tra staff.IsActive == true. bcrypt.Verify(staff.PasswordHash, password) cost=12, timing-safe. Sai -> IncrLoginFail. | nil = hop le; ErrInvalidCredentials -> counter++ |
| 1B | AuthRepo (Redis) | IncrLoginFail(ctx, IP): INCR login_fail:{ip} + EXPIRE 15 phut (pipeline, atomic). Goi sau MOI lan that bai. | Counter tang. Khi dat 5 -> step 1A se block |
| 6 | pkg/jwt | GenerateTokenPair(staffID, role): tao jti=newJTI(), sign HMAC-SHA256, exp=now+24h. Generate 32-byte random hex refresh token. | TokenPair{ AccessToken (JWT), RefreshToken (raw hex) } |
| 1C | AuthRepo (Redis) | ResetLoginFail(ctx, IP): DEL login_fail:{ip}. Goi khi login THANH CONG — xoa counter cu. | IP duoc xoa history, fresh start |
| 7 | AuthRepo (TX) | BEGIN TX: CountActiveSessionsByStaffID() >= 5 ? DeleteOldestSessionByStaffID(LRU by last_used_at ASC). INSERT refresh_tokens(SHA256(raw), expires_at, UA, IP). COMMIT. | Atomic — khong race condition. Max 5 sessions dam bao. |
| 8 | Handler | SetRefreshCookie(rawToken): HttpOnly Secure SameSite=Strict Path=/api/v1/auth Max-Age=2592000 | Cookie set — JS khong the doc (XSS safe) |
| 9 | Handler | JSON 200 { access_token, staff{ id, username, role, full_name } } | FE luu access_token vao Zustand RAM — KHONG localStorage |

## 1.2 — Request Authentication Flow: Moi API Call
| Tại Sao Pipeline Nay Quan Trong?
Moi request den protected endpoint PHAI di qua pipeline nay. Khong co shortcut nao. Muc dich: (1) verify chu ky JWT — dam bao token khong bi gia mao, (2) kiem tra Redis blacklist — dam bao token chua bi logout, (3) inject claims vao gin.Context — handler khong bao gio parse JWT truc tiep, chi doc tu context (single responsibility).

RBAC middleware chay SAU AuthRequired. No doc role tu context (khong parse lai JWT) va so sanh voi role requirement cua endpoint. Design nay dam bao authentication (ban la ai?) hoan toan tach biet voi authorization (ban duoc lam gi?). |
| --- |

*Hinh 1.2 — Auth Middleware Pipeline: Sequence diagram. Moi request protected phai qua tat ca 7 buoc.*

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | Dinh kem header: Authorization: Bearer <access_token> | Header co trong request |
| 2 | AuthRequired MW | extractBearer(header) — trim prefix 'Bearer '. Neu rong -> 401 AUTH_001 | Token string sach |
| 3 | AuthService | jwtpkg.ParseClaims(tokenStr): verify chu ky HMAC-SHA256 + exp timestamp | Claims{ sub=staffID, role, jti, exp } hoac ErrTokenExpired/Invalid |
| 4 | AuthRepo (Redis) | rdb.Exists('logout:{jti}'): kiem tra token bi blacklist sau logout | Ton tai -> ErrTokenRevoked -> 401 AUTH_001 |
| 5 | AuthRequired MW | c.Set('auth_claims', claims), c.Set('auth_staff_id', sub), c.Set('auth_role', role) | Claims available cho moi handler / RBAC phia sau |
| 6 | RBAC MW | RequireRole(...) hoac AtLeast(minRole): doc role tu gin.Context, so sanh voi roleLevel map | Pass -> c.Next(). Fail -> 403 AUTH_003 |
| 7 | Handler | ClaimsFromContext(c) hoac StaffIDFromContext(c) — lay thong tin xac thuc da verify | Handler xu ly request voi bao dam xac thuc |

## 1.3 — Token Refresh Flow: POST /api/v1/auth/refresh
| Silent Refresh — UX Khong Bi Gian Doan
Khi access token het han (sau 24h), FE Interceptor bat 401 va tu dong goi /auth/refresh. User khong biet dieu nay xay ra — man hinh khong bi refresh, khong co popup login. Dieu nay hoat dong vi httpOnly cookie duoc Browser tu dong dinh kem vao request refresh.

Deduplicate la rat quan trong: neu nhieu API calls cung het han dong thoi, Interceptor chi gui 1 refresh request (flag refreshing=true), cac request khac xep hang doi. Sau khi token moi san sang, retry tat ca.

Refresh lay role tu DB (GetByID) chu khong chi dung role trong JWT. Dieu nay dam bao neu admin thay doi role cua ai do, role moi se co hieu luc sau lan refresh tiep theo — khong can force logout. |
| --- |

*Hinh 1.3 — Token Refresh Flow. go TouchSession() chay async background — khong anh huong response time.*

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | FE Interceptor | Bat 401 Unauthorized tu bat ky API call. Tu dong POST /api/v1/auth/refresh (khong body). Flag refreshing=true (deduplicate). | Browser tu dong gui cookie — user khong hay biet |
| 2 | Handler.Refresh | RefreshTokenFromCookie(c): doc raw token tu cookie 'refresh_token'. Neu khong co -> 401 AUTH_002 | Raw refresh token string |
| 3 | AuthRepo | GetSessionByRawToken(raw): tinh crypto.HashToken(raw) -> SELECT refresh_tokens WHERE token_hash=? | RefreshToken row hoac sql.ErrNoRows -> AUTH_002 |
| 4 | AuthService | Kiem tra row.ExpiresAt > time.Now(). Neu het han -> AUTH_002 | Session con hieu luc |
| 5 | AuthRepo | GetByID(row.StaffID): lay staff hien tai voi role MOI NHAT (co the role da thay doi sau khi login) | Staff row voi role cap nhat — QUAN TRONG |
| 6 | AuthService | Kiem tra staff.IsActive. GenerateTokenPair(staffID, currentRole): access token moi 24h | Access token moi voi role chinh xac |
| 7 | AuthRepo (async) | go TouchSession(raw): UPDATE last_used_at=NOW() — chay background, non-blocking, best-effort | Audit trail cho admin. Khong anh huong response time |
| 8 | Handler | JSON 200 { access_token: '<new_token>' }. Flag refreshing=false. Retry original request. | FE cap nhat Zustand. Original request duoc retry tu dong. |

## 1.4 — Logout Flow: POST /api/v1/auth/logout
| Dual Revocation — Tai Sao Can 2 Buoc?
Logout phai thu hoi CA HAI tokens:

1) DELETE refresh_tokens row: Dam bao khong the tao access token moi tu refresh token nay. Day la 'hard guarantee' — neu Redis down, row da bi xoa nen attacker van khong the dung refresh token.

2) Redis blacklist logout:{jti}: Dam bao access token hien tai (con hang gio nua moi het han) khong the dung duoc. TTL = remaining time cua token — tu dong xoa khoi Redis khi token het han tu nhien, khong ton RAM.

Fail-open policy: Neu Redis down, ValidateAccessToken() chap nhan token (fail-open) de tranh Redis outage lam sap auth. DB session row la guarantee manh hon — attacker khong the tao token moi neu DB row da bi xoa. |
| --- |

*Hinh 1.4 — Logout Flow: Dual revocation (MySQL DELETE + Redis blacklist). Stolen token bi block ngay lap tuc.*

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | POST /api/v1/auth/logout. Authorization: Bearer <access_token> + cookie tu dong. | Ca 2 tokens co trong request |
| 2 | AuthRequired MW | Xac thuc access token binh thuong -> inject claims vao context (co jti) | Claims voi jti san sang de blacklist |
| 3 | Handler.Logout | ClaimsFromContext(c) lay claims. RefreshTokenFromCookie(c) lay raw refresh token | Ca 2 tokens san sang |
| 4 | AuthService | repo.RevokeSession(rawToken): DELETE refresh_tokens WHERE token_hash=crypto.HashToken(raw) | Session bi xoa -> refresh khong the dung nua |
| 5 | AuthService | Tinh remaining = claims.ExpiresAt - time.Now(). repo.BlacklistJTI(jti, remaining) | Redis SET logout:{jti} = '1' EX <remaining_seconds> |
| 6 | Handler | ClearRefreshCookie(c): Set-Cookie: refresh_token=; Max-Age=-1 | Cookie bi xoa khoi browser |
| 7 | Handler | JSON 200 { message: 'Dang xuat thanh cong' } | Logout hoan tat |
| 8 | Attacker (stolen token) | Thu dung lai Bearer token bi danh cap sau logout | AuthMiddleware: Redis EXISTS logout:{jti} = 1 -> 401 AUTH_001 'Token da bi thu hoi' |

## 1.5 — Get Me Flow: GET /api/v1/auth/me
| Tai Sao Khong Chi Tra Lai JWT Claims?
Handler.Me doc staff tu DB (GetByID) thay vi chi tra claims tu JWT. Co 2 ly do bao mat quan trong:

(1) Kiem tra is_active: Neu admin deactivate tai khoan sau khi staff da login, access token van con hop le den het 24h. GetByID phat hien is_active=false va tra ErrTokenInvalid, buoc staff phai login lai.

(2) Data freshness: full_name, email, phone co the da duoc cap nhat sau khi token duoc phat. Tra ve data moi nhat tu DB dam bao /auth/me luon chinh xac. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | GET /api/v1/auth/me. Authorization: Bearer <token> | Request voi Bearer token |
| 2 | AuthRequired MW | Xac thuc token -> inject claims (staffID, role) vao gin.Context | Claims san sang |
| 3 | Handler.Me | StaffIDFromContext(c) -> lay staffID tu claims | staffID string |
| 4 | AuthService.Me | repo.GetByID(ctx, staffID): SELECT id, username, role, full_name, is_active WHERE id=? AND deleted_at IS NULL | Staff row — KHONG co password_hash |
| 5 | AuthService.Me | Kiem tra staff.IsActive. Neu false -> ErrTokenInvalid (tai khoan bi vo hieu hoa sau khi cap token) | Bao ve truong hop account bi khoa sau khi da login |
| 6 | Handler | JSON 200 { id, username, role, full_name } — password_hash KHONG BAO GIO expose | Profile sach, an toan |

# Section 2 — RBAC Middleware Reference
| Tai Sao RBAC Tach Khoi AuthRequired?
Phan tach Authentication (ban la ai?) khoi Authorization (ban duoc lam gi?) la nguyen tac thiet ke co ban. AuthRequired dam bao token hop le. RBAC dam bao role du quyen. Chain them: auth_handler.go co the dung RBAC middleware khac nhau cho moi endpoint ma khong sua AuthRequired.

Ba loai RBAC: RequireRole (whitelist cu the), AtLeast (role >= minRole), RequireOwner (owner hoac admin/manager). Tung loai phuc vu use case khac nhau — khong co 'one size fits all'. |
| --- |

*Hinh 2.1 — RBAC Role Hierarchy. customer hoan toan isolated khoi staff hierarchy.*

**2.1 — Role Hierarchy & Levels**
| Role (Level) | Pham Vi Truy Cap & Ghi Chu |
| --- | --- |
| customer (0) | Menu, dat don, theo doi don cua minh, huy (<30% done). ISOLATED — khong thuoc staff hierarchy. Online/QR anonymous. |
| chef (1) | Xem KDS, cap nhat qty_served, flag mon. Peer voi cashier (cung level 1) — khong co quyen cua nhau. |
| cashier (1) | Tao don POS, xu ly thanh toan, upload anh. Peer voi chef — khong co quyen KDS cua chef. |
| staff (2) | Chef + Cashier + upload file. Nguong de AtLeast('staff') pass — nhung nhan vien tong hop. |
| manager (3) | Staff + Dashboard, Reports, CRUD san pham/kho/nhan su. Co the act on bat ky resource (RequireOwner). |
| admin (4) | Manager + cau hinh he thong, xoa data, quan ly accounts. Cap cao nhat, moi quyen. |

**2.2 — 3 Loai RBAC Middleware**
| Middleware | Dung Khi Nao + Vi Du |
| --- | --- |
| RequireRole(roles...) | Chi mot so role cu the duoc phep. Whitelist chinh xac. Vi du: RequireRole("admin") — chi admin moi xoa duoc account. RequireRole("admin", "manager") — whitelist 2 roles. |
| AtLeast(minRole) | Role >= minRole trong hierarchy. Dung cho pham vi rong hon. Vi du: AtLeast("cashier") — cho phep cashier, staff, manager, admin. AtLeast("staff") — tat ca nhan vien tro len. |
| RequireOwner(fn) | Chi resource owner HOAC manager/admin. Dung cho du lieu ca nhan. Vi du: Cancel don: customer chi huy don cua minh (owner check), manager huy bat ky don. |

# Section 3 — Case Studies (Vong Lap Chinh)
| 6 case studies nay bao phu toan bo happy path va security edge cases cua Auth module. Moi case study la mot kich ban thuc te tu production — khong phai hypothetical. |
| --- |

| Case Study 1 — Login Thanh Cong: Chef Dang Nhap Vao He Thong
Actor: Chef · Handler -> Service -> bcrypt -> JWT -> DB (TX) -> Redis
Kich ban: Chef 'chef01' dang nhap lan dau trong ngay tu Chrome tren may tinh. Da co 1 session active tu hom qua tren dien thoai. |
| --- |

| Dieu Gi Xay Ra Trong Case Study 1?
Day la happy path chinh — moi buoc phai hoan thanh thanh cong. Diem can chu y:

Step 1A: Rate check pass vi IP nay chua co lan that bai nao -> tiep tuc xu ly binh thuong.

Step 4: bcrypt.CompareHashAndPassword mat ~80ms — day la chi phi can thiet cho bao mat, khong phai bug. bcrypt cost=12 la tieu chuan industry cho password hashing an toan.

Step 7 (TX): CountActiveSessionsByStaffID tra ve 1 (session dien thoai). Vi 1 < 5 (max), khong can xoa session nao. INSERT session moi. COMMIT. Toan bo trong 1 transaction — dam bao khong co race condition neu chef login tu 2 thiet bi cung luc.

Step 8A: ResetLoginFail xoa counter cua IP nay — lan thu that bai truoc do (neu co) duoc 'tha thu'. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1A | AuthRepo (Redis) | GetLoginFailCount('login_fail:10.0.0.5') -> 0. Chua qua gioi han. | Pass — tiep tuc xu ly |
| 1 | Chef Browser | POST /auth/login { username: "chef01", password: "Secret@123" } | JSON body |
| 2 | Handler | ShouldBindJSON pass. Goi AuthService.Login(ctx, LoginInput) | LoginInput hop le |
| 3 | AuthRepo | sqlc: SELECT id, username, password_hash, role, full_name, is_active FROM staff WHERE username='chef01' | Staff row: role='chef', is_active=true |
| 4 | pkg/bcrypt | bcrypt.CompareHashAndPassword(hash, 'Secret@123') — cost=12, mat ~80ms | nil (match) -> tiep tuc |
| 5 | pkg/jwt | GenerateTokenPair('staff-uuid-001', 'chef'): jti=newJTI(), exp=now+24h, sign HS256. Raw refresh=64-char hex | AccessToken='eyJ...', RefreshToken='a3f9...' |
| 8A | AuthRepo (Redis) | ResetLoginFail(ctx, '10.0.0.5'): DEL login_fail:10.0.0.5. Login thanh cong -> xoa counter. | Counter xoa. IP fresh. |
| 7 | AuthRepo (TX) | BEGIN TX: CountSessions -> 1 < 5. INSERT refresh_tokens(SHA256('a3f9...'), now+30d, UA, IP). COMMIT. | Session atomic. Raw token KHONG vao DB. |
| 8 | Handler | SetRefreshCookie('a3f9...'): HttpOnly Secure SameSite=Strict Max-Age=2592000 | Cookie set — JS khong the doc |
| 9 | Handler | JSON 200 { access_token: 'eyJ...', staff: { role: 'chef', ... } } | Chef luu vao Zustand. Vao KDS screen. |

| Case Study 2 — Login That Bai: Timing Attack Defense & Rate Limiting
Actor: Attacker · AuthService · Redis
Security Goal: (1) Attacker khong biet 'username khong ton tai' vs 'sai password'. (2) Sau 5 lan that bai, IP bi khoa 15 phut. |
| --- |

| Tai Sao Timing Attack Nguy Hiem Va Cach Chong?
Timing attack: Attacker do response time cua server. Neu 'username khong ton tai' tra ve nhanh hon 'sai password', attacker biet duoc username nao ton tai trong he thong (username enumeration). Voi danh sach usernames hop le, attacker co the bruteforce password hieu qua hon.

BIEN PHAP: Khi sql.ErrNoRows (username khong ton tai), AuthService van goi bcrypt.Verify() voi mot fake_hash. Dieu nay lam cho ca 2 truong hop deu mat ~80ms — attacker khong phan biet duoc.

BIEN PHAP 2: Redis counter login_fail:{ip}. Pipeline atomic (INCR + EXPIRE trong 1 roundtrip). Sau 5 lan that bai trong 15 phut, moi request tu IP do bi block TRUOC KHI cham den DB. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 0 | Attacker (lan 6) | POST /auth/login { any, any } — da co 5 lan that bai truoc | GetLoginFailCount -> 5 >= 5 -> 429 COMMON_003. Khong cham bcrypt hay DB. |
| — | — | ─── TRUONG HOP A: Username khong ton tai ─── | ───────────────────────────────────────── |
| 1A | Attacker | POST /auth/login { username: 'notexist', password: 'anything' } (lan dau) | JSON body |
| 2A | AuthRepo | sqlc: SELECT ... WHERE username='notexist' -> sql.ErrNoRows | Khong co row nao |
| 3A | AuthService | errors.Is(err, sql.ErrNoRows) -> bcrypt.Verify('$2a$12$fake...', 'anything') -> waste ~80ms | Luon mat ~80ms — giong nhu truong hop co user |
| 1B | AuthRepo (Redis) | IncrLoginFail(ctx, IP): INCR login_fail:{ip} + EXPIRE 15min. Return ErrInvalidCredentials. | Counter tang. Cung response nhu TH-B. |
| — | — | ─── TRUONG HOP B: Sai password ─── | ───────────────────────────────────────── |
| 4B | AuthRepo | SELECT ... WHERE username='chef01' -> Staff row tim thay | Co row |
| 5B | pkg/bcrypt | bcrypt.CompareHashAndPassword(realHash, 'WrongPass') -> bcrypt.ErrMismatch | Sai password, mat ~80ms |
| 2B | AuthRepo (Redis) | IncrLoginFail(ctx, IP): INCR + EXPIRE 15min. Return ErrInvalidCredentials. | Counter tang. Cung response nhu TH-A. |
| END | Handler | JSON 401 { code: 'AUTH_001', message: 'Thong tin dang nhap khong hop le' } — y het nhau ca 2 TH | Attacker khong biet username co ton tai khong. |

| Case Study 3 — Access Token Expired: FE Interceptor Silent Refresh
Actor: Customer Browser · FE Interceptor · AuthService
Sau 24h, access token het han. FE Interceptor tu dong refresh ma khong gian doan UX. User khong thay bat ky thong bao gi. |
| --- |

| Silent Refresh Hoat Dong Nhu The Nao?
Day la UX feature quan trong: user khong bao gio biet access token da het han. FE Interceptor (thong thuong la Axios interceptor hoac Next.js custom fetch wrapper) bat 401 response, tu dong goi /auth/refresh trong background, va retry original request voi token moi.

Deduplicate flag (refreshing=true) la cuc ky quan trong: neu 5 API calls cung het han cung luc, chi 1 refresh request duoc gui — 4 cai con lai xep hang doi ket qua. Khong co race condition. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer FE | GET /api/v1/orders. Authorization: Bearer <expired_token> (het han sau 24h) | Request voi token cu |
| 2 | AuthRequired MW | jwt.ParseClaims(expired_token) -> jwt.ErrTokenExpired | HTTP 401 { code:'AUTH_001' } |
| 3 | FE Interceptor | Bat 401. Flag 'refreshing=true' de deduplicate — khong gui nhieu refresh cung luc | Refresh deduplicated |
| 4 | FE Interceptor | POST /api/v1/auth/refresh (khong body — browser tu dong gui httpOnly cookie) | Refresh request den BE |
| 5 | Handler.Refresh | RefreshTokenFromCookie -> crypto.HashToken -> SELECT DB -> validate ExpiresAt. GetByID lay role moi nhat. | Token con han, role hien tai |
| 6 | AuthService | GenerateTokenPair(customerID, 'customer') -> access token moi 24h. go TouchSession() background. | New access token |
| 7 | FE Interceptor | Cap nhat Zustand voi token moi. Flag 'refreshing=false'. Retry original GET /api/v1/orders. | Retry voi token moi |
| 8 | Customer | Nhan du lieu orders binh thuong — khong thay bat ky man hinh login nao | UX seamless, trong suot hoan toan |

| Case Study 4 — Logout: Thu Hoi Token Ngay Lap Tuc Truoc Khi Het Han
Actor: Cashier · AuthService · Redis · MySQL
Cashier logout. Access token van con 18 gio. He thong phai dam bao token nay khong the dung nua du chua het han tu nhien. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Cashier | POST /api/v1/auth/logout. Authorization: Bearer <valid_token_18h_left> | Token con 18h nua moi het han |
| 2 | AuthRequired MW | ParseClaims -> hop le. Inject claims{ jti='abc-def', exp=now+18h, role='cashier' } vao context | Claims co jti |
| 3 | Handler.Logout | ClaimsFromContext: jti='abc-def'. RefreshTokenFromCookie: raw='a3f9...' | Ca 2 tokens san sang |
| 4 | AuthService | repo.RevokeSession('a3f9...'): DELETE FROM refresh_tokens WHERE token_hash=crypto.HashToken('a3f9...') | Session xoa khoi DB — refresh KHONG the dung nua |
| 5 | AuthService | remaining = 18h (64800s). repo.BlacklistJTI('abc-def', 18h): Redis SET logout:abc-def = '1' EX 64800 | Redis blacklist: token bi block 18h — tu het han sau |
| 6 | Handler | ClearRefreshCookie: Set-Cookie: refresh_token=; Max-Age=-1 | Cookie bi xoa khoi browser |
| 7 | Handler | JSON 200 { message: 'Dang xuat thanh cong' } | Logout hoan tat |
| 8 | Attacker (stolen token) | Thu dung lai Bearer token bi danh cap sau logout | Redis EXISTS logout:abc-def = 1 -> 401 AUTH_001 'Token da bi thu hoi' |

| Case Study 5 — Session Cap: Nhan Vien Dang Nhap Qua 5 Thiet Bi (Atomic)
Actor: Manager · AuthRepo · MySQL Transaction
Manager da co 5 sessions: PC, Laptop, iPad, Phone1, Phone2. Dang nhap them tren thiet bi thu 6. |
| --- |

| Tai Sao Dung Transaction Cho Session Cap?
Neu khong co transaction, race condition co the xay ra: 2 login requests cung luc, ca 2 COUNT -> 5, ca 2 DELETE oldest, ca 2 INSERT. Ket qua: 6 sessions ton tai (cap bi bypass).

Voi SERIALIZABLE transaction (hoac SELECT FOR UPDATE), chi 1 request co the chay doan nay cung luc. Cai kia phai cho COMMIT truoc. Dam bao max 5 sessions tuyet doi. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Manager | Dang nhap tren thiet bi thu 6 (da co 5 sessions active: PC, Laptop, iPad, Phone1, Phone2) | Login attempt thu 6 |
| 2-4 | AuthRepo (TX) | BEGIN TX: CountActiveSessionsByStaffID(managerID) -> 5 >= max(5). DeleteOldestSessionByStaffID (Phone1 — least used by last_used_at ASC). INSERT session moi. COMMIT. | Atomic. Session 'Phone1' bi xoa. Thiet bi 6 duoc tao. |
| 5 | Phone1 | Thu goi /auth/refresh voi cookie cua Phone1 — row da bi xoa khoi DB | sql.ErrNoRows -> AUTH_002 'Refresh token khong hop le' |
| 6 | Phone1 FE | Interceptor nhan AUTH_002 tu refresh endpoint -> clear token -> redirect /login | Phone1 bi dang xuat — manager phai login lai neu muon dung |

| Case Study 6 — RBAC: Customer Thu Truy Cap Admin Endpoint
Actor: Customer · RBAC Middleware · RequireRole
Customer dung access token hop le thu truy cap endpoints chi danh cho admin/manager va chef. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer | GET /api/v1/staff — endpoint chi cho admin/manager. Dung access token hop le cua minh. | Token hop le nhung role=customer |
| 2 | AuthRequired MW | ParseClaims hop le. claims.Role='customer'. Inject vao context. | Context co role='customer' |
| 3 | RBAC MW | RequireRole('admin', 'manager'): roleLevel['customer']=0, allowed={admin:4, manager:3}. 0 khong co trong whitelist. | HTTP 403 { code: 'AUTH_003', message: 'Khong du quyen' } |
| 4 | Handler | Khong bao gio duoc goi — abort tai buoc 3 | Request bi block truoc khi vao handler |
| — | — | ─── TRUONG HOP KHAC: Chef thu truy cap Dashboard (AtLeast manager) ─── | ─────────── |
| 5 | Chef | GET /api/v1/dashboard — AtLeast('manager') required. Token hop le, role='chef'. | Token hop le nhung sai role |
| 6 | RBAC MW | AtLeast('manager'): roleLevel['chef']=1 < roleLevel['manager']=3 | HTTP 403 AUTH_003 — chef bi chan |

# Section 4 — Security Considerations

*Hinh 4.1 — Security Threat Model: Moi threat vector va bien phap doi pho tuong ung.*

| Moi De Doa | Bien Phap Bao Ve + Implementation |
| --- | --- |
| XSS doc access token | Khong bao gio luu vao localStorage/sessionStorage. Zustand in-memory. Token mat khi reload — dung la vay, vi refresh tu cookie se lay lai token moi. |
| XSS doc refresh token | httpOnly cookie: JS khong the truy cap qua document.cookie. HttpOnly Secure SameSite=Strict — browser gui tu dong, JS mu hoan toan. |
| Username enumeration (timing) | Luon chay bcrypt du user co ton tai hay khong. Fake hash bcrypt.Verify khi sql.ErrNoRows — mat ~80ms giong nhu real user. |
| Brute force / credential stuffing | login_fail:{ip} Redis counter max 5 lan, khoa 15 phut. IncrLoginFail + GetLoginFailCount trong auth_repo.go. Pipeline atomic. |
| Token replay sau logout | Redis blacklist logout:{jti} voi TTL = remaining access TTL. Neu Redis down: fail-open (accept). DB row la hard guarantee. |
| Session hijack (refresh token) | SHA256(raw) moi vao DB — raw chi trong cookie va memory. Ke tan cong lay duoc DB dump khong dung duoc hash de refresh. |
| CSRF attack tren refresh endpoint | SameSite=Strict cookie policy: khong gui trong cross-site request. Attacker tu domain khac khong the trigger /auth/refresh. |
| Session bung no (vo han devices) | Max 5 sessions per staff — LRU eviction (xoa oldest by last_used_at) trong DB transaction. Atomic — khong bypass duoc. |
| Role escalation sau thay doi | Role lay tu DB moi lan refresh (GetByID) — khong chi tin vao JWT claims. Admin thay doi role -> co hieu luc sau lan refresh tiep theo. |

# Section 5 — QR Guest Session Design (v1.2)
| v1.2 CHANGES: Section 5 moi hoan toan — QR Guest Session. Sections 0-4 khong thay doi tu v1.1. Giai quyet bai toan: anonymous customer quet QR tren ban, dat mon khong can login, khong can tao account. |
| --- |

## 5.1 — Van De: Anonymous Customer Scan QR Khong Login
| Van De | Nguyen Nhan / Tac Dong |
| --- | --- |
| Auth middleware hien tai | 100% endpoints dung AuthRequired — Bearer token bat buoc. Customer quet QR khong co token -> 401 ngay lap tuc. |
| staff.role ENUM 'customer' | Ambiguous: online/QR customer la anonymous — khong co staff account. 001_auth.sql da flag van de nay. |
| orders.created_by NULL | Schema da san sang — NULL = customer self-order. Chi can co co che cap token cho anonymous user. |

## 5.2 — Giai Phap: Guest JWT Issued on QR Scan
| DECISION: Guest JWT — Elegant Solution
DECISION: GET /api/v1/tables/qr/:token (public endpoint) tu dong phat Guest JWT voi role=customer, embed table_id vao claims. Khong can login, khong can tao account.

Tai sao elegant? Vi AuthRequired middleware KHONG can thay doi. Guest JWT pass giong nhu staff JWT. IsGuest flag chi dung o handler layer de scope table validation. Toan bo infrastructure da co (JWT, Redis blacklist, middleware) — chi them 1 public endpoint va update Claims struct.

Trade-off chap nhan: Guest JWT mat khi reload trang (Zustand RAM, khong localStorage). User phai quet QR lai neu reload — day la acceptable cho guest session (4h TTL, khong quan trong nhu session staff). |
| --- |

*Hinh 5.1 — QR Guest Session Flow: Tu quet QR den dat mon. AuthRequired middleware khong thay doi.*

**5.3 — Schema Changes Can Thiet**
| Component | Thay Doi + Ly Do |
| --- | --- |
| pkg/jwt/jwt.go — Claims struct | Them TableID string va IsGuest bool. Phan biet guest token voi staff token. TableID cho phep middleware scope request ve dung ban. |
| pkg/jwt/jwt.go — GenerateGuestToken | GenerateGuestToken(tableID string) -> *TokenPair. TTL=4h (ngan hon 24h). Khong co refresh token. IsGuest=true. TableID embedded. |
| internal/middleware/auth.go | Them TableIDFromContext() helper. Handler can lay table_id tu guest token de validate order thuoc ban nao. |
| NEW: table_handler.go | GET /api/v1/tables/qr/:token (PUBLIC — khong co AuthRequired). Validate qr_token -> resolve table -> issue guest JWT. Redis: SET guest_session:{table_id}=jti TTL 4h. |
| Redis: guest_session:{table_id} | Luu JTI cua guest session hien tai cua ban. TTL 4h. Dung de invalidate khi ban reset (nhom khach moi). Dung chung logout:{jti} blacklist pattern. |
| orders.created_by (khong thay doi) | Giu NULL — da san sang. NULL = guest/anonymous order. table_id trong orders FK xac dinh ban cu the. Khong can schema migration moi. |

**5.4 — Updated Claims Struct (Go)**
| // pkg/jwt/jwt.go — Updated Claims struct
type Claims struct {
    jwt.RegisteredClaims
    Role    string `json:"role"`
    TableID string `json:"table_id,omitempty"` // NEW: chi co trong guest token
    IsGuest bool   `json:"is_guest,omitempty"`  // NEW: true = anonymous QR customer
}
// GenerateGuestToken: TTL=4h, IsGuest=true, role=customer, TableID set
// KHONG co refresh token — het han thi scan QR lai
func GenerateGuestToken(tableID string) (*TokenPair, error) { ... } |
| --- |

**5.5 — Design Principles: QR Guest Session**
| Principle | Implementation |
| --- | --- |
| No login required | GET /api/v1/tables/qr/:token (public) tu dong phat guest JWT. Customer khong can biet JWT ton tai. |
| Zero middleware change | AuthRequired khong thay doi. Guest JWT pass binh thuong. IsGuest flag chi dung o handler layer. |
| Table scoped token | TableID embed trong claims. OrderHandler validate claims.TableID == request.table_id — khong the cross-table. |
| Session isolation | guest_session:{table_id} in Redis. Cashier reset ban -> blacklist old JTI -> del key. Dung chung logout:{jti} pattern. |
| No refresh token | Guest JWT TTL=4h. Het han thi quet QR lai. Don gian hon, khong can DB row cho refresh. |
| Multi-table = payment concern | 1 nhom o nhieu ban -> moi ban dat rieng (auth doc lap). Gop bill la chuc nang POS cashier — auth khong quan tam den group. |
| Reuse existing blacklist | Invalidate dung logout:{jti} — zero new Redis pattern. Consistency voi staff logout flow. Khong can code moi. |

# Section 6 — Case Studies QR Guest Session (v1.2)
| Case Study 7 — QR Scan: Anonymous Customer Order Khong Login
Actor: Anonymous Customer · Table QR · TableHandler -> GuestJWT -> AuthRequired (unchanged)
2 nguoi ban den ngoi Ban 05. Quet QR bang dien thoai, dat mon cho ca ban. Khong muon dang ky, khong muon dang nhap. |
| --- |

| Dieu Lam Cho QR Guest Session Khac Biet?
Diem doc dao nhat: customer nhan JWT ma khong biet ho dang nhan JWT. Ho chi quet QR code tren ban, man hinh hien thi menu, ho dat mon. Au hau truong, FE nhan guest_token, luu vao Zustand, va dung no cho moi request tiep theo — transparent hoan toan.

Table scoping la bao mat quan trong: guest_jwt cua Ban 05 chi co the dat don cho Ban 05. OrderHandler validate claims.TableID == request.table_id. Neu ai do co guest JWT cua ban khac va thu dat don cho ban minh, se nhan 403 ngay. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer Phone | Quet QR code tren ban 05. QR URL: https://app.banhcuon.vn/qr/table?token=abc123hex64 | Browser mo URL QR. FE doc token tu query param. |
| 2 | FE (Next.js) | GET /api/v1/tables/qr/abc123hex64 — PUBLIC endpoint, KHONG can auth header | Request khong co Bearer — cung OK vi la public route. |
| 3 | TableHandler | SELECT id, name, status FROM tables WHERE qr_token='abc123hex64' AND deleted_at IS NULL | Table: id='table-05-uuid', name='Ban 05', status='available' |
| 4 | TableHandler | Redis GET guest_session:table-05-uuid -> nil. Tao moi: GenerateGuestToken('table-05-uuid'): IsGuest=true, TableID='table-05-uuid', exp=now+4h, role='customer'. | GuestJWT='eyJ...' co TableID trong claims. |
| 5 | TableHandler (Redis) | Redis SET guest_session:table-05-uuid = jti EX 14400 (4h). Luu de co the invalidate sau. | Session duoc track. Cashier co the reset bat cu luc nao. |
| 6 | TableHandler | JSON 200 { guest_token: 'eyJ...', table: { id, name: 'Ban 05', status } } | FE nhan guest_token. Luu vao Zustand. KHONG localStorage. |
| 7 | FE (Next.js) | Customer them mon vao gio hang. POST /api/v1/orders. Authorization: Bearer <guest_jwt>. Body: { table_id: 'table-05-uuid', items: [...] } | Request voi guest JWT — giong nhu staff JWT. |
| 8 | AuthRequired MW | ParseClaims(guest_jwt) -> hop le. Claims: role='customer', IsGuest=true, TableID='table-05-uuid'. KHONG can doi middleware. | Claims inject vao gin.Context. Pass giong staff JWT. |
| 9 | OrderHandler | TableIDFromContext(c) = 'table-05-uuid'. Validate: request.table_id == claims.TableID. One Active Order check. INSERT order { created_by=NULL, source='qr' }. | Validation pass. Order tao thanh cong. |
| 10 | BE (SSE) | Customer GET /api/v1/orders/:id/stream — Bearer guest_jwt. AuthRequired pass. SSE subscribe. | Realtime tracking: preparing -> ready. Day du nhu staff. |

| Case Study 8 — Table Isolation: Nhom Moi Den, Token Cu Bi Invalidate
Actor: Old Group + Cashier + New Group · TableService · Redis Blacklist
Nhom A an xong, thanh toan, roi di. Cashier don ban. Nhom B den va quet QR cung ban do. Token nhom A KHONG the dung nua. |
| --- |

| Tai Sao Table Isolation Quan Trong?
Neu khong co isolation, guest JWT cua nhom A (con hieu luc 3h) van co the dung de dat mon sau khi nhom A da di. Day la security hole nghiem trong — ai do ngoai nha hang co the dat mon mien phi cho ban do.

GIAI PHAP: Cashier reset ban -> TableService.Reset() blacklist old JTI qua cung co che logout:{jti} cua staff. Zero code moi can viet — tai su dung pattern da co. Elegant va DRY. |
| --- |

*Hinh 6.1 — Table Isolation: 6 buoc tu cashier reset den nhom moi co fresh session.*

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Cashier (POS) | PATCH /api/v1/tables/table-05-uuid { status: 'available' } — sau order delivered & paid. | TableService.Reset(tableID) duoc goi. |
| 2 | TableService (Redis) | Redis GET guest_session:table-05-uuid -> old_jti='jti-abc-group-A'. | Co session cu cua nhom A. |
| 3 | TableService (Redis) | Tinh remaining TTL (vi du con 2h). Redis SET logout:jti-abc-group-A = '1' EX 7200. | JTI cu vao blacklist — dung chung co che logout:{jti} cua staff. KHONG can code moi. |
| 4 | TableService (Redis) | Redis DEL guest_session:table-05-uuid. Ban gio khong con session nao. | Session sach. Ban san sang cho nhom moi. |
| 5 | Nhom A (neu thu lai) | Thu goi API bang guest_jwt cu | AuthRequired: chu ky OK nhung Redis EXISTS logout:jti-abc-group-A=1 -> 401 AUTH_001 revoked. |
| 6 | Nhom B (moi) | Quet QR cung ban. GET /qr/abc123hex64. guest_session:table-05-uuid -> nil. Tao guest JWT moi. | Nhom B co fresh session rieng. Isolation hoan toan. |

| Case Study 9 — 1 Nhom O Nhieu Ban: Independent Sessions + Combined Bill
Actor: Group of 8 (2 tables) · TableHandler · OrderHandler · Cashier POS
8 nguoi ngoi 2 ban (Ban 03 & Ban 04, 4 nguoi moi ban). Moi ban quet QR rieng, dat mon rieng. Cuoi bua, muon gop bill thanh 1. |
| --- |

| DESIGN DECISION: Auth Khong Solve 'Group Across Tables'
Day la bai toan pho bien: mot nhom lon phai ngoi nhieu ban. Cach xử ly:

AUTH DECISION: Moi ban co INDEPENDENT guest session. Auth khong biet ve 'group'. Moi ban quet QR rieng -> nhan guest JWT rieng -> dat mon rieng. Day la Separation of Concerns: auth chi xac thuc va scope request ve dung ban.

PAYMENT DECISION: Gop bill la chuc nang cua Cashier POS, khong phai Auth. Phase 1: cashier chon nhieu orders, nhap tong, tao 1 payment record. Phase 2: merge payment flow tu dong trong POS UI.

SECURITY EDGE CASE: Neu nguoi o Ban 03 co guest JWT cua Ban 03, ho KHONG the dat don cho Ban 04 bang guest JWT do. OrderHandler validate claims.TableID != request.table_id -> 403. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| — | — | ─── GIAI DOAN 1: DAT MON (moi ban doc lap) ─── | ─────────────────────────── |
| 1 | Nguoi A (Ban 03) | Quet QR Ban 03. Nhan guest_jwt_ban03 (TableID='table-03-uuid'). | guest_session:table-03-uuid = jti-A. Session doc lap. |
| 2 | Nguoi B (Ban 04) | Quet QR Ban 04. Nhan guest_jwt_ban04 (TableID='table-04-uuid'). | guest_session:table-04-uuid = jti-B. Session doc lap. |
| 3 | Ca hai ban | Dat mon rieng: OrderA (Ban 03, 180K VND). OrderB (Ban 04, 220K VND). Moi order co table_id tuong ung, created_by=NULL. | 2 orders doc lap trong DB. KDS hien thi ca 2. Bep lam rieng. |
| — | — | ─── GIAI DOAN 2: GOP BILL (Cashier POS) ─── | ─────────────────────────── |
| 4 | Cashier (POS) | Tim OrderA (180K) va OrderB (220K). Tao 1 payment record: amount=400,000 VND. VNPay QR cho 400K. | 1 payment covers 2 orders. Phase 1: cashier lam thu cong. Khong can schema change. |
| 5 | Khach + Cashier | Quet QR VNPay 400K. Callback -> confirm. Cashier mark ca 2 orders 'delivered'. | Thanh toan xong. Ca 2 orders dong thoi. Cashier reset ca 2 ban. |
| — | — | ─── EDGE CASE: Thu dat mon cho ban khac ─── | ─────────────────────────── |
| E1 | Nguoi A (Ban 03) | POST /api/v1/orders voi guest_jwt_ban03 NHUNG body co table_id='table-04-uuid' (ban cua nhom kia). | OrderHandler: claims.TableID='table-03-uuid' != request.table_id='table-04-uuid' -> 403. Table scoping bao ve. |

# Section 7 — Security Additions: QR Guest Session
| Moi De Doa (QR-Specific) | Bien Phap Bao Ve + Implementation |
| --- | --- |
| Guest token dung cho ban sai | Table-scoped token: claims.TableID validate trong OrderHandler. claims.TableID != body.table_id -> 403. Token Ban 03 khong dat don cho Ban 04. |
| Nhom cu dung lai token sau khi di | Cashier reset ban -> blacklist old JTI qua logout:{jti}. Dung chung co che logout hien co — zero code moi. |
| Guest token bi lo (man hinh) | TTL ngan 4h. Scope gioi han (chi 1 ban). Khong co quyen admin/staff. HTTPS. Ke tan cong chi dat mon cho 1 ban trong 4h toi da. |
| QR token bi scan boi nguoi la | One Active Order Rule: 1 ban chi co 1 don active. Nhom that dang ngoi se thay co don la xuat hien. ORDER_001 error. |
| Guest token o localStorage (XSS) | Luu trong Zustand RAM — khong localStorage, khong cookie. Mat khi reload (user quet QR lai). Trade-off chap nhan duoc cho guest session. |

| BanhCuon System  ·  Auth Module  ·  Data Flow & Case Study — Full Explanation with Visual Diagrams  ·  v1.2  ·  Thang 4/2026 |
| --- |
