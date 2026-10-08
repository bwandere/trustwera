# TrustWera

A trusted community services platform connecting local clients with verified skilled and casual workers (electricians, plumbers, cleaners, gardeners, painters, mechanics, security guards) in Kenya. Built with Go, PostgreSQL, vanilla HTML, CSS, and JavaScript.

This is **not** a gig-economy marketplace like Fiverr or Upwork with escrow cuts or middleman bidding. It is scoped to helping local communities find, verify, and contact reliable workers directly.

## Current State

- **Backend**: Go stdlib HTTP router (`net/http.ServeMux`), PostgreSQL with `pgx` connection pool, database migrations, worker profile registration (`POST /api/workers`), worker directory filtering (`GET /api/workers`), and single profile lookup (`GET /api/workers/{id}`).
- **Frontend**: Mobile-first vanilla HTML/CSS/JS without build steps or frameworks. Live data integration via shared client libraries (`config.js`, `api.js`, `worker-card.js`).
- **Pages**:
  - Landing page with live trade counts, hero search card, and featured workers
  - Find Workers directory with live filters, datalist, removable filter chips, and pagination
  - Worker Profile page with contact reveal (Call, WhatsApp, Copy) and hiring safety tips
  - Become a Worker registration form with client validation and verification notice
  - Client Registration and Login pages with graceful pending auth notices
  - About page explaining TrustWera's verification model and mission
  - Custom responsive 404 page with search shortcut

> **Note on GitHub Pages**: The repository landing page can be hosted statically on GitHub Pages, but GitHub Pages **cannot** serve dynamic API requests (`/api/*`). Full directory search and profile registration require running the Go backend server.

---

## Routes

### Frontend Pages

| Route | File | Description |
|---|---|---|
| `GET /` | `index.html` | Landing page, hero search, trade categories, featured workers |
| `GET /workers` | `workers/index.html` | Find Workers directory with search & filters |
| `GET /workers/{id}` | `workers/profile.html` | Individual worker profile & direct contact options |
| `GET /become-a-worker` | `become-a-worker/index.html` | Worker registration form |
| `GET /register` | `register/index.html` | Client registration form |
| `GET /login` | `login/index.html` | Account login page |
| `GET /about` | `about/index.html` | About TrustWera philosophy & verification details |
| `*` (any unknown path) | `404.html` | Custom not found page with search shortcut |

### Backend API Endpoints

| Method & Path | Description |
|---|---|
| `GET /api/workers?trade=&location=&available=` | List worker profiles matching optional filters |
| `POST /api/workers` | Create a worker profile |
| `GET /api/workers/{id}` | Fetch a single worker profile by ID |
| `GET /healthz` | Health check endpoint (checks server & DB connection) |

---

## Running Locally

### Prerequisites

- [Go](https://go.dev/) 1.22+
- [Docker](https://www.docker.com/) & Docker Compose

### Step 1: Start PostgreSQL

Start the local PostgreSQL container in the background:

```bash
docker compose up -d
```

### Step 2: Apply Database Schema Migration

Apply the initial schema and seed skills:

```bash
docker exec -i $(docker compose ps -q db) psql -U postgres -d trustwera < db/migrations/0001_init_schema.sql
```

*(Or via local `psql`: `psql "postgres://postgres:postgres@localhost:5432/trustwera?sslmode=disable" -f db/migrations/0001_init_schema.sql`)*

### Step 3: Configure Environment

Copy `.env.example` to `.env` (or ensure `DATABASE_URL` is configured):

```bash
cp .env.example .env
```

Default configuration:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/trustwera?sslmode=disable
PORT=8080
```

### Step 4: Run the Go Server

From the repository root:

```bash
go run ./cmd/api
```

Open `http://localhost:8080` in your browser.

To run on a different port:
```bash
PORT=3000 go run ./cmd/api
```

### Running Tests

Run all unit and integration tests:

```bash
go test ./...
```

---

## Tech Stack & Architecture

- **Frontend Architecture**: Vanilla HTML5, CSS3, ES6 JavaScript. No build tools, bundlers, or CSS preprocessors.
  - `assets/css/style.css`: Unified design tokens, responsive CSS grids, WCAG AA contrast.
  - `assets/js/config.js`: Runtime configuration (`API_BASE`).
  - `assets/js/api.js`: Unified fetch client with 10s timeout, AbortSignal support, and error discrimination.
  - `assets/js/worker-card.js`: Modular worker card renderer used across landing and directory views.
- **Backend Architecture**: Layered design (`handler → service → repository`) using Go standard library routing (`net/http.ServeMux`).
- **Database**: PostgreSQL with `pgxpool` parameterized queries.