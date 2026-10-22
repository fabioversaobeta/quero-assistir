const ANIMATION_GENRE_ID = 16;

/**
 * Anime = animação (gênero 16) de origem japonesa.
 * O TMDB não tem um tipo "anime"; esta é a heurística mais estável disponível.
 */
export function isAnime(input: {
  genreIds: readonly number[];
  originalLanguage: string | null;
  originCountries: readonly string[];
}): boolean {
  if (!input.genreIds.includes(ANIMATION_GENRE_ID)) return false;
  return input.originalLanguage === 'ja' || input.originCountries.includes('JP');
}
