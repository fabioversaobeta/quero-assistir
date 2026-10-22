'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { callApi } from '@/lib/client-api';

/** Botão que chama a API, mostra erro inline e atualiza a página (Server Components) ao concluir. */
export function ActionButton({
  label,
  method,
  path,
  body,
  variant = 'default',
}: {
  label: string;
  method: string;
  path: string;
  body?: unknown;
  variant?: 'default' | 'primary' | 'danger';
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      setError(null);
      try {
        await callApi(method, path, body);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha');
      }
    });

  return (
    <span>
      <button className={`btn ${variant}`} onClick={run} disabled={pending}>
        {pending ? '…' : label}
      </button>
      {error && <span className="error"> {error}</span>}
    </span>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn"
      onClick={async () => {
        await fetch('/api/session', { method: 'DELETE' });
        router.push('/login');
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
