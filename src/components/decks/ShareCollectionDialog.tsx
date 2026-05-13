/* ---------- ShareCollectionDialog ----------
 *
 * Standalone share flow for a collection. Cloud-user only (the short
 * /s/:id link requires server storage). Previously this UI was nested
 * inside CollectionDialog's edit form; pulled out into its own
 * surface so the "Sdílet" action in the Decks meta row has a focused
 * entry point separate from "Upravit".
 *
 * The actual server call (createCollectionShare) and bundle logic
 * live in src/lib/shareApi.ts + src/lib/collectionBundle.ts.
 */

import { useEffect, useState } from "react";
import type { Collection, Deck } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCloudAuth } from "@/lib/cloudAuth";
import { useCombinedContent } from "@/lib/data";
import { createCollectionShare } from "@/lib/shareApi";

interface Props {
  open: boolean;
  onClose: () => void;
  collection: Collection | null;
  allDecks: Deck[];
}

export function ShareCollectionDialog({ open, onClose, collection, allDecks }: Props) {
  if (!open || !collection) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Sdílet "${collection.title}"`}
      maxWidth="max-w-xl"
    >
      <ShareBody
        key={collection.id}
        collection={collection}
        allDecks={allDecks}
        onClose={onClose}
      />
    </Modal>
  );
}

function ShareBody({
  collection,
  allDecks,
  onClose,
}: {
  collection: Collection;
  allDecks: Deck[];
  onClose: () => void;
}) {
  const isCloudUser = useCloudAuth((s) => s.status === "signed-in");
  const { cards: allCardsUniverse } = useCombinedContent();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-key effectively resets, but explicit cleanup on collection change.
  useEffect(() => {
    setShareLink(null);
    setError(null);
    setCopied(false);
  }, [collection.id]);

  if (!isCloudUser) {
    return (
      <div className="space-y-4">
        <p className="prose text-sm text-ink-dim max-w-prose">
          Sdílení kolekcí krátkým <span className="data">/s/</span> linkem je
          jenom pro přihlášené cloud users — bundle decků + metadata
          musíme uložit na server.
        </p>
        <p className="prose text-sm text-ink-dim max-w-prose">
          Pokud chceš sdílet bez cloudu, otevři libovolný{" "}
          <span className="data">deck</span> z téhle kolekce zvlášť a použij{" "}
          <span className="data">Sdílet → Dlouhý link / .md</span> tam.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose} variant="ghost" size="sm">
            Zavřít
          </Button>
        </div>
      </div>
    );
  }

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    const r = await createCollectionShare(collection, allDecks, allCardsUniverse);
    setBusy(false);
    if (r.ok) {
      setShareLink(r.data.url);
    } else {
      setError(r.message);
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* swallow */
    }
  };

  return (
    <div className="space-y-4">
      <div className="data text-[10px] uppercase tracking-widest text-accent">
        sdílet · krátký link
      </div>

      {shareLink ? (
        <>
          <p className="prose text-sm text-ink-dim max-w-prose">
            Bundle decků + metadata uložené. Otevře kdokoliv (i bez účtu),
            naimportuje{" "}
            <span className="data">vše additivně</span> — recipient
            neztrácí žádné svoje decky.
          </p>
          <input
            type="text"
            value={shareLink}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="form-input data text-sm"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleCopy} variant="primary" size="sm">
              {copied ? "Zkopírováno ✓" : "Kopírovat link"}
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              Hotovo
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="prose text-sm text-ink-dim max-w-prose">
            Vytvoří krátký <span className="data">/s/abc12345</span> link.
            Recipient klikne → uvidí náhled → naimportuje všechny decky
            + tuhle kolekci jako nové. Žádná jeho data se nepřepíšou.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleCreate}
              disabled={busy}
              variant="primary"
              size="md"
            >
              {busy ? "Vytvářím…" : "Vytvořit krátký link"}
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              Zrušit
            </Button>
          </div>
        </>
      )}

      {error && (
        <p className="data text-xs text-bad break-all">{error}</p>
      )}
    </div>
  );
}
