import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { parseShareHash } from "@/lib/deckExport";
import { parseDeckMarkdown, type ParsedDeck } from "@/lib/parser";
import { fetchShare } from "@/lib/shareApi";
import {
  importCollectionBundle,
  type CollectionBundle,
  type ImportSummary,
} from "@/lib/collectionBundle";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { MarkdownInline } from "@/components/MarkdownInline";

/* ---------- /share ----------
 *
 * Two flavors:
 *   /share#<base64>   client-only — decode hash to markdown, no server
 *   /s/:id            server-stored — fetch from /api/share/:id
 *
 * Both end up in the same preview → import flow. The hash flavor is
 * what non-cloud users see; the short /s/ flavor is the optional
 * upgrade cloud users get via Settings (or Sdílet → Krátký link).
 */
interface Props {
  /** Set when reached via /s/:id route. Triggers server fetch. */
  shortId?: string;
}

export function ShareReceivePage({ shortId }: Props = {}) {
  const [, navigate] = useLocation();
  const createDeck = useAppStore((s) => s.createDeck);
  const addCards = useAppStore((s) => s.addCards);

  const [imported, setImported] = useState<{
    deckId: string;
    title: string;
  } | null>(null);

  // Hash mode state — only used when no shortId.
  const [hash, setHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );
  useEffect(() => {
    if (shortId) return;
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [shortId]);

  // Short-id mode state — fetched on mount. Two flavors:
  // - deck:        parsed = ParsedDeck (markdown → cards)
  // - collection:  bundle = CollectionBundle (decks + metadata)
  const [serverShare, setServerShare] = useState<
    | {
        kind: "deck";
        parsed: ParsedDeck;
        title: string;
        views: number;
      }
    | {
        kind: "collection";
        bundle: CollectionBundle;
        title: string;
        views: number;
      }
    | null
  >(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(!!shortId);

  useEffect(() => {
    if (!shortId) return;
    let cancelled = false;
    (async () => {
      setServerLoading(true);
      const r = await fetchShare(shortId);
      if (cancelled) return;
      setServerLoading(false);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      if (r.data.kind === "collection" && r.data.bundle) {
        setServerShare({
          kind: "collection",
          bundle: r.data.bundle,
          title: r.data.title,
          views: r.data.views,
        });
      } else if (r.data.kind === "deck" && r.data.deckMd) {
        const parsedDeck = parseDeckMarkdown(r.data.deckMd);
        setServerShare({
          kind: "deck",
          parsed: parsedDeck,
          title: r.data.title,
          views: r.data.views,
        });
      } else {
        setServerError("Share je poškozený — chybí obsah.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shortId]);

  const hashResult = useMemo(
    () => (shortId ? null : parseShareHash(hash)),
    [hash, shortId],
  );

  // Unified view model
  const error: string | null = shortId
    ? serverError
    : hashResult && "error" in hashResult
      ? hashResult.error
      : null;

  // Hash mode is always deck-kind (legacy). Short-id mode can be either.
  const collectionBundle: CollectionBundle | null =
    serverShare?.kind === "collection" ? serverShare.bundle : null;

  const parsed: ParsedDeck | null = shortId
    ? serverShare?.kind === "deck"
      ? serverShare.parsed
      : null
    : hashResult && !("error" in hashResult)
      ? hashResult
      : null;

  const sourceLabel = shortId
    ? collectionBundle
      ? `sdílena kolekce · /s/${shortId}`
      : `sdíleno přes krátký link · /s/${shortId}`
    : "sdíleno přes link";
  const viewsLabel = shortId && serverShare ? serverShare.views : null;
  const loading = shortId && serverLoading;

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

  const [collectionSummary, setCollectionSummary] = useState<ImportSummary | null>(
    null,
  );
  const handleImportCollection = () => {
    if (!collectionBundle) return;
    const summary = importCollectionBundle(collectionBundle);
    setCollectionSummary(summary);
    setImported({
      deckId: summary.collectionId,
      title: summary.collectionTitle,
    });
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
            className="
              data text-[10px] uppercase tracking-widest
              text-ink-muted hover:text-accent transition-colors
              min-h-[44px] -mr-2 px-2
              flex items-center gap-1.5
            "
            aria-label="zavřít"
          >
            <span className="hidden sm:inline">zavřít</span>
            <span aria-hidden className="text-lg leading-none">×</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        {imported ? (
          <ImportedView
            title={imported.title}
            deckId={imported.deckId}
            summary={collectionSummary}
            onClose={() => navigate("/home")}
          />
        ) : loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onClose={() => navigate("/home")} />
        ) : collectionBundle ? (
          <CollectionPreview
            bundle={collectionBundle}
            sourceLabel={sourceLabel}
            viewsLabel={viewsLabel}
            onImport={handleImportCollection}
            onCancel={() => navigate("/home")}
          />
        ) : parsed ? (
          <PreviewView
            parsed={parsed}
            cardCounts={cardCounts ?? {}}
            sourceLabel={sourceLabel}
            viewsLabel={viewsLabel}
            onImport={handleImport}
            onCancel={() => navigate("/home")}
          />
        ) : null}
      </main>
    </div>
  );
}

function LoadingView() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[40vh] flex items-center justify-center"
    >
      <span className="data text-[10px] uppercase tracking-widest text-ink-muted animate-pulse">
        načítám sdílený deck…
      </span>
    </div>
  );
}

function PreviewView({
  parsed,
  cardCounts,
  sourceLabel,
  viewsLabel,
  onImport,
  onCancel,
}: {
  parsed: ParsedDeck;
  cardCounts: Record<string, number>;
  sourceLabel: string;
  viewsLabel: number | null;
  onImport: () => void;
  onCancel: () => void;
}) {
  const total = parsed.cards.length;
  const errors = parsed.issues.filter((i) => i.severity === "error").length;
  const warnings = parsed.issues.filter((i) => i.severity === "warning").length;

  return (
    <>
      <div className="data text-[10px] uppercase tracking-widest text-accent mb-4 flex items-center gap-3 flex-wrap">
        <span>{sourceLabel}</span>
        {viewsLabel !== null && (
          <span className="text-ink-muted">
            · {viewsLabel}× otevřeno
          </span>
        )}
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
                <MarkdownInline>{previewLabel(c)}</MarkdownInline>
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

function CollectionPreview({
  bundle,
  sourceLabel,
  viewsLabel,
  onImport,
  onCancel,
}: {
  bundle: CollectionBundle;
  sourceLabel: string;
  viewsLabel: number | null;
  onImport: () => void;
  onCancel: () => void;
}) {
  const totalCards = bundle.decks.reduce(
    (sum, d) => sum + (d.md.match(/^#\s+(Q|CLOZE|MCQ|FREE|CODE)\s*:/gim)?.length ?? 0),
    0,
  );

  return (
    <>
      <div className="data text-[10px] uppercase tracking-widest text-accent mb-4 flex items-center gap-3 flex-wrap">
        <span>{sourceLabel}</span>
        {viewsLabel !== null && (
          <span className="text-ink-muted">· {viewsLabel}× otevřeno</span>
        )}
        <span className="text-ink-muted">·</span>
        <span>
          kolekce {bundle.kind === "tag" ? "podle tagu" : "ruční"}
        </span>
      </div>
      <h1 className="display text-5xl sm:text-6xl mb-3 leading-tight">
        {bundle.title}
      </h1>
      {bundle.description && (
        <p className="prose text-base text-ink-dim mb-3 max-w-prose">
          {bundle.description}
        </p>
      )}
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted flex flex-wrap items-center gap-3 mb-8">
        <span>
          {bundle.decks.length}{" "}
          {bundle.decks.length === 1
            ? "deck"
            : bundle.decks.length < 5
              ? "decky"
              : "decků"}
        </span>
        <span>
          {totalCards}{" "}
          {totalCards === 1 ? "karta" : totalCards < 5 ? "karty" : "karet"}
        </span>
        {bundle.kind === "tag" && bundle.tag && (
          <span>tag <span className="text-ink-dim">#{bundle.tag}</span></span>
        )}
      </div>

      <div className="hairline rounded-md p-4 mb-6 bg-surface-elev">
        <div className="data text-[10px] uppercase tracking-widest text-ok mb-2">
          ✓ safe import
        </div>
        <p className="prose text-sm text-ink-dim max-w-prose">
          Import je <span className="data text-ink">purely additive</span> —
          přidá {bundle.decks.length} nových decků a nová kolekci do tvých
          existujících. Žádné tvoje data se nepřepíšou ani nesmažou.
        </p>
      </div>

      <details className="mb-10">
        <summary className="data text-[10px] uppercase tracking-widest text-ink-muted cursor-pointer hover:text-ink transition-colors mb-3">
          obsažené decky ({bundle.decks.length})
        </summary>
        <ul className="divide-y divide-line border-y border-line mt-3">
          {bundle.decks.slice(0, 20).map((d, i) => (
            <li key={d.originalId} className="px-1 py-2 flex items-baseline gap-3">
              <span className="data text-[10px] text-ink-muted w-6 shrink-0 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="prose text-sm text-ink truncate">{d.title}</div>
                {(d.tags?.length ?? 0) > 0 && (
                  <div className="data text-[10px] uppercase tracking-widest text-ink-muted truncate">
                    {d.tags.map((t) => `#${t}`).join(" ")}
                  </div>
                )}
              </div>
            </li>
          ))}
          {bundle.decks.length > 20 && (
            <li className="px-1 py-2 data text-[10px] uppercase tracking-widest text-ink-muted">
              … a dalších {bundle.decks.length - 20}
            </li>
          )}
        </ul>
      </details>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={onImport}
          variant="primary"
          size="lg"
          disabled={bundle.decks.length === 0}
        >
          Importovat kolekci + decky <span aria-hidden>→</span>
        </Button>
        <Button onClick={onCancel} variant="ghost" size="md">
          Zrušit
        </Button>
      </div>
    </>
  );
}

function ImportedView({
  title,
  deckId,
  summary,
  onClose,
}: {
  title: string;
  deckId: string;
  summary: ImportSummary | null;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const isCollection = summary !== null;
  return (
    <>
      <div className="data text-[10px] uppercase tracking-widest text-ok mb-4">
        ✓ importováno
      </div>
      <h1 className="display text-5xl sm:text-6xl mb-3">
        <span className="italic">{title}</span> už je tvůj.
      </h1>
      {isCollection ? (
        <p className="prose text-base text-ink-dim mb-10 max-w-prose">
          Přidáno <span className="text-ink">{summary.decksAdded}</span>{" "}
          {summary.decksAdded === 1
            ? "deck"
            : summary.decksAdded < 5
              ? "decky"
              : "decků"}{" "}
          s <span className="text-ink">{summary.cardsAdded}</span>{" "}
          {summary.cardsAdded === 1
            ? "kartou"
            : summary.cardsAdded < 5
              ? "kartami"
              : "kartami"}{" "}
          a nová kolekce <span className="text-accent">{title}</span>. Tvoje
          předchozí decky zůstaly netknuté.
        </p>
      ) : (
        <p className="prose text-base text-ink-dim mb-10 max-w-prose">
          Deck najdeš v sekci Decks a v sidebar. Můžeš začít opakovat hned.
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        {isCollection ? (
          <Button onClick={() => navigate("/decks")} variant="primary" size="md">
            Otevřít Decks →
          </Button>
        ) : (
          <Button
            onClick={() => navigate(`/decks/${encodeURIComponent(deckId)}`)}
            variant="primary"
            size="md"
          >
            Otevřít deck →
          </Button>
        )}
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
