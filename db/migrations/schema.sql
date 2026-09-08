-- ── users ─────────────────────────────────────────────────────────────

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    phone         VARCHAR(20)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('client', 'worker', 'admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── worker_profiles ──────────────────────────────────────────────────

CREATE TABLE worker_profiles (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio               TEXT,
    location_area     VARCHAR(100) NOT NULL,
    location_lat      DOUBLE PRECISION,
    location_lng      DOUBLE PRECISION,
    is_available      BOOLEAN NOT NULL DEFAULT true,
    is_verified       BOOLEAN NOT NULL DEFAULT false,
    profile_photo_url TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_worker_profiles_location  ON worker_profiles (location_area);
CREATE INDEX idx_worker_profiles_available ON worker_profiles (is_available);

-- ── skills ───────────────────────────────────────────────────────────

CREATE TABLE skills (
    id       BIGSERIAL PRIMARY KEY,
    name     VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('skilled', 'casual'))
);

-- ── worker_skills ────────────────────────────────────────────────────

CREATE TABLE worker_skills (
    worker_profile_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    skill_id          BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (worker_profile_id, skill_id)
);

CREATE INDEX idx_worker_skills_skill ON worker_skills (skill_id);

-- ── seed data ────────────────────────────────────────────────────────

INSERT INTO skills (name, category) VALUES
    ('electrician', 'skilled'),
    ('plumber',     'skilled'),
    ('carpenter',   'skilled'),
    ('painter',     'skilled'),
    ('mechanic',    'skilled'),
    ('cleaner',     'casual'),
    ('gardener',    'casual'),
    ('security',    'casual')
ON CONFLICT (name) DO NOTHING;
