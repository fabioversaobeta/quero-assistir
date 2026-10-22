import type {
  AuthResponse,
  DeckQuery,
  PageDto,
  ProviderDto,
  SwipeDecision,
  TitleDto,
  WatchlistItemDto,
} from '@quero-assistir/contracts';
import { config } from '@/core/config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type TokenProvider = () => string | null;

/** Cliente HTTP da API. O token é lido a cada chamada para refletir login/logout. */
export class ApiClient {
  constructor(private readonly getToken: TokenProvider) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.getToken();
    const response = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(response.status, data?.message ?? `Erro ${response.status}`);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  deck(query: DeckQuery, authenticated: boolean): Promise<PageDto<TitleDto>> {
    const params = new URLSearchParams({ scope: query.scope });
    if (query.category) params.set('category', query.category);
    if (query.providerId) params.set('providerId', String(query.providerId));
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit) params.set('limit', String(query.limit));
    return this.request('GET', `${authenticated ? '/v1/me/deck' : '/v1/deck'}?${params}`);
  }

  title(id: number) {
    return this.request<TitleDto>('GET', `/v1/titles/${id}`);
  }

  providers() {
    return this.request<ProviderDto[]>('GET', '/v1/providers');
  }

  loginWithGoogle(idToken: string) {
    return this.request<AuthResponse>('POST', '/v1/auth/google', { idToken });
  }

  deleteAccount() {
    return this.request<void>('DELETE', '/v1/me');
  }

  swipe(titleId: number, decision: SwipeDecision) {
    return this.request<void>('PUT', `/v1/me/swipes/${titleId}`, { decision });
  }

  undoSwipe(titleId: number) {
    return this.request<void>('DELETE', `/v1/me/swipes/${titleId}`);
  }

  setWatched(titleId: number, watched: boolean) {
    return this.request<void>('PUT', `/v1/me/watchlist/${titleId}/watched`, { watched });
  }

  watchlist() {
    return this.request<WatchlistItemDto[]>('GET', '/v1/me/watchlist');
  }

  importSwipes(
    swipes: { titleId: number; decision: SwipeDecision; decidedAt: string; watched: boolean }[],
  ) {
    return this.request<{ imported: number }>('POST', '/v1/me/swipes/import', { swipes });
  }
}
