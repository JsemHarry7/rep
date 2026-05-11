import type { Rating } from "@/types";

interface Props {
  revealed: boolean;
  onReveal: () => void;
  onRate: (rating: Rating) => void;
}

interface RatingDef {
  key: string;
  value: Rating;
  label: string;
  hint: string;
}

const ratings: RatingDef[] = [
  { key: "1", value: "again", label: "again", hint: "< 1 min" },
  { key: "2", value: "hard", label: "hard", hint: "~10 min" },
  { key: "3", value: "good", label: "good", hint: "~1 day" },
  { key: "4", value: "easy", label: "easy", hint: "~4 days" },
];

export function RatingBar({ revealed, onReveal, onRate }: Props) {
  if (!revealed) {
    return (
      <div className="
        border-t border-line bg-surface
        px-6 py-5
        pb-[max(1.25rem,env(safe-area-inset-bottom))]
        flex justify-center items-center gap-4
        shrink-0
      ">
        <button
          onClick={onReveal}
          className="
            data text-sm uppercase tracking-widest
            text-ink hover:text-navy
            transition-colors
            flex items-center gap-3
            min-h-[44px] px-4
          "
        >
          <kbd className="hidden sm:inline-block hairline rounded-sm px-2 py-0.5 text-[10px] leading-none bg-surface-elev text-ink-dim">
            space
          </kbd>
          reveal answer
        </button>
        <span className="hidden sm:flex data text-[10px] uppercase tracking-widest text-ink-muted items-center gap-1">
          · textarea uses <kbd className="hairline rounded-sm px-1.5 py-0.5 text-[10px] leading-none bg-surface-elev text-ink-dim">⌘↵</kbd>
        </span>
      </div>
    );
  }
  return (
    <div className="
      border-t border-line bg-surface
      grid grid-cols-4 divide-x divide-line
      pb-[env(safe-area-inset-bottom)]
      shrink-0
    ">
      {ratings.map((r) => (
        <button
          key={r.key}
          onClick={() => onRate(r.value)}
          className="
            px-1 sm:px-3 py-5 sm:py-4
            min-h-[64px] sm:min-h-[60px]
            flex flex-col items-center justify-center gap-1.5
            hover:bg-surface-inset active:bg-surface-inset
            transition-colors
            group
          "
        >
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block hairline rounded-sm px-1.5 py-0.5 text-[10px] leading-none bg-surface-elev text-ink">
              {r.key}
            </kbd>
            <span className="data text-sm sm:text-sm uppercase tracking-widest text-ink">
              {r.label}
            </span>
          </div>
          <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
            {r.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
