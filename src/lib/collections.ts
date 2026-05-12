/* ---------- Collection helpers ----------
 *
 * Pure functions over the data model — selectors that resolve a
 * Collection to the set of decks it currently contains, plus the
 * tag-autocomplete source.
 *
 * Why selectors and not store-derived state: resolution depends on
 * `userDecks` AND the built-in decks (`useCombinedContent`). Pulling
 * that into the store would couple the user data layer to the
 * build-time content loader. Selectors run at component read time and
 * are cheap (small N).
 */

import type { Collection, Deck, DeckId } from "@/types";

/** Returns decks belonging to a collection from a given deck universe. */
export function resolveCollection(
  collection: Collection,
  allDecks: Deck[],
): Deck[] {
  if (collection.kind === "manual") {
    // Preserve user's chosen order from the deckIds array.
    const order = new Map<DeckId, number>();
    collection.deckIds.forEach((id, i) => order.set(id, i));
    return allDecks
      .filter((d) => order.has(d.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  // Tag mode: case-sensitive match against deck.tags.
  return allDecks.filter((d) => d.tags?.includes(collection.tag));
}

/** Returns sorted unique tags appearing on any deck. Used by the
 *  tag-mode collection creator for autocomplete. */
export function allTags(allDecks: Deck[]): string[] {
  const set = new Set<string>();
  for (const d of allDecks) {
    for (const t of d.tags ?? []) {
      const trimmed = t.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "cs"));
}

/** Quick member count without materializing the deck objects. */
export function collectionSize(
  collection: Collection,
  allDecks: Deck[],
): number {
  if (collection.kind === "manual") {
    const known = new Set(allDecks.map((d) => d.id));
    return collection.deckIds.filter((id) => known.has(id)).length;
  }
  return allDecks.filter((d) => d.tags?.includes(collection.tag)).length;
}
