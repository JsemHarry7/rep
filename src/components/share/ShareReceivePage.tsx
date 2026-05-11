import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { parseShareHash } from "@/lib/deckExport";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import type { ParsedDeck } from "@/lib/parser";

/* ---------- /share ----------
 *
 * Reads the URL hash (e.g. /share#eyJ...), decodes it back to markdown,
 * parses it, shows a preview, and lets the user import the deck into
 * their local store. Reading from hash means the data never appears in
 * server access logs.
 */
export function ShareReceivePage() {
  const [, navigate] = useLocation();
  const createDeck = useAppStore((s) => s.createDeck);
  const addCards = useAppStore((s) => s.addCards);

  const [hash, setHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );
  const [imported, setImported] = useState<{ deckId: string; title: string } | null>(
    null,
  );

  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const result = useMemo(() => parseShareHash(hash), [hash]);
  const error = "error" in result ? result.error : null;
  const parsed: ParsedDeck | null = "error" in result ? null : result;

  const cardCounts = useMemo(() => {
    if (!parsed) return null;
    const out: Record<string, number> = {};
    for (const c of parsed.cards) out[c.type] = (out[c.type] ?? 0) + 1;
    return out;
  }, [parsed]);

  const handleImport = () => {
    if (!parsed) return;
    const deck = createDeck({
      title: parsed.meta.title ?? "sdílený deck",
      description: parsed.meta.description,
      tags: parsed.meta.tags,
    });
    addCards(deck.id, parsed.cards);
    setImported({ deckId: deck.id, title: deck.title });
  };

  return (
    <div className="min-h-dvh bg-surface overflow-y-auto [scrollbar-gutter:stable]">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-16 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/home")}
            className="flex items-baseline gap-3"
            aria-label="rep — home"
          >
            <span className="data text-base font-semibold lowercase tracking-tight text-ink leading-none">
              r
              <sup className="text-[0.55em] font-medium relative -top-[1em] ml-[0.05em]">
                n
              </sup>
            </span>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              rep · sdílený deck
            </span>
          </button>
          <button
            onClick={() => navigate("/home")}
            className="data text-[10px] uppercase tracking-widest text-ink-muted hover:text-accent transition-colors"
          >
            zavřít ×
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        {imported ? (
          <ImportedView
            title={imported.title}
            deckId={imported.deckId}
            onClose={() => navigate("/home")}
          />
        ) : error ? (
          <ErrorView message={error} onClose={() => navigate("/home")} />
        ) : parsed ? (
          <PreviewView
            parsed={parsed}
            cardCounts={cardCounts ?? {}}
            onImport={handleImport}
            onCancel={() => navigate("/home")}
          />
        ) : null}
      </main>
    </div>
  );
}

function PreviewView({
  parsed,
  cardCounts,
  onImport,
  onCancel,
}: {
  parsed: ParsedDeck;
  cardCounts: Record<string, number>;
  onImport: () => void;
  onCancel: () => void;
}) {
  const total = parsed.cards.length;
  const errors = parsed.issues.filter((i) => i.severity === "error").length;
  const warnings = parsed.issues.filter((i) => i.severity === "warning").length;

  return (
    <>
      <div className="data text-[10px] uppercase tracking-widest text-accent mb-4">
        sdíleno přes link
      </div>
      <h1 className="display text-5xl sm:text-6xl mb-3 leading-tight">
        {parsed.meta.title ?? "Beze jména"}
      </h1>
      {parsed.meta.description && (
        <p className="prose text-base text-ink-dim mb-3 max-w-prose">
          {parsed.meta.description}
        </p>
      )}
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted flex flex-wrap items-center gap-3 mb-10">
        <span>
          {total} {total === 1 ? "karta" : total < 5 ? "karty" : "karet"}
        </span>
        {Object.entries(cardCounts).map(([t, n]) => (
          <span key={t}>
            {t} <span className="text-ink-dim">{n}</span>
          </span>
        ))}
        {parsed.meta.tags.map((t) => (
          <span key={t}>#{t}</span>
        ))}
      </div>

      {errors > 0 && (
        <div className="hairline border-bad rounded-md p-4 mb-8 bg-surface-elev">
          <div className="data text-[10px] uppercase tracking-widest text-bad mb-1">
            {errors} {errors === 1 ? "chyba" : "chyby"} při parsování
          </div>
          <p className="prose text-sm text-ink-dim">
            Některé karty se nepovedly načíst. Můžeš pokračovat — naimportují
            se jen ty validní.
          </p>
        </div>
      )}

      <details className="mb-10">
        <summary className="data text-[10px] uppercase tracking-widest text-ink-muted cursor-pointer hover:text-ink transition-colors mb-3">
          náhled karet ({total})
        </summary>
        <ul className="divide-y divide-line border-y border-line mt-3">
          {parsed.cards.slice(0, 20).map((c, i) => (
            <li key={i} className="px-1 py-2 flex items-baseline gap-3">
              <span className="data text-[10px] text-ink-muted w-6 shrink-0 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="data text-[10px] uppercase tracking-widest text-ink-muted w-14 shrink-0">
                {c.type}
              </span>
              <span className="prose text-sm text-ink truncate">
                {previewLabel(c)}
              </span>
            </li>
          ))}
          {parsed.cards.length > 20 && (
            <li className="px-1 py-2 data text-[10px] uppercase tracking-widest text-ink-muted">
              … a dalších {parsed.cards.length - 20}
            </li>
          )}
        </ul>
      </details>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={onImport} variant="primary" size="lg" disabled={total === 0}>
          Importovat do svých decků <span aria-hidden>→</span>
        </Button>
        <Button onClick={onCancel} variant="ghost" size="md">
          Zrušit
        </Button>
      </div>
      {warnings > 0 && (
        <p className="data text-[10px] uppercase tracking-widest text-warn mt-4">
          {warnings} {warnings === 1 ? "varování" : "varování"} bez závažnosti
        </p>
      )}
    </>
  );
}

function ImportedView({
  title,
  deckId,
  onClose,
}: {
  title: string;
  deckId: string;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  return (
    <>
      <div className="data text-[10px] uppercase tracking-widest text-ok mb-4">
        ✓ importováno
      </div>
      <h1 className="display text-5xl sm:text-6xl mb-3">
        <span className="italic">{title}</span> už je tvůj.
      </h1>
      <p className="prose text-base text-ink-dim mb-10 max-w-prose">
        Deck najdeš v sekci Decks a v sidebar. Můžeš začít opakovat hned.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => navigate(`/decks/${encodeURIComponent(deckId)}`)}
          variant="primary"
          size="md"
        >
          Otevřít deck →
        </Button>
        <Button onClick={onClose} variant="ghost" size="md">
          Zpět domů
        </Button>
      </div>
    </>
  );
}

function ErrorView({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <>
      <div className="data text-[10px] uppercase tracking-widest text-bad mb-4">
        sdílený link · chyba
      </div>
      <h1 className="display text-5xl sm:text-6xl mb-4">Něco je špatně.</h1>
      <p className="prose text-base text-ink-dim mb-3 max-w-prose">
        {message}
      </p>
      <p className="prose text-sm text-ink-dim mb-10 max-w-prose">
        Zkus odeslateli říct ať sdílel znovu — nejlépe celý link, ne jen
        část.
      </p>
      <Button onClick={onClose} variant="primary" size="md">
        ← Zpět domů
      </Button>
    </>
  );
}

function previewLabel(c: ParsedDeck["cards"][number]): string {
  switch (c.type) {
    case "qa":
      return c.question;
    case "cloze":
      return c.text.replace(/\{\{([^}]+)\}\}/g, "___");
    case "mcq":
      return c.question;
    case "free":
      return c.prompt;
    case "code":
      return c.prompt;
  }
}
