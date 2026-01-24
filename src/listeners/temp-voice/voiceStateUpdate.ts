/**
 * Listener for voice state updates to handle temp voice channel creation and cleanup
 */

import { Listener } from '@sapphire/framework';
import type { VoiceState } from 'discord.js';
import { Events, Colors, WebhookClient, EmbedBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
import { TempVoiceConfigService } from '../../modules/temp-voice/services/config.service';
import { TempChannelService } from '../../modules/temp-voice/services/temp-channel.service';
import { PermissionsService } from '../../modules/temp-voice/services/permissions.service';
import { tempVoiceQueue } from '../../modules/temp-voice/services/temp-voice-queue.service';

export class TempVoiceStateUpdateListener extends Listener {
  private configService!: TempVoiceConfigService;
  private channelService!: TempChannelService;
  private permissionsService!: PermissionsService;

  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.VoiceStateUpdate,
      name: 'tempVoiceStateUpdateListener',
    });
  }

  public async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
    // Initialize services (lazy initialization)
    if (!this.configService) {
      this.configService = new TempVoiceConfigService(container.prisma);
      this.permissionsService = new PermissionsService();
      this.channelService = new TempChannelService(container.prisma, this.permissionsService);
    }

    // Handle different voice state changes
    const joinedChannel = !oldState.channelId && newState.channelId;
    const leftChannel = oldState.channelId && !newState.channelId;
    const movedChannel =
      oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

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
      this.container.logger.error(`[TempVoice] Error handling voice state update:`, error);
    }
  }

  /**
   * Handle user joining a voice channel
   */
  private async handleJoin(state: VoiceState): Promise<void> {
    if (!state.guild || !state.member || !state.channelId) return;

    // Get config
    const config = await this.configService.getOrNull(state.guild.id);
    if (!config || !config.enabled) {
      this.container.logger.debug(`[TempVoice] No config or disabled for guild ${state.guild.id}`);
      return;
    }

    this.container.logger.debug(
      `[TempVoice] User ${state.member.id} joined channel ${state.channelId}`
    );
    this.container.logger.debug(
      `[TempVoice] JTC channels: ${JSON.stringify(config.joinToCreateChannels)}`
    );

    // Check if this is a Join to Create channel
    const isJTC = config.joinToCreateChannels.includes(state.channelId);

    this.container.logger.debug(`[TempVoice] Is JTC channel: ${isJTC}`);

    if (isJTC) {
      // Queue channel creation instead of creating directly
      await tempVoiceQueue.queueCreate(state.guild.id, state.member.id, state.channelId);
      this.container.logger.info(
        `[TempVoice] Queued temp channel creation for user ${state.member.id} in guild ${state.guild.id}`
      );
    } else {
      // Check if this is a temp channel that was scheduled for deletion
      const tempChannel = await this.channelService.getByChannelId(state.channelId);

      if (tempChannel && tempChannel.deletionScheduledAt) {
        // Cancel deletion - someone joined
        await tempVoiceQueue.cancelDelete(state.guild.id, state.channelId);
        await this.channelService.update(state.channelId, {
          deletionScheduledAt: null,
        });
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
    const discordChannel = await state.guild.channels.fetch(state.channelId).catch(() => null);

    if (!discordChannel || !discordChannel.isVoiceBased()) {
      // Channel doesn't exist anymore - clean up database
      await this.channelService.delete(state.channelId);
      return;
    }

    // Check if channel is now empty
    if (discordChannel.members.size === 0) {
      // Get config for deletion delay
      const config = await this.configService.getOrNull(state.guild.id);
      const delayMs = config ? config.deleteDelaySeconds * 1000 : 5000; // Default 5 seconds

      // Queue deletion with delay
      await tempVoiceQueue.queueDelete(state.guild.id, state.channelId, 'Channel empty', delayMs);

      this.container.logger.info(
        `[TempVoice] Queued deletion for empty channel ${state.channelId} (delay: ${delayMs}ms)`
      );

      // Log to configured log channel if enabled
      if (config?.logWebhook) {
        try {
          const webhook = new WebhookClient({ url: config.logWebhook });
          const embed = new EmbedBuilder()
            .setTitle('🎙️ Temporary Voice Channel Empty')
            .setDescription(`Temporary voice channel is now empty and scheduled for deletion`)
            .addFields(
              {
                name: 'Channel',
                value: `${discordChannel.name} (<#${state.channelId}>)`,
                inline: true,
              },
              { name: 'Deletion in', value: `${config.deleteDelaySeconds} seconds`, inline: true }
            )
            .setColor(Colors.Yellow)
            .setTimestamp();

          await webhook.send({ embeds: [embed] });
          webhook.destroy();
        } catch (error) {
          this.container.logger.error('[TempVoice] Failed to send empty log:', error);
        }
      }
    } else {
      // Channel still has members - update last active time
      await this.channelService.updateLastActive(state.channelId);
    }
  }
}
