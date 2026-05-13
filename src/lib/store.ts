/* ---------- App store ----------
 *
 * Single Zustand store, persisted to localStorage. Holds:
 *  - reviews    history of every reveal/rate cycle
 *  - userDecks  decks user created via the Add UI
 *  - userCards  cards user added via Add UI / upload / AI helper
 *  - srsState   per-card SRS state — ease/interval/due
 *  - user       displayName, daily goal, streak, tour/landing-seen flags
 *  - deadlines  user-configurable target dates
 *
 * Built-in decks/cards (in `content/`) are NOT persisted — they come
 * from the build-time content loader and are merged in App.
 *
 * Storage shape is versioned via the `name` key; bump on breaking changes.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Card,
  CardId,
  Collection,
  CollectionId,
  Deadline,
  Deck,
  DeckId,
  Rating,
  Review,
  SrsState,
  UserState,
} from "@/types";
import type { ParsedCard } from "@/lib/parser";
import { slugify } from "@/lib/parser";
import { initialSrs, nextSRS } from "@/lib/srs";

interface AppState {
  reviews: Review[];
  userDecks: Deck[];
  userCards: Card[];
  srsState: Record<CardId, SrsState>;
  user: UserState;
  deadlines: Deadline[];
  collections: Collection[];
  /** Persistent mapping source → share id. Keys are "deck:<id>" or
   *  "col:<id>". Lets us reuse a single short link per source instead
   *  of spawning a fresh one on every "Sdílet" click. Cleared when the
   *  user revokes from Settings → Sdílené decky. */
  shareLinks: Record<string, string>;

  /** Transient: whether the walkthrough is open right now. Not persisted —
   *  the user shouldn't be re-greeted by the tour on every reload. */
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;

  /* reviews + SRS + streak (single rating action does all three) */
  recordReview: (input: {
    cardId: CardId;
    rating: Rating;
    timeMs: number;
    mode: Review["mode"];
  }) => { review: Review; srs: SrsState };

  /* decks */
  createDeck: (input: {
    title: string;
    description?: string;
    tags?: string[];
  }) => Deck;
  deleteDeck: (id: DeckId) => void;

  /* cards */
  addCards: (deckId: DeckId, cards: ParsedCard[]) => Card[];
  updateCard: (cardId: CardId, patch: Partial<Card>) => void;
  deleteCard: (cardId: CardId) => void;

  /* decks */
  updateDeck: (deckId: DeckId, patch: Partial<Omit<Deck, "id" | "source" | "createdAt">>) => void;

  /* deadlines */
  addDeadline: (input: { name: string; date: string }) => Deadline;
  updateDeadline: (id: string, patch: Partial<Omit<Deadline, "id">>) => void;
  removeDeadline: (id: string) => void;

  /* collections — user-defined groupings of decks (manual or by-tag) */
  createCollection: (
    input:
      | { kind: "manual"; title: string; description?: string; deckIds: DeckId[] }
      | { kind: "tag"; title: string; description?: string; tag: string },
  ) => Collection;
  updateCollection: (
    id: CollectionId,
    patch: Partial<Omit<Collection, "id" | "kind" | "createdAt">>,
  ) => void;
  deleteCollection: (id: CollectionId) => void;

  /* share link bookkeeping (one short link per source) */
  setShareLink: (sourceKey: string, shareId: string) => void;
  clearShareLink: (sourceKey: string) => void;
  /** Find the source key whose share id matches and clear it. Used by
   *  the Settings revoke flow which knows the shareId but not the
   *  source it points back to. No-op if no match. */
  clearShareLinkByShareId: (shareId: string) => void;

  /* user prefs */
  updateUser: (patch: Partial<UserState>) => void;

  /* maintenance */
  resetAll: () => void;
}

const emptyUser: UserState = {
  displayName: null,
  landingSeen: false,
  tourSeen: false,
  dailyGoal: 20,
  xp: 0,
  level: 1,
  streakCurrent: 0,
  streakLongest: 0,
  lastReviewDate: null,
  achievements: [],
  freezesAvailable: 0,
};

const defaultDeadlines: Deadline[] = [];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      reviews: [],
      userDecks: [],
      userCards: [],
      srsState: {},
      user: emptyUser,
      deadlines: defaultDeadlines,
      collections: [],
      shareLinks: {},
      tourOpen: false,
      openTour: () => set({ tourOpen: true }),
      closeTour: () => set({ tourOpen: false }),

      recordReview: ({ cardId, rating, timeMs, mode }) => {
        const now = Date.now();
        const review: Review = {
          id: makeId(),
          cardId,
          timestamp: now,
          timeMs,
          rating,
          mode,
        };
        const prevSrs = get().srsState[cardId] ?? initialSrs(cardId);
        const srs = nextSRS(prevSrs, rating, now);
        const user = bumpStreak(get().user, now);
        set((s) => ({
          reviews: [...s.reviews, review],
          srsState: { ...s.srsState, [cardId]: srs },
          user,
        }));
        return { review, srs };
      },

      createDeck: ({ title, description, tags = [] }) => {
        const now = Date.now();
        const existing = new Set(get().userDecks.map((d) => d.id));
        const base = slugify(title) || `deck-${now}`;
        let id = base;
        let n = 2;
        while (existing.has(id)) id = `${base}-${n++}`;
        const deck: Deck = {
          id,
          title: title.trim() || id,
          description,
          tags,
          source: "local",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ userDecks: [...s.userDecks, deck] }));
        return deck;
      },

      deleteDeck: (id) => {
        set((s) => {
          const key = `deck:${id}`;
          const next: Partial<AppState> = {
            userDecks: s.userDecks.filter((d) => d.id !== id),
            userCards: s.userCards.filter((c) => c.deckId !== id),
          };
          if (key in s.shareLinks) {
            const cleaned = { ...s.shareLinks };
            delete cleaned[key];
            next.shareLinks = cleaned;
          }
          return next;
        });
      },

      addCards: (deckId, parsed) => {
        const now = Date.now();
        const existing = new Set(get().userCards.map((c) => c.id));
        const created: Card[] = parsed.map((p, i) => {
          const fp = cardFingerprint(p);
          let id = `${deckId}::${p.type}-${slugify(fp)}-${now}-${i}`;
          while (existing.has(id)) id = `${id}_`;
          existing.add(id);
          return { ...p, id, deckId, createdAt: now } as Card;
        });
        set((s) => ({
          userCards: [...s.userCards, ...created],
          userDecks: s.userDecks.map((d) =>
            d.id === deckId ? { ...d, updatedAt: now } : d,
          ),
        }));
        return created;
      },

      updateCard: (cardId, patch) => {
        set((s) => ({
          userCards: s.userCards.map((c) =>
            c.id === cardId ? ({ ...c, ...patch } as Card) : c,
          ),
        }));
      },

      deleteCard: (cardId) => {
        set((s) => {
          const nextSrs = { ...s.srsState };
          delete nextSrs[cardId];
          return {
            userCards: s.userCards.filter((c) => c.id !== cardId),
            srsState: nextSrs,
          };
        });
      },

      updateDeck: (deckId, patch) => {
        set((s) => ({
          userDecks: s.userDecks.map((d) =>
            d.id === deckId ? { ...d, ...patch, updatedAt: Date.now() } : d,
          ),
        }));
      },

      addDeadline: ({ name, date }) => {
        const id = makeId();
        const d: Deadline = { id, name: name.trim() || "Termín", date };
        set((s) => ({ deadlines: [...s.deadlines, d] }));
        return d;
      },

      updateDeadline: (id, patch) => {
        set((s) => ({
          deadlines: s.deadlines.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
      },

      removeDeadline: (id) => {
        set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) }));
      },

      createCollection: (input) => {
        const now = Date.now();
        const id = `col-${makeId()}`;
        const base = {
          id,
          title: input.title.trim() || "Nová kolekce",
          description: input.description?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        const collection: Collection =
          input.kind === "manual"
            ? { ...base, kind: "manual", deckIds: [...input.deckIds] }
            : { ...base, kind: "tag", tag: input.tag.trim() };
        set((s) => ({ collections: [...s.collections, collection] }));
        return collection;
      },

      updateCollection: (id, patch) => {
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? ({ ...c, ...patch, updatedAt: Date.now() } as Collection) : c,
          ),
        }));
      },

      deleteCollection: (id) => {
        set((s) => {
          // Also drop any "col:<id>" share-link mapping so deleting a
          // collection that was shared doesn't leave a dangling entry.
          const key = `col:${id}`;
          if (!(key in s.shareLinks)) {
            return { collections: s.collections.filter((c) => c.id !== id) };
          }
          const next = { ...s.shareLinks };
          delete next[key];
          return {
            collections: s.collections.filter((c) => c.id !== id),
            shareLinks: next,
          };
        });
      },

      setShareLink: (sourceKey, shareId) => {
        set((s) => ({
          shareLinks: { ...s.shareLinks, [sourceKey]: shareId },
        }));
      },

      clearShareLink: (sourceKey) => {
        set((s) => {
          if (!(sourceKey in s.shareLinks)) return s;
          const next = { ...s.shareLinks };
          delete next[sourceKey];
          return { shareLinks: next };
        });
      },

      clearShareLinkByShareId: (shareId) => {
        set((s) => {
          const entry = Object.entries(s.shareLinks).find(
            ([, v]) => v === shareId,
          );
          if (!entry) return s;
          const next = { ...s.shareLinks };
          delete next[entry[0]];
          return { shareLinks: next };
        });
      },

      updateUser: (patch) => {
        set((s) => ({ user: { ...s.user, ...patch } }));
      },

      resetAll: () =>
        set({
          reviews: [],
          userDecks: [],
          userCards: [],
          srsState: {},
          user: emptyUser,
          deadlines: defaultDeadlines,
          collections: [],
          shareLinks: {},
        }),
    }),
    {
      name: "rep:v1",
      // Don't persist transient tour state — fresh on every reload.
      partialize: (state) => {
        const { tourOpen: _tourOpen, openTour: _openTour, closeTour: _closeTour, ...rest } = state;
        void _tourOpen;
        void _openTour;
        void _closeTour;
        return rest;
      },
    },
  ),
);

/* ---------- Streak logic ---------- */

function bumpStreak(prev: UserState, now: number): UserState {
  const today = ymd(now);
  if (prev.lastReviewDate === today) return prev; // already counted

  const yesterday = ymd(now - 24 * 60 * 60 * 1000);
  let streakCurrent: number;
  if (prev.lastReviewDate === yesterday) {
    streakCurrent = prev.streakCurrent + 1;
  } else {
    streakCurrent = 1; // either first review ever or streak broken
  }
  return {
    ...prev,
    streakCurrent,
    streakLongest: Math.max(prev.streakLongest, streakCurrent),
    lastReviewDate: today,
  };
}

/** Returns YYYY-MM-DD in local time (so "today" matches the user's clock). */
export function ymd(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ---------- Selectors ---------- */

export function selectReviewsForCard(cardId: CardId) {
  return (s: AppState): Review[] => s.reviews.filter((r) => r.cardId === cardId);
}

export function selectLastRating(cardId: CardId) {
  return (s: AppState): Rating | null => {
    const rs = s.reviews.filter((r) => r.cardId === cardId);
    return rs.length ? rs[rs.length - 1].rating : null;
  };
}

export function selectRatingCounts(s: AppState): Record<Rating, number> {
  const out: Record<Rating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const r of s.reviews) out[r.rating]++;
  return out;
}

/* ---------- Helpers ---------- */

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cardFingerprint(c: ParsedCard): string {
  switch (c.type) {
    case "qa":
      return c.question;
    case "cloze":
      return c.text;
    case "mcq":
      return c.question;
    case "free":
      return c.prompt;
    case "code":
      return c.prompt;
  }
}
