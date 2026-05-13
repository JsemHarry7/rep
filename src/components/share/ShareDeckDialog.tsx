import { useEffect, useMemo, useState } from "react";
import {
  buildShareUrl,
  downloadDeckMd,
  serializeDeck,
  SHARE_URL_SOFT_LIMIT,
} from "@/lib/deckExport";
import { createShare, fetchShare, revokeShare } from "@/lib/shareApi";
import { useCloudAuth } from "@/lib/cloudAuth";
import { useAppStore } from "@/lib/store";
import type { Card, Deck } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  deck: Deck | null;
  cards: Card[];
  open: boolean;
  onClose: () => void;
}

/* ---------- ShareDeckDialog ----------
 *
 * Three ways to share a deck:
 *   1. Link — base64-encoded deck in URL hash. Recipient clicks → /share
 *      page decodes + offers import. Hash means data never touches our
 *      server logs (we don't even have a server yet, but principle stands).
 *   2. .md file — download the deck as our markdown format. Share via
 *      whatever channel.
 *   3. Markdown text — copy-paste into chat / email / gist.
 *
 * For decks past the URL soft-limit (~4 KB), the link tab nudges the
 * user toward file download instead.
 */
export function ShareDeckDialog({ deck, cards, open, onClose }: Props) {
  if (!deck || !open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Sdílet "${deck.title}"`}
      maxWidth="max-w-2xl"
    >
      <ShareContent deck={deck} cards={cards} onClose={onClose} />
    </Modal>
  );
}

type Tab = "short" | "link" | "file" | "text";

function ShareContent({
  deck,
  cards,
  onClose,
}: {
  deck: Deck;
  cards: Card[];
  onClose: () => void;
}) {
  const isCloudUser = useCloudAuth((s) => s.status === "signed-in");
  // Cloud users see the "Krátký link" tab as the default — it produces
  // a short /s/abc12345 URL backed by D1. Non-cloud users only see the
  // existing client-only options.
  const [tab, setTab] = useState<Tab>(isCloudUser ? "short" : "link");
  const [copied, setCopied] = useState<string | null>(null);

  const md = useMemo(() => serializeDeck(deck, cards), [deck, cards]);
  const link = useMemo(() => buildShareUrl(deck, cards), [deck, cards]);
  const linkOk = link.length <= SHARE_URL_SOFT_LIMIT;

  /* ---- Short-link (cloud) state ----
   * Permanent per deck: we stash the shareId in the store keyed by
   * "deck:<id>", verify it still exists on open, and let the user
   * "regenerate" if they really want a fresh URL. Otherwise repeated
   * "Sdílet → Krátký link" yields the SAME link, not a new D1 row
   * every time. */
  const sourceKey = `deck:${deck.id}`;
  const knownShareId = useAppStore((s) => s.shareLinks[sourceKey]);
  const setShareLinkStore = useAppStore((s) => s.setShareLink);
  const clearShareLinkStore = useAppStore((s) => s.clearShareLink);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [shortBusy, setShortBusy] = useState(false);
  const [shortError, setShortError] = useState<string | null>(null);

  // Hydrate from stored share id; verify on server in the background
  // and clear local mapping on confirmed 404.
  useEffect(() => {
    setShortError(null);
    if (!knownShareId) {
      setShortLink(null);
      return;
    }
    setShortLink(`${window.location.origin}/s/${knownShareId}`);
    let cancelled = false;
    void (async () => {
      const r = await fetchShare(knownShareId);
      if (cancelled) return;
      if (!r.ok && r.code === "not_found") {
        clearShareLinkStore(sourceKey);
        setShortLink(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [knownShareId, sourceKey, clearShareLinkStore]);

  const handleCreateShort = async () => {
    setShortBusy(true);
    setShortError(null);
    const r = await createShare(deck, cards);
    setShortBusy(false);
    if (r.ok) {
      setShortLink(r.data.url);
      setShareLinkStore(sourceKey, r.data.id);
    } else {
      setShortError(r.message);
    }
  };

  const handleRecreateShort = async () => {
    if (!knownShareId) {
      void handleCreateShort();
      return;
    }
    if (
      !confirm(
        "Zrušit současný link a vytvořit nový?\n\nStarý odkaz přestane fungovat. Komu už ho někdo otevřel a importoval, ten má kopii lokálně.",
      )
    ) {
      return;
    }
    setShortBusy(true);
    setShortError(null);
    await revokeShare(knownShareId);
    clearShareLinkStore(sourceKey);
    setShortLink(null);
    setShortBusy(false);
    void handleCreateShort();
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      // ignore — fallback would be select-text-instructions
    }
  };

  const tabs = [
    ...(isCloudUser ? [{ id: "short" as Tab, label: "Krátký link" }] : []),
    { id: "link" as Tab, label: isCloudUser ? "Dlouhý link" : "Linkem" },
    { id: "file" as Tab, label: ".md soubor" },
    { id: "text" as Tab, label: "Markdown text" },
  ];

  return (
    <div>
      <p className="prose text-sm text-ink-dim mb-5 max-w-prose">
        {isCloudUser
          ? "Krátký link je hostovaný u nás v D1 (proto je krátký). Ostatní možnosti běží jen v prohlížeči — bez serveru."
          : "Tři způsoby. Žádné AI, žádný server, žádná telemetrie — všechno se děje v prohlížeči."}
      </p>

      <nav className="flex border-b border-line mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              data text-xs uppercase tracking-widest
              px-4 py-2 -mb-px border-b-2 whitespace-nowrap
              transition-colors
              ${
                tab === t.id
                  ? "text-ink border-navy"
                  : "text-ink-muted border-transparent hover:text-ink"
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "short" && (
        <div>
          <p className="prose text-sm text-ink-dim mb-3 max-w-prose">
            {shortLink ? (
              <>
                Tenhle deck má permanentní krátký link. Pošli ho komukoli
                — otevře ho i bez účtu. Odebrání jen v{" "}
                <span className="data">Settings → Sdílené decky</span>.
              </>
            ) : (
              <>
                Krátký <span className="data">/s/abc12345</span> link.
                Otevře ho kdokoliv (i bez účtu), data si přitáhne ze
                serveru. Po vytvoření zůstane spojený s tímhle deckem.
              </>
            )}
          </p>
          {shortLink ? (
            <>
              <input
                type="text"
                value={shortLink}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="form-input data text-sm mb-3"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => copy(shortLink, "short")}
                  variant="primary"
                  size="sm"
                >
                  {copied === "short" ? "Zkopírováno ✓" : "Kopírovat link"}
                </Button>
                <button
                  onClick={handleRecreateShort}
                  disabled={shortBusy}
                  className="
                    data text-[10px] uppercase tracking-widest
                    text-ink-muted hover:text-bad transition-colors
                    ml-auto px-2 py-2 min-h-[36px]
                  "
                >
                  ↻ vytvořit nový
                </button>
              </div>
            </>
          ) : (
            <Button
              onClick={handleCreateShort}
              variant="primary"
              size="md"
              disabled={shortBusy}
            >
              {shortBusy ? "Vytvářím…" : "Vytvořit krátký link"}
            </Button>
          )}
          {shortError && (
            <p className="data text-xs text-bad mt-3 break-all">{shortError}</p>
          )}
        </div>
      )}

      {tab === "link" && (
        <div>
          <p className="prose text-sm text-ink-dim mb-3 max-w-prose">
            Data jsou zakódovaná přímo v URL (base64). Příjemce klikne →
            uvidí náhled → naimportuje. Nikam to po cestě neletí.
          </p>
          <input
            type="text"
            value={link}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="form-input data text-xs mb-3"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => copy(link, "link")}
              variant="primary"
              size="sm"
              disabled={!linkOk}
            >
              {copied === "link" ? "Zkopírováno ✓" : "Kopírovat link"}
            </Button>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              {link.length} znaků
              {!linkOk && (
                <>
                  <span className="mx-2 text-bad">·</span>
                  <span className="text-bad">moc dlouhé pro link</span>
                </>
              )}
            </span>
          </div>
          {!linkOk && (
            <p className="prose text-sm text-ink-dim mt-3 max-w-prose">
              Některé prohlížeče / messaging aplikace ořezávají dlouhé URL.
              Pro deck této velikosti raději stáhni{" "}
              <button
                onClick={() => setTab("file")}
                className="text-accent hover:underline"
              >
                .md soubor
              </button>
              .
            </p>
          )}
        </div>
      )}

      {tab === "file" && (
        <div>
          <p className="prose text-sm text-ink-dim mb-4 max-w-prose">
            Stáhneš deck jako <span className="data">.md</span> soubor —
            funguje pro libovolnou velikost. Příjemce ho přetáhne do{" "}
            <span className="data">Add cards → Nahrát</span>.
          </p>
          <Button
            onClick={() => downloadDeckMd(deck, cards)}
            variant="primary"
            size="md"
          >
            <span aria-hidden>↓</span> Stáhnout {deck.title}.md
          </Button>
        </div>
      )}

      {tab === "text" && (
        <div>
          <p className="prose text-sm text-ink-dim mb-3 max-w-prose">
            Zkopíruj markdown a vlož kamkoliv (Slack, mail, gist, Notion).
            Příjemce může vložit do{" "}
            <span className="data">Add cards → Nahrát</span>.
          </p>
          <textarea
            value={md}
            readOnly
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
            className="form-textarea data text-xs mb-3"
          />
          <Button
            onClick={() => copy(md, "md")}
            variant="primary"
            size="sm"
          >
            {copied === "md" ? "Zkopírováno ✓" : "Kopírovat markdown"}
          </Button>
        </div>
      )}

      <div className="border-t border-line mt-6 pt-4 flex justify-end">
        <Button onClick={onClose} variant="ghost" size="sm">
          Zavřít
        </Button>
      </div>
    </div>
  );
}
