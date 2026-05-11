import { useState } from "react";
import type { Card, CardType, MCQOption } from "@/types";
import type { ParsedCard } from "@/lib/parser";

/* ---------- CardForm ----------
 *
 * Reusable form for creating or editing a single card. Used by:
 *   - ManualTab (create new card)
 *   - EditCardModal (edit existing card)
 *
 * The form is type-aware: it shows fields appropriate to the active
 * card type (qa/cloze/mcq/free/code). When editing, the type is locked
 * (you can't change a Q/A into MCQ — better to delete + create).
 */

interface Props {
  /** If editing, prefill from this card. If creating, omit. */
  initial?: Card;
  /** Override starting type for creation mode. Default "qa". */
  defaultType?: CardType;
  onSave: (card: ParsedCard) => void;
  onCancel?: () => void;
  saveLabel?: string;
  /** Lock card type (true when editing). */
  lockType?: boolean;
}

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

export function CardForm({
  initial,
  defaultType,
  onSave,
  onCancel,
  saveLabel = "Uložit kartu",
  lockType,
}: Props) {
  const [type, setType] = useState<CardType>(
    initial?.type ?? defaultType ?? "qa",
  );

  const [qa, setQA] = useState({
    question: initial?.type === "qa" ? initial.question : "",
    answer: initial?.type === "qa" ? initial.answer : "",
  });
  const [cloze, setCloze] = useState(
    initial?.type === "cloze" ? initial.text : "",
  );
  const [mcq, setMCQ] = useState<MCQState>(() => {
    if (initial?.type === "mcq") {
      return {
        question: initial.question,
        options:
          initial.options.length > 0
            ? initial.options.map((o) => ({ ...o }))
            : emptyMCQ.options,
        explanation: initial.explanation ?? "",
      };
    }
    return emptyMCQ;
  });
  const [free, setFree] = useState({
    prompt: initial?.type === "free" ? initial.prompt : "",
    expected: initial?.type === "free" ? initial.expected : "",
  });
  const [code, setCode] = useState({
    prompt: initial?.type === "code" ? initial.prompt : "",
    language: initial?.type === "code" ? initial.language : "ts",
    expected: initial?.type === "code" ? initial.expected : "",
  });

  const buildCard = (): ParsedCard | null => {
    switch (type) {
      case "qa":
        if (!qa.question.trim() || !qa.answer.trim()) return null;
        return {
          type: "qa",
          question: qa.question.trim(),
          answer: qa.answer.trim(),
        };
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
  const valid = card !== null;

  return (
    <div className="space-y-6">
      {!lockType && (
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
      )}

      <section>
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
                onChange={(e) =>
                  setMCQ({ ...mcq, question: e.target.value })
                }
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
                      placeholder={`možnost ${String.fromCharCode(65 + i)}`}
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
                  className="mt-2 data text-[10px] uppercase tracking-widest text-ink-dim hover:text-ink transition-colors"
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

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => card && onSave(card)}
          disabled={!valid}
          className="
            inline-flex items-center justify-center gap-2
            border border-navy bg-transparent text-navy
            px-5 py-2 rounded-sm
            font-sans text-sm font-medium
            hover:bg-navy hover:text-navy-fg
            transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {saveLabel} <span aria-hidden>→</span>
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="data text-xs uppercase tracking-widest text-ink-dim hover:text-ink transition-colors"
          >
            zrušit
          </button>
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
