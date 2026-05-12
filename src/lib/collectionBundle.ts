/* ---------- Collection bundle ----------
 *
 * Serialization + import for sharing a collection plus the decks
 * inside it. The bundle is intentionally self-contained — recipients
 * never need access to anything else to make the collection useful.
 *
 * Safety invariant
 * ----------------
 * Import is PURELY ADDITIVE. We only call createDeck / addCards /
 * createCollection on the recipient's store. We never delete, replace,
 * or merge existing decks — even if a deck title or tag collides with
 * something they already own. Worst case the recipient ends up with
 * two decks titled "Maturita 2026"; best case they spot the dup and
 * delete the new one. Data they had before the import is untouched.
 *
 * ID handling
 * -----------
 * The sender's deck IDs are meaningless on the recipient's side
 * (different slugify timestamps, conflicts, etc.). The bundle keeps
 * an `originalId` for each deck so we can map sender→recipient when
 * reconstructing a manual collection (which is a list of deck IDs).
 * Card IDs aren't carried at all; addCards on the recipient side
 * generates fresh ones from the per-card content fingerprint.
 */

import type { Card, Collection, Deck } from "@/types";
import { resolveCollection } from "@/lib/collections";
import { parseDeckMarkdown } from "@/lib/parser";
import { serializeDeck } from "@/lib/deckExport";
import { useAppStore } from "@/lib/store";

export interface CollectionBundleDeck {
  /** Sender-side deck id — used as a join key for manual-mode mapping. */
  originalId: string;
  title: string;
  description?: string;
  tags: string[];
  /** Serialized markdown of this deck's cards (no frontmatter — meta is above). */
  md: string;
}

export interface CollectionBundle {
  /** Format discriminator; bump if the bundle shape changes incompatibly. */
  version: 1;
  /** Collection kind: matches the local Collection type. */
  kind: "manual" | "tag";
  title: string;
  description?: string;
  /** Set when kind === "tag"; the literal tag string. */
  tag?: string;
  /** All bundled decks. For manual collections, in user-chosen order. */
  decks: CollectionBundleDeck[];
}

/* ---------- Build ---------- */

export function buildCollectionBundle(
  collection: Collection,
  allDecks: Deck[],
  allCards: Card[],
): CollectionBundle {
  const memberDecks = resolveCollection(collection, allDecks);
  const decks: CollectionBundleDeck[] = memberDecks.map((d) => {
    const deckCards = allCards.filter((c) => c.deckId === d.id);
    // serializeDeck includes a frontmatter block + cards. For bundle
    // members we want just the cards — meta is on the bundle node.
    // Strip the frontmatter by re-serializing without it.
    const md = serializeDeck(
      { ...d, title: "", description: undefined, tags: [] },
      deckCards,
    )
      .replace(/^---[\s\S]*?---\s*\n/, "")
      .trim();
    return {
      originalId: d.id,
      title: d.title,
      description: d.description,
      tags: d.tags ?? [],
      md,
    };
  });
  return {
    version: 1,
    kind: collection.kind,
    title: collection.title,
    description: collection.description,
    tag: collection.kind === "tag" ? collection.tag : undefined,
    decks,
  };
}

/* ---------- Import ---------- */

export interface ImportSummary {
  /** Number of new decks created on the recipient. */
  decksAdded: number;
  /** Number of new cards added across all new decks. */
  cardsAdded: number;
  /** ID of the new collection on the recipient. */
  collectionId: string;
  /** Title of the new collection (denormalized for the success view). */
  collectionTitle: string;
}

/**
 * Import a bundle into the recipient's local store. Pure-additive: no
 * existing data is read other than to feed createDeck's slug-collision
 * generator. New IDs are minted by the store; we map sender→recipient.
 */
export function importCollectionBundle(bundle: CollectionBundle): ImportSummary {
  if (bundle.version !== 1) {
    throw new Error(
      `Neznámá verze bundle (${bundle.version}). Aktualizuj aplikaci.`,
    );
  }

  const { createDeck, addCards, createCollection } = useAppStore.getState();

  // sender deck id → recipient deck id, used to rebuild manual deckIds
  const idMap = new Map<string, string>();
  let cardsAdded = 0;

  for (const d of bundle.decks) {
    const newDeck = createDeck({
      title: d.title,
      description: d.description,
      tags: d.tags,
    });
    idMap.set(d.originalId, newDeck.id);

    if (d.md && d.md.trim()) {
      const parsed = parseDeckMarkdown(d.md);
      if (parsed.cards.length > 0) {
        const added = addCards(newDeck.id, parsed.cards);
        cardsAdded += added.length;
      }
    }
  }

  // Build the collection AFTER all decks exist so we have all id-map entries.
  let newCollection;
  if (bundle.kind === "manual") {
    const newDeckIds = bundle.decks
      .map((d) => idMap.get(d.originalId))
      .filter((id): id is string => typeof id === "string");
    newCollection = createCollection({
      kind: "manual",
      title: bundle.title,
      description: bundle.description,
      deckIds: newDeckIds,
    });
  } else {
    // Tag mode: just store the tag string. The bundled decks already
    // carry the tag in their tags array (we passed it via createDeck
    // above), so the collection resolves to them automatically.
    newCollection = createCollection({
      kind: "tag",
      title: bundle.title,
      description: bundle.description,
      tag: bundle.tag ?? "",
    });
  }

  return {
    decksAdded: bundle.decks.length,
    cardsAdded,
    collectionId: newCollection.id,
    collectionTitle: newCollection.title,
  };
}
