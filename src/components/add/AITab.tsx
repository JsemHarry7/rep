import { useMemo, useState } from "react";
import { parseDeckMarkdown } from "@/lib/parser";
import { useAppStore } from "@/lib/store";
import { presets, type Preset } from "./prompts";
import { CardPreview } from "./CardPreview";
import { DeckPicker, defaultDeckTarget, type DeckTarget } from "./DeckPicker";
import { SaveResult } from "./SaveResult";
import { Button } from "@/components/ui/Button";

type Step = "source" | "prompt" | "response";

export function AITab() {
  const userDecks = useAppStore((s) => s.userDecks);
  const createDeck = useAppStore((s) => s.createDeck);
  const addCards = useAppStore((s) => s.addCards);

  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState("");
  const [presetId, setPresetId] = useState<string>("mixed-oral");
  const [response, setResponse] = useState("");
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState<DeckTarget>(() => defaultDeckTarget(userDecks));
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<{ count: number; deckTitle: string } | null>(null);

  const preset: Preset = presets.find((p) => p.id === presetId) ?? presets[0];
  const prompt = useMemo(
    () => (source.trim() ? preset.build(source) : ""),
    [source, preset],
  );

  const responseClean = useMemo(() => stripFences(response), [response]);
  const parsed = useMemo(
    () => (responseClean.trim() ? parseDeckMarkdown(responseClean) : null),
    [responseClean],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      const el = document.getElementById("rep-prompt-text");
      if (el && "select" in el) (el as HTMLTextAreaElement).select();
    }
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
    setResponse("");
    setSkipped(new Set());
    setStep("source");
  };

  if (saved) {
    return <SaveResult result={saved} onContinue={() => setSaved(null)} />;
  }

  const errorCount = parsed?.issues.filter((i) => i.severity === "error").length ?? 0;
  const warnCount = parsed?.issues.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <div className="space-y-10">
      <StepHeader
        steps={[
          { id: "source", label: "zdroj", hint: "vlož materiál nebo téma" },
          { id: "prompt", label: "prompt", hint: "zkopíruj → AI" },
          { id: "response", label: "odpověď", hint: "vlož zpátky" },
        ]}
        active={step}
        onPick={setStep}
        unlocked={{
          source: true,
          prompt: source.trim().length > 0,
          response: source.trim().length > 0,
        }}
      />

      {step === "source" && (
        <section>
          <Field
            label="zápisky / zdroj / téma"
            hint="vlož cokoliv: kapitolu z učebnice, vlastní poznámky, transcript videa — nebo jen název tématu"
          >
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={
                "Vlož sem zápisky, zdrojový text, nebo jen téma…\n\nNapř.:\n  • Romeo a Julie\n  • Pythagorova věta\n  • {nakopírovaná kapitola z učebnice}"
              }
              rows={16}
              className="form-textarea"
            />
          </Field>
          <div className="flex items-center justify-between mt-2">
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              {source.length} znaků · ~{Math.ceil(source.length / 4)} tokenů
            </span>
            <Button
              onClick={() => setStep("prompt")}
              disabled={!source.trim()}
              variant="ghost"
            >
              Dál: vybrat preset <span aria-hidden>→</span>
            </Button>
          </div>
        </section>
      )}

      {step === "prompt" && (
        <>
          <section>
            <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
              preset
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`
                    hairline rounded-md
                    px-4 py-3
                    text-left
                    transition-colors
                    ${
                      presetId === p.id
                        ? "border-navy bg-surface-elev"
                        : "bg-surface-elev hover:border-line-strong"
                    }
                  `}
                >
                  <div className="data text-sm font-semibold text-ink mb-1">
                    {p.label}
                  </div>
                  <div className="prose text-xs text-ink-dim">{p.description}</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <div className="data text-[10px] uppercase tracking-widest text-ink-muted">
                vygenerovaný prompt
              </div>
              <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
                {prompt.length} znaků · ~{Math.ceil(prompt.length / 4)} tokenů
              </span>
            </div>
            <textarea
              id="rep-prompt-text"
              value={prompt}
              readOnly
              rows={10}
              className="form-textarea data text-xs"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <Button onClick={handleCopy} variant="primary">
                {copied ? "Zkopírováno ✓" : "Kopírovat prompt"}
              </Button>
              <Button onClick={() => setStep("response")} variant="ghost">
                Dál: vložit odpověď <span aria-hidden>→</span>
              </Button>
            </div>
            <p className="prose text-xs text-ink-dim mt-4 max-w-prose">
              Otevři <span className="data">chatgpt.com</span>,{" "}
              <span className="data">claude.ai</span> nebo{" "}
              <span className="data">gemini.google.com</span>, vlož prompt,
              odpověď zkopíruj a vlož v dalším kroku. Pomocník nic neposílá
              sám — celý flow je tvůj.
            </p>
          </section>
        </>
      )}

      {step === "response" && (
        <>
          <section>
            <Field
              label="odpověď z AI"
              hint="vlož odpověď z ChatGPT / Claude / Gemini — parser ji rozseká na karty"
            >
              <textarea
                value={response}
                onChange={(e) => {
                  setResponse(e.target.value);
                  setSkipped(new Set());
                }}
                placeholder={"# Q: …\nA: …\n\n# CLOZE: …"}
                rows={10}
                className="form-textarea data text-xs"
                spellCheck={false}
              />
            </Field>
          </section>

          {parsed && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
                  náhled ({parsed.cards.length} {plural(parsed.cards.length, "karta", "karty", "karet")})
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
        </>
      )}
    </div>
  );
}

function StepHeader({
  steps,
  active,
  onPick,
  unlocked,
}: {
  steps: { id: Step; label: string; hint: string }[];
  active: Step;
  onPick: (s: Step) => void;
  unlocked: Record<Step, boolean>;
}) {
  return (
    <nav className="grid grid-cols-3 divide-x divide-line border-y border-line">
      {steps.map((s, i) => {
        const isActive = s.id === active;
        const canPick = unlocked[s.id];
        return (
          <button
            key={s.id}
            onClick={() => canPick && onPick(s.id)}
            disabled={!canPick}
            className={`
              px-3 sm:px-4 py-3 text-left
              transition-colors
              ${
                isActive
                  ? "bg-surface-elev"
                  : canPick
                  ? "hover:bg-surface-elev"
                  : "opacity-40 cursor-not-allowed"
              }
            `}
          >
            <div className="data text-[10px] uppercase tracking-widest text-ink-muted">
              <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="mx-1">·</span>
              <span>{s.label}</span>
            </div>
            <div className="data text-[11px] sm:text-xs text-ink mt-0.5 truncate">
              {s.hint}
            </div>
          </button>
        );
      })}
    </nav>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">
        {label}
        {hint && (
          <span className="text-ink-muted/80 normal-case tracking-wide ml-2">
            · {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:markdown|md)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
