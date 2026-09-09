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

// ErrValidation is returned when input validation fails.
var ErrValidation = errors.New("validation failed")

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
		return 0, fmt.Errorf("%w: user_id must be a positive integer", ErrValidation)
	}

	locationArea := strings.TrimSpace(input.LocationArea)
	if locationArea == "" {
		return 0, fmt.Errorf("%w: location_area is required and cannot be empty", ErrValidation)
	}
	if len(locationArea) > maxLocationAreaLength {
		return 0, fmt.Errorf("%w: location_area exceeds maximum length of %d characters", ErrValidation, maxLocationAreaLength)
	}

	if len(input.SkillIDs) == 0 {
		return 0, fmt.Errorf("%w: at least one skill ID is required", ErrValidation)
	}

	seenSkills := make(map[int64]bool)
	var uniqueSkillIDs []int64
	for _, id := range input.SkillIDs {
		if id <= 0 {
			return 0, fmt.Errorf("%w: invalid skill ID: %d (must be a positive integer)", ErrValidation, id)
		}
		if !seenSkills[id] {
			seenSkills[id] = true
			uniqueSkillIDs = append(uniqueSkillIDs, id)
		}
	}

	if input.Bio != nil && len(*input.Bio) > maxBioLength {
		return 0, fmt.Errorf("%w: bio exceeds maximum allowed length of %d characters", ErrValidation, maxBioLength)
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
		return nil, fmt.Errorf("%w: trade filter exceeds maximum length of %d characters", ErrValidation, maxTradeFilterLength)
	}

	filters.Location = strings.TrimSpace(filters.Location)
	if len(filters.Location) > maxLocationFilterLength {
		return nil, fmt.Errorf("%w: location filter exceeds maximum length of %d characters", ErrValidation, maxLocationFilterLength)
	}

	return s.repo.List(ctx, filters)
}
