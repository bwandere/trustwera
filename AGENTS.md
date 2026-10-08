# TrustWera — Agent Context

This file is the source of truth for continuing this project. Read it fully
before making changes. Update the milestone checkboxes when a step is done.

## Project

A trusted community services platform connecting local clients with skilled
and casual workers (electricians, plumbers, cleaners, gardeners, etc.) in
Kenya. Problem: word-of-mouth/WhatsApp/broker-based hiring is slow and
unverifiable. V1 solution: a simple, verified worker directory with search —
no in-app payments, chat, or bookings yet (those are V2+).

Full reasoning lives in `TrustWera.pdf` (design doc) if present in the repo —
this file is the condensed, current-state version of it.

## Architecture decisions (do not deviate without discussion)

- Layers: `handler → service → repository`, each behind an interface so the
  repository can be mocked in tests. No SQL in handlers, no HTTP concerns in
  the service layer.
- Routing: Go 1.22 stdlib `net/http.ServeMux` (method + path params, e.g.
  `mux.HandleFunc("GET /api/workers/{id}", ...)`). Deliberately NOT using
  chi/gin yet — introduce a router only when stdlib routing actually becomes
  painful (likely around auth middleware in M4), not before.
- Database: PostgreSQL via `pgx` (pgxpool), parameterized queries always,
  never string-concatenated SQL.
- Passwords: bcrypt (min cost 10–12), hashed at account-creation time even
  though login/auth isn't implemented until M4 — nothing to retrofit later.
- Frontend: vanilla HTML/CSS/JS, mobile-first, low-bandwidth. No framework,
  no build step, no NPM dependencies.
- Migrations: plain forward-only `.sql` files in `db/migrations/`, run
  manually via `psql`/`docker exec` — no migration library yet.

## Repo structure (current)

```
trustwera/
├── index.html                    # landing page — DONE
├── 404.html                      # custom 404 not found page — DONE
├── about/
│   └── index.html                # About page — DONE
├── become-a-worker/
│   └── index.html                # worker registration page — DONE
├── login/
│   └── index.html                # login page — DONE
├── register/
│   └── index.html                # client registration page — DONE
├── workers/
│   ├── index.html                # Find Workers directory page — DONE
│   └── profile.html              # Worker Profile page — DONE
├── assets/
│   ├── css/
│   │   └── style.css             # design tokens, responsive layout, components — DONE
│   ├── js/
│   │   ├── config.js             # window.TrustWera.Config (API_BASE) — DONE
│   │   ├── api.js                # window.TrustWera.api fetch wrapper — DONE
│   │   ├── worker-card.js        # window.TrustWera.renderWorkerCard — DONE
│   │   ├── script.js             # global nav toggle, sticky header, scroll reveal — DONE
│   │   ├── landing.js            # landing page live search & trade counts — DONE
│   │   ├── workers.js            # directory search, filter chips, show more — DONE
│   │   ├── profile.js            # profile view & contact reveal logic — DONE
│   │   ├── become-worker.js      # worker registration logic — DONE
│   │   ├── register.js           # client registration logic — DONE
│   │   ├── login.js              # login handling & auth notice — DONE
│   │   └── how-it-works-3d.js    # progressive enhancement Three.js busts — DONE
│   └── images/
│       ├── hero-trades.jpg
│       └── preview.png
├── cmd/
│   └── api/
│       ├── main.go               # Go server & static router — DONE
│       └── main_test.go          # router and static file tests — DONE
├── db/migrations/
│   └── 0001_init_schema.sql       # schema: users, worker_profiles, skills, worker_skills — DONE
├── docker-compose.yml              # local Postgres for dev — DONE
├── .env.example                    # DATABASE_URL, PORT — DONE
├── internal/
│   ├── db/db.go                    # pgx connection pool — DONE
│   └── worker/
│       ├── model.go                # WorkerProfile, Skill structs — DONE
│       ├── repository.go           # Repository interface + Postgres impl — DONE
│       ├── service.go              # validation & business logic — DONE
│       ├── handler.go              # HTTP handlers for /api/workers — DONE
│       └── handler_test.go         # API endpoint unit tests — DONE
├── go.mod
├── go.sum
├── LICENSE
└── README.md                       # project documentation & routes table — DONE
```

## Milestone tracker

**M1 — Landing page: DONE.** Live at https://bwandere.github.io/trustwera/

**M2 — Backend setup + worker registration + search filters: DONE**

- [x] `db/migrations/0001_init_schema.sql`
- [x] `docker-compose.yml` — local Postgres for dev
- [x] `.env.example` — `DATABASE_URL`, `PORT`
- [x] `internal/db/db.go` — pgx pool, `Connect()`/`Close()`
- [x] `internal/worker/model.go` — `WorkerProfile`, `Skill` structs
- [x] `internal/worker/repository.go` — interface + Postgres impl: `Create`, `GetByID`, `List(filters)`
- [x] `internal/worker/service.go` — validation/orchestration
- [x] `internal/worker/handler.go` — HTTP handlers
- [x] Wire into `cmd/api/main.go` (keep serving the static landing page too)
- [x] `GET /api/workers?trade=&location=&available=` — list with filters
- [x] `POST /api/workers` — create profile
- [x] `GET /api/workers/{id}` — fetch one profile
- [x] `GET /healthz` — health check
- [x] Automated and integration tests passing (`go test ./...`)

**M3 — Frontend: Find Workers + Become a Worker pages: DONE**
- [x] `assets/js/config.js` — runtime API base configuration
- [x] `assets/js/api.js` — unified fetch wrapper with 10s timeout, AbortSignal, HTTP vs network error discrimination
- [x] `assets/js/worker-card.js` — unified worker card component matching `preview.png`
- [x] `workers/index.html` + `assets/js/workers.js` — search filters, datalist, removable filter chips, client-side show more
- [x] `workers/profile.html` + `assets/js/profile.js` — profile view, safe bio rendering, contact reveal (tel/wa.me/copy), hiring safety tips
- [x] `become-a-worker/index.html` + `assets/js/become-worker.js` — accessible registration form, dynamic skills, bio counter, verification consent
- [x] `register/index.html` + `assets/js/register.js` — client registration form
- [x] `login/index.html` + `assets/js/login.js` — login form with calm pending-auth notice
- [x] `about/index.html` — mission, verification model, direct contact explanation
- [x] `404.html` — friendly error page with search shortcut
- [x] Shared UI styles in `assets/css/style.css` (`.form`, `.field`, `.alert`, `.skeleton`, `.chip`, `.avatar`)
- [x] Responsive audit: no horizontal scroll at 320/375/768/1024/1280/1440px

**M4 — Auth (PENDING)**
Register/login authentication backend, password verification, JWT or session middleware, role-based access.

**Postponed to V2+ (per design doc):** reviews/ratings, in-app messaging,
payments/escrow, booking calendar, notifications, multi-language support,
admin analytics dashboard, native mobile app.

## Conventions

- Commit style: small, scoped commits per sub-step — e.g.
  `feat(worker): add profile CRUD handlers`,
  `chore(db): add migration for worker_skills` — not one commit per milestone.
- Security: bcrypt password hashing, parameterized SQL only, validate/sanitize
  all inputs server-side, don't expose worker phone numbers to unauthenticated
  users, restrict file upload types/size for photos.
- Shared scripts: IIFEs attached to `window.TrustWera` namespace without bundlers. Strict load order:
  `config.js` → `api.js` → `worker-card.js` → `script.js` → page script (all `defer`).
- Root-absolute paths: all assets, stylesheets, scripts, images, and links MUST use root-absolute paths (`/assets/...`, `/workers`, `/`).
- No fake data: all data-driven views must connect to the API or show honest empty/loading/error states.
- Honest copy: no claims of "every worker checked before listed"; accurately describe that the "Verified" badge indicates manual team review.
- `skills.name` values must exactly match the frontend's
  `<select id="service-needed">` option values (`electrician`, `plumber`,
  `carpenter`, `painter`, `mechanic`, `cleaner`, `gardener`, `security`) —
  no translation layer between frontend and DB.

## Instructions for the agent

- Work one unchecked step from the milestone tracker at a time, then stop for
  human review. Do not skip ahead or batch multiple unrelated steps together.
- Do NOT run `git commit` or `git push` automatically. Leave changes
  staged/unstaged. The human reviews and commits manually — this project is
  for learning Go, and understanding every change matters more than speed.
- After a step is completed and reviewed, update its checkbox above.
- If a design decision here seems wrong or outdated, flag it and ask rather
  than silently deviating.
