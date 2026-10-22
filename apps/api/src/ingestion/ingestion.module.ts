import { Module } from '@nestjs/common';
import { SyncCatalogUseCase } from './application/sync-catalog.use-case';
import { CatalogWriter, MetadataGateway, SyncRunRepository } from './domain/ports';
import { PrismaCatalogWriter } from './infrastructure/prisma-catalog.writer';
import { PrismaSyncRunRepository } from './infrastructure/prisma-sync-run.repository';
import { TmdbHttpClient } from './infrastructure/tmdb-http.client';
import { TmdbMetadataGateway } from './infrastructure/tmdb-metadata.gateway';
import { SyncScheduler } from './presentation/sync.scheduler';

@Module({
  providers: [
    SyncCatalogUseCase,
    SyncScheduler,
    TmdbHttpClient,
    { provide: MetadataGateway, useClass: TmdbMetadataGateway },
    { provide: CatalogWriter, useClass: PrismaCatalogWriter },
    { provide: SyncRunRepository, useClass: PrismaSyncRunRepository },
  ],
  exports: [SyncCatalogUseCase, SyncRunRepository],
})
export class IngestionModule {}
