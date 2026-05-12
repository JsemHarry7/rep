/* ---------- Changelog ----------
 *
 * Single source of truth for the in-app version + history. Top entry
 * is the current version; the version stamp anywhere in the chrome
 * pulls from CURRENT_VERSION and the modal renders all entries.
 *
 * On each release: prepend a new entry, bump package.json to match,
 * commit, ship. The chip in the sidebar / mobile top bar / landing
 * page is auto-updated.
 *
 * Style guide for entries
 * -----------------------
 * • Past-tense, no period. Czech sentence case.
 * • Group by theme. 3–7 highlights per release feels right.
 * • Mention user-visible behavior, not implementation detail.
 * • If a release is fixes-only, just say "drobné opravy" + the most
 *   important one.
 */

export interface Release {
  version: string;
  /** YYYY-MM-DD; for display only. */
  date: string;
  /** Short one-line headline shown next to the version. */
  headline?: string;
  /** Bullet points — main user-visible changes. */
  highlights: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: "1.2.5",
    date: "2026-05-12",
    headline: "sdílení kolekcí + markdown všude",
    highlights: [
      "Sdílení kolekcí přes krátký /s/ link (cloud users) — bundluje decks + metadata, import je purely additive, žádná tvoje data se nepřepíšou",
      "Inline markdown (*kurzíva*, **tučně**, `kód`) se teď renderuje i v náhledech karet (v Decks, Add UI, Share preview), ne jen v review",
      "Drobné UX fixy: oprava CODE-block na konci AI odpovědi, FREE textarea se resetuje mezi kartami",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-05-11",
    headline: "kolekce + tag-mode filter",
    highlights: [
      "Nový koncept Kolekce: skupiny decků buď ručně vybrané, nebo dynamicky podle tagu",
      "Decks page má chip row s filtrem podle kolekcí + tag autocomplete při tvorbě",
      "Stats page se přepočítává podle aktivní kolekce — heatmap, mastery, projekce",
      "Inline markdown rendering (* / ** / `) v obsahu karet",
    ],
  },
  {
    version: "1.1.5",
    date: "2026-05-11",
    headline: "blbuvzdorný sync",
    highlights: [
      "Cloud zálohy: server archivuje posledních 5 push snapshotů, restore tlačítkem ze Settings",
      "Push tlačítka teď ukazují počty (lokálně X · cloud Y) a confirm dialog pokud by push zmenšil cloud",
      "Auto-sync hard-blocks 0-card local push přes populated cloud (fresh device safety)",
      "Surface 403 rejected emailu v UI (debugging Google email mismatches)",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-05-11",
    headline: "auto-sync + mobile UX",
    highlights: [
      "Auto-sync push (3s debounce) po editaci, smart pull na sign-in s dirty-flag protection",
      "SyncIndicator chip v MobileTopBar + StatusBar (synced/syncing/offline)",
      "Mobile chrome je position-fixed → top bar i bottom nav jsou vždy viditelné",
      "Vylepšený mobile UX: bigger tap targets, esc-hints skryté na mobile, větší font v nav",
      "D1-based allowlist s owner-only Settings UI (žádný redeploy při přidávání emailů)",
      "Krátké /s/:id share linky pro cloud users",
    ],
  },
  {
    version: "1.0.5",
    date: "2026-05-10",
    headline: "performance, a11y, SEO",
    highlights: [
      "React.lazy code-splitting všech route components → 393 KB → 229 KB initial bundle",
      "Custom share banner (1200×630 OG image) pro link previews v Slack/iMessage/Twitter",
      "Dark mode contrast tokens lifted na WCAG AA 4.5:1",
      "Skip link, prefers-reduced-motion support, security headers, robots.txt",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-08",
    headline: "první stabilní release",
    highlights: [
      "5 typů karet: Q/A, Cloze, MCQ, Free, Code",
      "4 review módy: SRS (Anki SM-2), Cram, Sprint, Boss",
      "3 způsoby přidání: upload .md/.csv, ručně, pomocník s AI (prompt generator)",
      "Statistiky: heatmap aktivity, mastery per deck, kalibrace, deadlines projekce",
      "Sdílení decků: dlouhý link (hash-based) nebo .md export",
      "Cloud sync přes Google OAuth (email allowlist) + Cloudflare D1",
      "PWA instalovatelné, offline-ready, mobile + desktop responzivní",
      "Light + dark theme, vše v češtině",
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;
