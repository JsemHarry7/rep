/* ---------- Sync (frontend) ----------
 *
 * Pull/push the full Zustand store snapshot to/from the backend. No
 * field-level merging — last-write-wins by user action. The Cloud Sync
 * UI in Settings is the only entry point; auto-sync is intentionally
 * NOT wired up (yet) to avoid surprise conflicts on multi-device use.
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
  const cur = useAppStore.getState();
  useAppStore.setState({
    reviews: snap.reviews ?? [],
    userDecks: snap.userDecks ?? [],
    userCards: snap.userCards ?? [],
    srsState: snap.srsState ?? {},
    user: { ...cur.user, ...(snap.user ?? {}) },
    deadlines: snap.deadlines ?? [],
  });
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
