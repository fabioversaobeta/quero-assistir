import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Provider, Title } from '../../catalog/domain/title';
import { titleInclude, toTitle } from '../../catalog/infrastructure/title.mapper';
import { PrismaService } from '../../shared/prisma.service';
import {
  BackofficeRepository,
  type AdminStats,
  type AdminUserRow,
  type TitleSearch,
} from '../application/backoffice';

@Injectable()
export class PrismaBackofficeRepository extends BackofficeRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async stats(): Promise<AdminStats> {
    const day = new Date(Date.now() - 86_400_000);
    const week = new Date(Date.now() - 7 * 86_400_000);
    const [total, hidden, inTheaters, onStreaming, users, newUsers, likes, dislikes, last24h, top] =
      await Promise.all([
        this.prisma.title.count(),
        this.prisma.title.count({ where: { hidden: true } }),
        this.prisma.title.count({ where: { availabilities: { some: { type: 'CINEMA' } } } }),
        this.prisma.title.count({
          where: { availabilities: { some: { type: 'FLATRATE', provider: { enabled: true } } } },
        }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: week } } }),
        this.prisma.swipe.count({ where: { decision: 'LIKE' } }),
        this.prisma.swipe.count({ where: { decision: 'DISLIKE' } }),
        this.prisma.swipe.count({ where: { decidedAt: { gte: day } } }),
        this.prisma.swipe.groupBy({
          by: ['titleId'],
          where: { decision: 'LIKE' },
          _count: { _all: true },
          orderBy: { _count: { titleId: 'desc' } },
          take: 10,
        }),
      ]);

    const titles = await this.prisma.title.findMany({
      where: { id: { in: top.map((t) => t.titleId) } },
      select: { id: true, title: true },
    });
    const nameById = new Map(titles.map((t) => [t.id, t.title]));

    return {
      titles: { total, hidden, inTheaters, onStreaming },
      users: { total: users, newLast7Days: newUsers },
      swipes: { total: likes + dislikes, likes, dislikes, last24h },
      topLiked: top.map((t) => ({
        titleId: t.titleId,
        title: nameById.get(t.titleId) ?? `#${t.titleId}`,
        likes: t._count._all,
      })),
    };
  }

  async searchTitles(q: TitleSearch): Promise<{ items: Title[]; total: number }> {
    const where: Prisma.TitleWhereInput = {
      ...(q.hidden !== undefined ? { hidden: q.hidden } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' } },
              { originalTitle: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.title.findMany({
        where,
        orderBy: [{ popularity: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: titleInclude,
      }),
      this.prisma.title.count({ where }),
    ]);
    return { items: rows.map(toTitle), total };
  }

  async updateModeration(
    titleId: number,
    patch: { hidden?: boolean; featured?: boolean },
  ): Promise<Title | null> {
    const exists = await this.prisma.title.count({ where: { id: titleId } });
    if (!exists) return null;
    const row = await this.prisma.title.update({
      where: { id: titleId },
      data: patch,
      include: titleInclude,
    });
    return toTitle(row);
  }

  async listProviders(): Promise<(Provider & { enabled: boolean })[]> {
    return this.prisma.provider.findMany({
      orderBy: [{ enabled: 'desc' }, { displayPriority: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, logoPath: true, enabled: true },
    });
  }

  async setProviderEnabled(id: number, enabled: boolean): Promise<boolean> {
    const { count } = await this.prisma.provider.updateMany({ where: { id }, data: { enabled } });
    return count > 0;
  }

  async listUsers(page: number, pageSize: number): Promise<{ items: AdminUserRow[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { swipes: true } } },
      }),
      this.prisma.user.count(),
    ]);
    return {
      total,
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        pictureUrl: u.pictureUrl,
        role: u.role,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        swipeCount: u._count.swipes,
      })),
    };
  }
}
