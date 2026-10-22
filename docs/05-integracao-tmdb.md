# 05 · Integração com o TMDB

Fonte escolhida: **TMDB** ([ADR 0002](adr/0002-tmdb-como-fonte.md)). Cobre em uma API só: em cartaz por região, capas, sinopse em pt-BR, gêneros, **classificação indicativa por país**, e **disponibilidade em streaming** (dados do JustWatch).

Autenticação: *API Read Access Token* (Bearer) em `TMDB_API_TOKEN`. Crie em themoviedb.org → Configurações → API.

## Endpoints usados

| Necessidade | Endpoint |
| --- | --- |
| Em cartaz no BR | `GET /movie/now_playing?region=BR&language=pt-BR&page=N` |
| Catálogo de uma plataforma | `GET /discover/movie` e `/discover/tv` com `watch_region=BR`, `with_watch_providers=<id>`, `with_watch_monetization_types=flatrate`, `sort_by=popularity.desc` |
| Animes | `/discover/tv` + `with_genres=16` + `with_original_language=ja` |
| Detalhe do filme | `GET /movie/{id}?append_to_response=release_dates,watch/providers` |
| Detalhe da série | `GET /tv/{id}?append_to_response=content_ratings,watch/providers` |
| Plataformas do país | `GET /watch/providers/movie` e `/tv` com `watch_region=BR` |
| Gêneros | `GET /genre/movie/list`, `/genre/tv/list` |

Um único `append_to_response` traz detalhes + classificação + disponibilidade (1 chamada por título).

## Mapeamento (`ingestion/infrastructure/tmdb.mapper.ts`, funções puras e testadas)

- **Classificação:** filme → `release_dates` do país, preferindo o tipo 3 (cinema) com certificação preenchida; série → `content_ratings`. Normalizada por `parseBrazilianRating`.
- **Disponibilidade:** `watch/providers.results[BR]` → `flatrate`/`rent`/`buy`; só provedores já cadastrados (FK).
- **Cinema:** filme listado em `now_playing` na execução ⇒ `CINEMA`.
- **Anime:** gênero 16 + (`original_language=ja` ou origem `JP`) — `ingestion/domain/anime.ts`.
- **Imagens:** guardamos só o `path`; a API monta `{TMDB_IMAGE_BASE_URL}/w500/…` (pôster), `w780` (backdrop), `w92` (logo de plataforma).

## Resiliência

`TmdbHttpClient`: Bearer, `language` padrão, retry com backoff em 429/5xx (respeita `Retry-After`, 4 tentativas). Detalhes com concorrência 5. Falha em um título é contada e não derruba a sync.

## ⚠️ Licença e atribuição

- É **obrigatório** exibir a atribuição ("Este produto usa a API do TMDB mas não é endossado nem certificado por ele") e idealmente o logo do TMDB — já há o texto em Perfil; **adicione o logo oficial** antes de publicar.
- O uso **gratuito do TMDB é para fins não comerciais**; se o app tiver anúncios, assinatura ou qualquer monetização, é preciso contatar o TMDB para licença comercial. **Verifique os termos vigentes antes de publicar** (https://www.themoviedb.org/api-terms-of-use).
- Disponibilidade de streaming vem do JustWatch: manter o crédito "JustWatch" conforme os termos do TMDB.
- Plano B se a licença for um impeditivo: implementar outra `MetadataGateway` (ex.: Watchmode, JustWatch parceiro) sem mexer no restante.
