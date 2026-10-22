import { Injectable } from '@nestjs/common';
import { parseBrazilianRating } from '../../catalog/domain/age-rating';
import { PrismaService } from '../../shared/prisma.service';
import { isAnime } from '../domain/anime';
import {
  CatalogWriter,
  type RemoteGenre,
  type RemoteProvider,
  type UpsertTitleInput,
} from '../domain/ports';

@Injectable()
export class PrismaCatalogWriter extends CatalogWriter {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async upsertGenres(genres: RemoteGenre[]): Promise<void> {
    await this.prisma.$transaction(
      genres.map((g) =>
        this.prisma.genre.upsert({
          where: { id: g.id },
          create: { id: g.id, name: g.name },
          update: { name: g.name },
        }),
      ),
    );
  }

  async upsertProviders(providers: RemoteProvider[], defaultEnabledIds: number[]): Promise<number> {
    const enabledByDefault = new Set(defaultEnabledIds);
    await this.prisma.$transaction(
      providers.map((p) =>
        this.prisma.provider.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            name: p.name,
            logoPath: p.logoPath,
            displayPriority: p.displayPriority,
            enabled: enabledByDefault.has(p.id),
          },
          update: { name: p.name, logoPath: p.logoPath, displayPriority: p.displayPriority },
        }),
      ),
    );
    return providers.length;
  }

  async listEnabledProviderIds(): Promise<number[]> {
    const rows = await this.prisma.provider.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async upsertTitle({ remote, region, inTheaters, now }: UpsertTitleInput): Promise<void> {
    const rating = parseBrazilianRating(remote.rawCertification);
    const fields = {
      title: remote.title,
      originalTitle: remote.originalTitle,
      overview: remote.overview,
      posterPath: remote.posterPath,
      backdropPath: remote.backdropPath,
      releaseDate: remote.releaseDate,
      runtimeMinutes: remote.runtimeMinutes,
      originalLanguage: remote.originalLanguage,
      originCountries: remote.originCountries,
      isAnime: isAnime({
        genreIds: remote.genres.map((g) => g.id),
        originalLanguage: remote.originalLanguage,
        originCountries: remote.originCountries,
      }),
      voteAverage: remote.voteAverage,
      voteCount: remote.voteCount,
      popularity: remote.popularity,
      certification: rating?.certification ?? null,
      minAge: rating?.minAge ?? null,
      syncedAt: now,
    };

    // Só referenciamos provedores já conhecidos (FK); desconhecidos entram no próximo sync de providers.
    const knownProviders = new Set(
      (
        await this.prisma.provider.findMany({
          where: { id: { in: remote.availability.map((a) => a.providerId) } },
          select: { id: true },
        })
      ).map((p) => p.id),
    );
    const availability = remote.availability.filter((a) => knownProviders.has(a.providerId));

    await this.prisma.$transaction(async (tx) => {
      await tx.genre.createMany({
        data: remote.genres.map((g) => ({ id: g.id, name: g.name })),
        skipDuplicates: true,
      });
      const title = await tx.title.upsert({
        where: { tmdbId_kind: { tmdbId: remote.tmdbId, kind: remote.kind } },
        create: { tmdbId: remote.tmdbId, kind: remote.kind, ...fields },
        update: fields,
        select: { id: true },
      });

      await tx.titleGenre.deleteMany({ where: { titleId: title.id } });
      await tx.titleGenre.createMany({
        data: remote.genres.map((g) => ({ titleId: title.id, genreId: g.id })),
        skipDuplicates: true,
      });

      // Streaming é "foto completa" do momento: substitui. Cinema só é tocado quando em cartaz;
      // a saída de cartaz é tratada por pruneStaleCinema.
      await tx.availability.deleteMany({
        where: { titleId: title.id, region, type: { not: 'CINEMA' } },
      });
      await tx.availability.createMany({
        data: availability.map((a) => ({
          titleId: title.id,
          region,
          type: a.type,
          providerId: a.providerId,
          lastSeenAt: now,
        })),
      });
      if (inTheaters) {
        const updated = await tx.availability.updateMany({
          where: { titleId: title.id, region, type: 'CINEMA' },
          data: { lastSeenAt: now },
        });
        if (updated.count === 0) {
          await tx.availability.create({
            data: { titleId: title.id, region, type: 'CINEMA', lastSeenAt: now },
          });
        }
      }
    });
  }

  async pruneStaleCinema(region: string, before: Date): Promise<number> {
    const { count } = await this.prisma.availability.deleteMany({
      where: { region, type: 'CINEMA', lastSeenAt: { lt: before } },
    });
    return count;
  }

  async pruneOrphanTitles(olderThan: Date): Promise<number> {
    const { count } = await this.prisma.title.deleteMany({
      where: { availabilities: { none: {} }, swipes: { none: {} }, syncedAt: { lt: olderThan } },
    });
    return count;
  }
}
