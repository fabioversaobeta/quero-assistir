import type { SyncRunDto } from '@quero-assistir/contracts';

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function SyncStatusBadge({ status }: { status: SyncRunDto['status'] }) {
  const map = {
    SUCCEEDED: ['ok', 'Concluída'],
    FAILED: ['bad', 'Falhou'],
    RUNNING: ['warn', 'Em andamento'],
  } as const;
  const [kind, label] = map[status];
  return <span className={`badge ${kind}`}>{label}</span>;
}
