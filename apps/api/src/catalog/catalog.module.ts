import { Module } from '@nestjs/common';
import {
  GetTitleUseCase,
  ListGenresUseCase,
  ListProvidersUseCase,
} from './application/catalog-queries';
import { ListDeckUseCase } from './application/list-deck.use-case';
import { TitleRepository } from './domain/title.repository';
import { PrismaTitleRepository } from './infrastructure/prisma-title.repository';
import { CatalogController } from './presentation/catalog.controller';
import { TitlePresenter } from './presentation/title.presenter';

@Module({
  controllers: [CatalogController],
  providers: [
    ListDeckUseCase,
    GetTitleUseCase,
    ListGenresUseCase,
    ListProvidersUseCase,
    TitlePresenter,
    { provide: TitleRepository, useClass: PrismaTitleRepository },
  ],
  exports: [TitlePresenter, ListDeckUseCase],
})
export class CatalogModule {}
