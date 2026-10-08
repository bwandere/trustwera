package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"

	"trustwera/internal/db"
	"trustwera/internal/worker"
)

type noDirFS struct {
	fs http.FileSystem
}

func (nfs noDirFS) Open(name string) (http.File, error) {
	f, err := nfs.fs.Open(name)
	if err != nil {
		return nil, err
	}
	stat, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, err
	}
	if stat.IsDir() {
		_ = f.Close()
		return nil, os.ErrNotExist
	}
	return f, nil
}

func notFoundHandler(rootDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		custom404 := filepath.Join(rootDir, "404.html")
		if content, err := os.ReadFile(custom404); err == nil {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write(content)
			return
		}
		http.NotFound(w, r)
	}
}

func setupRouter(pool *pgxpool.Pool, handler *worker.Handler, rootDir string) *http.ServeMux {
	mux := http.NewServeMux()

	// Worker profile API routes
	if handler != nil {
		mux.HandleFunc("GET /api/workers", handler.List)
		mux.HandleFunc("POST /api/workers", handler.Create)
		mux.HandleFunc("GET /api/workers/{id}", handler.GetByID)
	}

	// Health check endpoint
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if pool == nil || pool.Ping(r.Context()) != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "db unreachable"})
			return
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Assets: serve only /assets/ directory via StripPrefix + FileServer rooted at ./assets,
	// wrapped so requests for directories return 404 (no directory listings).
	assetsDir := filepath.Join(rootDir, "assets")
	fileServer := http.FileServer(noDirFS{fs: http.Dir(assetsDir)})
	mux.Handle("/assets/", http.StripPrefix("/assets/", fileServer))
	mux.HandleFunc("GET /assets", notFoundHandler(rootDir))

	// Explicit HTML routes
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(rootDir, "index.html"))
	})
	mux.HandleFunc("GET /workers", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(rootDir, "workers", "index.html"))
	})
	mux.HandleFunc("GET /workers/{id}", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(rootDir, "workers", "profile.html"))
	})
	mux.HandleFunc("GET /become-a-worker", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(rootDir, "become-a-worker", "index.html"))
	})
	mux.HandleFunc("GET /register", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(rootDir, "register", "index.html"))
	})
	mux.HandleFunc("GET /login", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(rootDir, "login", "index.html"))
	})
	mux.HandleFunc("GET /about", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(rootDir, "about", "index.html"))
	})

	// Unknown paths return styled 404 (or plain 404 if 404.html is missing)
	mux.HandleFunc("/", notFoundHandler(rootDir))

	return mux
}

func main() {
	ctx := context.Background()
	pool, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close(pool)

	repo := worker.NewRepository(pool)
	service := worker.NewService(repo)
	handler := worker.NewHandler(service)

	mux := setupRouter(pool, handler, webRoot())

	addr := ":" + port()
	log.Printf("TrustWera server serving on http://localhost%s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func webRoot() string {
	if root := os.Getenv("WEB_ROOT"); root != "" {
		return root
	}
	return "."
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}
