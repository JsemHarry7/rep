import { useState } from "react";
import { useAppStore } from "@/lib/store";
import type { CardType, MCQOption } from "@/types";
import type { ParsedCard } from "@/lib/parser";
import { DeckPicker, defaultDeckTarget, type DeckTarget } from "./DeckPicker";
import { Button } from "@/components/ui/Button";

const types: { id: CardType; label: string; hint: string }[] = [
  { id: "qa", label: "Q/A", hint: "otázka → odpověď" },
  { id: "cloze", label: "Cloze", hint: "doplňovačka" },
  { id: "mcq", label: "MCQ", hint: "výběr z možností" },
  { id: "free", label: "Free", hint: "open recall" },
  { id: "code", label: "Code", hint: "kód" },
];

interface MCQState {
  question: string;
  options: MCQOption[];
  explanation: string;
}

const emptyQA = { question: "", answer: "" };
const emptyMCQ: MCQState = {
  question: "",
  options: [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ],
  explanation: "",
};
const emptyFree = { prompt: "", expected: "" };
const emptyCode = { prompt: "", language: "ts", expected: "" };

export function ManualTab() {
  const userDecks = useAppStore((s) => s.userDecks);
  const createDeck = useAppStore((s) => s.createDeck);
  const addCards = useAppStore((s) => s.addCards);

  const [target, setTarget] = useState<DeckTarget>(() => defaultDeckTarget(userDecks));
  const [type, setType] = useState<CardType>("qa");
  const [toast, setToast] = useState<string | null>(null);

  const [qa, setQA] = useState(emptyQA);
  const [cloze, setCloze] = useState("");
  const [mcq, setMCQ] = useState<MCQState>(emptyMCQ);
  const [free, setFree] = useState(emptyFree);
  const [code, setCode] = useState(emptyCode);

  const buildCard = (): ParsedCard | null => {
    switch (type) {
      case "qa":
        if (!qa.question.trim() || !qa.answer.trim()) return null;
        return { type: "qa", question: qa.question.trim(), answer: qa.answer.trim() };
      case "cloze":
        if (!cloze.trim()) return null;
        return { type: "cloze", text: cloze.trim() };
      case "mcq": {
        if (!mcq.question.trim()) return null;
        const opts = mcq.options.filter((o) => o.text.trim());
        if (opts.length < 2) return null;
        if (!opts.some((o) => o.correct)) return null;
        return {
          type: "mcq",
          question: mcq.question.trim(),
          options: opts.map((o) => ({ ...o, text: o.text.trim() })),
          explanation: mcq.explanation.trim() || undefined,
        };
      }
      case "free":
        if (!free.prompt.trim() || !free.expected.trim()) return null;
        return {
          type: "free",
          prompt: free.prompt.trim(),
          expected: free.expected.trim(),
        };
      case "code":
        if (!code.prompt.trim() || !code.expected.trim()) return null;
        return {
          type: "code",
          prompt: code.prompt.trim(),
          language: code.language.trim() || "txt",
          expected: code.expected,
        };
    }
  };

  const card = buildCard();
  const valid =
    card !== null && (target.kind === "existing" || target.title.trim() !== "");

  const reset = () => {
    setQA(emptyQA);
    setCloze("");
    setMCQ(emptyMCQ);
    setFree(emptyFree);
    setCode(emptyCode);
  };

  const handleSave = () => {
    if (!card || !valid) return;
    let deckId: string;
    let deckTitle: string;
    if (target.kind === "new") {
      const deck = createDeck({ title: target.title.trim() });
      deckId = deck.id;
      deckTitle = deck.title;
      // Switch to "existing" so subsequent saves go to same deck.
      setTarget({ kind: "existing", deckId });
    } else {
      deckId = target.deckId;
      deckTitle = userDecks.find((d) => d.id === deckId)?.title ?? deckId;
    }
    addCards(deckId, [card]);
    reset();
    setToast(`+1 → ${deckTitle}`);
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="space-y-8">
      <DeckPicker userDecks={userDecks} value={target} onChange={setTarget} />

      <section>
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          typ karty
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`
                hairline rounded-md
                px-3 py-2.5
                text-left
                transition-colors
                ${
                  type === t.id
                    ? "border-navy bg-surface-elev"
                    : "bg-surface-elev hover:border-line-strong"
                }
              `}
            >
              <div className="data text-sm font-semibold lowercase text-ink">
                {t.label}
              </div>
              <div className="data text-[10px] text-ink-muted normal-case mt-0.5">
                {t.hint}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          obsah karty
        </div>
        {type === "qa" && (
          <div className="space-y-4">
            <Field label="otázka">
              <textarea
                value={qa.question}
                onChange={(e) => setQA({ ...qa, question: e.target.value })}
                rows={2}
                className="form-textarea"
              />
            </Field>
            <Field label="odpověď">
              <textarea
                value={qa.answer}
                onChange={(e) => setQA({ ...qa, answer: e.target.value })}
                rows={4}
                className="form-textarea"
              />
            </Field>
          </div>
        )}

        {type === "cloze" && (
          <Field
            label="text"
            hint="vlož {{slovo}} kolem výrazů co chceš schovat"
          >
            <textarea
              value={cloze}
              onChange={(e) => setCloze(e.target.value)}
              placeholder="Hlavní město Francie je {{Paříž}}."
              rows={4}
              className="form-textarea"
            />
          </Field>
        )}

        {type === "mcq" && (
          <div className="space-y-4">
            <Field label="otázka">
              <textarea
                value={mcq.question}
                onChange={(e) => setMCQ({ ...mcq, question: e.target.value })}
                rows={2}
                className="form-textarea"
              />
            </Field>
            <Field label="možnosti · zaškrtni správné">
              <ul className="space-y-2">
                {mcq.options.map((opt, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={opt.correct}
                      onChange={(e) => {
                        const next = [...mcq.options];
                        next[i] = { ...opt, correct: e.target.checked };
                        setMCQ({ ...mcq, options: next });
                      }}
                      className="accent-navy size-4"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      placeholder={`option ${String.fromCharCode(65 + i)}`}
                      onChange={(e) => {
                        const next = [...mcq.options];
                        next[i] = { ...opt, text: e.target.value };
                        setMCQ({ ...mcq, options: next });
                      }}
                      className="form-input flex-1"
                    />
                    {mcq.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = mcq.options.filter((_, j) => j !== i);
                          setMCQ({ ...mcq, options: next });
                        }}
                        className="data text-[10px] uppercase tracking-widest text-ink-muted hover:text-bad transition-colors px-2 py-1"
                      >
                        smaž
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {mcq.options.length < 8 && (
                <button
                  type="button"
                  onClick={() =>
                    setMCQ({
                      ...mcq,
                      options: [...mcq.options, { text: "", correct: false }],
                    })
                  }
                  className="
                    mt-2 data text-[10px] uppercase tracking-widest
                    text-ink-dim hover:text-ink transition-colors
                  "
                >
                  + přidat možnost
                </button>
              )}
            </Field>
            <Field label="vysvětlení · volitelné">
              <textarea
                value={mcq.explanation}
                onChange={(e) =>
                  setMCQ({ ...mcq, explanation: e.target.value })
                }
                rows={2}
                className="form-textarea"
              />
            </Field>
          </div>
        )}

        {type === "free" && (
          <div className="space-y-4">
            <Field label="zadání · otevřená otázka">
              <textarea
                value={free.prompt}
                onChange={(e) => setFree({ ...free, prompt: e.target.value })}
                rows={2}
                className="form-textarea"
              />
            </Field>
            <Field label="očekávaná odpověď · referenční">
              <textarea
                value={free.expected}
                onChange={(e) =>
                  setFree({ ...free, expected: e.target.value })
                }
                rows={5}
                className="form-textarea"
              />
            </Field>
          </div>
        )}

        {type === "code" && (
          <div className="space-y-4">
            <Field label="zadání">
              <textarea
                value={code.prompt}
                onChange={(e) => setCode({ ...code, prompt: e.target.value })}
                rows={2}
                className="form-textarea"
              />
            </Field>
            <Field label="jazyk · ts / py / sql / css / …">
              <input
                type="text"
                value={code.language}
                onChange={(e) =>
                  setCode({ ...code, language: e.target.value })
                }
                className="form-input"
              />
            </Field>
            <Field label="očekávaný kód">
              <textarea
                value={code.expected}
                onChange={(e) =>
                  setCode({ ...code, expected: e.target.value })
                }
                rows={8}
                spellCheck={false}
                className="form-textarea data"
              />
            </Field>
          </div>
        )}
      </section>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={!valid} variant="primary" size="lg">
          Uložit kartu <span aria-hidden>→</span>
        </Button>
        {toast && (
          <span className="data text-xs uppercase tracking-widest text-ok">
            {toast}
          </span>
        )}
      </div>
    </div>
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
