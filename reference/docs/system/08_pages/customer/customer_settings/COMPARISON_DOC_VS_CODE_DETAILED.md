# Customer Settings — Doc vs. Code Detailed Comparison

> **Scope:** audit of the `customer_settings` doc-set (`customer_settings.md` — the page's only doc
> file) against the real running FE code for `/menu/settings`.
> **Axes:** (1) Component visuals · (2) Cross-component dataflow · (3) Cross-page dataflow. Areas 4
> (loading) and 5 (FE⇄BE) are **N/A** — this page has no async query and makes **no backend calls**.
> **Read-only** — no code or docs were changed. **Code wins** — every "Code reality" cell is traced
> to source on the current branch.
> **Produced:** inline (small page — 1 doc file, ~80-line `page.tsx`, pure-local Zustand store); no
> subagents needed. 🔴 re-verified by hand.
> **Branch:** `experience_claude.md_system_1_test_iphon2_change_code` · **Date:** 2026-06-21

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals (ASCII + Zones) | Mostly accurate; copy & helper-text drift | 1 | 4 | 2 |
| 2 — Cross-component dataflow | Accurate | 0 | 0 | 1 |
| 3 — Cross-page dataflow | Accurate; one shared-store note | 0 | 0 | 1 |
| 4 — Loading | N/A (no async) | — | — | — |
| 5 — FE⇄BE data model | N/A (no backend calls) | — | — | — |
| **Total** | **Low-drift; 1 behavioural 🔴** | **1** | **4** | **4** |

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

1. **"Lưu → navigates back" is false — the save does NOT navigate.**
   `customer_settings.md:37` (Key Interactions) states: *"**Lưu** → persists to settings store
   (localStorage) **and navigates back**."* The code's `handleSave` (`menu/settings/page.tsx:14-19`)
   does three things: `setCustomerName` + `setTableLabel`, `setSaved(true)`, and a 2-second
   `setTimeout(() => setSaved(false), 2000)`. There is **no** `router.back()` / `router.push()` in
   `handleSave`. The only navigation on the page is the back **arrow** (`page.tsx:26`,
   `router.back()`). On save the user **stays on the page**; the button label flips to **"Đã lưu!"**
   for 2s (`page.tsx:74`) as the confirmation. **Doc drift** (not a code bug — the inline toast is a
   valid UX choice), but the doc describes a flow that does not exist.

---

## Dead / Unreachable Components Found

- None. The page is a single self-contained component; both inputs, the save button, and the back
  arrow are reachable and wired.

---

## Area 1 — Component Visuals (ASCII wireframe + Zones table)

**Verdict:** structurally correct (header · 2 labelled inputs · save · shell nav), but the ASCII is
out of date on field copy, button copy, and omits two helper-text lines and the saved-state toggle.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Name field label | "**Tên của bạn**" (`customer_settings.md:16`) | `Tên hiển thị` (`menu/settings/page.tsx:39`) | 🟡 | Update ASCII label to "Tên hiển thị" |
| Name helper text | (not drawn) | `Hiển thị trong giỏ hàng và xác nhận đơn.` (`page.tsx:49`) | 🟡 | Add the helper line under the name input in ASCII |
| Table field label | "Nhãn bàn" (`:18`) | `Nhãn bàn` (`page.tsx:55`) | 🟢 | ✅ matches |
| Table helper text | (not drawn) | `Hiển thị trong header menu và giỏ hàng.` (`page.tsx:65`) | 🟡 | Add the helper line under the table input in ASCII |
| Save button copy | "💾 Lưu" (`:21`) | `Lưu cài đặt` + lucide `Save` icon (`page.tsx:73-74`) | 🟡 | Update ASCII to "💾 Lưu cài đặt" |
| Save button — saved state | (not drawn) | flips to `Đã lưu!` for 2s after save (`page.tsx:74` + `:17-18`) | 🟡 | Note the post-save "Đã lưu!" state in the ASCII / Key Interactions |
| Name placeholder | "Nguyễn Văn A" (`:17`) | `Ví dụ: Anh Minh` (`page.tsx:46`) | 🟢 | Cosmetic — align example or drop from ASCII |
| Table placeholder | "Bàn 03" (`:19`) | `Ví dụ: Bàn 3` (`page.tsx:62`) | 🟢 | Cosmetic |
| Header (back + title) | `[←] Cài đặt` (`:13`) | `ArrowLeft` + `Cài đặt` (`page.tsx:30,32`) | 🟢 | ✅ matches |
| Bottom nav tab "Cài Đặt" + order | `[Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt]` (`:23`) | exact order + `Cài Đặt` tab → `/menu/settings` (`ClientBottomNav.tsx:58-98`), rendered by `(shop)/layout.tsx:13` | 🟢 | ✅ matches |
| Key interaction: save behaviour | "persists … and **navigates back**" (`:37`) | persists + shows "Đã lưu!" toast; **no navigation** (`page.tsx:14-19`) | 🔴 | See headline #1 — fix doc to "persists + shows 'Đã lưu!' confirmation, stays on page" |

**Verified-matching:** route `/menu/settings`; header back arrow → `router.back()` (`page.tsx:26`);
both inputs are controlled (`page.tsx:44-45,60-61`); save icon is lucide `Save` (`page.tsx:73`); the
"Cài Đặt" tab is the active route highlight (`ClientBottomNav.tsx:43,98`).

---

## Area 2 — Cross-Component Dataflow

**Verdict:** accurate. No dedicated `_crosscomponent_dataflow.md` exists; the Zones table's
"Data source = `useSettingsStore`" claim is correct.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Inputs' data source | "inline controlled inputs … `useSettingsStore`" (`:32`) | inputs bind to **local** `useState` seeded from the store (`page.tsx:10-11`), written to the store only on Save (`page.tsx:15-16`) | 🟢 | Minor nuance — values are local-draft until Save commits to the store; doc's "data source" is fine as shorthand |

**Verified-matching:** `customerName`/`tableLabel` + their setters all come from `useSettingsStore`
(`page.tsx:9`); the store exposes exactly those 4 members (`store/settings.ts:5-10`).

---

## Area 3 — Cross-Page Dataflow

**Verdict:** accurate. The doc's "stored in localStorage, display-only, never overrides server-side
table binding" claim holds, and the store is the single writer feeding two other pages' components.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Persistence | "stored in `useSettingsStore` (localStorage)" + "all keys via `lib/storage-keys.ts`" (`:5,42`) | `persist` middleware, key `STORAGE_KEYS.CUSTOMER_SETTINGS = 'customer-settings'` (`store/settings.ts:13,20` + `storage-keys.ts:5`); whole store persisted (no `partialize`) | 🟢 | ✅ matches |
| Display-only, no server override | "display-only — never override the server-side table binding" (`:43-44`) | values are read only for display: `tableLabel`→`MenuHeader.tsx:28`, `customerName`+`tableLabel`→`CartDrawer.tsx:77-79`; no order/payload code reads them | 🟢 | ✅ matches (see cross-page note) |
| No backend calls | TL;DR "No backend calls" (`:5`) | page imports only `useState`/`useRouter`/lucide/`useSettingsStore`; no `api-client`, no query/mutation (`page.tsx:1-5`) | 🟢 | ✅ matches |

**Verified-matching:** the only writers of these fields are this page (`setTableLabel`/`setCustomerName`,
`page.tsx:15-16`) and `useCustomerProfile.ts:44,51` (which writes `customerName` from a profile fetch —
**not** `tableLabel`). Grep confirms `setTableLabel` is called **nowhere else** in `fe/src`.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Doc fix | Correct Key Interactions: Lưu persists + shows "Đã lưu!" confirmation and **stays on the page** (no navigate-back) | `customer_settings.md:37` |
| 2 | 🟡 Doc fix | Update ASCII: name label "Tên của bạn" → **"Tên hiển thị"** | `customer_settings.md:16` |
| 3 | 🟡 Doc fix | Update ASCII: save button "💾 Lưu" → **"💾 Lưu cài đặt"** + note "Đã lưu!" post-save state | `customer_settings.md:21` |
| 4 | 🟡 Doc fix | Add the two helper-text lines under each input in the ASCII | `customer_settings.md:16-20` |
| 5 | 🟢 Doc fix | Align/trim the placeholder examples in the ASCII | `customer_settings.md:17,19` |

> Per CLAUDE.md: doc fixes are **one** task; this skill changed nothing. Any code change must be
> registered in `MASTER_TASK.md` before a file is touched — there is **no code change required** here
> (the 🔴 is doc drift, not a code bug).
