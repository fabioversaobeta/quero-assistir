import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  DeckCategory,
  DeckScope,
  GenreDto,
  PageDto,
  ProviderDto,
  TitleDto,
} from '@quero-assistir/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentAuth, OptionalJwtAuthGuard } from '../../identity/presentation/auth.guards';
import type { AuthClaims } from '../../identity/domain/identity';
import {
  GetTitleUseCase,
  ListGenresUseCase,
  ListProvidersUseCase,
} from '../application/catalog-queries';
import { ListDeckUseCase } from '../application/list-deck.use-case';
import { TitlePresenter } from './title.presenter';

class DeckQueryParams {
  @IsIn(['cinema', 'streaming'])
  scope!: DeckScope;

  @IsOptional()
  @IsIn(['all', 'movie', 'series', 'anime'])
  category?: DeckCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  providerId?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('catalog')
@Controller('v1')
export class CatalogController {
  constructor(
    private readonly listDeck: ListDeckUseCase,
    private readonly getTitle: GetTitleUseCase,
    private readonly listGenres: ListGenresUseCase,
    private readonly listProviders: ListProvidersUseCase,
    private readonly presenter: TitlePresenter,
  ) {}

  @Get('deck')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cartas para o swipe',
    description:
      'Anônimo: devolve o catálogo em ordem estável e o app filtra localmente o que já viu. ' +
      'Logado (Bearer): o servidor já exclui os títulos que o usuário decidiu.',
  })
  @UseGuards(OptionalJwtAuthGuard)
  async deck(
    @Query() query: DeckQueryParams,
    @CurrentAuth() auth?: AuthClaims,
  ): Promise<PageDto<TitleDto>> {
    const page = await this.listDeck.execute({ ...query, userId: auth?.userId });
    return { items: page.items.map((t) => this.presenter.toDto(t)), nextCursor: page.nextCursor };
  }

  @Get('titles/:id')
  async title(@Param('id', ParseIntPipe) id: number): Promise<TitleDto> {
    return this.presenter.toDto(await this.getTitle.execute(id));
  }

  @Get('genres')
  genres(): Promise<GenreDto[]> {
    return this.listGenres.execute();
  }

  /** Plataformas habilitadas para o catálogo de streaming. */
  @Get('providers')
  async providers(): Promise<ProviderDto[]> {
    const providers = await this.listProviders.execute();
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      logoUrl: this.presenter.image('w92', p.logoPath),
    }));
  }
}
