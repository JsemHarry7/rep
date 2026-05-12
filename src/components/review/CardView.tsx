import { useState } from "react";
import type {
  Card,
  ClozeCard,
  CodeCard,
  FreeCard,
  MCQCard,
  QACard,
} from "@/types";
import { MarkdownInline } from "@/components/MarkdownInline";

interface CardViewProps {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
}

export function CardView({ card, revealed, onReveal }: CardViewProps) {
  // key={card.id} forces React to unmount/remount the per-type subview
  // on every card switch. Without it, useState(...) inside MCQView /
  // FreeView / CodeView keeps the previous card's selection / typed
  // answer / code draft. With it, each card starts fresh.
  return (
    <article>
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-6">
        {card.type}
      </div>
      {card.type === "qa" && (
        <QAView key={card.id} card={card} revealed={revealed} />
      )}
      {card.type === "cloze" && (
        <ClozeView key={card.id} card={card} revealed={revealed} />
      )}
      {card.type === "mcq" && (
        <MCQView key={card.id} card={card} revealed={revealed} onReveal={onReveal} />
      )}
      {card.type === "free" && (
        <FreeView key={card.id} card={card} revealed={revealed} />
      )}
      {card.type === "code" && (
        <CodeView key={card.id} card={card} revealed={revealed} />
      )}
    </article>
  );
}

/* ---------- QA ---------- */

function QAView({ card, revealed }: { card: QACard; revealed: boolean }) {
  return (
    <>
      <h1 className="display text-3xl sm:text-5xl text-ink mb-10">
        <MarkdownInline>{card.question}</MarkdownInline>
      </h1>
      {revealed && (
        <>
          <hr className="border-line mb-6" />
          <p className="prose text-lg text-ink-dim whitespace-pre-wrap">
            <MarkdownInline>{card.answer}</MarkdownInline>
          </p>
        </>
      )}
    </>
  );
}

/* ---------- Cloze ---------- */

function ClozeView({ card, revealed }: { card: ClozeCard; revealed: boolean }) {
  const parts = splitCloze(card.text);
  return (
    <p className="prose text-xl sm:text-2xl text-ink leading-relaxed">
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>
            <MarkdownInline>{p.value}</MarkdownInline>
          </span>
        ) : revealed ? (
          <span
            key={i}
            className="font-medium text-ink underline decoration-navy decoration-2 underline-offset-[6px]"
          >
            {p.value}
          </span>
        ) : (
          <span
            key={i}
            className="inline-block border-b-2 border-line-strong min-w-[3em] mx-0.5 text-transparent select-none"
            aria-hidden
          >
            {p.value}
          </span>
        ),
      )}
    </p>
  );
}

function splitCloze(text: string): Array<{ type: "text" | "blank"; value: string }> {
  const out: Array<{ type: "text" | "blank"; value: string }> = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "blank", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/* ---------- MCQ ---------- */

function MCQView({
  card,
  revealed,
  onReveal,
}: {
  card: MCQCard;
  revealed: boolean;
  onReveal: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const multiCorrect = card.options.filter((o) => o.correct).length > 1;

  const select = (i: number) => {
    if (revealed) return;
    if (multiCorrect) {
      const next = new Set(selected);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      setSelected(next);
    } else {
      setSelected(new Set([i]));
      onReveal();
    }
  };

  return (
    <>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-2">
        <MarkdownInline>{card.question}</MarkdownInline>
      </h1>
      {multiCorrect && !revealed && (
        <p className="data text-[10px] uppercase tracking-widest text-ink-muted mb-6">
          více správných · vyber všechny a stiskni reveal
        </p>
      )}
      <ul className="space-y-2 mt-6">
        {card.options.map((opt, i) => {
          const isSelected = selected.has(i);
          const showCorrect = revealed && opt.correct;
          const showWrong = revealed && isSelected && !opt.correct;
          const showMissed = revealed && opt.correct && !isSelected;
          return (
            <li key={i}>
              <button
                disabled={revealed}
                onClick={() => select(i)}
                className={`
                  w-full text-left
                  hairline rounded-md
                  px-4 py-3
                  bg-surface-elev
                  transition-colors
                  flex items-baseline gap-3
                  ${showCorrect ? "border-ok" : ""}
                  ${showWrong ? "border-bad" : ""}
                  ${!revealed && isSelected ? "border-line-strong" : ""}
                  ${!revealed ? "hover:border-line-strong" : ""}
                `}
              >
                <span
                  className={`
                    data text-xs w-5 shrink-0
                    ${showCorrect ? "text-ok" : ""}
                    ${showWrong ? "text-bad" : ""}
                    ${!revealed ? "text-ink-muted" : "text-ink-muted"}
                  `}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span
                  className={`
                    prose text-base flex-1
                    ${showCorrect ? "text-ok" : ""}
                    ${showWrong ? "text-bad line-through" : ""}
                    ${showMissed ? "text-ink-dim" : ""}
                    ${!revealed ? "text-ink" : ""}
                  `}
                >
                  <MarkdownInline>{opt.text}</MarkdownInline>
                </span>
                {showCorrect && (
                  <span className="data text-[10px] uppercase tracking-widest text-ok">
                    correct
                  </span>
                )}
                {showWrong && (
                  <span className="data text-[10px] uppercase tracking-widest text-bad">
                    wrong
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {revealed && card.explanation && (
        <div className="mt-6 border-l-2 border-navy pl-4">
          <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
            explanation
          </div>
          <p className="prose text-sm text-ink-dim">
            <MarkdownInline>{card.explanation}</MarkdownInline>
          </p>
        </div>
      )}
      {multiCorrect && !revealed && (
        <button
          onClick={onReveal}
          className="mt-6 data text-sm uppercase tracking-widest text-ink-dim hover:text-ink transition-colors"
        >
          reveal →
        </button>
      )}
    </>
  );
}

/* ---------- Free recall ---------- */

function FreeView({ card, revealed }: { card: FreeCard; revealed: boolean }) {
  const [answer, setAnswer] = useState("");
  return (
    <>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-8">
        <MarkdownInline>{card.prompt}</MarkdownInline>
      </h1>
      <label className="block">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          your answer
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="napiš odpověď (nebo přeskoč na reveal)…"
          className="
            w-full min-h-[7em]
            hairline rounded-md
            bg-surface-elev
            p-4 prose text-base
            resize-y
            outline-none focus:border-navy
            placeholder:text-ink-muted
          "
        />
      </label>
      {revealed && (
        <div className="mt-8">
          <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
            expected
          </div>
          <p className="prose text-base text-ink whitespace-pre-wrap border-l-2 border-navy pl-4">
            <MarkdownInline>{card.expected}</MarkdownInline>
          </p>
        </div>
      )}
    </>
  );
}

/* ---------- Code ---------- */

function CodeView({ card, revealed }: { card: CodeCard; revealed: boolean }) {
  const [answer, setAnswer] = useState("");
  return (
    <>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-8">
        <MarkdownInline>{card.prompt}</MarkdownInline>
      </h1>
      <label className="block">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          your answer · {card.language}
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`// ${card.language}`}
          spellCheck={false}
          className="
            w-full min-h-[10em]
            hairline rounded-md
            bg-surface-elev
            p-4 data text-sm
            resize-y
            outline-none focus:border-navy
            placeholder:text-ink-muted
          "
        />
      </label>
      {revealed && (
        <div className="mt-8">
          <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
            expected · {card.language}
          </div>
          <pre className="data text-sm hairline rounded-md bg-surface-elev p-4 overflow-auto whitespace-pre">
            {card.expected}
          </pre>
        </div>
      )}
    </>
  );
}
