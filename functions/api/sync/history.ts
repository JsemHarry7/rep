/* ---------- /api/sync/history ----------
 *
 *   GET   → { snapshots: [{savedAt, cardCount, deckCount, clientId}, ...] }
 *         list of archived snapshots for the signed-in user. Newest
 *         first, max 5.
 *
 *   POST  body: { savedAt }   → { ok, restoredAt, snapshot }
 *         restore a specific historical snapshot to be the current
 *         state. Archives the CURRENT state first (so the restore
 *         itself is undo-able), then promotes the chosen history
 *         entry into user_state. Returns the snapshot so the client
 *         can apply it locally too.
 *
 * No metadata column for "label" yet — we just show timestamp + card
 * count. Good enough for "I want to roll back to before my screw-up".
 */

import {
  errorResponse,
  jsonResponse,
  readSession,
} from "../../lib/auth";

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
}

async function requireSession(request: Request, env: Env) {
  if (!env.SESSION_SECRET) {
    return errorResponse("Cloud sync není nakonfigurovaný.", 500, "not_configured");
  }
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return errorResponse("Not signed in.", 401, "no_session");
  return session;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;

  const result = await env.DB.prepare(
    `SELECT saved_at, card_count, deck_count, client_id
     FROM user_state_history
     WHERE user_id = ?
     ORDER BY saved_at DESC
     LIMIT 5`,
  )
    .bind(session.sub)
    .all<{
      saved_at: number;
      card_count: number;
      deck_count: number;
      client_id: string | null;
    }>();

  return jsonResponse({
    snapshots: (result.results ?? []).map((r) => ({
      savedAt: r.saved_at,
      cardCount: r.card_count,
      deckCount: r.deck_count,
      clientId: r.client_id,
    })),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;

  let body: { savedAt?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  const savedAt = typeof body.savedAt === "number" ? body.savedAt : NaN;
  if (!Number.isFinite(savedAt)) {
    return errorResponse("Missing savedAt.", 400);
  }

  const snap = await env.DB.prepare(
    "SELECT data_json, card_count, deck_count FROM user_state_history WHERE user_id = ? AND saved_at = ?",
  )
    .bind(session.sub, savedAt)
    .first<{ data_json: string; card_count: number; deck_count: number }>();

  if (!snap) {
    return errorResponse("Snapshot nenalezen.", 404, "not_found");
  }

  const now = Date.now();

  // Archive the CURRENT state before overwriting — so the restore
  // itself can be undone. Same flow as push.ts.
  const current = await env.DB.prepare(
    "SELECT data_json, client_id FROM user_state WHERE user_id = ?",
  )
    .bind(session.sub)
    .first<{ data_json: string; client_id: string | null }>();

  if (current) {
    try {
      const data = JSON.parse(current.data_json) as {
        userCards?: unknown[];
        userDecks?: unknown[];
      };
      const cardCount = Array.isArray(data.userCards) ? data.userCards.length : 0;
      const deckCount = Array.isArray(data.userDecks) ? data.userDecks.length : 0;
      await env.DB.prepare(
        `INSERT INTO user_state_history (user_id, saved_at, data_json, card_count, deck_count, client_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(session.sub, now - 1, current.data_json, cardCount, deckCount, current.client_id)
        .run();
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
      /* swallow */
    }
  }

  // Promote the chosen snapshot into the live state.
  await env.DB.prepare(
    `INSERT INTO user_state (user_id, data_json, updated_at, client_id)
     VALUES (?, ?, ?, 'restore')
     ON CONFLICT(user_id) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at,
       client_id = excluded.client_id`,
  )
    .bind(session.sub, snap.data_json, now)
    .run();

  await env.DB.prepare("UPDATE users SET last_sync_at = ? WHERE id = ?")
    .bind(now, session.sub)
    .run();

  return jsonResponse({
    ok: true,
    restoredAt: now,
    cardCount: snap.card_count,
    deckCount: snap.deck_count,
    data: JSON.parse(snap.data_json) as unknown,
  });
};
