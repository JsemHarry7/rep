/* ---------- Deck export & share encoding ----------
 *
 * Roundtripable: serializeDeck → parseDeckMarkdown gives back the same
 * cards. Used by:
 *   - Sdílet → kopírovat markdown / stáhnout .md
 *   - Sdílet → linkem (encoded into URL hash)
 *
 * Share URLs encode markdown as base64url. Czech chars + UTF-8 are
 * handled via TextEncoder. No compression yet — base64 of typical 10–20
 * card decks fits well under URL limits. If a deck grows past ~4 KB
 * encoded, the share dialog falls back to "download .md" guidance.
 */

import type { Card, Deck } from "@/types";
import { parseDeckMarkdown, slugify, type ParsedDeck } from "@/lib/parser";

export const SHARE_URL_SOFT_LIMIT = 4000;

export function serializeDeck(deck: Deck, cards: Card[]): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push("---");
  if (deck.title) lines.push(`title: ${deck.title}`);
  if (deck.description) lines.push(`description: ${deck.description}`);
  if (deck.tags.length) lines.push(`tags: [${deck.tags.join(", ")}]`);
  lines.push("---");
  lines.push("");

  for (const card of cards) {
    switch (card.type) {
      case "qa":
        lines.push(`# Q: ${card.question}`);
        lines.push(`A: ${card.answer}`);
        break;
      case "cloze":
        lines.push(`# CLOZE: ${card.text}`);
        break;
      case "mcq":
        lines.push(`# MCQ: ${card.question}`);
        for (const opt of card.options) {
          lines.push(`- ${opt.correct ? "!" : ""}${opt.text}`);
        }
        if (card.explanation) lines.push(`> ${card.explanation}`);
        break;
      case "free":
        lines.push(`# FREE: ${card.prompt}`);
        for (const ln of card.expected.split("\n")) {
          lines.push(`> ${ln}`);
        }
        break;
      case "code":
        lines.push(`# CODE: ${card.prompt}`);
        lines.push("```" + (card.language || "txt"));
        lines.push(card.expected);
        lines.push("```");
        break;
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportDeckFilename(deck: Deck): string {
  const slug = slugify(deck.title) || "deck";
  return `${slug}.md`;
}

/** Trigger a browser download of the deck as .md. */
export function downloadDeckMd(deck: Deck, cards: Card[]) {
  const md = serializeDeck(deck, cards);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportDeckFilename(deck);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- URL-safe base64 + UTF-8 ---------- */

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let s = "";
  // Avoid spread-on-large-array stack overflow.
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(b64: string): string {
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(deck: Deck, cards: Card[]): string {
  const md = serializeDeck(deck, cards);
  const encoded = base64UrlEncode(md);
  const origin = window.location.origin;
  return `${origin}/share#${encoded}`;
}

export function parseShareHash(hash: string): ParsedDeck | { error: string } {
  // Strip leading # if present.
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!clean) return { error: "Sdílený odkaz neobsahuje žádná data." };
  let md: string;
  try {
    md = base64UrlDecode(clean);
  } catch {
    return { error: "Odkaz je poškozený nebo neúplný." };
  }
  return parseDeckMarkdown(md);
}
