/* ---------- IDs ---------- */
export type DeckId = string;
export type CardId = string;
export type ReviewId = string;

/* ---------- Card variants ----------
 * Discriminated union by `type`. Each variant has the fields needed for
 * its render and review logic. `BaseCard` fields are shared.
 */
export interface BaseCard {
  id: CardId;
  deckId: DeckId;
  tags?: string[];
  createdAt: number;
  /** Free-form notes the user can attach during review. */
  notes?: string;
}

export interface QACard extends BaseCard {
  type: "qa";
  question: string;
  answer: string;
}

export interface ClozeCard extends BaseCard {
  type: "cloze";
  /** Raw text with `{{blank}}` markers preserved. Renderer extracts at runtime. */
  text: string;
}

export interface MCQOption {
  text: string;
  correct: boolean;
}

export interface MCQCard extends BaseCard {
  type: "mcq";
  question: string;
  options: MCQOption[];
  explanation?: string;
}

export interface FreeCard extends BaseCard {
  type: "free";
  /** Open-ended prompt; user types an answer then self-evaluates against the model answer. */
  prompt: string;
  expected: string;
}

export interface CodeCard extends BaseCard {
  type: "code";
  prompt: string;
  language: string;
  expected: string;
}

export type Card = QACard | ClozeCard | MCQCard | FreeCard | CodeCard;
export type CardType = Card["type"];

/* ---------- Decks ---------- */
export type DeckSource = "builtin" | "local" | "cloud";

export interface Deck {
  id: DeckId;
  title: string;
  description?: string;
  tags: string[];
  source: DeckSource;
  /** Path within content/ for builtin decks; undefined otherwise. */
  path?: string;
  createdAt: number;
  updatedAt: number;
}

/* ---------- Review history & SRS ---------- */
export type Rating = "again" | "hard" | "good" | "easy";
export type ReviewMode = "srs" | "cram" | "sprint" | "boss" | "mock" | "mission";

export interface Review {
  id: ReviewId;
  cardId: CardId;
  timestamp: number;
  rating: Rating;
  /** Time from card shown to rating, in ms. */
  timeMs: number;
  mode: ReviewMode;
}

export interface SrsState {
  cardId: CardId;
  /** Ease factor, starts at 2.5, modulated by ratings. */
  ease: number;
  /** Current interval in days. */
  intervalDays: number;
  /** Unix ms when the card is next due. */
  dueAt: number;
  /** How many times the card has lapsed (rating: again). */
  lapses: number;
  /** Total reviews. */
  reps: number;
}

/* ---------- Gamification & user state ---------- */
export interface UserState {
  /** Optional display name used in greeting. `null` = fall back to "uživateli". */
  displayName: string | null;
  /** Whether the user has dismissed the landing page. Set on first "Začít" click. */
  landingSeen: boolean;
  /** Whether the user has completed (or dismissed) the walkthrough at least once. */
  tourSeen: boolean;
  /** Daily review target — reviews/day the user wants to do. */
  dailyGoal: number;
  xp: number;
  level: number;
  streakCurrent: number;
  streakLongest: number;
  /** YYYY-MM-DD of last day with at least one review. */
  lastReviewDate: string | null;
  /** Achievement IDs the user has unlocked. */
  achievements: string[];
  /** Active streak freezes (allow missing a day). */
  freezesAvailable: number;
}

/* ---------- Deadlines ----------
 * User-configurable target dates (maturita, exams, etc.). Stats page
 * projects mastery toward each based on current pace.
 */
export interface Deadline {
  id: string;
  /** Free-form name: "Maturita ústní", "Test z matiky", etc. */
  name: string;
  /** YYYY-MM-DD in local time. */
  date: string;
  /** Optional target mastery 0..1. */
  targetMastery?: number;
}

/* ---------- Collections ----------
 *
 * User-defined grouping over decks. Two flavors:
 *
 *   manual  Explicit list of deck IDs. Stable. If the user deletes a
 *           deck, its id naturally drops out of the resolved member
 *           list (we filter at read time, no FK cascade needed).
 *
 *   tag     Dynamic — membership is "all decks whose tags include
 *           this tag". Resolves at read time, so adding a tag to a
 *           new deck auto-pulls it into the collection.
 *
 * Discriminated union on `kind`. Sharing is intentionally out of
 * scope for v1 of this feature — the model leaves room for it (id
 * is stable, no foreign references), so a later "bundle decks +
 * collection metadata" share endpoint can layer on without
 * migrations.
 */
export type CollectionId = string;

interface BaseCollection {
  id: CollectionId;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ManualCollection extends BaseCollection {
  kind: "manual";
  deckIds: DeckId[];
}

export interface TagCollection extends BaseCollection {
  kind: "tag";
  /** Single tag string. Matches `deck.tags.includes(tag)` case-sensitively. */
  tag: string;
}

export type Collection = ManualCollection | TagCollection;

/* ---------- Aggregates / derived ---------- */
export interface DeckStats {
  deckId: DeckId;
  totalCards: number;
  /** Cards reviewed at least once. */
  seen: number;
  /** Cards with last rating "good" or "easy". */
  known: number;
  /** Cards with last rating "again" or "hard". */
  struggling: number;
  /** SRS-due cards (dueAt <= now). */
  due: number;
  /** Mastery 0..1: weighted by SRS ease + accuracy. */
  mastery: number;
}
