import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SwipeDecision, TitleDto, WatchlistItemDto } from '@quero-assistir/contracts';
import type { LibraryStore } from './library-store';

const KEY = 'qa.library.v1';

export interface LocalDecision {
  titleId: number;
  decision: SwipeDecision;
  decidedAt: string;
  watched: boolean;
  /** Guardamos o título curtido para a lista funcionar offline. */
  snapshot?: TitleDto;
}

/** Modo anônimo: tudo fica no aparelho (AsyncStorage). Nada é enviado ao servidor. */
export class LocalLibraryStore implements LibraryStore {
  private cache: Map<number, LocalDecision> | null = null;

  private async load(): Promise<Map<number, LocalDecision>> {
    if (this.cache) return this.cache;
    let items: LocalDecision[] = [];
    try {
      items = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as LocalDecision[];
    } catch {
      items = [];
    }
    this.cache = new Map(items.map((i) => [i.titleId, i]));
    return this.cache;
  }

  private async persist(): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify([...(await this.load()).values()]));
  }

  async decide(title: TitleDto, decision: SwipeDecision) {
    (await this.load()).set(title.id, {
      titleId: title.id,
      decision,
      decidedAt: new Date().toISOString(),
      watched: false,
      snapshot: decision === 'LIKE' ? title : undefined,
    });
    await this.persist();
  }

  async undo(titleId: number) {
    (await this.load()).delete(titleId);
    await this.persist();
  }

  async watchlist(): Promise<WatchlistItemDto[]> {
    return [...(await this.load()).values()]
      .filter((d) => d.decision === 'LIKE' && d.snapshot)
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .map((d) => ({ title: d.snapshot as TitleDto, watched: d.watched, decidedAt: d.decidedAt }));
  }

  async setWatched(titleId: number, watched: boolean) {
    const current = (await this.load()).get(titleId);
    if (!current || current.decision !== 'LIKE') return;
    current.watched = watched;
    await this.persist();
  }

  async decidedIds() {
    return new Set((await this.load()).keys());
  }

  /** Usado no login para migrar o histórico anônimo para a conta. */
  async all(): Promise<LocalDecision[]> {
    return [...(await this.load()).values()];
  }

  async clear() {
    this.cache = new Map();
    await AsyncStorage.removeItem(KEY);
  }
}
