/* ---------- /api/share/:id ----------
 *
 *   GET                                  → { id, title, cardCount, deckMd, createdAt, views }
 *         Public — anyone with the link can fetch the deck content.
 *         Bumps the view counter. No auth required.
 *
 *   DELETE                               → 204
 *         Owner-only revoke. Requires session matching the share's
 *         owner_id.
 *
 * No GET-side auth on purpose — the whole point of the short link is
 * to share with people who don't have cloud accounts. The 8-char
 * random id is the unguessable token.
 */

import { errorResponse, jsonResponse, readSession } from "../../lib/auth";

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = typeof params.id === "string" ? params.id : "";
  if (!id || !/^[a-z0-9]{4,16}$/.test(id)) {
    return errorResponse("Neplatné ID share linku.", 400, "invalid_id");
  }

  const row = await env.DB.prepare(
    `SELECT id, title, card_count, deck_md, created_at, views
     FROM shared_decks
     WHERE id = ?`,
  )
    .bind(id)
    .first<{
      id: string;
      title: string;
      card_count: number;
      deck_md: string;
      created_at: number;
      views: number;
    }>();

  if (!row) {
    return errorResponse(
      "Sdílený deck nebyl nalezen — buď nikdy neexistoval, nebo byl revoknutý.",
      404,
      "not_found",
    );
  }

  // Best-effort view counter bump. Don't fail the request if it errors.
  try {
    await env.DB.prepare(
      "UPDATE shared_decks SET views = views + 1 WHERE id = ?",
    )
      .bind(id)
      .run();
  } catch {
    /* swallow */
  }

  return jsonResponse({
    id: row.id,
    title: row.title,
    cardCount: row.card_count,
    deckMd: row.deck_md,
    createdAt: row.created_at,
    views: row.views + 1,
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({
  request,
  env,
  params,
}) => {
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) return errorResponse("Missing id.", 400);

  if (!env.SESSION_SECRET) {
    return errorResponse("Cloud sync není nakonfigurovaný.", 500, "not_configured");
  }
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return errorResponse("Not signed in.", 401, "no_session");

  // Only the owner can delete. Use a WHERE clause that scopes by owner
  // so the response is identical whether the row doesn't exist or
  // belongs to someone else — don't leak existence to non-owners.
  const result = await env.DB.prepare(
    "DELETE FROM shared_decks WHERE id = ? AND owner_id = ?",
  )
    .bind(id, session.sub)
    .run();

  // D1 doesn't always populate `changes` on success — we treat any
  // non-error as success and return 204.
  void result;
  return new Response(null, { status: 204 });
};
