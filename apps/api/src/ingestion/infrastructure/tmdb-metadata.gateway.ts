import { Injectable } from '@nestjs/common';
import { Config } from '../../config/app-config';
import {
  MetadataGateway,
  type RemoteGenre,
  type RemoteProvider,
  type RemoteTitle,
  type StreamingQuery,
  type TitleRef,
} from '../domain/ports';
import { TmdbHttpClient } from './tmdb-http.client';
import {
  mapMovie,
  mapTv,
  toRefs,
  type TmdbGenre,
  type TmdbMovieDetails,
  type TmdbTvDetails,
} from './tmdb.mapper';

interface Paged<T> {
  results: T[];
  total_pages: number;
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priorities?: Record<string, number>;
}

@Injectable()
export class TmdbMetadataGateway extends MetadataGateway {
  constructor(
    private readonly http: TmdbHttpClient,
    private readonly config: Config,
  ) {
    super();
  }

  async listGenres(): Promise<RemoteGenre[]> {
    const [movie, tv] = await Promise.all([
      this.http.get<{ genres: TmdbGenre[] }>('/genre/movie/list'),
      this.http.get<{ genres: TmdbGenre[] }>('/genre/tv/list'),
    ]);
    return [...new Map([...movie.genres, ...tv.genres].map((g) => [g.id, g])).values()];
  }

  async listProviders(): Promise<RemoteProvider[]> {
    const region = this.config.tmdb.region;
    const [movie, tv] = await Promise.all([
      this.http.get<{ results: TmdbProvider[] }>('/watch/providers/movie', { watch_region: region }),
      this.http.get<{ results: TmdbProvider[] }>('/watch/providers/tv', { watch_region: region }),
    ]);
    const merged = new Map<number, RemoteProvider>();
    for (const p of [...movie.results, ...tv.results]) {
      merged.set(p.provider_id, {
        id: p.provider_id,
        name: p.provider_name,
        logoPath: p.logo_path,
        displayPriority: p.display_priorities?.[region] ?? 100,
      });
    }
    return [...merged.values()];
  }

  async listNowPlaying(maxPages: number): Promise<TitleRef[]> {
    return this.collectPages(maxPages, (page) =>
      this.http.get<Paged<{ id: number }>>('/movie/now_playing', {
        region: this.config.tmdb.region,
        page,
      }),
      'MOVIE',
    );
  }

  async listStreaming(q: StreamingQuery): Promise<TitleRef[]> {
    const path = q.kind === 'MOVIE' ? '/discover/movie' : '/discover/tv';
    return this.collectPages(q.pages, (page) =>
      this.http.get<Paged<{ id: number }>>(path, {
        watch_region: this.config.tmdb.region,
        with_watch_providers: q.providerId,
        with_watch_monetization_types: 'flatrate',
        sort_by: 'popularity.desc',
        include_adult: false,
        ...(q.animeOnly ? { with_genres: 16, with_original_language: 'ja' } : {}),
        page,
      }),
      q.kind,
    );
  }

  async getTitle(ref: TitleRef): Promise<RemoteTitle> {
    const region = this.config.tmdb.region;
    if (ref.kind === 'MOVIE') {
      const d = await this.http.get<TmdbMovieDetails>(`/movie/${ref.tmdbId}`, {
        append_to_response: 'release_dates,watch/providers',
      });
      return mapMovie(d, region);
    }
    const d = await this.http.get<TmdbTvDetails>(`/tv/${ref.tmdbId}`, {
      append_to_response: 'content_ratings,watch/providers',
    });
    return mapTv(d, region);
  }

  private async collectPages(
    maxPages: number,
    fetchPage: (page: number) => Promise<Paged<{ id: number }>>,
    kind: TitleRef['kind'],
  ): Promise<TitleRef[]> {
    const refs: TitleRef[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const data = await fetchPage(page);
      refs.push(...toRefs(data.results, kind));
      if (page >= data.total_pages) break;
    }
    return refs;
  }
}
