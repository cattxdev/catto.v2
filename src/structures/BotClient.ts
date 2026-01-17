import { SapphireClient, LogLevel } from '@sapphire/framework';
import { GatewayIntentBits, Partials, type ClientOptions } from 'discord.js';
import { OAuth2Scopes } from 'discord-api-types/v10';
import { CONFIG } from '#config';

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
    } as ClientOptions);
  }

  public override async login(token?: string): Promise<string> {
    return super.login(token);
  }

  public override async destroy(): Promise<void> {
    return super.destroy();
  }
}
