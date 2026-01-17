import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

export const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN ?? '',
  CLIENT_ID: process.env.CLIENT_ID ?? '',
  CLIENT_SECRET: process.env.CLIENT_SECRET ?? '',
  OWNER_IDS: process.env.OWNER_IDS?.split(',') ?? [],
  DEFAULT_PREFIX: process.env.DEFAULT_PREFIX ?? '!',
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'production',
  API_PORT: parseInt(process.env.API_PORT ?? '4000', 10),
  API_PREFIX: process.env.API_PREFIX ?? 'api',
  API_ORIGIN: process.env.API_ORIGIN ?? '*',
  API_REDIRECT: process.env.API_REDIRECT ?? 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? undefined,
  REDIS_DB: parseInt(process.env.REDIS_DB ?? '0', 10),
} as const;

// Validate required environment variables
if (!CONFIG.DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN is required in environment variables');
}

if (!CONFIG.CLIENT_ID) {
  throw new Error('CLIENT_ID is required in environment variables');
}
