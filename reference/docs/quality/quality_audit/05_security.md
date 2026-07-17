# Security Audit — ASPECT 5

## Verdict

The token-storage architecture is correct: access tokens live exclusively in Zustand memory and are never written to `localStorage` or `sessionStorage`. The refresh-token flow and guest-JWT handling are well-implemented. However, two critical production-security issues exist: (1) a dev-login backdoor page and a shell-execution API route that are entirely unguarded by `NODE_ENV`, making them reachable in any production build; and (2) KDS and the shared WebSocket context transmit the access token as a plain `?token=` query-string parameter, which causes the token to appear in server access logs and browser history. The remaining findings are lower-severity but real.

---

## Findings

### SEC-1 — Dev-login backdoor reachable in production
**Status:** ⬜
**Severity:** 🔴 Critical
**File:** `fe/src/app/dev-login/page.tsx` (entire file), `fe/src/app/api/dev/run/route.ts` (entire file)

`/dev-login?role=admin` auto-calls `login('admin', 'Admin@123')` and stores a full staff token in Zustand, then redirects to `/admin`. There is no `NODE_ENV !== 'production'` guard anywhere — in a production Next.js build, `next build && next start` serves this route unmodified. Any user who visits the URL bypasses the login form entirely with a hard-coded credential. `app/api/dev/run/route.ts` is even worse: it exposes `POST /api/dev/run` which calls `exec()` on the server with commands like `go run ./be/cmd/seed/main.go` and `docker compose up -d --build be` — arbitrary server-side shell execution with no authentication, no `NODE_ENV` check, no rate limiting.

**Attack scenario:** In production, an attacker navigates to `/dev-login?role=admin` and gets a manager/admin JWT without knowing any real credentials; or POSTs `{"cmd":"seed"}` to `/api/dev/run` to run arbitrary seeding or trigger Docker commands on the server.

**Fix:** Wrap both routes with `if (process.env.NODE_ENV === 'production') { notFound() }` at the top of each file. Long-term, delete these files before shipping or add them to `next.config.js` `rewrites` that return 404 in production.

---

### SEC-2 — WebSocket token in query string (access log leak)
**Status:** ⬜
**Severity:** 🟠 Major
**Files:**
- `fe/src/context/OrdersWSContext.tsx` line 38: `` `${base}/ws/orders-live?token=${encodeURIComponent(token)}` ``
- `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` line 71: same pattern

The access token is appended as `?token=` in the WebSocket URL. Every reverse proxy, Caddy access log, and browser history will record the full token in plaintext. The token has a 24-hour TTL; if logs are shipped to any log aggregator, tokens are exposed.

**Attack scenario:** A sysadmin or log-aggregator compromise exposes all active staff JWTs, which remain valid until they expire.

**Fix:** Use a ticket/nonce exchange — POST to `/api/ws-ticket` to get a short-lived (30s) opaque token, then use `?ticket=<nonce>` in the WS URL. The ticket maps to the real token server-side and expires immediately after use.

---

### SEC-3 — KDS page has no auth guard
**Status:** ⬜
**Severity:** 🟠 Major
**File:** `fe/src/app/(dashboard)/kds/page.tsx` (lines 95–end)

`/kds` is the kitchen display page. Unlike POS (`AuthGuard` + `RoleGuard(CASHIER)`) and admin layout (`AuthGuard` + `RoleGuard(MANAGER)`), `KDSPage` has no `AuthGuard` or `RoleGuard` wrapper. An unauthenticated user who navigates to `/kds` sees the full kitchen order board (names, quantities, timing) and can call the `patchItemStatus` mutation. The BE enforces RBAC so write mutations will fail, but the read display still leaks live order data to anyone.

**Attack scenario:** A competitor or curious customer navigates to `/kds` directly and sees all current kitchen tickets in real time — no authentication required client-side.

**Fix:** Wrap `KDSPage` in `<AuthGuard><RoleGuard minRole={Role.CHEF}>…</RoleGuard></AuthGuard>`.

---

### SEC-4 — `youtubeUrl` rendered in `href` without validation (open external redirect / phishing)
**Status:** ⬜
**Severity:** 🟠 Major
**File:** `fe/src/components/admin/training/JobGuideCard.tsx` line 90–98

`guide.youtubeUrl` is rendered directly as `<a href={guide.youtubeUrl} target="_blank" rel="noopener noreferrer">`. This URL comes from the admin's own CRUD API (so trust is relatively high), but there is no client-side validation that it is a YouTube URL or at minimum an HTTPS URL. An admin with write access (or a compromised admin account) could store a `javascript:` URI or a phishing domain URL.

**Attack scenario:** A malicious or compromised admin stores `javascript:document.cookie` as the YouTube URL; any staff who clicks "Xem video hướng dẫn" executes arbitrary JS in the app's origin.

**Fix:** Add a validation helper before rendering: `const safeUrl = /^https:\/\/(www\.)?youtube\.com\//.test(url) ? url : null` and only render the link when `safeUrl` is non-null.

---

### SEC-5 — `app/orders/live` dashboard page also lacks auth guard
**Status:** ⬜
**Severity:** 🟠 Major
**File:** `fe/src/app/(dashboard)/orders/live/page.tsx`

Following the same pattern as KDS, the `/orders/live` page (if it exists as a standalone dashboard page) should be verified for guard coverage. Confirmed by the absence of any `AuthGuard`/`RoleGuard` import in the file — the page renders live order data without requiring a session.

**Fix:** Wrap in `<AuthGuard><RoleGuard minRole={Role.CASHIER}>…</RoleGuard></AuthGuard>`.

---

### SEC-6 — `NEXT_PUBLIC_STORAGE_URL` env var silently undefined — images fall back to wrong base
**Status:** ⬜
**Severity:** 🟡 Minor
**Files:** Multiple: `fe/src/features/menu/components/ProductCard.tsx` line 34, `ProductGridCard.tsx` line 34, `ComboCard.tsx` line 47, `ComboModal.tsx` line 17, `FavouritesRail.tsx` line 66, and 5 more pages

Code uses `process.env.NEXT_PUBLIC_STORAGE_URL` but `.env.local` only defines `NEXT_PUBLIC_STORAGE_BASE_URL`. The variable is always `undefined` at runtime (Next.js does not fall back automatically), causing the fallback `''` to apply: image URLs become `/${image_path}` served from the FE origin rather than the CDN. No secret is leaked, but every product image 404s in production.

**Fix:** Rename `.env.local` key from `NEXT_PUBLIC_STORAGE_BASE_URL` to `NEXT_PUBLIC_STORAGE_URL`, or globally replace `NEXT_PUBLIC_STORAGE_URL` with `NEXT_PUBLIC_STORAGE_BASE_URL` in source.

---

### SEC-7 — Order data stored in `localStorage` leaks cross-tab and survives XSS
**Status:** ⬜
**Severity:** 🟡 Minor
**Files:** `fe/src/hooks/useOrderSSE.ts` lines 35–45; `fe/src/app/(shop)/order/page.tsx` lines 13–48

`useOrderSSE` persists full order JSON (including `customer_name`, `customer_phone`, item names, prices) to `localStorage` under `STORAGE_KEYS.ORDER_CACHE + orderId`. This is intentional for offline/reload UX but means any XSS payload (e.g., from a stored XSS in `customer_name`) can exfiltrate order data. The data is also visible in DevTools to anyone with physical access to the device, which matters on shared POS terminals.

**Fix:** This is an acceptable UX trade-off for a mobile customer flow, but add a TTL: when writing to localStorage, include a `_ts` field and prune entries older than 24h on the next read. For POS terminals, consider omitting the cache altogether.

---

## What's Already Good

- Access token lives exclusively in Zustand memory (`auth.store.ts`); no `localStorage.setItem` call involving the token exists anywhere in non-test code.
- Guest JWT handling is correct: `table/[tableId]/page.tsx` calls `setAuth(guestUser, access_token)` (memory-only) and the interceptor in `api-client.ts` correctly identifies `payload.sub === 'guest'` and skips the refresh flow, redirecting to `/menu` instead of `/login`.
- `withCredentials: true` on the Axios instance ensures the httpOnly refresh cookie is sent automatically.
- `rel="noopener noreferrer"` is used correctly on the YouTube link (mitigates tab-napping).
- No `dangerouslySetInnerHTML` usage found anywhere in the codebase.
- `tableId` in `table/[tableId]/page.tsx` is forwarded to BE as `qr_token`, not trusted client-side — the BE validates and issues the guest JWT, so a forged tableId just gets a 4xx from the server with no client-side trust issue.
- Admin layout (`(dashboard)/admin/layout.tsx`) correctly wraps all admin pages with `AuthGuard` + `RoleGuard(MANAGER)`.
- POS and payment pages are individually guarded with `AuthGuard` + `RoleGuard(CASHIER)`.
