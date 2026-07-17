# 📊 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## Tích Hợp Marketing & Analytics
> **Version:** v1.0 · Tháng 4/2026
> **Mục đích:** Theo dõi hành vi khách hàng, đo lường hiệu quả và tối ưu trải nghiệm.

---

## 1. Tổng Quan Các Công Cụ

| Công Cụ | Mục Đích | Sprint Tích Hợp | Bắt Buộc? |
|---|---|---|---|
| Google Analytics 4 (GA4) | Theo dõi lưu lượng, hành vi, tỷ lệ đặt món | Phase 5 (FE — trước UAT) | BẮT BUỘC |
| Google Tag Manager (GTM) | Quản lý tập trung tracking — không cần sửa code | Phase 5 (cài sớm nhất) | BẮT BUỘC |
| Google Search Console | Theo dõi SEO, indexing | Phase 7+ (sau Go-Live) | KHUYẾN NGHỊ |
| Facebook Pixel + CAPI | Tracking từ quảng cáo Facebook/Instagram | Phase 5–6 (nếu chạy ads FB) | TÙY CHỌN |
| Server-side Conversion Tracking | Chống mất data do ad blocker | Phase 6 | TÙY CHỌN |

---

## 2. Google Tag Manager (GTM)

### 2.1 Tại Sao GTM?

- Thêm/sửa tracking snippet mà **không cần deploy lại code**
- Một điểm quản lý tất cả tracking (GA4, Facebook, heatmap, v.v.)
- Non-dev (Marketing) có thể tự thêm tag sau Go-Live

### 2.2 Cài Đặt GTM

**Phase 5 (FE scaffold) — cài đặt vào `fe/app/layout.tsx`:**

```tsx
// app/layout.tsx — GTM snippet
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID  // GTM-XXXXXXX

  return (
    <html lang="vi">
      <head>
        {/* GTM Head */}
        <Script
          id="gtm-head"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`
          }}
        />
      </head>
      <body>
        {/* GTM Body (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  )
}
```

### 2.3 DataLayer Helper

```typescript
// fe/lib/gtm.ts
type GTMEvent = {
  event: string
  [key: string]: unknown
}

export const pushToDataLayer = (event: GTMEvent) => {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(event)
}
```

---

## 3. Google Analytics 4 (GA4)

### 3.1 Events Cần Track

| Event Name | Khi Nào | Parameters |
|---|---|---|
| `page_view` | Auto (GTM) | `page_title`, `page_location` |
| `view_item_list` | Khách xem menu | `item_list_name`, `items[]` |
| `view_item` | Khách xem chi tiết sản phẩm | `item_id`, `item_name`, `price` |
| `add_to_cart` | Khách thêm món vào giỏ | `item_id`, `item_name`, `price`, `quantity` |
| `begin_checkout` | Khách mở trang giỏ hàng | `value`, `items[]` |
| `purchase` | Đơn hàng tạo thành công | `transaction_id`, `value`, `items[]` |
| `order_status_change` | Order chuyển trạng thái | `order_id`, `from_status`, `to_status` |
| `login` | Nhân viên đăng nhập | `method: "username"` |

### 3.2 Implement Purchase Event

```typescript
// Gọi sau khi POST /orders thành công
import { pushToDataLayer } from '@/lib/gtm'

const trackPurchase = (order: Order) => {
  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: order.id,
      value: order.total_amount,
      currency: 'VND',
      items: order.items.map(item => ({
        item_id: item.product_id,
        item_name: item.name,
        price: item.unit_price,
        quantity: item.quantity,
      })),
    },
  })
}
```

### 3.3 Cấu Hình GA4 trong GTM

1. Tạo **GA4 Configuration Tag** với Measurement ID (`G-XXXXXXXXXX`)
2. Trigger: **All Pages**
3. Tạo **GA4 Event Tags** cho từng event trong §3.1
4. Dùng **DataLayer Variable** để lấy parameters

---

## 4. SEO On-page

### 4.1 Next.js Metadata (Static)

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: { default: 'Bánh Cuốn Bà Hà', template: '%s | Bánh Cuốn Bà Hà' },
  description: 'Quán bánh cuốn ngon nhất quận — đặt món QR nhanh chóng',
  openGraph: {
    type: 'restaurant.restaurant',
    locale: 'vi_VN',
    siteName: 'Bánh Cuốn Bà Hà',
  },
  robots: { index: true, follow: true },
}
```

### 4.2 Structured Data (Schema.org)

```typescript
// components/RestaurantSchema.tsx — đặt trong layout
const restaurantSchema = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'Bánh Cuốn Bà Hà',
  servesCuisine: 'Vietnamese',
  hasMenu: process.env.NEXT_PUBLIC_SITE_URL + '/table',
  acceptsReservations: false,
  priceRange: '$$',
}
```

### 4.3 Sitemap Tự Động

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: 'https://example.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    // Thêm trang tĩnh khác
  ]
}
```

---

## 5. Facebook Pixel + Conversions API (CAPI)

> **Chỉ cần nếu chạy quảng cáo Facebook/Instagram.** Cài sprint 7–8.

### 5.1 Tại Sao Cần Server-side (CAPI)?

- iOS 14+ và ad blocker chặn browser-side pixel → mất 30–60% conversion data
- CAPI gửi event trực tiếp từ BE → đảm bảo dữ liệu đầy đủ

### 5.2 Events Cần Gửi

| FB Standard Event | Khi Nào | Gửi Qua |
|---|---|---|
| `ViewContent` | Xem trang menu | Browser Pixel |
| `AddToCart` | Thêm món | Browser Pixel |
| `InitiateCheckout` | Mở giỏ hàng | Browser Pixel |
| `Purchase` | Đơn hàng created | **CAPI (BE)** — chính xác nhất |

### 5.3 CAPI Implementation (BE — Go)

```go
// be/pkg/facebook/capi.go
type PurchaseEvent struct {
    EventName  string      `json:"event_name"`
    EventTime  int64       `json:"event_time"`
    EventID    string      `json:"event_id"`    // dedup với browser pixel
    UserData   UserData    `json:"user_data"`
    CustomData CustomData  `json:"custom_data"`
}

func SendPurchaseEvent(orderID string, value int64, userPhone string) error {
    payload := PurchaseEvent{
        EventName: "Purchase",
        EventTime: time.Now().Unix(),
        EventID:   orderID,                      // FE dùng cùng ID để dedup
        UserData:  UserData{Phone: hashPhone(userPhone)},
        CustomData: CustomData{Value: float64(value), Currency: "VND"},
    }
    // POST https://graph.facebook.com/v18.0/<pixel_id>/events?access_token=<token>
    return sendToFBAPI(payload)
}
```

---

## 6. KPI & Dashboard

### 6.1 Metrics Quan Trọng (Theo Dõi Hàng Ngày)

| Metric | Định Nghĩa | Mục Tiêu |
|---|---|---|
| Tổng đơn/ngày | Số order delivered trong ngày | Tăng 10%/tháng |
| Doanh thu/ngày | SUM(total_amount) của delivered orders | Tăng 15%/tháng |
| Tỷ lệ hoàn thành đơn | Delivered / (Delivered + Cancelled) | ≥ 90% |
| Thời gian xử lý đơn | confirmed → ready (phút) | ≤ 15 phút |
| Giá trị đơn trung bình | Doanh thu / Số đơn | Theo dõi trend |

### 6.2 Query Báo Cáo (BE Reports API)

```sql
-- Doanh thu theo ngày (7 ngày gần nhất)
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS revenue
FROM orders
WHERE status = 'delivered'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Sản phẩm bán chạy nhất
SELECT
  p.name,
  SUM(oi.quantity) AS total_sold,
  SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'delivered'
  AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

---

## 7. Env Variables

```env
# .env.example — thêm vào section Marketing
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_FB_PIXEL_ID=XXXXXXXXXXXXXXX
FB_CAPI_ACCESS_TOKEN=your_access_token_here   # ⚠️ SECRET — không commit giá trị thật vào git
FB_PIXEL_ID=XXXXXXXXXXXXXXX
```

---

> 🍜 BanhCuon System · Marketing & Analytics v1.0 · Tháng 4/2026
