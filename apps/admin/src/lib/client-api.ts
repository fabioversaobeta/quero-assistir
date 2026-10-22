'use client';

/** Chamada do navegador para a API via proxy do Next. Lança com a mensagem do servidor em caso de erro. */
export async function callApi(method: string, path: string, body?: unknown): Promise<void> {
  const response = await fetch(`/api/proxy/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? `Erro ${response.status}`);
  }
}
