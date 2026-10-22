import { mapMovie, mapTv, pickMovieCertification, type TmdbMovieDetails } from './tmdb.mapper';

const movie: TmdbMovieDetails = {
  id: 1,
  title: 'Filme',
  original_title: 'Movie',
  release_date: '2026-03-05',
  runtime: 0,
  genres: [{ id: 28, name: 'Ação' }],
  release_dates: {
    results: [
      { iso_3166_1: 'US', release_dates: [{ certification: 'PG-13', type: 3 }] },
      {
        iso_3166_1: 'BR',
        release_dates: [
          { certification: '', type: 1 },
          { certification: '14', type: 4 },
          { certification: '12', type: 3 },
        ],
      },
    ],
  },
  'watch/providers': {
    results: {
      BR: { flatrate: [{ provider_id: 8 }], rent: [{ provider_id: 2 }, { provider_id: 3 }] },
      US: { flatrate: [{ provider_id: 99 }] },
    },
  },
};

describe('tmdb mapper', () => {
  it('prefere a certificação de cinema do país configurado', () => {
    expect(pickMovieCertification(movie, 'BR')).toBe('12');
    expect(pickMovieCertification(movie, 'FR')).toBeNull();
  });

  it('mapeia filme com disponibilidade somente da região', () => {
    const mapped = mapMovie(movie, 'BR');
    expect(mapped.kind).toBe('MOVIE');
    expect(mapped.rawCertification).toBe('12');
    expect(mapped.runtimeMinutes).toBeNull();
    expect(mapped.releaseDate?.toISOString()).toBe('2026-03-05T00:00:00.000Z');
    expect(mapped.availability).toEqual([
      { type: 'FLATRATE', providerId: 8 },
      { type: 'RENT', providerId: 2 },
      { type: 'RENT', providerId: 3 },
    ]);
  });

  it('mapeia série usando content_ratings e primeira duração de episódio', () => {
    const mapped = mapTv(
      {
        id: 7,
        name: 'Série',
        original_name: 'Show',
        episode_run_time: [45, 50],
        origin_country: ['JP'],
        original_language: 'ja',
        content_ratings: { results: [{ iso_3166_1: 'BR', rating: '16' }] },
      },
      'BR',
    );
    expect(mapped).toMatchObject({
      kind: 'SERIES',
      runtimeMinutes: 45,
      rawCertification: '16',
      originCountries: ['JP'],
    });
  });
});
