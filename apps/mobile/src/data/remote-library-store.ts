import type { SwipeDecision, TitleDto, WatchlistItemDto } from '@quero-assistir/contracts';
import type { ApiClient } from './api-client';
import type { LibraryStore } from './library-store';

/** Usuário logado: o servidor é a fonte da verdade e já filtra o deck. */
export class RemoteLibraryStore implements LibraryStore {
  constructor(private readonly api: ApiClient) {}

  decide(title: TitleDto, decision: SwipeDecision) {
    return this.api.swipe(title.id, decision);
  }

  undo(titleId: number) {
    return this.api.undoSwipe(titleId);
  }

  watchlist(): Promise<WatchlistItemDto[]> {
    return this.api.watchlist();
  }

  setWatched(titleId: number, watched: boolean) {
    return this.api.setWatched(titleId, watched);
  }

  async decidedIds(): Promise<ReadonlySet<number>> {
    return new Set();
  }
}
