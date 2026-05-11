import type { ReactNode } from "react";

export type StatTone = "ink" | "navy" | "accent" | "bad" | "muted";

export interface StatItem {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: StatTone;
}

interface Props {
  items: StatItem[];
}

const toneClass: Record<StatTone, string> = {
  ink: "text-ink",
  navy: "text-navy",
  accent: "text-accent",
  bad: "text-bad",
  muted: "text-ink-muted",
};

/* ---------- StatGrid ----------
 *
 * 4-item stat row that gracefully wraps to 2×2 on mobile.
 *
 * Borders are managed via nth-child selectors so the layout doesn't end
 * up with a stray vertical line at the start of the wrapped row (the
 * classic `divide-x` problem when items wrap).
 *
 *   Mobile  (grid-cols-2):  [item 0 | item 1]    ← border-r on 0, border-b on 0,1
 *                           [item 2 | item 3]    ← border-r on 2
 *   Desktop (grid-cols-4):  [0 | 1 | 2 | 3]      ← border-r on 0,1,2
 */
export function StatGrid({ items }: Props) {
  return (
    <div
      className="
        grid grid-cols-2 sm:grid-cols-4
        border-y border-line
        [&>*]:px-4 [&>*]:py-4 [&>*]:text-center
        [&>*:nth-child(2n+1)]:border-r [&>*:nth-child(2n+1)]:border-line
        [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line
        sm:[&>*:nth-child(-n+2)]:border-b-0
        sm:[&>*:nth-child(2n+1)]:border-r-0
        sm:[&>*:not(:last-child)]:border-r sm:[&>*:not(:last-child)]:border-line
      "
    >
      {items.map((item, i) => (
        <div key={i}>
          <div
            className={`display text-3xl sm:text-4xl tabular-nums ${toneClass[item.tone ?? "ink"]}`}
          >
            {item.value}
          </div>
          <div className="data text-[10px] uppercase tracking-widest text-ink-muted mt-1">
            {item.label}
          </div>
          {item.hint && (
            <div className="data text-[10px] uppercase tracking-widest text-ink-muted/70 mt-0.5">
              {item.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
