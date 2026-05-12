/* ---------- /api/share ----------
 *
 *   POST  body: { deckMd, title, cardCount }   → { id, url }
 *         create a new short-URL share. Requires a valid session
 *         (cloud user — anyone on the allowlist). Caller already
 *         passed the auth gate to get here.
 *
 *   GET                                         → { shares: [{id, title, cardCount, createdAt, views}, ...] }
 *         list current user's own shares. Used by the Settings page.
 *
 * 8-char base36 id ≈ 48 bits of entropy. Collision probability on
 * millions of shares is in the 10⁻⁵ ballpark; INSERT will fail on
 * conflict and we retry up to 3 times.
 */

import { errorResponse, jsonResponse, readSession } from "../../lib/auth";

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
}

const MAX_DECK_BYTES = 256 * 1024; // 256 KB — generous; D1 row limit is ~1 MB

function generateShareId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  return n.toString(36).padStart(8, "0").slice(-8);
}

async function requireSession(request: Request, env: Env) {
  if (!env.SESSION_SECRET) {
    return errorResponse("Cloud sync není nakonfigurovaný.", 500, "not_configured");
  }
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return errorResponse("Not signed in.", 401, "no_session");
  return session;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;

  let body: { deckMd?: string; title?: string; cardCount?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const deckMd = typeof body.deckMd === "string" ? body.deckMd : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const cardCount = typeof body.cardCount === "number" ? body.cardCount : 0;

  if (!deckMd || !title) {
    return errorResponse("Missing deckMd or title.", 400);
  }
  if (new TextEncoder().encode(deckMd).byteLength > MAX_DECK_BYTES) {
    return errorResponse(
      `Deck je moc velký (limit ${MAX_DECK_BYTES / 1024} KB).`,
      413,
      "too_large",
    );
  }

  const now = Date.now();
  let id = "";
  let inserted = false;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    id = generateShareId();
    try {
      await env.DB.prepare(
        `INSERT INTO shared_decks (id, owner_id, title, card_count, deck_md, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, session.sub, title.slice(0, 200), cardCount, deckMd, now)
        .run();
      inserted = true;
    } catch (e) {
      // SQLITE_CONSTRAINT on PK collision → retry with a fresh id.
      if (!/UNIQUE|constraint/i.test(String(e))) throw e;
    }
  }
  if (!inserted) {
    return errorResponse("Nepodařilo se vytvořit share (collision).", 500);
  }

  const url = new URL(request.url);
  return jsonResponse(
    {
      id,
      url: `${url.origin}/s/${id}`,
      createdAt: now,
    },
    { status: 201 },
  );
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;

  const result = await env.DB.prepare(
    `SELECT id, title, card_count, created_at, views
     FROM shared_decks
     WHERE owner_id = ?
     ORDER BY created_at DESC`,
  )
    .bind(session.sub)
    .all<{
      id: string;
      title: string;
      card_count: number;
      created_at: number;
      views: number;
    }>();

  return jsonResponse({
    shares: (result.results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      cardCount: r.card_count,
      createdAt: r.created_at,
      views: r.views,
    })),
  });
};
