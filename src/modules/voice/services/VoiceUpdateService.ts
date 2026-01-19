import { container } from '@sapphire/framework';
import {
  type Guild,
  type VoiceState,
  type TextChannel,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { setJson, deleteJson, CacheKey } from '#lib/cache/index.js';
import { InMemoryRateLimiter } from '#lib/rateLimit/index.js';
import {
  type VoiceWatchSession,
  type VoiceTrackSession,
  VoiceWatchSessionSchema,
  VoiceTrackSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
} from '../domain/types.js';

/**
 * Service for handling real-time voice watch/track updates
 * Uses rate limiting to prevent Discord API spam
 */
class VoiceUpdateService {
  private readonly rateLimiter = new InMemoryRateLimiter();

  /**
   * Handle a voice watch update for a specific user
   */
  async handleWatchUpdate(
    guildId: string,
    interactionId: string,
    session: VoiceWatchSession,
    newState: VoiceState
  ): Promise<void> {
    const rateLimitKey = `voiceWatch:${guildId}:${interactionId}`;

    // Check rate limit
    if (
      !this.rateLimiter.tryTake(rateLimitKey, { minIntervalMs: VOICE_WATCH_CONFIG.minIntervalMs })
    ) {
      return;
    }

    // Check max updates
    if (session.updateCount >= VOICE_WATCH_CONFIG.maxUpdates) {
      await this.stopWatch(guildId, interactionId, session, 'Maximum updates reached');
      return;
    }

    // Check expiry
    if (Date.now() >= session.endsAt) {
      await this.stopWatch(guildId, interactionId, session, 'Watch duration ended');
      return;
    }

    try {
      const guild = container.client.guilds.cache.get(guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(session.channelIdMessage) as TextChannel | undefined;
      if (!channel) return;

      const message = await channel.messages.fetch(session.messageId).catch(() => null);
      if (!message) {
        await this.cleanupWatch(guildId, interactionId, session);
        return;
      }

      // Build updated message
      const components = this.buildWatchMessage(session, newState, guild);

      // Update session
      const updatedSession: VoiceWatchSession = {
        ...session,
        channelId: newState.channelId,
        lastUpdateAt: Date.now(),
        updateCount: session.updateCount + 1,
      };

      await setJson(
        CacheKey.voiceWatch(guildId, interactionId),
        VoiceWatchSessionSchema,
        updatedSession,
        VOICE_CACHE_TTL.watchSession
      );

      // Edit message
      await message.edit({
        components: [components],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[VoiceUpdateService] Error updating watch message:', error);
    }
  }

  /**
   * Handle a voice track update for a channel
   */
  async handleTrackUpdate(
    guildId: string,
    interactionId: string,
    session: VoiceTrackSession,
    _channelId: string,
    guild: Guild
  ): Promise<void> {
    const rateLimitKey = `voiceTrack:${guildId}:${interactionId}`;

    // Check rate limit
    if (
      !this.rateLimiter.tryTake(rateLimitKey, { minIntervalMs: VOICE_WATCH_CONFIG.minIntervalMs })
    ) {
      return;
    }

    // Check max updates
    if (session.updateCount >= VOICE_WATCH_CONFIG.maxUpdates) {
      await this.stopTrack(guildId, interactionId, session, 'Maximum updates reached');
      return;
    }

    // Check expiry
    if (Date.now() >= session.endsAt) {
      await this.stopTrack(guildId, interactionId, session, 'Track duration ended');
      return;
    }

    try {
      const channel = guild.channels.cache.get(session.channelIdMessage) as TextChannel | undefined;
      if (!channel) return;

      const message = await channel.messages.fetch(session.messageId).catch(() => null);
      if (!message) {
        await this.cleanupTrack(guildId, interactionId, session);
        return;
      }

      const voiceChannel = guild.channels.cache.get(session.channelId);
      if (!voiceChannel?.isVoiceBased()) {
        await this.stopTrack(guildId, interactionId, session, 'Channel no longer exists');
        return;
      }

      // Build updated message
      const components = this.buildTrackMessage(session, voiceChannel, guild);

      // Update session
      const updatedSession: VoiceTrackSession = {
        ...session,
        lastUpdateAt: Date.now(),
        updateCount: session.updateCount + 1,
      };

      await setJson(
        CacheKey.voiceTrack(guildId, interactionId),
        VoiceTrackSessionSchema,
        updatedSession,
        VOICE_CACHE_TTL.trackSession
      );

      // Edit message
      await message.edit({
        components: [components],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[VoiceUpdateService] Error updating track message:', error);
    }
  }

  /**
   * Stop a watch session
   */
  async stopWatch(
    guildId: string,
    interactionId: string,
    session: VoiceWatchSession,
    reason: string
  ): Promise<void> {
    try {
      const guild = container.client.guilds.cache.get(guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(session.channelIdMessage) as TextChannel | undefined;
      if (!channel) return;

      const message = await channel.messages.fetch(session.messageId).catch(() => null);
      if (message) {
        const targetUser = await guild.members.fetch(session.targetId).catch(() => null);
        const displayName = targetUser?.displayName ?? session.targetId;

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 👁️ Watch Ended: ${displayName}`),
          new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
          new TextDisplayBuilder().setContent(
            `**Duration:** ${this.formatDuration(Date.now() - session.startedAt)} • **Updates:** ${session.updateCount}`
          )
        );

        await message.edit({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      container.logger.error('[VoiceUpdateService] Error stopping watch:', error);
    } finally {
      await this.cleanupWatch(guildId, interactionId, session);
    }
  }

  /**
   * Stop a track session
   */
  async stopTrack(
    guildId: string,
    interactionId: string,
    session: VoiceTrackSession,
    reason: string
  ): Promise<void> {
    try {
      const guild = container.client.guilds.cache.get(guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(session.channelIdMessage) as TextChannel | undefined;
      if (!channel) return;

      const message = await channel.messages.fetch(session.messageId).catch(() => null);
      if (message) {
        const voiceChannel = guild.channels.cache.get(session.channelId);
        const channelName = voiceChannel?.name ?? session.channelId;

        const containerComp = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 📡 Track Ended: ${channelName}`),
          new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
          new TextDisplayBuilder().setContent(
            `**Duration:** ${this.formatDuration(Date.now() - session.startedAt)} • **Updates:** ${session.updateCount}`
          )
        );

        await message.edit({
          components: [containerComp],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      container.logger.error('[VoiceUpdateService] Error stopping track:', error);
    } finally {
      await this.cleanupTrack(guildId, interactionId, session);
    }
  }

  /**
   * Cleanup watch session from Redis
   */
  private async cleanupWatch(
    guildId: string,
    interactionId: string,
    session: VoiceWatchSession
  ): Promise<void> {
    await deleteJson(CacheKey.voiceWatch(guildId, interactionId));
    await container.redis.srem(
      CacheKey.voiceWatchByTarget(guildId, session.targetId),
      interactionId
    );
    this.rateLimiter.reset(`voiceWatch:${guildId}:${interactionId}`);
  }

  /**
   * Cleanup track session from Redis
   */
  private async cleanupTrack(
    guildId: string,
    interactionId: string,
    session: VoiceTrackSession
  ): Promise<void> {
    await deleteJson(CacheKey.voiceTrack(guildId, interactionId));
    await container.redis.srem(
      CacheKey.voiceTrackByChannel(guildId, session.channelId),
      interactionId
    );
    this.rateLimiter.reset(`voiceTrack:${guildId}:${interactionId}`);
  }

  /**
   * Build watch message components
   */
  private buildWatchMessage(
    session: VoiceWatchSession,
    state: VoiceState,
    guild: Guild
  ): ContainerBuilder {
    const targetMember = guild.members.cache.get(session.targetId);
    const displayName = targetMember?.displayName ?? session.targetId;
    const channelName = state.channelId
      ? (guild.channels.cache.get(state.channelId)?.name ?? 'Unknown')
      : 'Not in voice';

    const statusEmoji = state.channelId ? '🟢' : '🔴';
    const muteStatus = this.getMuteStatus(state);

    const containerComp = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 👁️ Watching: ${displayName}`),
        new TextDisplayBuilder().setContent(`${statusEmoji} **Channel:** ${channelName}`),
        new TextDisplayBuilder().setContent(`🔇 **Status:** ${muteStatus}`),
        new TextDisplayBuilder().setContent(state.streaming ? '📺 **Streaming**' : '')
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ Ends <t:${Math.floor(session.endsAt / 1000)}:R> • Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`voice_watch_stop:${session.targetId}`)
            .setLabel('Stop Watching')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⏹️')
        )
      );

    return containerComp;
  }

  /**
   * Build track message components
   */
  private buildTrackMessage(
    session: VoiceTrackSession,
    voiceChannel: { name: string; members?: Map<string, unknown> },
    guild: Guild
  ): ContainerBuilder {
    const channel = guild.channels.cache.get(session.channelId);
    const members = channel?.isVoiceBased() ? channel.members : new Map();
    const memberCount = members.size;

    const memberList = Array.from(members.values())
      .slice(0, 10)
      .map((m) => {
        const member = m as { displayName: string; voice?: VoiceState };
        const muteEmoji = member.voice?.selfMute || member.voice?.serverMute ? '🔇' : '🔊';
        const streamEmoji = member.voice?.streaming ? '📺' : '';
        return `${muteEmoji} ${member.displayName} ${streamEmoji}`;
      })
      .join('\n');

    const moreCount = memberCount > 10 ? `\n... and ${memberCount - 10} more` : '';

    const containerComp = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 📡 Tracking: ${voiceChannel.name}`),
        new TextDisplayBuilder().setContent(`👥 **Members:** ${memberCount}`),
        new TextDisplayBuilder().setContent(memberList || '_No members in channel_'),
        new TextDisplayBuilder().setContent(moreCount)
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ Ends <t:${Math.floor(session.endsAt / 1000)}:R> • Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`voice_track_stop:${session.channelId}`)
            .setLabel('Stop Tracking')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⏹️')
        )
      );

    return containerComp;
  }

  private getMuteStatus(state: VoiceState): string {
    const parts: string[] = [];
    if (state.selfMute) parts.push('Self-muted');
    if (state.selfDeaf) parts.push('Self-deafened');
    if (state.serverMute) parts.push('Server-muted');
    if (state.serverDeaf) parts.push('Server-deafened');
    return parts.length > 0 ? parts.join(', ') : 'Unmuted';
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

export const voiceUpdateService = new VoiceUpdateService();
