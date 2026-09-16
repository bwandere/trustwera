package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"trustwera/internal/db"
	"trustwera/internal/worker"
)

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

	mux := http.NewServeMux()

	// Worker profile API routes
	mux.HandleFunc("GET /api/workers", handler.List)
	mux.HandleFunc("POST /api/workers", handler.Create)
	mux.HandleFunc("GET /api/workers/{id}", handler.GetByID)

	// Health check endpoint
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "db unreachable"})
			return
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Static landing page and assets
	fileServer := http.FileServer(http.Dir(webRoot()))
	mux.Handle("/", fileServer)

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
