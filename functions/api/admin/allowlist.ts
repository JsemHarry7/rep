/* ---------- /api/admin/allowlist ----------
 *
 * Owner-only CRUD on the cloud-sync allowlist. Authentication is the
 * normal session cookie + an isOwner check against OWNER_EMAIL env.
 * No separate admin secret — the same cookie that proves you're
 * signed-in proves you're the owner.
 *
 *   GET     → { emails: [{ email, note, addedAt }, ...] }
 *   POST    body: { email, note? } → { email, note, addedAt }
 *   DELETE  ?email=...             → 204
 *
 * The OWNER_EMAIL itself + anything in AUTHORIZED_EMAILS env var are
 * NOT returned by GET — only the dynamic D1 table. The UI shows the
 * owner separately ("you").
 */

import {
  errorResponse,
  isOwner,
  jsonResponse,
  normalizeEmail,
  readSession,
} from "../../lib/auth";

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
  OWNER_EMAIL?: string;
}

async function requireOwner(
  request: Request,
  env: Env,
): Promise<{ email: string } | Response> {
  if (!env.SESSION_SECRET) {
    return errorResponse("Cloud sync není nakonfigurovaný.", 500, "not_configured");
  }
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return errorResponse("Not signed in.", 401, "no_session");
  if (!isOwner(session.email, env.OWNER_EMAIL)) {
    return errorResponse("Owner only.", 403, "not_owner");
  }
  return { email: session.email };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;

  const result = await env.DB.prepare(
    "SELECT email, note, added_at FROM allowed_emails ORDER BY added_at DESC",
  ).all<{ email: string; note: string | null; added_at: number }>();

  return jsonResponse({
    emails: (result.results ?? []).map((r) => ({
      email: r.email,
      note: r.note,
      addedAt: r.added_at,
    })),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;

  let body: { email?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const rawEmail = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);
  if (!email || !EMAIL_RE.test(email)) {
    return errorResponse("Neplatný formát emailu.", 400, "invalid_email");
  }
  // Block adding the owner email — it's always allowed via env var,
  // adding it to the table is just clutter.
  if (isOwner(email, env.OWNER_EMAIL)) {
    return errorResponse(
      "Owner email je vždy povolený — netřeba ho přidávat zvlášť.",
      400,
      "owner_email",
    );
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : null;
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO allowed_emails (email, note, added_at)
     VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET note = excluded.note`,
  )
    .bind(email, note, now)
    .run();

  return jsonResponse({ email, note, addedAt: now }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;

  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email") ?? "";
  const email = normalizeEmail(rawEmail);
  if (!email) return errorResponse("Missing email param.", 400);

  await env.DB.prepare("DELETE FROM allowed_emails WHERE email = ?")
    .bind(email)
    .run();

  return new Response(null, { status: 204 });
};
