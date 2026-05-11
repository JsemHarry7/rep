import { useMemo } from "react";
import { ymd } from "@/lib/store";

interface Props {
  /** Map of YYYY-MM-DD → review count for that day. */
  activityByDay: Map<string, number>;
}

const CELL = 12;
const GAP = 3;
const WEEKS = 53;
const DAYS = 7;

export function Heatmap({ activityByDay }: Props) {
  const { cells, max, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS - 1) * 7);
    const startDay = start.getDay();
    const dowOffset = (startDay + 6) % 7;
    start.setDate(start.getDate() - dowOffset);

    const out: Array<{
      date: string;
      count: number;
      col: number;
      row: number;
      future: boolean;
    }> = [];
    let max = 0;
    const months: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS; d++) {
        const cell = new Date(start);
        cell.setDate(start.getDate() + w * 7 + d);
        const key = ymd(cell.getTime());
        const count = activityByDay.get(key) ?? 0;
        if (count > max) max = count;
        out.push({
          date: key,
          count,
          col: w,
          row: d,
          future: cell > today,
        });
      }
      const firstOfWeek = new Date(start);
      firstOfWeek.setDate(start.getDate() + w * 7);
      if (firstOfWeek.getMonth() !== lastMonth && firstOfWeek.getDate() <= 7) {
        months.push({
          col: w,
          label: firstOfWeek.toLocaleDateString("cs", { month: "short" }),
        });
        lastMonth = firstOfWeek.getMonth();
      }
    }
    return { cells: out, max, monthLabels: months };
  }, [activityByDay]);

  const vbWidth = WEEKS * (CELL + GAP) - GAP;
  const vbHeight = DAYS * (CELL + GAP) - GAP;
  const labelHeight = 16;
  const totalHeight = vbHeight + labelHeight;

  return (
    <div className="w-full">
      <svg
        width="100%"
        viewBox={`0 0 ${vbWidth} ${totalHeight}`}
        preserveAspectRatio="xMidYMin meet"
        className="block"
      >
        {monthLabels.map((m) => (
          <text
            key={m.col}
            x={m.col * (CELL + GAP)}
            y={11}
            className="fill-[var(--color-ink-muted)]"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {m.label}
          </text>
        ))}
        <g transform={`translate(0, ${labelHeight})`}>
          {cells.map((c, i) => (
            <rect
              key={i}
              x={c.col * (CELL + GAP)}
              y={c.row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={c.future ? "transparent" : intensityColor(c.count, max)}
              stroke={c.future ? "var(--color-line)" : "transparent"}
              strokeWidth={c.future ? 1 : 0}
            >
              <title>
                {c.date}: {c.count} {c.count === 1 ? "review" : "reviews"}
              </title>
            </rect>
          ))}
        </g>
      </svg>
      <div className="flex items-center gap-2 mt-3 data text-[10px] uppercase tracking-widest text-ink-muted">
        <span>méně</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="inline-block rounded-sm"
            style={{
              width: 11,
              height: 11,
              background: intensityColor(i === 0 ? 0 : Math.pow(2, i), 16),
            }}
          />
        ))}
        <span>více</span>
      </div>
    </div>
  );
}

function intensityColor(count: number, max: number): string {
  if (count === 0) return "var(--color-line)";
  const ratio = max > 0 ? Math.min(1, count / max) : 0;
  if (ratio < 0.25) return "color-mix(in oklab, var(--color-navy) 30%, var(--color-line))";
  if (ratio < 0.5) return "color-mix(in oklab, var(--color-navy) 55%, var(--color-line))";
  if (ratio < 0.75) return "color-mix(in oklab, var(--color-navy) 75%, var(--color-line))";
  if (ratio < 0.95) return "var(--color-navy)";
  return "var(--color-accent)";
}
