/* ---------- Sync (frontend) ----------
 *
 * Pull/push the full Zustand store snapshot to/from the backend. No
 * field-level merging — last-write-wins by user action.
 *
 * The whole UserState (displayName, dailyGoal, tourSeen, landingSeen,
 * streak, xp, level, ...) is part of the snapshot, so those fields
 * propagate across devices the moment a sync round completes.
 *
 * Manual push/pull buttons in Settings remain the foolproof entry
 * point; autoSync.ts adds a debounced auto-push on top for the common
 * "I just want my edits to show up on my other device" case.
 */

import { useAppStore } from "@/lib/store";
import { useCloudAuth } from "@/lib/cloudAuth";
import type {
  Card,
  Deadline,
  Deck,
  Review,
  SrsState,
  UserState,
} from "@/types";

interface Snapshot {
  reviews: Review[];
  userDecks: Deck[];
  userCards: Card[];
  srsState: Record<string, SrsState>;
  user: UserState;
  deadlines: Deadline[];
}

export interface SyncResult {
  ok: boolean;
  message?: string;
  updatedAt?: number;
}

/* ---------- Apply-remote guard ----------
 * applySnapshot() temporarily flips this so the auto-sync subscriber
 * can skip the resulting store changes — otherwise pulling from cloud
 * would immediately re-push the same data. */
let applyingRemote = false;
export function isApplyingRemote(): boolean {
  return applyingRemote;
}

function takeSnapshot(): Snapshot {
  const s = useAppStore.getState();
  return {
    reviews: s.reviews,
    userDecks: s.userDecks,
    userCards: s.userCards,
    srsState: s.srsState,
    user: s.user,
    deadlines: s.deadlines,
  };
}

function applySnapshot(snap: Partial<Snapshot>) {
  applyingRemote = true;
  try {
    const cur = useAppStore.getState();
    useAppStore.setState({
      reviews: snap.reviews ?? [],
      userDecks: snap.userDecks ?? [],
      userCards: snap.userCards ?? [],
      srsState: snap.srsState ?? {},
      user: { ...cur.user, ...(snap.user ?? {}) },
      deadlines: snap.deadlines ?? [],
    });
  } finally {
    applyingRemote = false;
  }
}

export async function pushToCloud(): Promise<SyncResult> {
  const data = takeSnapshot();
  const clientId = navigator.userAgent.slice(0, 64);
  try {
    const resp = await fetch("/api/sync/push", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, clientId }),
    });
    const body = await resp.json().catch(() => ({}) as Record<string, unknown>);
    if (!resp.ok) {
      return {
        ok: false,
        message: (body.message as string) ?? `Push failed (${resp.status})`,
      };
    }
    // Mirror lastSyncAt onto the cloud user state.
    const updatedAt = (body.updatedAt as number | undefined) ?? Date.now();
    useCloudAuth.setState((s) =>
      s.user ? { user: { ...s.user, lastSyncAt: updatedAt } } : s,
    );
    return { ok: true, updatedAt };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

export async function pullFromCloud(): Promise<SyncResult> {
  try {
    const resp = await fetch("/api/sync/pull", { credentials: "include" });
    const body = await resp.json().catch(() => ({}) as Record<string, unknown>);
    if (!resp.ok) {
      return {
        ok: false,
        message: (body.message as string) ?? `Pull failed (${resp.status})`,
      };
    }
    if (body.exists === false) {
      return { ok: false, message: "V cloudu zatím nic není." };
    }
    applySnapshot(body.data as Partial<Snapshot>);
    const updatedAt = (body.updatedAt as number | undefined) ?? Date.now();
    useCloudAuth.setState((s) =>
      s.user ? { user: { ...s.user, lastSyncAt: updatedAt } } : s,
    );
    return { ok: true, updatedAt };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
