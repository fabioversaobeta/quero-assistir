import type { AvailabilityType, TitleKind } from '@quero-assistir/contracts';

export interface Genre {
  id: number;
  name: string;
}

export interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface Availability {
  type: AvailabilityType;
  provider: Provider | null;
}

export interface Title {
  id: number;
  tmdbId: number;
  kind: TitleKind;
  isAnime: boolean;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: Date | null;
  runtimeMinutes: number | null;
  certification: string | null;
  minAge: number | null;
  voteAverage: number;
  popularity: number;
  hidden: boolean;
  featured: boolean;
  syncedAt: Date;
  genres: Genre[];
  availability: Availability[];
}
