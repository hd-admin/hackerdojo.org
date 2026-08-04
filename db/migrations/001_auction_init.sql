-- Auction Space Slice 0 — core schema
-- Source of truth: docs/auction/DATA_MODEL.md
-- login_tokens supports magic-link / OTP (Slice 2); included so bootstrap is complete.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- User
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'bidder'
                  CHECK (role IN ('bidder', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auction_users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS auction_users_role_idx ON auction_users (role);

-- Normalize emails to lowercase on write (application also lowercases).
-- Use citext if available; otherwise lower() unique index pattern:
CREATE UNIQUE INDEX IF NOT EXISTS auction_users_email_lower_idx
  ON auction_users (lower(email));

-- ---------------------------------------------------------------------------
-- Artwork (auction lot)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_artworks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  artist             TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  images             JSONB NOT NULL DEFAULT '[]'::jsonb,
  starting_bid       NUMERIC(12, 2) NOT NULL CHECK (starting_bid >= 0),
  current_bid        NUMERIC(12, 2) CHECK (current_bid IS NULL OR current_bid >= 0),
  minimum_increment  NUMERIC(12, 2) NOT NULL CHECK (minimum_increment > 0),
  ends_at            TIMESTAMPTZ NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'preview', 'active', 'closed')),
  winner_user_id     UUID REFERENCES auction_users (id) ON DELETE SET NULL,
  created_by         UUID REFERENCES auction_users (id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auction_artworks_status_ends_idx
  ON auction_artworks (status, ends_at);

CREATE INDEX IF NOT EXISTS auction_artworks_created_at_idx
  ON auction_artworks (created_at DESC);

-- ---------------------------------------------------------------------------
-- Bid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_bids (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id   UUID NOT NULL REFERENCES auction_artworks (id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auction_users (id) ON DELETE CASCADE,
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auction_bids_artwork_amount_idx
  ON auction_bids (artwork_id, amount DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS auction_bids_user_created_idx
  ON auction_bids (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Notification (email audit / dedupe)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auction_users (id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  artwork_id   UUID REFERENCES auction_artworks (id) ON DELETE SET NULL,
  bid_id       UUID REFERENCES auction_bids (id) ON DELETE SET NULL,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta         JSONB
);

CREATE INDEX IF NOT EXISTS auction_notifications_user_type_idx
  ON auction_notifications (user_id, type, created_at DESC);

-- Idempotent "ending soon" (one per user per artwork)
CREATE UNIQUE INDEX IF NOT EXISTS auction_notifications_ending_soon_uidx
  ON auction_notifications (type, user_id, artwork_id)
  WHERE type = 'auction_ending_soon' AND artwork_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Login tokens (magic-link / OTP) — Slice 2
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_login_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  token_hash   TEXT NOT NULL,
  name         TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auction_login_tokens_email_idx
  ON auction_login_tokens (lower(email), expires_at DESC);

CREATE INDEX IF NOT EXISTS auction_login_tokens_hash_idx
  ON auction_login_tokens (token_hash)
  WHERE used_at IS NULL;

-- ---------------------------------------------------------------------------
-- Schema migrations bookkeeping
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
