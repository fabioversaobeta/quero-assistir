# 🎬 Quero Assistir

App (Android e iOS) para descobrir filmes, séries e animes com **swipe estilo Tinder**: arraste para a direita o que você quer assistir, para a esquerda o que não interessa. Começa pelo que está **em cartaz nos cinemas** e, quando acabar, oferece o catálogo das **plataformas de streaming**.

- **Anônimo ou com Google:** sem login, tudo fica só no aparelho. Entrando com Google, a lista vai para a nuvem (e o histórico anônimo é migrado).
- **Catálogo próprio:** o app só mostra títulos que já estão na nossa base, atualizada por uma rotina diária a partir do [TMDB](https://www.themoviedb.org).
- **Painel admin:** métricas, moderação do catálogo, plataformas e sincronização manual.

## Estrutura

```
apps/
  api/      NestJS + Prisma + PostgreSQL  → API, sincronização diária (Railway)
  admin/    Next.js                        → painel do administrador (Vercel)
  mobile/   Expo / React Native            → app Android + iOS
packages/
  contracts/ tipos TypeScript dos contratos HTTP (compartilhados)
docs/       documentação (comece por docs/README.md)
```

## Começando

Pré-requisitos: Node 22+, pnpm 11 (`npm i -g pnpm`), Docker.

```bash
pnpm install
pnpm db:up                                   # Postgres local na porta 5433
cp apps/api/.env.example apps/api/.env       # preencha JWT_SECRET e TMDB_API_TOKEN
pnpm --filter @quero-assistir/api prisma:deploy
pnpm dev:api                                 # http://localhost:3000  (Swagger em /docs)
```

Popular o catálogo (precisa de `TMDB_API_TOKEN`, grátis em themoviedb.org → Configurações → API):

```bash
pnpm --filter @quero-assistir/api build && pnpm --filter @quero-assistir/api sync
```

Painel admin e app: veja [docs/08-admin.md](docs/08-admin.md) e [docs/07-mobile.md](docs/07-mobile.md).

## Qualidade

```bash
pnpm typecheck && pnpm lint && pnpm test     # unitários
pnpm --filter @quero-assistir/api test:e2e   # e2e com Postgres real (banco *_test)
```

CI no GitHub Actions roda tudo isso + build das imagens Docker a cada PR.

## Documentação

Índice completo em [docs/README.md](docs/README.md). Para trabalhar com o Claude Code, leia [CLAUDE.md](CLAUDE.md).

## Créditos

Dados de filmes e séries: TMDB. *Este produto usa a API do TMDB, mas não é endossado nem certificado por ele.* Disponibilidade em streaming: JustWatch (via TMDB).

## Licença

MIT — veja [LICENSE](LICENSE).
