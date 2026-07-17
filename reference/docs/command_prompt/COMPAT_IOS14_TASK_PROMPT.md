# Task Prompt — iOS 14 Compatibility

> Paste the block below as the FIRST message of a NEW session to run this task.
> Self-contained: carries all context already discovered so the new session need not re-investigate.

---

```text
TASK: Make the Bánh Cuốn FE (Next.js 14 App Router, in `fe/`) run on iOS 14 Safari.

You may spawn as many subagents as needed (audit / research / implement / verify in parallel).
Follow the project's 7-step workflow in CLAUDE.md. Read fe/CLAUDE.md and use the
`frontend-nextjs` skill before writing any FE code.

── WHY ───────────────────────────────────────────────────────────────────────
Real customers may scan the QR menu with old iPhones. Right now the app CRASHES on
iOS 14.8 with "Application error: a client-side exception has occurred", while iPad /
newer iOS work fine. Confirmed root cause: the JS bundle calls modern built-in methods
that don't exist before iOS 15.4. The owner explicitly wants iOS 14 support and accepts
a larger/slower bundle as the cost.

── WHAT I ALREADY FOUND (don't re-investigate, verify if unsure) ──────────────
- fe/ is Next.js 14 App Router, TypeScript, built with SWC (NO babel, NO core-js,
  NO `browserslist` field in fe/package.json).
- Next.js 14's DEFAULT target already transpiles SYNTAX for Safari 12+, so the crash is
  NOT syntax — it's missing RUNTIME BUILT-IN METHODS, which SWC does not polyfill.
- Confirmed iOS-15.4-only APIs in the built bundle: `Object.hasOwn` (5+ uses),
  `Array.prototype.at` / `String.prototype.at` (`.at(`), `structuredClone`.
- There are likely MORE Safari-14-unsupported APIs than those three — audit the whole
  bundle, don't assume just these.
- Root layout: fe/src/app/layout.tsx (a Server Component — polyfills must be injected via
  a 'use client' module imported at the very top so they run before app code).

── REQUIRED APPROACH ──────────────────────────────────────────────────────────
1. AUDIT: scan the built client bundle (in the running fe container at
   /app/.next/static/chunks, or `npm run build` output) for EVERY JS built-in / API not
   supported by Safari 14.0–14.8. Produce a complete list. (caniuse / MDN baseline =
   Safari 15.4 cutoff for the known ones; check for others: findLast/findLastIndex,
   Promise.any, Array.prototype.flat edge cases, etc.)
2. DECIDE the polyfill strategy and justify it:
   - Option A: add `browserslist` (e.g. "iOS >= 14") + import targeted core-js polyfills
     in a 'use client' loader wired into the root layout.
   - Option B: switch FE to Babel (`.babelrc` with preset-env useBuiltIns:'usage',
     corejs:3) so only-needed polyfills auto-inject — note this DISABLES SWC and slows
     builds; bigger change.
   Recommend whichever is more reliable+maintainable; the owner cares most that it
   ACTUALLY WORKS on iOS 14, secondarily about bundle size.
3. IMPLEMENT it. Keep the change surgical and list exact files touched.
4. Add the `browserslist` target so syntax is safe for Safari 14 too.

── VERIFY (this is the real pass/fail) ────────────────────────────────────────
- Rebuild: `docker compose up -d --build fe`
- The Mac already serves the full stack via Caddy on port 80 at http://192.168.102.6
  (config in root `.env`, gitignored; CORS already handles multi-origin).
- Test on the real iPhone XS Max running iOS 14.8 at http://192.168.102.6 — the page
  must LOAD and the menu DATA must render with no client-side exception.
  (If the test phone can't be used, state clearly how you otherwise validated Safari-14
  compatibility — e.g. a Safari 14 / WebKit emulation — never claim it works untested.)
- Report bundle-size delta (before/after) so the owner sees the cost.

── PROCESS / GUARDRAILS ───────────────────────────────────────────────────────
- BEFORE coding: add a row to docs/tasks/MASTER_TASK.md (there's an "Ops — Mac LAN Test
  Server" section; or make a small FE compat section). Suggested ID: COMPAT-IOS14-1.
  Size it; split into sub-tasks if it'll exceed ~1 session. Then ALIGN: show the plan +
  exact file list and wait for the owner's OK before writing code.
- Git checkpoint commits are BLOCKED in this environment — note that instead of relying
  on `git reset` for rollback; keep the diff small and reviewable.
- Likely files: fe/package.json (browserslist + deps), fe/src/app/layout.tsx,
  fe/src/app/polyfills.ts (new). Touch only what's needed.
- Don't break newer devices (iPad / iOS 15+) — polyfills must be feature-detected
  ("define only if missing"), never unconditional overrides.

DELIVERABLE: iOS 14.8 loads the app and renders the menu, verified; a short report of
the APIs polyfilled, the approach chosen + why, files changed, and bundle-size delta.
```

---

## Pre-flight (do before starting the new session)
- Make sure the iPhone XS Max (iOS 14.8) is on the same Wi-Fi and can reach `http://192.168.102.6` — it's the real pass/fail check.
- Stack is already served via Caddy :80 from root `.env` (IP `192.168.102.6`). If the page doesn't load at all, re-check the IP with `ipconfig getifaddr en0` and update `.env`.
