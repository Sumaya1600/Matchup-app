-- MatchUP PostgreSQL Schema
-- Run this once to create your database tables
-- psql -U postgres -d matchup -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  firebase_uid      TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  sport             TEXT NOT NULL DEFAULT 'Tennis',
  skill_level       TEXT NOT NULL DEFAULT 'Intermediate',
  latitude          DOUBLE PRECISION NOT NULL DEFAULT 51.5074,
  longitude         DOUBLE PRECISION NOT NULL DEFAULT -0.1278,
  radius_km         INTEGER NOT NULL DEFAULT 10,
  availability      TEXT[] NOT NULL DEFAULT '{}',
  reliability_score NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  total_matches     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id                  SERIAL PRIMARY KEY,
  requester_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport               TEXT NOT NULL DEFAULT 'Tennis',
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'declined')),
  compatibility_score INTEGER NOT NULL DEFAULT 0,
  scheduled_time      TIMESTAMP,
  court_name          TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_sport        ON users(sport);
CREATE INDEX IF NOT EXISTS idx_matches_requester  ON matches(requester_id);
CREATE INDEX IF NOT EXISTS idx_matches_receiver   ON matches(receiver_id);
CREATE INDEX IF NOT EXISTS idx_matches_status     ON matches(status);