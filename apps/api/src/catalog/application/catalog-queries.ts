import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../shared/domain-error';
import type { Genre, Provider, Title } from '../domain/title';
import { TitleRepository } from '../domain/title.repository';

@Injectable()
export class GetTitleUseCase {
  constructor(private readonly titles: TitleRepository) {}

  async execute(id: number): Promise<Title> {
    const title = await this.titles.findById(id);
    if (!title || title.hidden) throw new NotFoundError('Título');
    return title;
  }
}

@Injectable()
export class ListGenresUseCase {
  constructor(private readonly titles: TitleRepository) {}

  execute(): Promise<Genre[]> {
    return this.titles.listGenres();
  }
}

@Injectable()
export class ListProvidersUseCase {
  constructor(private readonly titles: TitleRepository) {}

  execute(): Promise<Provider[]> {
    return this.titles.listEnabledProviders();
  }
}
