import { Injectable } from '@nestjs/common';
import type { DeckCategory, DeckScope } from '@quero-assistir/contracts';
import { Config } from '../../config/app-config';
import { decodeCursor, encodeCursor } from '../domain/deck';
import type { Title } from '../domain/title';
import { TitleRepository } from '../domain/title.repository';

export interface ListDeckInput {
  scope: DeckScope;
  category?: DeckCategory;
  providerId?: number;
  cursor?: string;
  limit?: number;
  /** Presente para usuários logados: o servidor remove o que já foi decidido. */
  userId?: string;
}

export interface ListDeckOutput {
  items: Title[];
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class ListDeckUseCase {
  constructor(
    private readonly titles: TitleRepository,
    private readonly config: Config,
  ) {}

  async execute(input: ListDeckInput): Promise<ListDeckOutput> {
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    // Busca um item a mais para saber se existe próxima página.
    const rows = await this.titles.findDeck({
      region: this.config.tmdb.region,
      scope: input.scope,
      category: input.category ?? 'all',
      providerId: input.scope === 'streaming' ? input.providerId : undefined,
      excludeSwipedByUserId: input.userId,
      after: decodeCursor(input.cursor),
      limit: limit + 1,
    });
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    const hasMore = rows.length > limit && last !== undefined;
    return {
      items,
      nextCursor: hasMore
        ? encodeCursor({ featured: last.featured, popularity: last.popularity, id: last.id })
        : null,
    };
  }
}
