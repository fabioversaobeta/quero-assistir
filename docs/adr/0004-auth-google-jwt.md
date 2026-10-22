# ADR 0004 — Login Google → JWT próprio

**Status:** aceita (simplificada)

**Decisão:** o cliente obtém um **idToken** do Google (SDK nativo no app, Google Identity no admin); a API o valida (`google-auth-library`, audiences = `GOOGLE_CLIENT_IDS`, e-mail verificado) e emite **JWT próprio** (30 dias). Papel ADMIN por allowlist `ADMIN_EMAILS`, **reconfirmado no banco** em cada chamada admin (revogação imediata).

**Consequências:**
- (+) Sem senhas; sem dependência de sessão do Google após o login; fácil de testar (porta `GoogleIdentityVerifier` com fake no e2e).
- (−) Sem refresh token/revogação de JWT comum: token roubado vale até expirar. Mitigação futura: refresh tokens rotativos + tabela de sessões. Admin reduz o cookie para ≤ 7 dias.
