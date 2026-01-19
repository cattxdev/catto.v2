import { Route } from '@sapphire/plugin-api';
import { ModAction } from '@prisma/client';
import { parseModAction } from '#lib/validation/modAction.js';

export class ModerationCasesRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/moderation/cases',
      methods: ['GET'],
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

    return this.handleGet(guildId, request, response);
  }

  private async handleGet(guildId: string, request: Route.Request, response: Route.Response) {
    try {
      // Parse query parameters for pagination and filtering
      const page = parseInt((request.query?.page as string) ?? '1') || 1;
      const limit = Math.min(parseInt((request.query?.limit as string) ?? '50') || 50, 100);
      const actionStr = request.query?.action as string | undefined;
      const targetId = request.query?.targetId as string | undefined;
      const moderatorId = request.query?.moderatorId as string | undefined;

      const skip = (page - 1) * limit;

      // Validate and convert action string to enum
      const action = actionStr ? parseModAction(actionStr.toUpperCase()) : undefined;

      // Build where clause
      const where: {
        guildId: string;
        action?: ModAction;
        targetId?: string;
        moderatorId?: string;
      } = { guildId };

      if (action) where.action = action;
      if (targetId) where.targetId = targetId;
      if (moderatorId) where.moderatorId = moderatorId;

      // Get total count
      const total = await this.container.prisma.modCase.count({ where });

      // Get cases
      const cases = await this.container.prisma.modCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      return response.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        cases,
      });
    } catch (error) {
      this.container.logger.error('Error fetching moderation cases:', error);
      return response.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}
