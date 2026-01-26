/**
 * Voice State Update Listener
 * Handles voice channel joins, leaves, moves, and state changes
 */

import { Listener } from '@sapphire/framework';
import { VoiceState } from 'discord.js';
import { Events } from 'discord.js';
import {
  handleVoiceJoin,
  handleVoiceLeave,
  handleVoiceMove,
  handleVoiceStateUpdate,
} from '../../modules/xp-voice/services/voice-xp-session.service';
import { getVoiceXPConfig } from '../../modules/xp-voice/services/voice-xp-config.service.js';

export class VoiceXPStateUpdateListener extends Listener<typeof Events.VoiceStateUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.VoiceStateUpdate,
      name: 'voiceXPStateUpdateListener',
    });
  }

  public async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      // User joined voice channel
      if (!oldChannelId && newChannelId) {
        await handleVoiceJoin(newState);
      }
      // User left voice channel
      else if (oldChannelId && !newChannelId) {
        const result = await handleVoiceLeave(oldState);
        if (result?.leveledUp && oldState.guild && oldState.member) {
          this.container.logger.info(
            `[Voice XP] User ${oldState.member.user.tag} leveled up to ${result.newLevel}!`
          );

          // Send level-up announcement
          const config = await getVoiceXPConfig(oldState.guild.id);

          if (config.announceLevelUp && config.announceChannelId) {
            const channel = oldState.guild.channels.cache.get(config.announceChannelId);
            if (channel?.isTextBased()) {
              try {
                // Use custom template or fallback
                const template = config.messageTemplate || '🎤 {user} reached voice level {level}!';
                const message = template
                  .replace(/{user}/g, `${oldState.member.user}`)
                  .replace(/{level}/g, `${result.newLevel}`)
                  .replace(/{xp}/g, `${result.newXp}`)
                  .replace(/{previousLevel}/g, `${result.previousLevel}`);

                await channel.send(message);
              } catch (error) {
                this.container.logger.error(
                  '[Voice XP] Failed to send level-up announcement:',
                  error
                );
              }
            }
          }
        }
      }
      // User moved to different voice channel
      else if (oldChannelId !== newChannelId && oldChannelId && newChannelId) {
        await handleVoiceMove(oldState, newState);
      }
      // User state changed (muted, deafened, streaming, video)
      else if (oldChannelId === newChannelId && newChannelId) {
        await handleVoiceStateUpdate(oldState, newState);
      }
    } catch (error) {
      this.container.logger.error('[Voice XP] Error handling voice state update:', error);
    }
  }
}
