import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  AdminProviderDto,
  AdminStatsDto,
  AdminTitleDto,
  AdminUserDto,
  PageDto,
  SyncRunDto,
} from '@quero-assistir/contracts';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { Title } from '../../catalog/domain/title';
import { TitlePresenter } from '../../catalog/presentation/title.presenter';
import type { SyncRunRecord, SyncScope } from '../../ingestion/domain/ports';
import { AdminGuard } from '../../identity/presentation/auth.guards';
import { BackofficeCommands, BackofficeQueries } from '../application/backoffice';

class TitleSearchQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

class PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

class ModerationBody {
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

class ProviderBody {
  @IsBoolean()
  enabled!: boolean;
}

class SyncBody {
  @IsIn(['all', 'cinema', 'streaming', 'providers'])
  scope!: SyncScope;
}

const toSyncDto = (r: SyncRunRecord): SyncRunDto => ({
  id: r.id,
  scope: r.scope,
  trigger: r.trigger,
  status: r.status,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
  stats: r.stats,
  error: r.error,
});

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('v1/admin')
export class BackofficeController {
  constructor(
    private readonly queries: BackofficeQueries,
    private readonly commands: BackofficeCommands,
    private readonly presenter: TitlePresenter,
  ) {}

  @Get('stats')
  async stats(): Promise<AdminStatsDto> {
    const { stats, lastSync } = await this.queries.dashboard();
    return { ...stats, lastSync: lastSync ? toSyncDto(lastSync) : null };
  }

  @Get('titles')
  async titles(@Query() q: TitleSearchQuery): Promise<PageDto<AdminTitleDto> & { total: number }> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;
    const { items, total } = await this.queries.searchTitles({
      search: q.search,
      hidden: q.hidden,
      page,
      pageSize,
    });
    return {
      items: items.map((t) => this.toAdminTitle(t)),
      total,
      nextCursor: page * pageSize < total ? String(page + 1) : null,
    };
  }

  @Patch('titles/:id')
  async moderate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModerationBody,
  ): Promise<AdminTitleDto> {
    return this.toAdminTitle(
      await this.commands.moderateTitle(id, { hidden: body.hidden, featured: body.featured }),
    );
  }

  @Get('providers')
  async providers(): Promise<AdminProviderDto[]> {
    const providers = await this.queries.listProviders();
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      logoUrl: this.presenter.image('w92', p.logoPath),
      enabled: p.enabled,
    }));
  }

  @Put('providers/:id')
  @HttpCode(204)
  async setProvider(@Param('id', ParseIntPipe) id: number, @Body() body: ProviderBody) {
    await this.commands.setProviderEnabled(id, body.enabled);
  }

  @Get('users')
  async users(@Query() q: PageQuery): Promise<PageDto<AdminUserDto> & { total: number }> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;
    const { items, total } = await this.queries.listUsers(page, pageSize);
    return {
      total,
      nextCursor: page * pageSize < total ? String(page + 1) : null,
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        pictureUrl: u.pictureUrl,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt.toISOString(),
        swipeCount: u.swipeCount,
      })),
    };
  }

  @Get('sync-runs')
  async syncRuns(): Promise<SyncRunDto[]> {
    return (await this.queries.listSyncRuns(30)).map(toSyncDto);
  }

  @Post('sync')
  @HttpCode(202)
  async triggerSync(@Body() body: SyncBody): Promise<SyncRunDto> {
    return toSyncDto(await this.commands.triggerSync(body.scope));
  }

  private toAdminTitle(t: Title): AdminTitleDto {
    return {
      ...this.presenter.toDto(t),
      hidden: t.hidden,
      featured: t.featured,
      tmdbId: t.tmdbId,
      popularity: t.popularity,
      syncedAt: t.syncedAt.toISOString(),
    };
  }
}
