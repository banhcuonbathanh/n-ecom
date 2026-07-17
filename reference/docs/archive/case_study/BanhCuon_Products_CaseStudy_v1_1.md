**BANH CUON SYSTEM**
**PRODUCTS & MENU MODULE**
*Data Flow & Case Study  —  Complete Explanation*
Go Gin  ·  MySQL  ·  Redis Bloom  ·  sqlc  ·  v1.0  ·  Thang 4 / 2026

| Pham vi tai lieu nay: Giai thich day du bang ca van ban va so do toan bo Products & Menu Module — bao gom 7 data flows chinh, bloom filter + cache pattern, RBAC cho CUD, 6 case studies co that, va topping snapshot design. Moi section bao gom "tai sao" (why), "cai gi" (what), va "nhu the nao" (how). |
| --- |

# Section 0 — Tong Quan Products & Menu Module
| Products & Menu Module Lam Gi?
Products module xu ly 5 nhiem vu cot loi:
(1) Phuc vu menu cong khai (public GET) — khach hang xem san pham, topping, combo ma khong can dang nhap. Cache Redis giam tai DB.
(2) Bloom filter fast-path — truoc khi query DB, kiem tra ID co ton tai khong voi do tre cuc thap (microseconds). Giam tai DB voi random ID requests.
(3) RBAC bao ve CUD (Create/Update/Delete) — chi manager tro len moi duoc chinh sua menu. Public duoc GET. Khong co "half-open" permissions.
(4) object_path thay vi full URL — luu duong dan relative trong DB, full URL = STORAGE_BASE_URL + object_path. Doi CDN chi can doi 1 env var, khong can UPDATE hàng tram rows.
(5) Topping snapshot tai order time — khi khach dat hang, gia topping duoc snapshot vao toppings_snapshot JSON. Admin tang gia topping sau do khong anh huong don cu. |
| --- |

## 0.1 — File Structure & Trach Nhiem Tung File
| File | Trach Nhiem Chinh |
| --- | --- |
| internal/handler/product_handler.go | HTTP handlers: ListProducts, GetProduct, CreateProduct, UpdateProduct, DeleteProduct, ListCategories, ListToppings, ListCombos |
| internal/service/product_service.go | Business logic: availability check, cache invalidation, combo expand template, price validation |
| internal/repository/product_repo.go | sqlc wrappers: GetProducts (filter+sort), GetProductWithToppings, GetComboWithItems, SoftDelete |
| be/pkg/redis/bloom.go | Bloom filter: Add("product_ids", id), Exists("product_ids", id) — fast existence check truoc DB query |
| be/pkg/redis/client.go | Redis Stack connection, GetCache, SetCache, DeleteCache, InvalidatePattern |
| internal/middleware/rbac.go | AtLeast("manager") cho POST/PATCH/DELETE. Public (no auth) cho GET endpoints |

## 0.2 — Key Design Decisions
| Decision | Ly Do | Ref |
| --- | --- | --- |
| object_path thay vi full URL | Luu "uploads/2026/04/pho-cuon.jpg" trong DB. Full URL = env STORAGE_BASE_URL + object_path. Khi doi CDN chi doi env var, khong can migrate data. | BanhCuon_Project.docx §4.2 |
| DECIMAL(10,0) cho price | VND khong co phan thap phan. Float gay rounding: 35000.0000001 vs 35000. DECIMAL tuyet doi chinh xac, khong rounding error. | migrations/002_products.sql |
| Bloom filter truoc DB | GET /products/random-uuid-that-not-exists: khong can query DB neu bloom.Exists()=false. False positive (bloom=true nhung DB miss) -> chi ton 1 DB query extra, chap nhan duoc. | be/pkg/redis/bloom.go |
| Redis cache list products | GET /products query toan bo menu cho moi khach hang. Cache key "products:list" TTL 5 phut. Khi tao/sua/xoa san pham -> invalidate cache. | MASTER.docx §8 Redis Keys |
| toppings_snapshot JSON | Snapshot gia topping tai thoi diem dat hang vao order_items.toppings_snapshot. Admin tang gia sau khong anh huong don cu da dat. | migrations/005_orders.sql |
| Soft delete voi deleted_at | PATCH /products/:id delete -> set deleted_at=NOW(). Moi query WHERE deleted_at IS NULL. Lich su san pham duoc giu lai cho audit. | MASTER.docx §7.3 |

## 0.3 — File Structure Quick Reference
| File | Layer | Owner / Ghi Chu |
| --- | --- | --- |
| internal/handler/product_handler.go | handler/ | BE Dev — 8 HTTP handlers, RegisterRoutes |
| internal/service/product_service.go | service/ | BE Dev — business logic, cache logic |
| internal/repository/product_repo.go | repository/ | BE Dev — sqlc wrappers |
| be/pkg/redis/bloom.go | pkg/ | System Dev — bloom filter Add/Exists |
| be/pkg/redis/client.go | pkg/ | System Dev — Redis cache helpers |
| internal/middleware/rbac.go | middleware/ | BE Dev — AtLeast, Public endpoints |
| migrations/002_products.sql | migrations/ | DB Dev (READ ONLY) — categories, products, toppings, product_toppings |
| migrations/004_combos.sql | migrations/ | DB Dev (READ ONLY) — combos, combo_items |

# Section 1 — Data Flow Chi Tiet
## 1.1 — GET /api/v1/products — List Products (Public)
| List products la endpoint public hot nhat — moi khach hang vao web deu goi endpoint nay. Cache pattern la cot loi: lan dau -> DB query -> luu cache TTL 5 phut. Tu lan 2 tro di -> Redis hit -> khong ton DB resources. Bloom filter khong ap dung cho list endpoint (bloom dung cho single ID lookup). Category filter va is_available=true luon duoc apply. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client (Browser) | GET /api/v1/products?category_id=cat-bc-uuid&is_available=true | Query params: category filter tuy chon |
| 2 | Gin Router | Route: GET /api/v1/products — NO auth middleware (public endpoint) | Request den ProductHandler.ListProducts |
| 3 | Handler | ShouldBindQuery(&ListProductsQuery): category_id optional, page/limit default 1/20 | Input validated, query params parsed |
| 4 | Service | BuildCacheKey("products:list", category_id, page, limit) -> "products:list:cat-bc-uuid:1:20" | Cache key duy nhat theo filter |
| 5 | Redis (cache) | rdb.Get("products:list:cat-bc-uuid:1:20") — kiem tra cache trc | HIT: tra ve JSON ngay (skip DB). MISS: tiep tuc step 6 |
| 6 | Repository (DB) | sqlc: SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id=c.id WHERE p.category_id=? AND p.is_available=1 AND p.deleted_at IS NULL ORDER BY p.sort_order LIMIT 20 | Product rows + category name |
| 7 | Service | Map rows -> []ProductResponse. rdb.Set("products:list:...", json, TTL=5min) | Cache duoc luu cho 5 phut |
| 8 | Handler | JSON 200 { data: [...], total: N, page: 1 } | Response tra ve client |

## 1.2 — GET /api/v1/products/:id — Single Product with Toppings
| Single product lookup dung Bloom filter truoc tien. Neu bloom.Exists()=false, chac chan ID khong ton tai -> tra 404 ngay, khong can query DB. Neu bloom.Exists()=true, tiep tuc check Redis detail cache. Cache HIT -> tra ve ngay. Cache MISS -> query DB -> luu cache TTL 10 phut. False positive (bloom=true nhung DB miss) -> tra PRODUCT_001 404. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | GET /api/v1/products/pho-cuon-uuid | product_id trong path param |
| 2 | Gin Router | Route: GET /api/v1/products/:id — NO auth (public) | Request den handler |
| 3 | Handler | c.Param("id") = "pho-cuon-uuid". Validate UUID format. | ID string |
| 4 | bloom.go | bloom.Exists("product_ids", "pho-cuon-uuid") — RedisBloom BF.EXISTS command | false -> PRODUCT_001 404 ngay (khong can DB). true -> tiep tuc |
| 5 | Redis (cache) | rdb.Get("products:detail:pho-cuon-uuid") — kiem tra detail cache truoc DB | HIT: tra ProductDetailResponse ngay (skip DB). MISS: tiep tuc step 6 |
| 6 | Repository (DB) | sqlc: GetProductWithToppings("pho-cuon-uuid"): SELECT product + JOIN product_toppings + toppings WHERE p.id=? AND p.deleted_at IS NULL AND p.is_available=1 | Product row + []Topping slice |
| 7 | Service | Map -> ProductDetailResponse { id, name, price, image_url: STORAGE_BASE_URL+object_path, toppings: [...] }. rdb.Set("products:detail:pho-cuon-uuid", json_bytes, TTL=10min) | image_url ghep tu env + object_path. Detail cache luu 10 phut. |
| 8 | Handler | JSON 200 { product: ProductDetailResponse } | Chi tiet san pham voi toppings |

## 1.3 — POST /api/v1/products — Create Product (Manager+)
| Create product yeu cau AtLeast("manager"). Price phai la so nguyen duong (VND, no decimal). image_path la object_path (relative), khong phai full URL — FE upload file truoc, nhan object_path, roi truyen vao create product request. Sau khi INSERT thanh cong, phai: (1) bloom.Add de future GET calls pass bloom check, (2) invalidate list cache de khach hang thay san pham moi. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Manager Browser | POST /api/v1/products { name: "Pho Cuon Bo", category_id: "cat-bc-uuid", price: 35000, image_path: "uploads/2026/04/pho-cuon.jpg", ... } | JSON body voi object_path (khong phai URL) |
| 2 | AuthRequired MW | Bearer token verify. Inject claims{ role:"manager" } vao context | Claims available |
| 3 | RBAC MW | AtLeast("manager"): roleLevel["manager"]=3 >= 3. PASS. | Authorized |
| 4 | Handler | ShouldBindJSON(&CreateProductRequest): validate name required, price > 0, category_id valid UUID | Input validated |
| 5 | Service | Kiem tra category_id ton tai: repo.CategoryExists(category_id). Neu khong -> PRODUCT_001 404 category | Category valid |
| 6 | Repository (DB) | sqlc: INSERT INTO products (id=UUID(), category_id, name, price, image_path, ...) VALUES (?) | Product row duoc tao. id = new UUID |
| 7 | bloom.go | bloom.Add("product_ids", newProductID) — BF.ADD command. Future GET se pass bloom check. | Bloom filter cap nhat |
| 8 | Redis (cache) | rdb.DeletePattern("products:list:*") — xoa moi cache key cua list products | Cache invalidated. Lan GET tiep se fresh tu DB |
| 9 | Handler | JSON 201 { product: { id, name, price, image_path, ... } } | San pham vua tao tra ve (image_path, khong phai full URL) |

## 1.4 — PATCH /api/v1/products/:id — Update Product
| Update dung partial update (PATCH) — chi update cac fields duoc truyen vao. price neu co phai la DECIMAL valid. Sau khi UPDATE, invalidate both: (1) list cache (product da doi, list phai refresh), (2) single product cache neu co cache rieng. Bloom filter KHONG can update khi sua product vi ID khong doi. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Manager | PATCH /api/v1/products/pho-cuon-uuid { price: 40000, is_available: true } | Partial update body |
| 2 | AuthRequired + RBAC MW | AtLeast("manager"). PASS. | Authorized |
| 3 | Handler | ShouldBindJSON(&UpdateProductRequest): tat ca fields optional (PATCH semantics) | Fields to update |
| 4 | bloom.go | bloom.Exists("product_ids", "pho-cuon-uuid") — verify truoc khi UPDATE | false -> 404. true -> tiep tuc (co the false positive, DB query se check) |
| 5 | Repository (DB) | sqlc: UPDATE products SET price=40000, is_available=1, updated_at=NOW() WHERE id=? AND deleted_at IS NULL | RowsAffected=0 -> PRODUCT_001 404 |
| 6 | Redis (cache) | InvalidatePattern("products:list:*") + Delete("products:detail:pho-cuon-uuid") | Cache cleared |
| 7 | Handler | JSON 200 { product: UpdatedProduct } | Updated product response |

## 1.5 — DELETE /api/v1/products/:id — Soft Delete
| Soft delete: SET deleted_at=NOW() thay vi DELETE row. Ly do: (1) lich su don hang co order_items.product_id tham chieu den product nay — hard delete gay FK violation RESTRICT. (2) Audit trail. (3) Phuc hoi de dang. Sau soft delete, bloom.Add van con product ID -> false positive sau nay khi GET, nhung DB WHERE deleted_at IS NULL se tra 404 dung. Chap nhan duoc. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Manager | DELETE /api/v1/products/pho-cuon-uuid | Delete request |
| 2 | AuthRequired + RBAC MW | AtLeast("manager"). PASS. | Authorized |
| 3 | Handler | c.Param("id") = "pho-cuon-uuid" | ID string |
| 4 | Repository (DB) | sqlc: UPDATE products SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL | Soft delete. RowsAffected=0 -> 404 PRODUCT_001 |
| 5 | Redis (cache) | InvalidatePattern("products:list:*") + Delete("products:detail:pho-cuon-uuid") | Cache cleared |
| 6 | Handler | JSON 200 { message: "San pham da bi xoa" } | Soft delete thanh cong |
| NOTE | Bloom filter | KHONG xoa khoi bloom — bloom khong ho tro delete. ID van trong bloom. Future GET -> bloom=true -> DB query -> deleted_at IS NOT NULL -> 404. Chap nhan duoc. | False positive chi ton 1 extra DB query |

## 1.6 — GET /api/v1/combos/:id — Get Combo with Items
| Combo la "template" dinh nghia combo gom nhung san pham nao. Khi dat hang, BE expand combo_items thanh order_items rieng biet (combo expand tai create time). GET combo tra ve combo info + danh sach combo_items de FE hien thi cho khach. GET cung la public endpoint. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | GET /api/v1/combos/combo-bc-uuid | combo_id trong path param |
| 2 | Gin Router | Route: GET /api/v1/combos/:id — NO auth (public) | Public endpoint |
| 3 | Repository (DB) | sqlc: GetComboWithItems("combo-bc-uuid"): SELECT combos.* + combo_items.* JOIN products WHERE combo_id=? AND combos.deleted_at IS NULL | Combo row + []ComboItem |
| 4 | Service | Map -> ComboDetailResponse { id, name, price, items: [{product_id, product_name, quantity}] } | Structured response |
| 5 | Handler | JSON 200 { combo: ComboDetailResponse } | FE hien thi combo va cac mon con |

## 1.7 — GET /api/v1/categories — List Categories
| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Client | GET /api/v1/categories | Public, no filter |
| 2 | Gin Router | NO auth — public. Cache key "categories:list" |  |
| 3 | Redis (cache) | rdb.Get("categories:list") — TTL 30 phut (it thay doi hon products) | HIT -> tra ve ngay. MISS -> query DB |
| 4 | Repository (DB) | sqlc: SELECT id, name, sort_order FROM categories WHERE is_active=1 AND deleted_at IS NULL ORDER BY sort_order | Category list |
| 5 | Handler | JSON 200 { categories: [...] } | FE hien thi menu tabs |

# Section 2 — Reference Tables
## 2.1 — RBAC Matrix cho Products Module
| Endpoint | Method | Required Role | Ly Do |
| --- | --- | --- | --- |
| GET /products | GET | Public (no auth) | Menu cong khai — khach chua dang nhap phai xem duoc |
| GET /products/:id | GET | Public (no auth) | Chi tiet san pham — public |
| GET /categories | GET | Public (no auth) | Categories cho menu tabs — public |
| GET /toppings | GET | Public (no auth) | Topping list — public cho order flow |
| GET /combos | GET | Public (no auth) | Combo list — public |
| GET /combos/:id | GET | Public (no auth) | Combo detail — public |
| POST /products | POST | AtLeast("manager") | Tao san pham moi — chi manager+ (khong phai staff) |
| PATCH /products/:id | PATCH | AtLeast("manager") | Sua san pham — chi manager+ |
| DELETE /products/:id | DELETE | AtLeast("manager") | Xoa san pham — chi manager+ |
| POST /combos | POST | AtLeast("manager") | Tao combo — chi manager+ |
| DELETE /combos/:id | DELETE | AtLeast("admin") | Xoa combo — admin only (vi cascade risk) |

## 2.2 — Redis Keys cho Products Module
| Key Pattern | Type | TTL | Dung Cho |
| --- | --- | --- | --- |
| bloom:product_ids | Bloom Filter | Permanent | Fast existence check: BF.EXISTS truoc moi GET /products/:id |
| products:list:{cat_id}:{page}:{limit} | String (JSON) | 5 phut | Cache list san pham theo filter. Invalidate khi CUD. |
| products:detail:{product_id} | String (JSON) | 10 phut | Cache single product detail + toppings. Invalidate khi update. |
| categories:list | String (JSON) | 30 phut | Cache categories list. It thay doi, TTL cao hon. |
| combos:detail:{combo_id} | String (JSON) | 10 phut | Cache combo detail + items. |

## 2.3 — Error Codes Products Module
| Code | HTTP | Mo Ta | Khi Nao |
| --- | --- | --- | --- |
| PRODUCT_001 | 404 | Product khong ton tai hoac unavailable | GET/PATCH/DELETE product ID khong tim thay sau bloom check |
| AUTH_003 | 403 | Khong du quyen | Chef / cashier / staff goi POST/PATCH/DELETE products |
| AUTH_001 | 401 | Token invalid hoac expired | CUD endpoint khong co Bearer token hop le |
| COMMON_001 | 400 | Validation error | Request body thieu required fields hoac sai kieu du lieu |
| COMMON_002 | 500 | Internal server error | DB loi, Redis loi (fallback gracefully) |
| FILE_001 | 413 | File qua lon (> 10MB) | Upload anh san pham qua kich thuoc gioi han |
| FILE_002 | 415 | File type khong duoc ho tro | Upload file khong phai image (non image/jpeg, image/png, image/webp) |

# Section 3 — Case Studies (Vong Lap Chinh)
| ℹ️  6 case studies nay bao phu toan bo happy path, cache pattern, RBAC enforcement, va edge cases quan trong nhat cua Products module. Moi case study la kich ban thuc te tu production. |
| --- |

| Case Study 1 — Customer Xem Menu — Bloom Filter + DB Query + Cache
Actor: Customer Browser / Gin / Bloom / DB / Redis
Kich ban: Khach hang lan dau mo website. Cache chua co. Bloom filter check ID category. Full DB query xay ra. Ket qua duoc cache. |
| --- |

| CS1 la cold start flow — cache chua co du lieu. Bloom filter khong ap dung cho list endpoint (bloom chi dung cho single ID lookup). Query DB day du, ket qua cache 5 phut. Lan thu 2 (CS2) se hoan toan khac — cache hit, DB khong bi cham. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer Browser | GET /api/v1/products?category_id=cat-banh-cuon-uuid&is_available=true (lan dau) | Khach mo web, chon tab "Banh Cuon" |
| 2 | Gin Router | Route: GET /api/v1/products — NO auth middleware | Public endpoint, khong can token |
| 3 | Handler | ShouldBindQuery: category_id="cat-banh-cuon-uuid", page=1, limit=20 | Query params hop le |
| 4 | Service | cacheKey = "products:list:cat-banh-cuon-uuid:1:20" | Cache key xac dinh |
| 5 | Redis (cache) | rdb.Get("products:list:cat-banh-cuon-uuid:1:20") -> redis.Nil (MISS) | Cache trong — phai query DB |
| 6 | Repository (DB) | sqlc: SELECT p.id, p.name, p.price, p.image_path, c.name as category FROM products p JOIN categories c ON p.category_id=c.id WHERE p.category_id="cat-banh-cuon-uuid" AND p.is_available=1 AND p.deleted_at IS NULL ORDER BY p.sort_order LIMIT 20 | 8 rows: Pho Cuon Bo (35000), Banh Cuon Nhan Thit (30000), ... |
| 7 | Service | Map rows -> []ProductResponse. Ghep image_url = STORAGE_BASE_URL + image_path. rdb.Set("products:list:cat-banh-cuon-uuid:1:20", json_bytes, TTL=5min) | Cache duoc luu. Fresh data cho 5 phut |
| 8 | Handler | JSON 200 { data: [8 san pham], total: 8, page: 1 } | Khach thay menu Banh Cuon |

**Bloom Filter trong List vs Single Lookup:**
| Endpoint | Bloom Filter? | Ly Do |
| --- | --- | --- |
| GET /products | KHONG | List la query nhieu rows — bloom check khong phu hop. Dung cache list. |
| GET /products/:id | CO | Single ID lookup — bloom.Exists(id) truoc DB. False positive chap nhan duoc (chi ton 1 extra DB call). |
| GET /combos/:id | CO (optional) | Tuong tu single lookup. Tuy implementation. |

| Case Study 2 — Cache Hit — GET /products Lan 2 -> Redis Hit, Khong Query DB
Actor: Customer Browser / Gin / Redis
Kich ban: Cung customer, cung filter, 2 phut sau. Cache van con hieu luc (TTL 5 phut). DB hoan toan khong bi cham. |
| --- |

| CS2 la truong hop pho bien nhat trong production. Moi khach hang sau lan dau deu duoc phuc vu tu cache. Redis co the xu ly hang tram nghin requests/giay, trong khi DB chi can xu ly ~1 request moi 5 phut cho cung 1 filter combination. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer Browser | GET /api/v1/products?category_id=cat-banh-cuon-uuid&is_available=true (lan 2, sau 2 phut) | Cung query nhu CS1 |
| 2 | Handler | cacheKey = "products:list:cat-banh-cuon-uuid:1:20" — xay dung key giong het CS1 | Key match voi cache da luu |
| 3 | Redis (cache) | rdb.Get("products:list:cat-banh-cuon-uuid:1:20") -> []byte (HIT! Con 3 phut nua moi expire) | Cache HIT — data tra ve ngay |
| 4 | Service | json.Unmarshal(cached_bytes) -> []ProductResponse — skip toan bo DB call | KHONG query DB |
| 5 | Handler | JSON 200 { data: [8 san pham], total: 8, page: 1 } — identical voi CS1 | Response nhanh ~2ms (vs ~20ms DB call) |

| Metric | Cache Miss (CS1) | Cache Hit (CS2) |
| --- | --- | --- |
| Response time (est) | ~20-50ms | ~2-5ms |
| DB queries | 1 SELECT JOIN | 0 |
| Redis operations | 1 GET (miss) + 1 SET | 1 GET (hit) |
| Throughput | DB-limited (~1000 req/s) | Redis-limited (~100k req/s) |

| Case Study 3 — Manager Tao San Pham Moi — object_path, DECIMAL Price, Cache Invalidation
Actor: Manager Browser / Gin / AuthRequired / RBAC / DB / Redis / Bloom
Kich ban: Manager them san pham moi "Banh Cuon Trung Lon" gia 42000 VND. Da upload anh truoc va nhan object_path. Phai invalidate list cache. |
| --- |

| CS3 minh hoa 3 quy tac quan trong: (1) object_path = relative path, khong phai full URL - FE upload anh truoc, nhan object_path, roi tao product. (2) price = DECIMAL(10,0) - server validate la so nguyen, khong chap nhan float. (3) Sau CREATE, phai bloom.Add + invalidate cache de khach hang thay san pham moi ngay lap tuc (hoac sau max 5 phut neu cache con TTL). |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Manager Browser | POST /api/v1/products { "name": "Banh Cuon Trung Lon", "category_id": "cat-banh-cuon-uuid", "price": 42000, "image_path": "uploads/2026/04/banh-cuon-trung.jpg", "is_available": true, "sort_order": 5 } | image_path = object_path (relative), price la so nguyen VND |
| 2 | AuthRequired MW | ParseClaims(Bearer token): sub="manager-uuid-001", role="manager". Inject claims vao context. | Claims available: role="manager" |
| 3 | RBAC MW | AtLeast("manager"): roleLevel["manager"]=3. Required=3. 3 >= 3 -> PASS. | Authorization granted |
| 4 | Handler | ShouldBindJSON: name=required, price=42000 (int > 0 OK), category_id=valid UUID, image_path=optional | Input validation PASS |
| 5 | Service | Validate price: 42000 > 0, khong co decimal. repo.CategoryExists("cat-banh-cuon-uuid") -> true. | Price hop le. Category ton tai. |
| 6 | Repository (DB) | sqlc: newID=UUID(). INSERT INTO products (id, category_id, name, price=42000, image_path="uploads/2026/04/banh-cuon-trung.jpg", is_available=1, sort_order=5) -> RowsAffected=1 | Product tao thanh cong. ID = "prod-bc-trung-uuid" |
| 7 | bloom.go | bloom.Add("product_ids", "prod-bc-trung-uuid") — BF.ADD. Future GET se pass bloom check. | Bloom cap nhat. ID duoc nho. |
| 8 | Redis (cache) | rdb.DeletePattern("products:list:*"): xoa tat ca keys bat dau bang "products:list:". Lan GET tiep theo se fresh tu DB. | Cache invalidated. Khach hang se thay san pham moi trong lan load tiep. |
| 9 | Handler | JSON 201 { "product": { "id": "prod-bc-trung-uuid", "name": "Banh Cuon Trung Lon", "price": 42000, "image_path": "uploads/2026/04/banh-cuon-trung.jpg" } } | image_path (relative), KHONG phai full URL trong response |

| 🚨 RISK: image_path validation — service phai check "uploads/2026/04/banh-cuon-trung.jpg" khong chua "../" (path traversal). Validate bang regex: khong cho phep ".." trong bat ky segment nao cua path. |
| --- |

| Case Study 4 — Chef Thu Tao San Pham — RBAC Bloc 403
Actor: Chef Browser / Gin / AuthRequired MW / RBAC MW
Kich ban: Chef "chef_hung" dang xem KDS, thu goi POST /products de test. Role "chef" (level 1) < required "manager" (level 3). RBAC block ngay truoc khi vao handler. |
| --- |

| RBAC MW chay sau AuthRequired — no doc role tu gin.Context (khong parse lai JWT) va so sanh voi requirement cua endpoint. Chef co role level 1, POST /products yeu cau AtLeast("manager")=level 3. 1 < 3 -> 403 AUTH_003. Request KHONG cham den ProductHandler.CreateProduct hay DB. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Chef Browser | POST /api/v1/products { name: "Test", price: 10000, ... } — Authorization: Bearer <chef_token> | Chef token |
| 2 | AuthRequired MW | ParseClaims(chef_token): role="chef". Inject claims{ role:"chef", sub:"chef-hung-uuid" } vao context. | Claims: role="chef" |
| 3 | RBAC MW | AtLeast("manager"): roleLevel["manager"]=3. RoleFromContext(c)="chef" -> roleLevel["chef"]=1. 1 < 3 -> FAIL. | c.AbortWithStatusJSON(403, { code: "AUTH_003", message: "Khong du quyen" }) |
| 4 | ProductHandler | KHONG BAO GIO DUOC GOI — request bi abort tai RBAC MW | DB khong bi cham. Khong tao san pham. |

| Role | Level | POST /products | PATCH /products/:id | DELETE /products/:id | GET /products |
| --- | --- | --- | --- | --- | --- |
| customer | 0 | 403 | 403 | 403 | OK (public) |
| chef | 1 | 403 | 403 | 403 | OK (public) |
| cashier | 1 | 403 | 403 | 403 | OK (public) |
| staff | 2 | 403 | 403 | 403 | OK (public) |
| manager | 3 | 201 Created | 200 OK | 200 OK | OK (public) |
| admin | 4 | 201 Created | 200 OK | 200 OK | OK (public) |

| Case Study 5 — Admin Xoa Combo — CASCADE combo_items, RESTRICT products
Actor: Admin Browser / Gin / DB FK Constraints
Kich ban: Admin xoa combo "Combo Banh Cuon Dac Biet" (combo-dac-biet-uuid). Combo nay co 3 combo_items. ORDER_ITEMS chua co FK den combos, nhung combo_items co FK ON DELETE CASCADE tu combos. |
| --- |

| Xoa combo co 2 tang FK constraint: (1) combo_items.combo_id FK -> combos.id ON DELETE CASCADE — khi xoa combo, tat ca combo_items cua no tu dong bi xoa. (2) combo_items.product_id FK -> products.id ON DELETE RESTRICT — khong the xoa product neu con combo_item dang reference. Nhung day la chieu nguoc: ta xoa COMBO, khong xoa PRODUCT. Viec xoa combo hoan toan an toan voi products. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Admin | DELETE /api/v1/combos/combo-dac-biet-uuid — Authorization: Bearer <admin_token> | Admin xoa combo |
| 2 | AuthRequired + RBAC MW | AtLeast("admin"): roleLevel["admin"]=4 >= 4. PASS. | Authorized |
| 3 | Service | Check: co active order_items nao dang reference combo nay (combo_id = "combo-dac-biet-uuid")? query order_items WHERE combo_id=? AND order.status NOT IN (delivered, cancelled) | Neu co -> 422: "Combo dang duoc dung trong don hang active, khong the xoa" |
| 4 | Repository (DB) | sqlc: Soft delete: UPDATE combos SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL. RowsAffected=1 -> thanh cong. | Combo bi xoa (soft). RowsAffected=1 |
| 5 | DB (FK CASCADE) | Soft delete KHONG trigger FK CASCADE. combo_items van con trong DB (deleted_at IS NULL). Service phai filter combo WHERE deleted_at IS NULL khi query menu. OQ-P03: can business logic de prevent orphan combo_items neu can clean up. | Combo soft-deleted. combo_items giu nguyen (tham chieu lich su). GET /combos/:id tra 404 vi deleted_at IS NOT NULL. |
| 6 | bloom.go (optional) | Neu dung bloom cho combos: ID van trong bloom (bloom khong ho tro delete). Future GET -> bloom=true -> DB query -> deleted_at IS NOT NULL -> 404. Chap nhan duoc. | False positive cho deleted combo |
| 7 | Redis (cache) | Delete("combos:detail:combo-dac-biet-uuid") + InvalidatePattern("combos:list:*") | Cache cleared |
| 8 | Handler | JSON 200 { message: "Combo da bi xoa" } | Xoa thanh cong |

| FK Constraint | Table | On DELETE | Hau Qua |
| --- | --- | --- | --- |
| fk_ci_combo | combo_items.combo_id -> combos.id | CASCADE | Xoa combo -> auto xoa tat ca combo_items cua no |
| fk_ci_product | combo_items.product_id -> products.id | RESTRICT | Khong the xoa product neu con combo_item dang dung. (Xoa combo truoc, sau do moi xoa product duoc) |
| fk_oi_combo | order_items.combo_id -> combos.id | RESTRICT | Khong the xoa combo neu con order_item active dang reference. Service phai check truoc. |
| fk_oi_product | order_items.product_id -> products.id | RESTRICT | Khong the xoa product neu co order_item reference. Soft delete products de tranh. |

| Case Study 6 — Topping Snapshot — Gia Topping Duoc Lock Tai Order Time
Actor: Customer Browser / OrderService / Repository / DB
Kich ban: Khach them "Pho Cuon Bo" (35000) voi topping "Hanh phi" (5000) va "Dau giam" (3000). Admin tang gia "Hanh phi" len 8000 ngay sau. Don cu van tinh dung. |
| --- |

| Topping snapshot la kiet tac cua design nay. Khi tao order_item, service phai: (1) query topping table lay price HIEN TAI, (2) build toppings_snapshot JSON array, (3) luu vao order_items.toppings_snapshot. Tu do, order_item.unit_price = product.price + SUM(topping.price) tai thoi diem dat hang. Admin thay doi gia topping sau do hoan toan khong anh huong don cu. |
| --- |

| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer | POST /api/v1/orders { items: [{ product_id: "pho-cuon-uuid", quantity: 1, topping_ids: ["top-hanh-phi-uuid", "top-dau-giam-uuid"] }] } | Dat mon voi toppings |
| 2 | OrderService | Lay product: SELECT * FROM products WHERE id="pho-cuon-uuid" -> price=35000 | Product price tai thoi diem dat |
| 3 | OrderService | Lay toppings: SELECT * FROM toppings WHERE id IN ("top-hanh-phi-uuid", "top-dau-giam-uuid") -> hanh_phi.price=5000, dau_giam.price=3000 | Topping prices HIEN TAI (truoc khi admin sua) |
| 4 | OrderService | Build toppings_snapshot = [{"id":"top-hanh-phi-uuid","name":"Hanh phi","price":5000},{"id":"top-dau-giam-uuid","name":"Dau giam","price":3000}]. unit_price = 35000 + 5000 + 3000 = 43000 | Snapshot lock gia tai thoi diem nay |
| 5 | Repository (DB) | INSERT INTO order_items (product_id, name, unit_price=43000, toppings_snapshot=JSON_ABOVE, quantity=1) | Don duoc luu voi gia da snapshot |
| 6 | Admin (sau do) | UPDATE toppings SET price=8000 WHERE id="top-hanh-phi-uuid" — admin tang gia hanh phi len 8000 | Gia moi chi ap dung cho don TUONG LAI |
| 7 | Customer (xem lai don) | GET /api/v1/orders/ord-abc-uuid — hien thi order_item co unit_price=43000 va toppings_snapshot=[{hanh phi:5000}, ...] | DON CU VAN HIEN THI DUNG! 43000 = 35000+5000+3000 (gia cu) |
| 8 | Khach moi dat don | Khach moi dat Pho Cuon Bo + Hanh phi -> query toppings table -> hanh_phi.price=8000 (gia moi) -> unit_price=46000 | Don MOI dung gia moi: 35000+8000+3000=46000 |

| // toppings_snapshot JSON structure in order_items:
{
  "toppings": [
    { "id": "top-hanh-phi-uuid", "name": "Hanh phi", "price": 5000 },
    { "id": "top-dau-giam-uuid", "name": "Dau giam", "price": 3000 }
  ],
  "total_topping": 8000
}

// unit_price = product.price (at order time) + SUM(topping.price in snapshot)
// = 35000 + 5000 + 3000 = 43000
// Stored in order_items.unit_price and toppings_snapshot JSON |
| --- |

# Section 4 — Security Threat Model
| Threat | Attack Vector | Mien | Implementation |
| --- | --- | --- | --- |
| Unauthorized CUD | Attacker thu POST/PATCH/DELETE ma khong co manager token | RBAC MW | AtLeast("manager") enforce truoc khi vao handler. 403 AUTH_003. |
| Price manipulation | Client truyen price bat thuong (0, am, float) trong create request | Service layer | price validation tai service layer: kiem tra > 0 va la so nguyen (VND khong co thap phan). DECIMAL(10,0) trong DB tu choi float rounding. Client khong the inject gia bat thuong vi service validate truoc INSERT — khong phai "price tu DB" nhu Payments domain. |
| Bloom false positive | bloom.Exists("product_ids", id)=true nhung product da bi soft delete hoac khong ton tai | Chap nhan duoc | DB query voi WHERE deleted_at IS NULL la final gate. False positive chi gay 1 extra DB query — khong tai bao mat. |
| Path traversal via object_path | Attacker truyen image_path: "../../etc/passwd" | Service validation | Validate object_path: must not contain ".." segment. Regex: /^[a-zA-Z0-9_\-\/\.]+$/ va khong cho "../". |
| Cache poisoning | Attacker chen du lieu vao Redis cache key | Infrastructure | Redis chi accessible tu internal network (Docker network). Khong expose Redis port ra ngoai. |
| SQL injection via filter | GET /products?category_id=1 OR 1=1 | sqlc | sqlc generate prepared statements — parameters duoc escape. Khong co string concatenation. |
| Enumeration via bloom | Attacker guess UUID, bloom.Exists()=false xac nhan UUID khong ton tai | Chap nhan | Product ID la UUID v4 (random 128-bit) — khong the enumerate. Bloom false negative (Exists=false nhung ton tai) la impossible theo Bloom design. |
| Stale cache serving wrong price | Manager sua price, cache chua expire, khach thay gia cu | Cache invalidation | ProductService.UpdateProduct() phai goi InvalidatePattern("products:*") truoc khi return. Neu Redis down, fallback la DB query — du cache hoat dong sai, chi keo dai max TTL (5 phut). |

# Section 5 — Edge Cases & Extension Design
## 5.1 — Bloom Filter: False Positive vs False Negative
| ℹ️  Bloom filter co the false positive (Exists=true nhung khong co trong DB), NHUNG KHONG BAO GIO false negative (Exists=false nhung co trong DB). Do do: neu bloom.Exists()=false -> chac chan 404, khong can DB. |
| --- |

| Truong Hop | bloom.Exists() | DB Query | Ket Qua | Hau Qua |
| --- | --- | --- | --- | --- |
| ID ton tai, bloom duoc Add | true | Hit — product found | 200 OK | Happy path |
| ID khong ton tai, never Added | false | SKIP — khong query | 404 PRODUCT_001 | Fast fail — bloom tiet kiem DB call |
| ID khong ton tai, false positive | true | Miss — no rows | 404 PRODUCT_001 | Chi ton 1 extra DB query. Rate thap (~1%) |
| ID ton tai nhung bi soft delete | true | Hit nhung deleted_at IS NOT NULL | 404 PRODUCT_001 | DB WHERE clause la final gate |

## 5.2 — Cache Invalidation Strategy
| Trigger | Keys Can Invalidate | Pattern |
| --- | --- | --- |
| POST /products (create) | "products:list:*" | DeletePattern("products:list:*") — tat ca list caches |
| PATCH /products/:id (update) | "products:list:*" + "products:detail:{id}" | Xoa ca list lan detail cache |
| DELETE /products/:id (soft delete) | "products:list:*" + "products:detail:{id}" | Nhu update |
| POST /combos (create) | "combos:list:*" | Combo list cache |
| DELETE /combos/:id | "combos:list:*" + "combos:detail:{id}" | Combo list va detail |
| PATCH /categories/:id | "categories:list" | Category list (TTL 30 phut) |

## 5.3 — Combo Expand Flow (Preview cho Orders Module)
| Combo expand KHONG xay ra trong Products module. GET /combos/:id chi tra ve combo template (mo ta gom nhung mon gi). Expand (tao order_items tu combo_items) xay ra trong OrderService.CreateOrder tai thoi diem dat hang. Xem Orders Case Study cho chi tiet. |
| --- |

| // Combo template (GET /combos/:id response):
{
  "id": "combo-dac-biet-uuid",
  "name": "Combo Banh Cuon Dac Biet",
  "price": 95000,
  "items": [
    { "product_id": "prod-banh-cuon-uuid", "product_name": "Banh Cuon", "quantity": 2 },
    { "product_id": "prod-nuoc-uuid", "product_name": "Nuoc mia", "quantity": 1 }
  ]
}

// Khi dat hang (OrderService.expandCombo):
// 1. Insert combo header row: order_items(combo_id="combo-dac-biet-uuid", combo_ref_id=NULL)
// 2. Insert sub-item rows cho moi combo_item:
//    order_items(product_id="prod-banh-cuon-uuid", combo_ref_id=<header_row_id>, quantity=2)
//    order_items(product_id="prod-nuoc-uuid", combo_ref_id=<header_row_id>, quantity=1)
// Bep nhin vao KDS va thay: Banh Cuon x2, Nuoc mia x1 (khong chi "Combo Dac Biet") |
| --- |

# Section 6 — Open Questions & Flags
| # | Status | Van De | Mo Ta | Nguoi Xu Ly |
| --- | --- | --- | --- | --- |
| OQ-P01 | OPEN | Cache TTL cho list products | TTL 5 phut co the gap trong rush hour: manager sua gia ma khach dang xem gia cu 5 phut. Cân nhac giam xuong 1 phut hoac dung cache invalidation event-driven. | Lead + Manager |
| OQ-P02 | OPEN | Bloom filter cho combos | Hien tai bloom chi implement cho product_ids. Combo ID cung can bloom (GET /combos/:id). Nen dung bloom:combo_ids rieng hay chung voi product_ids? | System Dev + DB Dev |
| OQ-P03 | OPEN | Hard delete vs soft delete cho combo | CS5 da chon soft delete cho combo. combo_items KHONG bi cascade xoa (soft delete khong trigger FK CASCADE). Can business logic: (1) filter combo WHERE deleted_at IS NULL khi query menu, (2) quyet dinh co nen soft-delete orphan combo_items hay giu lai cho audit. Track tren ticket separate. | BA + Lead |
| FLAG-P01 | NOTE | MIME type validation cho image upload | Validate bang magic bytes (first 4 bytes), khong chi Content-Type header (de bi spoof). Ref: Section 4 Path traversal. | BE Dev (khi implement file upload) |

| Banh Cuon System  ·  PRODUCTS & MENU CASE STUDY  ·  v1.0  ·  Thang 4/2026
File: BanhCuon_Products_CaseStudy_v1_0.docx  |  Sections: 0-6  |  Case Studies: CS1-CS6 |
| --- |
