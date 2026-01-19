import { Listener, container } from '@sapphire/framework';
import { Events, type VoiceState } from 'discord.js';
import { setJson, deleteJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceMemberPresenceSchema,
  VoiceWatchSessionSchema,
  VoiceTrackSessionSchema,
  VOICE_CACHE_TTL,
  type VoiceMemberPresence,
} from '#root/modules/voice/domain/types.js';
import { getJson } from '#lib/cache/index.js';
import { handleWatchUpdate, handleTrackUpdate } from '#root/modules/voice/services/voiceUpdate.js';

export class VoiceStateUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.VoiceStateUpdate,
    });
  }

  public async run(oldState: VoiceState, newState: VoiceState) {
    const guildId = newState.guild.id;
    const userId = newState.member?.id ?? newState.id;

    try {
      // Handle channel membership sets
      await this.updateChannelMembership(guildId, oldState, newState, userId);

      // Handle member presence
      await this.updateMemberPresence(guildId, userId, newState);

      // Publish for active watchers (listener-driven updates)
      await this.notifyWatchers(guildId, userId, oldState, newState);
    } catch (error) {
      container.logger.error('[VoiceStateUpdate] Error processing voice state update:', error);
    }
  }

  private async updateChannelMembership(
    guildId: string,
    oldState: VoiceState,
    newState: VoiceState,
    userId: string
  ): Promise<void> {
    // Remove from old channel set if they left
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const oldKey = CacheKey.voiceChannelMembers(guildId, oldState.channelId);
      await container.redis.srem(oldKey, userId);

      // Check if channel is now empty and clean up
      const remaining = await container.redis.scard(oldKey);
      if (remaining === 0) {
        await container.redis.del(oldKey);
      }
    }

    // Add to new channel set if they joined
    if (newState.channelId) {
      const newKey = CacheKey.voiceChannelMembers(guildId, newState.channelId);
      await container.redis.sadd(newKey, userId);
      await container.redis.expire(newKey, VOICE_CACHE_TTL.memberPresence);
    }
  }

  private async updateMemberPresence(
    guildId: string,
    userId: string,
    state: VoiceState
  ): Promise<void> {
    const key = CacheKey.voiceMemberPresence(guildId, userId);

    if (!state.channelId) {
      // User left voice - delete presence
      await deleteJson(key);
      return;
    }

    const presence: VoiceMemberPresence = {
      channelId: state.channelId,
      selfMute: state.selfMute ?? false,
      selfDeaf: state.selfDeaf ?? false,
      serverMute: state.serverMute ?? false,
      serverDeaf: state.serverDeaf ?? false,
      streaming: state.streaming ?? false,
      timestamp: Date.now(),
    };

    await setJson(key, VoiceMemberPresenceSchema, presence, VOICE_CACHE_TTL.memberPresence);
  }

  private async notifyWatchers(
    guildId: string,
    userId: string,
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<void> {
    // Check for user watchers
    const watchKey = CacheKey.voiceWatchByTarget(guildId, userId);
    const watchInteractionIds = await container.redis.smembers(watchKey);

    for (const interactionId of watchInteractionIds) {
      const sessionKey = CacheKey.voiceWatch(guildId, interactionId);
      const session = await getJson(sessionKey, VoiceWatchSessionSchema);

      if (session && session.endsAt > Date.now()) {
        await handleWatchUpdate(guildId, interactionId, session, newState);
      }
    }

    // Check for channel trackers - handle both old and new channel
    const channelIds = new Set<string>();
    if (oldState.channelId) channelIds.add(oldState.channelId);
    if (newState.channelId) channelIds.add(newState.channelId);

    for (const channelId of channelIds) {
      const trackKey = CacheKey.voiceTrackByChannel(guildId, channelId);
      const trackInteractionIds = await container.redis.smembers(trackKey);

      for (const interactionId of trackInteractionIds) {
        const sessionKey = CacheKey.voiceTrack(guildId, interactionId);
        const session = await getJson(sessionKey, VoiceTrackSessionSchema);

        if (session && session.endsAt > Date.now()) {
          await handleTrackUpdate(guildId, interactionId, session, channelId, newState.guild);
        }
      }
    }
  }
}
