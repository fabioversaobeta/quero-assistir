# ADR 0002 — TMDB como fonte de metadados

**Status:** aceita (com ressalva de licença)

**Contexto:** precisamos de filmes em cartaz (Brasil), capa, sinopse, classificação etária, gêneros e disponibilidade em streaming (filmes, séries, animes).

**Alternativas:** OMDb (sem em-cartaz/streaming), Trakt (sem capas/streaming), Watchmode/JustWatch direto (streaming pago/parceiro), scraping (frágil e juridicamente arriscado).

**Decisão:** **TMDB** — gratuito, em cartaz por região, imagens CDN, pt-BR, classificação por país e `watch/providers` (dados JustWatch). Acessado só pela ingestão atrás da porta `MetadataGateway`.

**Consequências:**
- (+) Uma API cobre todos os requisitos.
- (−) Termos: uso gratuito é não comercial; monetizar exige licença. Atribuição obrigatória. Ver [05](../05-integracao-tmdb.md).
- (+) A porta permite trocar de fonte sem tocar no domínio.
- (−) "Anime" não existe como tipo: usamos heurística (animação + origem japonesa).
