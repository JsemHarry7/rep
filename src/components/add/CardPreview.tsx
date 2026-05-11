import type { ParsedCard } from "@/lib/parser";

interface Props {
  cards: ParsedCard[];
  skipped: Set<number>;
  onToggleSkip: (idx: number) => void;
}

export function CardPreview({ cards, skipped, onToggleSkip }: Props) {
  if (cards.length === 0) {
    return (
      <div className="hairline rounded-md p-6 text-center prose text-sm text-ink-muted italic">
        zatím žádné karty
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {cards.map((c, i) => {
        const isSkipped = skipped.has(i);
        return (
          <li
            key={i}
            className={`px-1 py-2.5 flex items-baseline gap-3 transition-opacity ${isSkipped ? "opacity-30" : ""}`}
          >
            <span className="data text-[10px] text-ink-muted w-6 shrink-0 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted w-14 shrink-0">
              {c.type}
            </span>
            <span
              className={`prose text-sm flex-1 truncate ${isSkipped ? "line-through text-ink-muted" : "text-ink"}`}
            >
              {preview(c)}
            </span>
            <button
              type="button"
              onClick={() => onToggleSkip(i)}
              className="
                shrink-0
                data text-[10px] uppercase tracking-widest
                text-ink-muted hover:text-ink
                transition-colors
                px-2 py-1
              "
            >
              {isSkipped ? "vrátit" : "vyřadit"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function preview(c: ParsedCard): string {
  switch (c.type) {
    case "qa":
      return c.question;
    case "cloze":
      return c.text.replace(/\{\{([^}]+)\}\}/g, "___");
    case "mcq":
      return c.question;
    case "free":
      return c.prompt;
    case "code":
      return c.prompt;
  }
}
