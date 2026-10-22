import type { RemoteAvailability, RemoteGenre, RemoteTitle, TitleRef } from '../domain/ports';

/** Subconjunto dos campos do TMDB que consumimos. Funções puras: fáceis de testar. */
export interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbProviderEntry {
  provider_id: number;
}

export interface TmdbWatchProviders {
  results?: Record<
    string,
    { flatrate?: TmdbProviderEntry[]; rent?: TmdbProviderEntry[]; buy?: TmdbProviderEntry[] }
  >;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  runtime?: number | null;
  original_language?: string;
  production_countries?: { iso_3166_1: string }[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genres?: TmdbGenre[];
  release_dates?: {
    results?: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[];
  };
  'watch/providers'?: TmdbWatchProviders;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  original_name: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  episode_run_time?: number[];
  original_language?: string;
  origin_country?: string[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genres?: TmdbGenre[];
  content_ratings?: { results?: { iso_3166_1: string; rating: string }[] };
  'watch/providers'?: TmdbWatchProviders;
}

const THEATRICAL = 3;

export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function mapAvailability(wp: TmdbWatchProviders | undefined, region: string): RemoteAvailability[] {
  const entry = wp?.results?.[region];
  if (!entry) return [];
  const out: RemoteAvailability[] = [];
  for (const [key, type] of [
    ['flatrate', 'FLATRATE'],
    ['rent', 'RENT'],
    ['buy', 'BUY'],
  ] as const) {
    for (const p of entry[key] ?? []) out.push({ type, providerId: p.provider_id });
  }
  return out;
}

export function pickMovieCertification(details: TmdbMovieDetails, region: string): string | null {
  const country = details.release_dates?.results?.find((r) => r.iso_3166_1 === region);
  const withRating = (country?.release_dates ?? []).filter((d) => d.certification?.trim());
  const preferred = withRating.find((d) => d.type === THEATRICAL) ?? withRating[0];
  return preferred?.certification.trim() ?? null;
}

export function mapMovie(d: TmdbMovieDetails, region: string): RemoteTitle {
  return {
    tmdbId: d.id,
    kind: 'MOVIE',
    title: d.title,
    originalTitle: d.original_title,
    overview: d.overview ?? '',
    posterPath: d.poster_path ?? null,
    backdropPath: d.backdrop_path ?? null,
    releaseDate: parseDate(d.release_date),
    runtimeMinutes: d.runtime || null,
    originalLanguage: d.original_language ?? null,
    originCountries: (d.production_countries ?? []).map((c) => c.iso_3166_1),
    voteAverage: d.vote_average ?? 0,
    voteCount: d.vote_count ?? 0,
    popularity: d.popularity ?? 0,
    genres: (d.genres ?? []) as RemoteGenre[],
    rawCertification: pickMovieCertification(d, region),
    availability: mapAvailability(d['watch/providers'], region),
  };
}

export function mapTv(d: TmdbTvDetails, region: string): RemoteTitle {
  const rating = d.content_ratings?.results?.find((r) => r.iso_3166_1 === region)?.rating?.trim();
  return {
    tmdbId: d.id,
    kind: 'SERIES',
    title: d.name,
    originalTitle: d.original_name,
    overview: d.overview ?? '',
    posterPath: d.poster_path ?? null,
    backdropPath: d.backdrop_path ?? null,
    releaseDate: parseDate(d.first_air_date),
    runtimeMinutes: d.episode_run_time?.[0] || null,
    originalLanguage: d.original_language ?? null,
    originCountries: d.origin_country ?? [],
    voteAverage: d.vote_average ?? 0,
    voteCount: d.vote_count ?? 0,
    popularity: d.popularity ?? 0,
    genres: (d.genres ?? []) as RemoteGenre[],
    rawCertification: rating || null,
    availability: mapAvailability(d['watch/providers'], region),
  };
}

/** Itens de listagem (discover/now_playing) só importam pelo id; detalhes vêm depois. */
export function toRefs(results: { id: number }[] | undefined, kind: TitleRef['kind']): TitleRef[] {
  return (results ?? []).map((r) => ({ tmdbId: r.id, kind }));
}
