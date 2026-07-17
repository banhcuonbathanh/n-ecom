# Legal Pages — `/privacy-policy` · `/terms`

> **TL;DR:** ✅ implemented · public (no auth) · Two static, server-rendered prose pages (with
> `Metadata` for SEO): privacy policy (7 sections) and terms of service (7 sections). Linked from
> the `/welcome` footer. No data fetching, no interactivity beyond a back link.

---

## ASCII Wireframe (identical skeleton for both pages)

```
┌────────────────────────────────────────────────┐
│ [← Quay lại]                                   │
│                                                │
│ Chính Sách Bảo Mật        (or: Điều Khoản)     │ ← h1 title + updated date
│                                                │
│ 1. Thông tin chúng tôi thu thập                │
│    prose paragraph …                           │
│ 2. Thông tin chúng tôi KHÔNG lưu trữ           │
│    prose paragraph …                           │
│ 3. …                                           │
│ 4. Cookie và bộ nhớ trình duyệt                │
│ 5. Chia sẻ thông tin                           │
│ 6. Thời gian lưu trữ                           │
│ 7. Liên hệ                                     │
│                                                │
└────────────────────────────────────────────────┘
```

Terms sections: 1. Chấp nhận điều khoản · 2. Đặt món và đơn hàng · 3. Thanh toán ·
4. Trách nhiệm của khách hàng · 5. Giới hạn trách nhiệm · 6. Thay đổi điều khoản · 7. Liên hệ.

## Zones

| Zone | Component | Data source |
|---|---|---|
| Everything | static JSX in `app/privacy-policy/page.tsx` / `app/terms/page.tsx` | hardcoded prose |
| Back link | `Link` + lucide `ArrowLeft` | → `/welcome` |

## Key Interactions

- **← Quay lại** → back to `/welcome`. That's all.

## Business Logic Used

- None — pure static content. The prose itself summarises data-retention and ordering rules; the
  authoritative versions live in [../02_spec/BUSINESS_RULES.md](../02_spec/BUSINESS_RULES.md)
  (orders §2, cancel §3, payment §4).
