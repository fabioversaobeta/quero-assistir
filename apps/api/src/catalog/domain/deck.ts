import type { DeckCategory, DeckScope } from '@quero-assistir/contracts';

/** Posição estável no deck: (featured desc, popularity desc, id desc). */
export interface DeckCursor {
  featured: boolean;
  popularity: number;
  id: number;
}

export interface DeckCriteria {
  region: string;
  scope: DeckScope;
  category: DeckCategory;
  providerId?: number;
  /** Quando informado, exclui títulos que este usuário já decidiu. */
  excludeSwipedByUserId?: string;
  after?: DeckCursor;
  limit: number;
}

export const encodeCursor = (c: DeckCursor): string =>
  Buffer.from(JSON.stringify([c.featured ? 1 : 0, c.popularity, c.id])).toString('base64url');

export function decodeCursor(raw: string | undefined): DeckCursor | undefined {
  if (!raw) return undefined;
  try {
    const [featured, popularity, id] = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof popularity !== 'number' || !Number.isInteger(id)) return undefined;
    return { featured: featured === 1, popularity, id };
  } catch {
    return undefined;
  }
}
