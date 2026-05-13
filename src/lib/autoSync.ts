/* ---------- Auto-sync ----------
 *
 * Sits on top of sync.ts and adds two things:
 *
 *   1. Debounced auto-push  — any store mutation while signed-in
 *      schedules a push (3s idle), so edits propagate to other
 *      devices without the user clicking anything.
 *
 *   2. Smart auto-pull on init  — when the user is confirmed
 *      signed-in (cookie still valid from a previous session), we
 *      pull the cloud snapshot IFF the local store has no pending
 *      unpushed edits. If it does, we push first to avoid clobbering
 *      offline work; the next pull happens on the next sign-in.
 *
 * The "dirty" flag lives in localStorage so it survives a page reload
 * — otherwise a refresh would lose the only signal that local has
 * un-synced changes and the next pull would silently overwrite them.
 *
 * What this does NOT solve:
 *   • Concurrent edits on two devices both online — last write wins
 *     at the snapshot level (whole-store overwrite). For this app's
 *     usage pattern (one user, one device at a time) that's fine.
 *   • Real-time multi-device updates — there's no push channel; other
 *     devices see your changes on their next pull / next sign-in /
 *     next app launch.
 */

import { create } from "zustand";
import { useAppStore } from "@/lib/store";
import { useCloudAuth } from "@/lib/cloudAuth";
import {
  fetchCloudMeta,
  isApplyingRemote,
  pullFromCloud,
  pushToCloud,
} from "@/lib/sync";

const DIRTY_KEY = "rep:sync:dirty";
const DEBOUNCE_MS = 3000;

/* ---------- Observable status (for UI indicators) ---------- */
export type SyncPhase = "idle" | "pending" | "syncing" | "offline" | "error";

interface SyncStatusState {
  phase: SyncPhase;
  lastSyncedAt: number | null;
  lastError: string | null;
}

export const useSyncStatus = create<SyncStatusState>(() => ({
  phase: "idle",
  lastSyncedAt: null,
  lastError: null,
}));

function setPhase(phase: SyncPhase, patch: Partial<SyncStatusState> = {}): void {
  useSyncStatus.setState({ phase, ...patch });
}

let debounceTimer: number | null = null;
let inflightPush: Promise<unknown> | null = null;
let pendingChange = false;
let started = false;

/* ---------- Dirty flag (localStorage) ---------- */

function markDirty(): void {
  try {
    localStorage.setItem(DIRTY_KEY, "1");
  } catch {
    /* localStorage disabled — autosync still works in-session */
  }
}

function markClean(): void {
  try {
    localStorage.setItem(DIRTY_KEY, "0");
  } catch {
    /* swallow */
  }
}

function isDirty(): boolean {
  try {
    return localStorage.getItem(DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}

/* ---------- Push scheduling ---------- */

function schedulePush(): void {
  if (debounceTimer != null) window.clearTimeout(debounceTimer);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setPhase("offline");
    return;
  }
  setPhase("pending");
  debounceTimer = window.setTimeout(doPush, DEBOUNCE_MS);
}

async function doPush(): Promise<void> {
  debounceTimer = null;

  const auth = useCloudAuth.getState();
  if (auth.status !== "signed-in") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setPhase("offline");
    return;
  }

  if (inflightPush) {
    // Another push is running; mark that more changes happened so we
    // can fire a fresh push when it finishes.
    pendingChange = true;
    return;
  }

  pendingChange = false;

  /* ----- Lossy-push guard (auto-push only) -----
   * The manual push button shows an interactive confirm when cloud
   * has more cards than local. Auto-sync can't ask the user — it's
   * silent — but the catastrophic case (fresh device, local = 0, cloud
   * = whole library) is unambiguous: never auto-push 0 cards over a
   * populated cloud. Server-side history is still the ultimate
   * safety net for the gray-zone cases (partial deletes, etc.). */
  const localCards = useAppStore.getState().userCards.length;
  if (localCards === 0) {
    const cloudMeta = await fetchCloudMeta();
    if (cloudMeta && cloudMeta.cardCount > 0) {
      setPhase("error", {
        lastError:
          `Auto-sync zastaven: lokál 0 karet, cloud ${cloudMeta.cardCount}. ` +
          "Stáhni cloud v Settings → ↓ Stáhnout, nebo obnov z Cloud záloh.",
      });
      // Leave dirty flag set — next legitimate change will retry.
      return;
    }
  }

  setPhase("syncing");
  const promise = pushToCloud();
  inflightPush = promise;
  const r = await promise;
  inflightPush = null;

  if (r.ok) {
    markClean();
    setPhase("idle", { lastSyncedAt: r.updatedAt ?? Date.now(), lastError: null });
  } else {
    setPhase("error", { lastError: r.message ?? "Sync se nezdařil." });
  }

  if (pendingChange) {
    pendingChange = false;
    schedulePush();
  }
}

/* ---------- Initial sync on sign-in ---------- */

async function initialSync(): Promise<void> {
  const auth = useCloudAuth.getState();
  if (auth.status !== "signed-in") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  // Fresh-device override: if local has zero cards AND cloud has
  // anything at all, pull unconditionally — this is the
  // "I just signed in on a new phone" case. We were previously
  // gating on isDirty(), but the dirty flag can get falsely set by
  // routine startup actions (onboarding name prompt, theme toggle,
  // first store hydration). Trusting cardCount=0 is far more
  // reliable as the "fresh device" signal.
  const localCards = useAppStore.getState().userCards.length;
  if (localCards === 0) {
    const meta = await fetchCloudMeta();
    if (meta && meta.cardCount > 0) {
      setPhase("syncing");
      const r = await pullFromCloud();
      if (r.ok) {
        markClean();
        setPhase("idle", { lastSyncedAt: r.updatedAt ?? Date.now(), lastError: null });
      } else {
        setPhase("error", { lastError: r.message ?? "Pull selhal." });
      }
      return;
    }
  }

  if (isDirty()) {
    // Local has unpushed edits AND local is non-empty. Push first —
    // the lossy-push guard inside doPush() still catches accidental
    // wipes.
    await doPush();
    return;
  }

  // Local is clean — safe to pull whatever's on the cloud (might be
  // newer because of another device).
  setPhase("syncing");
  const r = await pullFromCloud();
  if (r.ok) {
    markClean();
    setPhase("idle", { lastSyncedAt: r.updatedAt ?? Date.now(), lastError: null });
  } else {
    // "nothing in cloud" is the common case for first device — not an
    // error worth showing.
    setPhase("idle");
  }
}

/* ---------- Bootstrap ---------- */

export function startAutoSync(): void {
  if (started) return;
  started = true;

  /* (1) Watch store mutations → mark dirty + schedule push. */
  useAppStore.subscribe((state, prev) => {
    if (state === prev) return;
    if (isApplyingRemote()) return; // pull-driven update, not a user edit
    markDirty();
    schedulePush();
  });

  /* (2) Watch auth → first time we see "signed-in", run the smart
   *     initial sync. Also handle the case where the user is already
   *     signed-in on app start (persistent cookie from last session). */
  let prevStatus = useCloudAuth.getState().status;
  if (prevStatus === "signed-in") {
    void initialSync();
  }
  useCloudAuth.subscribe((s) => {
    if (s.status === "signed-in" && prevStatus !== "signed-in") {
      void initialSync();
    }
    prevStatus = s.status;
  });

  /* (3) Best-effort push on tab close — only fires if we have a
   *     pending debounce. Uses sendBeacon when available; falls back
   *     to a fire-and-forget fetch. Don't await; the browser may
   *     terminate us regardless. */
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      if (debounceTimer == null) return;
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
      const auth = useCloudAuth.getState();
      if (auth.status !== "signed-in") return;
      const data = takeSnapshotForBeacon();
      try {
        const body = JSON.stringify({ data, clientId: "beacon" });
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon?.("/api/sync/push", blob);
      } catch {
        /* nothing else we can do here */
      }
    });

    /* (4) Come back online → try to flush any pending push. */
    window.addEventListener("online", () => {
      if (isDirty()) schedulePush();
    });
  }
}

/* Lightweight snapshot for the beacon path — same shape as
 * sync.ts#takeSnapshot but kept local to avoid widening the public
 * surface of sync.ts. */
function takeSnapshotForBeacon() {
  const s = useAppStore.getState();
  return {
    reviews: s.reviews,
    userDecks: s.userDecks,
    userCards: s.userCards,
    srsState: s.srsState,
    user: s.user,
    deadlines: s.deadlines,
    collections: s.collections,
    shareLinks: s.shareLinks,
  };
}
