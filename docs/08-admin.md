# 08 · Painel admin

Next.js 15 (App Router) em `apps/admin`, deploy na Vercel.

## Telas

Visão geral · Catálogo (busca, ocultar/reexibir, destacar) · Plataformas (habilitar/desabilitar) · Sincronização (disparar por escopo, histórico) · Usuários.

## Autenticação

1. `/login` mostra o botão do Google (Client ID **Web**, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
2. O navegador envia o idToken a `POST /api/session` (Next), que chama `POST /v1/auth/google` na API.
3. Só contas com `role=ADMIN` (e-mail em `ADMIN_EMAILS` da API) recebem sessão; o JWT vai num **cookie httpOnly**.
4. Chamadas do navegador passam por `/api/proxy/v1/admin/*` (o Next anexa o token). Server Components usam `apiGet` direto.
5. A API reconfirma ADMIN no banco em toda chamada; 401/403 redireciona ao login.

## Rodar

```bash
cp apps/admin/.env.example apps/admin/.env.local
pnpm dev:admin        # http://localhost:3001
```

Variáveis: `API_URL` (servidor → API), `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Na API: `GOOGLE_CLIENT_IDS` deve conter o mesmo Client ID e `ADMIN_EMAILS` o seu e-mail; `CORS_ORIGINS` não é necessário (o browser só fala com o Next).

## Evoluir (insights/dashboards)

O endpoint `/v1/admin/stats` e `BackofficeRepository` são o ponto de extensão: adicione consultas de leitura (retenção, gêneros mais curtidos, funil swipe→lista) e telas em `src/app/(admin)/`.
