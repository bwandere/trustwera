package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSecurityAndStaticRouting(t *testing.T) {
	tempRoot := t.TempDir()

	dummyFiles := []string{
		".env",
		filepath.Join(".git", "config"),
		filepath.Join("internal", "worker", "model.go"),
		filepath.Join("db", "migrations", "0001_init_schema.sql"),
		filepath.Join("assets", "css", "style.css"),
		"index.html",
		filepath.Join("workers", "index.html"),
	}

	for _, relPath := range dummyFiles {
		fullPath := filepath.Join(tempRoot, relPath)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			t.Fatalf("failed to create directory for %s: %v", relPath, err)
		}
		if err := os.WriteFile(fullPath, []byte("dummy content"), 0644); err != nil {
			t.Fatalf("failed to write dummy file %s: %v", relPath, err)
		}
	}

	router := setupRouter(nil, nil, tempRoot)

	tests := []struct {
		name           string
		path           string
		expectedStatus int
	}{
		{
			name:           "block access to .env",
			path:           "/.env",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "block access to .git/config",
			path:           "/.git/config",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "block access to internal/worker/model.go",
			path:           "/internal/worker/model.go",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "block access to db/migrations/0001_init_schema.sql",
			path:           "/db/migrations/0001_init_schema.sql",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "block directory listing for /assets/",
			path:           "/assets/",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "serve static css file",
			path:           "/assets/css/style.css",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "serve index.html on root path",
			path:           "/",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "serve workers/index.html on /workers",
			path:           "/workers",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.expectedStatus {
				t.Errorf("GET %s returned status %d, expected %d", tc.path, rec.Code, tc.expectedStatus)
			}
		})
	}
}

func TestStyled404Handler(t *testing.T) {
	// Create a temporary directory with a dummy 404.html to test styled 404 rendering
	tempDir := t.TempDir()
	custom404Content := "<html><body><h1>Custom 404 Page</h1></body></html>"
	err := os.WriteFile(filepath.Join(tempDir, "404.html"), []byte(custom404Content), 0644)
	if err != nil {
		t.Fatalf("failed to create temp 404.html: %v", err)
	}

	router := setupRouter(nil, nil, tempDir)

	req := httptest.NewRequest(http.MethodGet, "/non-existent-page", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Custom 404 Page") {
		t.Fatalf("expected body to contain custom 404 page content, got %q", rec.Body.String())
	}
}
