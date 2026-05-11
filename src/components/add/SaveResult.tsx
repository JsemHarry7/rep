interface Props {
  result: { count: number; deckTitle: string };
  onContinue: () => void;
}

export function SaveResult({ result, onContinue }: Props) {
  return (
    <div className="hairline border-ok rounded-md p-6 bg-surface-elev">
      <div className="data text-[10px] uppercase tracking-widest text-ok mb-2">
        saved
      </div>
      <p className="prose text-base text-ink mb-1">
        {result.count} {plural(result.count, "karta", "karty", "karet")} přidáno do{" "}
        <span className="data text-sm">{result.deckTitle}</span>
      </p>
      <p className="prose text-sm text-ink-dim mb-4">
        Najdeš je v sekci decks. Localstorage perzistuje, takže refresh OK.
      </p>
      <button
        onClick={onContinue}
        className="
          data text-sm uppercase tracking-widest
          text-ink hover:text-navy
          transition-colors
        "
      >
        add more →
      </button>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
