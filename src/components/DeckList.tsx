import { useLocation } from "wouter";
import type { Card, Deck } from "@/types";
import { Button } from "@/components/ui/Button";

interface DeckListProps {
  decks: Deck[];
  cards: Card[];
  onSelectDeck: (id: string) => void;
}

export function DeckList({ decks, cards, onSelectDeck }: DeckListProps) {
  const [, navigate] = useLocation();
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

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
      <header className="mb-10 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display text-5xl sm:text-6xl mb-3">Decks.</h1>
          <p className="data text-xs text-ink-dim uppercase tracking-widest">
            {decks.length} {plural(decks.length, "deck", "decky", "decků")} ·{" "}
            {cards.length} {plural(cards.length, "karta", "karty", "karet")} celkem
          </p>
        </div>
        <Button onClick={() => navigate("/add")} variant="secondary" size="sm">
          <span aria-hidden>+</span> Přidat karty
        </Button>
      </header>

      <ul className="divide-y divide-line">
        {decks.map((d) => {
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
    </div>
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
