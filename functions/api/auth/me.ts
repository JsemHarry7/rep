/* ---------- GET /api/auth/me ----------
 *
 * Returns the currently signed-in user (from session cookie) or 401.
 * Frontend calls this on app load to detect existing session.
 */

import { errorResponse, isOwner, jsonResponse, readSession } from "../../lib/auth";

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
  OWNER_EMAIL?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SESSION_SECRET) {
    return errorResponse("Cloud sync není nakonfigurovaný.", 500, "not_configured");
  }
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return errorResponse("Not signed in.", 401, "no_session");

  const row = await env.DB.prepare(
    "SELECT id, email, name, last_sync_at FROM users WHERE id = ?",
  )
    .bind(session.sub)
    .first<{ id: string; email: string; name: string | null; last_sync_at: number | null }>();

  if (!row) return errorResponse("User not found.", 401, "no_user");

  return jsonResponse({
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      lastSyncAt: row.last_sync_at,
      isOwner: isOwner(row.email, env.OWNER_EMAIL),
    },
  });
};
