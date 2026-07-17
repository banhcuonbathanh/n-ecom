# ⚖️ HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## Pháp Lý & Compliance (Legal & Compliance)
> **Version:** v1.0 · Tháng 4/2026
> **Lưu ý:** Tài liệu này là hướng dẫn kỹ thuật — không phải tư vấn pháp lý chuyên nghiệp. Tham khảo luật sư trước khi Go-Live.

---

## 1. Tổng Quan — Bắt Buộc Trước Go-Live

| Hạng Mục | Mức Độ | Phase Mục Tiêu |
|---|---|---|
| Chính sách bảo mật (Privacy Policy) | **BẮT BUỘC** | Phase 7 (trước UAT) |
| Điều khoản dịch vụ (Terms of Service) | **BẮT BUỘC** | Phase 7 (trước UAT) |
| Cookie Consent Banner | **KHUYẾN NGHỊ** | Phase 5 (song song FE) |
| PCI-DSS cơ bản | **BẮT BUỘC** nếu có thẻ tín dụng | Phase 4 (song song payment BE) |
| Hóa đơn điện tử | Tùy loại hình kinh doanh | Phase 7 (trước Go-Live) |

---

## 2. Chính Sách Bảo Mật (Privacy Policy)

### 2.1 Cơ Sở Pháp Lý

- **Nghị định 13/2023/NĐ-CP** của Việt Nam về bảo vệ dữ liệu cá nhân (hiệu lực từ 01/07/2023)
- Yêu cầu: phải có chính sách bảo mật rõ ràng trước khi thu thập dữ liệu người dùng

### 2.2 Nội Dung Bắt Buộc

| Mục | Nội Dung Cần Có |
|---|---|
| Loại dữ liệu thu thập | Tên, số điện thoại, email, lịch sử đặt món, địa chỉ IP |
| Mục đích thu thập | Xử lý đơn hàng, cải thiện dịch vụ, gửi thông báo (nếu có) |
| Thời gian lưu trữ | Dữ liệu đơn hàng: 5 năm (nghĩa vụ thuế). Tài khoản: đến khi xóa |
| Chia sẻ với bên thứ 3 | Payment gateway (VNPay, MoMo, ZaloPay), Google Analytics |
| Quyền của người dùng | Truy cập, sửa đổi, xóa dữ liệu — cách thực hiện |
| Liên hệ | Email/SĐT để gửi yêu cầu liên quan dữ liệu cá nhân |
| Ngày hiệu lực | Ngày ban hành + ngày sửa đổi gần nhất |

### 2.3 Vị Trí Hiển Thị

- Footer của tất cả trang (link "Chính sách bảo mật")
- Trang `/privacy-policy` — SEO-friendly, không noindex
- Màn hình đăng nhập: "Bằng cách đăng nhập, bạn đồng ý với [Chính sách bảo mật]"

### 2.4 Template (Điểm Mấu Chốt Kỹ Thuật)

```markdown
# Chính Sách Bảo Mật — Bánh Cuốn [Tên Quán]
Cập nhật lần cuối: DD/MM/YYYY

## 1. Thông Tin Chúng Tôi Thu Thập
Khi bạn sử dụng dịch vụ đặt món QR tại quán, chúng tôi thu thập:
- Số bàn và lịch sử đơn hàng (ghi chú, món đặt, số lượng)
- Không thu thập tên hoặc thông tin cá nhân khi đặt món qua QR

Khi nhân viên sử dụng hệ thống:
- Tên đăng nhập, địa chỉ IP, thời gian đăng nhập

## 2. Mục Đích Sử Dụng
...

## 3. Chia Sẻ Dữ Liệu
Chúng tôi chia sẻ dữ liệu với:
- VNPay/MoMo/ZaloPay: chỉ thông tin cần thiết để xử lý thanh toán
- Google Analytics: dữ liệu hành vi ẩn danh (không có thông tin nhận dạng cá nhân)
...
```

---

## 3. Điều Khoản Dịch Vụ (Terms of Service)

### 3.1 Nội Dung Bắt Buộc

| Mục | Nội Dung |
|---|---|
| Phạm vi dịch vụ | Dịch vụ đặt món tại quán qua QR — không phải giao hàng |
| Quy tắc sử dụng | Không lạm dụng hệ thống, không giả mạo QR |
| Chính sách hủy đơn | < 30% món đã làm → được hủy. Sau đó → liên hệ nhân viên |
| Chính sách thanh toán | Thanh toán tại quán — không lưu thông tin thẻ |
| Giới hạn trách nhiệm | Lỗi kỹ thuật không dẫn đến bồi thường — xử lý trong [N] giờ |
| Luật áp dụng | Pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam |
| Giải quyết tranh chấp | Thương lượng trực tiếp → Tòa án có thẩm quyền tại [Tỉnh/Thành phố] |

### 3.2 Vị Trí Hiển Thị

- Footer: link "Điều khoản dịch vụ"
- Trang `/terms-of-service`
- Màn hình đăng nhập nhân viên

---

## 4. Cookie Consent

### 4.1 Phân Loại Cookie

| Loại | Mô Tả | Cần Xin Phép? |
|---|---|---|
| **Essential** | Session, CSRF token, language preference | Không — hoạt động bắt buộc |
| **Analytics** | Google Analytics, GTM | **Có** — cần consent |
| **Marketing** | Facebook Pixel | **Có** — cần consent |

### 4.2 Implement Cookie Banner

```typescript
// fe/components/CookieConsent.tsx
'use client'
import { useState, useEffect } from 'react'

export function CookieConsent() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) setShown(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    }))
    // Kích hoạt GA4 và FB Pixel sau khi có consent
    window.dataLayer?.push({ event: 'consent_given' })
    setShown(false)
  }

  const decline = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }))
    setShown(false)
  }

  if (!shown) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
      <p className="text-sm">
        Chúng tôi dùng cookie để cải thiện trải nghiệm và phân tích lưu lượng.
        <a href="/privacy-policy" className="underline ml-1">Xem chính sách bảo mật</a>
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={accept} className="btn-primary text-sm">Chấp nhận</button>
        <button onClick={decline} className="btn-secondary text-sm">Từ chối</button>
      </div>
    </div>
  )
}
```

### 4.3 GTM Consent Mode

```javascript
// Trong GTM — cài trước tất cả tags khác
// Default: denied cho analytics và marketing
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
})

// Khi user accept:
// dataLayer.push({ event: 'consent_given' }) → trigger GTM trigger
// → GTM cập nhật consent mode
```

---

## 5. PCI-DSS — Bảo Mật Thanh Toán

### 5.1 Nguyên Tắc Bắt Buộc

| Quy Tắc | Chi Tiết | Implement Ở |
|---|---|---|
| **KHÔNG lưu thông tin thẻ** | Số thẻ, CVV, ngày hết hạn — không lưu DB, không log | Toàn bộ hệ thống |
| **Dùng tokenization** | VNPay/MoMo/ZaloPay tự quản lý thẻ — ta chỉ nhận `gateway_ref` | `payments.gateway_ref` |
| **HTTPS bắt buộc** | Mọi request đều qua TLS — Caddy auto-renew cert | DevOps |
| **Không log sensitive data** | Logger không in payment data, token, password | BE middleware |

### 5.2 Checklist PCI-DSS Cơ Bản (SAQ A)

```
□ KHÔNG lưu PAN (số thẻ) bất kỳ đâu trong hệ thống
□ KHÔNG lưu CVV/CVC sau khi xử lý
□ KHÔNG lưu PIN
□ Mọi transmission của cardholder data đều qua TLS 1.2+
□ Sử dụng payment gateway đã PCI-certified (VNPay, MoMo, ZaloPay)
□ Hiển thị badge "Thanh toán an toàn" và logo payment partner
□ Không redirect người dùng qua HTTP (chỉ HTTPS)
```

### 5.3 Security Headers (BE — Gin)

```go
// be/internal/middleware/security.go
func SecurityHeaders() gin.HandlerFunc {
  return func(c *gin.Context) {
    c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    c.Header("X-Content-Type-Options", "nosniff")
    c.Header("X-Frame-Options", "DENY")
    c.Header("X-XSS-Protection", "1; mode=block")
    c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
    // 'unsafe-inline' required for GTM inline bootstrap snippet.
    // Upgrade to nonce-based CSP (next.config.js) before production hardening.
    c.Header("Content-Security-Policy",
      "default-src 'self'; "+
      "script-src 'self' https://www.googletagmanager.com 'unsafe-inline'; "+
      "img-src 'self' data: https:; "+
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com")
    c.Next()
  }
}
```

---

## 6. Hóa Đơn Điện Tử

### 6.1 Khi Nào Cần?

| Loại Hình Kinh Doanh | Yêu Cầu Hóa Đơn GTGT |
|---|---|
| Hộ kinh doanh cá thể (không VAT) | Không bắt buộc — có thể dùng phiếu thu thông thường |
| Doanh nghiệp tư nhân / Công ty | **BẮT BUỘC** nếu khách yêu cầu xuất VAT |
| Có doanh thu > 1 tỷ/năm | Cần tích hợp hệ thống hóa đơn điện tử (Thông tư 78/2021/TT-BTC) |

### 6.2 Nhà Cung Cấp Hóa Đơn Điện Tử Tại Việt Nam

| Nhà Cung Cấp | Ghi Chú |
|---|---|
| VNPT-Invoice | Kết nối Tổng cục Thuế trực tiếp |
| MISA meInvoice | Phổ biến cho SME |
| FPT.eInvoice | Tích hợp API tốt |

### 6.3 Flow Tích Hợp (Nếu Cần)

```
Cashier xác nhận thanh toán (order = delivered)
        ↓
FE: "Xuất hóa đơn GTGT?" → input tên công ty, MST
        ↓
POST /api/v1/invoices { order_id, company_name, tax_code }
        ↓
BE: gọi API nhà cung cấp hóa đơn → nhận invoice_id, PDF URL
        ↓
Lưu invoice_id vào orders.invoice_id
        ↓
Trả PDF URL cho FE → hiển thị / gửi email
```

---

## 7. Checklist Legal Trước Go-Live

```
□ Trang /privacy-policy tồn tại, nội dung đầy đủ §2.2, ngôn ngữ tiếng Việt
□ Trang /terms-of-service tồn tại, nội dung đầy đủ §3.1
□ Link footer dẫn đến 2 trang trên
□ Cookie consent banner hiển thị cho user mới
□ Consent được lưu localStorage và GTM Consent Mode configured
□ Không có nơi nào trong code lưu số thẻ, CVV, PIN
□ Tất cả request đều qua HTTPS (kiểm tra với SSL Labs)
□ Security headers đã cài (kiểm tra với securityheaders.com)
□ Nếu cần hóa đơn GTGT: đã tích hợp và test với môi trường sandbox
□ Tư vấn pháp lý đã review Privacy Policy và ToS
```

---

> 🍜 BanhCuon System · Legal & Compliance v1.0 · Tháng 4/2026
> ⚠️ Tài liệu này chỉ là hướng dẫn kỹ thuật — tham khảo luật sư có chuyên môn trước khi áp dụng.
