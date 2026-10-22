import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://quero:quero@localhost:5433/quero_assistir_test';
if (!process.env.DATABASE_URL.includes('test')) {
  throw new Error('O e2e apaga dados: use um banco cujo nome contenha "test"');
}
process.env.JWT_SECRET = 'e2e-secret-e2e-secret-e2e-secret-1234';
process.env.GOOGLE_CLIENT_IDS = 'test-client';
process.env.ADMIN_EMAILS = 'boss@example.com';
process.env.SYNC_SCHEDULER_ENABLED = 'false';

import { AppModule } from '../src/app.module';
import { GoogleIdentityVerifier } from '../src/identity/domain/ports';
import { UnauthorizedError } from '../src/shared/domain-error';
import { DomainErrorFilter } from '../src/shared/domain-error.filter';
import { PrismaService } from '../src/shared/prisma.service';

class FakeGoogle extends GoogleIdentityVerifier {
  async verify(idToken: string) {
    const [, email] = idToken.split(':');
    if (!email) throw new UnauthorizedError('Token do Google inválido');
    return { sub: `sub-${email}`, email, name: email.split('@')[0], pictureUrl: null };
  }
}
const googleToken = (email: string) => `google:${email}:${'x'.repeat(20)}`;

describe('API (e2e, Postgres real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GoogleIdentityVerifier)
      .useClass(FakeGoogle)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new DomainErrorFilter());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.$executeRawUnsafe(
      'TRUNCATE "Swipe","Availability","TitleGenre","Title","Genre","Provider","User","SyncRun" RESTART IDENTITY CASCADE',
    );
    await prisma.provider.createMany({
      data: [
        { id: 8, name: 'Netflix', enabled: true },
        { id: 99, name: 'Desabilitada', enabled: false },
      ],
    });
    await prisma.genre.create({ data: { id: 28, name: 'Ação' } });

    const mk = async (
      key: string,
      popularity: number,
      extra: Partial<{ kind: 'MOVIE' | 'SERIES'; isAnime: boolean; hidden: boolean }>,
      availability: { type: 'CINEMA' | 'FLATRATE'; providerId?: number }[],
    ) => {
      const t = await prisma.title.create({
        data: {
          tmdbId: Math.floor(Math.random() * 1e9),
          kind: extra.kind ?? 'MOVIE',
          title: key,
          originalTitle: key,
          popularity,
          isAnime: extra.isAnime ?? false,
          hidden: extra.hidden ?? false,
          certification: '12',
          minAge: 12,
          syncedAt: new Date(),
          genres: { create: [{ genreId: 28 }] },
          availabilities: {
            create: availability.map((a) => ({ region: 'BR', lastSeenAt: new Date(), ...a })),
          },
        },
      });
      ids[key] = t.id;
    };
    await mk('cine-a', 90, {}, [{ type: 'CINEMA' }]);
    await mk('cine-b', 80, {}, [{ type: 'CINEMA' }]);
    await mk('cine-c', 70, {}, [{ type: 'CINEMA' }]);
    await mk('cine-hidden', 99, { hidden: true }, [{ type: 'CINEMA' }]);
    await mk('serie-netflix', 60, { kind: 'SERIES' }, [{ type: 'FLATRATE', providerId: 8 }]);
    await mk('anime-netflix', 50, { kind: 'SERIES', isAnime: true }, [{ type: 'FLATRATE', providerId: 8 }]);
    await mk('so-desabilitada', 40, {}, [{ type: 'FLATRATE', providerId: 99 }]);
  });

  afterAll(async () => {
    await app.close();
  });

  const login = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/google')
      .send({ idToken: googleToken(email) })
      .expect(200);
    return res.body as { accessToken: string; user: { id: string; role: string } };
  };

  it('health responde com banco', () => request(app.getHttpServer()).get('/health').expect(200));

  it('deck de cinema anônimo: ordenado por popularidade, sem ocultos, com paginação por cursor', async () => {
    const first = await request(app.getHttpServer()).get('/v1/deck?scope=cinema&limit=2').expect(200);
    expect(first.body.items.map((t: { title: string }) => t.title)).toEqual(['cine-a', 'cine-b']);
    expect(first.body.items[0]).toMatchObject({ certification: '12', minAge: 12 });
    expect(first.body.nextCursor).toBeTruthy();

    const second = await request(app.getHttpServer())
      .get(`/v1/deck?scope=cinema&limit=2&cursor=${first.body.nextCursor}`)
      .expect(200);
    expect(second.body.items.map((t: { title: string }) => t.title)).toEqual(['cine-c']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('deck de streaming: só plataformas habilitadas; filtros por categoria e provedor', async () => {
    const all = await request(app.getHttpServer()).get('/v1/deck?scope=streaming').expect(200);
    expect(all.body.items.map((t: { title: string }) => t.title)).toEqual(['serie-netflix', 'anime-netflix']);

    const anime = await request(app.getHttpServer()).get('/v1/deck?scope=streaming&category=anime').expect(200);
    expect(anime.body.items.map((t: { title: string }) => t.title)).toEqual(['anime-netflix']);

    const wrongProvider = await request(app.getHttpServer()).get('/v1/deck?scope=streaming&providerId=99').expect(200);
    expect(wrongProvider.body.items).toEqual([]);
  });

  it('valida parâmetros inválidos', () =>
    request(app.getHttpServer()).get('/v1/deck?scope=lua').expect(400));

  it('fluxo do usuário: login, swipe, deck filtrado, lista, desfazer, importar, excluir conta', async () => {
    const { accessToken, user } = await login('ana@example.com');
    const auth = { Authorization: `Bearer ${accessToken}` };
    expect(user.role).toBe('USER');

    await request(app.getHttpServer()).put(`/v1/me/swipes/${ids['cine-a']}`).set(auth).send({ decision: 'LIKE' }).expect(204);
    await request(app.getHttpServer()).put(`/v1/me/swipes/${ids['cine-b']}`).set(auth).send({ decision: 'DISLIKE' }).expect(204);

    const deck = await request(app.getHttpServer()).get('/v1/deck?scope=cinema').set(auth).expect(200);
    expect(deck.body.items.map((t: { title: string }) => t.title)).toEqual(['cine-c']);

    const list = await request(app.getHttpServer()).get('/v1/me/watchlist').set(auth).expect(200);
    expect(list.body.map((i: { title: { title: string } }) => i.title.title)).toEqual(['cine-a']);

    await request(app.getHttpServer()).put(`/v1/me/watchlist/${ids['cine-a']}/watched`).set(auth).send({ watched: true }).expect(204);
    await request(app.getHttpServer()).put(`/v1/me/watchlist/${ids['cine-b']}/watched`).set(auth).send({ watched: true }).expect(404);

    await request(app.getHttpServer()).delete(`/v1/me/swipes/${ids['cine-b']}`).set(auth).expect(204);
    const afterUndo = await request(app.getHttpServer()).get('/v1/me/deck?scope=cinema').set(auth).expect(200);
    expect(afterUndo.body.items.map((t: { title: string }) => t.title)).toEqual(['cine-b', 'cine-c']);

    // Importação do modo anônimo: título inexistente é ignorado; decisão do servidor mais recente vence.
    const imported = await request(app.getHttpServer())
      .post('/v1/me/swipes/import')
      .set(auth)
      .send({
        swipes: [
          { titleId: ids['cine-c'], decision: 'LIKE', decidedAt: '2026-01-01T00:00:00Z' },
          { titleId: ids['cine-a'], decision: 'DISLIKE', decidedAt: '2020-01-01T00:00:00Z' },
          { titleId: 999999, decision: 'LIKE' },
        ],
      })
      .expect(200);
    expect(imported.body.imported).toBe(1);

    await request(app.getHttpServer()).get('/v1/me').set(auth).expect(200);
    await request(app.getHttpServer()).delete('/v1/me').set(auth).expect(204);
    expect(await prisma.swipe.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
  });

  it('rotas protegidas exigem token; rotas admin exigem papel ADMIN', async () => {
    await request(app.getHttpServer()).get('/v1/me/watchlist').expect(401);
    await request(app.getHttpServer()).post('/v1/auth/google').send({ idToken: 'curto' }).expect(400);

    const normal = await login('bob@example.com');
    await request(app.getHttpServer())
      .get('/v1/admin/stats')
      .set({ Authorization: `Bearer ${normal.accessToken}` })
      .expect(403);

    const boss = await login('boss@example.com');
    expect(boss.user.role).toBe('ADMIN');
    const admin = { Authorization: `Bearer ${boss.accessToken}` };

    const stats = await request(app.getHttpServer()).get('/v1/admin/stats').set(admin).expect(200);
    expect(stats.body.titles).toMatchObject({ total: 7, hidden: 1, inTheaters: 4 });

    await request(app.getHttpServer()).patch(`/v1/admin/titles/${ids['cine-a']}`).set(admin).send({ hidden: true }).expect(200);
    const deck = await request(app.getHttpServer()).get('/v1/deck?scope=cinema').expect(200);
    expect(deck.body.items.map((t: { title: string }) => t.title)).not.toContain('cine-a');

    await request(app.getHttpServer()).put('/v1/admin/providers/99').set(admin).send({ enabled: true }).expect(204);
    const providers = await request(app.getHttpServer()).get('/v1/providers').expect(200);
    expect(providers.body.map((p: { id: number }) => p.id).sort()).toEqual([8, 99]);

    const titles = await request(app.getHttpServer()).get('/v1/admin/titles?search=anime').set(admin).expect(200);
    expect(titles.body.items).toHaveLength(1);
  });
});
