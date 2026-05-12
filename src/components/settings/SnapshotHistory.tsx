/* ---------- SnapshotHistory ----------
 *
 * Settings card listing the last 5 cloud snapshots. Each push and
 * each restore archives the prior state — the user can click
 * "obnovit" to roll back. Real safety net for "I clicked Push by
 * accident" scenarios.
 *
 * Restore replaces both the cloud state AND the local store (the
 * server returns the snapshot data, lib/sync.ts applies it locally).
 * Auto-sync is suppressed during apply via the same flag used by pull.
 */

import { useEffect, useState } from "react";
import {
  listHistory,
  restoreHistory,
  type CloudHistoryEntry,
} from "@/lib/sync";
import { useCloudAuth } from "@/lib/cloudAuth";
import { Button } from "@/components/ui/Button";

export function SnapshotHistory() {
  const status = useCloudAuth((s) => s.status);
  const [items, setItems] = useState<CloudHistoryEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "signed-in") return;
    void reload();
  }, [status]);

  if (status !== "signed-in") return null;

  async function reload() {
    setBusy(true);
    const r = await listHistory();
    setBusy(false);
    if (r === null) {
      setError("Nepodařilo se načíst zálohy.");
    } else {
      setError(null);
      setItems(r);
    }
  }

  async function handleRestore(entry: CloudHistoryEntry) {
    const ts = new Date(entry.savedAt).toLocaleString("cs", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (
      !confirm(
        `Obnovit zálohu z ${ts}?\n\n` +
          `Aktuální stav (lokální i cloud) bude přepsán touto verzí: ${entry.deckCount} decků, ${entry.cardCount} karet.\n\n` +
          `Současný stav se zároveň automaticky uloží jako další záloha — restore samotný je vratný.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const r = await restoreHistory(entry.savedAt);
    setBusy(false);
    if (r.ok) {
      setMessage(`Obnoveno (${entry.cardCount} karet). Lokální i cloud stav je zpět.`);
      window.setTimeout(() => setMessage(null), 6000);
      await reload();
    } else {
      setError(r.message ?? "Restore selhal.");
    }
  }

  return (
    <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
      <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
        <h3 className="data text-[10px] uppercase tracking-widest text-accent">
          cloud zálohy · safety net
        </h3>
        <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
          posledních 5 push
        </span>
      </div>
      <p className="prose text-xs text-ink-dim mb-4 max-w-prose">
        Před každým push se předchozí cloud stav automaticky archivuje.
        Pokud něco omylem přepíšeš (typicky push prázdného lokálu přes
        plný cloud), klikni <span className="data">obnovit</span> u
        příslušné zálohy. Drží se posledních 5 záloh, starší se sklízejí.
      </p>

      {error && <p className="data text-xs text-bad mb-3 break-all">{error}</p>}
      {message && <p className="data text-xs text-ok mb-3">{message}</p>}

      {items === null ? (
        <p className="data text-xs text-ink-muted uppercase tracking-widest">
          načítám…
        </p>
      ) : items.length === 0 ? (
        <p className="data text-xs text-ink-muted uppercase tracking-widest">
          zatím nic — záloha vznikne s prvním push
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((entry) => {
            const ts = new Date(entry.savedAt);
            return (
              <li
                key={entry.savedAt}
                className="py-3 flex items-baseline gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="data text-sm text-ink tabular-nums">
                    {ts.toLocaleString("cs", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-0.5 tabular-nums">
                    {entry.deckCount} decků · {entry.cardCount} karet
                    {entry.clientId && (
                      <>
                        {" · "}
                        <span className="normal-case tracking-normal">
                          {entry.clientId.slice(0, 32)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => handleRestore(entry)}
                  disabled={busy}
                  variant="ghost"
                  size="sm"
                >
                  ↶ obnovit
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
