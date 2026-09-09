package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Connect initializes and returns a PostgreSQL connection pool using pgxpool.
// It attempts to load variables from a local .env file using godotenv.
// If the .env file does not exist, the error is safely ignored so that
// environment variables already set (e.g., in Docker, system environments, or CI)
// continue to work seamlessly.
func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	// Attempt to load .env if present; silently continue if absent.
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DATABASE_URL: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgx pool: %w", err)
	}

	// Ping database to verify connection before returning pool.
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return pool, nil
}

// Close gracefully closes all active connections in the pgx connection pool.
func Close(pool *pgxpool.Pool) {
	if pool != nil {
		pool.Close()
	}
}
