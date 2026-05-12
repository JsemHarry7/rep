<div align="right">

**🇨🇿 česky** · [🇬🇧 english](./README.en.md)

</div>

# rep — repetice

> Flashcards · SRS · pomocník s AI. Pro lidi, co si vážně chtějí zapamatovat látku.

![rep banner — Repetice. Jednoduše.](./public/og.png)

**Live:** [rep.harrydeiml.ing](https://rep.harrydeiml.ing) · **Stack:** Vite + React 19 + TypeScript + Tailwind v4 · **Hosting:** Cloudflare Pages + D1

Local-first PWA trénovačka flashcards. Žádný účet, žádné poplatky, data
zůstanou na zařízení (pokud si nezapneš cloud sync). Postavená během
přípravy na maturitu 2026 a optimalizovaná pro ten konkrétní use-case
— maturita SWI / DAT / ČJL — ale obsah si tam můžeš nasypat jakýkoli.

## Co to umí

- **5 typů karet** — Q/A, Cloze (doplňovačky), MCQ (výběr z možností), otevřený výklad, kód
- **4 review módy** — SRS (Anki SM-2 scheduler), Cram, Sprint, Boss (mock exam napříč decky)
- **3 způsoby přidání karet:**
  - Upload souboru (`.md`, `.txt`, `.csv` / TSV — auto-detect)
  - Manuální formulář
  - **Pomocník s AI** — z tématu nebo zápisků vyrobí prompt, ten pošleš
    do ChatGPT / Claude / Gemini, výstup vrátíš zpátky. Žádné AI neběží
    uvnitř aplikace
- **Statistiky** — heatmap aktivity, mastery podle decku, projekce
  k tvým termínům, kalibrace (jak moc si věříš vs. jak moc to skutečně umíš)
- **Sdílení decků** — base64url v URL hash, žádný server-side roundtrip, data se nikdy nedotknou backendu
- **Cloud sync (volitelný)** — Google OAuth + email allowlist, snapshot
  push/pull do Cloudflare D1. Bez whitelistu funguje aplikace dál jen
  lokálně. Žádný auto-sync — explicitní push / pull, abys nepřišel
  o data při konfliktu mezi zařízeními
- **PWA** — installable, offline-ready, mobile + desktop responsive
- **Tmavý + světlý theme**, paleta navy + slate + teplý terracotta accent
- **Vše v češtině**

## Stack

| Vrstva | Co tam je |
|---|---|
| Frontend | Vite 6, React 19, TypeScript 5.7, Tailwind v4 (s `@theme` tokens) |
| State | Zustand + persist middleware (localStorage, klíč `rep:v1`) |
| Routing | wouter (hash routing pro `/share`) |
| PWA | vite-plugin-pwa (Workbox precache, manifest, ikony) |
| Auth | `@react-oauth/google` + HMAC-signed session cookies (žádná session tabulka) |
| Backend | Cloudflare Pages Functions (TypeScript) + D1 (SQLite) |
| OG banner | `@resvg/resvg-js` (SVG → PNG při buildu, `npm run gen:og`) |
| Fonty | JetBrains Mono (chrome), Inter (body), Instrument Serif (display) |

## Adresářová struktura

```
src/
  components/         Routes + UI (lazy-loaded přes React.lazy)
    landing/          Veřejná landing
    dashboard/        Hlavní rozcestník po přihlášení
    review/           Review screen (SRS / Cram / Sprint / Boss)
    add/              Upload / manual / AI tab
    stats/            Statistiky a kalibrace
    settings/         Profil, cloud sync, deadliny, theme
    share/            /share#... receive (deck import z URL)
    tour/             Walkthrough overlay (SVG mask cutout)
  lib/                Store, SRS scheduler, sync, theme, ...
  types.ts            Sdílené typy (Card, Deck, ReviewState, ...)
functions/
  api/auth/           google.ts, me.ts, signout.ts
  api/sync/           pull.ts, push.ts
  lib/auth.ts         HMAC session signing/verifying + allowlist
public/               _headers, _redirects, ikony, og.png, robots.txt
scripts/generate-og.mjs   SVG → PNG converter pro share banner
schema.sql            D1 schema (users, user_state)
wrangler.toml         Cloudflare config (D1 binding)
```

## Lokální development

```sh
npm install
npm run dev          # vite dev server na http://localhost:5173
npm run typecheck    # TS strict check, bez emit
npm run build        # production build do dist/
npm run preview      # local preview production buildu
npm run gen:og       # přegenerovat public/og.png z public/og.svg
```

Bez nastavení `VITE_GOOGLE_CLIENT_ID` aplikace běží **kompletně lokálně**
— cloud sync v Settings ukáže "nenakonfigurovaný" a nic dalšího se
nezmění. Pro local-first použití není potřeba nic jiného než
`npm install && npm run dev`.

## Deploy + cloud sync setup

Frontend se deployuje na Cloudflare Pages automaticky z `git push`.
Pro plný **cloud sync** (Google OAuth + D1) je potřeba ručně nastavit:

1. Vytvořit D1 databázi (`wrangler d1 create rep`)
2. Aplikovat `schema.sql`
3. Bindnout DB v Pages dashboardu
4. Vytvořit Google OAuth client v Google Cloud Console
5. Nastavit env vars: `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`,
   `AUTHORIZED_EMAILS`, `SESSION_SECRET`, `NODE_VERSION`

Krok za krokem v [`DEPLOY.md`](./DEPLOY.md).

## Design rozhodnutí (proč to vypadá takhle)

- **CLI / editorial estetika** — žádný "web app" pill cirkus. Sharp rohy,
  border-only buttony s color-flip hoverem, monospace pro "data" labels
  a metriky, serif (Instrument Serif) pro display headings
- **Paleta** — cool slate family kolem brand navy `#1f2b44`, warm terracotta
  `#c97f5a` jako jediný teplý akcent (streak, due cards, accent text).
  Cíl je "NotebookLM, ale chladnější" — ne paper, ne SaaS
- **Žádná gamifikace** kromě streaku — žádné XP, badges, levels. Tohle není
  Duolingo
- **Žádné AI uvnitř** — model se nevolá ze serveru ani z klienta.
  "Pomocník s AI" je generátor promptů — copy/paste do tvého oblíbeného
  chatu. Žádné API keys, žádné fees, žádný vendor lock-in
- **Local-first** — všechno funguje bez backendu. Cloud sync je
  bonusová vrstva pro multi-device, ne závislost

## Status

Aktivně vyvíjeno během přípravy na maturitu, ústní zkouška 25.5.2026.
Verze `0.0.1` znamená "funkční, používané denně, ale ne stabilní API".
Datový formát se ještě může změnit; zálohuj přes export JSON v Settings.

## Rozvíjení & open source

Tohle je primárně osobní maturitní projekt, ale kód je **open source pod
[MIT licencí](./LICENSE)** — forkni, používej, uprav. Žádné copyleft
podmínky, jen zachovej copyright header.

**Pokud chceš stavět vlastní verzi** (pro svoji školu / zkoušku / jiný
předmět), fork a jeď. Není potřeba se ptát. Pár tipů kde začít:

| Co chceš upravit | Kam se podívat |
|---|---|
| Datový model karet / decků | `src/types.ts` |
| Globální state, persist klíč, migrace | `src/lib/store.ts` |
| SRS scheduler (intervaly, ease factor) | `src/lib/srs.ts` |
| Přidat nový typ karty | `src/components/review/`, `src/components/add/` |
| Změnit paletu / fonty | `src/index.css` (`@theme` tokens) |
| Nový review mode | `src/components/review/ReviewScreen.tsx` + `types.ts` `ReviewMode` |
| Backend / cloud sync logika | `functions/api/`, `schema.sql` |

**Pokud chceš přispět zpátky** (bugfix, nový feature, zlepšení překladu):
otevři issue nebo rovnou PR na [github.com/JsemHarry7/rep](https://github.com/JsemHarry7/rep).
Pro větší změny prosím issue nejdřív, ať se zbytečně nesnažíš o něco,
co by nešlo zmergeovat (např. něco, co by rozbilo aktuální maturitní
workflow autora).

Pro otázky / nápady / žádost o přístup ke cloud syncu napiš na
[kontakt@harrydeiml.ing](mailto:kontakt@harrydeiml.ing).

## Credits

Crafted by [harry](https://harrydeiml.ing) ·
[kontakt@harrydeiml.ing](mailto:kontakt@harrydeiml.ing) ·
licensováno pod [MIT](./LICENSE)
