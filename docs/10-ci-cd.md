# 10 · CI/CD

## CI — `.github/workflows/ci.yml` (push na `main` e PRs)

| Job | Passos |
| --- | --- |
| `quality` | Postgres 17 como service → `pnpm install --frozen-lockfile` → `prisma generate` → `typecheck` → `lint` → `test` (unitários) → `prisma migrate deploy` + `test:e2e` → `build` |
| `docker` | Build (sem push) das imagens da API e do admin com cache do GitHub Actions |

## CD

Entrega contínua pelas integrações Git das plataformas (sem segredos no GitHub):

- **API → Railway**: push na `main` dispara build do Dockerfile + `migrate deploy` + healthcheck. Ative *Wait for CI*.
- **Admin → Vercel**: push na `main` = produção; PRs geram *preview deployments*.
- **Mobile → EAS**: workflow manual `mobile-build.yml` (secret `EXPO_TOKEN`). Publicação nas lojas: [11](11-publicacao-lojas.md).

## Outros

- **Dependabot** semanal (npm), mensal (Actions, Docker).
- **Branch protection** recomendada na `main`: exigir `quality` e `docker` verdes e PR.
- Rodar o equivalente local: `pnpm typecheck && pnpm lint && pnpm test`.
