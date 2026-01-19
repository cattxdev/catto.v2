/**
 * Service for managing temporary voice channels
 */

import { PrismaClient } from '@prisma/client';
import type { Guild, GuildMember, VoiceChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import type {
	TempVoiceChannel,
	CreateTempChannelData,
	UpdateTempChannelData,
	TempVoiceChannelWithMembers,
} from '../models/temp-channel.model';
import type { TempVoiceConfig } from '../models/config.model';
import { PermissionsService } from './permissions.service';
import { TempVoiceConfigService } from './config.service';

export class TempChannelService {
	constructor(
		private prisma: PrismaClient,
		private configService: TempVoiceConfigService,
		private permissionsService: PermissionsService
	) {}

	/**
	 * Create a new temporary voice channel
	 * TODO: Implement full creation logic with Discord API calls
	 */
	async createChannel(
		guild: Guild,
		owner: GuildMember,
		config: TempVoiceConfig,
		sourceChannelId: string
	): Promise<VoiceChannel> {
		// TODO: Implement in Phase 1
		throw new Error('Not implemented');
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
