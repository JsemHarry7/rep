/* ---------- Agent format spec ----------
 *
 * Self-contained Markdown document. Hand it to Claude Code, Codex,
 * Gemini, or any agentic LLM together with the user's source material;
 * the agent then writes a .md file that uploads cleanly through the
 * Upload tab.
 *
 * Kept in sync with `parseDeckMarkdown` in lib/parser.ts.
 */

export const AGENT_SPEC_MD = `# rep — formát kartiček pro AI agenty

Tento dokument popisuje formát Markdown souboru, který je možné nahrát
do appky **rep** (flashcards + SRS trainer). Pokud jste AI agent (Claude
Code, Codex, Gemini, atd.), použijte tento dokument jako system prompt
nebo přílohu k požadavku uživatele a vygenerujte výstup přesně podle něj.

---

## 1. Co máte za úkol

Uživatel vám dá **studijní materiál** (kapitolu z učebnice, poznámky,
přepis, definice) NEBO jen **téma** (např. *"Romeo a Julie"*,
*"Pythagorova věta"*). Vašim úkolem je vygenerovat soubor \`.md\` s
kartami pro opakování. Soubor uložte (např. \`romeo-a-julie.md\`) a
uživatel ho přetáhne do appky.

Vracejte **jen samotný Markdown obsah** (žádné komentáře, žádné
\`\`\`markdown obaly, žádné úvody, žádné závěry).

---

## 2. Frontmatter (volitelný, ale doporučený)

\`\`\`md
---
title: Romeo a Julie
description: Tragédie W. Shakespeara, rozbor postav a témat.
tags: [literatura, shakespeare, tragedie]
---
\`\`\`

Pole jsou všechna volitelná. \`title\` se použije jako jméno decku v
appce; \`tags\` se zobrazí jako chipy.

---

## 3. Typy karet

Každá karta začíná **headerem ve tvaru** \`# TYP:\` (s mezerou). Mezi
kartami nechte jeden prázdný řádek pro čitelnost.

### 3.1 Q/A — klasická otázka a odpověď

\`\`\`md
# Q: Kdo napsal Romeo a Julii?
A: William Shakespeare. Datace cca 1595, raná tragédie.
\`\`\`

- Odpověď začíná \`A:\` a může pokračovat na dalších řádcích.
- Vhodné pro: fakta, jména, čísla, definice.

### 3.2 CLOZE — doplňování

\`\`\`md
# CLOZE: Tragédie Romeo a Julie se odehrává ve městě {{Verona}} v {{Itálii}}.
\`\`\`

- Vše uvnitř \`{{...}}\` se v review skryje; uživatel ho doplňuje.
- Více blanků v jedné větě je v pořádku.
- Maskujte **klíčový pojem**, nikoli náhodná slova.

### 3.3 MCQ — výběr z možností

\`\`\`md
# MCQ: Z jakého rodu pochází Romeo?
- Capuletové
- !Montekové
- Veronští páni
- Benvolijovi
> Romeo je syn Montekových. Capuletové jsou rod Julie.
\`\`\`

- Možnosti začínají \`- \` (pomlčka + mezera).
- **Správná** možnost má prefix \`- !\` (vykřičník).
- 3–4 možnosti, obvykle 1 správná (víc správných je možných).
- Distraktory by měly být věrohodné — stejná kategorie, ne triviálně
  vyloučitelné.
- Vysvětlení (řádek začínající \`> \`) je volitelné, ale doporučené.

### 3.4 FREE — otevřená otázka (recall / výklad)

\`\`\`md
# FREE: Vysvětli hlavní téma tragédie Romeo a Julie.
> Hlavní téma je střet mladistvé lásky se starou rodovou nenávistí.
> Shakespeare ukazuje, jak iracionální spory dospělých ničí životy
> nevinných. Vedlejší témata: osud vs. svobodná vůle, kontrast
> impulzivnosti a opatrnosti, rychlost mladé vášně.
\`\`\`

- Zadání obvykle začíná **"Vysvětli..."**, **"Popiš..."**,
  **"Porovnej..."**, **"Charakterizuj..."**. Styl jako u ústní zkoušky.
- Modelová odpověď: každý řádek prefix \`> \`. 2–5 vět.
- Uživatel při review napíše vlastní odpověď, pak se sám ohodnotí proti
  vaší modelovce.

### 3.5 CODE — programátorský kód

\`\`\`md
# CODE: Napiš TypeScript funkci, která sečte dvě čísla.
\`\`\`ts
function add(a: number, b: number): number {
  return a + b;
}
\`\`\`
\`\`\`

- Zadání popisuje co napsat.
- Pod ním je fenced code block s **konkrétním jazykem** (\`ts\`, \`py\`,
  \`sql\`, \`css\`, \`html\`, \`js\`, \`go\`, ...).
- Vhodné pro DAT/programovací tématy.

---

## 4. Pravidla výstupu

1. **Jazyk:** zachovejte jazyk vstupu. Český vstup → české karty.
   Anglický → anglické.
2. **Jedna karta = jeden koncept.** Nepřetěžovat.
3. **Délka:** žádná karta delší než ~300 znaků; otázky nejvýše 1–2 věty.
4. **Distribuce:** pokud uživatel neřekne jinak, doporučený mix:
   - Pro ústní zkoušku: ~50 % FREE, ~25 % Q/A, ~15 % MCQ, ~10 % CLOZE
   - Vyvážený: ~30 % Q/A, ~25 % CLOZE, ~25 % MCQ, ~20 % FREE
   - Jen terminologie: 100 % CLOZE
5. **Počet:** 15–25 karet pro typickou kapitolu. Pro samostatné téma
   bez materiálu klidně 20–30.
6. **Když dostanete jen téma (bez materiálu):** generujte z vlastních
   znalostí. Buďte přesní; nevymýšlejte data ani citace.
7. **Když dostanete materiál:** držte se obsahu. Nevkládejte fakta,
   která tam nejsou.

---

## 5. Kompletní příklad

\`\`\`md
---
title: Pythagorova věta
description: Geometrická věta o pravoúhlém trojúhelníku.
tags: [matematika, geometrie]
---

# Q: Jak zní Pythagorova věta slovy?
A: V pravoúhlém trojúhelníku je obsah čtverce nad přeponou roven součtu
obsahů čtverců nad oběma odvěsnami.

# CLOZE: V pravoúhlém trojúhelníku platí: c² = a² + {{b²}}, kde c je {{přepona}}.

# MCQ: Pro které trojúhelníky platí Pythagorova věta?
- Pro libovolný trojúhelník
- !Pouze pro pravoúhlé
- Pouze pro rovnostranné
- Pouze pro rovnoramenné
> Věta platí jen tehdy, když má jeden vnitřní úhel 90°.

# FREE: Vysvětli, jak by ses dostal k důkazu Pythagorovy věty geometricky.
> Jeden ze známých důkazů je přes plochy čtverců sestrojených nad
> stranami. Sestrojím čtverec o straně (a+b) a uvnitř ho rozdělím na
> čtverec přepony c² a čtyři pravoúhlé trojúhelníky. Druhým způsobem
> vyplním stejný velký čtverec dvěma menšími čtverci a² a b² plus
> čtyřmi stejnými trojúhelníky. Porovnání ploch dá c² = a² + b².

# CODE: Napiš v Pythonu funkci, která vrátí délku přepony.
\`\`\`py
import math

def hypotenuse(a: float, b: float) -> float:
    return math.sqrt(a**2 + b**2)
\`\`\`
\`\`\`

---

**Tip pro Claude Code / Codex:** uložte výstup do souboru
\`<nazev-tematu>.md\` v aktuálním adresáři. Uživatel pak v appce klikne
**Add cards → Nahrát** a soubor přetáhne dovnitř.
`;

export const AGENT_SPEC_FILENAME = "rep-card-format.md";
