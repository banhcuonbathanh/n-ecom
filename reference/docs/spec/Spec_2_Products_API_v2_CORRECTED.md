| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
SPEC 2 — Products API (Backend) — v2.0 CORRECTED
Model: Sonnet  ·  Branch: feat/2-products-api  ·  Phụ thuộc: specs/1.md (Auth)
Go Gin · sqlc · MySQL 8.0 · Redis Cache  |  Corrections applied from SPEC_CORRECTION_SHEET_v1.0 |
| --- |

| ℹ️  Products API — CRUD cho products, categories, toppings, combos. Redis cache 5 phút.
     Data layer cho Frontend (spec 3) và Orders API (spec 4).

     v2.0 CORRECTED: Áp dụng toàn bộ corrections từ SPEC_CORRECTION_SHEET_v1.0
     — ID type: CHAR(36) UUID  ·  Schema drift fixed  ·  Slug removed  ·  Field names synced |
| --- |

| Model: Sonnet | Branch: feat/2-products-api | Phụ thuộc: specs/1.md (Auth middleware) |
| --- | --- | --- |

**1. Mục Tiêu**
Xây dựng toàn bộ CRUD API cho products, categories, toppings, và combos.
Đây là data layer mà Frontend (spec 3) và Orders API (spec 4) phụ thuộc.
**2. Phạm Vi**
| Phần | Nội Dung |
| --- | --- |
| Backend | REST API CRUD cho products / categories / toppings / combos |
| Frontend cần | Đọc menu public, Manager CRUD sản phẩm |
| Không thuộc spec này | Inventory deduction (spec 4), File upload (dùng lại file_attachments từ spec 1) |

**3. Database Schema**
| 🔴  CORRECTED — Issue #1 + #2.1 — Schema section replaced with migration reference |
| --- |

| Schema định nghĩa chính thức → xem migrations/002_products.sql và migrations/004_combos.sql

Không lặp lại DDL ở đây — migration là SINGLE SOURCE OF TRUTH.
Spec này chỉ ghi lại các điểm khác biệt quan trọng cần biết khi implement: |
| --- |

**3.1 Key Column Reference (sync với migration)**
| Table | Column (ĐÚNG) | Type | Ghi chú |
| --- | --- | --- | --- |
| categories | id | CHAR(36) DEFAULT (UUID()) | Không có slug column |
| categories | name, sort_order, is_active | VARCHAR / INT / TINYINT |  |
| products | id, category_id | CHAR(36) | Không có slug column |
| products | price | DECIMAL(10,0) | ⚠ KHÔNG phải base_price |
| products | image_path | VARCHAR(500) | ⚠ KHÔNG phải image_url — lưu object_path |
| toppings | price | DECIMAL(10,0) | ⚠ KHÔNG phải price_delta |
| combos | id, category_id | CHAR(36) | category_id NULL FK → categories |
| combos | price, image_path, sort_order | DECIMAL / VARCHAR / INT | ⚠ image_path (không phải image_url) |
| combo_items | id, combo_id, product_id | CHAR(36) |  |

**4. API Endpoints**
**4.1 Categories**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | /api/v1/categories | Public | Danh sách categories đang active |
| POST | /api/v1/categories | Manager+ | Tạo category mới |
| PATCH | /api/v1/categories/:id | Manager+ | Update category |
| DELETE | /api/v1/categories/:id | Manager+ | Soft delete (is_active=false) |

**4.2 Products**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | /api/v1/products | Public | Danh sách products, filter theo category |
| GET | /api/v1/products/:id | Public | Chi tiết product kèm toppings |
| POST | /api/v1/products | Manager+ | Tạo product mới |
| PATCH | /api/v1/products/:id | Manager+ | Update product |
| DELETE | /api/v1/products/:id | Manager+ | Soft delete |
| PATCH | /api/v1/products/:id/availability | Manager+ | Toggle is_available |

**4.3 Toppings**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | /api/v1/toppings | Public | Tất cả toppings active |
| POST | /api/v1/toppings | Manager+ | Tạo topping |
| PATCH | /api/v1/toppings/:id | Manager+ | Update topping |
| DELETE | /api/v1/toppings/:id | Manager+ | Soft delete |
| POST | /api/v1/products/:id/toppings | Manager+ | Gắn toppings vào product |
| DELETE | /api/v1/products/:id/toppings/:toppingId | Manager+ | Gỡ topping khỏi product |

**4.4 Combos**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | /api/v1/combos | Public | Danh sách combos active kèm items |
| GET | /api/v1/combos/:id | Public | Chi tiết combo |
| POST | /api/v1/combos | Manager+ | Tạo combo |
| PATCH | /api/v1/combos/:id | Manager+ | Update combo |
| DELETE | /api/v1/combos/:id | Manager+ | Soft delete |

**5. Request / Response Examples**
| 🔴  CORRECTED — Issues #1 & #2.1 — id: number→string(UUID), base_price→price, image_url→image_path, price_delta→price, slug removed |
| --- |

**GET /products**
| Query params: |
| --- |

| ?category_id=<uuid>   // filter theo category (optional) — CHAR(36) UUID
?available=true       // chỉ lấy available (optional, default true cho public)
?page=1&limit=20      // pagination (default: không paginate, lấy tất cả) |
| --- |

| // Response 200
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // string UUID ✓
      "category_id": "c2d3e4f5-...",                  // string UUID ✓
      "category_name": "Bánh Cuốn",
      "name": "Bánh Cuốn Thịt",
      // slug field REMOVED — không có trong migration ✓
      "description": "Bánh cuốn nhân thịt heo xay...",
      "price": 45000,                                  // ✓ ĐÚNG (không phải base_price)
      "image_path": "products/banh-cuon-thit.jpg",    // ✓ object_path (không phải image_url)
      "is_available": true,
      "toppings": [
        { "id": "t1b2c3d4-...", "name": "Chả lụa",    "price": 10000 },  // price ✓
        { "id": "t2c3d4e5-...", "name": "Trứng chiên", "price": 8000  }   // price ✓
      ]
    }
  ]
} |
| --- |

**GET /products/:id**
| // Response 200 — chi tiết product đầy đủ
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // string UUID ✓
  "name": "Bánh Cuốn Thịt",
  "price": 45000,                                  // ✓ price (không phải base_price)
  "image_path": "products/banh-cuon-thit.jpg",    // ✓ object_path
  "toppings": [...],
  "category": {
    "id": "c2d3e4f5-...",                          // string UUID ✓
    "name": "Bánh Cuốn"
  }
} |
| --- |

**GET /combos**
| // Response 200 — combo kèm items expand
{
  "data": [
    {
      "id": "cb123456-...",       // string UUID ✓
      "category_id": "cat123-...", // string UUID ✓ (v1.1 migration)
      "name": "Combo Gia Đình",
      "price": 180000,
      "image_path": "combos/combo-gia-dinh.jpg",  // ✓ object_path
      "sort_order": 1,                              // ✓ v1.1 migration
      "items": [
        { "product_id": "pd111111-...", "product_name": "Bánh Cuốn Thịt", "quantity": 2 },
        { "product_id": "pd222222-...", "product_name": "Chả Lụa",        "quantity": 1 }
      ]
    }
  ]
} |
| --- |

**POST /products**
| // Request — Manager+
{
  "category_id": "c2d3e4f5-...",    // string UUID ✓
  "name": "Bánh Cuốn Nhân Tôm",
  "description": "...",
  "price": 55000,                    // ✓ price (không phải base_price)
  "image_path": "products/xxx.jpg",  // ✓ object_path từ POST /api/v1/files/upload
  "sort_order": 5,
  "topping_ids": ["t1b2c3-...", "t2c3d4-..."]   // UUID strings ✓
}

// Response 201
{
  "id": "new-uuid-...",  // string UUID ✓
  "name": "Bánh Cuốn Nhân Tôm",
  ...
} |
| --- |

**PATCH /products/:id/availability**
| // Request
{ "is_available": false }

// Response 200
{
  "id": "a1b2c3d4-...",  // string UUID ✓
  "is_available": false
} |
| --- |

**6. Business Rules**
| 🔴  CORRECTED — Issue #2.1 — Slug rule removed (not in migration) |
| --- |

| Rule | Chi tiết |
| --- | --- |
| Public endpoint | GET /products, GET /combos, GET /categories, GET /toppings — không cần auth |
| Soft delete | Không xóa vật lý — set is_active=false. Product đang có trong order không ảnh hưởng |
| is_available vs is_active | is_available: toggle nhanh hết món hôm nay. is_active: ẩn khỏi hệ thống vĩnh viễn |
| Price là VND | Lưu DECIMAL(10,0) — không có phần thập phân. Field name: price (không phải base_price hay price_delta) |
| image_path | Lưu object_path (relative path) — KHÔNG phải full URL. Full URL = STORAGE_BASE_URL (env var) + image_path |
| Slug — REMOVED ✓ | Migration 002 và 004 không có slug column → KHÔNG auto-generate, KHÔNG có unique slug constraint. Đã xóa khỏi spec này. |
| Topping snapshot | Không thuộc spec này — snapshot toppings vào order_items khi đặt hàng (spec 4) |

**7. Redis Caching**
| 🔴  CORRECTED — Issue #1 — categoryID *int → *string in Go code (UUID) |
| --- |

| Cache key:  products:list:{category_id}:{available}
            // category_id là UUID string (CHAR 36), không phải int
TTL:        5 phút
Invalidate: Mọi PATCH/POST/DELETE vào products/categories |
| --- |

| // Pattern trong service layer — ✓ CORRECTED (UUID string)
func (s *ProductService) ListProducts(categoryID *string, available bool) ([]Product, error) {
    // categoryID là *string (UUID), không phải *int
    cacheKey := fmt.Sprintf("products:list:%v:%v", derefString(categoryID), available)
    // 1. Check Redis cache
    // 2. Cache miss → query DB
    // 3. Set cache với TTL 5 phút
    // 4. Return data
}

// Helper (tránh nil pointer)
func derefString(s *string) string {
    if s == nil { return "all" }
    return *s
} |
| --- |

**8. File Structure**
| Backend:
internal/
  products/
    handler.go           // HTTP handlers
    service.go           // Business logic + caching
    repository/
      products_queries.sql  // sqlc SQL files
      products.go           // sqlc generated code |
| --- |

**9. sqlc Query Examples**
| 🔴  CORRECTED — Issues #1 & #2.1 — INT→CHAR(36), base_price→price, price_delta→price, slug removed from queries |
| --- |

| -- name: ListProductsWithToppings :many
-- ✓ CORRECTED: t.price (không phải t.price_delta); p.price (không phải p.base_price)
-- ✓ CORRECTED: Không có slug column
SELECT
    p.*,
    c.name AS category_name,
    JSON_ARRAYAGG(
        JSON_OBJECT('id', t.id, 'name', t.name, 'price', t.price)  -- price ✓
    ) AS toppings
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN product_toppings pt ON pt.product_id = p.id
LEFT JOIN toppings t ON t.id = pt.topping_id AND t.is_active = true
WHERE p.is_active = true
  AND (@category_id = '' OR p.category_id = @category_id)  -- '' = no filter (UUID string)
  AND (@available_only = false OR p.is_available = true)
GROUP BY p.id
ORDER BY c.sort_order, p.sort_order; |
| --- |

| -- name: GetComboWithItems :one
-- ✓ CORRECTED: includes category_id, sort_order (migration v1.1 columns)
SELECT
    cb.id, cb.name, cb.price, cb.image_path, cb.category_id, cb.sort_order,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'product_id',   ci.product_id,
            'product_name', p.name,
            'quantity',     ci.quantity
        )
    ) AS items
FROM combos cb
JOIN combo_items ci ON ci.combo_id = cb.id
JOIN products p ON p.id = ci.product_id
WHERE cb.id = @id AND cb.is_active = true
GROUP BY cb.id; |
| --- |

**10. Acceptance Criteria**
| ☐ | GET /products trả đúng toppings cho mỗi product (LEFT JOIN). Field: price (không phải price_delta) |
| --- | --- |
| ☐ | GET /combos trả đúng combo_items expand, bao gồm category_id và sort_order |
| ☐ | Manager có thể CRUD products, categories, toppings, combos |
| ☐ | Customer/Chef/Cashier không thể gọi POST/PATCH/DELETE (403) |
| ☐ | Soft delete không xóa data — product vẫn trong DB |
| ☐ | is_available=false ẩn khỏi public menu |
| ☐ | Redis cache invalidate đúng khi có thay đổi |
| ☐ | Tất cả IDs là UUID string (CHAR 36) — không phải integer |
| ☐ | image_path lưu object_path (relative) — full URL = STORAGE_BASE_URL + image_path |
| ☐ | Không có slug field trong response hay DB query (column không tồn tại trong migration) |

| 🍜  BanhCuon System  ·  SPEC 2 — Products API  ·  v2.0 CORRECTED  ·  Tháng 4 / 2026 |
| --- |
