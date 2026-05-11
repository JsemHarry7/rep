/* ---------- SRS scheduler ----------
 *
 * Anki SM-2-style spaced repetition. Each card keeps an `SrsState` with
 * ease factor, current interval, due timestamp, and lapse/rep counters.
 *
 * On each review, `nextSRS(prev, rating)` returns the next state. Pure
 * function — caller persists the result.
 *
 * Simplifications vs. full Anki:
 *  - No separate "learning queue" with multi-step graduation. Again/Hard
 *    just sets a short interval (minutes) and continues; the next session
 *    surfaces the card again because it's due.
 *  - No fuzz on intervals. Predictable for testing; humans don't care.
 *  - 18 days to maturita: long-term ease tuning irrelevant.
 *
 * Tuned for short-horizon cramming (weeks, not years).
 */

import type { Rating, SrsState, CardId } from "@/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MIN_EASE = 1.3;
const STARTING_EASE = 2.5;

/** Initial state for a never-reviewed card. */
export function initialSrs(cardId: CardId): SrsState {
  return {
    cardId,
    ease: STARTING_EASE,
    intervalDays: 0,
    dueAt: Date.now(),
    lapses: 0,
    reps: 0,
  };
}

/** Compute next state given previous + rating + when the review happened. */
export function nextSRS(
  prev: SrsState,
  rating: Rating,
  now: number = Date.now(),
): SrsState {
  let { ease, intervalDays, lapses, reps } = prev;
  reps += 1;

  switch (rating) {
    case "again":
      // Lapse: knock down ease, surface in ~1 minute.
      lapses += 1;
      ease = Math.max(MIN_EASE, ease - 0.2);
      intervalDays = 1 / (24 * 60); // 1 minute
      break;

    case "hard":
      // Knew it, but barely. Reduce ease, modest interval growth.
      ease = Math.max(MIN_EASE, ease - 0.15);
      if (intervalDays === 0) {
        intervalDays = 10 / (24 * 60); // 10 min for first-review hard
      } else {
        intervalDays = Math.max(intervalDays * 1.2, 10 / (24 * 60));
      }
      break;

    case "good":
      // Standard recall. Ease unchanged.
      if (intervalDays === 0) intervalDays = 1; // first review: 1 day
      else intervalDays = intervalDays * ease;
      break;

    case "easy":
      // Too easy. Bump ease, accelerate interval.
      ease += 0.15;
      if (intervalDays === 0) intervalDays = 4; // first review: 4 days
      else intervalDays = intervalDays * ease * 1.3;
      break;
  }

  return {
    cardId: prev.cardId,
    ease,
    intervalDays,
    lapses,
    reps,
    dueAt: now + intervalDays * MS_PER_DAY,
  };
}

/** Cards eligible for SRS review right now (due ≤ now). */
export function selectDueCards<T extends { id: CardId }>(
  cards: T[],
  srsByCard: Record<CardId, SrsState>,
  now: number = Date.now(),
): T[] {
  return cards.filter((c) => {
    const s = srsByCard[c.id];
    if (!s) return true; // never reviewed = due immediately
    return s.dueAt <= now;
  });
}

/** Sort due cards: most-overdue first, then never-reviewed last. */
export function sortDueCards<T extends { id: CardId }>(
  cards: T[],
  srsByCard: Record<CardId, SrsState>,
): T[] {
  return [...cards].sort((a, b) => {
    const sa = srsByCard[a.id];
    const sb = srsByCard[b.id];
    // Never reviewed last (so the user clears overdue first).
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    // More overdue first.
    return sa.dueAt - sb.dueAt;
  });
}

/* ---------- Calibration ----------
 *
 * For every consecutive pair of reviews of the same card where the
 * FIRST rating was "confident" (good or easy), did the FOLLOW-UP
 * confirm? If the user said "good" and the next review (after the
 * scheduled interval) was also good/easy, they were calibrated.
 * If they then dropped to again/hard, they were over-confident.
 *
 * Returns rate ∈ [0, 1] and the underlying counts. Needs ≥ 1 pair
 * to be meaningful; the caller decides when to show it.
 */
export interface CalibrationResult {
  calibrated: number;
  total: number;
  rate: number;
}

export function calibrationFromReviews(
  reviews: Array<{ cardId: CardId; rating: import("@/types").Rating; timestamp: number }>,
): CalibrationResult {
  const byCard = new Map<CardId, typeof reviews>();
  for (const r of reviews) {
    const arr = byCard.get(r.cardId) ?? [];
    arr.push(r);
    byCard.set(r.cardId, arr);
  }
  let calibrated = 0;
  let total = 0;
  for (const list of byCard.values()) {
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      if (cur.rating !== "good" && cur.rating !== "easy") continue;
      total++;
      const next = sorted[i + 1];
      if (next.rating === "good" || next.rating === "easy") calibrated++;
    }
  }
  return { calibrated, total, rate: total > 0 ? calibrated / total : 0 };
}

/** Per-deck mastery: weighted by SRS state. 0..1. */
export function deckMastery(
  cardIds: CardId[],
  srsByCard: Record<CardId, SrsState>,
): { mastery: number; seen: number; known: number; struggling: number; due: number } {
  if (cardIds.length === 0) {
    return { mastery: 0, seen: 0, known: 0, struggling: 0, due: 0 };
  }
  const now = Date.now();
  let seen = 0;
  let known = 0;
  let struggling = 0;
  let due = 0;
  let totalScore = 0;
  for (const id of cardIds) {
    const s = srsByCard[id];
    if (!s) continue;
    seen += 1;
    if (s.dueAt <= now) due += 1;
    // "Known" if ease is comfortable AND has positive intervals.
    if (s.ease >= 2.3 && s.intervalDays >= 1 && s.lapses === 0) known += 1;
    if (s.lapses >= 2 || s.ease < 1.8) struggling += 1;
    // Score: combination of ease (normalised) and stability (interval).
    // Caps at 1 when interval ≥ 21 days with healthy ease.
    const easeScore = Math.min(1, Math.max(0, (s.ease - 1.3) / 1.2));
    const stabilityScore = Math.min(1, s.intervalDays / 21);
    totalScore += (easeScore * 0.4 + stabilityScore * 0.6) * 0.9;
    // Bonus for reps without lapses.
    if (s.lapses === 0 && s.reps >= 2) totalScore += 0.1;
  }
  const mastery = totalScore / cardIds.length;
  return { mastery: Math.min(1, mastery), seen, known, struggling, due };
}
