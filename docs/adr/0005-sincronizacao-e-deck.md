# ADR 0005 — Sincronização diária e deck por cursor

**Status:** aceita

**Contexto:** o app só mostra o que está na nossa base; o catálogo muda diariamente.

**Decisão:**
- Ingestão idempotente por upsert, **uma execução por vez** garantida pela tabela `SyncRun` (vale com várias réplicas), agendador in-process (`cron`) com alternativa de Cron Service (CLI).
- Detalhe completo via `append_to_response` (1 chamada/título); disponibilidade de streaming substituída por completo; `CINEMA` expira por `lastSeenAt`.
- Deck com **keyset pagination** (featured, popularity, id) e cursor opaco; para logados o servidor exclui decididos (`NOT EXISTS`), para anônimos o app filtra.

**Consequências:**
- (+) Ordem estável, sem `OFFSET` caro, sem duplicatas entre páginas.
- (+) Falhas parciais não perdem a execução inteira.
- (−) Popularidade muda com o tempo; cartas já paginadas mantêm a ordem do momento.
- (−) Ingestão sequencial por plataforma: escala até algumas dezenas de plataformas; depois, filas/paralelismo.
