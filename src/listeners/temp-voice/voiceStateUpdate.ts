/**
 * Listener for voice state updates to handle temp voice channel creation and cleanup
 */

import { Listener } from '@sapphire/framework';
import type { VoiceState } from 'discord.js';
import { Events } from 'discord.js';
import { container } from '@sapphire/framework';
import { TempVoiceConfigService } from '../../modules/temp-voice/services/config.service';
import { TempChannelService } from '../../modules/temp-voice/services/temp-channel.service';
import { CleanupService } from '../../modules/temp-voice/services/cleanup.service';
import { ControlPanelService } from '../../modules/temp-voice/services/control-panel.service';
import { PermissionsService } from '../../modules/temp-voice/services/permissions.service';
import { acquireLock } from '../../lib/redis';
import { REDIS_KEYS } from '../../modules/temp-voice/constants';

export class VoiceStateUpdateListener extends Listener {
	private configService!: TempVoiceConfigService;
	private channelService!: TempChannelService;
	private cleanupService!: CleanupService;
	private controlPanelService!: ControlPanelService;
	private permissionsService!: PermissionsService;

	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, {
			...options,
			event: Events.VoiceStateUpdate,
		});
	}

	public async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
		// Initialize services (lazy initialization)
		if (!this.configService) {
			this.configService = new TempVoiceConfigService(container.prisma);
			this.channelService = new TempChannelService(
				container.prisma,
				this.configService,
				this.permissionsService || new PermissionsService()
			);
			this.cleanupService = new CleanupService(
				container.prisma,
				this.container.client,
				this.channelService,
				this.configService
			);
			this.controlPanelService = new ControlPanelService(
				container.prisma,
				this.container.client,
				this.channelService
			);
			this.permissionsService = new PermissionsService();
		}

		// Handle different voice state changes
		const joinedChannel = !oldState.channelId && newState.channelId;
		const leftChannel = oldState.channelId && !newState.channelId;
		const movedChannel =
			oldState.channelId &&
			newState.channelId &&
			oldState.channelId !== newState.channelId;

		try {
			if (joinedChannel) {
				await this.handleJoin(newState);
			}

			if (leftChannel) {
				await this.handleLeave(oldState);
			}

			if (movedChannel) {
				// Handle as leave from old, join to new
				await this.handleLeave(oldState);
				await this.handleJoin(newState);
			}
		} catch (error) {
			this.container.logger.error(
				`[TempVoice] Error handling voice state update:`,
				error
			);
		}
	}

	/**
	 * Handle user joining a voice channel
	 */
	private async handleJoin(state: VoiceState): Promise<void> {
		if (!state.guild || !state.member || !state.channelId) return;

		// Get config
		const config = await this.configService.getOrNull(state.guild.id);
		if (!config || !config.enabled) return;

		// Check if this is a Join to Create channel
		const isJTC = config.joinToCreateChannels.includes(state.channelId);

		if (isJTC) {
			// User joined a JTC channel - create temp channel
			await this.createTempChannel(state);
		} else {
			// Check if this is a temp channel that was scheduled for deletion
			const tempChannel = await this.channelService.getByChannelId(state.channelId);

			if (tempChannel && tempChannel.deletionScheduledAt) {
				// Cancel deletion - someone joined
				await this.cleanupService.cancelDelete(state.channelId);
				this.container.logger.info(
					`[TempVoice] Cancelled deletion for ${state.channelId} - user rejoined`
				);
			}
		}
	}

	/**
	 * Handle user leaving a voice channel
	 */
	private async handleLeave(state: VoiceState): Promise<void> {
		if (!state.guild || !state.channelId) return;

		// Check if the channel they left is a temp channel
		const tempChannel = await this.channelService.getByChannelId(state.channelId);
		if (!tempChannel) return;

		// Fetch the actual Discord channel to check if it's empty
		const discordChannel = await state.guild.channels
			.fetch(state.channelId)
			.catch(() => null);

		if (!discordChannel || !discordChannel.isVoiceBased()) {
			// Channel doesn't exist anymore - clean up database
			await this.channelService.delete(state.channelId);
			return;
		}

		// Check if channel is now empty
		if (discordChannel.members.size === 0) {
			// Schedule deletion
			await this.cleanupService.scheduleDelete(state.channelId);
			this.container.logger.info(
				`[TempVoice] Scheduled deletion for empty channel ${state.channelId}`
			);
		} else {
			// Channel still has members - update last active time
			await this.channelService.updateLastActive(state.channelId);
		}
	}

	/**
	 * Create a temporary voice channel
	 */
	private async createTempChannel(state: VoiceState): Promise<void> {
		if (!state.guild || !state.member) return;

		const userId = state.member.id;
		const guildId = state.guild.id;

		// Acquire distributed lock to prevent concurrent creation
		const lockKey = `${REDIS_KEYS.CREATE_LOCK}:${userId}:${guildId}`;
		const lock = await acquireLock(lockKey, 5000); // 5 second lock

		if (!lock) {
			this.container.logger.warn(
				`[TempVoice] Failed to acquire lock for user ${userId} - creation already in progress`
			);
			return;
		}

		try {
			// Get config
			const config = await this.configService.get(guildId);

			// Check cooldown
			const cooldownKey = `${REDIS_KEYS.COOLDOWN}:${userId}:${guildId}`;
			const cooldownTTL = await container.redis.ttl(cooldownKey);

			if (cooldownTTL > 0) {
				await state.member.send(
					`⏱️ Please wait ${cooldownTTL} seconds before creating another temp voice channel.`
				).catch(() => {
					// User has DMs disabled
				});
				return;
			}

			// Check user channel limit
			const userChannelCount = await this.channelService.countUserChannels(
				guildId,
				userId
			);

			if (userChannelCount >= config.maxChannelsPerUser) {
				await state.member.send(
					`❌ You have reached the maximum of ${config.maxChannelsPerUser} temporary voice channels.`
				).catch(() => {});
				return;
			}

			// Create the temp channel
			const channel = await this.channelService.createChannel(
				state.guild,
				state.member,
				config,
				state.channelId!
			);

			// Move user to the new channel
			try {
				await state.setChannel(channel);
			} catch (error) {
				this.container.logger.error(
					`[TempVoice] Failed to move user ${userId} to channel ${channel.id}:`,
					error
				);
				// Channel was created but user couldn't be moved - they can join manually
			}

			// Send control panel if enabled
			if (config.controlPanelOnCreate && config.controlPanelEnabled) {
				await this.controlPanelService.send(channel.id, state.member);
			}

			// Set cooldown
			await container.redis.setex(
				cooldownKey,
				config.cooldownSeconds,
				Date.now().toString()
			);

			// Log creation
			this.container.logger.info(
				`[TempVoice] Created temp channel ${channel.id} for user ${userId} in guild ${guildId}`
			);

			// TODO: Log to configured log channel if enabled
		} catch (error) {
			this.container.logger.error(
				`[TempVoice] Error creating temp channel for user ${userId}:`,
				error
			);

			// Notify user of error
			await state.member
				.send(`❌ Failed to create temporary voice channel: ${(error as Error).message}`)
				.catch(() => {});
		} finally {
			// Always release the lock
			await lock.release();
		}
	}
}
