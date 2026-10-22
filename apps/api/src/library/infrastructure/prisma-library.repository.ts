import { Injectable } from '@nestjs/common';
import type { SwipeDecision } from '@quero-assistir/contracts';
import { titleInclude, toTitle } from '../../catalog/infrastructure/title.mapper';
import { PrismaService } from '../../shared/prisma.service';
import { LibraryRepository, type SwipeImport, type WatchlistEntry } from '../domain/library';

@Injectable()
export class PrismaLibraryRepository extends LibraryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async titleExists(titleId: number): Promise<boolean> {
    return (await this.prisma.title.count({ where: { id: titleId, hidden: false } })) > 0;
  }

  async saveSwipe(userId: string, titleId: number, decision: SwipeDecision): Promise<void> {
    const now = new Date();
    await this.prisma.swipe.upsert({
      where: { userId_titleId: { userId, titleId } },
      create: { userId, titleId, decision, decidedAt: now },
      update: { decision, decidedAt: now, ...(decision === 'DISLIKE' ? { watched: false } : {}) },
    });
  }

  async removeSwipe(userId: string, titleId: number): Promise<void> {
    await this.prisma.swipe.deleteMany({ where: { userId, titleId } });
  }

  async setWatched(userId: string, titleId: number, watched: boolean): Promise<boolean> {
    const { count } = await this.prisma.swipe.updateMany({
      where: { userId, titleId, decision: 'LIKE' },
      data: { watched },
    });
    return count > 0;
  }

  async listLiked(userId: string): Promise<WatchlistEntry[]> {
    const rows = await this.prisma.swipe.findMany({
      where: { userId, decision: 'LIKE', title: { hidden: false } },
      orderBy: { decidedAt: 'desc' },
      include: { title: { include: titleInclude } },
    });
    return rows.map((r) => ({ title: toTitle(r.title), watched: r.watched, decidedAt: r.decidedAt }));
  }

  async importSwipes(userId: string, swipes: SwipeImport[]): Promise<number> {
    if (swipes.length === 0) return 0;
    const ids = [...new Set(swipes.map((s) => s.titleId))];
    const [existingTitles, existingSwipes] = await Promise.all([
      this.prisma.title.findMany({ where: { id: { in: ids } }, select: { id: true } }),
      this.prisma.swipe.findMany({ where: { userId, titleId: { in: ids } } }),
    ]);
    const validIds = new Set(existingTitles.map((t) => t.id));
    const current = new Map(existingSwipes.map((s) => [s.titleId, s]));

    const toWrite = swipes.filter((s) => {
      if (!validIds.has(s.titleId)) return false;
      const serverSide = current.get(s.titleId);
      return !serverSide || serverSide.decidedAt < s.decidedAt;
    });

    await this.prisma.$transaction(
      toWrite.map((s) =>
        this.prisma.swipe.upsert({
          where: { userId_titleId: { userId, titleId: s.titleId } },
          create: {
            userId,
            titleId: s.titleId,
            decision: s.decision,
            watched: s.decision === 'LIKE' && s.watched,
            decidedAt: s.decidedAt,
          },
          update: {
            decision: s.decision,
            watched: s.decision === 'LIKE' && s.watched,
            decidedAt: s.decidedAt,
          },
        }),
      ),
    );
    return toWrite.length;
  }
}
