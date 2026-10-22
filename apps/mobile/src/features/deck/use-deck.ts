import type { DeckCategory, DeckScope, TitleDto } from '@quero-assistir/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/features/session/session';

export interface DeckFilter {
  scope: DeckScope;
  category: DeckCategory;
  providerId?: number;
}

const PAGE_SIZE = 20;
const MIN_QUEUE = 6;

/**
 * Fila de cartas do swipe.
 * - Logado: o servidor já remove o que o usuário decidiu.
 * - Anônimo: o app remove localmente (ids decididos ficam só no aparelho) e continua paginando.
 */
export function useDeck(filter: DeckFilter) {
  const { api, library, user } = useSession();
  const [queue, setQueue] = useState<TitleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noMorePages, setNoMorePages] = useState(false);

  const generation = useRef(0);
  const cursor = useRef<string | undefined>(undefined);
  const done = useRef(false);
  const fetching = useRef(false);
  const seen = useRef(new Set<number>());
  const history = useRef<TitleDto[]>([]);

  const fetchMore = useCallback(async () => {
    if (fetching.current || done.current) return;
    fetching.current = true;
    const gen = generation.current;
    try {
      let added = 0;
      while (added < MIN_QUEUE && !done.current) {
        const decided = await library.decidedIds();
        const page = await api.deck({ ...filter, cursor: cursor.current, limit: PAGE_SIZE }, !!user);
        if (gen !== generation.current) return;
        cursor.current = page.nextCursor ?? undefined;
        done.current = page.nextCursor === null;
        const fresh = page.items.filter((t) => !decided.has(t.id) && !seen.current.has(t.id));
        fresh.forEach((t) => seen.current.add(t.id));
        added += fresh.length;
        if (fresh.length) setQueue((q) => [...q, ...fresh]);
      }
      setNoMorePages(done.current);
      setError(null);
    } catch (e) {
      if (gen === generation.current) setError(e instanceof Error ? e.message : 'Falha ao carregar');
    } finally {
      if (gen === generation.current) setLoading(false);
      fetching.current = false;
    }
  }, [api, library, user, filter]);

  // Reinicia a fila quando muda filtro ou usuário.
  const key = `${user?.id ?? 'anon'}|${filter.scope}|${filter.category}|${filter.providerId ?? ''}`;
  useEffect(() => {
    generation.current += 1;
    cursor.current = undefined;
    done.current = false;
    fetching.current = false;
    seen.current = new Set();
    history.current = [];
    setQueue([]);
    setNoMorePages(false);
    setError(null);
    setLoading(true);
    void fetchMore();
  }, [key]);

  const decide = useCallback(
    async (decision: 'LIKE' | 'DISLIKE') => {
      const top = queue[0];
      if (!top) return;
      history.current.push(top);
      setQueue((q) => q.slice(1));
      if (queue.length - 1 < MIN_QUEUE) void fetchMore();
      try {
        await library.decide(top, decision);
      } catch (e) {
        // Devolve a carta ao topo se a gravação falhar, para o usuário não perder a decisão.
        history.current.pop();
        setQueue((q) => [top, ...q]);
        setError(e instanceof Error ? e.message : 'Falha ao salvar');
      }
    },
    [queue, library, fetchMore],
  );

  const undo = useCallback(async () => {
    const last = history.current.pop();
    if (!last) return;
    setQueue((q) => [last, ...q]);
    await library.undo(last.id).catch(() => undefined);
  }, [library]);

  return {
    queue,
    loading,
    error,
    exhausted: noMorePages && queue.length === 0,
    canUndo: history.current.length > 0,
    decide,
    undo,
    retry: fetchMore,
  };
}
