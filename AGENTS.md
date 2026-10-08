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
- Frontend: vanilla HTML/CSS/JS, mobile-first, low-bandwidth. No framework.
- Migrations: plain forward-only `.sql` files in `db/migrations/`, run
  manually via `psql`/`docker exec` — no migration library yet.

## Repo structure (current + planned)

```
trustwera-main/
├── index.html                    # landing page — DONE
├── assets/css/style.css
├── assets/js/script.js
├── cmd/api/main.go                # static file server — needs backend wiring
├── db/migrations/
│   └── 0001_init_schema.sql       # DONE — users, worker_profiles, skills,
│                                   worker_skills + skill seed data
├── docker-compose.yml              # DONE — local Postgres for dev
├── .env.example                    # DONE — DATABASE_URL, PORT
├── internal/
│   ├── db/db.go                    # DONE — pgx connection pool
│   └── worker/
│       ├── model.go                # TODO
│       ├── repository.go           # TODO — interface + postgres impl
│       ├── service.go              # TODO
│       └── handler.go              # TODO
├── workers/index.html              # TODO (M3) — Find Workers page
└── (become-a-worker page, TBD path)  # TODO (M3)
```

## Milestone tracker

**M1 — Landing page: DONE.** Live at https://bwandere.github.io/trustwera/

**M2 — Backend setup + worker registration + search filters (IN PROGRESS)**

Build in this order. `GET /api/workers` (filters) comes before `POST`/`GET by
id` deliberately — the Find Workers frontend page (M3) needs it first.

- [x] `db/migrations/0001_init_schema.sql`
- [x] `docker-compose.yml` — local Postgres for dev
- [x] `.env.example` — `DATABASE_URL`, `PORT`
- [x] `internal/db/db.go` — pgx pool, `Connect()`/`Close()`
- [x] `internal/worker/model.go` — `WorkerProfile`, `Skill` structs
- [x] `internal/worker/repository.go` — interface + Postgres impl:
      `Create`, `GetByID`, `List(filters)`
- [x] `internal/worker/service.go` — validation/orchestration
- [x] `internal/worker/handler.go` — HTTP handlers
- [ ] Wire into `cmd/api/main.go` (keep serving the static landing page too)
- [ ] `GET /api/workers?trade=&location=&available=` — build first
- [ ] `POST /api/workers` — create profile
- [ ] `GET /api/workers/{id}` — fetch one profile
- [ ] `GET /healthz`
- [ ] Manually test all endpoints with `curl` before moving to M3

Deferred within/after M2: pagination, photo upload, edit/delete endpoints.

**M3 — Frontend: Find Workers + Become a Worker pages (PENDING)**
Build against the real M2 endpoints via `fetch()` — no mock data, since the
API will already exist by then.

**M4 — Auth (PENDING)**
Register/login, JWT or session middleware, role-based access. Deferred until
after worker CRUD/search work, per project's own reordering of the original
design doc sequence.

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
