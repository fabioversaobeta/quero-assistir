/**
 * Contratos HTTP da API Quero Assistir (v1).
 * Somente tipos: consumidores devem usar `import type` para nunca gerar código em runtime.
 */

export type TitleKind = 'MOVIE' | 'SERIES';
export type DeckCategory = 'all' | 'movie' | 'series' | 'anime';
export type DeckScope = 'cinema' | 'streaming';
export type AvailabilityType = 'CINEMA' | 'FLATRATE' | 'RENT' | 'BUY';
export type SwipeDecision = 'LIKE' | 'DISLIKE';
export type UserRole = 'USER' | 'ADMIN';

export interface GenreDto {
  id: number;
  name: string;
}

export interface ProviderDto {
  id: number;
  name: string;
  logoUrl: string | null;
}

export interface AvailabilityDto {
  type: AvailabilityType;
  provider: ProviderDto | null;
}

export interface TitleDto {
  id: number;
  kind: TitleKind;
  isAnime: boolean;
  title: string;
  originalTitle: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  /** Classificação indicativa do Brasil (L, 10, 12, 14, 16, 18) quando conhecida. */
  certification: string | null;
  /** Idade mínima numérica (0 para Livre). */
  minAge: number | null;
  voteAverage: number;
  genres: GenreDto[];
  availability: AvailabilityDto[];
}

export interface PageDto<T> {
  items: T[];
  /** Cursor opaco para a próxima página; null quando acabou. */
  nextCursor: string | null;
}

export interface DeckQuery {
  scope: DeckScope;
  category?: DeckCategory;
  providerId?: number;
  cursor?: string;
  limit?: number;
}

export interface AuthGoogleRequest {
  idToken: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: UserDto;
}

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  role: UserRole;
}

export interface SwipeRequest {
  decision: SwipeDecision;
}

export interface ImportSwipesRequest {
  swipes: { titleId: number; decision: SwipeDecision; decidedAt?: string; watched?: boolean }[];
}

export interface WatchlistItemDto {
  title: TitleDto;
  watched: boolean;
  decidedAt: string;
}

export interface SetWatchedRequest {
  watched: boolean;
}

// ---- Backoffice ----

export interface AdminStatsDto {
  titles: { total: number; hidden: number; inTheaters: number; onStreaming: number };
  users: { total: number; newLast7Days: number };
  swipes: { total: number; likes: number; dislikes: number; last24h: number };
  topLiked: { titleId: number; title: string; likes: number }[];
  lastSync: SyncRunDto | null;
}

export interface SyncRunDto {
  id: number;
  scope: string;
  trigger: 'SCHEDULE' | 'MANUAL';
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  stats: Record<string, number> | null;
  error: string | null;
}

export interface TriggerSyncRequest {
  scope: 'all' | 'cinema' | 'streaming' | 'providers';
}

export interface AdminTitleDto extends TitleDto {
  hidden: boolean;
  featured: boolean;
  tmdbId: number;
  popularity: number;
  syncedAt: string;
}

export interface UpdateTitleModerationRequest {
  hidden?: boolean;
  featured?: boolean;
}

export interface AdminProviderDto extends ProviderDto {
  enabled: boolean;
}

export interface AdminUserDto extends UserDto {
  createdAt: string;
  lastLoginAt: string;
  swipeCount: number;
}
