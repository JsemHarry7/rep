import { useMemo, useState } from "react";
import {
  buildShareUrl,
  downloadDeckMd,
  serializeDeck,
  SHARE_URL_SOFT_LIMIT,
} from "@/lib/deckExport";
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

type Tab = "link" | "file" | "text";

function ShareContent({
  deck,
  cards,
  onClose,
}: {
  deck: Deck;
  cards: Card[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("link");
  const [copied, setCopied] = useState<string | null>(null);

  const md = useMemo(() => serializeDeck(deck, cards), [deck, cards]);
  const link = useMemo(() => buildShareUrl(deck, cards), [deck, cards]);
  const linkOk = link.length <= SHARE_URL_SOFT_LIMIT;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      // ignore — fallback would be select-text-instructions
    }
  };

  return (
    <div>
      <p className="prose text-sm text-ink-dim mb-5 max-w-prose">
        Tři způsoby. Žádné AI, žádný server, žádná telemetrie — všechno se
        děje v prohlížeči.
      </p>

      <nav className="flex border-b border-line mb-5">
        {(
          [
            { id: "link", label: "Linkem" },
            { id: "file", label: ".md soubor" },
            { id: "text", label: "Markdown text" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              data text-xs uppercase tracking-widest
              px-4 py-2 -mb-px border-b-2
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
