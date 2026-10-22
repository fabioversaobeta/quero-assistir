import { Injectable } from '@nestjs/common';
import type { TitleDto } from '@quero-assistir/contracts';
import { Config } from '../../config/app-config';
import type { Title } from '../domain/title';

/** Converte entidades de domínio em DTOs HTTP, montando URLs completas de imagem. */
@Injectable()
export class TitlePresenter {
  constructor(private readonly config: Config) {}

  toDto(t: Title): TitleDto {
    return {
      id: t.id,
      kind: t.kind,
      isAnime: t.isAnime,
      title: t.title,
      originalTitle: t.originalTitle,
      overview: t.overview,
      posterUrl: this.image('w500', t.posterPath),
      backdropUrl: this.image('w780', t.backdropPath),
      releaseDate: t.releaseDate ? t.releaseDate.toISOString().slice(0, 10) : null,
      runtimeMinutes: t.runtimeMinutes,
      certification: t.certification,
      minAge: t.minAge,
      voteAverage: t.voteAverage,
      genres: t.genres,
      availability: t.availability.map((a) => ({
        type: a.type,
        provider: a.provider
          ? {
              id: a.provider.id,
              name: a.provider.name,
              logoUrl: this.image('w92', a.provider.logoPath),
            }
          : null,
      })),
    };
  }

  image(size: string, path: string | null): string | null {
    return path ? `${this.config.tmdb.imageBaseUrl}/${size}${path}` : null;
  }
}
