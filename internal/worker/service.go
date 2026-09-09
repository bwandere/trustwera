package worker

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

const (
	maxBioLength            = 1000
	maxLocationAreaLength   = 100
	maxTradeFilterLength    = 50
	maxLocationFilterLength = 100
)

// RegisterWorkerInput holds the request payload required to register a worker profile.
type RegisterWorkerInput struct {
	UserID          int64    `json:"user_id"`
	Bio             *string  `json:"bio"`
	LocationArea    string   `json:"location_area"`
	LocationLat     *float64 `json:"location_lat"`
	LocationLng     *float64 `json:"location_lng"`
	IsAvailable     *bool    `json:"is_available"`
	ProfilePhotoURL *string  `json:"profile_photo_url"`
	SkillIDs        []int64  `json:"skill_ids"`
}

// Service provides business logic and validation for worker profile operations.
type Service struct {
	repo Repository
}

// NewService creates a new worker Service instance wrapping the given Repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// RegisterWorker validates the input and delegates worker profile creation to the repository.
func (s *Service) RegisterWorker(ctx context.Context, input RegisterWorkerInput) (int64, error) {
	if input.UserID <= 0 {
		return 0, errors.New("user_id must be a positive integer")
	}

	locationArea := strings.TrimSpace(input.LocationArea)
	if locationArea == "" {
		return 0, errors.New("location_area is required and cannot be empty")
	}
	if len(locationArea) > maxLocationAreaLength {
		return 0, fmt.Errorf("location_area exceeds maximum length of %d characters", maxLocationAreaLength)
	}

	if len(input.SkillIDs) == 0 {
		return 0, errors.New("at least one skill ID is required")
	}

	seenSkills := make(map[int64]bool)
	var uniqueSkillIDs []int64
	for _, id := range input.SkillIDs {
		if id <= 0 {
			return 0, fmt.Errorf("invalid skill ID: %d (must be a positive integer)", id)
		}
		if !seenSkills[id] {
			seenSkills[id] = true
			uniqueSkillIDs = append(uniqueSkillIDs, id)
		}
	}

	if input.Bio != nil && len(*input.Bio) > maxBioLength {
		return 0, fmt.Errorf("bio exceeds maximum allowed length of %d characters", maxBioLength)
	}

	isAvailable := true
	if input.IsAvailable != nil {
		isAvailable = *input.IsAvailable
	}

	profile := &WorkerProfile{
		UserID:          input.UserID,
		Bio:             input.Bio,
		LocationArea:    locationArea,
		LocationLat:     input.LocationLat,
		LocationLng:     input.LocationLng,
		IsAvailable:     isAvailable,
		IsVerified:      false,
		ProfilePhotoURL: input.ProfilePhotoURL,
	}

	return s.repo.Create(ctx, profile, uniqueSkillIDs)
}

// GetWorker fetches a worker profile by ID, passing through ErrNotFound if the worker does not exist.
func (s *Service) GetWorker(ctx context.Context, id int64) (*WorkerProfile, error) {
	if id <= 0 {
		return nil, ErrNotFound
	}
	return s.repo.GetByID(ctx, id)
}

// ListWorkers validates search filter lengths and fetches matching worker profiles from the repository.
func (s *Service) ListWorkers(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error) {
	filters.Trade = strings.TrimSpace(filters.Trade)
	if len(filters.Trade) > maxTradeFilterLength {
		return nil, fmt.Errorf("trade filter exceeds maximum length of %d characters", maxTradeFilterLength)
	}

	filters.Location = strings.TrimSpace(filters.Location)
	if len(filters.Location) > maxLocationFilterLength {
		return nil, fmt.Errorf("location filter exceeds maximum length of %d characters", maxLocationFilterLength)
	}

	return s.repo.List(ctx, filters)
}
