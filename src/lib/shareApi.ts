/* ---------- Share API client ----------
 *
 * Thin wrapper around /api/share. Cloud users create / list / revoke
 * server-stored shares from here; recipients fetch by id from
 * ShareReceivePage. Anyone (cloud or not) can fetch — only writes
 * require a session.
 */

import type { Card, Deck } from "@/types";
import { serializeDeck } from "@/lib/deckExport";

export interface SharedDeckSummary {
  id: string;
  title: string;
  cardCount: number;
  createdAt: number;
  views: number;
}

export interface SharedDeckFull extends SharedDeckSummary {
  deckMd: string;
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

/** Public fetch — no session needed. Returns the full deck payload. */
export async function fetchShare(id: string): Promise<ApiResult<SharedDeckFull>> {
  try {
    const resp = await fetch(`/api/share/${encodeURIComponent(id)}`);
    if (!resp.ok) return await readError(resp);
    return { ok: true, data: (await resp.json()) as SharedDeckFull };
  } catch (e) {
    return { ok: false, status: 0, message: String(e) };
  }
}
