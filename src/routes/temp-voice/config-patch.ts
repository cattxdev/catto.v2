/**
 * PATCH /api/guilds/:guildId/temp-voice/config
 * Update existing Temp Voice configuration for a guild
 */

import { Route } from '@sapphire/plugin-api';
import { TempVoiceConfigServiceStatic as TempVoiceConfigService } from '#modules/temp-voice/services/config-api.service';
import { tempVoiceConfigSchema } from '#modules/temp-voice/validation/config.schema';
import { RouteRequestWithBody } from '#root/lib/route-types';


export class TempVoiceConfigPatchRoute extends Route {
	public constructor(context: Route.LoaderContext, options: Route.Options) {
		super(context, {
			...options,
			route: 'guilds/:guildId/temp-voice/config',
		});
	}

	public run(request: Route.Request, response: Route.Response) {
		return this.handlePatch(request as RouteRequestWithBody, response);
	}

	private async handlePatch(request: RouteRequestWithBody, response: Route.Response) {
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

			// Check if config exists
			const existingConfig = await TempVoiceConfigService.getConfig(guildId);
			if (!existingConfig) {
				return response.status(404).json({
					success: false,
					error: {
						code: 'CONFIG_NOT_FOUND',
						message: 'Temp Voice configuration not found for this guild',
					},
					data: {
						guildId,
						suggestion: 'Use POST /api/guilds/:guildId/temp-voice/config to create a new configuration',
					},
				});
			}

			// Validate request body (partial schema for PATCH)
			const validationResult = tempVoiceConfigSchema.partial().safeParse(request.body);

			if (!validationResult.success) {
				return response.status(400).json({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid configuration data',
						details: validationResult.error.issues.map((err) => ({
							field: err.path.join('.'),
							message: err.message,
						})),
					},
				});
			}

			const updates = validationResult.data;

			// Get guild for validation
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

			// Validate join channel IDs if being updated
			if (updates.joinChannelIds) {
				for (const channelId of updates.joinChannelIds) {
					const channel = guild.channels.cache.get(channelId);
					if (!channel) {
						return response.status(400).json({
							success: false,
							error: {
								code: 'CHANNEL_NOT_FOUND',
								message: `Join-to-create channel ${channelId} not found in guild`,
							},
						});
					}

					if (!channel.isVoiceBased()) {
						return response.status(400).json({
							success: false,
							error: {
								code: 'INVALID_CHANNEL_TYPE',
								message: `Channel ${channelId} is not a voice channel`,
							},
						});
					}
				}
			}

			// Validate default category if being updated
			if (updates.defaultCategoryId) {
				const category = guild.channels.cache.get(updates.defaultCategoryId);
				if (!category) {
					return response.status(400).json({
						success: false,
						error: {
							code: 'CATEGORY_NOT_FOUND',
							message: `Default category ${updates.defaultCategoryId} not found in guild`,
						},
					});
				}

				if (category.type !== 4) { // CategoryChannel
					return response.status(400).json({
						success: false,
						error: {
							code: 'INVALID_CATEGORY',
							message: `Channel ${updates.defaultCategoryId} is not a category`,
						},
					});
				}
			}

			// Validate log channel if being updated
			if (updates.logChannelId) {
				const logChannel = guild.channels.cache.get(updates.logChannelId);
				if (!logChannel) {
					return response.status(400).json({
						success: false,
						error: {
							code: 'LOG_CHANNEL_NOT_FOUND',
							message: `Log channel ${updates.logChannelId} not found in guild`,
						},
					});
				}

				if (!logChannel.isTextBased()) {
					return response.status(400).json({
						success: false,
						error: {
							code: 'INVALID_LOG_CHANNEL',
							message: `Channel ${updates.logChannelId} is not a text channel`,
						},
					});
				}
			}

			// Update configuration
			const config = await TempVoiceConfigService.updateConfig(guildId, updates);

			this.container.logger.info(`[TempVoice API] Updated config for guild ${guildId}`);

			return response.json({
				success: true,
				message: 'Temp Voice configuration updated successfully',
				data: {
					guildId: config.guildId,
					enabled: config.enabled,
					joinChannelIds: config.joinChannelIds,
					namingScheme: config.namingScheme,
					customNamingPattern: config.customNamingPattern,
					userLimit: config.userLimit,
					bitrate: config.bitrate,
					defaultCategoryId: config.defaultCategoryId,
					autoDeleteEmpty: config.autoDeleteEmpty,
					deleteEmptyAfterMs: config.deleteEmptyAfterMs,
					autoDeleteOwnerLeave: config.autoDeleteOwnerLeave,
					deleteOwnerLeaveAfterMs: config.deleteOwnerLeaveAfterMs,
					allowOwnerTransfer: config.allowOwnerTransfer,
					allowOwnerManagement: config.allowOwnerManagement,
					maxChannelsPerUser: config.maxChannelsPerUser,
					logChannelId: config.logChannelId,
					createdAt: config.createdAt,
					updatedAt: config.updatedAt,
				},
			});
		} catch (error) {
			this.container.logger.error('[TempVoice API] Error updating config:', error);

			return response.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_SERVER_ERROR',
					message: 'An error occurred while updating the configuration',
				},
			});
		}
	}
}
