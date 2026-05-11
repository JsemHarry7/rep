import { useMemo } from "react";
import { useLocation } from "wouter";
import { useAppStore, ymd } from "@/lib/store";
import { selectDueCards } from "@/lib/srs";
import { useCombinedContent } from "@/lib/data";
import { StatGrid } from "@/components/StatGrid";
import { Button } from "@/components/ui/Button";
import type { Deadline } from "@/types";

export function DashboardPage() {
  const [, navigate] = useLocation();
  const reviews = useAppStore((s) => s.reviews);
  const user = useAppStore((s) => s.user);
  const srsState = useAppStore((s) => s.srsState);
  const deadlines = useAppStore((s) => s.deadlines);
  const { decks: allDecks, cards: allCards } = useCombinedContent();

  /* ---------- Today ---------- */
  const today = ymd(Date.now());
  const reviewsToday = useMemo(
    () => reviews.filter((r) => ymd(r.timestamp) === today).length,
    [reviews, today],
  );
  const dueCount = useMemo(
    () => selectDueCards(allCards, srsState).length,
    [allCards, srsState],
  );

  /* ---------- Recent decks (by latest review of any of its cards) ---------- */
  const recentDecks = useMemo(() => {
    const lastTouchedByDeck = new Map<string, number>();
    for (const r of reviews) {
      const card = allCards.find((c) => c.id === r.cardId);
      if (!card) continue;
      const prev = lastTouchedByDeck.get(card.deckId) ?? 0;
      if (r.timestamp > prev) lastTouchedByDeck.set(card.deckId, r.timestamp);
    }
    return [...lastTouchedByDeck.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([deckId, ts]) => ({
        deck: allDecks.find((d) => d.id === deckId)!,
        ts,
      }))
      .filter((x) => x.deck);
  }, [reviews, allCards, allDecks]);

  /* ---------- Next deadline ---------- */
  const nextDeadline = useMemo<Deadline | null>(() => {
    const future = deadlines
      .filter((d) => d.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    return future[0] ?? null;
  }, [deadlines, today]);
  const nextDeadlineDays = nextDeadline
    ? daysBetween(today, nextDeadline.date)
    : null;

  const greetingName = user.displayName?.trim() || "uživateli";
  const dateLabel = new Date().toLocaleDateString("cs", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
      <header className="mb-10" data-tour="greeting">
        <h1 className="display text-5xl sm:text-6xl mb-2">
          Vítej, <span className="italic text-accent">{greetingName}.</span>
        </h1>
        <p className="data text-[11px] uppercase tracking-widest text-ink-muted">
          {dateLabel}
        </p>
      </header>

      {/* Daily goal progress */}
      {user.dailyGoal > 0 && (
        <section className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
              denní cíl
            </h2>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted tabular-nums">
              {reviewsToday} / {user.dailyGoal}
            </span>
          </div>
          <div className="relative h-2 bg-surface-elev rounded-sm overflow-hidden hairline">
            <div
              className={`absolute inset-y-0 left-0 rounded-sm transition-all ${reviewsToday >= user.dailyGoal ? "bg-ok" : "bg-accent"}`}
              style={{
                width: `${Math.min(100, (reviewsToday / user.dailyGoal) * 100)}%`,
              }}
            />
          </div>
          {reviewsToday >= user.dailyGoal && (
            <p className="data text-[10px] uppercase tracking-widest text-ok mt-2">
              ✓ cíl splněn · streak se počítá
            </p>
          )}
        </section>
      )}

      {/* Today's focus */}
      <section className="mb-10" data-tour="focus">
        <div className="hairline rounded-md p-5 sm:p-6 bg-surface-elev flex flex-wrap items-baseline justify-between gap-4">
          <div className="min-w-0">
            <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
              dnes
            </div>
            <h2 className="display text-3xl sm:text-4xl text-ink">
              {dueCount > 0
                ? `${dueCount} ${plural(dueCount, "karta čeká", "karty čekají", "karet čeká")}`
                : "Nic není k opakování."}
            </h2>
            {dueCount === 0 && reviewsToday > 0 && (
              <p className="prose text-sm text-ink-dim mt-1">
                Dneska jsi udělal {reviewsToday} review. SRS plánovač ti dá
                vědět, až bude další karta zralá.
              </p>
            )}
            {dueCount === 0 && reviewsToday === 0 && (
              <p className="prose text-sm text-ink-dim mt-1">
                Buď máš všechno opakované, nebo žádné karty zatím nemáš.
              </p>
            )}
          </div>
          {dueCount > 0 ? (
            <Button onClick={() => navigate("/decks")} variant="primary" className="shrink-0">
              SRS review <span aria-hidden>→</span>
            </Button>
          ) : (
            <Button onClick={() => navigate("/add")} variant="secondary" className="shrink-0">
              <span aria-hidden>+</span> Přidat karty
            </Button>
          )}
        </div>
      </section>

      {/* Quick stats */}
      <section className="mb-10" data-tour="stats">
        <StatGrid
          items={[
            {
              label: "streak",
              value: user.streakCurrent,
              hint:
                user.streakLongest > 0
                  ? `longest ${user.streakLongest}`
                  : "začni dnes",
              tone: user.streakCurrent > 0 ? "accent" : "ink",
            },
            {
              label: "due",
              value: dueCount,
              tone: dueCount > 0 ? "accent" : "ink",
            },
            { label: "dnes", value: reviewsToday },
            { label: "celkem", value: reviews.length },
          ]}
        />
      </section>

      {/* Quick actions */}
      <section className="mb-10" data-tour="actions">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          rychlé akce
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ActionCard
            label="Přidat karty"
            hint="AI · upload · ručně"
            onClick={() => navigate("/add")}
          />
          <ActionCard
            label="Decky"
            hint={`${allDecks.length} celkem`}
            onClick={() => navigate("/decks")}
          />
          <ActionCard
            label="Mock exam"
            hint="20 náhodných · napříč decky"
            onClick={() => navigate("/mock")}
            disabled={allCards.length < 5}
          />
          <ActionCard
            label="Stats"
            hint="heatmap · projekce"
            onClick={() => navigate("/stats")}
          />
        </div>
      </section>

      {/* Two-col layout for recent + deadline */}
      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            naposledy opakované
          </h2>
          {recentDecks.length === 0 ? (
            <p className="prose text-sm text-ink-muted italic">
              Zatím žádné review.
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {recentDecks.map((r) => (
                <li key={r.deck.id}>
                  <button
                    onClick={() => navigate(`/decks/${encodeURIComponent(r.deck.id)}`)}
                    className="
                      w-full text-left
                      px-1 py-2.5
                      flex items-baseline gap-3
                      hover:bg-surface-elev/50
                      transition-colors
                    "
                  >
                    <span className="prose text-sm text-ink truncate flex-1">
                      {r.deck.title}
                    </span>
                    <span className="data text-[10px] uppercase tracking-widest text-ink-muted shrink-0">
                      {relativeTime(r.ts)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            nejbližší termín
          </h2>
          {nextDeadline && nextDeadlineDays !== null ? (
            <button
              onClick={() => navigate("/stats")}
              className="
                w-full text-left
                hairline rounded-md
                p-4 bg-surface-elev
                hover:border-line-strong
                transition-colors
              "
            >
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="data text-sm font-semibold text-ink">
                  {nextDeadline.name}
                </h3>
                <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
                  {new Date(
                    nextDeadline.date + "T00:00:00",
                  ).toLocaleDateString("cs", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div
                className={`display text-4xl tabular-nums ${nextDeadlineDays < 14 ? "text-bad" : "text-ink"}`}
              >
                {nextDeadlineDays}{" "}
                <span className="data text-sm font-normal text-ink-muted uppercase tracking-widest">
                  {plural(nextDeadlineDays, "den", "dny", "dnů")}
                </span>
              </div>
            </button>
          ) : (
            <div className="hairline rounded-md p-4 bg-surface-elev">
              <p className="prose text-sm text-ink-dim mb-3">
                Žádný termín v budoucnosti.
              </p>
              <Button
                onClick={() => navigate("/settings")}
                variant="secondary"
                size="sm"
              >
                Přidat termín →
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ActionCard({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        hairline rounded-md
        px-3 py-4 text-left
        bg-surface-elev
        hover:border-accent
        disabled:hover:border-line
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-colors
        group
      "
    >
      <div className="display text-xl text-ink group-hover:text-accent group-disabled:group-hover:text-ink transition-colors">
        {label}
      </div>
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-1">
        {hint}
      </div>
    </button>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00");
  const b = new Date(toYmd + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "teď";
  if (min < 60) return `${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h`;
  const d = Math.round(hr / 24);
  if (d === 1) return "včera";
  if (d < 7) return `${d} dny`;
  if (d < 30) return `${Math.round(d / 7)} t`;
  return `${Math.round(d / 30)} m`;
}
