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

-- Server-stored deck shares. Only cloud users (allowlisted, signed in)
-- can create one — the short /s/:id URL then opens for anyone, no
-- account needed. The full deck content lives here as serialized
-- markdown so the receive flow is one round-trip from the recipient's
-- browser. Owner can revoke from Settings.
--
-- Compare with the original /share#<base64> flow which never touches
-- the server but produces 1-4 KB URLs — that one still works for
-- non-cloud users; this table is the optional short-URL upgrade.
CREATE TABLE IF NOT EXISTS shared_decks (
  id TEXT PRIMARY KEY,            -- 8-char base36 random id (~48 bits)
  owner_id TEXT NOT NULL,         -- creator's user.id (Google sub)
  title TEXT NOT NULL,            -- denormalized for owner's listing
  card_count INTEGER NOT NULL,    -- denormalized stats
  deck_md TEXT NOT NULL,          -- serialized markdown (same as /share#)
  created_at INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_shared_decks_owner
  ON shared_decks(owner_id, created_at DESC);

-- Server-side snapshot history. On every push, the prior user_state
-- row is archived here before being overwritten — so "I accidentally
-- pushed an empty local over my full cloud" is recoverable from
-- Settings → Cloud zálohy → Obnovit. Kept to the last 5 per user
-- (pruned by the push endpoint).
CREATE TABLE IF NOT EXISTS user_state_history (
  user_id TEXT NOT NULL,
  saved_at INTEGER NOT NULL,        -- when this snapshot was archived
  data_json TEXT NOT NULL,
  card_count INTEGER NOT NULL DEFAULT 0,
  deck_count INTEGER NOT NULL DEFAULT 0,
  client_id TEXT,
  PRIMARY KEY (user_id, saved_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_history_user
  ON user_state_history(user_id, saved_at DESC);
