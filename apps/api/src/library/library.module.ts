import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import {
  ImportSwipesUseCase,
  ListWatchlistUseCase,
  RecordSwipeUseCase,
  SetWatchedUseCase,
  UndoSwipeUseCase,
} from './application/library-use-cases';
import { LibraryRepository } from './domain/library';
import { PrismaLibraryRepository } from './infrastructure/prisma-library.repository';
import { LibraryController } from './presentation/library.controller';

@Module({
  imports: [CatalogModule],
  controllers: [LibraryController],
  providers: [
    RecordSwipeUseCase,
    UndoSwipeUseCase,
    SetWatchedUseCase,
    ListWatchlistUseCase,
    ImportSwipesUseCase,
    { provide: LibraryRepository, useClass: PrismaLibraryRepository },
  ],
})
export class LibraryModule {}
