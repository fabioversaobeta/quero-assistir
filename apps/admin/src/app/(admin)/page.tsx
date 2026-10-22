import type { AdminStatsDto } from '@quero-assistir/contracts';
import { ActionButton } from '@/components/actions';
import { apiGet } from '@/lib/api';
import { formatDateTime, SyncStatusBadge } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Card({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const s = await apiGet<AdminStatsDto>('/v1/admin/stats');
  const likeRate = s.swipes.total ? Math.round((s.swipes.likes / s.swipes.total) * 100) : 0;

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Visão geral</h1>
        <ActionButton label="Sincronizar agora" method="POST" path="v1/admin/sync" body={{ scope: 'all' }} variant="primary" />
      </div>

      <div className="cards">
        <Card label="Títulos no catálogo" value={s.titles.total} sub={`${s.titles.hidden} ocultos`} />
        <Card label="Em cartaz" value={s.titles.inTheaters} />
        <Card label="Em streaming" value={s.titles.onStreaming} />
        <Card label="Usuários" value={s.users.total} sub={`+${s.users.newLast7Days} em 7 dias`} />
        <Card label="Decisões (swipes)" value={s.swipes.total} sub={`${s.swipes.last24h} nas últimas 24h`} />
        <Card label="Taxa de “quero ver”" value={`${likeRate}%`} sub={`${s.swipes.likes} likes · ${s.swipes.dislikes} descartes`} />
      </div>

      <h2>Última sincronização</h2>
      {s.lastSync ? (
        <div className="card row">
          <SyncStatusBadge status={s.lastSync.status} />
          <span>escopo {s.lastSync.scope}</span>
          <span className="muted">{formatDateTime(s.lastSync.startedAt)}</span>
          {s.lastSync.error && <span className="error">{s.lastSync.error}</span>}
        </div>
      ) : (
        <p className="muted">Nenhuma sincronização executada ainda.</p>
      )}

      <h2>Mais desejados</h2>
      <table>
        <thead>
          <tr><th>Título</th><th>Likes</th></tr>
        </thead>
        <tbody>
          {s.topLiked.map((t) => (
            <tr key={t.titleId}><td>{t.title}</td><td>{t.likes}</td></tr>
          ))}
          {s.topLiked.length === 0 && <tr><td colSpan={2} className="muted">Sem dados ainda.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
