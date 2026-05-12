/* ---------- POST /api/sync/push ----------
 *
 * Body: { data: <full Zustand snapshot>, clientId?: string }
 *
 * Replaces the user's stored snapshot with the posted one.
 * Last-write-wins by updated_at. No merging or CRDTs; if a future
 * iteration needs multi-device merge, this endpoint is where logic
 * lives.
 *
 * Size limit: D1 row size is fine up to MBs; we cap at 5 MB JSON to
 * avoid runaway uploads.
 */

import { errorResponse, jsonResponse, readSession } from "../../lib/auth";

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
}

const MAX_BODY_BYTES = 5 * 1024 * 1024;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SESSION_SECRET) {
    return errorResponse("Cloud sync není nakonfigurovaný.", 500, "not_configured");
  }
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return errorResponse("Not signed in.", 401, "no_session");

  const contentLengthHdr = request.headers.get("Content-Length");
  if (contentLengthHdr && parseInt(contentLengthHdr) > MAX_BODY_BYTES) {
    return errorResponse(
      `Záloha je větší než ${MAX_BODY_BYTES / 1024 / 1024}MB.`,
      413,
      "too_large",
    );
  }

  let body: { data?: unknown; clientId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  if (typeof body.data !== "object" || body.data === null) {
    return errorResponse("Missing or invalid `data` field.", 400);
  }

  const json = JSON.stringify(body.data);
  if (json.length > MAX_BODY_BYTES) {
    return errorResponse("Záloha je moc velká.", 413, "too_large");
  }

  const now = Date.now();
  const clientId = typeof body.clientId === "string" ? body.clientId.slice(0, 64) : null;

  /* ----- Archive current snapshot to history BEFORE overwriting -----
   *
   * The recovery path for "oops I pushed nothing over my full cloud"
   * lives in user_state_history. We grab whatever's currently in
   * user_state, copy it to history with a quick card/deck count
   * (derived from JSON so the restore UI can show "247 cards" without
   * re-parsing the blob), then prune to the last 5 snapshots per user.
   *
   * Pruning is the simplest LRU — keep most-recent 5 by saved_at.
   * If pruning fails we silently continue; data loss in history is
   * preferable to failing the user's push. */
  const previous = await env.DB.prepare(
    "SELECT data_json, client_id FROM user_state WHERE user_id = ?",
  )
    .bind(session.sub)
    .first<{ data_json: string; client_id: string | null }>();

  if (previous) {
    try {
      const prevData = JSON.parse(previous.data_json) as {
        userCards?: unknown[];
        userDecks?: unknown[];
      };
      const cardCount = Array.isArray(prevData.userCards)
        ? prevData.userCards.length
        : 0;
      const deckCount = Array.isArray(prevData.userDecks)
        ? prevData.userDecks.length
        : 0;
      await env.DB.prepare(
        `INSERT INTO user_state_history (user_id, saved_at, data_json, card_count, deck_count, client_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          session.sub,
          now - 1, // 1ms before "now" so it sorts strictly before the upcoming write
          previous.data_json,
          cardCount,
          deckCount,
          previous.client_id,
        )
        .run();
      // Prune to last 5 snapshots.
      await env.DB.prepare(
        `DELETE FROM user_state_history
         WHERE user_id = ?
           AND saved_at NOT IN (
             SELECT saved_at FROM user_state_history
             WHERE user_id = ?
             ORDER BY saved_at DESC
             LIMIT 5
           )`,
      )
        .bind(session.sub, session.sub)
        .run();
    } catch {
      // If anything in the archive path throws (malformed JSON,
      // constraint violation), keep going — losing a history entry
      // is not worth failing the actual push.
    }
  }

  await env.DB.prepare(
    `INSERT INTO user_state (user_id, data_json, updated_at, client_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at,
       client_id = excluded.client_id`,
  )
    .bind(session.sub, json, now, clientId)
    .run();

  await env.DB.prepare(
    "UPDATE users SET last_sync_at = ? WHERE id = ?",
  )
    .bind(now, session.sub)
    .run();

  return jsonResponse({ ok: true, updatedAt: now });
};
