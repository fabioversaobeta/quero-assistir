import type { DeckCriteria } from './deck';
import type { Genre, Provider, Title } from './title';

/** Porta de persistência do catálogo (somente leitura para o app). */
export abstract class TitleRepository {
  abstract findDeck(criteria: DeckCriteria): Promise<Title[]>;
  abstract findById(id: number): Promise<Title | null>;
  abstract listGenres(): Promise<Genre[]>;
  abstract listEnabledProviders(): Promise<Provider[]>;
}
