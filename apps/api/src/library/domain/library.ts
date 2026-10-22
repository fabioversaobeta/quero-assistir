import type { SwipeDecision } from '@quero-assistir/contracts';
import type { Title } from '../../catalog/domain/title';

export interface SwipeRecord {
  titleId: number;
  decision: SwipeDecision;
  watched: boolean;
  decidedAt: Date;
}

export interface WatchlistEntry {
  title: Title;
  watched: boolean;
  decidedAt: Date;
}

export interface SwipeImport {
  titleId: number;
  decision: SwipeDecision;
  watched: boolean;
  decidedAt: Date;
}

/** Porta de persistência da biblioteca pessoal do usuário. */
export abstract class LibraryRepository {
  abstract titleExists(titleId: number): Promise<boolean>;
  abstract saveSwipe(userId: string, titleId: number, decision: SwipeDecision): Promise<void>;
  abstract removeSwipe(userId: string, titleId: number): Promise<void>;
  /** Devolve false se o usuário não tiver decisão LIKE para o título. */
  abstract setWatched(userId: string, titleId: number, watched: boolean): Promise<boolean>;
  abstract listLiked(userId: string): Promise<WatchlistEntry[]>;
  /**
   * Importa em lote sem sobrescrever decisões que o usuário já tem no servidor
   * (a decisão mais recente vence). Ignora títulos inexistentes. Devolve quantidade gravada.
   */
  abstract importSwipes(userId: string, swipes: SwipeImport[]): Promise<number>;
}
