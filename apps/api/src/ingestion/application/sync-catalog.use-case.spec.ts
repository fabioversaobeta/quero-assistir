import type { Config } from '../../config/app-config';
import { ConflictError } from '../../shared/domain-error';
import {
  CatalogWriter,
  MetadataGateway,
  SyncRunRepository,
  type RemoteTitle,
  type SyncRunRecord,
  type TitleRef,
  type UpsertTitleInput,
} from '../domain/ports';
import { SyncCatalogUseCase } from './sync-catalog.use-case';

const remote = (ref: TitleRef): RemoteTitle => ({
  ...ref,
  title: `t${ref.tmdbId}`,
  originalTitle: `t${ref.tmdbId}`,
  overview: '',
  posterPath: null,
  backdropPath: null,
  releaseDate: null,
  runtimeMinutes: null,
  originalLanguage: 'en',
  originCountries: [],
  voteAverage: 0,
  voteCount: 0,
  popularity: 1,
  genres: [],
  rawCertification: null,
  availability: [],
});

class FakeGateway extends MetadataGateway {
  failIds = new Set<number>();
  listGenres = jest.fn().mockResolvedValue([{ id: 28, name: 'Ação' }]);
  listProviders = jest.fn().mockResolvedValue([{ id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 }]);
  listNowPlaying = jest.fn().mockResolvedValue([
    { tmdbId: 1, kind: 'MOVIE' },
    { tmdbId: 2, kind: 'MOVIE' },
  ]);
  listStreaming = jest.fn().mockResolvedValue([{ tmdbId: 2, kind: 'MOVIE' }, { tmdbId: 50, kind: 'SERIES' }]);
  async getTitle(ref: TitleRef) {
    if (this.failIds.has(ref.tmdbId)) throw new Error('boom');
    return remote(ref);
  }
}

class FakeWriter extends CatalogWriter {
  upserts: UpsertTitleInput[] = [];
  upsertGenres = jest.fn();
  upsertProviders = jest.fn().mockResolvedValue(1);
  listEnabledProviderIds = jest.fn().mockResolvedValue([8]);
  pruneStaleCinema = jest.fn().mockResolvedValue(3);
  pruneOrphanTitles = jest.fn().mockResolvedValue(0);
  async upsertTitle(input: UpsertTitleInput) {
    this.upserts.push(input);
  }
}

class FakeRuns extends SyncRunRepository {
  running: SyncRunRecord | null = null;
  succeeded?: Record<string, number>;
  failed?: string;
  start = jest.fn().mockResolvedValue({ id: 1 });
  async succeed(_id: number, stats: Record<string, number>) {
    this.succeeded = stats;
  }
  async fail(_id: number, error: string) {
    this.failed = error;
  }
  async findRunningSince() {
    return this.running;
  }
  listRecent = jest.fn();
  failStale = jest.fn();
}

const config = { tmdb: { region: 'BR' }, sync: { streamingPages: 1 } } as Config;

function setup() {
  const gateway = new FakeGateway();
  const writer = new FakeWriter();
  const runs = new FakeRuns();
  return { gateway, writer, runs, useCase: new SyncCatalogUseCase(gateway, writer, runs, config) };
}

describe('SyncCatalogUseCase', () => {
  it('sincroniza tudo: marca em cartaz só filmes listados em now_playing', async () => {
    const { useCase, writer, runs } = setup();
    await useCase.run(1, 'all');

    const byKey = new Map(writer.upserts.map((u) => [`${u.remote.kind}:${u.remote.tmdbId}`, u]));
    expect(byKey.get('MOVIE:1')?.inTheaters).toBe(true);
    expect(byKey.get('MOVIE:2')?.inTheaters).toBe(true); // também aparece no streaming, mas segue em cartaz
    expect(byKey.get('SERIES:50')?.inTheaters).toBe(false);
    expect(writer.pruneStaleCinema).toHaveBeenCalledWith('BR', expect.any(Date));
    expect(runs.succeeded).toMatchObject({ cinemaListed: 2, cinemaStaleRemoved: 3 });
  });

  it('falha parcial em um título não aborta a execução', async () => {
    const { useCase, gateway, runs } = setup();
    gateway.failIds.add(1);
    await useCase.run(1, 'cinema');
    expect(runs.failed).toBeUndefined();
    expect(runs.succeeded).toMatchObject({ cinemaFailed: 1, titlesUpserted: 1 });
  });

  it('registra FAILED quando a fonte inteira cai', async () => {
    const { useCase, gateway, runs } = setup();
    gateway.listNowPlaying.mockRejectedValue(new Error('TMDB 401'));
    await useCase.run(1, 'cinema');
    expect(runs.failed).toBe('TMDB 401');
  });

  it('recusa iniciar se já há execução em andamento', async () => {
    const { useCase, runs } = setup();
    runs.running = { id: 9 } as SyncRunRecord;
    await expect(useCase.begin('all', 'MANUAL')).rejects.toBeInstanceOf(ConflictError);
  });
});
