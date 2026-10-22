import { Injectable } from '@nestjs/common';
import type { Prisma, SyncRun } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import {
  SyncRunRepository,
  type SyncRunRecord,
  type SyncScope,
  type SyncTriggerKind,
} from '../domain/ports';

const toRecord = (r: SyncRun): SyncRunRecord => ({
  id: r.id,
  scope: r.scope,
  trigger: r.trigger,
  status: r.status,
  startedAt: r.startedAt,
  finishedAt: r.finishedAt,
  stats: (r.stats as Record<string, number> | null) ?? null,
  error: r.error,
});

@Injectable()
export class PrismaSyncRunRepository extends SyncRunRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async start(scope: SyncScope, trigger: SyncTriggerKind): Promise<SyncRunRecord> {
    return toRecord(await this.prisma.syncRun.create({ data: { scope, trigger } }));
  }

  async succeed(id: number, stats: Record<string, number>): Promise<void> {
    await this.prisma.syncRun.update({
      where: { id },
      data: { status: 'SUCCEEDED', finishedAt: new Date(), stats: stats as Prisma.InputJsonValue },
    });
  }

  async fail(id: number, error: string, stats: Record<string, number> = {}): Promise<void> {
    await this.prisma.syncRun.update({
      where: { id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        error: error.slice(0, 2000),
        stats: stats as Prisma.InputJsonValue,
      },
    });
  }

  async findRunningSince(since: Date): Promise<SyncRunRecord | null> {
    const row = await this.prisma.syncRun.findFirst({
      where: { status: 'RUNNING', startedAt: { gte: since } },
    });
    return row ? toRecord(row) : null;
  }

  async listRecent(limit: number): Promise<SyncRunRecord[]> {
    const rows = await this.prisma.syncRun.findMany({ orderBy: { startedAt: 'desc' }, take: limit });
    return rows.map(toRecord);
  }

  async failStale(before: Date): Promise<void> {
    await this.prisma.syncRun.updateMany({
      where: { status: 'RUNNING', startedAt: { lt: before } },
      data: { status: 'FAILED', finishedAt: new Date(), error: 'Execução interrompida (timeout)' },
    });
  }
}
