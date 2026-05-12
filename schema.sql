-- D1 schema for rep cloud sync.
-- Apply with: wrangler d1 execute rep --file=./schema.sql --remote
-- (drop --remote for local dev DB)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- Google "sub" claim (stable user id)
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_sync_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Single JSON blob per user containing the full Zustand store snapshot
-- (reviews, decks, cards, srsState, deadlines, user prefs).
-- Conflict resolution: last-write-wins by `updated_at`.
CREATE TABLE IF NOT EXISTS user_state (
  user_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  client_id TEXT,                 -- which device wrote this; for diagnostics
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Cloud-sync allowlist, managed at runtime from the owner's Settings UI
-- (no redeploy needed when adding/removing access). The OWNER_EMAIL env
-- var is always implicitly allowed and is the only account that can
-- manage this table — the env var is the bootstrap so you can never
-- lock yourself out of your own deploy. AUTHORIZED_EMAILS env var also
-- still works as a static fallback for backwards compat.
CREATE TABLE IF NOT EXISTS allowed_emails (
  email TEXT PRIMARY KEY,         -- lowercased on insert
  note TEXT,                      -- free-form: "kamarad ze tridy", "test"
  added_at INTEGER NOT NULL
);
