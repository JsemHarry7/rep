import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card, Deck, Rating, ReviewMode } from "@/types";
import { useAppStore } from "@/lib/store";
import { selectDueCards, sortDueCards } from "@/lib/srs";
import { CardView } from "./CardView";
import { RatingBar } from "./RatingBar";

interface Props {
  deck: Deck;
  cards: Card[];
  mode: ReviewMode;
  onExit: () => void;
}

interface SessionEntry {
  cardId: string;
  rating: Rating;
  timeMs: number;
}

const SPRINT_MS = 60_000;
const BOSS_CARD_COUNT = 10;

export function ReviewScreen({ deck, cards, mode, onExit }: Props) {
  const recordReview = useAppStore((s) => s.recordReview);
  const srsState = useAppStore((s) => s.srsState);

  // Build the session queue once when the component mounts (or mode changes).
  // Subsequent renders don't reshuffle — would feel chaotic.
  const queue = useMemo<Card[]>(() => buildQueue(cards, mode, srsState), [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<SessionEntry[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  const cardStartedAt = useRef<number>(Date.now());
  const sessionStartedAt = useRef<number>(Date.now());

  const isSprint = mode === "sprint";
  const naturalDone = index >= queue.length;
  const done = naturalDone || timedOut;
  const card = done ? null : queue[index];

  /* ---------- Sprint timer ---------- */
  // Tick once per ~100ms, end session when budget runs out.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isSprint || done) return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [isSprint, done]);

  const elapsedMs = now - sessionStartedAt.current;
  const remainingMs = isSprint ? Math.max(0, SPRINT_MS - elapsedMs) : 0;
  useEffect(() => {
    if (isSprint && remainingMs === 0 && !done) setTimedOut(true);
  }, [isSprint, remainingMs, done]);

  /* ---------- Card timer ---------- */
  useEffect(() => {
    cardStartedAt.current = Date.now();
    setRevealed(false);
  }, [index]);

  const handleReveal = useCallback(() => setRevealed(true), []);

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!card) return;
      const timeMs = Date.now() - cardStartedAt.current;
      recordReview({ cardId: card.id, rating, timeMs, mode });
      setHistory((h) => [...h, { cardId: card.id, rating, timeMs }]);
      setIndex((i) => i + 1);
    },
    [card, mode, recordReview],
  );

  /* ---------- Keyboard ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable === true;

      if (e.key === "Escape") {
        e.preventDefault();
        if (inField && target) {
          target.blur();
          return;
        }
        onExit();
        return;
      }
      if (done) return;
      if (inField) {
        if (!revealed && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          handleReveal();
        }
        return;
      }
      if (!revealed) {
        if (e.key === " ") {
          e.preventDefault();
          handleReveal();
        }
        return;
      }
      if (e.key === "1") handleRate("again");
      else if (e.key === "2") handleRate("hard");
      else if (e.key === "3") handleRate("good");
      else if (e.key === "4") handleRate("easy");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, revealed, handleRate, handleReveal, onExit]);

  /* ---------- Empty state (SRS / Boss with nothing to review) ---------- */
  if (queue.length === 0) {
    return (
      <EmptyState
        deck={deck}
        mode={mode}
        srsState={srsState}
        cards={cards}
        onExit={onExit}
      />
    );
  }

  if (done) {
    return (
      <SessionSummary
        history={history}
        totalMs={Date.now() - sessionStartedAt.current}
        deck={deck}
        mode={mode}
        timedOut={timedOut}
        queueLength={queue.length}
        onExit={onExit}
      />
    );
  }

  if (!card) return null;

  return (
    <div className="flex flex-col h-full">
      <header
        className="
          border-b border-line
          px-4 sm:px-12 py-3 sm:py-4
          pt-[max(0.75rem,env(safe-area-inset-top))]
          flex items-center justify-between gap-3
          shrink-0
        "
      >
        <button
          onClick={onExit}
          className="
            data text-[11px] uppercase tracking-widest
            text-ink-muted hover:text-ink
            transition-colors
            flex items-center gap-2
            -mx-2 px-2 py-2 min-h-[44px] shrink-0
          "
        >
          <kbd className="hidden sm:inline-block hairline rounded-sm px-1.5 py-0.5 text-[10px] leading-none bg-surface-elev text-ink-dim">
            esc
          </kbd>
          <span aria-hidden className="sm:hidden">×</span>
          <span>exit</span>
        </button>

        <div className="data text-xs text-ink-dim flex items-baseline gap-2 min-w-0 ml-auto">
          <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
            {modeLabel(mode)}
          </span>
          <span className="text-ink-muted">·</span>
          <span className="truncate max-w-[30vw] sm:max-w-none">{deck.title}</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink tabular-nums">
            {String(index + 1).padStart(2, "0")}/{String(queue.length).padStart(2, "0")}
          </span>
          {isSprint && (
            <>
              <span className="text-ink-muted">·</span>
              <span
                className={`text-ink tabular-nums ${remainingMs < 10_000 ? "text-bad" : ""}`}
              >
                {Math.ceil(remainingMs / 1000)}s
              </span>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-3xl mx-auto">
          <CardView card={card} revealed={revealed} onReveal={handleReveal} />
        </div>
      </main>

      <RatingBar revealed={revealed} onReveal={handleReveal} onRate={handleRate} />
    </div>
  );
}

/* ---------- Queue building ---------- */

function buildQueue(
  cards: Card[],
  mode: ReviewMode,
  srs: Record<string, import("@/types").SrsState>,
): Card[] {
  switch (mode) {
    case "cram":
    case "mock":
    case "mission":
      return cards.slice();
    case "srs": {
      const due = selectDueCards(cards, srs);
      return sortDueCards(due, srs);
    }
    case "sprint": {
      // Random shuffle for variety.
      const out = cards.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
    case "boss": {
      // Top hardest: most lapses, then lowest ease, then most reps.
      const scored = cards.map((c) => {
        const s = srs[c.id];
        const score = s
          ? s.lapses * 100 + (2.5 - s.ease) * 10 + Math.min(s.reps, 20)
          : -1; // never reviewed: rank below seen+failed cards
        return { c, score };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored
        .filter((x) => x.score >= 0)
        .slice(0, BOSS_CARD_COUNT)
        .map((x) => x.c);
    }
  }
}

function modeLabel(m: ReviewMode): string {
  switch (m) {
    case "srs":
      return "srs";
    case "cram":
      return "cram";
    case "sprint":
      return "sprint";
    case "boss":
      return "boss";
    case "mock":
      return "mock";
    case "mission":
      return "mission";
  }
}

/* ---------- Empty state ---------- */

interface EmptyProps {
  deck: Deck;
  mode: ReviewMode;
  srsState: Record<string, import("@/types").SrsState>;
  cards: Card[];
  onExit: () => void;
}

function EmptyState({ deck, mode, srsState, cards, onExit }: EmptyProps) {
  const headline =
    mode === "srs"
      ? "Vše opakováno."
      : mode === "boss"
        ? "Žádné karty na boss fight."
        : "Žádné karty.";

  const body =
    mode === "srs"
      ? nextDueLine(cards, srsState)
      : mode === "boss"
        ? "Boss fight bere top 10 karet podle počtu lapsů. Zatím není koho porazit — buď jsi v tomhle decku nic neopakoval, nebo ti nic nedělalo problém."
        : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-2xl mx-auto w-full">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-4">
          {modeLabel(mode)} · {deck.title}
        </div>
        <h1 className="display text-6xl sm:text-7xl text-ink mb-3">{headline}</h1>
        {body && (
          <p className="prose text-base text-ink-dim mb-10 max-w-prose">{body}</p>
        )}
        <button
          onClick={onExit}
          className="
            data text-sm uppercase tracking-widest
            text-ink hover:text-navy
            transition-colors
            flex items-center gap-2
            min-h-[44px] px-3 -mx-3
          "
        >
          <kbd className="hidden sm:inline-block hairline rounded-sm px-1.5 py-0.5 text-[10px] leading-none bg-surface-elev text-ink-dim">
            esc
          </kbd>
          <span aria-hidden className="sm:hidden">←</span>
          zpět
        </button>
      </div>
    </div>
  );
}

function nextDueLine(
  cards: Card[],
  srs: Record<string, import("@/types").SrsState>,
): string {
  const now = Date.now();
  let next = Infinity;
  for (const c of cards) {
    const s = srs[c.id];
    if (s && s.dueAt > now && s.dueAt < next) next = s.dueAt;
  }
  if (next === Infinity) return "Všechny karty jsou připravené, ale nic teď není due.";
  const ms = next - now;
  return `Další karta bude k opakování za ${formatDuration(ms)}.`;
}

/* ---------- Summary ---------- */

interface SummaryProps {
  history: SessionEntry[];
  totalMs: number;
  deck: Deck;
  mode: ReviewMode;
  timedOut: boolean;
  queueLength: number;
  onExit: () => void;
}

function SessionSummary({
  history,
  totalMs,
  deck,
  mode,
  timedOut,
  queueLength,
  onExit,
}: SummaryProps) {
  const counts = { again: 0, hard: 0, good: 0, easy: 0 } as Record<Rating, number>;
  for (const h of history) counts[h.rating]++;
  const total = history.length;
  const correctish = counts.good + counts.easy;
  const accuracy = total ? Math.round((correctish / total) * 100) : 0;
  const avgMs = total ? Math.round(history.reduce((a, h) => a + h.timeMs, 0) / total) : 0;

  const headline = (() => {
    if (mode === "sprint" && timedOut) return "Čas vypršel.";
    if (mode === "sprint") return "Hotovo před časem.";
    if (mode === "boss") return total === 0 ? "Žádné karty." : "Boss poražen.";
    if (total === 0) return "Žádné karty.";
    return "Hotovo.";
  })();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-2xl mx-auto w-full">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-4">
          {modeLabel(mode)} · {deck.title}
        </div>
        <h1 className="display text-6xl sm:text-7xl text-ink mb-3">{headline}</h1>
        <p className="prose text-ink-dim mb-12">
          {total} {plural(total, "karta", "karty", "karet")}
          {mode === "sprint" && ` z ${queueLength}`} · {formatDuration(totalMs)} celkem
          {total > 0 && ` · ø ${formatDuration(avgMs)} / karta`}
        </p>

        {total > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line border-y border-line mb-10">
              {(["again", "hard", "good", "easy"] as const).map((k) => (
                <div key={k} className="px-4 py-4 text-center">
                  <div className="display text-4xl text-ink tabular-nums">
                    {counts[k]}
                  </div>
                  <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-1">
                    {k}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-baseline justify-between data text-sm mb-12">
              <span className="text-ink-muted uppercase tracking-widest text-[10px]">
                accuracy
              </span>
              <span className="text-ink tabular-nums">{accuracy}%</span>
            </div>
          </>
        )}

        <button
          onClick={onExit}
          className="
            data text-sm uppercase tracking-widest
            text-ink hover:text-navy
            transition-colors
            flex items-center gap-2
            min-h-[44px] px-3 -mx-3
          "
        >
          <kbd className="hidden sm:inline-block hairline rounded-sm px-1.5 py-0.5 text-[10px] leading-none bg-surface-elev text-ink-dim">
            esc
          </kbd>
          <span aria-hidden className="sm:hidden">←</span>
          zpět
        </button>
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) {
    const s = totalSec % 60;
    return `${totalMin}m ${s.toString().padStart(2, "0")}s`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return `${h}h ${m.toString().padStart(2, "0")}m`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return `${d}d ${hr}h`;
}
