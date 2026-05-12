/* ---------- POST /api/auth/signout ----------
 *
 * Clears the session cookie. Stateless on the server side (no session
 * table to delete from), so this is just a cookie-expiry response.
 */

import { clearSessionCookie, jsonResponse } from "../../lib/auth";

export const onRequestPost: PagesFunction = async () => {
  return jsonResponse(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    },
  );
};
