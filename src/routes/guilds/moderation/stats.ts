import { Route } from '@sapphire/plugin-api';

export class ModerationStatsRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/moderation/stats',
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
      // Parse query parameters for date range
      const startDate = request.query?.startDate as string | undefined;
      const endDate = request.query?.endDate as string | undefined;

      const dateFilter: {
        guildId: string;
        createdAt?: {
          gte?: Date;
          lte?: Date;
        };
      } = { guildId };

      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.lte = new Date(endDate);
      }

      // Get total cases
      const totalCases = await this.container.prisma.modCase.count({
        where: dateFilter,
      });

      // Get cases by action
      const casesByAction = await this.container.prisma.modCase.groupBy({
        by: ['action'],
        where: dateFilter,
        _count: {
          action: true,
        },
      });

      // Get top moderators
      const topModerators = await this.container.prisma.modCase.groupBy({
        by: ['moderatorId', 'moderatorTag'],
        where: dateFilter,
        _count: {
          moderatorId: true,
        },
        orderBy: {
          _count: {
            moderatorId: 'desc',
          },
        },
        take: 10,
      });

      // Get recent cases
      const recentCases = await this.container.prisma.modCase.findMany({
        where: dateFilter,
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Get active temporary punishments
      const activePunishments = await this.container.prisma.modCase.count({
        where: {
          guildId,
          action: {
            in: ['TIMEOUT', 'MUTE'],
          },
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      // Format action counts
      const actionCounts = casesByAction.reduce(
        (acc, stat) => {
          acc[stat.action] = stat._count.action;
          return acc;
        },
        {} as Record<string, number>
      );

      return response.json({
        guildId,
        totalCases,
        actionCounts: {
          bans: actionCounts.BAN ?? 0,
          kicks: actionCounts.KICK ?? 0,
          timeouts: actionCounts.TIMEOUT ?? 0,
          warns: actionCounts.WARN ?? 0,
          unbans: actionCounts.UNBAN ?? 0,
          mutes: actionCounts.MUTE ?? 0,
          unmutes: actionCounts.UNMUTE ?? 0,
        },
        activePunishments,
        topModerators: topModerators.map((mod) => ({
          id: mod.moderatorId,
          tag: mod.moderatorTag,
          cases: mod._count.moderatorId,
        })),
        recentCases,
      });
    } catch (error) {
      this.container.logger.error('Error fetching moderation stats:', error);
      return response.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}
