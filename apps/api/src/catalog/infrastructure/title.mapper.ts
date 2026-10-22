import type { Prisma } from '@prisma/client';
import type { Title } from '../domain/title';

export const titleInclude = {
  genres: { include: { genre: true } },
  availabilities: { include: { provider: true } },
} satisfies Prisma.TitleInclude;

export type TitleRow = Prisma.TitleGetPayload<{ include: typeof titleInclude }>;

export function toTitle(row: TitleRow): Title {
  return {
    id: row.id,
    tmdbId: row.tmdbId,
    kind: row.kind,
    isAnime: row.isAnime,
    title: row.title,
    originalTitle: row.originalTitle,
    overview: row.overview,
    posterPath: row.posterPath,
    backdropPath: row.backdropPath,
    releaseDate: row.releaseDate,
    runtimeMinutes: row.runtimeMinutes,
    certification: row.certification,
    minAge: row.minAge,
    voteAverage: row.voteAverage,
    popularity: row.popularity,
    hidden: row.hidden,
    featured: row.featured,
    syncedAt: row.syncedAt,
    genres: row.genres.map((g) => ({ id: g.genre.id, name: g.genre.name })),
    availability: row.availabilities
      // Só expõe plataformas habilitadas; cinema não tem provedor.
      .filter((a) => a.type === 'CINEMA' || a.provider?.enabled)
      .map((a) => ({
        type: a.type,
        provider: a.provider
          ? { id: a.provider.id, name: a.provider.name, logoPath: a.provider.logoPath }
          : null,
      })),
  };
}
