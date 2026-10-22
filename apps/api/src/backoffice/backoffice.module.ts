import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import {
  BackofficeCommands,
  BackofficeQueries,
  BackofficeRepository,
} from './application/backoffice';
import { PrismaBackofficeRepository } from './infrastructure/prisma-backoffice.repository';
import { BackofficeController } from './presentation/backoffice.controller';

@Module({
  imports: [CatalogModule, IngestionModule],
  controllers: [BackofficeController],
  providers: [
    BackofficeQueries,
    BackofficeCommands,
    { provide: BackofficeRepository, useClass: PrismaBackofficeRepository },
  ],
})
export class BackofficeModule {}
