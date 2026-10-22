import { z } from 'zod';

const csv = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(3000),
  CORS_ORIGINS: z.string().default('').transform(csv),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter ao menos 32 caracteres'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
  GOOGLE_CLIENT_IDS: z.string().default('').transform(csv),
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((v) => csv(v).map((e) => e.toLowerCase())),
  TMDB_API_TOKEN: z.string().default(''),
  TMDB_LANGUAGE: z.string().default('pt-BR'),
  TMDB_REGION: z.string().length(2).default('BR'),
  TMDB_IMAGE_BASE_URL: z.string().url().default('https://image.tmdb.org/t/p'),
  SYNC_SCHEDULER_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  SYNC_CRON: z.string().default('0 5 * * *'),
  SYNC_TIMEZONE: z.string().default('America/Sao_Paulo'),
  SYNC_STREAMING_PAGES: z.coerce.number().int().min(1).max(20).default(3),
});

export type AppConfig = {
  databaseUrl: string;
  port: number;
  corsOrigins: string[];
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  googleClientIds: string[];
  adminEmails: string[];
  tmdb: { apiToken: string; language: string; region: string; imageBaseUrl: string };
  sync: { schedulerEnabled: boolean; cron: string; timezone: string; streamingPages: number };
};

/** Token de injeção da configuração tipada (abstract class evita strings mágicas). */
export abstract class Config implements AppConfig {
  abstract databaseUrl: string;
  abstract port: number;
  abstract corsOrigins: string[];
  abstract jwtSecret: string;
  abstract jwtExpiresInSeconds: number;
  abstract googleClientIds: string[];
  abstract adminEmails: string[];
  abstract tmdb: AppConfig['tmdb'];
  abstract sync: AppConfig['sync'];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuração inválida: ${issues}`);
  }
  const e = parsed.data;
  return {
    databaseUrl: e.DATABASE_URL,
    port: e.PORT,
    corsOrigins: e.CORS_ORIGINS,
    jwtSecret: e.JWT_SECRET,
    jwtExpiresInSeconds: e.JWT_EXPIRES_IN_SECONDS,
    googleClientIds: e.GOOGLE_CLIENT_IDS,
    adminEmails: e.ADMIN_EMAILS,
    tmdb: {
      apiToken: e.TMDB_API_TOKEN,
      language: e.TMDB_LANGUAGE,
      region: e.TMDB_REGION.toUpperCase(),
      imageBaseUrl: e.TMDB_IMAGE_BASE_URL,
    },
    sync: {
      schedulerEnabled: e.SYNC_SCHEDULER_ENABLED,
      cron: e.SYNC_CRON,
      timezone: e.SYNC_TIMEZONE,
      streamingPages: e.SYNC_STREAMING_PAGES,
    },
  };
}
