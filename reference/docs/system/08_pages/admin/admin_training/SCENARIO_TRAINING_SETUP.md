# Scenario — Setting Up Staff Training

> **TL;DR:** ✅ implemented (authoring) · ⚠️ tracking half inert. A page-specific narrative for
> `/admin/training`: a manager authors job guides and then tries to track who has completed them —
> discovering that the authoring half works end-to-end while the tracking half records nothing.
> Grounded in the 7 endpoints traced in [admin_training_be.md](admin_training_be.md). Page →
> [admin_training.md](admin_training.md).

---

## Cast

- **Chị Hoa** — restaurant **manager** (role `manager`, not `admin`). Logged in, on `/admin/training`.
- **Anh Phúc** — **admin/owner**, occasionally on the same page from his laptop.
- **The kitchen + counter staff** — the intended audience of the guides (chef, cashier, staff).

## Setting

Monday morning, onboarding two new hires. Chị Hoa wants a "Cuốn bánh đúng cách" guide for the
kitchen and a "Quy trình thu ngân" guide for the counter, then wants to watch who finishes them.

---

## Timeline (minute by minute)

**09:01 — Land.** Chị Hoa opens `/admin/training`. The admin shell gate passes (she's a manager).
The page paints the header + role tabs instantly, then `GET /admin/training/guides` fills Zone C —
today it's empty, so she sees 📚 "Chưa có hướng dẫn nào." (Endpoint 1.)

**09:02 — Filter.** She taps **"Bếp"** (chef). `useJobGuides('chef')` refetches
`GET …/guides?role=chef`; still empty. The "N hướng dẫn" counter reads `0`.

**09:03 — Create a guide.** She taps **"+ New Guide"**, fills Modal 1 (title, role=chef, a YouTube
link, a quality KPI, leaves pass threshold/attempts at defaults), saves → `POST /admin/training/guides`
returns **201**, the `['training','guides']` cache invalidates, the list refetches, and her chef
guide appears as a card — with a **"Nháp"** overlay because she left it unpublished. (Endpoint 2.)

**09:05 — Edit.** She reopens it via the kebab **"Chỉnh sửa"**, ticks *published*, saves →
`PATCH /admin/training/guides/:id` (**200**); the "Nháp" overlay disappears on refetch. (Endpoint 3.)

**09:07 — Friction: delete.** She decides a duplicate draft was made by mistake and taps kebab →
**"Xoá"**, confirms the dialog… and nothing happens. The card stays. No toast, no explanation.
*(Under the hood: `DELETE /admin/training/guides/:id` is **admin-only** (`main.go:311-314`), she's a
manager → 403, and the FE mutation has no `onError`. This is the realistic friction beat —*
[TRAINING_BUGS.md](TRAINING_BUGS.md) *Bug 2.)* She'll have to ask Anh Phúc.

**09:10 — The big discovery: tracking is empty.** With a guide now published, she scrolls to
**"Completion Tracking"** (Zone D) to see who's started. The guide selector shows her guide, the
table spinner resolves to **"Chưa có nhân viên nào được giao hướng dẫn này."** She clicks where a
staff row would be / opens a progress modal — it reads **"Nhân viên này chưa bắt đầu hướng dẫn."**
She types a coaching note in Modal 2; it looks saved but isn't.
*(Under the hood: no API path ever writes `training_progress`/`quiz_attempts`, so endpoint 5 returns
empty, endpoint 6 returns 404, and the endpoint-7 notes `PATCH` 404s silently —*
[TRAINING_BUGS.md](TRAINING_BUGS.md) *Bug 1. The authoring half is real; the tracking half is inert.)*

**09:12 — Anh Phúc helps.** From his laptop he refreshes `/admin/training` (no live push — he only
sees Hoa's new guide because his query refetched) and deletes the duplicate as admin (`DELETE`
succeeds for him).

---

## Under the hood

**A · Cross-component.** One role-tab change re-derives both Zone C and Zone D from the same
`guides` array; modal opens are page-level state, not sibling props → details in
[admin_training_crosscomponent_dataflow.md](admin_training_crosscomponent_dataflow.md).

**B · Cross-page / device.** `/admin/training` is the sole producer and consumer of training data;
no other page reads it, and there's no realtime — Anh Phúc's screen converges only on refetch →
[admin_training_crosspage_dataflow.md](admin_training_crosspage_dataflow.md).

**C · FE → BE send.** Create/edit/delete guide = `POST` / `PATCH` / `DELETE /admin/training/guides`
(create/edit `manager`, delete **`admin`**); manager notes = `PATCH …/staff/:id/progress/:guideId`.

**D · BE → FE receive / live.** Pure REST request/response — **no SSE, no WS** in this domain.
Reads: `GET …/guides`, `GET …/guides/:id/progress` (always empty), `GET …/staff/:id/progress/:guideId`
(always 404). Cache invalidation is client-side only.

**E · Loading + caching.** 4-card skeleton while guides load; no Redis; TanStack staleTime 5 min
(guides) / 2 min (progress) → [admin_training_loading.md](admin_training_loading.md) +
[admin_training_be.md](admin_training_be.md#caching--invalidation).

**F · Monitoring.** None — no realtime channel, no live floor for training. State is observable only
by reloading the page.

---

## Mental model (one line)

**`/admin/training` is a working guide-authoring CMS bolted onto an empty progress-tracking shell:
you can write guides, but until a staff-facing watch/quiz endpoint exists, the "who finished" half
will always read zero.**
