import type { AdminUserDto, PageDto } from '@quero-assistir/contracts';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const current = Math.max(Number((await searchParams).page) || 1, 1);
  const data = await apiGet<PageDto<AdminUserDto> & { total: number }>(`/v1/admin/users?page=${current}&pageSize=30`);

  return (
    <>
      <h1>Usuários com conta ({data.total})</h1>
      <p className="muted">Usuários anônimos não aparecem aqui: seus dados ficam somente no aparelho.</p>
      <table>
        <thead>
          <tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Decisões</th><th>Cadastro</th><th>Último acesso</th></tr>
        </thead>
        <tbody>
          {data.items.map((u) => (
            <tr key={u.id}>
              <td>{u.name ?? '—'}</td>
              <td>{u.email}</td>
              <td><span className={`badge ${u.role === 'ADMIN' ? 'warn' : ''}`}>{u.role}</span></td>
              <td>{u.swipeCount}</td>
              <td>{formatDateTime(u.createdAt)}</td>
              <td>{formatDateTime(u.lastLoginAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: '1rem' }}>
        {current > 1 && <Link className="btn" href={`/users?page=${current - 1}`}>← Anterior</Link>}
        {data.nextCursor && <Link className="btn" href={`/users?page=${current + 1}`}>Próxima →</Link>}
      </div>
    </>
  );
}
