import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SyncCatalogUseCase } from '../ingestion/application/sync-catalog.use-case';
import type { SyncScope } from '../ingestion/domain/ports';

/**
 * Executa uma sincronização e termina. Uso: `pnpm sync [all|cinema|streaming|providers]`.
 * Pensado para Cron Service do Railway (com SYNC_SCHEDULER_ENABLED=false na API) ou uso manual.
 */
async function main() {
  const scope = (process.argv[2] ?? 'all') as SyncScope;
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  try {
    const sync = app.get(SyncCatalogUseCase);
    const run = await sync.begin(scope, 'MANUAL');
    await sync.run(run.id, scope);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
