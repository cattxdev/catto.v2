/**
 * Service for managing temporary voice channels
 */

import { PrismaClient, TempVoiceChannel } from '@prisma/client';
import type { Guild, GuildMember, VoiceChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import type {
	UpdateTempChannelData,
} from '../models/temp-channel.model';
import type { TempVoiceConfig } from '../models/config.model';
import { PermissionsService } from './permissions.service';
import { generateChannelName } from '../utils/naming.util';
import { findSuitableCategory } from '../utils/fallback.util';

export class TempChannelService {
	constructor(
		private prisma: PrismaClient,

		private permissionsService: PermissionsService
	) { }

	/**
	 * Create a new temporary voice channel
	 */
	async createChannel(
		guild: Guild,
		owner: GuildMember,
		config: TempVoiceConfig,
		sourceChannelId: string
	): Promise<VoiceChannel> {
		// Find suitable category
		const categoryResult = await findSuitableCategory(
			guild,
			config.categoryId,
			config.fallbackCategoryId
		);

		if (!categoryResult.category && categoryResult.strategy === 'none') {
			throw new Error('No suitable category available for temp channel creation');
		}

		// Get current channel count for naming
		const existingCount = await this.prisma.tempVoiceChannel.count({
			where: { guildId: guild.id },
		});

		// Generate channel name
		const channelName = generateChannelName(
			config.defaultNameTemplate,
			owner,
			existingCount + 1
		);

		// Build permission overwrites
		const overwrites = this.permissionsService.buildOverwrites({
			ownerId: owner.id,
			guildId: guild.id,
			isLocked: config.defaultLocked,
			isHidden: config.defaultHidden,
			allowedUserIds: [],
			deniedUserIds: [],
		});

		// Create the voice channel
		let channel: VoiceChannel;
		try {
			// Calculate max bitrate based on guild boost level
			const maxBitrate = guild.maximumBitrate || 64000; // Default to 64kbps if unavailable
			const requestedBitrate = config.defaultBitrate ? config.defaultBitrate * 1000 : undefined;
			const bitrate = requestedBitrate ? Math.min(requestedBitrate, maxBitrate) : undefined;

			channel = await guild.channels.create({
				name: channelName,
				type: ChannelType.GuildVoice,
				parent: categoryResult.category?.id || null,
				userLimit: config.defaultUserLimit || 0,
				bitrate,
				rtcRegion: config.defaultRegion || undefined,
				permissionOverwrites: overwrites,
				reason: `Temp voice channel for ${owner.user.tag}`,
			});
		} catch (error: any) {
			// Handle Discord API errors
			if (error.code === 50013) {
				throw new Error('Bot missing permissions to create channels');
			}
			if (error.code === 30013) {
				throw new Error('Maximum number of channels reached');
			}
			throw error;
		}

		// Store in database
		await this.prisma.tempVoiceChannel.create({
			data: {
				guildId: guild.id,
				channelId: channel.id,
				ownerId: owner.id,
				createdByJoinChannelId: sourceChannelId,
				isLocked: config.defaultLocked,
				isHidden: config.defaultHidden,
				metadata: {
					creationAttempts: 1,
					categoryStrategy: categoryResult.strategy,
				},
			},
		});

		return channel;
	}

	/**
	 * Get a temp voice channel by channel ID
	 */
	async getByChannelId(channelId: string): Promise<TempVoiceChannel | null> {
		const channel = await this.prisma.tempVoiceChannel.findUnique({
			where: { channelId },
		});

		return channel ? this.mapToModel(channel) : null;
	}

	/**
	 * Get all temp channels for a guild
	 */
	async getByGuildId(guildId: string): Promise<TempVoiceChannel[]> {
		const channels = await this.prisma.tempVoiceChannel.findMany({
			where: { guildId },
			orderBy: { createdAt: 'desc' },
		});

		return channels.map((c) => this.mapToModel(c));
	}

	/**
	 * Get temp channels owned by a user
	 */
	async getByOwnerId(
		guildId: string,
		ownerId: string
	): Promise<TempVoiceChannel[]> {
		const channels = await this.prisma.tempVoiceChannel.findMany({
			where: { guildId, ownerId },
			orderBy: { createdAt: 'desc' },
		});

		return channels.map((c) => this.mapToModel(c));
	}

	/**
	 * Count active channels for a user in a guild
	 */
	async countUserChannels(guildId: string, ownerId: string): Promise<number> {
		return this.prisma.tempVoiceChannel.count({
			where: { guildId, ownerId },
		});
	}

	/**
	 * Update a temp voice channel
	 */
	async update(
		channelId: string,
		data: UpdateTempChannelData
	): Promise<TempVoiceChannel> {
		const updated = await this.prisma.tempVoiceChannel.update({
			where: { channelId },
			data,
		});

		return this.mapToModel(updated);
	}

	/**
	 * Delete a temp voice channel record
	 */
	async delete(channelId: string): Promise<void> {
		await this.prisma.tempVoiceChannel.delete({
			where: { channelId },
		});
	}

	/**
	 * Update last active timestamp
	 */
	async updateLastActive(channelId: string): Promise<void> {
		await this.prisma.tempVoiceChannel.update({
			where: { channelId },
			data: { lastActiveAt: new Date() },
		});
	}

	/**
	 * Get all temp channels for a guild
	 */
	static async getGuildTempChannels(guildId: string) {
		const { database } = require('#lib/database');
		const channels = await database.tempVoiceChannel.findMany({
			where: { guildId },
			orderBy: { createdAt: 'desc' },
		});

		return channels.map((channel: any) => ({
			channelId: channel.channelId,
			guildId: channel.guildId,
			ownerId: channel.ownerId,
			createdAt: channel.createdAt,
			lastActiveAt: channel.lastActiveAt,
		}));
	}

	/**
	 * Map Prisma model to TypeScript interface
	 */
	private mapToModel(data: any): TempVoiceChannel {
		return {
			...data,
			allowedUserIds: Array.isArray(data.allowedUserIds)
				? data.allowedUserIds
				: [],
			deniedUserIds: Array.isArray(data.deniedUserIds) ? data.deniedUserIds : [],
			metadata: typeof data.metadata === 'object' ? data.metadata : {},
		};
	}
}
