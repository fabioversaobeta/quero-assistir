import type { SyncRunDto } from '@quero-assistir/contracts';
import { ActionButton } from '@/components/actions';
import { apiGet } from '@/lib/api';
import { formatDateTime, SyncStatusBadge } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SyncPage() {
  const runs = await apiGet<SyncRunDto[]>('/v1/admin/sync-runs');
  return (
    <>
      <h1>Sincronização com o TMDB</h1>
      <div className="row">
        <ActionButton label="Tudo" method="POST" path="v1/admin/sync" body={{ scope: 'all' }} variant="primary" />
        <ActionButton label="Só cinema" method="POST" path="v1/admin/sync" body={{ scope: 'cinema' }} />
        <ActionButton label="Só streaming" method="POST" path="v1/admin/sync" body={{ scope: 'streaming' }} />
        <ActionButton label="Só plataformas" method="POST" path="v1/admin/sync" body={{ scope: 'providers' }} />
      </div>
      <p className="muted">Recarregue a página para acompanhar o andamento.</p>

      <table>
        <thead>
          <tr><th>#</th><th>Início</th><th>Escopo</th><th>Origem</th><th>Status</th><th>Resultado</th></tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{formatDateTime(r.startedAt)}</td>
              <td>{r.scope}</td>
              <td>{r.trigger === 'SCHEDULE' ? 'Agendada' : 'Manual'}</td>
              <td><SyncStatusBadge status={r.status} /></td>
              <td className="muted">
                {r.error ?? (r.stats ? Object.entries(r.stats).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
