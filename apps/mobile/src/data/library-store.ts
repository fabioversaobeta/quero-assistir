import type { SwipeDecision, TitleDto, WatchlistItemDto } from '@quero-assistir/contracts';

/**
 * Porta da "biblioteca" do usuário (decisões de swipe e lista de quero-assistir).
 * Duas implementações: local (anônimo, só no aparelho) e remota (conta Google).
 */
export interface LibraryStore {
  decide(title: TitleDto, decision: SwipeDecision): Promise<void>;
  undo(titleId: number): Promise<void>;
  watchlist(): Promise<WatchlistItemDto[]>;
  setWatched(titleId: number, watched: boolean): Promise<void>;
  /**
   * Ids já decididos que o app precisa filtrar do deck. O store remoto devolve vazio porque o
   * servidor já exclui no endpoint /v1/me/deck.
   */
  decidedIds(): Promise<ReadonlySet<number>>;
}
