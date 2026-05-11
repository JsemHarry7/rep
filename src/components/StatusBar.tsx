import { useCombinedContent } from "@/lib/data";

export function StatusBar() {
  const { decks, cards, builtin } = useCombinedContent();
  const issues = builtin.issues;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div
      className="
        hidden md:flex
        border-t border-line
        bg-surface
        px-4 sm:px-6 py-2
        items-center gap-3 sm:gap-5
        data text-[11px]
        text-ink-dim
        select-none
        flex-wrap
      "
    >
      <Segment label="decks" value={decks.length} />
      <Segment label="cards" value={cards.length} />
      <Segment
        label="issues"
        value={issues.length}
        hint={
          issues.length > 0 ? `${errorCount}E / ${warnCount}W` : undefined
        }
      />
    </div>
  );
}

function Segment({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink">{value}</span>
      {hint && <span className="text-ink-muted">{hint}</span>}
    </span>
  );
}
