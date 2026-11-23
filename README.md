# 🎬 Quero Assistir

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)

**Swipe-based app to decide what to watch.** Swipe right on the movies, series and anime you want to see, left on the ones you don't. It starts with what's **in theaters now** and, once you run out, offers the **streaming platform** catalog.

<!-- TODO: add screenshots or a GIF of the swipe deck, e.g.
<p align="center"><img src="docs/images/deck.gif" width="280" /></p> -->

## Features

**Mobile app (Android and iOS)**
- Tinder-style swipe deck with ✕ / ♥ buttons and **undo** for the last card
- Title cards with poster, age rating (Brazilian ratings), year, genres, where to watch and synopsis
- "In theaters" first, then streaming, filterable by category (all / movies / series / anime) and platform
- "My list": liked titles, mark as watched, remove
- **Anonymous or Google sign-in**: no login means everything stays on the device; signing in syncs the list to the cloud and **migrates the anonymous history**
- Account deletion that erases all user data (App Store, Google Play and LGPD requirement)

**Admin panel**
- Overview metrics (titles, users, swipes, "want to watch" rate, most wanted, last sync)
- Catalog moderation (search, hide, feature), platform toggles, manual sync with history

**Automation**
- Daily sync with [TMDB](https://www.themoviedb.org) (05:00 America/Sao_Paulo by default): new theatrical releases, titles leaving theaters, enabled-platform catalogs, orphan cleanup
- The app only shows titles already in our own database; it never calls TMDB directly

## Architecture

pnpm monorepo:

```
apps/
  api/        NestJS + Prisma + PostgreSQL  → REST API + daily sync (Railway)
  admin/      Next.js                       → admin panel (Vercel)
  mobile/     Expo / React Native           → Android + iOS app
packages/
  contracts/  shared TypeScript types for the HTTP contracts
docs/         architecture, domain, API, ADRs, deploy, CI/CD, roadmap
```

| Layer | Technology |
|---|---|
| API | Node.js 22, NestJS, Prisma, PostgreSQL, Swagger (`/docs`) |
| Admin | Next.js |
| Mobile | Expo, React Native |
| Shared | TypeScript contracts package |
| Infra | Docker, Railway, Vercel, GitHub Actions |

## Getting started

Requirements: Node 22+, pnpm 11 (`npm i -g pnpm`), Docker.

```bash
pnpm install
pnpm db:up                                   # local Postgres on port 5433
cp apps/api/.env.example apps/api/.env       # fill JWT_SECRET and TMDB_API_TOKEN
pnpm --filter @quero-assistir/api prisma:deploy
pnpm dev:api                                 # http://localhost:3000 (Swagger at /docs)
```

Populate the catalog (needs a free `TMDB_API_TOKEN` from themoviedb.org → Settings → API):

```bash
pnpm --filter @quero-assistir/api build && pnpm --filter @quero-assistir/api sync
```

Admin panel and mobile app: see [docs/08-admin.md](docs/08-admin.md) and [docs/07-mobile.md](docs/07-mobile.md).

## Quality

```bash
pnpm typecheck && pnpm lint && pnpm test     # unit tests
pnpm --filter @quero-assistir/api test:e2e   # e2e against a real Postgres (*_test database)
```

GitHub Actions runs all of the above plus Docker image builds on every PR.

## Project status

The API, sync job and admin panel are built and tested. The mobile app compiles and type-checks, but gestures and Google Sign-In have **not yet been tested on a physical device**. Known gaps and next steps (insights dashboard, push notifications, simple recommendations) are listed in [docs/12-roadmap.md](docs/12-roadmap.md).

> Project documentation in `docs/` is written in Brazilian Portuguese.

## Credits

Movie and series data: TMDB. *This product uses the TMDB API but is not endorsed or certified by TMDB.* Streaming availability: JustWatch (via TMDB).

## License

MIT, see [LICENSE](LICENSE).
