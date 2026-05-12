import { useMemo, useState } from "react";
import type { Card, Deck, Rating, ReviewMode } from "@/types";
import { useAppStore } from "@/lib/store";
import { deckMastery, selectDueCards } from "@/lib/srs";
import { Button } from "@/components/ui/Button";
import { MarkdownInline } from "@/components/MarkdownInline";
import {
  EditCardDialog,
  DeleteCardDialog,
  EditDeckDialog,
  DeleteDeckDialog,
} from "@/components/ManageDialogs";
import { ShareDeckDialog } from "@/components/share/ShareDeckDialog";

interface DeckDetailProps {
  deck: Deck;
  cards: Card[];
  onBack: () => void;
  onStartReview: (mode: ReviewMode) => void;
}

export function DeckDetail({
  deck,
  cards,
  onBack,
  onStartReview,
}: DeckDetailProps) {
  const srsState = useAppStore((s) => s.srsState);
  const reviews = useAppStore((s) => s.reviews);

  const isLocal = deck.source === "local";

  const [editCardOpen, setEditCardOpen] = useState<Card | null>(null);
  const [deleteCardOpen, setDeleteCardOpen] = useState<Card | null>(null);
  const [editDeckOpen, setEditDeckOpen] = useState(false);
  const [deleteDeckOpen, setDeleteDeckOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const stats = useMemo(() => {
    const cardIds = cards.map((c) => c.id);
    const m = deckMastery(cardIds, srsState);
    const due = selectDueCards(cards, srsState).length;
    const struggling = cards.filter(
      (c) => (srsState[c.id]?.lapses ?? 0) >= 1,
    ).length;
    return { ...m, due, struggling };
  }, [cards, srsState]);

  const ratingCounts = useMemo(() => {
    const cardIds = new Set(cards.map((c) => c.id));
    const counts: Record<Rating, number> = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    };
    let total = 0;
    for (const r of reviews) {
      if (!cardIds.has(r.cardId)) continue;
      counts[r.rating]++;
      total++;
    }
    return { counts, total };
  }, [cards, reviews]);

  const modes: Array<{
    id: ReviewMode;
    label: string;
    hint: string;
    enabled: boolean;
  }> = [
    {
      id: "srs",
      label: "SRS",
      hint: stats.due > 0 ? `${stats.due} k opakování` : "vše opakováno",
      enabled: cards.length > 0,
    },
    {
      id: "cram",
      label: "Cram",
      hint: `všech ${cards.length} bez SRS`,
      enabled: cards.length > 0,
    },
    {
      id: "sprint",
      label: "Sprint",
      hint: "60s · zamíchané",
      enabled: cards.length > 0,
    },
    {
      id: "boss",
      label: "Boss",
      hint:
        stats.struggling > 0
          ? `top ${Math.min(10, stats.struggling)} obtížných`
          : "nic obtížného",
      enabled: stats.struggling > 0,
    },
  ];

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="
          data text-[11px] uppercase tracking-widest
          text-ink-muted hover:text-ink
          mb-8 transition-colors
          flex items-center gap-2
        "
      >
        <span aria-hidden>←</span> decks
      </button>

      <header className="mb-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
          <h1 className="display text-5xl sm:text-6xl">{deck.title}</h1>
          <div className="flex items-center gap-1 flex-wrap">
            {cards.length > 0 && (
              <Button
                onClick={() => setShareOpen(true)}
                variant="ghost"
                size="sm"
              >
                Sdílet
              </Button>
            )}
            {isLocal && (
              <>
                <Button
                  onClick={() => setEditDeckOpen(true)}
                  variant="ghost"
                  size="sm"
                >
                  Upravit
                </Button>
                <Button
                  onClick={() => setDeleteDeckOpen(true)}
                  variant="ghost"
                  size="sm"
                >
                  <span className="text-bad">Smazat</span>
                </Button>
              </>
            )}
          </div>
        </div>
        {deck.description && (
          <p className="prose text-base text-ink-dim max-w-prose mb-3">
            {deck.description}
          </p>
        )}
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted flex flex-wrap items-center gap-3">
          <span>{deck.id}</span>
          {!isLocal && <span>· read-only</span>}
          {deck.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-line border-y border-line">
        <Stat label="cards" value={cards.length} />
        <Stat label="seen" value={`${stats.seen}/${cards.length}`} />
        <Stat label="due" value={stats.due} accent={stats.due > 0} />
        <Stat label="mastery" value={`${Math.round(stats.mastery * 100)}%`} />
      </section>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
            hodnocení
          </h2>
          <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
            {ratingCounts.total > 0
              ? `${ratingCounts.total} review`
              : "zatím žádné review"}
          </span>
        </div>
        {ratingCounts.total > 0 && (
          <div
            className="h-1.5 mb-3 grid bg-surface-elev rounded-sm overflow-hidden"
            style={{
              gridTemplateColumns: ratingTrackTemplate(
                ratingCounts.counts,
                ratingCounts.total,
              ),
            }}
          >
            <div className="bg-bad" />
            <div className="bg-ink-dim" />
            <div className="bg-ok" />
            <div className="bg-accent" />
          </div>
        )}
        <div className="grid grid-cols-4 divide-x divide-line border-y border-line">
          <RatingStat
            label="again"
            value={ratingCounts.counts.again}
            color="text-bad"
          />
          <RatingStat
            label="hard"
            value={ratingCounts.counts.hard}
            color="text-ink-dim"
          />
          <RatingStat
            label="good"
            value={ratingCounts.counts.good}
            color="text-ok"
          />
          <RatingStat
            label="easy"
            value={ratingCounts.counts.easy}
            color="text-accent"
          />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          review modes
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              disabled={!m.enabled}
              onClick={() => onStartReview(m.id)}
              className="
                hairline rounded-md
                px-4 py-3
                text-left
                bg-surface-elev
                transition-colors
                hover:border-line-strong
                disabled:hover:border-line
                disabled:opacity-50 disabled:cursor-not-allowed
                group
              "
            >
              <div className="display text-xl text-ink group-hover:text-accent group-disabled:group-hover:text-ink transition-colors">
                {m.label}
              </div>
              <div className="data text-[10px] text-ink-muted uppercase tracking-widest mt-1">
                {m.hint}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          cards ({cards.length})
          {!isLocal && (
            <span className="ml-3 normal-case tracking-wide text-ink-muted/70">
              · read-only
            </span>
          )}
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {cards.map((c, i) => {
            const s = srsState[c.id];
            return (
              <li
                key={c.id}
                className="px-1 py-2.5 flex items-baseline gap-3 group"
              >
                <span className="data text-[10px] text-ink-muted w-6 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="data text-[10px] uppercase tracking-widest text-ink-muted w-14 shrink-0">
                  {c.type}
                </span>
                <span className="prose text-sm text-ink truncate flex-1">
                  <MarkdownInline>{cardPreview(c)}</MarkdownInline>
                </span>
                {s && (
                  <span className="data text-[10px] uppercase tracking-widest text-ink-muted shrink-0 hidden sm:inline">
                    {s.lapses > 0 && (
                      <span className="text-bad mr-2">!{s.lapses}</span>
                    )}
                    {formatInterval(s.intervalDays)}
                  </span>
                )}
                {isLocal && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => setEditCardOpen(c)}
                      className="
                        data text-[11px] sm:text-[10px] uppercase tracking-widest
                        text-ink-muted hover:text-accent transition-colors
                        px-3 py-2 min-h-[40px]
                      "
                    >
                      upravit
                    </button>
                    <button
                      onClick={() => setDeleteCardOpen(c)}
                      className="
                        data text-[11px] sm:text-[10px] uppercase tracking-widest
                        text-ink-muted hover:text-bad transition-colors
                        px-3 py-2 min-h-[40px]
                      "
                    >
                      smazat
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <EditCardDialog
        card={editCardOpen}
        open={editCardOpen !== null}
        onClose={() => setEditCardOpen(null)}
      />
      <DeleteCardDialog
        card={deleteCardOpen}
        open={deleteCardOpen !== null}
        onClose={() => setDeleteCardOpen(null)}
      />
      <EditDeckDialog
        deck={editDeckOpen ? deck : null}
        open={editDeckOpen}
        onClose={() => setEditDeckOpen(false)}
      />
      <DeleteDeckDialog
        deck={deleteDeckOpen ? deck : null}
        open={deleteDeckOpen}
        onClose={() => setDeleteDeckOpen(false)}
        onDeleted={onBack}
      />
      <ShareDeckDialog
        deck={shareOpen ? deck : null}
        cards={cards}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-4 text-center">
      <div
        className={`display text-3xl sm:text-4xl tabular-nums ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </div>
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-1">
        {label}
      </div>
    </div>
  );
}

function RatingStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="px-2 py-3 text-center">
      <div className={`display text-2xl sm:text-3xl tabular-nums ${color}`}>
        {value}
      </div>
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-1">
        {label}
      </div>
    </div>
  );
}

function ratingTrackTemplate(
  counts: Record<Rating, number>,
  total: number,
): string {
  if (total === 0) return "1fr 1fr 1fr 1fr";
  const order: Rating[] = ["again", "hard", "good", "easy"];
  return order
    .map((k) => (counts[k] === 0 ? "0fr" : `${counts[k]}fr`))
    .join(" ");
}

function cardPreview(c: Card): string {
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

function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.round(days * 24 * 60)}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 7) return `${days.toFixed(1)}d`;
  if (days < 30) return `${Math.round(days)}d`;
  return `${(days / 30).toFixed(1)}mo`;
}
