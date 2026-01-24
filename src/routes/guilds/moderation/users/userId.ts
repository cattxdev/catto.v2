import { Route } from '@sapphire/plugin-api';
import { ModAction } from '@prisma/client';
import { parseModAction } from '#lib/validation/modAction.js';

export class ModerationUserCasesRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/moderation/users/[userId]',
      methods: ['GET'],
    });
  }

  public async run(request: Route.Request, response: Route.Response) {
    const { guildId, userId } = request.params;

    if (!guildId || !userId) {
      return response.status(400).json({
        error: 'Guild ID and user ID are required',
      });
    }

    // Verify guild exists in cache
    const discordGuild = this.container.client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return response.status(404).json({
        error: 'Guild not found or bot is not in the guild',
      });
    }

    return this.handleGet(guildId, userId, request, response);
  }

  private async handleGet(
    guildId: string,
    userId: string,
    request: Route.Request,
    response: Route.Response
  ) {
    try {
      // Parse query parameters for pagination
      const page = parseInt((request.query?.page as string) ?? '1') || 1;
      const limit = Math.min(parseInt((request.query?.limit as string) ?? '50') || 50, 100);
      const actionStr = request.query?.action as string | undefined;

      const skip = (page - 1) * limit;

      // Validate and convert action string to enum
      const action = actionStr ? parseModAction(actionStr.toUpperCase()) : undefined;

      // Build where clause
      const where: {
        guildId: string;
        targetId: string;
        action?: ModAction;
      } = {
        guildId,
        targetId: userId,
      };

      if (action) where.action = action;

      // Get total count
      const total = await this.container.prisma.modCase.count({ where });

      // Get cases
      const cases = await this.container.prisma.modCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get statistics
      const stats = await this.container.prisma.modCase.groupBy({
        by: ['action'],
        where: {
          guildId,
          targetId: userId,
        },
        _count: {
          action: true,
        },
      });

      const actionCounts = stats.reduce(
        (acc, stat) => {
          acc[stat.action] = stat._count.action;
          return acc;
        },
        {} as Record<string, number>
      );

      const muteCount =
        (actionCounts.MUTE_TEXT ?? 0) +
        (actionCounts.MUTE_VOICE ?? 0) +
        (actionCounts.MUTE_BOTH ?? 0);
      const unmuteCount =
        (actionCounts.UNMUTE_TEXT ?? 0) +
        (actionCounts.UNMUTE_VOICE ?? 0) +
        (actionCounts.UNMUTE_BOTH ?? 0);

      return response.json({
        userId,
        guildId,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statistics: {
          total,
          bans: actionCounts.BAN ?? 0,
          kicks: actionCounts.KICK ?? 0,
          timeouts: actionCounts.TIMEOUT ?? 0,
          warns: actionCounts.WARN ?? 0,
          unbans: actionCounts.UNBAN ?? 0,
          mutes: muteCount,
          unmutes: unmuteCount,
        },
        cases,
      });
    } catch (error) {
      this.container.logger.error('Error fetching user moderation cases:', error);
      return response.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}
