/* ---------- Cloud auth (frontend) ----------
 *
 * Tracks Google sign-in state and talks to /api/auth/*. Backend issues
 * an HttpOnly session cookie; this store just mirrors the user info
 * returned by /api/auth/me + /api/auth/google.
 *
 * Status state machine:
 *   unknown        haven't checked yet
 *   loading        request in flight
 *   signed-out     no session (or signed out)
 *   signed-in      session valid, on allowlist
 *   not-authorized signed in but email not on allowlist
 *   not-configured backend has no GOOGLE_CLIENT_ID/SESSION_SECRET
 *   error          network/parse error
 */

import { create } from "zustand";

export interface CloudUser {
  id: string;
  email: string;
  name: string | null;
  lastSyncAt: number | null;
  /** Set by /api/auth/me — true iff signed-in email matches OWNER_EMAIL
   *  env var on the backend. Owner sees the allowlist manager UI. */
  isOwner: boolean;
}

/** Email that was rejected during the last sign-in attempt, if the
 *  status flipped to `not-authorized`. Surfaced in the UI so the user
 *  can see exactly what Google sent and ask the owner to add it. */
let lastRejectedEmail: string | null = null;
export function getLastRejectedEmail(): string | null {
  return lastRejectedEmail;
}

export type AuthStatus =
  | "unknown"
  | "loading"
  | "signed-out"
  | "signed-in"
  | "not-authorized"
  | "not-configured"
  | "error";

interface AuthState {
  user: CloudUser | null;
  status: AuthStatus;
  errorMessage: string | null;
  init: () => Promise<void>;
  signIn: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useCloudAuth = create<AuthState>((set) => ({
  user: null,
  status: "unknown",
  errorMessage: null,

  async init() {
    set({ status: "loading", errorMessage: null });
    try {
      const resp = await fetch("/api/auth/me", { credentials: "include" });
      if (resp.ok) {
        const { user } = (await resp.json()) as { user: CloudUser };
        set({ user, status: "signed-in" });
      } else if (resp.status === 401) {
        set({ user: null, status: "signed-out" });
      } else if (resp.status === 500) {
        const body = await resp.json().catch(() => ({}));
        if (body.error === "not_configured") {
          set({ status: "not-configured" });
        } else {
          set({ status: "error", errorMessage: body.message ?? "Server error" });
        }
      } else {
        set({ status: "error", errorMessage: `Unexpected status ${resp.status}` });
      }
    } catch (e) {
      set({ status: "error", errorMessage: String(e) });
    }
  },

  async signIn(credential) {
    set({ status: "loading", errorMessage: null });
    try {
      const resp = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await resp.json().catch(() => ({}) as Record<string, unknown>);
      if (resp.ok) {
        lastRejectedEmail = null;
        set({ user: data.user as CloudUser, status: "signed-in" });
      } else if (resp.status === 403) {
        lastRejectedEmail = typeof data.email === "string" ? data.email : null;
        set({
          user: null,
          status: "not-authorized",
          errorMessage:
            (data.message as string) ??
            "Tvůj email není na allowlistu.",
        });
      } else if (resp.status === 500 && data.error === "not_configured") {
        set({ status: "not-configured" });
      } else {
        set({
          status: "error",
          errorMessage:
            (data.message as string) ?? `Sign-in failed (${resp.status})`,
        });
      }
    } catch (e) {
      set({ status: "error", errorMessage: String(e) });
    }
  },

  async signOut() {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore — even if it fails, clear local state
    }
    set({ user: null, status: "signed-out", errorMessage: null });
  },

  clearError() {
    set({ errorMessage: null });
  },
}));
