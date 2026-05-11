# rep

Repetice — flashcard & quiz trainer s CLI estetikou.

Multi-format upload (md / txt / json), LLM-assisted card generation, SRS,
gamifikace, statistiky. Funguje na desktopu i mobilu (PWA).

## Stack

- Vite + React 19 + TypeScript + Tailwind v4
- Zustand pro state, localStorage persist
- Cloudflare Pages (frontend) + Pages Functions + D1 (cloud sync)
- Google OAuth pro autorizované uživatele (email allowlist)

## Dev

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Deploy

(TBD v M6 — Cloudflare Pages + Functions + D1 setup s detailním návodem.)
