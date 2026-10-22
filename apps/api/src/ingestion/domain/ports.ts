import type { AvailabilityType, TitleKind } from '@quero-assistir/contracts';

export interface TitleRef {
  tmdbId: number;
  kind: TitleKind;
}

export interface RemoteGenre {
  id: number;
  name: string;
}

export interface RemoteProvider {
  id: number;
  name: string;
  logoPath: string | null;
  displayPriority: number;
}

export interface RemoteAvailability {
  type: Exclude<AvailabilityType, 'CINEMA'>;
  providerId: number;
}

/** Título completo já normalizado (independente do formato do TMDB). */
export interface RemoteTitle extends TitleRef {
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: Date | null;
  runtimeMinutes: number | null;
  originalLanguage: string | null;
  originCountries: string[];
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genres: RemoteGenre[];
  /** Classificação indicativa bruta do país configurado (ex.: "12"). */
  rawCertification: string | null;
  availability: RemoteAvailability[];
}

export interface StreamingQuery {
  providerId: number;
  kind: TitleKind;
  /** Restringe a animações japonesas. */
  animeOnly: boolean;
  pages: number;
}

/** Porta para a fonte externa de metadados de filmes/séries (hoje: TMDB). */
export abstract class MetadataGateway {
  abstract listGenres(): Promise<RemoteGenre[]>;
  abstract listProviders(): Promise<RemoteProvider[]>;
  abstract listNowPlaying(maxPages: number): Promise<TitleRef[]>;
  abstract listStreaming(query: StreamingQuery): Promise<TitleRef[]>;
  abstract getTitle(ref: TitleRef): Promise<RemoteTitle>;
}

export interface UpsertTitleInput {
  remote: RemoteTitle;
  region: string;
  inTheaters: boolean;
  now: Date;
}

/** Porta de escrita do catálogo, usada somente pela ingestão. */
export abstract class CatalogWriter {
  abstract upsertGenres(genres: RemoteGenre[]): Promise<void>;
  /** Insere novos provedores (habilitando `defaultEnabledIds`) e atualiza nome/logo dos existentes sem tocar em `enabled`. */
  abstract upsertProviders(providers: RemoteProvider[], defaultEnabledIds: number[]): Promise<number>;
  abstract listEnabledProviderIds(): Promise<number[]>;
  abstract upsertTitle(input: UpsertTitleInput): Promise<void>;
  /** Remove disponibilidade de cinema que não foi vista desde `before`. Devolve quantas removeu. */
  abstract pruneStaleCinema(region: string, before: Date): Promise<number>;
  /** Remove títulos sem disponibilidade, sem decisões de usuários e antigos. */
  abstract pruneOrphanTitles(olderThan: Date): Promise<number>;
}

export type SyncScope = 'all' | 'cinema' | 'streaming' | 'providers';
export type SyncTriggerKind = 'SCHEDULE' | 'MANUAL';

export interface SyncRunRecord {
  id: number;
  scope: string;
  trigger: SyncTriggerKind;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  startedAt: Date;
  finishedAt: Date | null;
  stats: Record<string, number> | null;
  error: string | null;
}

export abstract class SyncRunRepository {
  abstract start(scope: SyncScope, trigger: SyncTriggerKind): Promise<SyncRunRecord>;
  abstract succeed(id: number, stats: Record<string, number>): Promise<void>;
  abstract fail(id: number, error: string, stats?: Record<string, number>): Promise<void>;
  abstract findRunningSince(since: Date): Promise<SyncRunRecord | null>;
  abstract listRecent(limit: number): Promise<SyncRunRecord[]>;
  /** Marca como FAILED execuções RUNNING antigas (processo morreu no meio). */
  abstract failStale(before: Date): Promise<void>;
}
