package worker

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// Handler handles HTTP requests for worker profile endpoints.
type Handler struct {
	service *Service
}

// NewHandler creates a new Handler wrapping the given Service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// List handles GET /api/workers.
// It parses query parameters (trade, location, available) and writes matching worker profiles as a JSON array.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	filters := WorkerFilters{
		Trade:    query.Get("trade"),
		Location: query.Get("location"),
	}

	if rawAvailable := strings.TrimSpace(query.Get("available")); rawAvailable != "" {
		switch strings.ToLower(rawAvailable) {
		case "true":
			val := true
			filters.Available = &val
		case "false":
			val := false
			filters.Available = &val
		default:
			writeError(w, http.StatusBadRequest, "available must be 'true' or 'false'")
			return
		}
	}

	workers, err := h.service.ListWorkers(r.Context(), filters)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		log.Printf("failed to list workers: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list workers")
		return
	}

	if workers == nil {
		workers = []WorkerProfile{}
	}

	writeJSON(w, http.StatusOK, workers)
}

// Create handles POST /api/workers.
// It decodes the JSON body, validates the input, and registers a new worker profile.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input RegisterWorkerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	id, err := h.service.RegisterWorker(r.Context(), input)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrDuplicateProfile) {
			writeError(w, http.StatusConflict, "a worker profile already exists for this user")
			return
		}
		log.Printf("failed to register worker: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to register worker")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// GetByID handles GET /api/workers/{id}.
// It fetches a single worker profile by ID.
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid worker ID")
		return
	}

	worker, err := h.service.GetWorker(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "worker profile not found")
			return
		}
		log.Printf("failed to get worker %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "failed to get worker profile")
		return
	}

	writeJSON(w, http.StatusOK, worker)
}

// writeJSON writes a JSON response with the given status code and payload.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("failed to write JSON response: %v", err)
	}
}

// writeError writes a JSON error response with the format {"error": "..."}.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
