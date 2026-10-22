import type { AdminTitleDto, PageDto } from '@quero-assistir/contracts';
import Link from 'next/link';
import { ActionButton } from '@/components/actions';
import { apiGet } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function TitlesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search = '', page = '1' } = await searchParams;
  const current = Math.max(Number(page) || 1, 1);
  const query = new URLSearchParams({ page: String(current), pageSize: '30' });
  if (search) query.set('search', search);
  const data = await apiGet<PageDto<AdminTitleDto> & { total: number }>(`/v1/admin/titles?${query}`);

  const pageLink = (p: number) => `/titles?${new URLSearchParams({ ...(search ? { search } : {}), page: String(p) })}`;

  return (
    <>
      <h1>Catálogo ({data.total})</h1>
      <form className="search" action="/titles">
        <input type="search" name="search" placeholder="Buscar por título…" defaultValue={search} />
        <button className="btn" type="submit">Buscar</button>
      </form>

      <table>
        <thead>
          <tr><th></th><th>Título</th><th>Tipo</th><th>Class.</th><th>Onde</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {data.items.map((t) => (
            <tr key={t.id}>
              <td>{t.posterUrl && <img className="poster" src={t.posterUrl} alt="" />}</td>
              <td>
                <strong>{t.title}</strong>
                <div className="muted">{t.releaseDate?.slice(0, 4) ?? '—'} · pop. {t.popularity.toFixed(0)}</div>
              </td>
              <td>{t.isAnime ? 'Anime' : t.kind === 'MOVIE' ? 'Filme' : 'Série'}</td>
              <td>{t.certification ?? '—'}</td>
              <td>
                {t.availability.some((a) => a.type === 'CINEMA') && <span className="badge ok">Cinema</span>}{' '}
                {[...new Set(t.availability.filter((a) => a.type === 'FLATRATE').map((a) => a.provider?.name))].map((n) => (
                  <span key={n} className="badge">{n}</span>
                ))}
              </td>
              <td>
                {t.hidden && <span className="badge bad">Oculto</span>}
                {t.featured && <span className="badge warn">Destaque</span>}
              </td>
              <td className="row">
                <ActionButton label={t.hidden ? 'Reexibir' : 'Ocultar'} method="PATCH" path={`v1/admin/titles/${t.id}`} body={{ hidden: !t.hidden }} />
                <ActionButton label={t.featured ? 'Tirar destaque' : 'Destacar'} method="PATCH" path={`v1/admin/titles/${t.id}`} body={{ featured: !t.featured }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: '1rem' }}>
        {current > 1 && <Link className="btn" href={pageLink(current - 1)}>← Anterior</Link>}
        {data.nextCursor && <Link className="btn" href={pageLink(current + 1)}>Próxima →</Link>}
      </div>
    </>
  );
}
