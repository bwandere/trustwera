# trustwera
A community platform connecting trusted local workers with households and small businesses. Built with Go, HTML, CSS, and JavaScript.

This is **not** a freelancing marketplace like Fiverr or Upwork. It's
deliberately scoped to one problem: helping a local community find and trust
each other for everyday work.
 
## Current Milestone: Landing Page
 
Only the landing page exists so far. No login, registration, database,
authentication, APIs, or search — those come in later milestones.
 
## Project Structure
 
```
trustwera/
├── index.html              Landing page markup
├── assets/
│   ├── css/style.css       All styling (design tokens + components)
│   ├── js/script.js        Mobile nav, sticky header, scroll reveal
│   ├── images/              Raster images (hero art, etc.)
│   └── icons/               SVG icons
├── cmd/
│   └── api/main.go         Minimal Go server — serves the static frontend
├── go.mod
└── README.md
```
 
The frontend is deliberately decoupled from the Go backend: `index.html` and
`assets/` can be opened directly in a browser with no server at all. The Go
server in `cmd/api/` just serves those same files over HTTP — nothing more,
for now.
 
## Running It
 
**Option A — just the frontend, no Go required**
 
Open `index.html` directly in a browser.
 
**Option B — via the Go server**
 
From the project root:
 
```bash
go run ./cmd/api
```
 
Then visit `http://localhost:8080`.
 
The port can be overridden with the `PORT` environment variable if `8080` is
already in use:
 
```bash
PORT=3000 go run ./cmd/api
```
 
## Tech Stack
 
- **Frontend**: plain HTML5, CSS3, vanilla JavaScript — no frameworks, no
  build step, by design (this milestone is also about being comfortable
  without tooling doing the work).
- **Backend**: Go, standard library only for now (`net/http`). A routing
  library, PostgreSQL, and authentication are planned for later milestones,
  not this one.
## Roadmap
 
Landing page → worker registration/profiles → search & filtering →
authentication → service requests → (later) reviews, messaging, and
scheduling. See the project design doc for the full milestone breakdown.