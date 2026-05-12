import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { Card, Collection, Deck } from "@/types";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { collectionSize, resolveCollection } from "@/lib/collections";
import { CollectionDialog } from "@/components/decks/CollectionDialog";

interface DeckListProps {
  decks: Deck[];
  cards: Card[];
  onSelectDeck: (id: string) => void;
}

export function DeckList({ decks, cards, onSelectDeck }: DeckListProps) {
  const [, navigate] = useLocation();
  const collections = useAppStore((s) => s.collections);

  // null = "Všechny" filter (show every deck). Otherwise: filter by id.
  const [activeId, setActiveId] = useState<string | null>(null);
  // editing === null && creating === false → dialog closed
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);

  const filteredDecks = useMemo(() => {
    if (!activeId) return decks;
    const col = collections.find((c) => c.id === activeId);
    if (!col) return decks;
    return resolveCollection(col, decks);
  }, [decks, collections, activeId]);

  const activeCollection = activeId
    ? collections.find((c) => c.id === activeId) ?? null
    : null;

  const cardsByDeck = new Map<string, Card[]>();
  for (const c of cards) {
    const arr = cardsByDeck.get(c.deckId) ?? [];
    arr.push(c);
    cardsByDeck.set(c.deckId, arr);
  }

  if (decks.length === 0) {
    return (
      <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="display text-5xl sm:text-6xl mb-3">Decks.</h1>
          <p className="data text-xs text-ink-dim uppercase tracking-widest">
            zatím žádné decky
          </p>
        </header>
        <div className="hairline rounded-md p-6 sm:p-8 bg-surface-elev max-w-2xl">
          <h2 className="display text-2xl sm:text-3xl text-ink mb-2">
            <span className="italic">Začni první.</span>
          </h2>
          <p className="prose text-base text-ink-dim mb-5 max-w-prose">
            Vlastní decky si přidáš třemi způsoby — přes pomocníka s AI ze
            zápisků nebo tématu, nahráním <span className="data">.md</span>{" "}
            souboru, nebo ručně po jedné kartě.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => navigate("/add")} variant="primary" size="md">
              <span aria-hidden>+</span> Přidat karty
            </Button>
            <Button onClick={() => navigate("/home")} variant="ghost" size="md">
              ← Zpět domů
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const visibleCards = activeId
    ? filteredDecks.flatMap((d) => cardsByDeck.get(d.id) ?? [])
    : cards;

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display text-5xl sm:text-6xl mb-3">Decks.</h1>
          <p className="data text-xs text-ink-dim uppercase tracking-widest">
            {filteredDecks.length}{" "}
            {plural(filteredDecks.length, "deck", "decky", "decků")} ·{" "}
            {visibleCards.length}{" "}
            {plural(visibleCards.length, "karta", "karty", "karet")}
            {activeCollection && (
              <>
                {" "}
                <span className="text-ink-muted">·</span>{" "}
                <span className="text-accent">{activeCollection.title}</span>
              </>
            )}
          </p>
        </div>
        <Button onClick={() => navigate("/add")} variant="secondary" size="sm">
          <span aria-hidden>+</span> Přidat karty
        </Button>
      </header>

      <CollectionChips
        collections={collections}
        allDecks={decks}
        activeId={activeId}
        onPick={setActiveId}
        onNew={() => setCreating(true)}
        onEdit={(c) => setEditing(c)}
      />

      <ul className="divide-y divide-line">
        {filteredDecks.map((d) => {
          const cs = cardsByDeck.get(d.id) ?? [];
          const byType = countByType(cs);
          return (
            <li key={d.id}>
              <button
                onClick={() => onSelectDeck(d.id)}
                className="
                  w-full text-left
                  py-5 group
                  flex flex-col gap-2
                  transition-colors
                "
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="display text-2xl sm:text-3xl text-ink group-hover:italic transition-all">
                    {d.title}
                  </h2>
                  <span className="data text-xs text-ink-muted shrink-0">
                    {cs.length} {plural(cs.length, "karta", "karty", "karet")}
                  </span>
                </div>
                {d.description && (
                  <p className="prose text-sm text-ink-dim max-w-prose">
                    {d.description}
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap data text-[10px] uppercase tracking-widest text-ink-muted">
                  <span>{d.id}</span>
                  {Object.entries(byType).map(([t, n]) => (
                    <span key={t}>
                      {t} <span className="text-ink-dim">{n}</span>
                    </span>
                  ))}
                  {d.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {filteredDecks.length === 0 && activeCollection && (
        <div className="hairline rounded-md p-5 bg-surface-elev mt-4">
          <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
            prázdná kolekce
          </div>
          <p className="prose text-sm text-ink-dim">
            {activeCollection.kind === "tag" ? (
              <>
                Žádný deck zatím nemá tag{" "}
                <span className="data">#{activeCollection.tag}</span>. Otevři
                deck, klikni "upravit" a přidej tag — automaticky se sem zařadí.
              </>
            ) : (
              <>Decky této kolekce byly smazané. Uprav kolekci nebo ji smaž.</>
            )}
          </p>
        </div>
      )}

      <CollectionDialog
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        editing={editing}
        allDecks={decks}
      />
    </div>
  );
}

function CollectionChips({
  collections,
  allDecks,
  activeId,
  onPick,
  onNew,
  onEdit,
}: {
  collections: Collection[];
  allDecks: Deck[];
  activeId: string | null;
  onPick: (id: string | null) => void;
  onNew: () => void;
  onEdit: (c: Collection) => void;
}) {
  return (
    <div className="mb-6 -mx-2 px-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        <Chip active={activeId === null} onClick={() => onPick(null)}>
          Všechny
        </Chip>
        {collections.map((c) => {
          const size = collectionSize(c, allDecks);
          const active = activeId === c.id;
          return (
            <div key={c.id} className="flex items-center gap-1">
              <Chip active={active} onClick={() => onPick(c.id)}>
                <span>{c.title}</span>
                <span className="text-ink-muted ml-1.5 tabular-nums">{size}</span>
                {c.kind === "tag" && (
                  <span className="text-ink-muted ml-1.5">#</span>
                )}
              </Chip>
              {active && (
                <button
                  onClick={() => onEdit(c)}
                  className="
                    data text-[11px] uppercase tracking-widest
                    text-ink-muted hover:text-ink transition-colors
                    px-2 py-1 min-h-[36px]
                  "
                  aria-label={`upravit kolekci ${c.title}`}
                >
                  ⋯
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onNew}
          className="
            data text-[11px] uppercase tracking-widest
            text-accent hover:text-ink transition-colors
            px-3 py-1.5 min-h-[36px]
            hairline rounded-sm whitespace-nowrap
            border-dashed border-accent/40
            hover:border-solid hover:border-accent
          "
        >
          + nová kolekce
        </button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        data text-[11px] uppercase tracking-widest
        px-3 py-1.5 min-h-[36px]
        hairline rounded-sm whitespace-nowrap
        transition-colors
        ${
          active
            ? "border-navy bg-navy text-navy-fg"
            : "text-ink-dim hover:border-line-strong hover:text-ink"
        }
      `}
    >
      {children}
    </button>
  );
}

function countByType(cards: Card[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cards) out[c.type] = (out[c.type] ?? 0) + 1;
  return out;
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
