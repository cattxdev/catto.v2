/**
 * POST /api/guilds/[guildId]/temp-voice/moderation/test
 * Test name validation without applying changes
 */

import { Route } from '@sapphire/plugin-api';
import { RouteRequestWithBody } from '#root/lib/route-types.js';
import { NameValidationService } from '#modules/temp-voice/services/moderation/name-validation.service.js';

interface TestNameBody {
  name: string;
  strictMode?: boolean;
}

export class TempVoiceModerationTestPostRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/temp-voice/moderation/test',
      methods: ['POST'],
    });
  }

  public run(request: Route.Request, response: Route.Response) {
    return this.handlePost(request as RouteRequestWithBody, response);
  }

  private async handlePost(request: RouteRequestWithBody, response: Route.Response) {
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

      const body = request.body as TestNameBody;

      if (!body.name) {
        return response.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NAME',
            message: 'name field is required',
          },
        });
      }

      // Get config for guild (direct Prisma access for moderation fields)
      const config = await this.container.prisma.tempVoiceConfig.findUnique({
        where: { guildId },
      });

      // Get custom patterns from guild config
      let customPatterns: string[] = [];
      if (config && config.customPatterns) {
        try {
          customPatterns = JSON.parse(config.customPatterns as string) as string[];
        } catch {
          customPatterns = [];
        }
      }

      // Build validation context
      const context = {
        guildId,
        channelId: 'test',
        userId: 'test',
        strictMode: body.strictMode ?? config?.strictMode ?? false,
        allowListEnabled: false,
        customPatterns,
        allowedKeywords: [],
      };

      // Validate name
      const validationService = new NameValidationService();
      const result = await validationService.validate(body.name, context);

      return response.json({
        success: true,
        data: {
          testName: body.name,
          isAllowed: result.isAllowed,
          reasonCodes: result.reasonCodes,
          matchedPatterns: result.matchedPatterns,
          context: {
            strictMode: context.strictMode,
            customPatternCount: customPatterns.length,
          },
        },
      });
    } catch (error) {
      this.container.logger.error('[Moderation API] Error testing name:', error);

      return response.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to test name',
        },
      });
    }
  }
}
