# 12 · Roadmap e pendências

## Para ter tudo funcionando de ponta a ponta (ação sua)
- [ ] Criar token do TMDB e rodar a primeira sincronização.
- [ ] Criar credenciais OAuth do Google (Web/Android/iOS) e preencher `GOOGLE_CLIENT_IDS`, `ADMIN_EMAILS`.
- [ ] Criar projetos no Railway (API+Postgres) e Vercel (admin) — ver [09](09-deploy.md).
- [ ] Gerar development build do app e testar swipe/login em aparelho real (gestos e Google Sign-In **não foram testados em dispositivo** — só compilação/tipos).

## Dívidas técnicas conhecidas
- Mobile sem testes automatizados (extrair lógica do `useDeck` e `LocalLibraryStore` e testar com jest).
- Assets do app (ícone/splash) e logo do TMDB.
- JWT único de 30 dias, sem refresh token/revogação (ver [ADR 0004](adr/0004-auth-google-jwt.md)).
- Admin: paginação simples, sem testes; sem auditoria de ações.
- Sem observabilidade (Sentry) nem alerta de falha da sync.
- Sincronização é single-region (BR) e sequencial por plataforma.

## Próximos passos sugeridos
1. **Insights e relatórios no admin**: gêneros/plataformas mais curtidos, funil swipe→lista→visto, usuários ativos (DAU/WAU), retenção. Eventos de uso (opt-in) se necessário.
2. Notificações push (novo em cartaz que combina com o gosto; estreia de título da lista).
3. Recomendação simples por gênero/similaridade.
4. Compartilhar lista; "assistir juntos" (match entre duas pessoas — o conceito Tinder completo).
5. Filtros por gênero e classificação etária no deck; modo "perfil infantil".
6. Trailer (TMDB `videos`) na tela de detalhes.
7. Multi-região (campo `region` já existe).
8. Cache/CDN de imagens e `ETag` no deck.
