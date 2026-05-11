/* ---------- LLM prompt presets ----------
 *
 * Each preset takes user input — either raw study material OR a topic
 * name — and produces a prompt that, when run in ChatGPT / Claude /
 * Gemini, returns output in our markdown card format (the same one
 * parseDeckMarkdown understands).
 *
 * Prompts are intentionally strict about output format — the model
 * must return ONLY cards, no preamble. Tested empirically; tweak in
 * isolation if a model starts wrapping output in ```markdown fences
 * (we strip those at parse time as a safety net).
 */

export interface Preset {
  id: string;
  label: string;
  description: string;
  build: (source: string) => string;
}

const HEADER = `You generate study flashcards. Return ONLY markdown cards in the exact format shown — no preamble, no commentary, no closing notes, no \`\`\`markdown fences.

The input may be EITHER:
  A) Raw study material (textbook chapter, notes, transcript, definitions) — generate cards strictly from this content; do not invent facts.
  B) A topic name only (e.g., "Romeo a Julie", "Pythagorova věta") — generate cards from your own knowledge of the topic; be accurate.

Format reference:

# Q: <question>
A: <answer — can span multiple lines>

# CLOZE: <full sentence with {{term}} marking the gap; multiple {{gaps}} per sentence are fine>

# MCQ: <question>
- option text
- !correct option (prefix with !)
- option text
> brief explanation (optional, single line)

# FREE: <open prompt — "Vysvětli...", "Popiš...", "Porovnej...">
> model answer line 1
> model answer line 2

# CODE: <prompt — describe what to write>
\`\`\`lang
expected code
\`\`\`

Rules:
- Match the user's language (Czech ↔ English). If the input is Czech, output Czech cards.
- Each card tests ONE distinct concept.
- For MCQ, always 3–4 options with exactly 1–2 correct (mark with !). Plausible distractors.
- For CLOZE, mask the key term being tested, not random words.
- For FREE, expected answer should be 2–4 sentences, oral-exam style.
- For CODE, choose a real language tag (ts, py, sql, css, html, js, go).
- No card more than ~300 chars.`;

export const presets: Preset[] = [
  {
    id: "mixed-oral",
    label: "Mix · maturita ústní",
    description:
      "Mix typů pro maturitní ústní zkoušku. Bias na FREE recall (~50 %) — výklad. Doplněno Q/A (definice), MCQ (rozlišení pojmů), CLOZE (terminologie).",
    build: (source) => `${HEADER}

Distribution: ~50% FREE, ~25% Q/A, ~15% MCQ, ~10% CLOZE.
Generate 18–25 cards covering the most important concepts.

Input:
---
${source.trim()}
---

Generate cards now:`,
  },
  {
    id: "mixed-balanced",
    label: "Mix · vyvážený",
    description:
      "Vyvážený mix všech typů. Pro učení nové látky bez konkrétního zaměření.",
    build: (source) => `${HEADER}

Distribution: ~30% Q/A, ~25% CLOZE, ~25% MCQ, ~20% FREE.
Generate 15–25 cards covering key concepts. Each card tests something distinct.

Input:
---
${source.trim()}
---

Generate cards now:`,
  },
  {
    id: "qa-only",
    label: "Jen Q/A",
    description:
      "Pouze klasické otázka/odpověď. Pro fakta, definice, čísla, jména. Rychlé na opakování.",
    build: (source) => `${HEADER}

Generate ONLY Q/A cards (no CLOZE, MCQ, FREE, or CODE).
Generate 15–25 cards.

Input:
---
${source.trim()}
---

Generate cards now:`,
  },
  {
    id: "cloze-defs",
    label: "Cloze · definice",
    description:
      "Cloze doplňovačky z definic. Maskuje definované pojmy. Skvělé na terminologii.",
    build: (source) => `${HEADER}

Generate ONLY CLOZE cards.
For each cloze, mask the term being defined (the "what is X?" answer).
Sometimes mask 2 terms per sentence if both are key.
Generate 12–20 cards.

Input:
---
${source.trim()}
---

Generate cards now:`,
  },
  {
    id: "mcq-quiz",
    label: "MCQ · test",
    description:
      "Test s výběrem z možností. 4 možnosti, 1 správná. Pro sebetest.",
    build: (source) => `${HEADER}

Generate ONLY MCQ cards.
Exactly 4 options per question. Exactly 1 correct (marked with !).
Distractors should be plausible — same category, same magnitude, similar terminology.
Include short explanation (>) for each.
Generate 10–15 cards.

Input:
---
${source.trim()}
---

Generate cards now:`,
  },
  {
    id: "free-recall",
    label: "Free · výklad",
    description:
      "Otevřené otázky pro ústní výklad. 'Vysvětli...', 'Popiš...'. Klíčové pro maturitu.",
    build: (source) => `${HEADER}

Generate ONLY FREE cards.
Prompts in oral-exam style: "Vysvětli...", "Popiš...", "Porovnej...", "Charakterizuj...".
Expected answer: 3–5 sentences, oral delivery style.
Generate 12–18 cards covering the topic broadly.

Input:
---
${source.trim()}
---

Generate cards now:`,
  },
];
