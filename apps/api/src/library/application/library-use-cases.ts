import { Injectable } from '@nestjs/common';
import type { SwipeDecision } from '@quero-assistir/contracts';
import { NotFoundError, ValidationError } from '../../shared/domain-error';
import { LibraryRepository, type SwipeImport, type WatchlistEntry } from '../domain/library';

const MAX_IMPORT = 2000;

@Injectable()
export class RecordSwipeUseCase {
  constructor(private readonly library: LibraryRepository) {}

  async execute(userId: string, titleId: number, decision: SwipeDecision): Promise<void> {
    if (!(await this.library.titleExists(titleId))) throw new NotFoundError('Título');
    await this.library.saveSwipe(userId, titleId, decision);
  }
}

@Injectable()
export class UndoSwipeUseCase {
  constructor(private readonly library: LibraryRepository) {}

  execute(userId: string, titleId: number): Promise<void> {
    return this.library.removeSwipe(userId, titleId);
  }
}

@Injectable()
export class SetWatchedUseCase {
  constructor(private readonly library: LibraryRepository) {}

  async execute(userId: string, titleId: number, watched: boolean): Promise<void> {
    const updated = await this.library.setWatched(userId, titleId, watched);
    if (!updated) throw new NotFoundError('Título na sua lista');
  }
}

@Injectable()
export class ListWatchlistUseCase {
  constructor(private readonly library: LibraryRepository) {}

  execute(userId: string): Promise<WatchlistEntry[]> {
    return this.library.listLiked(userId);
  }
}

/** Migra para a conta as decisões feitas no modo anônimo (guardadas só no aparelho). */
@Injectable()
export class ImportSwipesUseCase {
  constructor(private readonly library: LibraryRepository) {}

  async execute(userId: string, swipes: SwipeImport[]): Promise<number> {
    if (swipes.length > MAX_IMPORT) {
      throw new ValidationError(`Máximo de ${MAX_IMPORT} decisões por importação`);
    }
    return this.library.importSwipes(userId, swipes);
  }
}
