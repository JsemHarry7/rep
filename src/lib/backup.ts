/* ---------- Local backup ----------
 *
 * Export everything in the Zustand store to a JSON file the user can
 * download. Import reads the file back and replaces store state.
 *
 * Format is versioned so we can migrate later. v1 mirrors current store
 * shape (minus the transient `tourOpen` field, which doesn't persist).
 */

import { useAppStore } from "@/lib/store";

const FORMAT_VERSION = 1;

export interface BackupBlob {
  format: "rep-backup";
  version: number;
  exportedAt: string;
  data: {
    reviews: unknown[];
    userDecks: unknown[];
    userCards: unknown[];
    srsState: unknown;
    user: unknown;
    deadlines: unknown[];
  };
}

export function exportBackup(): BackupBlob {
  const s = useAppStore.getState();
  return {
    format: "rep-backup",
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      reviews: s.reviews,
      userDecks: s.userDecks,
      userCards: s.userCards,
      srsState: s.srsState,
      user: s.user,
      deadlines: s.deadlines,
    },
  };
}

export function downloadBackup() {
  const blob = exportBackup();
  const filename = `rep-backup-${blob.exportedAt.slice(0, 10)}.json`;
  const file = new Blob([JSON.stringify(blob, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  message: string;
  counts?: {
    reviews: number;
    userDecks: number;
    userCards: number;
    deadlines: number;
  };
}

/** Replace store state with backup contents. Returns result info. */
export function importBackup(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Soubor není platný JSON." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "Neplatný formát zálohy." };
  }
  const blob = parsed as Partial<BackupBlob>;
  if (blob.format !== "rep-backup") {
    return {
      ok: false,
      message: "Soubor není rep záloha (chybí `format: rep-backup`).",
    };
  }
  if (!blob.data || typeof blob.data !== "object") {
    return { ok: false, message: "Záloha neobsahuje pole `data`." };
  }
  const d = blob.data as BackupBlob["data"];

  const store = useAppStore.getState();
  useAppStore.setState({
    reviews: Array.isArray(d.reviews) ? (d.reviews as typeof store.reviews) : [],
    userDecks: Array.isArray(d.userDecks)
      ? (d.userDecks as typeof store.userDecks)
      : [],
    userCards: Array.isArray(d.userCards)
      ? (d.userCards as typeof store.userCards)
      : [],
    srsState: (d.srsState ?? {}) as typeof store.srsState,
    user: { ...store.user, ...(d.user ?? {}) } as typeof store.user,
    deadlines: Array.isArray(d.deadlines)
      ? (d.deadlines as typeof store.deadlines)
      : store.deadlines,
  });

  return {
    ok: true,
    message: "Záloha načtena.",
    counts: {
      reviews: Array.isArray(d.reviews) ? d.reviews.length : 0,
      userDecks: Array.isArray(d.userDecks) ? d.userDecks.length : 0,
      userCards: Array.isArray(d.userCards) ? d.userCards.length : 0,
      deadlines: Array.isArray(d.deadlines) ? d.deadlines.length : 0,
    },
  };
}
