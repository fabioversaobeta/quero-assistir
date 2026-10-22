# ADR 0003 — Modo anônimo local-first e migração no login

**Status:** aceita

**Contexto:** o usuário pode não querer conectar conta; nesse caso os dados ficam só no aparelho.

**Decisão:** a biblioteca do usuário é a porta `LibraryStore` com duas implementações: `LocalLibraryStore` (AsyncStorage, guarda snapshot do título curtido) e `RemoteLibraryStore` (API). Anônimo usa apenas endpoints públicos; o app filtra localmente o que já decidiu. No login, o histórico local é enviado em lote (`/v1/me/swipes/import`, "mais recente vence") e então apagado do aparelho.

**Consequências:**
- (+) Privacidade: anônimo nunca envia decisões; servidor sem usuários fantasmas.
- (+) Mesma UI para os dois modos.
- (−) Desinstalar o app anônimo perde os dados (aviso na tela de perfil).
- (−) O deck anônimo pode precisar de várias páginas para achar cartas não vistas (loop em `useDeck`).
