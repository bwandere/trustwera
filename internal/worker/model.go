package worker

import "time"

// Skill represents a trade or skill category matching the skills table.
type Skill struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

// WorkerProfile represents a worker's profile matching the worker_profiles table.
type WorkerProfile struct {
	ID              int64     `json:"id"`
	UserID          int64     `json:"user_id"`
	Bio             *string   `json:"bio"`
	LocationArea    string    `json:"location_area"`
	LocationLat     *float64  `json:"location_lat"`
	LocationLng     *float64  `json:"location_lng"`
	IsAvailable     bool      `json:"is_available"`
	IsVerified      bool      `json:"is_verified"`
	ProfilePhotoURL *string   `json:"profile_photo_url"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	// Skills represents the worker's skills loaded via the worker_skills join table.
	Skills []Skill `json:"skills"`
}

// WorkerSkill represents a row in the worker_skills join table.
type WorkerSkill struct {
	WorkerProfileID int64 `json:"worker_profile_id"`
	SkillID         int64 `json:"skill_id"`
}
