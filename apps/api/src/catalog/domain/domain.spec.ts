import { parseBrazilianRating } from './age-rating';
import { decodeCursor, encodeCursor } from './deck';
import { isAnime } from '../../ingestion/domain/anime';
import { resolveRole } from '../../identity/domain/identity';

describe('parseBrazilianRating', () => {
  it.each([
    ['L', 'L', 0],
    ['Livre', 'L', 0],
    ['10', '10', 10],
    [' 12 ', '12', 12],
    ['16 anos', '16', 16],
    ['18', '18', 18],
  ])('interpreta %p', (raw, certification, minAge) => {
    expect(parseBrazilianRating(raw)).toEqual({ certification, minAge });
  });

  it.each([[''], [null], [undefined], ['PG-13'], ['R']])('ignora %p', (raw) => {
    expect(parseBrazilianRating(raw)).toBeNull();
  });
});

describe('deck cursor', () => {
  it('faz round-trip', () => {
    const cursor = { featured: true, popularity: 123.45, id: 9 };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('rejeita cursor adulterado', () => {
    expect(decodeCursor('lixo')).toBeUndefined();
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(decodeCursor(Buffer.from('[1,"x","y"]').toString('base64url'))).toBeUndefined();
  });
});

describe('isAnime', () => {
  it('exige animação + origem japonesa', () => {
    expect(isAnime({ genreIds: [16], originalLanguage: 'ja', originCountries: [] })).toBe(true);
    expect(isAnime({ genreIds: [16, 35], originalLanguage: 'en', originCountries: ['JP'] })).toBe(true);
    expect(isAnime({ genreIds: [16], originalLanguage: 'en', originCountries: ['US'] })).toBe(false);
    expect(isAnime({ genreIds: [18], originalLanguage: 'ja', originCountries: ['JP'] })).toBe(false);
  });
});

describe('resolveRole', () => {
  it('promove somente e-mails da allowlist, sem diferenciar maiúsculas', () => {
    expect(resolveRole('Admin@Site.com', ['admin@site.com'])).toBe('ADMIN');
    expect(resolveRole('user@site.com', ['admin@site.com'])).toBe('USER');
  });
});
