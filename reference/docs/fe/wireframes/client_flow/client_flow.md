Based on the uploaded documentation and wireframes, here's the **complete client (customer) journey** for the Banh Cuon Restaurant Management System:

## **📱 Complete Customer Journey**

### **1. Entry & Authentication (QR Code Scan)**
- **Customer scans QR code** on their table
- Browser opens `/table/{tableId}?token=QR_TOKEN`
- System validates QR token and issues a **Guest JWT** (2-hour expiry, stateless)
- Customer is authenticated as `role=customer` with scope locked to their specific `table_id`

### **2. Menu Browsing** (`/menu`)
As shown in **Image 2**, customers see:
- **Zone B**: Search bar for quick item lookup
- **Zone C**: Category tabs (Tất cả | Bánh Cuốn | Chả | Nước | Combo)
- **Zone D**: Product display with:
  - **Favorites section** (Yêu thích)
  - **Combo meals** with item breakdowns and topping options
  - **Individual items** (Món lẻ) with customizable toppings
  - **Drink preferences** (Nước Dùng) - spice level, sweetness
  - **Notes field** for special requests

**Interaction Flow:**
```
Click Product Card → Check Availability → 
  ├─ Has toppings? → Show ToppingModal (multi-select checkboxes)
  └─ Combo? → Show ComboModal (fixed price, item list)
→ Add to Cart → Continue shopping or checkout
```

### **3. Cart Management**
- **Floating Action Button (FAB)** at bottom shows item count and subtotal
- **CartDrawer** displays:
  - Itemized list with quantities
  - Topping customizations
  - Running total
  - Ability to adjust quantities or remove items

### **4. Checkout Process** (`/checkout`)
Customer fills out:
- Name (customer_name)
- Phone number
- Special notes
- Payment method selection (COD/VNPay/MoMo/ZaloPay)

**Validation:**
- Zod schema validation runs client-side
- Inline errors shown for invalid fields
- **POST /api/v1/orders** submitted

**Error Handling:**
- **409 Conflict**: Table already has active order → Toast "Bàn đang có đơn"
- **4xx/5xx**: Error toast displayed
- **201 Created**: Cart cleared, redirect to order tracking

### **5. Order Tracking** (`/order/{orderId}`)
As shown in **Image 3**, customers see:

**Zone 1 - Order Card (Real-time via SSE):**
- Table number, order ID, status badge
- Total amount and elapsed time
- Live progress bar showing completion percentage

**Zone 2 - Dish Summary Table:**
- Each item shows:
  - Name with toppings
  - Quantity ordered vs. served (tổng/ra/còn)
  - Individual item status dots:
    - ■ Gray = Pending
    - ■ Yellow = Preparing  
    - ■ Green = Done
  - Cancel button (if progress < 30%)

**Zone 3 - Money Summary:**
- Served items total
- Remaining items total
- Grand total

**Zone 4 - Completion Banner:**
- Shows when status = "delivered"
- Thank you message with option to order more

**Zone 5 - Cancel Whole Order:**
- Only visible if progress < 30% and order is active
- Requires confirmation dialog (Modal B)

**Zone 6 - Add More Items:**
- "+ Thêm món" button redirects to `/menu?add_to_order={orderId}`
- Allows adding to existing order (see flow 2.2)

### **6. Real-Time Updates (SSE Connection)**
**Connection Flow:**
```
GET /api/v1/orders/{id}/events (Bearer: Guest JWT)
↓
event: order_init → Full order snapshot
↓
Loop: Keep-alive every 15 seconds
↓
event: item_progress → Chef updates qty_served
  → Update progress bar & status dots
↓
event: order_completed → All items done
  → Status badge "Sẵn sàng" · Progress 100%
```

**Error Handling:**
- **Zone C1**: Connection error banner if SSE fails
- Exponential backoff reconnection (1s → 2s → 4s → 8s → 16s → max 30s)
- "Mất kết nối" banner shown during disconnection

### **7. Order Completion**
- When all items marked done by kitchen:
  - Status changes to **"ready"** → **"delivered"**
  - Green confirmation modal (Modal A): "Nhà hàng đã nhận đơn!"
  - Estimated service time displayed
  - Customer can return to menu to order more

### **Key Features & Rules:**

**Security:**
- Guest JWT stored in memory only (Zustand) — never localStorage
- Scope-locked to specific table_id
- 2-hour expiry with no refresh (must re-scan QR)

**Order Modifications:**
- **Add items**: Allowed if order status = pending/confirmed/preparing
- **Cancel items**: Only if progress < 30%
- **Cancel whole order**: Same restriction, requires confirmation

**Real-Time Sync:**
- SSE for customer-facing updates
- WebSocket for kitchen/POS/admin
- Redis PubSub for cross-service communication

**Multi-Table Support:**
- Each table has independent session
- QR code re-scan required for new session after 2 hours

This creates a **seamless, contactless dining experience** where customers can order, track, and manage their orders entirely from their phones while kitchen and staff coordinate through separate interfaces.