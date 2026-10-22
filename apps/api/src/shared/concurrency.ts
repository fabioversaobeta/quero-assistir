/** Executa `fn` sobre os itens com no máximo `limit` chamadas simultâneas, sem lançar: devolve falhas. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<{ results: R[]; failures: { item: T; error: unknown }[] }> {
  const results: R[] = [];
  const failures: { item: T; error: unknown }[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        results.push(await fn(item));
      } catch (error) {
        failures.push({ item, error });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { results, failures };
}
