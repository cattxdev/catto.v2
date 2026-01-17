import { SapphireClient, LogLevel, container } from '@sapphire/framework';
import { GatewayIntentBits, Partials, type ClientOptions } from 'discord.js';
import { OAuth2Scopes } from 'discord-api-types/v10';
import { CONFIG } from '#config';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InternationalizationContext } from '@sapphire/plugin-i18next';
import { getGuildLanguage } from '#lib/i18n.js';
import { PrismaClient } from '../generated/prisma/index.js';

// Augment container with Prisma
declare module '@sapphire/framework' {
  interface Container {
    prisma: PrismaClient;
  }
}

export class BotClient extends SapphireClient {
  public constructor() {
    super({
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
        level: (CONFIG.NODE_ENV === 'development' ? LogLevel.Debug : LogLevel.Info),
      },
      defaultPrefix: CONFIG.DEFAULT_PREFIX,
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
            escapeValue: false
          }
        }),
        fetchLanguage: async (context: InternationalizationContext) => {
          // Get language from database for guilds
          if (context.guild) {
            return await getGuildLanguage(context.guild.id);
          }
          return 'en-US';
        }
      }
    } as ClientOptions);

    // Initialize Prisma Client in container
    container.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'pretty',
    });
  }

  public override async login(token?: string): Promise<string> {
    return super.login(token);
  }

  public override async destroy(): Promise<void> {
    await container.prisma.$disconnect();
    return super.destroy();
  }
}
