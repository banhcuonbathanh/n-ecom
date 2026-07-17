
**FUNCTIONAL SPECIFICATION DOCUMENT**
FSD v1.0
He Thong Quan Ly Quan Banh Cuon — Phase 1

| Document Type | Functional Specification Document (FSD) |
| --- | --- |
| Version | 1.0 |
| Date | Thang 4 / 2026 |
| Status | Draft — Ready for Engineering Review |
| Tech Stack | Next.js 14 | Go 1.22 + Gin + sqlc | MySQL 8.0 | Redis Stack | Docker + Caddy |
| Covers Specs | Spec 1 (Auth) | Spec 2 (Products) | Spec 3 (Menu/Checkout FE) | Spec 4 (Orders API) | Spec 5 (Payments) |

# 1. DOCUMENT OVERVIEW
## 1.1 Purpose
FSD mo ta CHINH XAC cach moi tinh nang duoc thiet ke va hoat dong: luong du lieu, cau truc DB, API contract, logic BE, component FE va acceptance criteria. Day la tai lieu ky thuat truc tiep cho dev implement — khac voi SRS mo ta 'what', FSD mo ta 'how'.

## 1.2 Module Map
| Module | Spec Ref | Covers |
| --- | --- | --- |
| MOD-01 Auth | Spec1_Auth_Updated_v2 | Login, JWT, refresh rotation, is_active middleware, RBAC guard |
| MOD-02 Products | Spec_2_Products_API_v2 | CRUD categories/products/toppings/combos, Redis cache, sqlc queries |
| MOD-03 Menu FE | Spec_3_Menu_Checkout_UI_v2 | Zustand cart, ToppingModal, SSE hook, /menu→/checkout→/order tracking |
| MOD-04 Orders API | Spec_4_Orders_API | State machine, combo expand, SSE pub/sub, WebSocket KDS hub |
| MOD-05 Payments | Spec_5_Payment_Webhooks | VNPay/MoMo/ZaloPay HMAC, COD, POS UI, webhook idempotency |
| MOD-06 Realtime | MASTER §5 / CLAUDE_SYSTEM | WebSocket hub pattern, SSE Redis Pub/Sub, reconnect logic |

# 2. MOD-01 — Authentication & Authorization
## 2.1 Data Model
**Schema Source: **migrations/001_auth.sql — khong lap lai DDL o day.

| Table.Column | Type | Key Notes |
| --- | --- | --- |
| staff.id | CHAR(36) PK | UUID(). KHONG AUTO_INCREMENT. |
| staff.password_hash | VARCHAR(255) | bcrypt cost=12. KHONG store plain text. |
| staff.role | ENUM 6 values | customer | chef | cashier | staff | manager | admin |
| staff.is_active | TINYINT(1) DEFAULT 1 | Middleware check qua Redis cache TTL 5 phut. Xoa cache ngay khi deactivate. |
| refresh_tokens.token_hash | CHAR(64) UNIQUE | SHA256 hex cua raw token. Raw token KHONG luu DB. |
| refresh_tokens.expires_at | DATETIME NOT NULL | NOW() + 30 days khi tao. |
| refresh_tokens.last_used_at | DATETIME NULL | v1.2 — update moi lan /auth/refresh thanh cong. Dung de xac dinh session cu nhat. |

## 2.2 Login Flow (BE)
Endpoint: POST /api/v1/auth/login
1. Validate request body: { username, password } → 400 COMMON_001 neu thieu

2. Check Redis: login_fail:{ip} >= 5 → 429 COMMON_003 (locked 15 phut)

3. Query DB: GetStaffByUsername(username)

   → Khong tim thay: INCR login_fail:{ip}, EX 900 → 401 AUTH_001

4. bcrypt.CompareHashAndPassword(hash, password)

   → Khong khop: INCR login_fail:{ip} → 401 AUTH_001

   NOTE: 2 truong hop tren cung tra AUTH_001, KHONG phan biet

5. Check staff.is_active == 1 → neu 0: 401 ACCOUNT_DISABLED

6. GenerateAccessToken: JWT HMAC-SHA256, payload={staff_id, role, jti=UUID, exp=24h}

7. GenerateRefreshToken: crypto/rand 32 bytes → hex string

   tokenHash = sha256(refreshToken)[:64]

   key = auth:refresh:{staff_id}:{tokenHash[:16]}

   Redis.Set(key, 'valid', 30d)

   DB.InsertRefreshToken(staff_id, tokenHash, expires_at=+30d)

8. Set-Cookie: refresh_token={raw}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000

9. Response 200: { access_token, staff: { id, username, role, full_name } }

## 2.3 Auth Middleware (BE)
func JWT(secret string) gin.HandlerFunc {

  return func(c *gin.Context) {

    // Step 1: Extract Bearer token

    token := extractBearer(c.GetHeader('Authorization'))

    if token == '' { abort(c, 401, AUTH_001); return }



    // Step 2: Parse JWT — verify algorithm TRUOC

    claims, err := parseJWT(token, secret)

    if err != nil { abort(c, 401, AUTH_001); return }



    // Step 3: Check is_active via Redis cache

    cacheKey := fmt.Sprintf('auth:staff:%s', claims.StaffID)

    val, cacheErr := rdb.Get(ctx, cacheKey).Result()

    if cacheErr == redis.Nil {

      // Cache miss: query DB

      staff, dbErr := staffRepo.GetStaffByID(ctx, claims.StaffID)

      if dbErr != nil || !staff.IsActive {

        abort(c, 401, 'ACCOUNT_DISABLED'); return

      }

      rdb.Set(ctx, cacheKey, 'active', 5*time.Minute)

    } else if cacheErr != nil || val != 'active' {

      abort(c, 401, 'ACCOUNT_DISABLED'); return

    }



    // Step 4: Set context values

    c.Set('staff_id', claims.StaffID)  // string UUID

    c.Set('role', claims.Role)           // string

    c.Next()

  }

}

## 2.4 RBAC Middleware (BE)
Role hierarchy map (dung so de compare, khong dung string):
var roleValue = map[string]int{

  'customer': 0,

  'chef':     1,

  'cashier':  1,

  'staff':    2,

  'manager':  3,

  'admin':    4,

}



func RequireRole(minRole string) gin.HandlerFunc {

  return func(c *gin.Context) {

    role := c.GetString('role')

    if roleValue[role] < roleValue[minRole] {

      abort(c, 403, AUTH_003); return

    }

    c.Next()

  }

}



// Usage trong router:

// r.GET('/products', productHandler.List)              // public

// r.POST('/products', RequireRole('manager'), handler) // manager+

## 2.5 Frontend Auth Store (FE)
File: fe/features/auth/auth.store.ts
interface AuthState {

  user: { id: string; username: string; role: string; full_name: string } | null

  accessToken: string | null  // IN-MEMORY ONLY. KHONG localStorage.

  setAuth: (user: AuthState['user'], token: string) => void

  clearAuth: () => void

}



export const useAuthStore = create<AuthState>((set) => ({

  user: null,

  accessToken: null,

  setAuth: (user, accessToken) => set({ user, accessToken }),

  clearAuth: () => set({ user: null, accessToken: null }),

}))



// Khi F5 (page reload): onMount → GET /auth/me

// BE tu dong dung refresh token trong httpOnly cookie

// Neu 401 → clearAuth() → redirect /login

## 2.6 Axios Interceptor (FE)
File: fe/lib/api-client.ts
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL, withCredentials: true })



// Request interceptor: attach Bearer token

api.interceptors.request.use(config => {

  const token = useAuthStore.getState().accessToken

  if (token) config.headers.Authorization = `Bearer ${token}`

  return config

})



// Response interceptor: 401 → refresh → retry

let isRefreshing = false

let queue: Array<(token: string) => void> = []



api.interceptors.response.use(null, async (error) => {

  if (error.response?.status !== 401) return Promise.reject(error)

  if (isRefreshing) {

    return new Promise(res => queue.push(res))

      .then(token => { error.config.headers.Authorization = `Bearer ${token}`

                       return api(error.config) })

  }

  isRefreshing = true

  try {

    const { data } = await axios.post('/auth/refresh', {}, { withCredentials: true })

    useAuthStore.getState().setAuth(data.staff, data.access_token)

    queue.forEach(cb => cb(data.access_token))

    queue = []

    error.config.headers.Authorization = `Bearer ${data.access_token}`

    return api(error.config)

  } catch {

    useAuthStore.getState().clearAuth()

    window.location.href = '/login'

  } finally { isRefreshing = false }

})

## 2.7 Acceptance Criteria — MOD-01
| AC ID | Criterion | Verify Method |
| --- | --- | --- |
| AC-AUTH-01 | Dang nhap sai username va sai password deu tra 401 AUTH_001, response body giong het nhau. | Postman: 2 request khac nhau, so sanh body |
| AC-AUTH-02 | Sau 5 lan dang nhap sai trong 1 phut tu cung IP → 429. Doi 15 phut → duoc thu lai. | Automated test voi loop |
| AC-AUTH-03 | Login 2 lan tren 2 tab → 2 refresh tokens khac nhau → ca 2 deu goi /auth/refresh thanh cong. | Integration test |
| AC-AUTH-04 | Logout tab 1 → tab 2 van /auth/refresh thanh cong (multi-session). | Manual test 2 tabs |
| AC-AUTH-05 | Admin set is_active=false → DEL Redis cache → request tiep theo voi JWT cu → 401 ACCOUNT_DISABLED. | Redis CLI + Postman |
| AC-AUTH-06 | 10 request lien tiep voi token hop le → chi 1 DB query (kiem tra slow query log, phan con lai tu Redis). | DB slow query log |
| AC-AUTH-07 | F5 khi da login → onMount goi /auth/me → user van duoc set trong Zustand (khong bi logout). | Browser dev tools |
| AC-AUTH-08 | Kiem tra localStorage: khong tim thay access_token, refresh_token hay bat ky token nao. | Browser console: localStorage |

# 3. MOD-02 — Products & Menu Management
## 3.1 API Contract
⚠  Field naming: price (KHONG base_price), image_path (KHONG image_url), toppings.price (KHONG price_delta). Khong co slug column.

| Method | Endpoint | Role | Notes |
| --- | --- | --- | --- |
| GET | /api/v1/categories | Public | Redis cache key: categories:list. TTL 5p. Tra cac category is_active=1. |
| GET | /api/v1/products | Public | Query: ?category_id=UUID&available=true. Cache key: products:list:{cat_id}:{avail}. |
| GET | /api/v1/products/:id | Public | Tra product + toppings (LEFT JOIN) + category name. |
| POST | /api/v1/products | Manager+ | Body: { category_id(UUID), name, price, image_path, sort_order, topping_ids[] } |
| PATCH | /api/v1/products/:id | Manager+ | Partial update. Invalidate Redis cache sau khi update. |
| DELETE | /api/v1/products/:id | Manager+ | Soft delete: set is_active=0 + deleted_at=NOW(). Khong xoa vat ly. |
| PATCH | /api/v1/products/:id/availability | Manager+ | Body: { is_available: bool }. Toggle nhanh het mon. |
| GET | /api/v1/combos | Public | Tra combos kem combo_items expand (JSON_ARRAYAGG). Cache 5p. |
| POST/PATCH/DELETE | /api/v1/toppings | Manager+ | Tuong tu products. Gon tru toppings.price (KHONG price_delta). |

## 3.2 Response Shape — GET /products
// GET /api/v1/products?category_id=UUID&available=true

// Response 200

{

  "data": [

    {

      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // CHAR(36) UUID — string

      "category_id": "c2d3e4f5-...",                  // string UUID

      "category_name": "Banh Cuon",

      "name": "Banh Cuon Thit",

      // slug field KHONG TON TAI — migration 002 khong co slug

      "description": "Banh cuon nhan thit heo xay...",

      "price": 45000,                    // DECIMAL(10,0) — VND, int-like

      "image_path": "products/img.jpg",  // object_path tuong doi, KHONG full URL

      "is_available": true,

      "sort_order": 1,

      "toppings": [

        { "id": "t1b2c3d4-...", "name": "Cha lua", "price": 10000 }

        // price — KHONG price_delta

      ]

    }

  ]

}

## 3.3 Redis Cache Strategy
// Service layer — ListProducts()

func (s *ProductService) ListProducts(categoryID *string, available bool) ([]Product, error) {

  // categoryID la *string (UUID), khong phai *int

  key := fmt.Sprintf('products:list:%v:%v', derefStr(categoryID), available)



  // 1. Check Redis

  if cached, err := s.rdb.Get(ctx, key).Result(); err == nil {

    var products []Product

    json.Unmarshal([]byte(cached), &products)

    return products, nil

  }



  // 2. Cache miss → query DB (sqlc)

  products, err := s.repo.ListProductsWithToppings(ctx, categoryID, available)

  if err != nil { return nil, err }



  // 3. Set cache TTL 5 phut

  data, _ := json.Marshal(products)

  s.rdb.Set(ctx, key, data, 5*time.Minute)

  return products, nil

}



// Invalidate: goi khi CRUD products/categories/toppings/combos

func (s *ProductService) invalidateCache() {

  keys, _ := s.rdb.Keys(ctx, 'products:list:*').Result()

  if len(keys) > 0 { s.rdb.Del(ctx, keys...) }

  s.rdb.Del(ctx, 'categories:list')

}

## 3.4 Frontend — Product Types (Corrected)
// fe/types/product.ts

export interface Topping {

  id: string          // UUID string — KHONG number

  name: string

  price: number       // 'price' — KHONG 'price_delta'

  is_available: boolean

}



export interface Product {

  id: string          // UUID string

  category_id: string // UUID FK

  category_name: string

  name: string

  // slug KHONG CO — migration 002 khong co slug column

  description: string | null

  price: number       // 'price' — KHONG 'base_price'

  image_path: string | null  // object_path tuong doi

  is_available: boolean

  toppings: Topping[]

}



export interface Combo {

  id: string

  category_id: string | null  // v1.1 — co the null

  name: string

  price: number

  image_path: string | null   // 'image_path' — KHONG 'image_url'

  sort_order: number          // v1.1

  is_available: boolean

  items: Array<{ product_id: string; product_name: string; quantity: number }>

}

## 3.5 Acceptance Criteria — MOD-02
| AC ID | Criterion | Verify |
| --- | --- | --- |
| AC-PRD-01 | GET /products tra dung toppings theo product (LEFT JOIN). Topping co field 'price', khong phai 'price_delta'. | Postman + DB check |
| AC-PRD-02 | GET /combos tra dung combo_items expand, bao gom category_id va sort_order (migration v1.1). | API response check |
| AC-PRD-03 | DELETE /products/:id → is_active=0, deleted_at set. Product van ton tai trong DB (soft delete). | DB query sau delete |
| AC-PRD-04 | Redis cache invalidate sau PATCH/POST/DELETE → lan tiep theo goi DB (khong cache cu). | Redis KEYS *products:list* |
| AC-PRD-05 | Tat ca IDs trong response la string UUID (CHAR 36). KHONG phai integer. | JSON response type check |
| AC-PRD-06 | image_path trong response la duong dan tuong doi (vd: 'products/img.jpg'), KHONG phai full URL. | So sanh voi DB |

# 4. MOD-03 — Menu & Checkout UI (Frontend)
## 4.1 Customer Flow Overview
/menu → ToppingModal/ComboModal → CartDrawer → /checkout → POST /orders → /order/[id] → SSE tracking

## 4.2 Zustand Cart Store
// fe/store/cart.ts

interface CartItem {

  id: string           // 'product_${uuid}_${toppingIds}' hoac 'combo_${uuid}'

  type: 'product' | 'combo'

  productId?: string   // UUID string — KHONG number

  comboId?: string     // UUID string — KHONG number

  name: string

  quantity: number

  unit_price: number   // product.price + sum(selected topping.price)

  selected_toppings: Topping[]

  topping_snapshot: object  // JSON gui len API

}



interface CartStore {

  items: CartItem[]

  tableId: string | null        // set boi /table/[tableId]

  paymentMethod: string | null  // set boi /checkout (KHONG gui trong POST /orders)

  addItem: (item: Omit<CartItem, 'quantity'>) => void  // tang qty neu trung id

  removeItem: (id: string) => void

  updateQty: (id: string, qty: number) => void

  clearCart: () => void

  setTableId: (tableId: string) => void

  setPaymentMethod: (method: string) => void

  total: number     // computed

  itemCount: number // computed

}

## 4.3 Checkout Submit Logic
⚠  POST /orders KHONG co payment_method. orders table khong co column nay. payment_method thuoc payments table.
// fe/app/checkout/page.tsx

const submitOrder = useMutation({

  mutationFn: async (form: CheckoutForm) => {

    // 1. Luu payment method vao store TRUOC khi goi API

    cartStore.setPaymentMethod(form.payment_method)



    const payload = {

      customer_name:  form.customer_name,

      customer_phone: form.customer_phone,

      note:           form.note ?? null,

      table_id:       cartStore.tableId ?? null,

      source:         cartStore.tableId ? 'qr' : 'online',  // 'online'|'qr'|'pos'

      // KHONG co payment_method — day la loi pho bien nhat

      items: cartStore.items.map(item => ({

        product_id:       item.productId ?? null,   // string UUID | null

        combo_id:         item.comboId   ?? null,   // string UUID | null

        quantity:         item.quantity,

        unit_price:       item.unit_price,

        topping_snapshot: item.topping_snapshot,

      }))

    }

    return api.post('/orders', payload).then(r => r.data)

  },

  onSuccess: (data) => {

    cartStore.clearCart()

    router.push(`/order/${data.id}`)  // data.id la UUID string

  },

})

## 4.4 SSE Order Tracking Hook
⚠  Endpoint: /orders/:id/events (KHONG /orders/:id/sse?token=). Token qua Bearer header, KHONG URL param.
// fe/hooks/useOrderSSE.ts

const WS_RECONNECT = {

  maxAttempts: 5, baseDelay: 1000, maxDelay: 30_000, showBannerAfter: 3

}



export function useOrderSSE(orderId: string) {  // string UUID

  const [order, setOrder] = useState<Order | null>(null)

  const [connectionError, setConnectionError] = useState(false)

  const attemptsRef = useRef(0)

  const token = useAuthStore(state => state.accessToken)  // Zustand, KHONG localStorage



  useEffect(() => {

    let es: EventSource

    let retryTimer: NodeJS.Timeout



    const connect = () => {

      // DUNG endpoint va auth dung

      es = new EventSource(

        `${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}/events`,

        { headers: { Authorization: `Bearer ${token}` } }

      )

      es.onopen = () => { attemptsRef.current = 0; setConnectionError(false) }



      es.addEventListener('item_progress', e => {

        const d = JSON.parse(e.data)  // { item_id: string, qty_served: number }

        setOrder(prev => updateItemProgress(prev, d))

      })

      es.addEventListener('order_status_changed', e => {

        const d = JSON.parse(e.data)  // { status }

        setOrder(prev => prev ? { ...prev, status: d.status } : prev)

      })

      es.addEventListener('order_completed', () => {

        setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev)

        es.close()

      })

      es.onerror = () => {

        es.close()

        attemptsRef.current++

        if (attemptsRef.current >= WS_RECONNECT.showBannerAfter) setConnectionError(true)

        if (attemptsRef.current < WS_RECONNECT.maxAttempts) {

          const delay = Math.min(

            WS_RECONNECT.baseDelay * 2 ** (attemptsRef.current - 1),

            WS_RECONNECT.maxDelay

          )

          retryTimer = setTimeout(connect, delay)

        }

      }

    }

    connect()

    return () => { es?.close(); clearTimeout(retryTimer) }

  }, [orderId, token])



  const progress = useMemo(() => {

    if (!order?.items?.length) return 0

    const total  = order.items.reduce((s, i) => s + i.quantity, 0)

    const served = order.items.reduce((s, i) => s + i.qty_served, 0)

    return Math.round((served / total) * 100)

  }, [order])



  return { order, progress, connectionError }

}

## 4.5 Acceptance Criteria — MOD-03
| AC ID | Criterion | Verify |
| --- | --- | --- |
| AC-FE-01 | POST /orders payload KHONG co payment_method field. Co source field (online|qr|pos). | Network tab DevTools |
| AC-FE-02 | cartStore.setPaymentMethod() duoc goi truoc api.post('/orders'). | Unit test |
| AC-FE-03 | SSE ket noi toi /orders/:id/events voi Authorization: Bearer header. KHONG co ?token= trong URL. | Network tab: request headers |
| AC-FE-04 | Token doc tu useAuthStore (Zustand). KHONG co localStorage.getItem trong useOrderSSE. | Code review + localStorage check |
| AC-FE-05 | SSE reconnect: sau 3 lan that bai → hien banner do. Sau 5 lan → dung thu lai. | Network throttle simulation |
| AC-FE-06 | Progress bar tinh dung: SUM(qty_served) / SUM(quantity) * 100%. Update realtime khi nhan item_progress SSE. | Integration test |
| AC-FE-07 | Nut Huy Don chi hien khi progress < 30 va status != delivered. | UI test |

# 5. MOD-04 — Orders API (Backend)
## 5.1 State Machine
Happy path: pending → confirmed → preparing → ready → delivered
Cancel path: pending | confirmed | preparing → cancelled (neu < 30%)

| Transition | Trigger | Condition | Role |
| --- | --- | --- | --- |
| → pending | POST /orders | Khong co active order tai ban | customer, cashier, staff |
| pending → confirmed | Manual hoac auto 30s | Khong co | cashier, staff, manager |
| confirmed → preparing | Chef click item dau tien | Bat dau lam it nhat 1 item | Auto (be trigger) |
| preparing → ready | Tat ca items done | SUM(qty_served)=SUM(quantity) | Auto (be trigger) |
| ready → delivered | Sau thanh toan | payment.status=completed | cashier, staff |
| any → cancelled | DELETE /orders/:id | qty_served / quantity < 0.30 | customer (own), cashier |

## 5.2 POST /orders — Create Order
⚠  orders table khong co payment_method column. source = online|qr|pos. created_by (KHONG staff_id).
// POST /api/v1/orders

// Request body

{

  'customer_name':  'Nguyen Van A',

  'customer_phone': '0901234567',

  'note':           'It cay',

  'table_id':       'TABLE-UUID-hoac-null',

  'source':         'online',  // online | qr | pos

  // KHONG co payment_method

  'items': [

    {

      'product_id': 'PRODUCT-UUID',  // hoac null neu la combo

      'combo_id':   null,             // hoac COMBO-UUID

      'quantity':   2,

      'unit_price': 55000,

      'topping_snapshot': [{ 'id': 'TOPPING-UUID', 'name': 'Cha lua', 'price': 10000 }]

    }

  ]

}



// Validation:

// - items khong duoc rong

// - product_id XOR combo_id (khong duoc ca 2 null hoac ca 2 set)

// - unit_price > 0

// - table_id: check active order → 409 ORDER_001 neu co



// Response 201

{ 'id': 'ORDER-UUID', 'order_number': 'ORD-20260424-001',

  'status': 'pending', 'total_amount': 290000, 'created_at': '...' }

## 5.3 Combo Expand Logic
// Trong DB transaction — tat ca fail thi rollback

func (s *OrderService) expandCombo(ctx context.Context, tx *sql.Tx, item OrderItemInput, orderID string) error {

  // 1. Lay combo_items tu DB

  comboItems, err := s.repo.GetComboItems(ctx, item.ComboID)



  // 2. Tao parent row (combo header)

  parentID := uuid.New().String()

  err = s.repo.InsertOrderItem(ctx, tx, OrderItem{

    ID:       parentID,

    OrderID:  orderID,

    ComboID:  &item.ComboID,  // set

    // ProductID: nil

    // ComboRefID: nil (day la parent)

    Name:     item.Name,

    Quantity: item.Quantity,

    UnitPrice: item.UnitPrice,

  })



  // 3. Tao sub-item rows (moi mon trong combo)

  for _, ci := range comboItems {

    err = s.repo.InsertOrderItem(ctx, tx, OrderItem{

      ID:         uuid.New().String(),

      OrderID:    orderID,

      ProductID:  &ci.ProductID,  // set

      ComboRefID: &parentID,      // tro ve parent

      Name:       ci.ProductName,

      Quantity:   item.Quantity * ci.Quantity,

      UnitPrice:  0,  // gia cua combo, khong tach gia sub-item

    })

  }

  return nil

}

## 5.4 Chef KDS — PATCH /orders/:id/items/:itemId/status
// PATCH — Chef click item tren KDS

// Server tu cycle: pending → preparing → done

// KHONG can body



func (s *OrderService) CycleItemStatus(ctx context.Context, itemID string) (*ItemUpdateResult, error) {

  // 1. Bat dau DB transaction

  tx, _ := s.db.BeginTx(ctx, nil)



  // 2. Doc order_item hien tai, derive status tu qty_served

  //    (KHONG co item.status column — derive tu qty_served)

  item, _ := s.repo.GetOrderItemForUpdate(ctx, tx, itemID)

  currentStatus := deriveStatus(item.QtyServed, item.Quantity)

  //   deriveStatus: 0 → pending; 0<x<qty → preparing; x=qty → done



  // 3. Tinh qty moi

  newQtyServed := item.QtyServed

  switch currentStatus {

  case 'pending':   newQtyServed = 1

  case 'preparing': newQtyServed = item.Quantity  // mark done

  case 'done':      return nil, ErrAlreadyDone

  }



  // 4. Update qty_served

  s.repo.UpdateQtyServed(ctx, tx, itemID, newQtyServed)



  // 5. Kiem tra tat ca items done → auto order.status = ready

  allDone, _ := s.repo.AllItemsDone(ctx, tx, item.OrderID)

  if allDone { s.repo.UpdateOrderStatus(ctx, tx, item.OrderID, 'ready') }



  // 6. Commit

  tx.Commit()



  // 7. Publish SSE event

  s.pubsub.Publish(ctx, fmt.Sprintf('order:%s:events', item.OrderID),

    Event{ Type: 'item_progress',

           Data: map[string]any{ 'item_id': itemID, 'qty_served': newQtyServed } })



  // 8. Broadcast WS event toi KDS va orders-live

  s.wsHub.Broadcast(Event{ Type: 'item_updated', ... })



  return &ItemUpdateResult{..., OrderStatus: ternary(allDone, 'ready', '')}, nil

}

## 5.5 Acceptance Criteria — MOD-04
| AC ID | Criterion | Verify |
| --- | --- | --- |
| AC-ORD-01 | POST /orders voi combo → DB co 1 parent row + N sub-item rows kem combo_ref_id tro ve parent. | DB query ORDER_ITEMS |
| AC-ORD-02 | POST /orders tai ban da co active order → 409 ORDER_001. | Integration test |
| AC-ORD-03 | State machine: skip transition (vd: pending → ready) → 422 ORDER_004. | Postman patch test |
| AC-ORD-04 | Chef click item lan 1 → qty_served=1 (preparing). Click lan 2 → qty_served=quantity (done). Customer nhan SSE item_progress. | E2E test |
| AC-ORD-05 | Tat ca items done → order.status tu dong chuyen sang ready. | Check DB sau click cuoi |
| AC-ORD-06 | DELETE /orders/:id khi SUM(qty_served)/SUM(qty) = 0.35 → 409 ORDER_002. | Postman delete test |
| AC-ORD-07 | orders.payment_method khong ton tai trong schema — POST /orders voi field nay → field bi bo qua (khong error). | DB schema check |

# 6. MOD-05 — Payment Processing
## 6.1 Payment Flow
| Flow | Steps |
| --- | --- |
| COD (Tien mat) | Cashier xac nhan → POST /payments { order_id, method:'cash' } → BE: payment.status=completed + order.status=delivered → Response 201 |
| QR (VNPay/MoMo/ZaloPay) | Cashier chon QR → POST /payments → BE goi gateway API → nhan qr_code_url → FE hien QR → Khach quet → Gateway POST webhook → BE verify HMAC → update payment+order → WS broadcast payment_success |

## 6.2 Webhook Handler — VNPay
// POST /api/v1/webhooks/vnpay

func (h *PaymentHandler) VNPayWebhook(c *gin.Context) {

  var params map[string]string

  c.BindJSON(&params)  // hoac bind URL query params tuy gateway



  // BUOC 1: Verify HMAC-SHA512 TRUOC BAT KY LOGIC NAO

  secureHash := params['vnp_SecureHash']

  delete(params, 'vnp_SecureHash')

  delete(params, 'vnp_SecureHashType')



  // Sort keys alphabetically, join 'key=value&...'

  keys := sortedKeys(params)

  queryStr := buildQueryString(keys, params)

  computed := hmacSHA512(cfg.VNPayHashSecret, queryStr)



  if !strings.EqualFold(computed, secureHash) {

    c.JSON(200, gin.H{'RspCode': '97', 'Message': 'Invalid signature'})

    return  // REJECT — KHONG xu ly tiep

  }



  // BUOC 2: Lay payment tu DB bang gateway_ref

  payment, _ := s.repo.GetPaymentByRef(ctx, params['vnp_TxnRef'])



  // BUOC 3: Idempotency check

  if payment.Status == 'completed' {

    c.JSON(200, gin.H{'RspCode': '00', 'Message': 'Confirm Success'})

    return  // Da xu ly roi, tra 200 de gateway khoi gui lai

  }



  // BUOC 4: Verify amount

  if params['vnp_Amount'] != strconv.FormatInt(payment.Amount*100, 10) {

    log.Error('Amount mismatch', ...)

    c.JSON(200, gin.H{'RspCode': '04', 'Message': 'Invalid amount'})

    return

  }



  // BUOC 5: Update payment va order

  if params['vnp_ResponseCode'] == '00' {

    s.repo.UpdatePaymentCompleted(ctx, payment.ID, params['vnp_TransactionNo'])

    s.repo.UpdateOrderDelivered(ctx, payment.OrderID)

    s.wsHub.BroadcastPaymentSuccess(payment)

  }



  // BUOC 6: VNPay yeu cau response nay (plain text, KHONG JSON)

  c.JSON(200, gin.H{'RspCode': '00', 'Message': 'Confirm Success'})

}

## 6.3 Idempotency & Retry Pattern
⚠  UNIQUE(order_id) tren bang payments. Retry PHAI UPDATE, KHONG INSERT. Duplicate webhook xu ly 1 lan.
// Khi Cashier retry (vd: gateway timeout, F5 trang):

func (s *PaymentService) CreateOrRetry(ctx context.Context, req CreatePaymentReq) (*Payment, error) {

  // Kiem tra da co payment chua

  existing, err := s.repo.GetPaymentByOrderID(ctx, req.OrderID)



  if err == nil {  // Da ton tai

    if existing.Status == 'completed' {

      return nil, ErrPaymentAlreadyCompleted  // 409 PAYMENT_001

    }

    // Chua completed → UPDATE attempt_count++ va tra lai

    s.repo.IncrementAttempt(ctx, existing.ID)

    return existing, nil

  }



  // Chua co → INSERT moi

  return s.repo.InsertPayment(ctx, req)

}

## 6.4 POS Frontend — /cashier/payment/[id]
// fe/app/cashier/payment/[id]/page.tsx

// Nhan WS event payment_success → toast + print + redirect

useEffect(() => {

  const handler = (event: PaymentSuccessEvent) => {

    if (event.payment_id !== paymentId) return  // chi xu ly dung payment

    toast.success(`Thanh toan thanh cong: ${formatVND(event.amount)}`)

    window.print()        // In hoa don

    router.push('/cashier')

  }

  cashierWS.on('payment_success', handler)

  return () => cashierWS.off('payment_success', handler)

}, [paymentId])



// In hoa don: @media print { .no-print { display: none } }

// Receipt: logo, so don, ban, ngay gio, list items + gia, tong, phuong thuc, loi cam on

## 6.5 Acceptance Criteria — MOD-05
| AC ID | Criterion | Verify |
| --- | --- | --- |
| AC-PAY-01 | POST /payments khi order.status='preparing' → 409. Chi 'ready' moi tao duoc payment. | Postman test |
| AC-PAY-02 | COD: payment.status=completed + order.status=delivered ngay lap tuc sau POST /payments. | DB check |
| AC-PAY-03 | VNPay webhook voi sai signature → 200 RspCode:97, payment.status KHONG thay doi. | Postman with wrong HMAC |
| AC-PAY-04 | Webhook goi 2 lan → chi 1 lan update DB (idempotency). attempt_count tang len nhung status chi completed 1 lan. | DB check attempt_count |
| AC-PAY-05 | Sau webhook completed → FE cashier nhan WS event payment_success → toast + Window.print() duoc goi. | E2E test + browser devtools |
| AC-PAY-06 | gateway_data chua raw webhook payload (KHONG phai 'webhook_payload'). DB column name chinh xac. | DB schema check |

# 7. MOD-06 — Realtime Communication
## 7.1 WebSocket Hub Pattern (BE)
// be/internal/websocket/hub.go

type Hub struct {

  clients    map[*Client]bool   // connected KDS clients

  broadcast  chan Message        // message to broadcast

  register   chan *Client

  unregister chan *Client

}



func (h *Hub) Run() {

  for {

    select {

    case client := <-h.register:

      h.clients[client] = true

    case client := <-h.unregister:

      if _, ok := h.clients[client]; ok {

        delete(h.clients, client)

        close(client.send)

      }

    case msg := <-h.broadcast:

      for client := range h.clients {

        select {

        case client.send <- msg:

        default:  // Client cham — dong ket noi

          close(client.send)

          delete(h.clients, client)

        }

      }

    }

  }

}



// Auth khi connect: ?token={jwt} (WS browser khong support custom header)

// Heartbeat: server ping moi 30s, Pong timeout 10s → close neu khong pong



// Message types (client receives):

// new_order | item_updated | order_cancelled | order_flagged | payment_success

// Format: { 'type': 'new_order', 'payload': { ...order data } }

## 7.2 SSE Handler (BE)
// be/internal/sse/handler.go

func (h *SSEHandler) StreamOrder(c *gin.Context) {

  orderID := c.Param('id')



  // Set SSE headers

  c.Header('Content-Type', 'text/event-stream')

  c.Header('Cache-Control', 'no-cache')

  c.Header('Connection', 'keep-alive')

  c.Header('X-Accel-Buffering', 'no')  // Ngan Nginx buffer SSE



  // Subscribe Redis Pub/Sub channel: 'order:{orderID}:events'

  // (KHONG phai 'order:{orderID}:channel')

  sub := h.rdb.Subscribe(c.Request.Context(),

    fmt.Sprintf('order:%s:events', orderID))

  defer sub.Close()



  // Gui initial state

  order, _ := h.orderSvc.GetOrder(orderID)

  fmt.Fprintf(c.Writer, 'event: order_init\ndata: %s\n\n', toJSON(order))

  c.Writer.Flush()



  // Heartbeat ticker — ngan proxy timeout

  ticker := time.NewTicker(15 * time.Second)

  defer ticker.Stop()



  for {

    select {

    case msg := <-sub.Channel():

      fmt.Fprintf(c.Writer, 'event: %s\ndata: %s\n\n', msg.Type, msg.Payload)

      c.Writer.Flush()

      if msg.Type == 'order_completed' { return }



    case <-ticker.C:

      fmt.Fprintf(c.Writer, ': keep-alive\n\n')

      c.Writer.Flush()



    case <-c.Request.Context().Done():

      return  // Client disconnect

    }

  }

}

## 7.3 Redis Key Schema (Realtime)
| Key Pattern | Type | TTL | Purpose |
| --- | --- | --- | --- |
| order:{order_id}:events | Pub/Sub | N/A | SSE stream theo doi don hang. BE publish, SSE handler subscribe. |
| kds:channel | Pub/Sub | N/A | Broadcast order moi toi tat ca KDS clients. |
| table_order:{table_id} | String | 24h | Fast check ban co active order. Update khi order tao/xong. |
| payment_timeout:{id} | String | 15p | Keyspace notification → timeout job huy payment het han. |
| bloom:order_exists | Bloom Filter | Permanent | Fast existence check truoc DB query. Giam tai DB. |

## 7.4 Acceptance Criteria — MOD-06
| AC ID | Criterion | Verify |
| --- | --- | --- |
| AC-RT-01 | WS KDS: sau khi POST /orders → KDS nhan new_order event trong < 100ms. | E2E test voi timer |
| AC-RT-02 | SSE: sau khi Chef click item → customer trang /order/[id] nhan item_progress va progress bar update. | Browser DevTools EventStream |
| AC-RT-03 | SSE heartbeat ':keep-alive' hien thi trong browser EventStream tab moi 15 giay. | Browser DevTools |
| AC-RT-04 | WS client ngat mang → server phat hien sau 10s (Pong timeout) → dong ket noi → FE reconnect. | Network tab throttle |
| AC-RT-05 | SSE token tu Zustand store, KHONG tu localStorage. KHONG co ?token= trong URL. | Network tab: request URL + header |

# 8. DATABASE — CRITICAL GOTCHAS
Day la nhung loi thuong gap nhat. Doc truoc khi viet bat ky query hoac migration.

| SAI (se gay bug) | DUNG | Bang Anh Huong |
| --- | --- | --- |
| id INT / uint64 (Go) | id CHAR(36) — UUID string | Tat ca bang |
| base_price | price (cot chinh xac) | products |
| price_delta | price (cot chinh xac) | toppings |
| image_url | image_path (object_path tuong doi) | products, combos |
| orders.staff_id | orders.created_by (FK, co the NULL) | orders |
| payments.webhook_payload | payments.gateway_data (JSON) | payments |
| payment status 'success' | 'completed' | payments |
| orders.payment_method | Khong ton tai — o payments.method | orders |
| INSERT payment khi retry | UPDATE row hien co (UNIQUE order_id) | payments |
| order_items.status column | Khong ton tai — derive tu qty_served | order_items |
| order_items.flagged column | Khong ton tai — pending Issue #5 | order_items |
| slug tren products/categories | Khong ton tai trong bat ky migration nao | products, categories |
| Hard delete payments | Chi dung deleted_at (soft delete) | payments |

# 9. OPEN ISSUES & PENDING DECISIONS
| ID | Issue | Impact | Owner |
| --- | --- | --- | --- |
| OPEN-01 | order_items.status va flagged: Approach A (them column qua migration 008) vs Approach B (derive tu qty_served). Anh huong KDS FE derive logic va API response shape. | HIGH — block KDS FE | Lead+BA |
| OPEN-02 | POST /auth/guest: chua co trong API_CONTRACT v1.1. Can dinh nghia TTL, co luu refresh_tokens khong, rate limit. Block /table/[tableId] FE page. | MED — block QR flow | Lead |
| OPEN-03 | table.status (occupied/reserved) chi implement 'available' va 'inactive' trong Phase 1. Khong build logic phu thuoc vao 'occupied' cho den Phase 2. | LOW | BA |

BanhCuon System — FSD v1.0 — Thang 4/2026 — Confidential