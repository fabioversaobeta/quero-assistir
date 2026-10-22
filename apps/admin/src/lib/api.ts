import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const TOKEN_COOKIE = 'qa_token';
export const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/** GET autenticado, executado no servidor do Next (o token nunca vai ao JavaScript do navegador). */
export async function apiGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    cache: 'no-store',
  });
  if (response.status === 401 || response.status === 403) redirect('/login?expired=1');
  if (!response.ok) throw new Error(`API ${response.status} em ${path}`);
  return (await response.json()) as T;
}
