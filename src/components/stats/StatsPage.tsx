import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAppStore, ymd } from "@/lib/store";
import { calibrationFromReviews, deckMastery } from "@/lib/srs";
import { useCombinedContent } from "@/lib/data";
import { collectionSize, resolveCollection } from "@/lib/collections";
import { Heatmap } from "./Heatmap";
import { StatGrid } from "@/components/StatGrid";
import type { Deadline, Rating } from "@/types";

export function StatsPage() {
  const [, navigate] = useLocation();
  const allReviews = useAppStore((s) => s.reviews);
  const user = useAppStore((s) => s.user);
  const srsState = useAppStore((s) => s.srsState);
  const deadlines = useAppStore((s) => s.deadlines);
  const collections = useAppStore((s) => s.collections);
  const { decks: universeDecks, cards: universeCards } = useCombinedContent();

  // Collection filter — null = "Všechny", otherwise scope every metric
  // on this page to the decks/cards/reviews belonging to that collection.
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );
  const activeCollection = activeCollectionId
    ? collections.find((c) => c.id === activeCollectionId) ?? null
    : null;

  const allDecks = useMemo(() => {
    if (!activeCollection) return universeDecks;
    return resolveCollection(activeCollection, universeDecks);
  }, [universeDecks, activeCollection]);

  const allCards = useMemo(() => {
    if (!activeCollection) return universeCards;
    const deckIds = new Set(allDecks.map((d) => d.id));
    return universeCards.filter((c) => deckIds.has(c.deckId));
  }, [universeCards, allDecks, activeCollection]);

  const reviews = useMemo(() => {
    if (!activeCollection) return allReviews;
    const cardIds = new Set(allCards.map((c) => c.id));
    return allReviews.filter((r) => cardIds.has(r.cardId));
  }, [allReviews, allCards, activeCollection]);

  const activityByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reviews) {
      const key = ymd(r.timestamp);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [reviews]);

  const totalReviews = reviews.length;
  const totalTimeMs = reviews.reduce((a, r) => a + r.timeMs, 0);
  const uniqueCards = new Set(reviews.map((r) => r.cardId)).size;
  const last7Days = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    return reviews.filter((r) => r.timestamp >= cutoff).length;
  }, [reviews]);
  const dailyRate = last7Days / 7;

  const ratingCounts = useMemo(() => {
    const c: Record<Rating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
    for (const r of reviews) c[r.rating]++;
    return c;
  }, [reviews]);
  const accuracy = totalReviews
    ? Math.round(((ratingCounts.good + ratingCounts.easy) / totalReviews) * 100)
    : 0;

  const deckRows = useMemo(() => {
    return allDecks
      .map((d) => {
        const cardIds = allCards.filter((c) => c.deckId === d.id).map((c) => c.id);
        const m = deckMastery(cardIds, srsState);
        return { deck: d, total: cardIds.length, ...m };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.mastery - a.mastery);
  }, [allDecks, allCards, srsState]);

  const overallMastery =
    deckRows.length > 0
      ? deckRows.reduce((a, r) => a + r.mastery * r.total, 0) /
        deckRows.reduce((a, r) => a + r.total, 0)
      : 0;

  const sortedDeadlines = useMemo(
    () => [...deadlines].sort((a, b) => a.date.localeCompare(b.date)),
    [deadlines],
  );

  const calibration = useMemo(
    () => calibrationFromReviews(reviews),
    [reviews],
  );

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="display text-5xl sm:text-6xl mb-3">Stats.</h1>
        <p className="prose text-base text-ink-dim max-w-prose">
          Tvoje učení v číslech. Aktualizuje se po každém review.
          {activeCollection && (
            <>
              {" "}Filtrováno na kolekci{" "}
              <span className="text-accent">{activeCollection.title}</span>.
            </>
          )}
        </p>
      </header>

      {collections.length > 0 && (
        <div className="mb-8 -mx-2 px-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <StatsChip
              active={activeCollectionId === null}
              onClick={() => setActiveCollectionId(null)}
            >
              Všechny
            </StatsChip>
            {collections.map((c) => {
              const size = collectionSize(c, universeDecks);
              return (
                <StatsChip
                  key={c.id}
                  active={activeCollectionId === c.id}
                  onClick={() => setActiveCollectionId(c.id)}
                >
                  {c.title}
                  <span className="text-ink-muted ml-1.5 tabular-nums">
                    {size}
                  </span>
                </StatsChip>
              );
            })}
          </div>
        </div>
      )}

      {/* Streak callout — single full-width hero, no asymmetry */}
      <section className="mb-3">
        <div className="hairline rounded-md p-5 sm:p-6 bg-surface-elev flex flex-wrap items-baseline justify-between gap-4">
          <div className="min-w-0">
            <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
              streak
            </div>
            <div className="flex items-baseline gap-4">
              <div
                className={`display text-6xl sm:text-7xl tabular-nums leading-none ${user.streakCurrent > 0 ? "text-accent" : "text-ink-muted"}`}
              >
                {user.streakCurrent}
              </div>
              <div className="data text-[11px] uppercase tracking-widest text-ink-dim">
                {user.streakCurrent === 0
                  ? "začni dnes"
                  : user.streakCurrent === 1
                    ? "den v řadě"
                    : user.streakCurrent < 5
                      ? "dny v řadě"
                      : "dnů v řadě"}
              </div>
            </div>
          </div>
          {user.streakLongest > 0 && (
            <div className="text-right">
              <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
                longest
              </div>
              <div className="display text-3xl tabular-nums text-ink">
                {user.streakLongest}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4-stat row */}
      <section className="mb-12">
        <StatGrid
          items={[
            {
              label: "reviews",
              value: totalReviews,
              hint: dailyRate > 0 ? `${dailyRate.toFixed(1)} / den` : "—",
            },
            {
              label: "cards seen",
              value: `${uniqueCards}/${allCards.length}`,
              hint: `${Math.round((uniqueCards / Math.max(1, allCards.length)) * 100)}% pokrytí`,
            },
            {
              label: "time",
              value: formatDuration(totalTimeMs),
              hint:
                totalReviews > 0
                  ? `ø ${Math.round(totalTimeMs / totalReviews / 1000)}s / karta`
                  : "—",
            },
            {
              label: "accuracy",
              value: totalReviews > 0 ? `${accuracy}%` : "—",
              hint:
                totalReviews > 0
                  ? `${ratingCounts.good + ratingCounts.easy} z ${totalReviews}`
                  : "—",
            },
          ]}
        />
      </section>

      {/* Deadlines */}
      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
            termíny
          </h2>
          <button
            onClick={() => navigate("/settings")}
            className="
              data text-[10px] uppercase tracking-widest
              text-ink-dim hover:text-accent
              transition-colors
            "
          >
            upravit v nastavení →
          </button>
        </div>
        {sortedDeadlines.length === 0 ? (
          <button
            onClick={() => navigate("/settings")}
            className="
              w-full text-left
              hairline rounded-md p-5
              bg-surface-elev
              hover:border-line-strong
              transition-colors
            "
          >
            <p className="prose text-sm text-ink-muted">
              Žádné termíny. Klikni a přidej v nastavení.
            </p>
          </button>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedDeadlines.map((d) => (
              <DeadlineCard
                key={d.id}
                deadline={d}
                overallMastery={overallMastery}
                dailyRate={dailyRate}
                totalCards={allCards.length}
                hasData={totalReviews > 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Calibration */}
      {calibration.total >= 3 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
              kalibrace · kdy můžeš sobě věřit
            </h2>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              {calibration.calibrated}/{calibration.total} review
            </span>
          </div>
          <div className="hairline rounded-md p-5 sm:p-6 bg-surface-elev">
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
              <div>
                <div
                  className={`display text-6xl tabular-nums leading-none ${calibration.rate >= 0.75 ? "text-ok" : calibration.rate >= 0.5 ? "text-accent" : "text-bad"}`}
                >
                  {Math.round(calibration.rate * 100)}%
                </div>
                <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-2">
                  tvých „good / easy" hodnocení potvrzeno
                </div>
              </div>
              <p className="prose text-sm text-ink-dim max-w-sm">
                {calibration.rate >= 0.85
                  ? "Sebevědomí ti drží. Když řekneš že umíš, fakt to umíš."
                  : calibration.rate >= 0.7
                    ? "Solidní kalibrace. Občas si pleteš \"good\" s \"hard\", ale spíš pozor na jednotlivé karty."
                    : calibration.rate >= 0.5
                      ? "Mírná nadhodnocenost — někdy si říkáš \"good\" rychleji, než je realita. Buď přísnější."
                      : "Často si říkáš že umíš a pak to padá. Když si nejsi jistý, dej \"hard\" nebo \"again\"."}
              </p>
            </div>
            <div className="h-1.5 bg-surface rounded-sm overflow-hidden hairline">
              <div
                className={`h-full transition-all ${calibration.rate >= 0.75 ? "bg-ok" : calibration.rate >= 0.5 ? "bg-accent" : "bg-bad"}`}
                style={{ width: `${Math.round(calibration.rate * 100)}%` }}
              />
            </div>
            <details className="mt-4">
              <summary className="data text-[10px] uppercase tracking-widest text-ink-muted cursor-pointer hover:text-ink transition-colors inline-flex items-center gap-1">
                <span aria-hidden>?</span> jak se to počítá
              </summary>
              <p className="prose text-sm text-ink-dim mt-3 max-w-prose">
                Pro každou kartu projdu tvoje review v pořadí. Když jsi
                kartu v jednom okamžiku ohodnotil <span className="text-ok">good</span> nebo{" "}
                <span className="text-accent">easy</span>, počítá se tahle
                pozice jako "byl jsi confident". Pak se podívám na DALŠÍ
                review té karty — pokud je taky good/easy, sebevědomí ti
                drželo. Pokud padl na <span className="text-bad">again</span>{" "}
                nebo <span className="text-ink-dim">hard</span>, byl jsi
                přeceněný. Procento je {calibration.calibrated} potvrzených z{" "}
                {calibration.total} confident hodnocení (kde už proběhlo i
                další review).
              </p>
            </details>
          </div>
        </section>
      )}

      {/* Heatmap */}
      <section className="mb-12" data-tour="stats-heatmap">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
            aktivita · 365 dní
          </h2>
          <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
            {activityByDay.size} {plural(activityByDay.size, "den", "dny", "dnů")} aktivních
          </span>
        </div>
        <div className="hairline rounded-md p-4 sm:p-6 bg-surface-elev">
          <Heatmap activityByDay={activityByDay} />
        </div>
      </section>

      {/* Per-deck mastery */}
      {deckRows.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
              mastery podle decků
            </h2>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              celkově {Math.round(overallMastery * 100)}%
            </span>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {deckRows.map((r) => (
              <li key={r.deck.id} className="px-1 py-3 flex items-center gap-3">
                <span className="data text-sm text-ink shrink-0 w-32 sm:w-48 truncate">
                  {r.deck.title}
                </span>
                <div className="flex-1 relative h-1.5 bg-surface-elev rounded-sm overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-navy rounded-sm"
                    style={{ width: `${Math.round(r.mastery * 100)}%` }}
                  />
                </div>
                <span className="data text-xs text-ink tabular-nums w-10 text-right">
                  {Math.round(r.mastery * 100)}%
                </span>
                <span className="data text-[10px] text-ink-muted tabular-nums w-12 text-right hidden sm:inline">
                  {r.seen}/{r.total}
                </span>
                {r.due > 0 && (
                  <span className="data text-[10px] text-accent tabular-nums w-10 text-right hidden sm:inline">
                    {r.due} due
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DeadlineCard({
  deadline,
  overallMastery,
  dailyRate,
  totalCards,
  hasData,
}: {
  deadline: Deadline;
  overallMastery: number;
  dailyRate: number;
  totalCards: number;
  hasData: boolean;
}) {
  const today = ymd(Date.now());
  const daysLeft = daysBetween(today, deadline.date);
  const isPast = daysLeft < 0;
  const projectedAddedReviews = Math.round(dailyRate * Math.max(0, daysLeft));
  const projectedGain =
    totalCards > 0
      ? Math.min(1 - overallMastery, projectedAddedReviews / totalCards / 5)
      : 0;
  const projectedMastery = Math.min(1, overallMastery + projectedGain);

  const dateLabel = new Date(deadline.date + "T00:00:00").toLocaleDateString(
    "cs",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="data text-sm font-semibold text-ink">{deadline.name}</h3>
        <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
          {dateLabel}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <DeadlineMetric
          value={isPast ? `−${Math.abs(daysLeft)}` : `${daysLeft}`}
          label={isPast ? "po termínu" : "dnů"}
          tone={isPast ? "muted" : daysLeft < 14 ? "alert" : "default"}
        />
        <DeadlineMetric
          value={`${Math.round(overallMastery * 100)}%`}
          label="teď"
          tone="default"
        />
        <DeadlineMetric
          value={hasData && !isPast ? `${Math.round(projectedMastery * 100)}%` : "—"}
          label="projekce"
          tone={hasData && !isPast ? "accent" : "muted"}
        />
      </div>
    </div>
  );
}

function DeadlineMetric({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "default" | "muted" | "alert" | "accent";
}) {
  const color =
    tone === "alert"
      ? "text-bad"
      : tone === "accent"
        ? "text-accent"
        : tone === "muted"
          ? "text-ink-muted"
          : "text-ink";
  return (
    <div>
      <div className={`display text-3xl tabular-nums ${color}`}>{value}</div>
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-0.5">
        {label}
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
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00");
  const b = new Date(toYmd + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function StatsChip({
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
