# Comparison — Doc vs. Code · Customer Profile (`/profile`)

> **Scope:** audit the `customer_profile` doc-set against the running FE/BE code on the current
> branch, across the applicable axes: **(1) component visuals · (4) loading behaviour · (5) FE⇄BE
> data model**. Areas **2 (cross-component dataflow)** and **3 (cross-page dataflow)** are **N/A** —
> the page has no shared store and no outliving write today (the only intended one, `setCustomerName`,
> is gated behind a PUT that 404s); the doc-set itself omits both files and explains why
> ([SCENARIO_PROFILE.md §A/§B](SCENARIO_PROFILE.md)). **Read-only — no code or docs changed.**
> Produced **inline** (small page: 5 simple components, 0 live BE endpoints to trace); the lone 🔴 was
> re-verified by hand (repo-wide grep). Date: 2026-06-21.
>
> **Headline:** this is a **near-zero-doc-drift** set, like `customer_combo_detail` /
> `customer_table_qr`. The one severe finding — both `/customer/profile` endpoints are unimplemented —
> is a **CODE** bug the doc-set **already documents correctly**; this run re-verifies it, it is **not**
> a doc-vs-code contradiction.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | ✅ Faithful; 2 minor ASCII-layout mismatches | 0 | 2 | 1 |
| 4 — Loading behaviour | ✅ Exact — query config, skeleton, 4-state priority all match | 0 | 0 | 0 |
| 5 — FE⇄BE data model | ⚠️ Doc honest & accurate; the documented CODE bug (missing backend) re-verified | 1 | 3 | 2 |
| 2 — Cross-component dataflow | N/A (no shared store; correctly omitted) | — | — | — |
| 3 — Cross-page dataflow | N/A (no outliving write; correctly omitted) | — | — | — |
| **Total** | **Exemplary, honest doc-set** | **1** | **5** | **3** |

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

**1. 🔴 CODE BUG (already documented — re-verified, NOT doc drift): the entire `/customer/profile`
backend does not exist.**
- The FE calls `GET /customer/profile` (`useCustomerProfile.ts:30`) and `PUT /customer/profile`
  (`useCustomerProfile.ts:48`), resolved against baseURL `…/api/v1` (`api-client.ts:7`).
- **Hand-verified by grep:** `grep -rniE "customer/profile|customerprofile|customer_profile" be/` →
  **NONE**; `grep "/customer"` in `be/cmd/server/main.go` → **no `/customer` group**; `grep -ri
  profile be/` matches **only** the staff `GET /auth/me` handler (`auth_handler.go:105`) and its test
  (`auth_test.go:237`). No handler, service, sqlc query, migration, or table.
- The versioned group `v1 := r.Group("/api/v1")` (`main.go:161`) mounts only `auth · products ·
  categories · toppings · combos · orders · payments · tables · staff · admin · files · ws`
  (`main.go:167–350`). Both requests fall through to Gin's default `404 page not found` (plain text,
  not the project JSON error envelope — no custom `NoRoute` handler exists).
- **Why it matters:** the page ships looking fully interactive — empty form + enabled **"Tạo hồ sơ"**
  button — but every save is a guaranteed dead end, and the toast mislabels it as a connectivity
  problem. **This is a real product bug, not a doc problem:** [PROFILE_BUGS.md](PROFILE_BUGS.md) Bug 1,
  [customer_profile_be.md](customer_profile_be.md) Flags 1–2, and [customer_profile.md](customer_profile.md)
  Flags 1–2 all document it accurately. The doc does **not** over-promise; the code under-delivers.
  Fix = build the BE *or* a product decision to gate the page — a separate ALIGNed task per CLAUDE.md.

> No other 🔴 found. The doc-set is honest: it documents the missing backend rather than pretending
> the page works.

---

## Dead / unreachable components found

- **None unique to this page.** No zero-import components; all five zones (`ProfileAvatarHeader`,
  `PersonalInfoForm`, `QuickNavGrid`, `SaveCTABar`, `ProfilePageSkeleton`) are imported and rendered by
  `page.tsx:3-8,28-74`.
- **Dead *flows* (documented):** `useUpdateProfile.onSuccess` (`useCustomerProfile.ts:49-52`) —
  `invalidateQueries` + `setCustomerName` + success toast — is unreachable because the PUT always
  404s. `setCustomerName` **does exist** in the settings store (`store/settings.ts:17`), so the
  cross-page write is wired but never fires (Flag 5 holds). The `isMember`/`memberSince` fields and the
  "✓ Thành viên" badge (`ProfileAvatarHeader.tsx:39-41`) are likewise unreachable (profile fetch 404s).
- **Visible-but-disabled stub (documented):** avatar camera badge — `opacity-50 cursor-not-allowed`,
  no handler (`ProfileAvatarHeader.tsx:28-34`).

---

## Area 1 — Component visuals

**Verdict:** ✅ Faithful. Zones C/D/E render exactly as the `customer_profile.md` ASCII + Zones table
describe. Two minor layout mismatches in the ASCII (B and A), both cosmetic.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Zone B — avatar + name layout | ASCII draws avatar and name **side-by-side** (`│ avatar │ Nguyễn Văn A`), `customer_profile.md:22-25` | Rendered as a **vertically stacked, centered column**: `flex flex-col items-center` wraps the avatar circle then the name below it (`ProfileAvatarHeader.tsx:12,37`) | 🟡 | Redraw the Zone B ASCII as a centered vertical stack (avatar on top, name + badge beneath) |
| Zone A — title alignment | ASCII shows title immediately after the back arrow (`[←] Thông Tin Khách Hàng`), implying left-aligned, `customer_profile.md:20` | Title is **center-aligned** with `flex-1 text-center` between the back button and a spacer (`CustomerTopNav.tsx:23,37`) | 🟡 | Note in the ASCII that the title is centered (back-arrow left, spacer right) |
| Zone A — nav bar color | Zones table: "static — title … back arrow" (no color claim), `customer_profile.md:57` | Hardcoded hex `bg-[#1e293b]` (`CustomerTopNav.tsx:14`) — a design-token violation per fe/CLAUDE.md, but in the **shared** `CustomerTopNav`, not profile-owned | 🟢 | Out of scope for this page; flag on the shared-nav owner — see cross-component note in tracker |
| Zone B — camera badge disabled | "camera badge: disabled (opacity-50)" `customer_profile.md:24` | `opacity-50 cursor-not-allowed`, `aria-label="Đổi ảnh (chưa khả dụng)"`, no handler (`ProfileAvatarHeader.tsx:29-34`) | ✅ | — |
| Zone B — membership badge gate | "membership badge: only when isMember" `customer_profile.md:25` | `{isMember && <Badge variant="success">✓ Thành viên</Badge>}` (`ProfileAvatarHeader.tsx:39-41`) | ✅ | — |
| Zone C — 4 fields, order, required marks | name / phone / address / email (optional), `customer_profile.md:27-34` | Exactly that order, each with `*` urgent mark except email "(tùy chọn)" (`PersonalInfoForm.tsx:42-119`) | ✅ | — |
| Zone D — 2×2 quick-nav grid | 4 tiles: Thực Đơn + Yêu Thích (primary), Lịch Sử Ăn + Đặt Bàn (plain), `customer_profile.md:36-42,74-79` | `CARDS` array, `grid grid-cols-2`; highlighted=true on Thực Đơn (`/menu`) + Yêu Thích (`/menu/favourites`); plain on Lịch Sử Ăn (`/order`) + Đặt Bàn (`/menu`) (`QuickNavGrid.tsx:12-17,23`) | ✅ | — |
| Zone D — "Đặt Bàn" → `/menu` | Flag 4: same href as "Thực Đơn", no booking route (`customer_profile.md:151`) | `href: '/menu'` on both (`QuickNavGrid.tsx:13,16`) | ✅ | — |
| Zone E — Save CTA labels | "label changes by state": Tạo hồ sơ / 💾 Lưu Thông Tin, `customer_profile.md:44-45` | `isLoading?'Đang lưu…' : isNewProfile?'Tạo hồ sơ':'💾 Lưu Thông Tin'` (`SaveCTABar.tsx:22-31`) | ✅ | — |
| Zone E — **not** a fixed footer | ASCII places it in-flow above the shell nav, `customer_profile.md:43-47` | In-flow inside `<main>` (`SaveCTABar.tsx:13` `px-4 pb-4 pt-2`); page reserves `pb-[56px]` for the shell nav (`page.tsx:34`) — **no fixed-footer collision** (contrast `customer_product_detail`'s CTAFooter 🔴) | ✅ | — |

**Verified-matching:** all four content zones (B partial, C, D, E) plus the skeleton render as the doc
describes; the page-level layout (`flex flex-col min-h-screen`, scrollable `<main>` capped
`max-w-[420px]`, `pb-[56px]`) matches `page.tsx:26-34`.

---

## Area 4 — Loading behaviour

**Verdict:** ✅ Exact. Every claim in [customer_profile_loading.md](customer_profile_loading.md)
matches source — nothing to fix.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Route-level spinner | shared `(shop)/loading.tsx` orange ring | `h-8 w-8 animate-spin … border-t-orange-500` (`(shop)/loading.tsx:1-7`) | ✅ | — |
| No profile-level loading.tsx / Suspense | none in folder | folder = `page.tsx` + `components/` only (verified by listing) | ✅ | — |
| `isLoading` → skeleton replaces B/C/D/E; Zone A always visible | `page.tsx:35-36`, Zone A outside branch | `{isLoading ? <ProfilePageSkeleton/> : …}` inside `<main>`; `<CustomerTopNav>` outside at `page.tsx:28-31` | ✅ | — |
| Query config | key `['customer','profile']`, stale 5 min, retry skips 401/404 | `useCustomerProfile.ts:24,33,34-38` exactly | ✅ | — |
| 4-state priority (loading → is404 create → non-404 disabled → success unreachable) | `loading.md:76-84` | `page.tsx:35-36` (loading), `:72-73` (`disabled={isError && !is404}`, `isNewProfile={is404}`), success needs working BE | ✅ | — |
| Skeleton block dimensions per zone | `loading.md:93-98` | `ProfilePageSkeleton.tsx:5-9,12-19,22-29,31-34` match block-for-block | ✅ | — |

---

## Area 5 — FE⇄BE data model

**Verdict:** ⚠️ The doc is **accurate and honest** — it documents that the backend is missing rather
than describing a phantom contract. The one 🔴 is the underlying CODE bug (re-verified), not doc drift.
Provenance line-cites in `_be.md`/`SCENARIO` for `main.go` are stale (+13).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `GET`/`PUT /customer/profile` exist? | "❌ route not registered … no `/customer` group … grep returns nothing" (`customer_profile_be.md:29-37`) | **Confirmed** by repo-wide grep (NONE); `main.go:161` mounts no `/customer` group | 🔴 | **CODE** — build BE or gate the page (ALIGNed task). Doc already correct. |
| Save-failure toast | "mislabelled `Không thể lưu — kiểm tra kết nối`" (`be.md` Flag 2, Bug 2) | `onError: toast.error('Không thể lưu — kiểm tra kết nối')` (`useCustomerProfile.ts:54-56`) | 🟡 | FE 1-liner — but only after the BE exists; fold into the Bug 1 fix |
| `CustomerProfile` / `UpdateProfileForm` shapes | "FE-only, ❓ UNVERIFIED — no BE type backs them" (`be.md` Flag 3) | `useCustomerProfile.ts:6-22`; no server type exists to confirm | 🟡 | Keep `❓ UNVERIFIED` until the BE DTO lands |
| `setCustomerName` cross-write dead | "never fires — gated behind dead PUT" (`be.md` Flag 5) | `setCustomerName` **exists** (`store/settings.ts:17`) but is only called in `onSuccess` (`useCustomerProfile.ts:51`), which never runs | 🟡 | No action — accurate; resolves when BE exists |
| `_be.md` `main.go` route line-cites | v1 group `main.go:148`; children `main.go:154–311` (`be.md:32-34`, Bug1 `:42-45`) | v1 group at **`main.go:161`** (+13); child groups span **`:167` (auth) → `:350` (ws)**; enumeration also omits the `files` (`:339`) and `ws` (`:350`) groups | 🟢 | Doc fix — bump to `:161` / `:167-350`; cite the group name over absolute line where possible |
| `SCENARIO` metrics-mw cite | "global metrics middleware … `main.go:117,126`" (`SCENARIO_PROFILE.md:201`) | `r.Use(…, middleware.Metrics())` at **`main.go:118`** (engine-wide → does run for `NoRoute`); `/metrics` GET at **`:121`** (doc's `:126` is the wrong line) | 🟢 | Doc fix — `:118`/`:121`; the `❓ UNVERIFIED` on whether it *records* the 404 may stay |

**Verified-matching:** the FETCH/WRITE flow diagram (`customer_profile.md:109-114`), the `is404`
create-mode logic, the `retry` 401/404 skip, and every Flag in `_be.md` and `PROFILE_BUGS.md` are all
accurate against source.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug (decision) | Build the `/customer/profile` backend (route group + handler/service + `customer_profiles` table + customer-role JWT) **or** make a product decision to gate the page behind a "coming soon" state | `be/cmd/server/main.go` + new BE files — **MUST register in `MASTER_TASK.md` + ALIGN first** |
| 2 | 🟡 Code (folds into #1) | Branch the save toast on `err.response?.status` so 404 ≠ "kiểm tra kết nối" | `fe/src/hooks/useCustomerProfile.ts:54-56` (only after #1) |
| 3 | 🟡 Doc fix | Redraw Zone B ASCII as a centered vertical stack; annotate Zone A title as centered | `customer_profile.md:20-25` |
| 4 | 🟢 Doc fix | Bump `_be.md` `main.go` cites: v1 `:148→:161`, children `:154-311→:167-350`; add `files`/`ws` to the group enumeration | `customer_profile_be.md:32-34,42-45` |
| 5 | 🟢 Doc fix | Fix `SCENARIO` metrics-mw cite `:117,126 → :118,:121` | `SCENARIO_PROFILE.md:201` |
| 6 | 🟢 Doc fix | Refresh provenance branch `experience_claude.md_system_1 → experience_claude.md_system_1_test_iphon2_change_code` across the doc-set headers | all `customer_profile/*` |

> Per CLAUDE.md: the doc fixes (#3–#6) are **one** doc task; **each code change (#1, #2) must be
> registered in `docs/tasks/MASTER_TASK.md` and ALIGNed before any file is touched.** This skill is
> read-only — it has changed nothing.
