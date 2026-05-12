/* ---------- SharedDecksList ----------
 *
 * Settings card for cloud users — lists their server-stored deck
 * shares (created via Sdílet → Krátký link) and lets them copy the
 * link or revoke. Hidden if the user isn't signed in.
 *
 * Revocation just deletes the row in shared_decks; the next time
 * anyone opens /s/:id they get a 404. Cards already imported by
 * recipients stay on their devices — revoke doesn't reach into other
 * people's stores.
 */

import { useEffect, useState } from "react";
import {
  listMyShares,
  revokeShare,
  type SharedDeckSummary,
} from "@/lib/shareApi";
import { useCloudAuth } from "@/lib/cloudAuth";
import { Button } from "@/components/ui/Button";

export function SharedDecksList() {
  const status = useCloudAuth((s) => s.status);
  const [items, setItems] = useState<SharedDeckSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "signed-in") return;
    void reload();
  }, [status]);

  if (status !== "signed-in") return null;

  async function reload() {
    setBusy(true);
    const r = await listMyShares();
    setBusy(false);
    if (r.ok) {
      setItems(r.data);
      setError(null);
    } else {
      setError(r.message);
    }
  }

  async function handleRevoke(item: SharedDeckSummary) {
    if (
      !confirm(
        `Odebrat sdílený link pro "${item.title}"? ${item.views > 0 ? `Otevřelo ho ${item.views}× — kdo už deck importoval, ten ho má dál.` : "Zatím ho nikdo neotevřel."}`,
      )
    ) {
      return;
    }
    setBusy(true);
    const r = await revokeShare(item.id);
    setBusy(false);
    if (r.ok) {
      await reload();
    } else {
      setError(r.message);
    }
  }

  async function handleCopy(item: SharedDeckSummary) {
    const url = `${window.location.origin}/s/${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(item.id);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      /* swallow */
    }
  }

  return (
    <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
      <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
        <h3 className="data text-[10px] uppercase tracking-widest text-accent">
          sdílené decky & kolekce · krátké linky
        </h3>
      </div>
      <p className="prose text-xs text-ink-dim mb-4 max-w-prose">
        Krátké linky které jsi vytvořil přes <span className="data">Sdílet → Krátký link</span>.
        Odebrání zruší přístup pro nové návštěvníky — komu se to už stihlo
        importovat, ten to má lokálně dál.
      </p>

      {error && (
        <p className="data text-xs text-bad mb-3 break-all">{error}</p>
      )}

      {items === null ? (
        <p className="data text-xs text-ink-muted uppercase tracking-widest">
          načítám…
        </p>
      ) : items.length === 0 ? (
        <p className="data text-xs text-ink-muted uppercase tracking-widest">
          zatím nic — sdílej deck v Decks → ⋯ → Sdílet
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li
              key={item.id}
              className="py-3 flex items-baseline gap-3 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <div className="prose text-sm text-ink break-all">
                  {item.title}
                </div>
                <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-0.5">
                  /s/{item.id} ·{" "}
                  <span className={item.kind === "collection" ? "text-accent" : ""}>
                    {item.kind === "collection" ? "kolekce" : "deck"}
                  </span>{" "}
                  · {item.cardCount} karet · {item.views}× otevřeno ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("cs", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <Button
                onClick={() => handleCopy(item)}
                variant="ghost"
                size="sm"
              >
                {copied === item.id ? "✓ zkopírováno" : "kopírovat"}
              </Button>
              <button
                onClick={() => handleRevoke(item)}
                disabled={busy}
                className="
                  data text-[11px] uppercase tracking-widest
                  text-ink-muted hover:text-bad transition-colors
                  px-3 py-2 min-h-[40px]
                  disabled:opacity-50
                "
                aria-label={`odebrat ${item.title}`}
              >
                ✕ odebrat
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
