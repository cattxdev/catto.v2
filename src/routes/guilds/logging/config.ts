import { Route } from '@sapphire/plugin-api';

export class LoggingConfigRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/logging/config',
      methods: ['GET', 'PATCH'],
    });
  }

  public async run(request: Route.Request, response: Route.Response) {
    const { guildId } = request.params;

    if (!guildId) {
      return response.status(400).json({
        error: 'Guild ID is required',
      });
    }

    // Verify guild exists in cache
    const guild = this.container.client.guilds.cache.get(guildId);
    if (!guild) {
      return response.status(404).json({
        error: 'Guild not found or bot is not in the guild',
      });
    }

    if (request.method === 'GET') {
      return this.handleGet(guildId, response);
    } else if (request.method === 'PATCH') {
      return this.handlePatch(guildId, request, response);
    }

    return response.status(405).json({ error: 'Method not allowed' });
  }

  private async handleGet(guildId: string, response: Route.Response) {
    try {
      const config = await this.container.prisma.logConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        return response.json({
          guildId,
          enabled: false,
          setup: false,
        });
      }

      return response.json({
        guildId,
        enabled: config.enabled,
        setup: true,
        categoryId: config.categoryId,
        channels: {
          messages: !!config.messagesWebhook,
          voice: !!config.voiceWebhook,
          voiceState: !!config.voiceStateWebhook,
          tickets: !!config.ticketsWebhook,
          transcripts: !!config.transcriptsWebhook,
          roles: !!config.rolesWebhook,
          channels: !!config.channelsWebhook,
          members: !!config.membersWebhook,
          stage: !!config.stageWebhook,
          events: !!config.eventsWebhook,
          polls: !!config.pollsWebhook,
          emojis: !!config.emojisWebhook,
          stickers: !!config.stickersWebhook,
          webhooks: !!config.webhooksWebhook,
          joins: !!config.joinsWebhook,
          leaves: !!config.leavesWebhook,
          server: !!config.serverWebhook,
        },
      });
    } catch (error) {
      this.container.logger.error('Error fetching logging config:', error);
      return response.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  private async handlePatch(guildId: string, request: Route.Request, response: Route.Response) {
    try {
      const body = (request as Route.Request & { body?: unknown }).body as
        | {
            enabled?: boolean;
          }
        | undefined;

      if (!body) {
        return response.status(400).json({
          error: 'Request body is required',
        });
      }

      // Check if config exists
      const existingConfig = await this.container.prisma.logConfig.findUnique({
        where: { guildId },
      });

      if (!existingConfig) {
        return response.status(404).json({
          error: 'Logging system not set up. Use POST /guilds/:guildId/logging/setup first',
        });
      }

      // Update config
      const config = await this.container.prisma.logConfig.update({
        where: { guildId },
        data: {
          ...(body.enabled !== undefined && { enabled: body.enabled }),
          updatedAt: new Date(),
        },
      });

      return response.json({
        success: true,
        enabled: config.enabled,
      });
    } catch (error) {
      this.container.logger.error('Error updating logging config:', error);
      return response.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}
