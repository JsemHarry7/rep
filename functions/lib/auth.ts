/* ---------- Session helpers (server-side) ----------
 *
 * Sessions are HMAC-signed JSON blobs stored in HttpOnly cookies.
 *   payload: { sub, email, exp }   (exp = unix ms expiry)
 *   cookie:  base64url(payload).base64url(hmac_sha256(payload, SECRET))
 *
 * No server-side session table — everything verifiable from the cookie
 * + secret. Trade-off: can't revoke individual sessions without rotating
 * the secret. Fine for personal-scale tool.
 */

export interface SessionPayload {
  sub: string;
  email: string;
  exp: number;
}

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
  secret: string,
  ttlMs: number = 30 * 24 * 60 * 60 * 1000,
): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Date.now() + ttlMs };
  const data = JSON.stringify(full);
  const dataB64 = b64UrlEncode(ENCODER.encode(data));
  const sig = await hmacSign(dataB64, secret);
  return `${dataB64}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const [dataB64, sig] = token.split(".");
  if (!dataB64 || !sig) return null;
  const expected = await hmacSign(dataB64, secret);
  // Constant-time-ish compare via length + char check.
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(DECODER.decode(b64UrlDecode(dataB64)));
  } catch {
    return null;
  }
  if (payload.exp < Date.now()) return null;
  return payload;
}

export function getSessionCookie(req: Request): string | null {
  const cookie = req.headers.get("Cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)rep_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function setSessionCookie(token: string, ttlSec: number): string {
  return `rep_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ttlSec}`;
}

export function clearSessionCookie(): string {
  return `rep_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Read + verify session from a request. Returns null if not signed in. */
export async function readSession(
  req: Request,
  secret: string,
): Promise<SessionPayload | null> {
  const token = getSessionCookie(req);
  if (!token) return null;
  return verifySession(token, secret);
}

/* ---------- Crypto primitives ---------- */

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, ENCODER.encode(data));
  return b64UrlEncode(new Uint8Array(sig));
}

function b64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlDecode(b64: string): Uint8Array {
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/* ---------- Allowlist ----------
 *
 * Sources, in order of precedence:
 *   1. OWNER_EMAIL env var — single email, always allowed, can manage
 *      the dynamic allowlist via the admin endpoints.
 *   2. AUTHORIZED_EMAILS env var — comma-separated, static, redeploy
 *      to change. Kept for backwards-compat; new entries should go in
 *      the D1 table instead.
 *   3. allowed_emails D1 table — managed at runtime from the owner's
 *      Settings UI (no redeploy).
 *
 * Any source matching = access granted. Owner alone can manage table.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isOwner(email: string, ownerEmail: string | undefined): boolean {
  if (!ownerEmail) return false;
  return normalizeEmail(email) === normalizeEmail(ownerEmail);
}

function inEnvList(email: string, raw: string | undefined): boolean {
  if (!raw) return false;
  const target = normalizeEmail(email);
  return raw
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean)
    .includes(target);
}

interface AllowEnv {
  DB?: D1Database;
  OWNER_EMAIL?: string;
  AUTHORIZED_EMAILS?: string;
}

export async function isAllowed(email: string, env: AllowEnv): Promise<boolean> {
  if (isOwner(email, env.OWNER_EMAIL)) return true;
  if (inEnvList(email, env.AUTHORIZED_EMAILS)) return true;
  if (!env.DB) return false;
  const row = await env.DB.prepare(
    "SELECT 1 AS hit FROM allowed_emails WHERE email = ? LIMIT 1",
  )
    .bind(normalizeEmail(email))
    .first<{ hit: number }>();
  return !!row;
}

/* ---------- JSON response helpers ---------- */

export function jsonResponse(
  data: unknown,
  init: ResponseInit = {},
): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(
  message: string,
  status: number,
  code?: string,
): Response {
  return jsonResponse({ error: code ?? "error", message }, { status });
}
