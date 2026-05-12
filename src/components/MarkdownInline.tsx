/* ---------- MarkdownInline ----------
 *
 * Tiny inline-only Markdown renderer. Handles the subset that
 * actually shows up in flashcards:
 *
 *   **bold** | __bold__
 *   *italic* | _italic_
 *   `code`
 *   \*  \`  \\           (backslash escapes)
 *   \n                   → <br />
 *
 * No block-level constructs (headings, lists, paragraphs, blockquotes,
 * code fences) — flashcards are short one-shot strings, not documents.
 * No HTML passthrough, no autolinks. If we ever need more, swap for
 * react-markdown — but a 60-line parser keeps the bundle slim and
 * sidesteps "markdown library updated and broke our cloze parser"
 * problems.
 */

import { Fragment, type ReactNode } from "react";

interface Props {
  children: string;
}

export function MarkdownInline({ children }: Props) {
  if (!children) return null;
  const lines = children.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {parseLine(line)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

/* ---------- core inline parser ---------- */

function parseLine(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let keyN = 0;

  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Backslash escape: \* \` \\ etc. — emit the next char literally.
    if (ch === "\\" && i + 1 < text.length) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    // **bold** or __bold__
    if ((ch === "*" || ch === "_") && text[i + 1] === ch) {
      const closer = ch + ch;
      const end = text.indexOf(closer, i + 2);
      if (end > i + 2) {
        flush();
        out.push(
          <strong key={`s${keyN++}`}>
            {parseLine(text.slice(i + 2, end))}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // *italic* or _italic_
    if (ch === "*" || ch === "_") {
      const end = text.indexOf(ch, i + 1);
      // Require non-empty content and that closer isn't immediately the
      // doubled marker (which would belong to a strong span).
      if (end > i + 1 && text[end + 1] !== ch && text[end - 1] !== ch) {
        flush();
        out.push(
          <em key={`e${keyN++}`}>
            {parseLine(text.slice(i + 1, end))}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    // `code`
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push(
          <code
            key={`c${keyN++}`}
            className="data text-[0.92em] bg-surface-inset rounded-sm px-1.5 py-0.5"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}
