import { Route } from '@sapphire/plugin-api';
<<<<<<< HEAD
import { ChannelType, PermissionFlagsBits, type TextChannel } from 'discord.js';
=======
import { 
	ChannelType, 
	PermissionFlagsBits, 
	type TextChannel
} from 'discord.js';
import { LOG_CHANNEL_DEFINITIONS } from '#lib/constants/logging.constants';
import type { LogSetupRequest, LogSetupResponse } from '#lib/types/logging.types';
>>>>>>> 40e892d (feat(logging): add log type toggles and enhance logging setup functionality (#23))

export class LoggingSetupRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/logging/setup',
      methods: ['POST'],
    });
  }

  public async run(request: Route.Request, response: Route.Response) {
    const { guildId } = request.params;

    if (!guildId) {
      return response.status(400).json({
        error: 'Guild ID is required',
      });
    }

<<<<<<< HEAD
    // Verify guild exists in cache
    const guild = this.container.client.guilds.cache.get(guildId);
    if (!guild) {
      return response.status(404).json({
        error: 'Guild not found or bot is not in the guild',
      });
    }
=======
		// Parse request body
		const body = (await request.readBodyJson()) as LogSetupRequest;
		const enabledTypes = body?.enabledTypes || [];
		const categoryName = body.categoryName || '📋 Admin Logs';

		// Validate enabled types
		if (!Array.isArray(enabledTypes) || enabledTypes.length === 0) {
			return response.status(400).json({
				error: 'At least one log type must be enabled',
				availableTypes: Object.keys(LOG_CHANNEL_DEFINITIONS)
			});
		}

		// Verify all enabled types are valid
		const invalidTypes = enabledTypes.filter(
			type => !LOG_CHANNEL_DEFINITIONS[type as keyof typeof LOG_CHANNEL_DEFINITIONS]
		);

		if (invalidTypes.length > 0) {
			return response.status(400).json({
				error: `Invalid log types: ${invalidTypes.join(', ')}`,
				availableTypes: Object.keys(LOG_CHANNEL_DEFINITIONS)
			});
		}

		// Verify guild exists
		const guild = this.container.client.guilds.cache.get(guildId);
		if (!guild) {
			return response.status(404).json({
				error: 'Guild not found or bot is not in the guild'
			});
		}
>>>>>>> 40e892d (feat(logging): add log type toggles and enhance logging setup functionality (#23))

    // Check bot permissions
    const botMember = guild.members.me;
    if (!botMember) {
      return response.status(500).json({
        error: 'Bot member not found',
      });
    }

    const requiredPermissions = [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageWebhooks,
    ];

    const missingPermissions = requiredPermissions.filter(
      (perm) => !botMember.permissions.has(perm)
    );

    if (missingPermissions.length > 0) {
      return response.status(403).json({
        error: 'Bot is missing required permissions: Manage Channels, Manage Webhooks',
      });
    }

<<<<<<< HEAD
    try {
      // Create the category
      const category = await guild.channels.create({
        name: '📋 Logs Admin',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: botMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageWebhooks,
            ],
          },
        ],
      });

      // Define all log channels
      const logChannels = [
        { name: 'logs-mensajes', type: 'messagesWebhook' },
        { name: 'logs-voz', type: 'voiceWebhook' },
        { name: 'logs-estado-voz', type: 'voiceStateWebhook' },
        { name: 'logs-tickets', type: 'ticketsWebhook' },
        { name: 'logs-transcripts', type: 'transcriptsWebhook' },
        { name: 'logs-roles', type: 'rolesWebhook' },
        { name: 'logs-canales', type: 'channelsWebhook' },
        { name: 'logs-miembros', type: 'membersWebhook' },
        { name: 'logs-escenario', type: 'stageWebhook' },
        { name: 'logs-eventos', type: 'eventsWebhook' },
        { name: 'logs-encuestas', type: 'pollsWebhook' },
        { name: 'logs-emojis', type: 'emojisWebhook' },
        { name: 'logs-stickers', type: 'stickersWebhook' },
        { name: 'logs-webhooks', type: 'webhooksWebhook' },
        { name: 'logs-entradas', type: 'joinsWebhook' },
        { name: 'logs-salidas', type: 'leavesWebhook' },
        { name: 'logs-servidor', type: 'serverWebhook' },
      ];

      const webhookUrls: Record<string, string> = {};

      // Create channels and webhooks
      for (const logChannel of logChannels) {
        // Create channel
        const channel = (await guild.channels.create({
          name: logChannel.name,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: botMember.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageWebhooks,
              ],
            },
          ],
        })) as TextChannel;

<<<<<<< HEAD
        // Create webhook
        const webhook = await channel.createWebhook({
          name: 'Catto Logs',
          avatar: botMember.user.displayAvatarURL(),
          reason: 'Logging system setup',
        });
=======
				// Create webhook
				const webhook = await channel.createWebhook({
					name: botMember.user.username + ' Logs',
					avatar: botMember.user.displayAvatarURL(),
					reason: 'Logging system setup'
				});
>>>>>>> 4fb6ebb (feat(temp-voice): add user preferences and customization toggle for t… (#17))

        webhookUrls[logChannel.type] = webhook.url;

        // Add a small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Save to database
      await this.container.prisma.logConfig.upsert({
        where: { guildId },
        update: {
          categoryId: category.id,
          enabled: true,
          messagesWebhook: webhookUrls.messagesWebhook,
          voiceWebhook: webhookUrls.voiceWebhook,
          voiceStateWebhook: webhookUrls.voiceStateWebhook,
          ticketsWebhook: webhookUrls.ticketsWebhook,
          transcriptsWebhook: webhookUrls.transcriptsWebhook,
          rolesWebhook: webhookUrls.rolesWebhook,
          channelsWebhook: webhookUrls.channelsWebhook,
          membersWebhook: webhookUrls.membersWebhook,
          stageWebhook: webhookUrls.stageWebhook,
          eventsWebhook: webhookUrls.eventsWebhook,
          pollsWebhook: webhookUrls.pollsWebhook,
          emojisWebhook: webhookUrls.emojisWebhook,
          stickersWebhook: webhookUrls.stickersWebhook,
          webhooksWebhook: webhookUrls.webhooksWebhook,
          joinsWebhook: webhookUrls.joinsWebhook,
          leavesWebhook: webhookUrls.leavesWebhook,
          serverWebhook: webhookUrls.serverWebhook,
          updatedAt: new Date(),
        },
        create: {
          guildId,
          categoryId: category.id,
          enabled: true,
          messagesWebhook: webhookUrls.messagesWebhook,
          voiceWebhook: webhookUrls.voiceWebhook,
          voiceStateWebhook: webhookUrls.voiceStateWebhook,
          ticketsWebhook: webhookUrls.ticketsWebhook,
          transcriptsWebhook: webhookUrls.transcriptsWebhook,
          rolesWebhook: webhookUrls.rolesWebhook,
          channelsWebhook: webhookUrls.channelsWebhook,
          membersWebhook: webhookUrls.membersWebhook,
          stageWebhook: webhookUrls.stageWebhook,
          eventsWebhook: webhookUrls.eventsWebhook,
          pollsWebhook: webhookUrls.pollsWebhook,
          emojisWebhook: webhookUrls.emojisWebhook,
          stickersWebhook: webhookUrls.stickersWebhook,
          webhooksWebhook: webhookUrls.webhooksWebhook,
          joinsWebhook: webhookUrls.joinsWebhook,
          leavesWebhook: webhookUrls.leavesWebhook,
          serverWebhook: webhookUrls.serverWebhook,
        },
      });

      return response.json({
        success: true,
        message: 'Logging system setup successfully',
        categoryId: category.id,
        channelsCreated: logChannels.length,
      });
    } catch (error) {
      this.container.logger.error('Error setting up logging system:', error);
      return response.status(500).json({
        error: 'Failed to set up logging system',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
=======
		try {
			// Create or get the category
			const category = await guild.channels.create({
				name: categoryName,
				type: ChannelType.GuildCategory,
				permissionOverwrites: [
					{
						id: guild.id,
						deny: [PermissionFlagsBits.ViewChannel]
					},
					{
						id: botMember.id,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.ManageChannels,
							PermissionFlagsBits.ManageWebhooks
						]
					}
				]
			});

			const webhookUrls: Record<string, string> = {};
			const enabledFields: Record<string, boolean> = {};
			const errors: string[] = [];
			let channelsCreated = 0;

			// Create channels only for enabled types
			for (const typeKey of enabledTypes) {
				const definition = LOG_CHANNEL_DEFINITIONS[typeKey as keyof typeof LOG_CHANNEL_DEFINITIONS];
				if (!definition) continue;

				try {
					// Create channel
					const channel = await guild.channels.create({
						name: definition.name,
						type: ChannelType.GuildText,
						parent: category.id,
						topic: definition.description,
						permissionOverwrites: [
							{
								id: guild.id,
								deny: [PermissionFlagsBits.ViewChannel]
							},
							{
								id: botMember.id,
								allow: [
									PermissionFlagsBits.ViewChannel,
									PermissionFlagsBits.SendMessages,
									PermissionFlagsBits.ManageWebhooks
								]
							}
						]
					}) as TextChannel;

					// Create webhook
					const webhook = await channel.createWebhook({
						name: `${botMember.user.username} Logs`,
						avatar: botMember.user.displayAvatarURL(),
						reason: 'Logging system setup'
					});

					webhookUrls[definition.webhookField] = webhook.url;
					enabledFields[definition.enabledField] = true;
					channelsCreated++;

					// Add a small delay to avoid rate limits
					await new Promise(resolve => setTimeout(resolve, 300));
				} catch (error) {
					this.container.logger.error(`Failed to create channel for ${typeKey}:`, error);
					errors.push(`Failed to create ${definition.name}`);
				}
			}

			// Prepare database update
			const updateData: any = {
				categoryId: category.id,
				enabled: true,
				updatedAt: new Date(),
				...webhookUrls,
				...enabledFields
			};

			// Save to database
			await this.container.prisma.logConfig.upsert({
				where: { guildId },
				update: updateData,
				create: {
					guildId,
					...updateData
				}
			});

			const responseData: LogSetupResponse = {
				success: true,
				message: 'Logging system setup successfully',
				categoryId: category.id,
				channelsCreated,
				enabledTypes
			};

			if (errors.length > 0) {
				responseData.errors = errors;
			}

			return response.json(responseData);
		} catch (error) {
			this.container.logger.error('Error setting up logging system:', error);
			return response.status(500).json({
				error: 'Failed to set up logging system',
				details: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
>>>>>>> 40e892d (feat(logging): add log type toggles and enhance logging setup functionality (#23))
}
