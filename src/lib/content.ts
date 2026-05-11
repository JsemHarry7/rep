/* ---------- Built-in content loader ----------
 *
 * Eagerly imports every .md under content/ at build time, parses each one,
 * and exposes a `{ decks, cards }` snapshot.
 *
 * The deckId comes from the file's path relative to content/, with .md
 * stripped (e.g. `content/demo/getting-started.md` → `demo/getting-started`).
 */

import { materializeDeck, parseDeckMarkdown } from "@/lib/parser";
import type { Card, Deck } from "@/types";

const modules = import.meta.glob("/content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface BuiltinSnapshot {
  decks: Deck[];
  cards: Card[];
  issues: { deckId: string; line: number; message: string; severity: "error" | "warning" }[];
}

let cached: BuiltinSnapshot | null = null;

export function loadBuiltinContent(): BuiltinSnapshot {
  if (cached) return cached;

  const decks: Deck[] = [];
  const cards: Card[] = [];
  const issues: BuiltinSnapshot["issues"] = [];

  for (const [path, source] of Object.entries(modules)) {
    const deckId = path
      .replace(/^\/content\//, "")
      .replace(/\.md$/, "");
    const parsed = parseDeckMarkdown(source);
    const { deck, cards: deckCards } = materializeDeck(parsed, deckId, "builtin", path);
    decks.push(deck);
    cards.push(...deckCards);
    for (const issue of parsed.issues) issues.push({ deckId, ...issue });
  }

  decks.sort((a, b) => a.id.localeCompare(b.id));
  cached = { decks, cards, issues };
  return cached;
}
