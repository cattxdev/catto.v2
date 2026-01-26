/**
 * POST /api/guilds/[guildId]/temp-voice/validate
 * Validate Temp Voice configuration without saving
 */

import { Route } from '@sapphire/plugin-api';
import { tempVoiceConfigSchema } from '#modules/temp-voice/validation/config.schema';
import { RouteRequestWithBody } from '#root/lib/route-types';

export class TempVoiceValidateRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/temp-voice/validate',
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

      // Validate against schema
      const validationResult = tempVoiceConfigSchema.safeParse(request.body);

      if (!validationResult.success) {
        return response.status(400).json({
          success: false,
          valid: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Configuration validation failed',
            details: validationResult.error.issues.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              value:
                err.code === 'invalid_type'
                  ? undefined
                  : err.path[0] && typeof err.path[0] === 'string'
                    ? (request.body as Record<string, unknown>)?.[err.path[0]]
                    : undefined,
            })),
          },
        });
      }

      const configData = validationResult.data;

      // Get guild for channel validation
      const guild = this.container.client.guilds.cache.get(guildId);
      if (!guild) {
        return response.status(404).json({
          success: false,
          error: {
            code: 'GUILD_NOT_FOUND',
            message: 'Guild not found',
          },
        });
      }

      // Validate join channels
      const channelValidations = [];
      for (const channelId of configData.joinChannelIds) {
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
          channelValidations.push({
            channelId,
            valid: false,
            error: 'Channel not found',
          });
        } else if (!channel.isVoiceBased()) {
          channelValidations.push({
            channelId,
            channelName: channel.name,
            valid: false,
            error: 'Channel is not a voice channel',
          });
        } else {
          channelValidations.push({
            channelId,
            channelName: channel.name,
            valid: true,
          });
        }
      }

      // Validate default category
      let categoryValidation = null;
      if (configData.defaultCategoryId) {
        const category = guild.channels.cache.get(configData.defaultCategoryId);

        if (!category) {
          categoryValidation = {
            categoryId: configData.defaultCategoryId,
            valid: false,
            error: 'Category not found',
          };
        } else if (category.type !== 4) {
          // CategoryChannel
          categoryValidation = {
            categoryId: configData.defaultCategoryId,
            categoryName: category.name,
            valid: false,
            error: 'Channel is not a category',
          };
        } else {
          categoryValidation = {
            categoryId: configData.defaultCategoryId,
            categoryName: category.name,
            valid: true,
          };
        }
      }

      // Validate log channel
      let logChannelValidation = null;
      if (configData.logChannelId) {
        const logChannel = guild.channels.cache.get(configData.logChannelId);

        if (!logChannel) {
          logChannelValidation = {
            channelId: configData.logChannelId,
            valid: false,
            error: 'Log channel not found',
          };
        } else if (!logChannel.isTextBased()) {
          logChannelValidation = {
            channelId: configData.logChannelId,
            channelName: logChannel.name,
            valid: false,
            error: 'Log channel must be a text channel',
          };
        } else {
          logChannelValidation = {
            channelId: configData.logChannelId,
            channelName: logChannel.name,
            valid: true,
          };
        }
      }

      // Check if any validations failed
      const hasErrors =
        channelValidations.some((v) => !v.valid) ||
        (categoryValidation && !categoryValidation.valid) ||
        (logChannelValidation && !logChannelValidation.valid);

      return response.json({
        success: true,
        valid: !hasErrors,
        data: {
          schema: {
            valid: true,
            message: 'Configuration schema is valid',
          },
          joinChannels: {
            count: channelValidations.length,
            validations: channelValidations,
            allValid: channelValidations.every((v) => v.valid),
          },
          ...(categoryValidation && {
            defaultCategory: categoryValidation,
          }),
          ...(logChannelValidation && {
            logChannel: logChannelValidation,
          }),
        },
        message: hasErrors
          ? 'Configuration validation completed with errors'
          : 'Configuration is valid and can be saved',
      });
    } catch (error) {
      this.container.logger.error('[TempVoice API] Error validating config:', error);

      return response.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while validating the configuration',
        },
      });
    }
  }
}
