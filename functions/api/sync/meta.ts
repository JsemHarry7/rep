/* ---------- GET /api/sync/meta ----------
 *
 * Cheap metadata-only fetch: counts + timestamp, no JSON blob.
 * The CloudSync UI calls this so it can show "lokálně 247 · cloud 247"
 * before the user clicks a sync button — a visible signal that the
 * upcoming push would be lossy.
 *
 * Computing card/deck count here means parsing the data_json server-
 * side once per request. Cheap relative to network. Avoids shipping
 * the full snapshot just to count entries.
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
    return jsonResponse({
      exists: false,
      cardCount: 0,
      deckCount: 0,
      updatedAt: null,
      clientId: null,
    });
  }

  let cardCount = 0;
  let deckCount = 0;
  try {
    const data = JSON.parse(row.data_json) as {
      userCards?: unknown[];
      userDecks?: unknown[];
    };
    if (Array.isArray(data.userCards)) cardCount = data.userCards.length;
    if (Array.isArray(data.userDecks)) deckCount = data.userDecks.length;
  } catch {
    /* corrupted blob — leave zeros */
  }

  return jsonResponse({
    exists: true,
    cardCount,
    deckCount,
    updatedAt: row.updated_at,
    clientId: row.client_id,
  });
};
