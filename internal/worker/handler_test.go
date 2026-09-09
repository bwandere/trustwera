package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type mockRepository struct {
	createFunc  func(ctx context.Context, profile *WorkerProfile, skillIDs []int64) (int64, error)
	getByIDFunc func(ctx context.Context, id int64) (*WorkerProfile, error)
	listFunc    func(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error)
}

func (m *mockRepository) Create(ctx context.Context, profile *WorkerProfile, skillIDs []int64) (int64, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, profile, skillIDs)
	}
	return 0, errors.New("not implemented")
}

func (m *mockRepository) GetByID(ctx context.Context, id int64) (*WorkerProfile, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, errors.New("not implemented")
}

func (m *mockRepository) List(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx, filters)
	}
	return nil, errors.New("not implemented")
}

func TestHandler_List(t *testing.T) {
	t.Run("returns empty array with 200 OK when no workers match", func(t *testing.T) {
		repo := &mockRepository{
			listFunc: func(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error) {
				return []WorkerProfile{}, nil
			},
		}
		handler := NewHandler(NewService(repo))

		req := httptest.NewRequest(http.MethodGet, "/api/workers", nil)
		rec := httptest.NewRecorder()

		handler.List(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if contentType := rec.Header().Get("Content-Type"); contentType != "application/json" {
			t.Errorf("expected Content-Type application/json, got %s", contentType)
		}
		expectedBody := "[]\n"
		if rec.Body.String() != expectedBody {
			t.Errorf("expected body %q, got %q", expectedBody, rec.Body.String())
		}
	})

	t.Run("parses query params correctly", func(t *testing.T) {
		var capturedFilters WorkerFilters
		repo := &mockRepository{
			listFunc: func(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error) {
				capturedFilters = filters
				return []WorkerProfile{
					{ID: 1, LocationArea: "Westlands", IsAvailable: true},
				}, nil
			},
		}
		handler := NewHandler(NewService(repo))

		req := httptest.NewRequest(http.MethodGet, "/api/workers?trade=plumber&location=Westlands&available=true", nil)
		rec := httptest.NewRecorder()

		handler.List(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if capturedFilters.Trade != "plumber" {
			t.Errorf("expected trade plumber, got %s", capturedFilters.Trade)
		}
		if capturedFilters.Location != "Westlands" {
			t.Errorf("expected location Westlands, got %s", capturedFilters.Location)
		}
		if capturedFilters.Available == nil || !*capturedFilters.Available {
			t.Errorf("expected available to be true")
		}
	})

	t.Run("available=false parses correctly", func(t *testing.T) {
		var capturedFilters WorkerFilters
		repo := &mockRepository{
			listFunc: func(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error) {
				capturedFilters = filters
				return []WorkerProfile{}, nil
			},
		}
		handler := NewHandler(NewService(repo))

		req := httptest.NewRequest(http.MethodGet, "/api/workers?available=false", nil)
		rec := httptest.NewRecorder()

		handler.List(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if capturedFilters.Available == nil || *capturedFilters.Available {
			t.Errorf("expected available to be false")
		}
	})

	t.Run("returns 400 for invalid available filter", func(t *testing.T) {
		handler := NewHandler(NewService(&mockRepository{}))

		req := httptest.NewRequest(http.MethodGet, "/api/workers?available=maybe", nil)
		rec := httptest.NewRecorder()

		handler.List(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", rec.Code)
		}
	})

	t.Run("returns 400 when filter exceeds maximum length", func(t *testing.T) {
		handler := NewHandler(NewService(&mockRepository{}))

		longTrade := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" // 51 chars
		req := httptest.NewRequest(http.MethodGet, "/api/workers?trade="+longTrade, nil)
		rec := httptest.NewRecorder()

		handler.List(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", rec.Code)
		}
		var errResp map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("failed to unmarshal error body: %v", err)
		}
		if !strings.Contains(errResp["error"], "validation failed") {
			t.Errorf("expected validation error, got %q", errResp["error"])
		}
	})

	t.Run("returns 500 when repository fails", func(t *testing.T) {
		repo := &mockRepository{
			listFunc: func(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error) {
				return nil, errors.New("failed to query worker profiles: db down")
			},
		}
		handler := NewHandler(NewService(repo))

		req := httptest.NewRequest(http.MethodGet, "/api/workers", nil)
		rec := httptest.NewRecorder()

		handler.List(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("expected status 500, got %d", rec.Code)
		}
		var errResp map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("failed to unmarshal error body: %v", err)
		}
		if errResp["error"] != "failed to list workers" {
			t.Errorf("expected generic error message, got %q", errResp["error"])
		}
	})
}

func TestHandler_Create(t *testing.T) {
	t.Run("returns 201 with new ID on success", func(t *testing.T) {
		repo := &mockRepository{
			createFunc: func(ctx context.Context, profile *WorkerProfile, skillIDs []int64) (int64, error) {
				return 42, nil
			},
		}
		handler := NewHandler(NewService(repo))

		body := `{
			"user_id": 1,
			"location_area": "Kilimani",
			"skill_ids": [1, 2]
		}`
		req := httptest.NewRequest(http.MethodPost, "/api/workers", bytes.NewBufferString(body))
		rec := httptest.NewRecorder()

		handler.Create(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
		}
		var resp map[string]int64
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp["id"] != 42 {
			t.Errorf("expected id 42, got %d", resp["id"])
		}
	})

	t.Run("returns 400 on malformed JSON body", func(t *testing.T) {
		handler := NewHandler(NewService(&mockRepository{}))

		req := httptest.NewRequest(http.MethodPost, "/api/workers", bytes.NewBufferString("invalid json"))
		rec := httptest.NewRecorder()

		handler.Create(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", rec.Code)
		}
	})

	t.Run("returns 400 on validation failure", func(t *testing.T) {
		handler := NewHandler(NewService(&mockRepository{}))

		// missing skill_ids and location_area
		body := `{"user_id": 1}`
		req := httptest.NewRequest(http.MethodPost, "/api/workers", bytes.NewBufferString(body))
		rec := httptest.NewRecorder()

		handler.Create(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", rec.Code)
		}
		var resp map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp["error"] == "" {
			t.Errorf("expected error message in response body")
		}
	})

	t.Run("returns 500 when repository fails without leaking internal details", func(t *testing.T) {
		repo := &mockRepository{
			createFunc: func(ctx context.Context, profile *WorkerProfile, skillIDs []int64) (int64, error) {
				return 0, errors.New("failed to insert worker profile: connection refused")
			},
		}
		handler := NewHandler(NewService(repo))

		body := `{
			"user_id": 1,
			"location_area": "Kilimani",
			"skill_ids": [1]
		}`
		req := httptest.NewRequest(http.MethodPost, "/api/workers", bytes.NewBufferString(body))
		rec := httptest.NewRecorder()

		handler.Create(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("expected status 500, got %d", rec.Code)
		}
		var resp map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp["error"] != "failed to register worker" {
			t.Errorf("expected generic error message, got %q", resp["error"])
		}
	})
}

func TestHandler_GetByID(t *testing.T) {
	mux := http.NewServeMux()

	repo := &mockRepository{
		getByIDFunc: func(ctx context.Context, id int64) (*WorkerProfile, error) {
			if id == 42 {
				return &WorkerProfile{
					ID:           42,
					UserID:       1,
					LocationArea: "Westlands",
					IsAvailable:  true,
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
					Skills: []Skill{
						{ID: 1, Name: "electrician", Category: "skilled"},
					},
				}, nil
			}
			return nil, ErrNotFound
		},
	}
	handler := NewHandler(NewService(repo))
	mux.HandleFunc("GET /api/workers/{id}", handler.GetByID)

	t.Run("returns 200 with worker profile on success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/workers/42", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		var profile WorkerProfile
		if err := json.Unmarshal(rec.Body.Bytes(), &profile); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if profile.ID != 42 || profile.LocationArea != "Westlands" {
			t.Errorf("unexpected profile data: %+v", profile)
		}
	})

	t.Run("returns 404 when worker not found", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/workers/999", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected status 404, got %d", rec.Code)
		}
		var resp map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode error: %v", err)
		}
		if resp["error"] != "worker profile not found" {
			t.Errorf("expected 'worker profile not found', got %q", resp["error"])
		}
	})

	t.Run("returns 400 on invalid worker ID format", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/workers/notanint", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", rec.Code)
		}
	})

	t.Run("returns 500 when repository returns unexpected error", func(t *testing.T) {
		errRepo := &mockRepository{
			getByIDFunc: func(ctx context.Context, id int64) (*WorkerProfile, error) {
				return nil, errors.New("connection failed")
			},
		}
		errHandler := NewHandler(NewService(errRepo))
		errMux := http.NewServeMux()
		errMux.HandleFunc("GET /api/workers/{id}", errHandler.GetByID)

		req := httptest.NewRequest(http.MethodGet, "/api/workers/1", nil)
		rec := httptest.NewRecorder()

		errMux.ServeHTTP(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("expected status 500, got %d", rec.Code)
		}
		var resp map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode error: %v", err)
		}
		if resp["error"] != "failed to get worker profile" {
			t.Errorf("expected generic error message, got %q", resp["error"])
		}
	})
}
