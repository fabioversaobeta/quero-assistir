# CLAUDE.md — guia para trabalhar neste repositório

Monorepo pnpm do **Quero Assistir** (app de swipe de filmes). Leia `docs/README.md` para o mapa da documentação.

## Comandos

```bash
pnpm install
pnpm db:up                                     # Postgres (docker) em localhost:5433
pnpm dev:api | dev:admin | dev:mobile
pnpm typecheck && pnpm lint && pnpm test       # rodar antes de concluir qualquer tarefa
pnpm --filter @quero-assistir/api test:e2e     # exige banco `quero_assistir_test` (ver abaixo)
pnpm --filter @quero-assistir/api prisma:migrate   # cria migration após editar schema.prisma
```

Banco de e2e (uma vez): `docker exec quero-assistir-postgres-1 psql -U quero -d postgres -c "CREATE DATABASE quero_assistir_test"` e
`DATABASE_URL=postgresql://quero:quero@localhost:5433/quero_assistir_test pnpm --filter @quero-assistir/api prisma:deploy`.
O e2e dá `TRUNCATE` e **recusa** rodar em banco cujo nome não contenha `test`.

## Arquitetura (API) — regras que não devem ser quebradas

Cada contexto em `apps/api/src/<contexto>/` segue DDD em camadas:

```
domain/          entidades, value objects, regras puras e PORTAS (abstract class). Sem Nest, sem Prisma, sem HTTP.
application/     casos de uso (@Injectable) orquestrando portas. Sem Prisma/HTTP.
infrastructure/  adaptadores das portas (Prisma, TMDB, Google, JWT).
presentation/    controllers, DTOs de validação (class-validator), presenters.
```

- Dependência aponta para dentro: presentation/infrastructure → application → domain.
- Portas são `abstract class` usadas como token de DI (`{ provide: Porta, useClass: Adaptador }`).
- Erros de negócio: lançar `DomainError` (`shared/domain-error.ts`); o `DomainErrorFilter` converte em HTTP.
- Contextos: `catalog` (leitura do catálogo/deck), `ingestion` (TMDB → banco, agendador), `identity` (Google→JWT, guards), `library` (swipes/lista), `backoffice` (API do admin).
- Contratos HTTP compartilhados ficam em `packages/contracts` (**somente tipos**, usar `import type`). Mudou um DTO? Atualize lá e nos três consumidores.
- Testes: domínio/casos de uso com fakes em memória (`*.spec.ts`); queries/guards/fluxos no `test/*.e2e-spec.ts`.

## Convenções

- TypeScript estrito; sem `any`. Nomes de domínio em inglês no código, textos de UI/docs em português (pt-BR).
- Commits em português, imperativo curto (ex.: `Adiciona filtro por plataforma no deck`). Conventional Commits são bem-vindos.
- Não commitar `.env`. Variáveis novas → `.env.example` + `docs/09-deploy.md`.
- Alterou `schema.prisma`? Gere migration (nunca edite migration já aplicada) e rode o e2e.

## Pegadinhas

- **Expo muda a cada SDK** (hoje SDK 58, gesture-handler 3, Reanimated 4). Antes de mexer em API do Expo/RN, consulte `https://docs.expo.dev/versions/latest/` e `https://docs.expo.dev/llms.txt`. Use `npx expo install <pkg>` (não `pnpm add`) para dependências do mobile.
- O app mobile **precisa de development build** (Google Sign-In é nativo; não roda no Expo Go).
- TMDB: título só entra no deck se tiver `Availability` (cinema ou streaming em plataforma **habilitada**). Ver `docs/05-integracao-tmdb.md`.
- Anônimo = dados só no aparelho (`LocalLibraryStore`); logado = servidor (`RemoteLibraryStore`). No login, o histórico local é importado (`POST /v1/me/swipes/import`) e limpo.
- Windows: heredocs do bash com caracteres especiais podem falhar; prefira criar arquivos pela ferramenta Write.

## Onde mexer para…

| Tarefa | Local |
| --- | --- |
| Novo endpoint | caso de uso em `application/`, controller em `presentation/`, tipo em `packages/contracts` |
| Nova fonte de metadados | implementar `MetadataGateway` em `ingestion/infrastructure/` |
| Mudar horário do sync | `SYNC_CRON` / `SYNC_TIMEZONE` |
| Nova tela do app | `apps/mobile/src/app/` (Expo Router, arquivo = rota) |
| Nova tela do admin | `apps/admin/src/app/(admin)/` |
