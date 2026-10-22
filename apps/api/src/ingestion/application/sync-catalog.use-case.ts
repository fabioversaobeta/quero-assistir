import { Injectable, Logger } from '@nestjs/common';
import { Config } from '../../config/app-config';
import { ConflictError } from '../../shared/domain-error';
import { mapWithConcurrency } from '../../shared/concurrency';
import {
  CatalogWriter,
  MetadataGateway,
  SyncRunRepository,
  type SyncScope,
  type SyncTriggerKind,
  type TitleRef,
} from '../domain/ports';

/** IDs TMDB/JustWatch das plataformas habilitadas por padrão no Brasil. O admin pode alterar. */
export const DEFAULT_ENABLED_PROVIDER_IDS = [
  8, // Netflix
  119, // Amazon Prime Video
  337, // Disney Plus
  1899, // Max
  350, // Apple TV+
  307, // Globoplay
  531, // Paramount Plus
  283, // Crunchyroll
];

const NOW_PLAYING_PAGES = 5;
const DETAIL_CONCURRENCY = 5;
const MAX_RUN_MINUTES = 120;
const ORPHAN_AGE_DAYS = 30;

type Stats = Record<string, number>;

@Injectable()
export class SyncCatalogUseCase {
  private readonly logger = new Logger(SyncCatalogUseCase.name);

  constructor(
    private readonly gateway: MetadataGateway,
    private readonly writer: CatalogWriter,
    private readonly runs: SyncRunRepository,
    private readonly config: Config,
  ) {}

  /**
   * Cria o registro da execução e a retorna imediatamente; o trabalho em si segue em `run`.
   * Garante uma única execução simultânea (inclusive entre instâncias) via tabela SyncRun.
   */
  async begin(scope: SyncScope, trigger: SyncTriggerKind) {
    const horizon = new Date(Date.now() - MAX_RUN_MINUTES * 60_000);
    await this.runs.failStale(horizon);
    if (await this.runs.findRunningSince(horizon)) {
      throw new ConflictError('Já existe uma sincronização em andamento');
    }
    return this.runs.start(scope, trigger);
  }

  async run(runId: number, scope: SyncScope): Promise<void> {
    const stats: Stats = {};
    const startedAt = new Date();
    try {
      if (scope === 'all' || scope === 'providers') await this.syncReferenceData(stats);
      let cinemaIds = new Set<number>();
      if (scope === 'all' || scope === 'cinema') cinemaIds = await this.syncCinema(stats, startedAt);
      if (scope === 'all' || scope === 'streaming') await this.syncStreaming(stats, cinemaIds, startedAt);
      if (scope === 'all') {
        stats.orphansRemoved = await this.writer.pruneOrphanTitles(
          new Date(Date.now() - ORPHAN_AGE_DAYS * 86_400_000),
        );
      }
      await this.runs.succeed(runId, stats);
      this.logger.log(`Sync ${runId} (${scope}) concluída: ${JSON.stringify(stats)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sync ${runId} (${scope}) falhou: ${message}`);
      await this.runs.fail(runId, message, stats);
    }
  }

  private async syncReferenceData(stats: Stats) {
    const [genres, providers] = await Promise.all([
      this.gateway.listGenres(),
      this.gateway.listProviders(),
    ]);
    await this.writer.upsertGenres(genres);
    stats.genres = genres.length;
    stats.providers = await this.writer.upsertProviders(providers, DEFAULT_ENABLED_PROVIDER_IDS);
  }

  private async syncCinema(stats: Stats, runStartedAt: Date): Promise<Set<number>> {
    const refs = await this.gateway.listNowPlaying(NOW_PLAYING_PAGES);
    const ids = new Set(refs.map((r) => r.tmdbId));
    stats.cinemaListed = refs.length;
    stats.cinemaFailed = await this.ingest(refs, ids, runStartedAt, stats);
    stats.cinemaStaleRemoved = await this.writer.pruneStaleCinema(
      this.config.tmdb.region,
      runStartedAt,
    );
    return ids;
  }

  private async syncStreaming(stats: Stats, cinemaIds: Set<number>, runStartedAt: Date) {
    const providerIds = await this.writer.listEnabledProviderIds();
    const pages = this.config.sync.streamingPages;
    const seen = new Map<string, TitleRef>();

    for (const providerId of providerIds) {
      for (const query of [
        { kind: 'MOVIE' as const, animeOnly: false },
        { kind: 'SERIES' as const, animeOnly: false },
        { kind: 'SERIES' as const, animeOnly: true },
      ]) {
        try {
          const refs = await this.gateway.listStreaming({ providerId, pages, ...query });
          for (const ref of refs) seen.set(`${ref.kind}:${ref.tmdbId}`, ref);
        } catch (error) {
          stats.streamingListFailed = (stats.streamingListFailed ?? 0) + 1;
          this.logger.warn(`Falha listando provider ${providerId}: ${String(error)}`);
        }
      }
    }
    const refs = [...seen.values()];
    stats.streamingListed = refs.length;
    stats.streamingFailed = await this.ingest(refs, cinemaIds, runStartedAt, stats);
  }

  /** Busca detalhes e grava. Devolve quantos falharam (falha parcial não aborta a execução). */
  private async ingest(
    refs: TitleRef[],
    cinemaIds: Set<number>,
    now: Date,
    stats: Stats,
  ): Promise<number> {
    const region = this.config.tmdb.region;
    const { results, failures } = await mapWithConcurrency(refs, DETAIL_CONCURRENCY, async (ref) => {
      const remote = await this.gateway.getTitle(ref);
      await this.writer.upsertTitle({
        remote,
        region,
        inTheaters: ref.kind === 'MOVIE' && cinemaIds.has(ref.tmdbId),
        now,
      });
    });
    stats.titlesUpserted = (stats.titlesUpserted ?? 0) + results.length;
    for (const f of failures.slice(0, 3)) {
      this.logger.warn(`Falha no título ${f.item.kind}:${f.item.tmdbId}: ${String(f.error)}`);
    }
    return failures.length;
  }
}
