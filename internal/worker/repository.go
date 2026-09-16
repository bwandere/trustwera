package worker

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested worker profile does not exist.
var ErrNotFound = errors.New("worker profile not found")

// ErrDuplicateProfile is returned when a worker profile already exists for a user.
var ErrDuplicateProfile = errors.New("worker profile already exists for this user")

// WorkerFilters represents optional query filters for listing worker profiles.
type WorkerFilters struct {
	Trade     string
	Location  string
	Available *bool
}

// Repository defines data access operations for worker profiles and associated skills.
type Repository interface {
	Create(ctx context.Context, profile *WorkerProfile, skillIDs []int64) (int64, error)
	GetByID(ctx context.Context, id int64) (*WorkerProfile, error)
	List(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error)
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

// Compile-time assertion that postgresRepository implements Repository.
var _ Repository = (*postgresRepository)(nil)

// NewRepository creates a new PostgreSQL-backed worker repository.
func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

// Create inserts a row into worker_profiles and its corresponding worker_skills within a single transaction.
func (r *postgresRepository) Create(ctx context.Context, profile *WorkerProfile, skillIDs []int64) (int64, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	insertProfileQuery := `
		INSERT INTO worker_profiles (
			user_id, bio, location_area, location_lat, location_lng,
			is_available, is_verified, profile_photo_url
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	var profileID int64
	err = tx.QueryRow(ctx, insertProfileQuery,
		profile.UserID,
		profile.Bio,
		profile.LocationArea,
		profile.LocationLat,
		profile.LocationLng,
		profile.IsAvailable,
		profile.IsVerified,
		profile.ProfilePhotoURL,
	).Scan(&profileID, &profile.CreatedAt, &profile.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.ConstraintName == "worker_profiles_user_id_key" || strings.Contains(pgErr.Detail, "user_id") {
				return 0, fmt.Errorf("%w: %w", ErrDuplicateProfile, err)
			}
		}
		return 0, fmt.Errorf("failed to insert worker profile: %w", err)
	}

	profile.ID = profileID

	if len(skillIDs) > 0 {
		insertSkillQuery := `
			INSERT INTO worker_skills (worker_profile_id, skill_id)
			VALUES ($1, $2)
		`
		for _, skillID := range skillIDs {
			_, err = tx.Exec(ctx, insertSkillQuery, profileID, skillID)
			if err != nil {
				return 0, fmt.Errorf("failed to insert worker skill (%d, %d): %w", profileID, skillID, err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return profileID, nil
}

// GetByID fetches one worker profile by ID joined with its skills.
func (r *postgresRepository) GetByID(ctx context.Context, id int64) (*WorkerProfile, error) {
	query := `
		SELECT
			wp.id,
			wp.user_id,
			wp.bio,
			wp.location_area,
			wp.location_lat,
			wp.location_lng,
			wp.is_available,
			wp.is_verified,
			wp.profile_photo_url,
			wp.created_at,
			wp.updated_at,
			s.id,
			s.name,
			s.category
		FROM worker_profiles wp
		LEFT JOIN worker_skills ws ON ws.worker_profile_id = wp.id
		LEFT JOIN skills s ON s.id = ws.skill_id
		WHERE wp.id = $1
		ORDER BY s.name ASC
	`

	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query worker profile: %w", err)
	}
	defer rows.Close()

	var profile *WorkerProfile

	for rows.Next() {
		var (
			p             WorkerProfile
			skillID       *int64
			skillName     *string
			skillCategory *string
		)

		err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Bio,
			&p.LocationArea,
			&p.LocationLat,
			&p.LocationLng,
			&p.IsAvailable,
			&p.IsVerified,
			&p.ProfilePhotoURL,
			&p.CreatedAt,
			&p.UpdatedAt,
			&skillID,
			&skillName,
			&skillCategory,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan worker profile row: %w", err)
		}

		if profile == nil {
			p.Skills = make([]Skill, 0)
			profile = &p
		}

		if skillID != nil && skillName != nil && skillCategory != nil {
			profile.Skills = append(profile.Skills, Skill{
				ID:       *skillID,
				Name:     *skillName,
				Category: *skillCategory,
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading worker profile rows: %w", err)
	}

	if profile == nil {
		return nil, ErrNotFound
	}

	return profile, nil
}

const baseListQuery = `
	SELECT
		wp.id,
		wp.user_id,
		wp.bio,
		wp.location_area,
		wp.location_lat,
		wp.location_lng,
		wp.is_available,
		wp.is_verified,
		wp.profile_photo_url,
		wp.created_at,
		wp.updated_at,
		s.id,
		s.name,
		s.category
	FROM worker_profiles wp
	LEFT JOIN worker_skills ws ON ws.worker_profile_id = wp.id
	LEFT JOIN skills s ON s.id = ws.skill_id
`

// List fetches worker profiles matching optional filters, joining through worker_skills -> skills.
func (r *postgresRepository) List(ctx context.Context, filters WorkerFilters) ([]WorkerProfile, error) {
	var (
		conditions []string
		args       []any
	)

	if filters.Trade != "" {
		args = append(args, filters.Trade)
		conditions = append(conditions, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM worker_skills ws2
			JOIN skills s2 ON s2.id = ws2.skill_id
			WHERE ws2.worker_profile_id = wp.id AND s2.name = $%d
		)`, len(args)))
	}

	if filters.Location != "" {
		args = append(args, filters.Location)
		conditions = append(conditions, fmt.Sprintf("wp.location_area = $%d", len(args)))
	}

	if filters.Available != nil {
		args = append(args, *filters.Available)
		conditions = append(conditions, fmt.Sprintf("wp.is_available = $%d", len(args)))
	}

	query := baseListQuery
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY wp.created_at DESC, wp.id DESC, s.name ASC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query worker profiles: %w", err)
	}
	defer rows.Close()

	profiles := make([]WorkerProfile, 0)
	profileMap := make(map[int64]*WorkerProfile)
	var profileOrder []int64

	for rows.Next() {
		var (
			p             WorkerProfile
			skillID       *int64
			skillName     *string
			skillCategory *string
		)

		err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Bio,
			&p.LocationArea,
			&p.LocationLat,
			&p.LocationLng,
			&p.IsAvailable,
			&p.IsVerified,
			&p.ProfilePhotoURL,
			&p.CreatedAt,
			&p.UpdatedAt,
			&skillID,
			&skillName,
			&skillCategory,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan worker profile row: %w", err)
		}

		existing, exists := profileMap[p.ID]
		if !exists {
			newProfile := p
			newProfile.Skills = make([]Skill, 0)
			profileMap[p.ID] = &newProfile
			profileOrder = append(profileOrder, p.ID)
			existing = &newProfile
		}

		if skillID != nil && skillName != nil && skillCategory != nil {
			existing.Skills = append(existing.Skills, Skill{
				ID:       *skillID,
				Name:     *skillName,
				Category: *skillCategory,
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading worker profiles rows: %w", err)
	}

	for _, id := range profileOrder {
		profiles = append(profiles, *profileMap[id])
	}

	return profiles, nil
}
