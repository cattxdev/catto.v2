/**
 * Temp Voice Queue Service
 * Manages BullMQ jobs for channel creation and deletion to prevent race conditions and rate limiting
 */

import { Queue, Worker, type Job } from 'bullmq';
import { container } from '@sapphire/framework';
import { CONFIG } from '../../../config';
import { Colors, WebhookClient, EmbedBuilder } from 'discord.js';
import { TempVoiceConfigService } from './config.service';
import { TempChannelService } from './temp-channel.service';
import { ControlPanelService } from './control-panel.service';
import { PermissionsService } from './permissions.service';

interface CreateChannelJobData {
	type: 'create';
	guildId: string;
	userId: string;
	sourceChannelId: string;
	timestamp: number;
}

interface DeleteChannelJobData {
	type: 'delete';
	guildId: string;
	channelId: string;
	reason: string;
	timestamp: number;
}

type TempVoiceJobData = CreateChannelJobData | DeleteChannelJobData;

class TempVoiceQueueService {
	private queue: Queue<TempVoiceJobData>;
	private worker: Worker<TempVoiceJobData>;
	private readonly QUEUE_NAME = 'temp-voice-operations';

	constructor() {
		const connection = {
			host: CONFIG.REDIS_HOST,
			port: CONFIG.REDIS_PORT,
			password: CONFIG.REDIS_PASSWORD,
			db: CONFIG.REDIS_DB
		};

		// Create queue for adding jobs
		this.queue = new Queue<TempVoiceJobData>(this.QUEUE_NAME, {
			connection,
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 2000 // 2s, then 4s, then 8s
				},
				removeOnComplete: {
					age: 1800, // Keep completed jobs for 30 minutes
					count: 500
				},
				removeOnFail: {
					age: 86400 // Keep failed jobs for 24 hours
				}
			}
		});

		// Create worker to process jobs
		this.worker = new Worker<TempVoiceJobData>(
			this.QUEUE_NAME,
			async (job: Job<TempVoiceJobData>) => this.processJob(job),
			{
				connection,
				concurrency: 1, // Process one operation at a time per guild to avoid race conditions
				limiter: {
					max: 10, // Max 10 operations
					duration: 10000 // Per 10 seconds (Discord rate limit friendly)
				}
			}
		);

		// Worker event handlers
		this.worker.on('completed', (job) => {
			container.logger.debug(
				`[TempVoice Queue] Job ${job.id} (${job.data.type}) completed for guild ${job.data.guildId}`
			);
		});

		this.worker.on('failed', (job, err) => {
			container.logger.error(
				`[TempVoice Queue] Job ${job?.id} (${job?.data?.type}) failed:`,
				err
			);
		});

		this.worker.on('error', (err) => {
			container.logger.error('[TempVoice Queue] Worker error:', err);
		});

		this.worker.on('active', (job) => {
			container.logger.info(
				`[TempVoice Queue] Job ${job.id} (${job.data.type}) is now active for guild ${job.data.guildId}`
			);
		});

		container.logger.info('[TempVoice Queue] Service initialized');
	}

	/**
	 * Process a temp voice job
	 */
	private async processJob(job: Job<TempVoiceJobData>): Promise<void> {
		const { data } = job;

		if (data.type === 'create') {
			await this.processCreate(data);
		} else if (data.type === 'delete') {
			await this.processDelete(data);
		}
	}

	/**
	 * Process channel creation
	 */
	private async processCreate(data: CreateChannelJobData): Promise<void> {
		const { guildId, userId, sourceChannelId } = data;

		try {
			const guild = container.client.guilds.cache.get(guildId);
			if (!guild) {
				container.logger.warn(`[TempVoice Queue] Guild ${guildId} not found`);
				return;
			}

			const member = await guild.members.fetch(userId).catch(() => null);
			if (!member) {
				container.logger.warn(`[TempVoice Queue] Member ${userId} not found in guild ${guildId}`);
				return;
			}

			// Get config
			const configService = new TempVoiceConfigService(container.prisma);
			const config = await configService.getOrNull(guildId);
			if (!config || !config.enabled) {
				container.logger.warn(`[TempVoice Queue] Config not found or disabled for guild ${guildId}`);
				return;
			}

			// Create services
			const permissionsService = new PermissionsService();
			const channelService = new TempChannelService(container.prisma, permissionsService);
			const controlPanelService = new ControlPanelService(container.client, channelService);

			// Create the channel
			const channel = await channelService.createChannel(guild, member, config, sourceChannelId);

			// Move user to the new channel
			try {
				const voiceState = member.voice;
				if (voiceState?.channelId) {
					await voiceState.setChannel(channel);
				}
			} catch (error) {
				container.logger.error(
					`[TempVoice Queue] Failed to move user ${userId} to channel ${channel.id}:`,
					error
				);
			}

			// Send control panel if enabled
			if (config.controlPanelOnCreate && config.controlPanelEnabled) {
				await controlPanelService.send(channel.id, member);
			}

			// Log to configured log channel if enabled
			if (config.logWebhook) {
				try {
					const webhook = new WebhookClient({ url: config.logWebhook });
					const embed = new EmbedBuilder()
						.setTitle('🎙️ Temporary Voice Channel Created')
						.setDescription(`${member} created a temporary voice channel`)
						.addFields(
							{ name: 'Channel', value: `${channel.name} (<#${channel.id}>)`, inline: true },
							{ name: 'Owner', value: `${member.user.tag} (${member.id})`, inline: true },
						)
						.setColor(Colors.Green)
						.setTimestamp();
					
					await webhook.send({ embeds: [embed] });
					webhook.destroy();
				} catch (error) {
					container.logger.error('[TempVoice Queue] Failed to send creation log:', error);
				}
			}

			container.logger.info(
				`[TempVoice Queue] Created temp channel ${channel.id} for user ${userId} in guild ${guildId}`
			);
		} catch (error) {
			container.logger.error(
				`[TempVoice Queue] Error creating temp channel for user ${userId}:`,
				error
			);
			throw error; // Re-throw to trigger retry
		}
	}

	/**
	 * Process channel deletion
	 */
	private async processDelete(data: DeleteChannelJobData): Promise<void> {
		const { guildId, channelId, reason } = data;

		container.logger.info(
			`[TempVoice Queue] Processing delete job for channel ${channelId} in guild ${guildId}`
		);

		try {
			const guild = container.client.guilds.cache.get(guildId);
			if (!guild) {
				container.logger.warn(`[TempVoice Queue] Guild ${guildId} not found for deletion`);
				return;
			}

			// Get config for logging
			const configService = new TempVoiceConfigService(container.prisma);
			const config = await configService.getOrNull(guildId);

			// Delete from Discord
			const channel = await guild.channels.fetch(channelId).catch(() => null);
			if (channel) {
				await channel.delete(reason);
			}

			// Delete from database
			const permissionsService = new PermissionsService();
			const channelService = new TempChannelService(container.prisma, permissionsService);
			await channelService.delete(channelId);

			// Log deletion if enabled
			if (config?.logWebhook) {
				try {
					const webhook = new WebhookClient({ url: config.logWebhook });
					const embed = new EmbedBuilder()
						.setTitle('🎙️ Temporary Voice Channel Deleted')
						.setDescription(`Temporary voice channel was deleted`)
						.addFields(
							{ name: 'Channel ID', value: channelId, inline: true },
							{ name: 'Reason', value: reason, inline: true },
						)
						.setColor(Colors.Red)
						.setTimestamp();
					
					await webhook.send({ embeds: [embed] });
					webhook.destroy();
				} catch (error) {
					container.logger.error('[TempVoice Queue] Failed to send deletion log:', error);
				}
			}

			container.logger.info(`[TempVoice Queue] Deleted temp channel ${channelId} - ${reason}`);
		} catch (error) {
			container.logger.error(`[TempVoice Queue] Error deleting channel ${channelId}:`, error);
			// Don't re-throw - channel might already be deleted
		}
	}

	/**
	 * Queue a channel creation job
	 */
	async queueCreate(guildId: string, userId: string, sourceChannelId: string): Promise<void> {
		await this.queue.add(
			'create-channel',
			{
				type: 'create',
				guildId,
				userId,
				sourceChannelId,
				timestamp: Date.now(),
			},
			{
				jobId: `create-${guildId}-${userId}-${Date.now()}`, // Unique job ID
				priority: 1, // High priority for creates
			}
		);

		container.logger.debug(`[TempVoice Queue] Queued create for user ${userId} in guild ${guildId}`);
	}

	/**
	 * Queue a channel deletion job
	 */
	async queueDelete(guildId: string, channelId: string, reason: string, delayMs: number = 0): Promise<void> {
		const jobId = `delete-${guildId}-${channelId}`;
		
		await this.queue.add(
			'delete-channel',
			{
				type: 'delete',
				guildId,
				channelId,
				reason,
				timestamp: Date.now(),
			},
			{
				jobId, // Unique job ID (will replace existing delete for same channel)
				priority: 2, // Lower priority than creates
				delay: delayMs, // Optional delay before deletion
			}
		);

		container.logger.info(
			`[TempVoice Queue] Queued delete for channel ${channelId} in guild ${guildId} (delay: ${delayMs}ms, jobId: ${jobId}, will execute at: ${new Date(Date.now() + delayMs).toISOString()})`
		);
	}

	/**
	 * Cancel a pending deletion job
	 */
	async cancelDelete(guildId: string, channelId: string): Promise<void> {
		const jobId = `delete-${guildId}-${channelId}`;
		const job = await this.queue.getJob(jobId);
		
		if (job) {
			await job.remove();
			container.logger.debug(`[TempVoice Queue] Cancelled delete for channel ${channelId}`);
		}
	}

	/**
	 * Clean up resources
	 */
	async shutdown(): Promise<void> {
		await this.worker.close();
		await this.queue.close();
		container.logger.info('[TempVoice Queue] Service shut down');
	}
}

// Export singleton instance
export const tempVoiceQueue = new TempVoiceQueueService();
