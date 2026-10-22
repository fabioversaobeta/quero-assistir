# 07 · App mobile

Expo SDK 58 · React Native 0.88 · Expo Router (arquivo = rota) · TypeScript. **Requer development build** (Google Sign-In é módulo nativo; não funciona no Expo Go).

## Estrutura (`apps/mobile/src`)

```
app/                 rotas: _layout, (tabs)/{index,list,profile}, title/[id]
core/                config (EXPO_PUBLIC_*), tema/cores (inclui cores da classificação)
data/                ApiClient; LibraryStore (porta) + Local/Remote
features/deck/       useDeck (fila + paginação + desfazer), SwipeCard (gestos)
features/session/    SessionProvider (token no SecureStore, login/logout/exclusão, migração)
ui/                  componentes compartilhados (RatingBadge)
```

## Anônimo × logado

`LibraryStore` é a porta; a sessão escolhe a implementação:

| | `LocalLibraryStore` (anônimo) | `RemoteLibraryStore` (logado) |
| --- | --- | --- |
| Persistência | AsyncStorage (aparelho) | API (`/v1/me/*`) |
| Deck | `/v1/deck` + filtro local de ids decididos (continua paginando até ter cartas) | `/v1/me/deck` (servidor filtra) |

No login (`SessionProvider.signIn`): idToken Google → `POST /v1/auth/google` → JWT no **SecureStore** → `POST /v1/me/swipes/import` com o histórico local → limpa o local.

## Swipe

`SwipeCard` usa **gesture-handler 3** (`usePanGesture` + `GestureDetector`) e **Reanimated 4** (`scheduleOnRN` de `react-native-worklets`). Limiar de 30% da largura ou velocidade > 900 px/s; carimbos QUERO/PASSO; botões ✕ ↩ ♥ chamam `swipe()` imperativo (acessibilidade). A fila mantém a carta seguinte renderizada por baixo.

Fim do cinema → tela "Você já viu tudo em cartaz" com botão para o streaming (categoria e plataforma como chips).

## Rodar

```bash
cp apps/mobile/.env.example apps/mobile/.env     # EXPO_PUBLIC_API_URL etc.
pnpm --filter @quero-assistir/mobile exec expo prebuild
pnpm --filter @quero-assistir/mobile android     # ou ios (macOS)
pnpm dev:mobile                                  # Metro com dev client
```

`EXPO_PUBLIC_API_URL`: emulador Android `http://10.0.2.2:3000`; aparelho físico = IP da máquina. Login Google exige os Client IDs (ver [Deploy](09-deploy.md#google-oauth)).

Build na nuvem: `eas build` (perfis em `eas.json`) ou workflow manual `Mobile build (EAS)`.

## Pendências conhecidas

Ícone/splash definitivos (`assets/`), logo do TMDB, testes automatizados, textos de privacidade — ver [roadmap](12-roadmap.md).
