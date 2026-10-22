import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import type { DeckCriteria, DeckCursor } from '../domain/deck';
import type { Genre, Provider, Title } from '../domain/title';
import { TitleRepository } from '../domain/title.repository';
import { titleInclude, toTitle } from './title.mapper';

@Injectable()
export class PrismaTitleRepository extends TitleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findDeck(c: DeckCriteria): Promise<Title[]> {
    const rows = await this.prisma.title.findMany({
      where: this.deckWhere(c),
      orderBy: [{ featured: 'desc' }, { popularity: 'desc' }, { id: 'desc' }],
      take: c.limit,
      include: titleInclude,
    });
    return rows.map(toTitle);
  }

  async findById(id: number): Promise<Title | null> {
    const row = await this.prisma.title.findUnique({ where: { id }, include: titleInclude });
    return row ? toTitle(row) : null;
  }

  async listGenres(): Promise<Genre[]> {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  async listEnabledProviders(): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      where: { enabled: true },
      orderBy: [{ displayPriority: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, logoPath: true },
    });
  }

  private deckWhere(c: DeckCriteria): Prisma.TitleWhereInput {
    const and: Prisma.TitleWhereInput[] = [{ hidden: false }];

    if (c.scope === 'cinema') {
      and.push({ kind: 'MOVIE', availabilities: { some: { region: c.region, type: 'CINEMA' } } });
    } else {
      and.push({
        availabilities: {
          some: {
            region: c.region,
            type: 'FLATRATE',
            providerId: c.providerId,
            provider: { enabled: true },
          },
        },
      });
    }

    if (c.category === 'movie') and.push({ kind: 'MOVIE', isAnime: false });
    if (c.category === 'series') and.push({ kind: 'SERIES', isAnime: false });
    if (c.category === 'anime') and.push({ isAnime: true });

    if (c.excludeSwipedByUserId) {
      and.push({ swipes: { none: { userId: c.excludeSwipedByUserId } } });
    }
    if (c.after) and.push(this.afterCursor(c.after));
    return { AND: and };
  }

  /** Keyset pagination sobre (featured desc, popularity desc, id desc). */
  private afterCursor(a: DeckCursor): Prisma.TitleWhereInput {
    const sameBucket: Prisma.TitleWhereInput[] = [
      { featured: a.featured, popularity: { lt: a.popularity } },
      { featured: a.featured, popularity: a.popularity, id: { lt: a.id } },
    ];
    return { OR: a.featured ? [{ featured: false }, ...sameBucket] : sameBucket };
  }
}
