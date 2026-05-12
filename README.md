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

The app auto-deploys to Cloudflare Pages on git push. The first time
needs setup — see [DEPLOY.md](./DEPLOY.md) for step-by-step instructions.

For local-first use (no cloud sync), no setup is needed beyond
`npm install && npm run dev`. Data lives in `localStorage`.

For cloud sync (multi-device), follow DEPLOY.md to wire up the D1
database, Google OAuth credentials, and env vars.
