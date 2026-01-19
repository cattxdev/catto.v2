import { Route } from '@sapphire/plugin-api';

export class ModerationConfigRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/moderation/config',
      methods: ['GET', 'PUT', 'PATCH'],
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
    const discordGuild = this.container.client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return response.status(404).json({
        error: 'Guild not found or bot is not in the guild',
      });
    }

    if (request.method === 'GET') {
      return this.handleGet(guildId, response);
    } else if (request.method === 'PUT' || request.method === 'PATCH') {
      return this.handleUpdate(guildId, request, response);
    }

    return response.status(405).json({ error: 'Method not allowed' });
  }

  private async handleGet(guildId: string, response: Route.Response) {
    try {
      const config = await this.container.prisma.modConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        // Return default config if not set
        return response.json({
          guildId,
          modLogChannelId: null,
          muteRoleId: null,
          autoModEnabled: false,
          createdAt: null,
          updatedAt: null,
        });
      }

      return response.json(config);
    } catch (error) {
      this.container.logger.error('Error fetching moderation config:', error);
      return response.status(500).json({
        error: 'Internal server error',
      });
    }
  }

	private async handleUpdate(guildId: string, request: Route.Request, response: Route.Response) {
		try {
			const body = await this.parseBody(request);

      if (!body) {
        return response.status(400).json({
          error: 'Request body is required',
        });
      }

      // Validate channel exists if provided
      if (body.modLogChannelId) {
        const guild = this.container.client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(body.modLogChannelId);
        if (!channel || !channel.isTextBased()) {
          return response.status(400).json({
            error: 'Invalid channel ID or channel is not text-based',
          });
        }
      }

      // Validate role exists if provided
      if (body.muteRoleId) {
        const guild = this.container.client.guilds.cache.get(guildId);
        const role = guild?.roles.cache.get(body.muteRoleId);
        if (!role) {
          return response.status(400).json({
            error: 'Invalid role ID',
          });
        }
      }

      // Upsert config
      const config = await this.container.prisma.modConfig.upsert({
        where: { guildId },
        update: {
          ...(body.modLogChannelId !== undefined && { modLogChannelId: body.modLogChannelId }),
          ...(body.muteRoleId !== undefined && { muteRoleId: body.muteRoleId }),
          ...(body.autoModEnabled !== undefined && { autoModEnabled: body.autoModEnabled }),
          updatedAt: new Date(),
        },
        create: {
          guildId,
          modLogChannelId: body.modLogChannelId ?? null,
          muteRoleId: body.muteRoleId ?? null,
          autoModEnabled: body.autoModEnabled ?? false,
        },
      });

			return response.json(config);
		} catch (error) {
			this.container.logger.error('Error updating moderation config:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}

	private async parseBody(request: Route.Request): Promise<any> {
		return new Promise((resolve, reject) => {
			let body = '';
			request.on('data', (chunk: Buffer) => {
				body += chunk.toString();
			});
			request.on('end', () => {
				try {
					resolve(body ? JSON.parse(body) : undefined);
				} catch (error) {
					resolve(undefined);
				}
			});
			request.on('error', reject);
		});
	}
}
