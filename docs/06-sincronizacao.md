# 06 · Sincronização do catálogo

Caso de uso: `ingestion/application/sync-catalog.use-case.ts`.

## Escopos

| Escopo | O que faz |
| --- | --- |
| `providers` | Atualiza gêneros e plataformas do país (novas entram desabilitadas, exceto as padrão) |
| `cinema` | `now_playing` (até 5 páginas) → detalhes → grava com `CINEMA`; remove `CINEMA` não visto nesta execução |
| `streaming` | Para cada plataforma **habilitada**: filmes, séries e animes (3 consultas × `SYNC_STREAMING_PAGES` páginas) → detalhes → grava |
| `all` | `providers` + `cinema` + `streaming` + limpeza de títulos órfãos (>30 dias, sem disponibilidade nem decisões) |

## Quando roda

- **Diário** às `SYNC_CRON` (padrão `0 5 * * *`, fuso `SYNC_TIMEZONE`=America/Sao_Paulo), dentro da API (`SYNC_SCHEDULER_ENABLED=true`).
- **Manual** pelo painel admin (`POST /v1/admin/sync`, responde 202).
- **CLI**: `pnpm --filter @quero-assistir/api sync [escopo]` (após `build`). Útil como **Cron Service do Railway** — nesse caso use `SYNC_SCHEDULER_ENABLED=false` na API para não duplicar.

## Garantias

- **Uma por vez:** `begin()` recusa (409) se há `SyncRun` RUNNING nos últimos 120 min; execuções RUNNING mais velhas são marcadas FAILED (processo morto). Vale entre réplicas.
- **Falha parcial não aborta:** erros por título viram contadores (`cinemaFailed`, `streamingFailed`) e warnings no log. Falha total (ex.: token inválido) marca a execução FAILED com a mensagem.
- **Idempotente:** reexecutar é seguro (upserts; disponibilidade de streaming substituída; cinema por `lastSeenAt`).
- **Cinema consistente:** só filmes de `now_playing` ganham/mantêm `CINEMA`, mesmo se também aparecem em streaming.

## Operação

- Histórico e resultado: painel admin → Sincronização (ou tabela `SyncRun`).
- Primeira carga: rode `all` manualmente após configurar `TMDB_API_TOKEN`. Duração típica: alguns minutos (≈ 1 chamada por título, ~5 simultâneas).
- Habilitou uma plataforma nova? Rode `streaming`.
- Custo/volume: ajuste `SYNC_STREAMING_PAGES` (20 títulos por página por consulta).
