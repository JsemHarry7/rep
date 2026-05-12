/* ---------- Allowlist API client ----------
 *
 * Tiny wrapper around /api/admin/allowlist. Owner-only; backend
 * enforces — we don't pre-check here, we just surface server errors.
 */

export interface AllowedEmail {
  email: string;
  note: string | null;
  addedAt: number;
}

interface ApiError {
  ok: false;
  status: number;
  message: string;
  code?: string;
}

interface ApiOk<T> {
  ok: true;
  data: T;
}

export type ApiResult<T> = ApiOk<T> | ApiError;

async function readError(resp: Response): Promise<ApiError> {
  const body = (await resp.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return {
    ok: false,
    status: resp.status,
    message: body.message ?? `Request failed (${resp.status})`,
    code: body.error,
  };
}

export async function listAllowed(): Promise<ApiResult<AllowedEmail[]>> {
  try {
    const resp = await fetch("/api/admin/allowlist", { credentials: "include" });
    if (!resp.ok) return await readError(resp);
    const body = (await resp.json()) as { emails: AllowedEmail[] };
    return { ok: true, data: body.emails };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}

export async function addAllowed(
  email: string,
  note?: string,
): Promise<ApiResult<AllowedEmail>> {
  try {
    const resp = await fetch("/api/admin/allowlist", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, note: note?.trim() || undefined }),
    });
    if (!resp.ok) return await readError(resp);
    return { ok: true, data: (await resp.json()) as AllowedEmail };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}

export async function removeAllowed(email: string): Promise<ApiResult<true>> {
  try {
    const resp = await fetch(
      `/api/admin/allowlist?email=${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!resp.ok) return await readError(resp);
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}
