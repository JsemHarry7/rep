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
