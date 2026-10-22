import type { Config } from '../../config/app-config';
import type { DeckCriteria } from '../domain/deck';
import type { Title } from '../domain/title';
import { TitleRepository } from '../domain/title.repository';
import { ListDeckUseCase } from './list-deck.use-case';

const title = (id: number, popularity: number): Title => ({
  id,
  tmdbId: id,
  kind: 'MOVIE',
  isAnime: false,
  title: `T${id}`,
  originalTitle: `T${id}`,
  overview: '',
  posterPath: null,
  backdropPath: null,
  releaseDate: null,
  runtimeMinutes: null,
  certification: null,
  minAge: null,
  voteAverage: 0,
  popularity,
  hidden: false,
  featured: false,
  syncedAt: new Date(),
  genres: [],
  availability: [],
});

class FakeTitleRepository extends TitleRepository {
  lastCriteria?: DeckCriteria;
  constructor(private readonly rows: Title[]) {
    super();
  }
  async findDeck(criteria: DeckCriteria) {
    this.lastCriteria = criteria;
    return this.rows.slice(0, criteria.limit);
  }
  findById = jest.fn();
  listGenres = jest.fn();
  listEnabledProviders = jest.fn();
}

const config = { tmdb: { region: 'BR' } } as Config;

describe('ListDeckUseCase', () => {
  it('pede um item extra e gera nextCursor quando há mais páginas', async () => {
    const repo = new FakeTitleRepository([title(3, 30), title(2, 20), title(1, 10)]);
    const page = await new ListDeckUseCase(repo, config).execute({ scope: 'cinema', limit: 2 });

    expect(repo.lastCriteria?.limit).toBe(3);
    expect(page.items.map((t) => t.id)).toEqual([3, 2]);
    expect(page.nextCursor).not.toBeNull();
  });

  it('não gera cursor na última página', async () => {
    const repo = new FakeTitleRepository([title(1, 10)]);
    const page = await new ListDeckUseCase(repo, config).execute({ scope: 'cinema', limit: 5 });
    expect(page.nextCursor).toBeNull();
  });

  it('limita o tamanho da página e ignora providerId fora do streaming', async () => {
    const repo = new FakeTitleRepository([]);
    await new ListDeckUseCase(repo, config).execute({ scope: 'cinema', limit: 999, providerId: 8 });
    expect(repo.lastCriteria).toMatchObject({ limit: 51, providerId: undefined, region: 'BR' });
  });

  it('repassa o usuário para excluir o que ele já decidiu', async () => {
    const repo = new FakeTitleRepository([]);
    await new ListDeckUseCase(repo, config).execute({ scope: 'streaming', userId: 'u1' });
    expect(repo.lastCriteria?.excludeSwipedByUserId).toBe('u1');
  });
});
