import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  DeckCategory,
  DeckScope,
  PageDto,
  SwipeDecision,
  TitleDto,
  WatchlistItemDto,
} from '@quero-assistir/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ListDeckUseCase } from '../../catalog/application/list-deck.use-case';
import { TitlePresenter } from '../../catalog/presentation/title.presenter';
import type { AuthClaims } from '../../identity/domain/identity';
import { CurrentAuth, JwtAuthGuard } from '../../identity/presentation/auth.guards';
import {
  ImportSwipesUseCase,
  ListWatchlistUseCase,
  RecordSwipeUseCase,
  SetWatchedUseCase,
  UndoSwipeUseCase,
} from '../application/library-use-cases';

class SwipeBody {
  @IsIn(['LIKE', 'DISLIKE'])
  decision!: SwipeDecision;
}

class WatchedBody {
  @IsBoolean()
  watched!: boolean;
}

class ImportItem {
  @IsInt()
  titleId!: number;

  @IsIn(['LIKE', 'DISLIKE'])
  decision!: SwipeDecision;

  @IsOptional()
  @IsDateString()
  decidedAt?: string;

  @IsOptional()
  @IsBoolean()
  watched?: boolean;
}

class ImportBody {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ImportItem)
  swipes!: ImportItem[];
}

class MeDeckQuery {
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

@ApiTags('library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/me')
export class LibraryController {
  constructor(
    private readonly recordSwipe: RecordSwipeUseCase,
    private readonly undoSwipe: UndoSwipeUseCase,
    private readonly setWatched: SetWatchedUseCase,
    private readonly listWatchlist: ListWatchlistUseCase,
    private readonly importSwipes: ImportSwipesUseCase,
    private readonly listDeck: ListDeckUseCase,
    private readonly presenter: TitlePresenter,
  ) {}

  /** Mesmo que GET /v1/deck, porém sempre filtrando o que o usuário já decidiu. */
  @Get('deck')
  async deck(
    @Query() query: MeDeckQuery,
    @CurrentAuth() auth: AuthClaims,
  ): Promise<PageDto<TitleDto>> {
    const page = await this.listDeck.execute({ ...query, userId: auth.userId });
    return { items: page.items.map((t) => this.presenter.toDto(t)), nextCursor: page.nextCursor };
  }

  @Get('watchlist')
  async watchlist(@CurrentAuth() auth: AuthClaims): Promise<WatchlistItemDto[]> {
    const entries = await this.listWatchlist.execute(auth.userId);
    return entries.map((e) => ({
      title: this.presenter.toDto(e.title),
      watched: e.watched,
      decidedAt: e.decidedAt.toISOString(),
    }));
  }

  @Put('swipes/:titleId')
  @HttpCode(204)
  async swipe(
    @Param('titleId', ParseIntPipe) titleId: number,
    @Body() body: SwipeBody,
    @CurrentAuth() auth: AuthClaims,
  ): Promise<void> {
    await this.recordSwipe.execute(auth.userId, titleId, body.decision);
  }

  /** Desfazer: remove a decisão e o título volta a aparecer no deck. */
  @Delete('swipes/:titleId')
  @HttpCode(204)
  async undo(
    @Param('titleId', ParseIntPipe) titleId: number,
    @CurrentAuth() auth: AuthClaims,
  ): Promise<void> {
    await this.undoSwipe.execute(auth.userId, titleId);
  }

  @Put('watchlist/:titleId/watched')
  @HttpCode(204)
  async watched(
    @Param('titleId', ParseIntPipe) titleId: number,
    @Body() body: WatchedBody,
    @CurrentAuth() auth: AuthClaims,
  ): Promise<void> {
    await this.setWatched.execute(auth.userId, titleId, body.watched);
  }

  /** Migra as decisões do modo anônimo ao fazer login. */
  @Post('swipes/import')
  @HttpCode(200)
  async import(
    @Body() body: ImportBody,
    @CurrentAuth() auth: AuthClaims,
  ): Promise<{ imported: number }> {
    const now = new Date();
    const imported = await this.importSwipes.execute(
      auth.userId,
      body.swipes.map((s) => ({
        titleId: s.titleId,
        decision: s.decision,
        watched: s.watched ?? false,
        decidedAt: s.decidedAt ? new Date(s.decidedAt) : now,
      })),
    );
    return { imported };
  }
}
