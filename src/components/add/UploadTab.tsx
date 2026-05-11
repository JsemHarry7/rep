import { useMemo, useRef, useState } from "react";
import { autoParseDeck } from "@/lib/parser";
import { useAppStore } from "@/lib/store";
import { CardPreview } from "./CardPreview";
import { DeckPicker, defaultDeckTarget, type DeckTarget } from "./DeckPicker";
import { SaveResult } from "./SaveResult";
import { AgentInstructions } from "./AgentInstructions";
import { Button } from "@/components/ui/Button";

export function UploadTab() {
  const userDecks = useAppStore((s) => s.userDecks);
  const createDeck = useAppStore((s) => s.createDeck);
  const addCards = useAppStore((s) => s.addCards);

  const [source, setSource] = useState("");
  const [target, setTarget] = useState<DeckTarget>(() => defaultDeckTarget(userDecks));
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<{ count: number; deckTitle: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () => (source.trim() ? autoParseDeck(source) : null),
    [source],
  );

  // Detect what format was used so we can show a small hint.
  const detectedFormat = useMemo(() => {
    if (!source.trim()) return null;
    if (/^#\s+(Q|CLOZE|MCQ|FREE|CODE)\s*:/m.test(source)) return "markdown";
    const firstLine = source.split("\n")[0] ?? "";
    if (firstLine.includes("\t")) return "tsv";
    if (firstLine.includes(";")) return "csv (;)";
    if (firstLine.includes(",")) return "csv (,)";
    return null;
  }, [source]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setSource(text);
    setSkipped(new Set());
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = () => {
    if (!parsed || parsed.cards.length === 0) return;
    const keep = parsed.cards.filter((_, i) => !skipped.has(i));
    if (keep.length === 0) return;

    let deckId: string;
    let deckTitle: string;
    if (target.kind === "new") {
      const title = target.title.trim();
      if (!title) return;
      const deck = createDeck({
        title,
        description: parsed.meta.description,
        tags: parsed.meta.tags,
      });
      deckId = deck.id;
      deckTitle = deck.title;
    } else {
      deckId = target.deckId;
      deckTitle = userDecks.find((d) => d.id === deckId)?.title ?? deckId;
    }
    addCards(deckId, keep);
    setSaved({ count: keep.length, deckTitle });
    setSource("");
    setSkipped(new Set());
  };

  if (saved) {
    return <SaveResult result={saved} onContinue={() => setSaved(null)} />;
  }

  const errorCount = parsed?.issues.filter((i) => i.severity === "error").length ?? 0;
  const warnCount = parsed?.issues.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <div className="space-y-8">
      <section>
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          zdroj · markdown
        </div>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            // Only clear when leaving the wrapper itself (not entering a child).
            if (e.currentTarget === e.target) setIsDragging(false);
          }}
          className={`
            relative
            border-2 border-dashed rounded-md bg-surface-elev
            transition-all
            ${isDragging ? "border-navy bg-navy/5" : "border-line hover:border-line-strong"}
          `}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-surface-elev/80">
              <div className="text-center">
                <div className="display text-3xl text-navy mb-1">Pusť sem.</div>
                <div className="data text-[10px] uppercase tracking-widest text-ink-dim">
                  .md / .txt soubor
                </div>
              </div>
            </div>
          )}

          <div className="px-4 pt-3 pb-2 border-b border-line flex items-center justify-between gap-3 flex-wrap">
            <div className="data text-[10px] uppercase tracking-widest text-ink-muted flex items-center gap-2">
              <span aria-hidden>⇣</span>
              <span>přetáhni soubor (.md / .txt / .csv / .tsv) · nebo vlož text níže</span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="data text-[10px] uppercase tracking-widest text-ink-dim hover:text-ink transition-colors"
            >
              vybrat soubor…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.csv,.tsv,text/markdown,text/plain,text/csv,text/tab-separated-values"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
              className="hidden"
            />
          </div>

          <textarea
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setSkipped(new Set());
            }}
            placeholder={
              "# Q: otázka\nA: odpověď\n\n# CLOZE: text s {{vynechanými slovy}}\n\n# MCQ: otázka\n- možnost\n- !správná možnost"
            }
            spellCheck={false}
            className="
              w-full min-h-[14em]
              p-4 data text-sm
              bg-transparent
              resize-y outline-none
              placeholder:text-ink-muted
            "
          />

          <div className="border-t border-line px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              {source.length} znaků
              {detectedFormat && (
                <>
                  <span className="text-ink-muted/70 mx-2">·</span>
                  <span className="text-ink-dim">{detectedFormat}</span>
                </>
              )}
            </span>
            {source && (
              <button
                type="button"
                onClick={() => {
                  setSource("");
                  setSkipped(new Set());
                }}
                className="data text-[10px] uppercase tracking-widest text-ink-muted hover:text-bad transition-colors"
              >
                vymazat
              </button>
            )}
          </div>
        </div>
      </section>

      <AgentInstructions />

      {parsed && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
              náhled ({parsed.cards.length}{" "}
              {plural(parsed.cards.length, "karta", "karty", "karet")})
            </h2>
            {parsed.issues.length > 0 && (
              <span className="data text-[10px] uppercase tracking-widest">
                <span className="text-bad">{errorCount}E</span>
                <span className="text-ink-muted"> / </span>
                <span className="text-warn">{warnCount}W</span>
              </span>
            )}
          </div>
          <CardPreview
            cards={parsed.cards}
            skipped={skipped}
            onToggleSkip={(i) => {
              const next = new Set(skipped);
              if (next.has(i)) next.delete(i);
              else next.add(i);
              setSkipped(next);
            }}
          />
          {parsed.issues.length > 0 && (
            <details className="mt-4">
              <summary className="data text-[10px] uppercase tracking-widest text-ink-muted cursor-pointer hover:text-ink transition-colors">
                chyby a varování ({parsed.issues.length})
              </summary>
              <ul className="mt-2 space-y-1 pl-2">
                {parsed.issues.map((iss, i) => (
                  <li key={i} className="data text-xs text-ink-dim">
                    <span
                      className={
                        iss.severity === "error" ? "text-bad" : "text-warn"
                      }
                    >
                      [{iss.severity === "error" ? "E" : "W"} ř. {iss.line}]
                    </span>{" "}
                    {iss.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {parsed && parsed.cards.length > 0 && (
        <section>
          <DeckPicker userDecks={userDecks} value={target} onChange={setTarget} />
        </section>
      )}

      {parsed && parsed.cards.length > 0 && (
        <Button
          onClick={handleSave}
          disabled={
            (target.kind === "new" && !target.title.trim()) ||
            parsed.cards.length - skipped.size === 0
          }
          variant="primary"
          size="lg"
        >
          Uložit {parsed.cards.length - skipped.size}{" "}
          {plural(parsed.cards.length - skipped.size, "kartu", "karty", "karet")}{" "}
          <span aria-hidden>→</span>
        </Button>
      )}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
