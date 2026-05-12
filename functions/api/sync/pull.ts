/* ---------- GET /api/sync/pull ----------
 *
 * Returns the user's latest stored snapshot (JSON blob) and its
 * updated_at timestamp. Frontend uses this on sign-in to hydrate
 * local state, or manually via "Pull from cloud".
 */

import { errorResponse, jsonResponse, readSession } from "../../lib/auth";

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SESSION_SECRET) {
    return errorResponse("Cloud sync není nakonfigurovaný.", 500, "not_configured");
  }
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return errorResponse("Not signed in.", 401, "no_session");

  const row = await env.DB.prepare(
    "SELECT data_json, updated_at, client_id FROM user_state WHERE user_id = ?",
  )
    .bind(session.sub)
    .first<{ data_json: string; updated_at: number; client_id: string | null }>();

  if (!row) {
    return jsonResponse({ exists: false });
  }

  let data: unknown;
  try {
    data = JSON.parse(row.data_json);
  } catch {
    return errorResponse("Stored data corrupted.", 500, "corrupted");
  }

  return jsonResponse({
    exists: true,
    data,
    updatedAt: row.updated_at,
    clientId: row.client_id,
  });
};
