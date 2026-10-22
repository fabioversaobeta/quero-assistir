import { Injectable, Logger } from '@nestjs/common';
import { Config } from '../../config/app-config';

const BASE_URL = 'https://api.themoviedb.org/3';
const MAX_ATTEMPTS = 4;

export class TmdbHttpError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`TMDB ${status} em ${path}`);
  }
}

/** Cliente HTTP fino do TMDB: autenticação Bearer, idioma padrão e retry em 429/5xx. */
@Injectable()
export class TmdbHttpClient {
  private readonly logger = new Logger(TmdbHttpClient.name);

  constructor(private readonly config: Config) {}

  async get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    if (!this.config.tmdb.apiToken) {
      throw new Error('TMDB_API_TOKEN não configurado');
    }
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set('language', this.config.tmdb.language);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    for (let attempt = 1; ; attempt++) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.tmdb.apiToken}`,
          Accept: 'application/json',
        },
      });
      if (response.ok) return (await response.json()) as T;

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= MAX_ATTEMPTS) throw new TmdbHttpError(response.status, path);

      const retryAfter = Number(response.headers.get('retry-after'));
      const delayMs = retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
      this.logger.warn(`TMDB ${response.status} em ${path}; tentativa ${attempt}, aguardando ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
