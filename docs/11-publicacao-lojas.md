# 11 · Publicação nas lojas (futuro)

Não é prioridade agora; este é o checklist para quando você se cadastrar.

## Contas
- **Google Play Console** — taxa única (US$ 25). Contas pessoais novas exigem teste fechado (12+ testadores por 14 dias) antes da produção — confirme as regras vigentes.
- **Apple Developer Program** — US$ 99/ano. Requer Mac ou EAS Build para compilar iOS.

## Requisitos que o app já atende
- **Exclusão de conta dentro do app** (Perfil → Excluir minha conta → `DELETE /v1/me`) — obrigatória na Apple e no Google quando há criação de conta.
- **Login opcional**: o app é totalmente utilizável sem conta.
- Google Sign-In nativo.

## A fazer antes de submeter
1. **Política de privacidade** pública (URL): dados coletados = e-mail/nome/foto (Google) e decisões de swipe, apenas para quem loga; anônimo = nada sai do aparelho. Inclua como excluir a conta.
2. Formulários de segurança de dados (Play *Data safety*; App Store *Privacy nutrition labels*).
3. **Atribuição TMDB/JustWatch** com logo (ver [05](05-integracao-tmdb.md#⚠️-licença-e-atribuição)) e **licença comercial** se houver monetização.
4. Ícone, splash, screenshots, descrição, categoria (Entretenimento), **classificação etária** do app (questionário IARC/Apple).
5. Trocar `bundleIdentifier`/`package` (`app.queroassistir.mobile`) se quiser outro identificador — é definitivo após publicar.
6. `eas build --profile production` + `eas submit`.
7. Domínio próprio para API/admin e HTTPS (Railway/Vercel já provêm).
