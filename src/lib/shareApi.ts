/* ---------- Share API client ----------
 *
 * Thin wrapper around /api/share. Cloud users create / list / revoke
 * server-stored shares from here; recipients fetch by id from
 * ShareReceivePage. Anyone (cloud or not) can fetch — only writes
 * require a session.
 */

import type { Card, Collection, Deck } from "@/types";
import { serializeDeck } from "@/lib/deckExport";
import {
  buildCollectionBundle,
  type CollectionBundle,
} from "@/lib/collectionBundle";

export type ShareKind = "deck" | "collection";

export interface SharedDeckSummary {
  id: string;
  title: string;
  cardCount: number;
  kind: ShareKind;
  createdAt: number;
  views: number;
}

export interface SharedDeckFull extends SharedDeckSummary {
  /** Markdown payload when kind === "deck". */
  deckMd: string | null;
  /** Parsed bundle when kind === "collection". */
  bundle: CollectionBundle | null;
}

interface CreateResponse {
  id: string;
  url: string;
  createdAt: number;
}

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string };

async function readError(resp: Response): Promise<ApiResult<never>> {
  const body = (await resp.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return {
    ok: false,
    status: resp.status,
    message: body.message ?? `Request failed (${resp.status})`,
    code: body.error,
  };
}

export async function createShare(
  deck: Deck,
  cards: Card[],
): Promise<ApiResult<CreateResponse>> {
  const deckMd = serializeDeck(deck, cards);
  try {
    const resp = await fetch("/api/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "deck",
        deckMd,
        title: deck.title,
        cardCount: cards.length,
      }),
    });
    if (!resp.ok) return await readError(resp);
    return { ok: true, data: (await resp.json()) as CreateResponse };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}

export async function createCollectionShare(
  collection: Collection,
  allDecks: Deck[],
  allCards: Card[],
): Promise<ApiResult<CreateResponse>> {
  const bundle = buildCollectionBundle(collection, allDecks, allCards);
  const bundleJson = JSON.stringify(bundle);
  const totalCards = bundle.decks.reduce(
    (sum, d) => sum + countCardsInMd(d.md),
    0,
  );
  try {
    const resp = await fetch("/api/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "collection",
        bundle: bundleJson,
        title: collection.title,
        cardCount: totalCards,
      }),
    });
    if (!resp.ok) return await readError(resp);
    return { ok: true, data: (await resp.json()) as CreateResponse };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}

/** Rough heuristic — count `# Q:` / `# CLOZE:` / etc. lines. Used
 *  only for stats display, not parsing. */
function countCardsInMd(md: string): number {
  return (md.match(/^#\s+(Q|CLOZE|MCQ|FREE|CODE)\s*:/gim) ?? []).length;
}

export async function listMyShares(): Promise<ApiResult<SharedDeckSummary[]>> {
  try {
    const resp = await fetch("/api/share", { credentials: "include" });
    if (!resp.ok) return await readError(resp);
    const body = (await resp.json()) as { shares: SharedDeckSummary[] };
    return { ok: true, data: body.shares };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}

export async function revokeShare(id: string): Promise<ApiResult<true>> {
  try {
    const resp = await fetch(`/api/share/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!resp.ok) return await readError(resp);
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}

/** Public fetch — no session needed. Returns the full deck payload OR
 *  a collection bundle, depending on the share kind. */
export async function fetchShare(id: string): Promise<ApiResult<SharedDeckFull>> {
  try {
    const resp = await fetch(`/api/share/${encodeURIComponent(id)}`);
    if (!resp.ok) return await readError(resp);
    const body = (await resp.json()) as {
      id: string;
      title: string;
      cardCount: number;
      kind: ShareKind;
      deckMd: string | null;
      bundle: string | null;
      createdAt: number;
      views: number;
    };
    // Server returns `bundle` as a JSON string in the column. Parse it
    // here so the rest of the client deals with a typed object.
    let bundle: CollectionBundle | null = null;
    if (body.kind === "collection" && body.bundle) {
      try {
        bundle = JSON.parse(body.bundle) as CollectionBundle;
      } catch {
        return {
          ok: false,
          status: 500,
          message: "Bundle je poškozený — nepodařilo se parsovat.",
        };
      }
    }
    return {
      ok: true,
      data: {
        id: body.id,
        title: body.title,
        cardCount: body.cardCount,
        kind: body.kind,
        deckMd: body.deckMd,
        bundle,
        createdAt: body.createdAt,
        views: body.views,
      },
    };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}
