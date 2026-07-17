# BE API DTO & Error Reference

> Last generated: 2026-06-05 (P-BEDOC-3 core · P-BEDOC-4 admin).
> Source of truth: handler binding structs + `c.JSON` blocks in `be/internal/handler/*.go`,
> error codes from `be/internal/service/errors.go` + `ERROR_CONTRACT_v1.1.md`.
> Routes + auth levels live in [`BE_STRUCTURE.md` → Route Table](BE_STRUCTURE.md#route-table) — not repeated here.
>
> **Purpose:** read field shapes here instead of opening handlers. If a struct changes, update the matching row.

---

## Response envelope (all endpoints)

| Outcome | Shape |
|---|---|
| Success (data) | `{"data": <object|array>}` |
| Success (list) | `{"data": [ ... ]}` |
| Create | `201 {"data": {"id": "<uuid>"}}` (some return `group_id`) |
| Update / no body | `200 {"message": "..."}` or `204` |
| Error | `{"error": "<CODE>", "message": "...", "details": {...}?}` |

`details` is optional. Untyped server errors → `500 {"error":"COMMON_002"}`. Validation binding failures → `400 INVALID_INPUT`.

## Error code catalog (service sentinels — `service/errors.go`)

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_INPUT` | 400 | Binding/validation failed |
| `INVALID_CREDENTIALS` | 401 | Wrong username/password |
| `ACCOUNT_DISABLED` | 401 | `is_active = 0` |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token bad/expired |
| `FORBIDDEN` | 403 | RBAC level too low |
| `NOT_FOUND` | 404 | Resource missing |
| `TABLE_HAS_ACTIVE_ORDER` | 409 | One-active-order rule |
| `ORDER_NOT_READY` | 409 | Payment attempted before `status = ready` |
| `PAYMENT_ALREADY_EXISTS` | 409 | UNIQUE(order_id) — retry must UPDATE |
| `ORDER_ALREADY_GROUPED` | 409 | Order already in another group |
| `CATEGORY_HAS_PRODUCTS` | 409 | Delete blocked — category non-empty |
| `DUPLICATE_NAME` | 409 | Category name conflict |
| `CANCEL_THRESHOLD` | 422 | Cancel blocked — ≥30% served |
| `RATE_LIMIT_EXCEEDED` | 429 | Login throttle |
| `FILE_TOO_LARGE` / `UNSUPPORTED_FILE_TYPE` | 422 | Upload validation |
| `INTERNAL_ERROR` / `COMMON_002` | 500 | Server error |

> Every endpoint below can additionally return `INVALID_INPUT` (400) on malformed body, `FORBIDDEN` (403) if under the route's auth level, and `COMMON_002` (500) on unexpected failure. Only the *notable* extra codes are listed per endpoint.

---

## Auth

| Endpoint | Request body | Success | Notable errors |
|---|---|---|---|
| `POST /auth/login` | `{username: req min3, password: req min8}` | `200 {data:{access_token, user:{id,username,full_name,role,email}}}` + refresh cookie | `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`, `RATE_LIMIT_EXCEEDED` |
| `POST /auth/register` | `{username: req min3, password: req min6, ...}` | `201 {data:{...}}` | — |
| `POST /auth/refresh` | (refresh token from httpOnly cookie) | `200 {data:{access_token}}` + rotated cookie | `REFRESH_TOKEN_INVALID` |
| `POST /auth/guest` | `{qr_token: req len64}` | `200 {data:{access_token, expires_in, table:{id,name,capacity,status}}}` | `NOT_FOUND` (bad token) |
| `POST /auth/logout` | (cookie) | `204` | — |
| `GET /auth/me` | — | `200 {data:{id,username,full_name,role,email,phone,is_active}}` | — |

## Products / Categories / Toppings / Combos

> Field names match DB (`price` not `base_price`, `image_path` not `image_url`). `price` is sent as integer VND.

| Endpoint | Request body | Success |
|---|---|---|
| `GET /products`, `/products/all`, `/products/:id` | — | `200 {data: ProductJSON | [ProductJSON]}` |
| `POST /products` | `{name: req, price: req min0, category_id: req, description, image_path, topping_ids[], is_available?*bool, sort_order}` | `201 {data:{id}}` |
| `PATCH /products/:id` | same as create but `topping_ids` is `*[]string` (omit = leave unchanged) | `200 {message}` |
| `PATCH /products/:id/availability` | (same handler as update) | `200 {message}` |
| `GET /categories` | — | `200 {data:[...]}` |
| `POST /categories` | `{name: req, description, sort_order}` | `201 {data:{id}}` |
| `PATCH /categories/:id` | `{name: req, description, sort_order}` | `200 {message}` |
| `DELETE /categories/:id` | — | `200 {message}` · errors `CATEGORY_HAS_PRODUCTS`, `DUPLICATE_NAME` on rename |
| `GET /toppings` | — | `200 {data:[...]}` |
| `POST /toppings` | `{name: req, price: min0}` | `201 {data:{id}}` |
| `PATCH /toppings/:id` | `{name: req, price: min0, is_available?*bool}` | `200 {message}` |
| `GET /combos` | — | `200 {data:[...]}` |
| `POST /combos` | `{name: req, price: req min0, category_id, description, image_path, sort_order, items:[{product_id: req, quantity: req min1}]}` | `201 {data:{id}}` |
| `PATCH /combos/:id` | same + `items: req min2` | `200 {message}` |
| `DELETE` (product/topping/combo) | — | `200 {message}` (admin only) |

`ProductJSON` = `{id, name, price, description, image_path (→ STORAGE_BASE_URL+path), category_id, is_available, sort_order, toppings:[...]}` (see `productJSON()` in `product_handler.go`).

## Orders

| Endpoint | Request body | Success | Notable errors |
|---|---|---|---|
| `POST /orders` | `{table_id?, source: req oneof(online qr pos), customer_name?, customer_phone?, note?, items:[{product_id|combo_id (exactly one), quantity: req min1, topping_ids[], note, filling?(thit\|moc_nhi), combo_items?:[{product_id req(∈combo), quantity req min1, note?, filling?}]}] req min1}` | `201 {data:{id}}` | `TABLE_HAS_ACTIVE_ORDER`, item must have product_id XOR combo_id, combo_items product ∉ combo → `INVALID_INPUT` |
| `GET /orders`, `/orders/live`, `/orders/history` | — | `200 {data:[OrderJSON]}` | — |
| `GET /orders/:id` | — | `200 {data: OrderJSON}` | `NOT_FOUND` |
| `PATCH /orders/:id/status` | `{status: req}` | `200 {message}` | invalid transition → `INVALID_INPUT`/409 |
| `DELETE /orders/:id` (cancel) | — | `200 {message}` | `CANCEL_THRESHOLD` (≥30% served) |
| `POST /orders/:id/items` | `{items:[{product_id|combo_id, quantity: req min1, topping_ids[], note, filling?, combo_items?}] req min1}` — same item schema as `POST /orders` | `200 {data:{...}}` | recalculates `total_amount` |
| `PATCH /orders/items/:id/quantity` | `{quantity: req min1}` | `200 {message}` | recalculates `total_amount` |
| `PATCH /orders/items/:id` (served) | `{qty_served: min0}` | `200 {message}` | chef+; `qty_served ≤ quantity` |
| `DELETE /orders/items/:id` | — | `200 {message}` | recalculates `total_amount` |

> No `order_items.status` column — derive from `qty_served` (0=pending, partial=preparing, =quantity=done).

### Where order items get serialized (keep these in sync — touch ALL when adding an item field)

| Serializer | File | Feeds | Per-item fields |
|---|---|---|---|
| `orderJSON()` → **OrderJSON** | `handler/order_handler.go` | `GET /orders`, `/orders/:id`, `/live`, `/history` (customer order page, POS, history) | id, product_id, combo_id, combo_ref_id, name, unit_price, quantity, qty_served, item_status, toppings_snapshot, note, **filling** |
| `buildItemsJSON()` via `GroupOrderJSON()` | `service/group_service.go` | Admin **Overview** SSE + order-group views (WaitingSection, PrepPanel) | id, name, quantity, qty_served, unit_price, item_status, product_id, combo_id, combo_ref_id, note, **filling**, toppings_snapshot |

> **Combo row convention (do not break — caused a double-count bug once):** a combo expands to **1 header row** (`combo_id` set, `combo_ref_id` NULL, `unit_price = 0` — it is a label) + **N sub-item rows** (`combo_ref_id` = header id, real prices). `recalculateTotalAmount` sums every row, so the header MUST be 0 or the combo is counted twice. Every FE read view hides the header (`combo_id && !combo_ref_id`) and sums the sub-items. `filling` lives on the standalone/sub-item rows, never the header. Client `combo_items` overrides replace the canonical template (server prices only); see `expandCombo` in `service/order_service.go`.

## Payments

| Endpoint | Request body | Success | Notable errors |
|---|---|---|---|
| `POST /payments` | `{order_id: req, method: req oneof(vnpay momo zalopay cash)}` | `201 {data:{...payment, pay_url? for online}}` | `ORDER_NOT_READY` (status≠ready), `PAYMENT_ALREADY_EXISTS` |
| `GET /payments/:id` | — | `200 {data: payment}` | `NOT_FOUND` |
| `POST /payments/webhook/vnpay` | gateway query/body (HMAC) | `200 {RspCode, Message}` — `00`=ok, `97`=bad checksum, `99`=fail | HMAC verified FIRST; idempotent |
| `POST /payments/webhook/momo` | gateway JSON (HMAC) | `204` ok · `200 {resultCode, message}` on signature/err | idempotent |
| `POST /payments/webhook/zalopay` | gateway form (HMAC) | `200 {return_code, return_message}` — `1`=ok, `0`=fail | idempotent |

> Webhooks always return `200`-class to the gateway even on logical failure (gateway retry semantics) — except malformed request → `400`.

## Order Groups

| Endpoint | Request body | Success | Notable errors |
|---|---|---|---|
| `POST /orders/group` | `{order_ids:[] req min2}` | `201 {data:{group_id}}` | `ORDER_ALREADY_GROUPED` |
| `GET /orders/group/:id` | — | `200 {data:[orders]}` | `NOT_FOUND` |
| `POST /orders/group/:id/orders` | `{order_id: req}` | `200/201 {data:{...}}` | `ORDER_ALREADY_GROUPED` |
| `DELETE /orders/group/:id/orders/:orderId` | — | `200 {message}` | — |
| `DELETE /orders/group/:id` (disband) | — | `200 {message}` (manager+) | — |

---

## Staff

> Create uses `[]string` shifts; update uses pointer fields (omit = leave unchanged). `role` validated by service against RBAC enum.

| Endpoint | Request body | Success |
|---|---|---|
| `GET /staff` | — | `200 {data:[StaffJSON]}` |
| `GET /staff/:id` | — | `200 {data: StaffDetailJSON}` |
| `POST /staff` | `{username: req min3 max50, password: req min8, full_name: req min2 max100, role: req, job_title, shifts:[], responsibilities, phone, email}` | `201 {data: StaffJSON}` |
| `PATCH /staff/:id` | `{full_name?, role?, job_title?, shifts:[], responsibilities?, phone?, email?}` (all `*` optional) | `200 {data: StaffDetailJSON}` |
| `PATCH /staff/:id/status` | `{is_active: bool}` | `200 {data:{...}}` |
| `DELETE /staff/:id` | — | `200 {message}` (admin only; blocked if last admin) |

`StaffDetailJSON` adds `job_title, shifts, responsibilities, phone, email, is_active` over the list shape.

## Tables

| Endpoint | Request body / query | Success |
|---|---|---|
| `GET /tables/qr/:token` | — (public) | `200 {data:{...table}}` · `NOT_FOUND` |
| `GET /tables` | — | `200 {data:[...]}` |
| `POST /tables` | `{name: req, capacity: req min1}` | `201 {data:{id, qr_token}}` |
| `PATCH /tables/:id` | `{name: req, capacity: req min1, is_active?*bool}` | `200 {message}` · `NOT_FOUND` |

## Analytics (manager+, read-only)

> All take `?range=` query (default `today`). Date-derived; no body.

| Endpoint | Query | Success |
|---|---|---|
| `GET /admin/summary` | `range` | `200 {data:{...revenue/order metrics}}` |
| `GET /admin/top-dishes` | `range`, `limit` (default 5) | `200 {data:[...]}` |
| `GET /admin/staff-performance` | `range` | `200 {data:[...]}` |

## Ingredients (manager+)

> ⚠️ camelCase JSON keys here (`importDate`, `shelfDays`), unlike snake_case elsewhere. Quantities are floats.

| Endpoint | Request body / query | Success |
|---|---|---|
| `GET /admin/ingredients` | — | `200 {data:[IngredientJSON]}` |
| `GET /admin/ingredients/low-stock` | — | `200 {data:[...]}` |
| `GET /admin/ingredients/:id` | — | `200 {data: IngredientJSON}` |
| `POST /admin/ingredients` | `{name: req max150, unit: req max30, importDate: req YYYY-MM-DD, shelfDays: req min1, initialQuantity, warningThreshold}` | `201 {data: IngredientJSON}` |
| `PATCH /admin/ingredients/:id` | `{name?, unit?, importDate?, shelfDays?, warningThreshold?}` (all `*` optional) | `200 {data: IngredientJSON}` |
| `DELETE /admin/ingredients/:id` | — | `200 {message}` (admin only) |
| `GET /admin/ingredients/:id/movements` | — | `200 {data:[...]}` |
| `POST /admin/stock-movements` | `{ingredient_id: req, type: req (in|out|adjustment), quantity: req gt0, note}` | `201 {data:{...}}` |

## Tasks (manager+)

> `date` query defaults to today (`YYYY-MM-DD`).

| Endpoint | Request body / query | Success |
|---|---|---|
| `GET /admin/tasks/stats` | `?date` | `200 {data: StaffTaskStats}` |
| `GET /admin/tasks` | `?staffId` (req), `?date` | `200 {data:[TaskDTO]}` · `INVALID_INPUT` if no staffId |
| `POST /admin/tasks` | `{staffId: req, name: req min1 max200, description, priority: req, dueDateTime: req, dueTimeStart, dueTimeEnd, notes}` | `201 {data: TaskDTO}` |

## Training (manager+; DELETE = admin)

> camelCase keys. `role` + `responsibleRoles[]` target one or many roles.

| Endpoint | Request body / query | Success |
|---|---|---|
| `GET /admin/training/guides` | `?role` filter | `200 {data:[GuideJSON]}` |
| `POST /admin/training/guides` | `{title: req, role: req, description, coverImageUrl, youtubeUrl, qualityKpiTarget, quantityKpiTarget, passThreshold, maxAttempts, published, responsibleRoles:[]}` | `201 {data: GuideJSON}` |
| `PATCH /admin/training/guides/:id` | same as POST | `200 {data: GuideJSON}` |
| `DELETE /admin/training/guides/:id` | — | `200 {message}` (admin only) |
| `GET /admin/training/guides/:id/progress` | `?page` (1), `?pageSize` (10) | `200 {data:[...], pagination}` |
| `GET /admin/training/staff/:staffId/progress/:guideId` | — | `200 {data: ProgressDetailJSON}` |
| `PATCH /admin/training/staff/:staffId/progress/:guideId` | `{managerNotes}` | `200 {message}` |

## Marketing (manager+)

| Endpoint | Request | Success |
|---|---|---|
| `GET /admin/marketing/spend` | — | `200 {...}` — **static hardcoded campaign data, no DB/service** |

## Files

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| `POST /files/upload` | `multipart/form-data` field `file` (image/jpeg, image/png, image/webp; ≤10MB) | `201 {data:{id, object_path, ...}}` | `INVALID_INPUT`, `FILE_TOO_LARGE` (422), `UNSUPPORTED_FILE_TYPE` (422) |

---

## Realtime (SSE / WS — not request/response)

| Endpoint | Protocol | Auth | Channels |
|---|---|---|---|
| `GET /orders/:id/events` | SSE | auth | `order:{id}` |
| `GET /orders/group/:id/events` | SSE | auth | `group:{id}` |
| `GET /sse/admin` | SSE | manager+ | admin floor monitor |
| `GET /sse/order-monitor/:id` | SSE | auth | `order:{id}` + `queue:broadcast` + `tables:broadcast` |
| `GET /ws/kds` | WebSocket | JWT via query param | KDS new-order feed |
| `GET /ws/orders-live` | WebSocket | JWT via query param | POS live feed |

