# 04 · API

Base: `/v1`. Documentação interativa (Swagger): `GET /docs`. Tipos em [`packages/contracts`](../packages/contracts/src/index.ts).

**Auth:** `Authorization: Bearer <JWT da API>`. JWT é obtido trocando o idToken do Google em `POST /v1/auth/google` (expira em `JWT_EXPIRES_IN_SECONDS`, padrão 30 dias). Erros: `{ statusCode, code, message }`.

## Público (anônimo ou logado)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Saúde do processo e do banco |
| GET | `/v1/deck?scope=cinema\|streaming&category=all\|movie\|series\|anime&providerId=&cursor=&limit=` | Página de cartas. Com Bearer, já exclui o que o usuário decidiu |
| GET | `/v1/titles/:id` | Detalhes de um título |
| GET | `/v1/genres` | Gêneros |
| GET | `/v1/providers` | Plataformas habilitadas |
| POST | `/v1/auth/google` | `{ idToken }` → `{ accessToken, expiresInSeconds, user }` (20/min) |

`category` e `providerId` só valem para `scope=streaming`. Paginação: `{ items, nextCursor }`; cursor opaco (keyset por destaque/popularidade/id), `limit` 1–50 (padrão 20).

## Usuário logado

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/v1/me` | Perfil |
| DELETE | `/v1/me` | Exclui conta e dados (204) |
| GET | `/v1/me/deck` | Igual a `/v1/deck`, sempre filtrando decididos |
| PUT | `/v1/me/swipes/:titleId` | `{ decision: LIKE\|DISLIKE }` (204) |
| DELETE | `/v1/me/swipes/:titleId` | Desfazer (204) |
| GET | `/v1/me/watchlist` | Lista de LIKEs com `watched` |
| PUT | `/v1/me/watchlist/:titleId/watched` | `{ watched }` (404 se não está na lista) |
| POST | `/v1/me/swipes/import` | Importa histórico anônimo (máx. 2000). A decisão mais recente vence; ids inexistentes são ignorados. → `{ imported }` |

## Admin (`ADMIN` confirmado no banco a cada chamada)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/v1/admin/stats` | Métricas e última sync |
| GET | `/v1/admin/titles?search=&hidden=&page=&pageSize=` | Catálogo (inclui ocultos) |
| PATCH | `/v1/admin/titles/:id` | `{ hidden?, featured? }` |
| GET | `/v1/admin/providers` · PUT `/v1/admin/providers/:id` | Listar / `{ enabled }` |
| GET | `/v1/admin/users?page=&pageSize=` | Usuários com conta |
| GET | `/v1/admin/sync-runs` | Últimas 30 sincronizações |
| POST | `/v1/admin/sync` | `{ scope: all\|cinema\|streaming\|providers }` → 202 (roda em segundo plano; 409 se já houver uma) |

## Limites

120 req/min por IP (global). Imagens vêm como URLs completas do CDN do TMDB (`TMDB_IMAGE_BASE_URL`).
