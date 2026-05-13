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
import { useAppStore } from "@/lib/store";
import { createCollectionShare, fetchShare, revokeShare } from "@/lib/shareApi";

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
  const sourceKey = `col:${collection.id}`;
  const knownShareId = useAppStore((s) => s.shareLinks[sourceKey]);
  const setShareLinkStore = useAppStore((s) => s.setShareLink);
  const clearShareLinkStore = useAppStore((s) => s.clearShareLink);

  const [shareLink, setShareLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Resolve the stored share id to a full URL. We optimistically show
  // the URL immediately based on the local mapping; in parallel we
  // verify on the server. On confirmed 404, we drop the stale entry so
  // the user can create a fresh one.
  useEffect(() => {
    setError(null);
    setCopied(false);
    if (!knownShareId) {
      setShareLink(null);
      return;
    }
    setShareLink(`${window.location.origin}/s/${knownShareId}`);
    let cancelled = false;
    void (async () => {
      const r = await fetchShare(knownShareId);
      if (cancelled) return;
      if (!r.ok && r.code === "not_found") {
        // Share was revoked elsewhere — drop local mapping silently.
        clearShareLinkStore(sourceKey);
        setShareLink(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [knownShareId, sourceKey, clearShareLinkStore]);

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
      setShareLinkStore(sourceKey, r.data.id);
    } else {
      setError(r.message);
    }
  };

  const handleRecreate = async () => {
    if (!knownShareId) {
      void handleCreate();
      return;
    }
    if (
      !confirm(
        "Zrušit současný link a vytvořit nový?\n\nStarý odkaz přestane fungovat — komu už ho někdo otevřel, ten má kopii lokálně, ta zůstane.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    // Best-effort revoke; even on failure we'll mint a fresh one.
    const revoke = await revokeShare(knownShareId);
    if (!revoke.ok) {
      // If revoke failed because the row no longer exists, that's fine.
      // Otherwise still proceed — orphaning the old row is acceptable.
    }
    clearShareLinkStore(sourceKey);
    setShareLink(null);
    setBusy(false);
    void handleCreate();
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
            Tahle kolekce má svůj permanentní link. Pošli ho komukoli —
            otevře náhled, naimportuje{" "}
            <span className="data">vše additivně</span>. Žádná jeho data
            se nepřepíšou.
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
            <button
              onClick={handleRecreate}
              disabled={busy}
              className="
                data text-[10px] uppercase tracking-widest
                text-ink-muted hover:text-bad transition-colors
                ml-auto px-2 py-2 min-h-[36px]
              "
            >
              ↻ vytvořit nový
            </button>
          </div>
          <p className="prose text-xs text-ink-muted">
            Pro odebrání linku úplně jdi do{" "}
            <span className="data">Settings → Sdílené decky & kolekce</span>.
          </p>
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
