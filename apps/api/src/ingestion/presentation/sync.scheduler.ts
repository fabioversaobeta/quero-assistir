import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Config } from '../../config/app-config';
import { ConflictError } from '../../shared/domain-error';
import { SyncCatalogUseCase } from '../application/sync-catalog.use-case';

/** Rotina diária de sincronização (configurável por SYNC_CRON / SYNC_TIMEZONE). */
@Injectable()
export class SyncScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly sync: SyncCatalogUseCase,
    private readonly config: Config,
  ) {}

  onApplicationBootstrap() {
    if (!this.config.sync.schedulerEnabled) {
      this.logger.log('Agendador desabilitado (SYNC_SCHEDULER_ENABLED=false)');
      return;
    }
    const job = CronJob.from({
      cronTime: this.config.sync.cron,
      timeZone: this.config.sync.timezone,
      onTick: () => void this.tick(),
      start: true,
    });
    this.registry.addCronJob('catalog-sync', job);
    this.logger.log(`Sync agendada: "${this.config.sync.cron}" (${this.config.sync.timezone})`);
  }

  private async tick() {
    try {
      const run = await this.sync.begin('all', 'SCHEDULE');
      await this.sync.run(run.id, 'all');
    } catch (error) {
      if (error instanceof ConflictError) {
        this.logger.warn('Sync agendada ignorada: já existe uma em andamento');
        return;
      }
      this.logger.error(`Sync agendada falhou ao iniciar: ${String(error)}`);
    }
  }
}
