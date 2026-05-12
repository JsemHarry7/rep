# Deploy + cloud sync setup

The app deploys to Cloudflare Pages from a git push. Cloud sync needs
extra one-time setup: Google OAuth credentials, D1 database, and env
vars on the Pages project.

If you only want the local-first PWA (no cross-device sync), skip
everything below — the app already works without it.

---

## 1. Create the D1 database

You need wrangler CLI authenticated to your Cloudflare account.

```sh
# install wrangler globally (skip if already installed)
npm install -g wrangler
wrangler login

# from the rep/ directory:
wrangler d1 create rep
```

Output looks like:

```
✅ Successfully created DB 'rep'

[[d1_databases]]
binding = "DB"
database_name = "rep"
database_id = "abcdef12-3456-7890-..."
```

Copy that `database_id` and paste it into `wrangler.toml` replacing
`REPLACE_WITH_REAL_DATABASE_ID`.

## 2. Apply the schema

```sh
# from rep/
wrangler d1 execute rep --file=./schema.sql --remote
```

Creates `users` and `user_state` tables in the production DB. Drop
`--remote` if you also want a local copy for `wrangler pages dev`.

## 3. Bind D1 to the Pages project

Cloudflare dashboard → **Workers & Pages → rep → Settings → Functions →
D1 database bindings → Add binding**:

- **Variable name:** `DB`
- **D1 database:** `rep`

(Without this, Functions can't reach the database even though
`wrangler.toml` is set.)

## 4. Google OAuth credentials

1. Open [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project or reuse one.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: `rep`
   - User support email: your address
   - Authorized domains: `pages.dev` (and your custom domain if any)
   - Scopes: leave default (email, profile)
   - Test users: add your email + anyone you'll grant access
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0
   Client ID**:
   - Application type: **Web application**
   - Name: `rep web`
   - Authorized JavaScript origins:
     - `https://rep-amc.pages.dev` (your Pages URL)
     - `http://localhost:5173` (for `npm run dev`)
   - Authorized redirect URIs: leave empty (we use implicit flow)
5. Copy the **Client ID** (looks like `1234567-abc.apps.googleusercontent.com`).

## 5. Set environment variables in Cloudflare Pages

Dashboard → **Workers & Pages → rep → Settings → Environment variables**.
Add to the **Production** scope (and Preview if you use preview deploys):

| Variable | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | (Client ID from step 4) |
| `GOOGLE_CLIENT_ID` | (same value, runtime version) |
| `OWNER_EMAIL` | your gmail — always allowed + can manage the rest from Settings (single email, no list) |
| `SESSION_SECRET` | (random 32+ byte hex string — see below) |
| `NODE_VERSION` | `22` |
| `AUTHORIZED_EMAILS` *(optional)* | comma-separated static fallback list, kept for backwards compat. Spaces around commas are fine. Prefer adding friends via the Settings → Allowlist UI instead — no redeploy needed. |

The OWNER_EMAIL is required for both managing the allowlist UI and as
your own access. Everyone else is added at runtime from
**Settings → Cloud access · Allowlist** once you sign in as the owner.

Generate a session secret:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output. Do **not** commit it.

## 6. Trigger a redeploy

Push any commit, or go to **Pages → rep → Deployments → Retry**.
Cloudflare rebuilds with the new env vars and bindings.

---

## Local development with cloud sync

For `npm run dev` to talk to your local D1 + functions, use
`wrangler pages dev` instead of plain Vite:

```sh
# create rep/.dev.vars (gitignored)
echo "GOOGLE_CLIENT_ID=..." >> .dev.vars
echo "OWNER_EMAIL=you@gmail.com" >> .dev.vars
echo "SESSION_SECRET=..." >> .dev.vars
# AUTHORIZED_EMAILS optional — leave it out and manage from the UI

# .env (gitignored) — Vite reads this at build time
echo "VITE_GOOGLE_CLIENT_ID=..." > .env.local

# run the combined dev server
npm run build
wrangler pages dev dist --d1=DB=rep
```

For everyday frontend work without cloud sync, plain `npm run dev`
still works — `CloudSync` component just shows "not configured" until
the env vars are set.

---

## Schema migrations

The `schema.sql` file uses `CREATE TABLE IF NOT EXISTS` everywhere, so
re-applying after a schema change is safe and idempotent. New tables
introduced since first deploy:

  • `allowed_emails` — runtime allowlist (Settings UI)
  • `shared_decks` — server-stored deck shares (`/s/:id` short URLs)
  • `user_state_history` — snapshot rollback / safety net
  • `shared_decks.kind` column — distinguishes deck shares from
    collection bundle shares

If you originally deployed before these existed, re-run:

```sh
wrangler d1 execute rep --file=./schema.sql --remote
```

For the **`shared_decks.kind` column** specifically — SQLite doesn't
support `ADD COLUMN IF NOT EXISTS`, so the `CREATE TABLE IF NOT EXISTS`
above won't add it to a pre-existing table. Run this **once**:

```sh
wrangler d1 execute rep --remote \
  --command "ALTER TABLE shared_decks ADD COLUMN kind TEXT NOT NULL DEFAULT 'deck'"
```

If you get a "duplicate column" error, the column already exists and
you can ignore it.

## Adding a new authorized user

Sign in as the `OWNER_EMAIL` and go to **Settings → Cloud access ·
Allowlist**. Type the email, hit *přidat*. The new user can sign in
immediately, no redeploy.

To revoke: click *✕ odebrat* next to the email. Existing sessions for
that user stay valid until they expire (30 days, or until they
manually sign out) — to revoke immediately, rotate `SESSION_SECRET`,
which invalidates *all* sessions including your own.

### Legacy `AUTHORIZED_EMAILS` env var

Still works as a static fallback. New deploys should leave it unset
and manage everything from the UI. If you have a populated
`AUTHORIZED_EMAILS` env var from before this change, those emails
remain allowed; you can either migrate them to the D1 table via the UI
or just leave them in the env var.

---

## Data model recap

- Each user has one JSON blob in `user_state` — the full Zustand snapshot.
- Push replaces the blob entirely (last-write-wins).
- Pull replaces local store entirely.
- No automatic conflict resolution; user explicitly pushes/pulls.

If two devices edit simultaneously, the second push overwrites the
first. Workflow: push before closing one device, pull when opening
the other.

---

## Troubleshooting

**"not_configured" error in CloudSync card**
Backend missing `GOOGLE_CLIENT_ID` or `SESSION_SECRET`. Check step 5.

**Sign-in fails with "wrong_audience"**
The token's `aud` claim doesn't match `GOOGLE_CLIENT_ID`. Either you
have a typo in env vars or you're using a different OAuth Client ID
on the frontend than configured on the backend. They must match.

**Sign-in fails with "not_authorized"**
The email Google sent isn't on the allowlist. The error response now
includes the exact email it tried — check **Settings → Cloud sync**
under the failing account, you'll see `Google poslal: …`. Make sure
the owner adds *that exact string* (Google sometimes returns
`Name.Surname@gmail.com` rather than `name.surname@gmail.com`
depending on how the user registered).

**Push returns 401 immediately after sign-in**
Session cookie not being sent. Check that requests include
`credentials: "include"` (the frontend already does). On localhost,
verify the cookie was set in DevTools → Application → Cookies.

**"Tvůj prohlížeč zatím nenabídl install prompt"**
Cloudflare Pages caches the service worker for a while. If you don't
see an Install button in Chrome's address bar within ~5 min of first
visit, force a hard reload (Ctrl+Shift+R).
