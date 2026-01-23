import { SapphireClient, LogLevel, container, RegisterBehavior } from '@sapphire/framework';
import { GatewayIntentBits, Partials, type ClientOptions } from 'discord.js';
import { OAuth2Scopes } from 'discord-api-types/v10';
import { CONFIG } from '#config';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InternationalizationContext } from '@sapphire/plugin-i18next';
import type { Server } from '@sapphire/plugin-api';
import { getGuildLanguage } from '#lib/i18n.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';

// Augment container with Prisma, Redis, and API Server
declare module '@sapphire/framework' {
  interface Container {
    prisma: PrismaClient;
    redis: Redis;
    server: Server;
  }
}

export class BotClient extends SapphireClient {
  public constructor() {
    super({
      baseUserDirectory: join(dirname(fileURLToPath(import.meta.url)), '..'),
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
      loadDefaultErrorListeners: true,
      loadMessageCommandListeners: true,
      logger: {
        level: CONFIG.NODE_ENV === 'development' ? LogLevel.Debug : LogLevel.Info,
      },
      defaultPrefix: CONFIG.DEFAULT_PREFIX,
      defaultCooldown: {
        delay: 3000,
        limit: 1,
        filteredUsers: CONFIG.OWNER_IDS,
      },
      hmr: {
        enabled: CONFIG.NODE_ENV === 'development',
      },
      applicationCommandRegistries: {
        registerCommandIdOnly: false,
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      },
      api: {
        auth: {
          id: CONFIG.CLIENT_ID,
          secret: CONFIG.CLIENT_SECRET,
          cookie: 'SAPPHIRE_AUTH',
          redirect: CONFIG.API_REDIRECT,
          scopes: [OAuth2Scopes.Identify, OAuth2Scopes.Guilds],
        },
        prefix: CONFIG.API_PREFIX,
        origin: CONFIG.API_ORIGIN,
        listenOptions: {
          port: CONFIG.API_PORT,
        },
      },
      i18n: {
        defaultLanguageDirectory: join(dirname(fileURLToPath(import.meta.url)), '..', 'languages'),
        defaultMissingKey: 'Missing translation: {{key}}',
        defaultNS: 'common',
        i18next: (_: string[], languages: string[]) => ({
          supportedLngs: languages,
          preload: languages,
          returnObjects: true,
          returnEmptyString: false,
          returnNull: false,
          load: 'all',
          lng: 'en-US',
          fallbackLng: 'en-US',
          defaultNS: 'common',
          interpolation: {
            escapeValue: false,
          },
        }),
        fetchLanguage: async (context: InternationalizationContext) => {
          // Get language from database for guilds
          if (context.guild) {
            return await getGuildLanguage(context.guild.id);
          }
          return 'en-US';
        },
      },
    } as ClientOptions);

    // Initialize Prisma Client with pg adapter
    const adapter = new PrismaPg({
      connectionString: CONFIG.DATABASE_URL,
    });
    container.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });

    // Initialize Redis Client in container
    container.redis = new Redis({
      host: CONFIG.REDIS_HOST,
      port: CONFIG.REDIS_PORT,
      password: CONFIG.REDIS_PASSWORD,
      db: CONFIG.REDIS_DB,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    // Connect to Redis
    container.redis.connect().catch((error) => {
      console.error('Failed to connect to Redis:', error);
    });

    // Redis event listeners
    container.redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    container.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });

    container.redis.on('reconnecting', () => {
      console.log('Reconnecting to Redis...');
    });
  }

  public override async login(token?: string): Promise<string> {
    return super.login(token);
  }

  public override async destroy(): Promise<void> {
    await container.prisma.$disconnect();
    await container.redis.quit();
    return super.destroy();
  }
}
