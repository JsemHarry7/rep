/* ---------- Markdown card parser ----------
 *
 * Unified format used for both:
 *  1. Built-in decks (.md files in content/)
 *  2. User upload (.md / .txt drag-drop or paste)
 *  3. LLM-generated output (paste-back after running our prompt)
 *
 * Single format = single parser = single mental model.
 *
 * Grammar (intentionally loose):
 *
 *   ---
 *   title: Deck Title
 *   tags: [tag1, tag2]
 *   description: Optional
 *   ---
 *
 *   # Q: <question>
 *   A: <answer>
 *
 *   # CLOZE: <text with {{blanks}}>
 *
 *   # MCQ: <question>
 *   - option
 *   - !correct option           # `!` prefix marks correct (multi-correct allowed)
 *   > optional explanation
 *
 *   # FREE: <prompt>
 *   > expected model answer (single or multi-line until next # or EOF)
 *
 *   # CODE: <prompt>
 *   ```lang
 *   expected code
 *   ```
 *
 * The parser does NOT use a markdown library. It walks lines, splits on
 * `# (TYPE):` headers, and dispatches per type. Errors are reported as
 * `ParseIssue[]` alongside successfully-parsed cards — partial success
 * is fine, we surface issues in the upload preview UI.
 */

import type { Card, CardType, Deck, MCQOption } from "@/types";

export interface ParseIssue {
  /** 1-based line number in source. */
  line: number;
  message: string;
  severity: "error" | "warning";
}

export interface ParsedDeck {
  meta: {
    title?: string;
    description?: string;
    tags: string[];
  };
  /** Cards without assigned id/deckId/createdAt yet — caller assigns. */
  cards: ParsedCard[];
  issues: ParseIssue[];
}

export type ParsedCard =
  | { type: "qa"; question: string; answer: string; tags?: string[] }
  | { type: "cloze"; text: string; tags?: string[] }
  | {
      type: "mcq";
      question: string;
      options: MCQOption[];
      explanation?: string;
      tags?: string[];
    }
  | { type: "free"; prompt: string; expected: string; tags?: string[] }
  | {
      type: "code";
      prompt: string;
      language: string;
      expected: string;
      tags?: string[];
    };

const HEADER_RE = /^#\s+(Q|CLOZE|MCQ|FREE|CODE)\s*:\s*(.*)$/i;
const HEADER_TYPES: Record<string, CardType> = {
  Q: "qa",
  CLOZE: "cloze",
  MCQ: "mcq",
  FREE: "free",
  CODE: "code",
};

export function parseDeckMarkdown(source: string): ParsedDeck {
  const issues: ParseIssue[] = [];
  const lines = source.split(/\r?\n/);

  /* ---- frontmatter ---- */
  const meta: ParsedDeck["meta"] = { tags: [] };
  let bodyStart = 0;

  if (lines[0]?.trim() === "---") {
    const closeIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    if (closeIdx === -1) {
      issues.push({
        line: 1,
        message: "frontmatter opened with --- but no closing --- found",
        severity: "warning",
      });
    } else {
      for (let i = 1; i < closeIdx; i++) {
        const m = lines[i].match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/);
        if (!m) continue;
        const key = m[1].toLowerCase();
        const val = m[2].trim();
        if (key === "title") meta.title = val;
        else if (key === "description") meta.description = val;
        else if (key === "tags") meta.tags = parseTags(val);
      }
      bodyStart = closeIdx + 1;
    }
  }

  /* ---- split into sections by `# TYPE:` headers ---- */
  const sections: { headerLine: number; type: CardType; rest: string; body: string[] }[] = [];
  let current: (typeof sections)[number] | null = null;

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(HEADER_RE);
    if (m) {
      if (current) sections.push(current);
      current = {
        headerLine: i + 1,
        type: HEADER_TYPES[m[1].toUpperCase()],
        rest: m[2].trim(),
        body: [],
      };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  /* ---- parse each section ---- */
  const cards: ParsedCard[] = [];
  for (const sec of sections) {
    const result = parseSection(sec);
    if (result.card) cards.push(result.card);
    issues.push(...result.issues);
  }

  return { meta, cards, issues };
}

function parseSection(sec: {
  headerLine: number;
  type: CardType;
  rest: string;
  body: string[];
}): { card: ParsedCard | null; issues: ParseIssue[] } {
  const issues: ParseIssue[] = [];
  const line = sec.headerLine;
  const trimmedBody = trimTrailingBlanks(sec.body);

  switch (sec.type) {
    case "qa": {
      const question = sec.rest;
      if (!question) {
        issues.push({ line, message: "Q: missing question", severity: "error" });
        return { card: null, issues };
      }
      // Answer is on a line starting with `A:` (or anything if not present).
      const aIdx = trimmedBody.findIndex((l) => /^A\s*:/.test(l));
      let answer: string;
      if (aIdx === -1) {
        answer = trimmedBody.join("\n").trim();
        if (!answer) {
          issues.push({ line, message: "Q: missing answer", severity: "error" });
          return { card: null, issues };
        }
      } else {
        const first = trimmedBody[aIdx].replace(/^A\s*:\s*/, "");
        const rest = trimmedBody.slice(aIdx + 1).join("\n");
        answer = [first, rest].filter(Boolean).join("\n").trim();
      }
      return { card: { type: "qa", question, answer }, issues };
    }

    case "cloze": {
      const text = [sec.rest, ...trimmedBody].filter(Boolean).join("\n").trim();
      if (!text) {
        issues.push({ line, message: "CLOZE: empty text", severity: "error" });
        return { card: null, issues };
      }
      if (!/\{\{[^}]+\}\}/.test(text)) {
        issues.push({
          line,
          message: "CLOZE: no {{blank}} markers found — card will have nothing to fill",
          severity: "warning",
        });
      }
      return { card: { type: "cloze", text }, issues };
    }

    case "mcq": {
      const question = sec.rest;
      if (!question) {
        issues.push({ line, message: "MCQ: missing question", severity: "error" });
        return { card: null, issues };
      }
      const options: MCQOption[] = [];
      let explanation: string | undefined;
      const explLines: string[] = [];
      for (const raw of trimmedBody) {
        const l = raw.trim();
        if (!l) continue;
        if (l.startsWith("- ")) {
          const rest = l.slice(2);
          const correct = rest.startsWith("!");
          options.push({ text: (correct ? rest.slice(1) : rest).trim(), correct });
        } else if (l.startsWith("> ")) {
          explLines.push(l.slice(2));
        } else if (l.startsWith(">")) {
          explLines.push(l.slice(1).trim());
        }
      }
      if (explLines.length) explanation = explLines.join("\n").trim();
      if (options.length < 2) {
        issues.push({ line, message: "MCQ: needs at least 2 options", severity: "error" });
        return { card: null, issues };
      }
      if (!options.some((o) => o.correct)) {
        issues.push({
          line,
          message: "MCQ: no option marked correct (prefix with `- !`)",
          severity: "error",
        });
        return { card: null, issues };
      }
      return { card: { type: "mcq", question, options, explanation }, issues };
    }

    case "free": {
      const prompt = sec.rest;
      if (!prompt) {
        issues.push({ line, message: "FREE: missing prompt", severity: "error" });
        return { card: null, issues };
      }
      const expected = trimmedBody
        .map((l) => (l.startsWith("> ") ? l.slice(2) : l.startsWith(">") ? l.slice(1).trim() : l))
        .join("\n")
        .trim();
      if (!expected) {
        issues.push({
          line,
          message: "FREE: missing expected answer (prefix lines with `>`)",
          severity: "warning",
        });
      }
      return { card: { type: "free", prompt, expected }, issues };
    }

    case "code": {
      const prompt = sec.rest;
      if (!prompt) {
        issues.push({ line, message: "CODE: missing prompt", severity: "error" });
        return { card: null, issues };
      }
      // Find the first fenced code block in the body.
      const fenceStart = trimmedBody.findIndex((l) => /^```/.test(l.trim()));
      if (fenceStart === -1) {
        issues.push({
          line,
          message: "CODE: no fenced code block found",
          severity: "error",
        });
        return { card: null, issues };
      }
      const lang = trimmedBody[fenceStart].trim().replace(/^```/, "").trim() || "txt";
      const fenceEnd = trimmedBody.findIndex(
        (l, i) => i > fenceStart && /^```\s*$/.test(l.trim()),
      );
      if (fenceEnd === -1) {
        issues.push({
          line,
          message: "CODE: code block not closed with ```",
          severity: "error",
        });
        return { card: null, issues };
      }
      const expected = trimmedBody.slice(fenceStart + 1, fenceEnd).join("\n");
      return { card: { type: "code", prompt, language: lang, expected }, issues };
    }
  }
}

function parseTags(raw: string): string[] {
  // Accepts: `[a, b, c]` or `a, b, c`
  const stripped = raw.replace(/^\[|\]$/g, "").trim();
  if (!stripped) return [];
  return stripped
    .split(",")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function trimTrailingBlanks(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && !lines[end - 1].trim()) end--;
  return lines.slice(0, end);
}

/* ---------- Helpers for downstream code ---------- */

/** Generates a stable-ish id from text content + index. Not crypto, just unique enough. */
export function slugify(s: string, max = 32): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

/** Turns a ParsedDeck into a full Deck + Card[] with assigned ids. */
export function materializeDeck(
  parsed: ParsedDeck,
  deckId: string,
  source: Deck["source"],
  path?: string,
): { deck: Deck; cards: Card[] } {
  const now = Date.now();
  const deck: Deck = {
    id: deckId,
    title: parsed.meta.title ?? deckId,
    description: parsed.meta.description,
    tags: parsed.meta.tags,
    source,
    path,
    createdAt: now,
    updatedAt: now,
  };
  const cards: Card[] = parsed.cards.map((c, i) => ({
    ...c,
    id: `${deckId}::${c.type}-${i}-${slugify(cardFingerprint(c))}`,
    deckId,
    createdAt: now,
  }));
  return { deck, cards };
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

/** Extracts {{blank}} segments from a cloze text, returning the answers. */
export function extractClozeBlanks(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g) ?? [];
  return matches.map((m) => m.slice(2, -2));
}

/* ---------- CSV / TSV import ----------
 *
 * Anki's "Export → Cards in Plain Text" yields tab-separated rows like:
 *   "Front"\t"Back"\t"Tags"
 *
 * Other tools use semicolons or commas. We auto-detect the delimiter
 * from the first non-empty line and treat front+back as Q/A.
 *
 * Tags column (if present) is currently ignored — they live on the deck
 * level in our model, not per-card.
 */
export function parseCsvCards(source: string): {
  cards: ParsedCard[];
  issues: ParseIssue[];
} {
  const issues: ParseIssue[] = [];
  const rawLines = source.split(/\r?\n/);
  const lines = rawLines.filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { cards: [], issues };

  const first = lines[0];
  const delim = first.includes("\t")
    ? "\t"
    : first.includes(";")
      ? ";"
      : first.includes(",")
        ? ","
        : "\t";

  const firstLower = first.toLowerCase();
  const isHeader =
    /front|back|question|answer|otazka|odpoved|prední|zadní/.test(firstLower);
  const dataStart = isHeader ? 1 : 0;

  const cards: ParsedCard[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const lineNo = rawLines.indexOf(lines[i]) + 1;
    const cols = splitCsvLine(lines[i], delim);
    if (cols.length < 2) {
      issues.push({
        line: lineNo,
        message: "řádek nemá aspoň 2 sloupce (front + back)",
        severity: "warning",
      });
      continue;
    }
    const front = cols[0]?.trim();
    const back = cols[1]?.trim();
    if (!front || !back) {
      issues.push({
        line: lineNo,
        message: "chybí front nebo back",
        severity: "warning",
      });
      continue;
    }
    cards.push({
      type: "qa",
      question: stripHtml(front),
      answer: stripHtml(back),
    });
  }

  return { cards, issues };
}

/** Strip surrounding quotes from a CSV cell. Doesn't handle escaped quotes
 *  inside cells — fine for Anki's default output. */
function splitCsvLine(line: string, delim: string): string[] {
  return line.split(delim).map((c) => c.replace(/^["']|["']$/g, ""));
}

/** Anki exports often have <b>, <br>, <div> tags. Strip them. */
function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(div|p)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Try MD parser first; if no cards but text looks tabular, try CSV. */
export function autoParseDeck(source: string): ParsedDeck {
  const md = parseDeckMarkdown(source);
  if (md.cards.length > 0) return md;

  const hasMdHeaders = /^#\s+(Q|CLOZE|MCQ|FREE|CODE)\s*:/m.test(source);
  if (hasMdHeaders) return md; // headers present but yielded nothing — keep MD issues
  const hasTabular = /[\t;,]/.test(source.split("\n")[0] ?? "");
  if (!hasTabular) return md;

  const csv = parseCsvCards(source);
  return {
    meta: md.meta,
    cards: csv.cards,
    issues: csv.issues,
  };
}
