# Mac Test Server Plan — Real Operation Experience

> **TL;DR:** The Mac **already serves the full stack on LAN** (Stage A, ✅ since 2026-06-11 —
> setup + gotchas in [`docs/devops/DEPLOY_RUNBOOK.md`](../../devops/DEPLOY_RUNBOOK.md)).
> This plan upgrades it from "a dev box that happens to serve" to an **operated test server**:
> deploys pulled from GitHub like production would, the Mac kept always-on, a daily ops
> routine, and rollback/backup drills — so by the time Stage B (VPS) happens, every
> operational motion has already been practiced. Phases M1–M5 below are the work items.

---

## Goal & Non-Goals

**Goal:** experience real operation — deploy on push, watch dashboards, take backups,
break things and roll back — on hardware you own, before paying for a VPS.

**Non-goals (cannot be proven on the Mac, deferred to Stage B):**
HTTPS/ACME certificates · GHCR image pulls + the real SSH deploy job · payment webhooks
(unless Phase M5 tunnel is used) · real-internet latency.

---

## Phase M0 — Baseline (✅ DONE, Stage A)

Full compose stack on the Mac, phones on shop Wi-Fi hit `http://<mac-ip>`, QR codes printed,
smoke test 8/8. **Do not redo** — daily commands and the 6 known gotchas are in
DEPLOY_RUNBOOK §A2–A3.

---

## Phase M1 — Make the Mac Behave Like a Server (always-on)

| # | Item | How | AC |
|---|---|---|---|
| M1-1 | Never sleep while plugged in | `sudo pmset -c sleep 0 -c disksleep 0` (display may still sleep: `displaysleep 10` is fine) | Stack reachable from a phone after 1 h untouched |
| M1-2 | Docker starts at login | Docker Desktop → Settings → "Start when you log in"; containers already `restart: unless-stopped` | Reboot Mac → stack serves with **zero** manual commands |
| M1-3 | Stable LAN IP | Router DHCP reservation for the Mac (DEPLOY_RUNBOOK already flags this) | IP survives router restart; printed QRs keep working |
| M1-4 | Firewall sanity | System Settings → Firewall: allow `com.docker.backend` (gotcha A3) | Phone loads `http://<mac-ip>` with firewall ON |

---

## Phase M2 — GitHub-Driven Deploys (code is on GitHub — use it)

Simulate the Stage B pipeline with a **pull-based deploy script** (recommended) instead of
exposing the Mac to SSH from CI.

| # | Item | How | AC |
|---|---|---|---|
| M2-1 | `scripts/deploy_mac.sh` | `git fetch && git reset --hard origin/main` (in a **dedicated clone**, e.g. `~/banhcuon-server/`, NOT the dev working copy) → `docker compose up -d --build be fe` → wait 15 s → `curl /health` → on failure print rollback hint | One command takes any pushed commit live on LAN |
| M2-2 | Deploy log | Script appends `date · commit SHA · result` to `~/banhcuon-server/deploy.log` | Every deploy traceable, like CI history |
| M2-3 | Rollback path | `git reset --hard <prev-sha>` + same build — script accepts an optional SHA arg | Roll back to previous commit in < 5 min |
| M2-4 *(optional)* | True push-to-deploy | GitHub Actions **self-hosted runner** on the Mac running M2-1's script on push to `main` | Push → live with no manual step |

> **Why a dedicated clone:** the dev working copy has uncommitted work and a checked-out
> feature branch; a server must only ever run what GitHub `main` has. This also rehearses
> the VPS layout (`/opt/banhcuon` = clean clone + `.env`).
> The Mac builds images locally (`--build`) — the GHCR pull path stays untested until Stage B.

---

## Phase M3 — Daily Operation Routine (the "real operation" part)

| When | Action |
|---|---|
| Open of day | Glance at Grafana `http://<mac-ip>:3001` — error rate ~0, no active alerts |
| After any deploy | `BASE_URL=http://<mac-ip> ./scripts/smoke_test.sh` → 8/8 |
| Nightly (automated) | `launchd` job (Mac's cron): `mysqldump | gzip` to `~/banhcuon-server/backups/`, keep 14 days — mirrors the VPS cron in DEPLOY_RUNBOOK §B4 |
| Weekly | Check disk: `docker system df -v`; prune dangling images from M2 builds: `docker image prune -f` |
| Close of day | Nothing — server stays up (M1) |

---

## Phase M4 — Drills (practice before it's real)

| # | Drill | Pass condition |
|---|---|---|
| M4-1 | **Rollback:** push a commit that breaks `/health`, deploy via M2-1, detect via health check, roll back via M2-3 | Service restored from the previous commit in < 5 min |
| M4-2 | **Restore:** wipe a **copy** of the DB (never `mysql_data` itself) and restore last night's dump into it | Restored DB serves the menu; you trust the backups |
| M4-3 | **Incident:** stop `redis` mid-service (`docker compose stop redis`), observe symptoms on KDS/Grafana, classify per SLA (P0/P1/P2 — [`ROLLBACK_PLAN.md`](../../devops/ROLLBACK_PLAN.md) §1), recover | Symptom → severity → fix documented in one paragraph |

---

## Phase M5 — Optional: Public Tunnel for Payment Sandbox (P7-7)

Only if you want VNPay/MoMo sandbox **before** Stage B: run `cloudflared tunnel` (free, no
account needed for quick tunnels) or `ngrok http 80` → set `WEBHOOK_BASE_URL=https://<tunnel-host>`.

⚠️ Two cautions:
- If customers should use the tunnel URL too, `NEXT_PUBLIC_API_URL` must change → **FE image rebuild** (baked at build time — the #1 Stage A gotcha). For webhook-only testing, leave FE on the LAN IP and change only `WEBHOOK_BASE_URL` (+ `docker compose up -d be`).
- A tunnel exposes the app to the internet with seed passwords (`admin123`...) — change them first, kill the tunnel when done.

---

## Execution Order & Sizing

M1 → M2 (each < 1 session) → M3 (launchd job, < 1 session) → M4 drills (1 session) → M5 only
when P7-7 starts. Register each phase as a row in `docs/tasks/MASTER_TASK.md` before starting it.

---

## Practical FAQ — Common Questions

Plain-language answers to the questions people ask before turning a Mac into a test server.

### Q1 — Do I need a virtual machine (VM) for this?

**No.** The stack runs directly on the Mac through **Docker Desktop** — the containers
(BE · FE · MySQL · Redis · Grafana) are the isolation layer, so no VM is needed.
*(Docker Desktop on macOS already runs its Linux containers inside a tiny VM under the hood —
you get that for free and never manage it.)*
The only thing that needs a real VM is rehearsing the exact VPS deploy path
(SSH + GHCR pull), and the plan deliberately **defers that to Stage B** (see Non-Goals).

### Q2 — Will running my Mac as a server harm the computer?

Low risk, and **every change is reversible** (see Q4). Effects, worst first:

| Effect | Cause | Mitigation |
|---|---|---|
| **Heat / fan wear** | "Never sleep" keeps the Mac awake 24/7 | Keep it ventilated; the plan keeps the *display* sleeping (`displaysleep 10`) |
| **Battery aging** (laptops only) | Plugged in at 100% constantly | macOS **Optimized Battery Charging**; N/A on Mac mini/desktop |
| **Disk fills up** | Docker rebuilds + nightly backups pile up | M3 weekly `docker image prune -f` + `docker system df -v` |
| **RAM/CPU reserved** | Docker holds ~2–4 GB for the container VM | Fine on a dedicated box; noticeable if it's also your daily laptop |

**Not harmful:** opening the firewall to `com.docker.backend` (LAN-only, not the internet),
Docker-at-login, and the router DHCP reservation. The only internet-exposure risk is the
**M5 tunnel**, flagged separately with its seed-password warning.

**Rule of thumb:** a **Mac mini / desktop** is built for this; a **dedicated MacBook** is fine if
ventilated; your **only daily-driver laptop** is where to think twice (heat + RAM compete with normal work).

### Q3 — Can I open the app on my iPhone?

**Yes — that is exactly what Stage A delivers.** With the stack running, an iPhone on the
**same Wi-Fi** opens Safari → `http://<mac-ip>` and sees the live app.

```
iPhone  ──Wi-Fi──►  Router  ──►  Mac (Docker stack)
         http://<mac-ip>          BE + FE + MySQL + Redis
```

Checklist:
1. iPhone **and** Mac on the same Wi-Fi (turn off the iPhone's mobile data so it doesn't route around the LAN).
2. Find the Mac IP: `ipconfig getifaddr en0` (Wi-Fi) — e.g. `http://192.168.102.6`.
3. The stack must be **running**: `docker compose up -d --build be fe`.

⚠️ **The #1 gotcha:** the FE image bakes `NEXT_PUBLIC_API_URL` **at build time**. If the FE
was built pointing at `localhost`, the page loads on the phone but the app can't reach the
backend (menu blank, login fails). The FE must be built with the **Mac IP**. (Same gotcha as M5, line 89.)

### Q4 — How do I turn the Mac back to normal?

Nothing is permanent. To stop being a server right now:

```bash
docker compose down      # stops all containers, frees RAM/CPU
```

then quit Docker Desktop. To undo each M1 server change:

| Server action | Undo |
|---|---|
| M1-1 Never sleep (`pmset -c sleep 0`) | `sudo pmset -a sleep 1 displaysleep 10 disksleep 10` (restore defaults) |
| M1-2 Docker starts at login | Docker Desktop → Settings → General → untick "Start when you sign in" |
| M1-2 Containers auto-restart | `docker compose down`, then quit Docker Desktop |
| M1-3 Router DHCP reservation | Remove it in the router admin page (harmless to leave) |
| M1-4 Firewall allow Docker | System Settings → Network → Firewall → Options → remove `com.docker.backend` |
| M5 Tunnel | `Ctrl-C` the `cloudflared` / `ngrok` terminal |

---

## Access From Other Devices (LAN) — Quick Reference

Every time the stack is started, phones/tablets on the **same Wi-Fi** can open the app at:

```
http://192.168.102.6
```

(served through **Caddy :80** — same-origin, config baked from root `.env`, gitignored.)

**Scan to open** — `lan_access_qr.png` (encodes `http://192.168.102.6`):

![LAN access QR — http://192.168.102.6](lan_access_qr.png)

Regenerate the QR any time (e.g. after an IP change):

```bash
qrencode -o docs/system/09_devops/lan_access_qr.png -s 8 "http://<mac-ip>"
```

### Conditions (all must hold)

| # | Condition | Why |
|---|---|---|
| 1 | Start with **`docker compose up -d`** — **NOT `./dev.sh`** | `./dev.sh` runs FE/BE in `localhost` mode (Mac-only). Only the **container + Caddy** path is reachable from other devices. |
| 2 | Other device on the **same Wi-Fi**, mobile data **off** | The Mac IP is a private LAN address — unreachable from cellular/internet. |
| 3 | **Docker Desktop running** | Containers (`restart: unless-stopped`) only come back while Docker runs. |
| 4 | URL is **`http://192.168.102.6`** (port 80, no `:3000`/`:8080`) | Caddy serves FE and proxies `/api/*` → BE on one origin. |

### ⚠️ The one thing that breaks it: the Mac's IP changing

`192.168.102.6` is assigned by the router (DHCP). On a **router reboot or lease expiry** the
Mac may get a different IP — then the baked FE URL, CORS, Caddy host, and QR all point to the
wrong address and access fails (exactly what happened when `.env` was stale on `…​.9`).

**Fix when it happens:**

```bash
ipconfig getifaddr en0                 # read the new IP
# update the IP in root .env (NEXT_PUBLIC_API_URL · CORS_ORIGINS · STORAGE_BASE_URL · WEBHOOK_BASE_URL)
docker compose up -d --build fe be     # rebuild so the new IP is baked in
# then regenerate the QR (command above)
```

**Permanent fix:** set a **DHCP reservation** for the Mac in the router (phase item **M1-3**) so
the IP never changes — then "start stack → access from any device" is reliable with zero upkeep.

---

## Deep Dive Sources

- [`docs/devops/DEPLOY_RUNBOOK.md`](../../devops/DEPLOY_RUNBOOK.md) — Stage A setup, daily commands, gotchas (canonical)
- [GO_LIVE.md](GO_LIVE.md) — how this stage fits the full go-live path
- [MONITORING.md](MONITORING.md) — what to watch during operation
- [`docs/devops/ROLLBACK_PLAN.md`](../../devops/ROLLBACK_PLAN.md) — SLA used in drill M4-3
