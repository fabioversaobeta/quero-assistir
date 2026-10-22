# 09 · Deploy e operação

## Variáveis de ambiente

### API (`apps/api/.env.example`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Postgres (no Railway: referência `${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | sim | ≥ 32 chars (`openssl rand -base64 48`) |
| `GOOGLE_CLIENT_IDS` | p/ login | Client IDs aceitos (web do admin + android + ios), separados por vírgula |
| `ADMIN_EMAILS` | p/ admin | E-mails administradores |
| `TMDB_API_TOKEN` | p/ sync | Read Access Token do TMDB |
| `CORS_ORIGINS` | opcional | Origens de browsers que chamam a API direto |
| `SYNC_SCHEDULER_ENABLED` / `SYNC_CRON` / `SYNC_TIMEZONE` / `SYNC_STREAMING_PAGES` | opcional | Ver [Sincronização](06-sincronizacao.md) |
| `TMDB_REGION` / `TMDB_LANGUAGE` / `TMDB_IMAGE_BASE_URL` | opcional | Padrões `BR` / `pt-BR` / CDN do TMDB |
| `PORT` | automático | Railway injeta |

### Admin
`API_URL` (URL pública da API no Railway) e `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (embutida no build).

### Mobile
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (no EAS: `eas env` / secrets).

## Railway (API + banco)

1. Novo projeto → **Deploy from GitHub repo** (este repositório). O `railway.json` na raiz já aponta o `apps/api/Dockerfile` e o healthcheck `/health`.
2. Adicione o plugin **PostgreSQL** e configure `DATABASE_URL` no serviço da API como referência ao Postgres.
3. Defina as demais variáveis. Gere um domínio público.
4. O container executa `prisma migrate deploy` antes de subir (seguro com várias réplicas).
5. Primeira carga: no painel admin → Sincronização → "Tudo" (ou `railway run pnpm --filter @quero-assistir/api sync`).
6. Opcional: serviço separado "sync" com **Cron Schedule** (`0 8 * * *` UTC) e comando `node dist/cli/sync.js all`, e `SYNC_SCHEDULER_ENABLED=false` na API.

Deploy automático a cada push na `main` (integração GitHub do Railway); habilite "Wait for CI" para só publicar com CI verde.

## Vercel (admin)

Importar o repositório → **Root Directory** `apps/admin` → o `vercel.json` ajusta install/build para o monorepo. Defina `API_URL` e `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Adicione o domínio da Vercel em "Authorized JavaScript origins" do Client ID Web.

## Docker local

```bash
docker compose up -d postgres                 # só o banco
docker compose --profile full up --build      # banco + API + admin (usa apps/api/.env)
```

Imagens: `apps/api/Dockerfile` e `apps/admin/Dockerfile` (contexto = raiz do repo).

## Google OAuth

No Google Cloud Console → APIs e serviços → Credenciais, crie:
- **Web** (admin e `webClientId` do app — é ele que gera o idToken validado pela API),
- **Android** (pacote `app.queroassistir.mobile` + SHA-1 do keystore),
- **iOS** (bundle `app.queroassistir.mobile`; o *iOS URL scheme* vai em `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`).

Coloque os IDs (Web, Android, iOS) em `GOOGLE_CLIENT_IDS` da API. Configure a tela de consentimento OAuth.

## Backup e observabilidade

Railway Postgres: habilite backups. Logs no painel do Railway. Próximos passos sugeridos: Sentry (API/admin/app) e alerta quando a sync diária falhar (ver [roadmap](12-roadmap.md)).
