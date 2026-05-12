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
| `AUTHORIZED_EMAILS` | `kontakt@harrydeiml.ing,someone@example.com` (comma-separated, lowercase, no spaces) |
| `SESSION_SECRET` | (random 32+ byte hex string — see below) |
| `NODE_VERSION` | `22` |

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
echo "AUTHORIZED_EMAILS=..." >> .dev.vars
echo "SESSION_SECRET=..." >> .dev.vars

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

## Adding a new authorized user

Edit `AUTHORIZED_EMAILS` in the Pages env vars, save, redeploy. The
new email can sign in within a few minutes.

To revoke: remove the email and redeploy. Existing sessions stay valid
until they expire (30 days) — to revoke immediately, rotate
`SESSION_SECRET`.

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
Email isn't in `AUTHORIZED_EMAILS`. Add it (lowercase, no spaces) and
redeploy.

**Push returns 401 immediately after sign-in**
Session cookie not being sent. Check that requests include
`credentials: "include"` (the frontend already does). On localhost,
verify the cookie was set in DevTools → Application → Cookies.

**"Tvůj prohlížeč zatím nenabídl install prompt"**
Cloudflare Pages caches the service worker for a while. If you don't
see an Install button in Chrome's address bar within ~5 min of first
visit, force a hard reload (Ctrl+Shift+R).
