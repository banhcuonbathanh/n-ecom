# Customer Settings — `/menu/settings`

> **TL;DR:** ✅ implemented · guest (local-only) · Tiny preferences page reached from the bottom
> nav "Cài Đặt" tab: customer display name and table label, stored in `useSettingsStore`
> (localStorage). No backend calls.

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ [←]  Cài đặt                                   │ ← header (back + title)
├────────────────────────────────────────────────┤
│ Tên của bạn                                    │
│ [ Nguyễn Văn A_____________ ]                  │ ← name input
│                                                │
│ Nhãn bàn                                       │
│ [ Bàn 03___________________ ]                  │ ← table label input
│                                                │
│ [ 💾 Lưu ]                                     │ ← save button
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Header | inline JSX (lucide `ArrowLeft`) | — |
| Name / table inputs | inline controlled inputs in `menu/settings/page.tsx` | `useSettingsStore` |
| Save | inline button (lucide `Save`) | `useSettingsStore` setters |

## Key Interactions

- Edit fields → local state; **Lưu** → persists to settings store (localStorage) and navigates back.
- Back arrow → previous page.

## Business Logic Used

- Settings store + storage keys (all keys via `lib/storage-keys.ts`) → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (settings store)
- These values are display-only — they never override the server-side table binding →
  [../02_spec/BUSINESS_RULES.md §2.3 One Active Order Per Table](../02_spec/BUSINESS_RULES.md#23-one-active-order-per-table)
