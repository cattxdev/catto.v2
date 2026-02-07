/**
 * GET /api/guilds/[guildId]/temp-voice/moderation/patterns
 * Retrieve global moderation patterns
 */

import { Route } from '@sapphire/plugin-api';
import type { Prisma } from '@prisma/client';

export class TempVoiceModerationPatternsGetRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/temp-voice/moderation/patterns',
      methods: ['GET'],
    });
  }

  public run(request: Route.Request, response: Route.Response) {
    return this.handleGet(request, response);
  }

  private async handleGet(request: Route.Request, response: Route.Response) {
    try {
      const guildId = request.params.guildId;

      if (!guildId) {
        return response.status(400).json({
          success: false,
          error: {
            code: 'MISSING_GUILD_ID',
            message: 'Guild ID is required',
          },
        });
      }

      // Parse query parameters
      const patternType = request.query.patternType as string | undefined;
      const enabled =
        request.query.enabled === 'true'
          ? true
          : request.query.enabled === 'false'
            ? false
            : undefined;
      const limit = request.query.limit ? parseInt(request.query.limit as string, 10) : 100;

      // Build where clause (global patterns only)
      const where: Prisma.TempVoiceModerationPatternWhereInput = {};
      if (patternType) where.patternType = patternType;
      if (enabled !== undefined) where.enabled = enabled;

      // Get patterns from database
      const patterns = await this.container.prisma.tempVoiceModerationPattern.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return response.json({
        success: true,
        data: {
          patterns: patterns.map((p) => ({
            id: p.id,
            pattern: p.pattern,
            patternType: p.patternType,
            description: p.description,
            severity: p.severity,
            enabled: p.enabled,
            caseInsensitive: p.caseInsensitive,
            matchCount: p.matchCount,
            lastMatchedAt: p.lastMatchedAt,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
          total: patterns.length,
        },
      });
    } catch (error) {
      this.container.logger.error('[Moderation API] Error fetching patterns:', error);

      return response.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch patterns',
        },
      });
    }
  }
}
