import { container } from '@sapphire/framework';
import { type TextChannel, type Guild, type VoiceState, MessageFlags } from 'discord.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import { InMemoryRateLimiter } from '#lib/rateLimit/index.js';
import {
  type VoiceWatchSession,
  type VoiceTrackSession,
  VoiceWatchSessionSchema,
  VoiceTrackSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
} from '../domain/types.js';
import {
  buildWatchMessage,
  buildTrackMessage,
  buildWatchEndedMessage,
  buildTrackEndedMessage,
} from './messageBuilders.js';
import {
  sessionExpiryManager,
  cleanupWatchSession,
  cleanupTrackSession,
} from './sessionManager.js';

const rateLimiter = new InMemoryRateLimiter();

// Wire up expiry callbacks
sessionExpiryManager.setCallbacks(
  async (guildId, interactionId, session) => {
    await stopWatch(guildId, interactionId, session, 'Duration ended');
  },
  async (guildId, interactionId, session) => {
    await stopTrack(guildId, interactionId, session, 'Duration ended');
  }
);

/**
 * Handle voice watch update for a user
 */
export async function handleWatchUpdate(
  guildId: string,
  interactionId: string,
  session: VoiceWatchSession,
  newState: VoiceState
): Promise<void> {
  const rateLimitKey = `voiceWatch:${guildId}:${interactionId}`;

  if (!rateLimiter.tryTake(rateLimitKey, { minIntervalMs: VOICE_WATCH_CONFIG.minIntervalMs })) {
    return;
  }

  if (session.updateCount >= VOICE_WATCH_CONFIG.maxUpdates) {
    await stopWatch(guildId, interactionId, session, 'Maximum updates reached');
    return;
  }

  if (Date.now() >= session.endsAt) {
    await stopWatch(guildId, interactionId, session, 'Duration ended');
    return;
  }

  try {
    const guild = container.client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(session.channelIdMessage) as TextChannel | undefined;
    if (!channel) return;

    const message = await channel.messages.fetch(session.messageId).catch(() => null);
    if (!message) {
      await cleanupWatchSession(guildId, interactionId, session);
      rateLimiter.reset(rateLimitKey);
      return;
    }

    const components = buildWatchMessage(session, newState, guild);

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

    await message.edit({
      components: [components],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    container.logger.error('[VoiceUpdate] Error updating watch:', error);
  }
}

/**
 * Handle voice track update for a channel
 */
export async function handleTrackUpdate(
  guildId: string,
  interactionId: string,
  session: VoiceTrackSession,
  _channelId: string,
  guild: Guild
): Promise<void> {
  const rateLimitKey = `voiceTrack:${guildId}:${interactionId}`;

  if (!rateLimiter.tryTake(rateLimitKey, { minIntervalMs: VOICE_WATCH_CONFIG.minIntervalMs })) {
    return;
  }

  if (session.updateCount >= VOICE_WATCH_CONFIG.maxUpdates) {
    await stopTrack(guildId, interactionId, session, 'Maximum updates reached');
    return;
  }

  if (Date.now() >= session.endsAt) {
    await stopTrack(guildId, interactionId, session, 'Duration ended');
    return;
  }

  try {
    const channel = guild.channels.cache.get(session.channelIdMessage) as TextChannel | undefined;
    if (!channel) return;

    const message = await channel.messages.fetch(session.messageId).catch(() => null);
    if (!message) {
      await cleanupTrackSession(guildId, interactionId, session);
      rateLimiter.reset(rateLimitKey);
      return;
    }

    const voiceChannel = guild.channels.cache.get(session.channelId);
    if (!voiceChannel?.isVoiceBased()) {
      await stopTrack(guildId, interactionId, session, 'Channel no longer exists');
      return;
    }

    const components = buildTrackMessage(session, voiceChannel, guild);

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

    await message.edit({
      components: [components],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    container.logger.error('[VoiceUpdate] Error updating track:', error);
  }
}

/**
 * Stop a watch session
 */
export async function stopWatch(
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

      const endedMessage = buildWatchEndedMessage(
        displayName,
        reason,
        Date.now() - session.startedAt,
        session.updateCount
      );

      await message.edit({
        components: [endedMessage],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  } catch (error) {
    container.logger.error('[VoiceUpdate] Error stopping watch:', error);
  } finally {
    await cleanupWatchSession(guildId, interactionId, session);
    rateLimiter.reset(`voiceWatch:${guildId}:${interactionId}`);
  }
}

/**
 * Stop a track session
 */
export async function stopTrack(
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

      const endedMessage = buildTrackEndedMessage(
        channelName,
        reason,
        Date.now() - session.startedAt,
        session.updateCount
      );

      await message.edit({
        components: [endedMessage],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  } catch (error) {
    container.logger.error('[VoiceUpdate] Error stopping track:', error);
  } finally {
    await cleanupTrackSession(guildId, interactionId, session);
    rateLimiter.reset(`voiceTrack:${guildId}:${interactionId}`);
  }
}

/**
 * Register a new session for expiry tracking
 */
export function registerSession(
  type: 'watch' | 'track',
  guildId: string,
  interactionId: string
): void {
  sessionExpiryManager.register(type, guildId, interactionId);
}
