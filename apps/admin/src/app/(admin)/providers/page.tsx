import type { AdminProviderDto } from '@quero-assistir/contracts';
import { ActionButton } from '@/components/actions';
import { apiGet } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const providers = await apiGet<AdminProviderDto[]>('/v1/admin/providers');
  return (
    <>
      <h1>Plataformas de streaming</h1>
      <p className="muted">
        Só plataformas habilitadas entram na sincronização e aparecem no app. Após habilitar uma nova, rode
        uma sincronização de “streaming”.
      </p>
      <table>
        <thead>
          <tr><th></th><th>Nome</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id}>
              <td>{p.logoUrl && <img className="logo" src={p.logoUrl} alt="" />}</td>
              <td>{p.name}</td>
              <td><span className={`badge ${p.enabled ? 'ok' : ''}`}>{p.enabled ? 'Habilitada' : 'Desabilitada'}</span></td>
              <td>
                <ActionButton label={p.enabled ? 'Desabilitar' : 'Habilitar'} method="PUT" path={`v1/admin/providers/${p.id}`} body={{ enabled: !p.enabled }} />
              </td>
            </tr>
          ))}
          {providers.length === 0 && (
            <tr><td colSpan={4} className="muted">Nenhuma plataforma ainda. Rode a sincronização “providers”.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
