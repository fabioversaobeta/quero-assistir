# 01 · Visão do produto

## Objetivo

Ajudar pessoas a decidir **o que assistir** com uma interação rápida de swipe. O usuário monta sua lista de "quero assistir" sem precisar pesquisar.

## Funcionalidades

### App (usuário)

| Funcionalidade | Detalhe |
| --- | --- |
| Swipe | Direita = quero assistir (LIKE). Esquerda = descartar (DISLIKE). Botões equivalentes (✕ / ♥) e **desfazer** da última carta. |
| Carta do título | Capa, título, **classificação indicativa** (L/10/12/14/16/18, cores oficiais), tipo, ano, gêneros, onde assistir e sinopse. Toque abre os detalhes. |
| Em cartaz | Filmes em exibição nos cinemas do Brasil. É a primeira experiência. |
| Streaming | Quando o usuário esgota o cinema, o app sugere o catálogo de plataformas: filtros por **categoria** (tudo/filmes/séries/animes) e por **plataforma**. |
| Minha lista | Títulos curtidos; marcar como "já vi"; remover. |
| Detalhes | Backdrop, sinopse, duração, nota, gêneros, classificação por extenso, onde assistir. |
| Anônimo | Sem login: dados só no aparelho. |
| Login Google | Lista na nuvem, multi-aparelho. **Migra** o histórico anônimo no primeiro login. |
| Excluir conta | Apaga usuário e todas as decisões (exigência Apple/Google/LGPD). |

### Painel admin

Visão geral (títulos, usuários, swipes, taxa de "quero ver", mais desejados, última sync) · Catálogo (buscar, ocultar, destacar) · Plataformas (habilitar/desabilitar) · Sincronização (disparo manual por escopo + histórico) · Usuários. Futuro: insights, relatórios e dashboards (ver roadmap).

### Rotinas automáticas

Sincronização diária com o TMDB (padrão 05:00 America/Sao_Paulo): novos filmes em cartaz, saída de cartaz, catálogo das plataformas habilitadas, limpeza de órfãos.

## Regras de negócio

1. O app **só exibe títulos que já estão na nossa base** (nunca consulta o TMDB direto).
2. **Cinema:** só filmes com disponibilidade `CINEMA` na região (BR) vistos na última sincronização.
3. **Streaming:** só títulos com `FLATRATE` (assinatura) em plataforma **habilitada** no admin.
4. Título **oculto** pelo admin some do deck, da lista e dos detalhes.
5. Título já decidido **não reaparece** (servidor filtra para logado; app filtra para anônimo). Desfazer o devolve ao deck.
6. **Anime** = animação (gênero 16 do TMDB) de origem japonesa.
7. Ordem do deck: destaque (admin) → popularidade → id; paginação por cursor estável.
8. Usuário é ADMIN se seu e-mail estiver em `ADMIN_EMAILS` (revalidado a cada login e a cada chamada admin).
9. Dados do anônimo nunca vão ao servidor; ao logar, são importados (decisão mais recente vence) e o local é limpo.

## Fora de escopo (por ora)

Compra/aluguel, reviews, recomendações personalizadas, social, notificações push — ver [roadmap](12-roadmap.md).
