/* ---------- Combined deck/card data ----------
 *
 * Shared selector hook. Merges build-time built-in content with the
 * Zustand store's user-created content. Used by every route that needs
 * to see "all decks" or "all cards".
 *
 * User decks come first (latest createdAt on top) so the user's own
 * work is foregrounded over demo content.
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { loadBuiltinContent } from "@/lib/content";
import type { Card, Deck } from "@/types";

export interface CombinedContent {
  decks: Deck[];
  cards: Card[];
  builtin: ReturnType<typeof loadBuiltinContent>;
}

export function useCombinedContent(): CombinedContent {
  const userDecks = useAppStore((s) => s.userDecks);
  const userCards = useAppStore((s) => s.userCards);
  const builtin = useMemo(() => loadBuiltinContent(), []);

  return useMemo(() => {
    const userSorted = [...userDecks].sort((a, b) => b.createdAt - a.createdAt);
    return {
      decks: [...userSorted, ...builtin.decks],
      cards: [...userCards, ...builtin.cards],
      builtin,
    };
  }, [userDecks, userCards, builtin]);
}
