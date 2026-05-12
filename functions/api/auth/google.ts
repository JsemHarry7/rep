/* ---------- POST /api/auth/google ----------
 *
 * Body: { credential: string }   ← Google ID token (JWT) from GIS button
 *
 * Verifies token with Google's tokeninfo endpoint, checks email against
 * AUTHORIZED_EMAILS, upserts user row, issues session cookie.
 */

import {
  errorResponse,
  isAllowed,
  jsonResponse,
  setSessionCookie,
  signSession,
} from "../../lib/auth";

interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  AUTHORIZED_EMAILS: string;
  SESSION_SECRET: string;
}

interface TokenInfo {
  sub: string;
  email: string;
  email_verified: string | boolean;
  name?: string;
  aud: string;
  exp: string | number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GOOGLE_CLIENT_ID || !env.SESSION_SECRET) {
    return errorResponse(
      "Cloud sync není nakonfigurovaný (chybí GOOGLE_CLIENT_ID nebo SESSION_SECRET).",
      500,
      "not_configured",
    );
  }

  let body: { credential?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  if (!body.credential) {
    return errorResponse("Missing credential.", 400);
  }

  // Verify ID token via Google's tokeninfo endpoint.
  const tokenResp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`,
  );
  if (!tokenResp.ok) {
    return errorResponse("Token rejected by Google.", 401, "invalid_token");
  }
  const info = (await tokenResp.json()) as TokenInfo;

  if (info.aud !== env.GOOGLE_CLIENT_ID) {
    return errorResponse("Token audience mismatch.", 401, "wrong_audience");
  }
  if (info.email_verified !== "true" && info.email_verified !== true) {
    return errorResponse("Email není verified.", 401, "unverified");
  }
  if (!info.email || !info.sub) {
    return errorResponse("Token missing email or sub.", 401);
  }

  const email = info.email.toLowerCase();
  if (!env.AUTHORIZED_EMAILS || !isAllowed(email, env.AUTHORIZED_EMAILS)) {
    return errorResponse(
      "Tvůj email není na allowlistu. Pro přístup ke cloud syncu napiš na kontakt@harrydeiml.ing.",
      403,
      "not_authorized",
    );
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = COALESCE(excluded.name, users.name)`,
  )
    .bind(info.sub, email, info.name ?? null, now)
    .run();

  const ttlMs = 30 * 24 * 60 * 60 * 1000;
  const token = await signSession(
    { sub: info.sub, email },
    env.SESSION_SECRET,
    ttlMs,
  );

  return jsonResponse(
    {
      ok: true,
      user: { id: info.sub, email, name: info.name ?? null },
    },
    {
      headers: {
        "Set-Cookie": setSessionCookie(token, ttlMs / 1000),
      },
    },
  );
};
