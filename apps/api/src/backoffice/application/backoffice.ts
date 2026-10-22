import { Injectable } from '@nestjs/common';
import type { UserRole } from '@quero-assistir/contracts';
import type { Provider, Title } from '../../catalog/domain/title';
import { NotFoundError } from '../../shared/domain-error';
import { SyncCatalogUseCase } from '../../ingestion/application/sync-catalog.use-case';
import {
  SyncRunRepository,
  type SyncRunRecord,
  type SyncScope,
} from '../../ingestion/domain/ports';

export interface AdminStats {
  titles: { total: number; hidden: number; inTheaters: number; onStreaming: number };
  users: { total: number; newLast7Days: number };
  swipes: { total: number; likes: number; dislikes: number; last24h: number };
  topLiked: { titleId: number; title: string; likes: number }[];
}

export interface TitleSearch {
  search?: string;
  hidden?: boolean;
  page: number;
  pageSize: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date;
  swipeCount: number;
}

/** Porta de leitura/escrita usada pelo painel admin (modelo de leitura dedicado, sem regras de domínio). */
export abstract class BackofficeRepository {
  abstract stats(): Promise<AdminStats>;
  abstract searchTitles(q: TitleSearch): Promise<{ items: Title[]; total: number }>;
  abstract updateModeration(
    titleId: number,
    patch: { hidden?: boolean; featured?: boolean },
  ): Promise<Title | null>;
  abstract listProviders(): Promise<(Provider & { enabled: boolean })[]>;
  abstract setProviderEnabled(id: number, enabled: boolean): Promise<boolean>;
  abstract listUsers(page: number, pageSize: number): Promise<{ items: AdminUserRow[]; total: number }>;
}

@Injectable()
export class BackofficeQueries {
  constructor(
    private readonly repo: BackofficeRepository,
    private readonly runs: SyncRunRepository,
  ) {}

  async dashboard(): Promise<{ stats: AdminStats; lastSync: SyncRunRecord | null }> {
    const [stats, [lastSync]] = await Promise.all([this.repo.stats(), this.runs.listRecent(1)]);
    return { stats, lastSync: lastSync ?? null };
  }

  searchTitles(q: TitleSearch) {
    return this.repo.searchTitles(q);
  }

  listProviders() {
    return this.repo.listProviders();
  }

  listUsers(page: number, pageSize: number) {
    return this.repo.listUsers(page, pageSize);
  }

  listSyncRuns(limit: number) {
    return this.runs.listRecent(limit);
  }
}

@Injectable()
export class BackofficeCommands {
  constructor(
    private readonly repo: BackofficeRepository,
    private readonly sync: SyncCatalogUseCase,
  ) {}

  async moderateTitle(id: number, patch: { hidden?: boolean; featured?: boolean }): Promise<Title> {
    const title = await this.repo.updateModeration(id, patch);
    if (!title) throw new NotFoundError('Título');
    return title;
  }

  async setProviderEnabled(id: number, enabled: boolean): Promise<void> {
    if (!(await this.repo.setProviderEnabled(id, enabled))) throw new NotFoundError('Plataforma');
  }

  /** Inicia uma sincronização manual em segundo plano; a resposta não espera o término. */
  async triggerSync(scope: SyncScope): Promise<SyncRunRecord> {
    const run = await this.sync.begin(scope, 'MANUAL');
    void this.sync.run(run.id, scope);
    return run;
  }
}
