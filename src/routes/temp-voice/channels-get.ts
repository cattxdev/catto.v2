/**
 * GET /api/guilds/:guildId/temp-voice/channels
 * List all active temporary voice channels in a guild
 */

import { Route } from '@sapphire/plugin-api';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service';
import { ChannelType } from 'discord.js';

interface TempChannelInfo {
	channelId: string;
	guildId: string;
	ownerId: string;
	createdAt: Date;
	lastActiveAt: Date | null;
}

export class TempVoiceChannelsRoute extends Route {
	public constructor(context: Route.LoaderContext, options: Route.Options) {
		super(context, {
			...options,
			route: 'guilds/:guildId/temp-voice/channels',
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

			// Get all active temp channels for this guild
			const tempChannels = await TempChannelService.getGuildTempChannels(guildId);

			// Get guild to fetch channel details
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

			// Fetch detailed information for each channel
			const channelsWithDetails = await Promise.all(
				tempChannels.map(async (tc: TempChannelInfo) => {
					const channel = guild.channels.cache.get(tc.channelId);
					
					if (!channel || channel.type !== ChannelType.GuildVoice) {
						return {
							channelId: tc.channelId,
							ownerId: tc.ownerId,
							createdAt: tc.createdAt,
							status: 'deleted',
						};
					}

					// Get current members
					const members = channel.members.map((m) => ({
						id: m.id,
						username: m.user.username,
						displayName: m.displayName,
						avatar: m.user.displayAvatarURL(),
					}));

					// Get permissions if available
					let permissions = null;
					try {
						const perms = await PermissionsService.getPermissions(tc.channelId);
						permissions = {
							locked: perms?.locked ?? false,
							hidden: perms?.hidden ?? false,
							allowedUserIds: perms?.allowedUserIds ?? [],
							deniedUserIds: perms?.deniedUserIds ?? [],
						};
					} catch {
						// Permissions not found or error
					}

					return {
						channelId: tc.channelId,
						channelName: channel.name,
						ownerId: tc.ownerId,
						ownerUsername: guild.members.cache.get(tc.ownerId)?.user.username,
						categoryId: channel.parentId,
						categoryName: channel.parent?.name,
						userLimit: channel.userLimit,
						bitrate: channel.bitrate,
						memberCount: channel.members.size,
						members,
						permissions,
						createdAt: tc.createdAt,
						status: 'active',
					};
				})
			);

			// Filter out deleted channels if requested
			const includeDeleted = request.query.includeDeleted === 'true';
			const filteredChannels = includeDeleted
				? channelsWithDetails
				: channelsWithDetails.filter((c) => c.status === 'active');

			return response.json({
				success: true,
				data: {
					guildId,
					totalChannels: filteredChannels.length,
					channels: filteredChannels,
				},
			});
		} catch (error) {
			this.container.logger.error('[TempVoice API] Error listing channels:', error);

			return response.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_SERVER_ERROR',
					message: 'An error occurred while listing temporary channels',
				},
			});
		}
	}
}
