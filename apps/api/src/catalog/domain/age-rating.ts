/**
 * Classificação indicativa brasileira (ClassInd).
 * O TMDB devolve strings como "L", "10", "12", "14", "16", "18" para o país BR.
 */
export interface AgeRating {
  certification: string;
  minAge: number;
}

const MIN_AGE_BY_CERTIFICATION: Record<string, number> = {
  L: 0,
  '10': 10,
  '12': 12,
  '14': 14,
  '16': 16,
  '18': 18,
};

export function parseBrazilianRating(raw: string | null | undefined): AgeRating | null {
  if (!raw) return null;
  let normalized = raw.trim().toUpperCase();
  if (normalized === 'LIVRE') normalized = 'L';
  normalized = normalized.replace(/\s*ANOS$/, '');
  const minAge = MIN_AGE_BY_CERTIFICATION[normalized];
  return minAge === undefined ? null : { certification: normalized, minAge };
}
