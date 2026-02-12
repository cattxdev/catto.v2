/**
 * Voice State Update Listener
 * Handles voice channel joins, leaves, moves, and state changes
 */

import { Listener } from '@sapphire/framework';
import { MessageFlags, TextChannel, NewsChannel, VoiceState } from 'discord.js';
import { Events } from 'discord.js';
import { container as fluentContainer } from '../../lib/discord/containers/container.js';
import {
  handleVoiceJoin,
  handleVoiceLeave,
  handleVoiceMove,
  handleVoiceStateUpdate,
} from '../../modules/xp/xp-voice/services/voice-xp-session.service.js';
import { getVoiceXPConfig } from '../../modules/xp/xp-voice/services/voice-xp-config.service.js';
import { parseVoiceTemplate } from '../../modules/xp/xp-voice/utils/templates.js';
import type { VoiceTemplateVariables } from '../../modules/xp/xp-voice/types/voice-xp.types.js';
import { RewardIntegration } from '../../modules/rewards/integrations/RewardIntegration.js';
import type { RewardClaimResult } from '../../lib/types/rewards.types.js';

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
        if (result?.leveledUp && result.newLevel && oldState.guild && oldState.member) {
          this.container.logger.info(
            `[Voice XP] User ${oldState.member.user.tag} leveled up to ${result.newLevel}!`
          );

          // Check and apply rewards for the new level
          let rewardResults: RewardClaimResult[] = [];
          rewardResults = await RewardIntegration.onVoiceLevelUp(
            oldState.guild.id,
            oldState.member.id,
            result.newLevel,
            result.newXp ?? 0,
            oldState.guild,
            oldState.member
          );

          // Send level-up announcement
          const config = await getVoiceXPConfig(oldState.guild.id);

          if (config.announceLevelUp && config.announceChannelId) {
            const channel = oldState.guild.channels.cache.get(config.announceChannelId);
            if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
              try {
                const template = config.messageTemplate || '🎤 {user} reached voice level {level}!';
                const variables: VoiceTemplateVariables = {
                  user: `<@${oldState.member.id}>`,
                  userId: oldState.member.id,
                  username: oldState.member.user.username,
                  level: result.newLevel,
                  xpGain: result.xpGained ?? 0,
                  totalXp: result.newXp ?? 0,
                  minutesInVoice: result.durationMinutes ?? 0,
                  nextLevelXp: 0,
                  progress: 0,
                  type: 'Voice',
                };

                let messageText = parseVoiceTemplate(template, variables);

                // Add rewards summary if any rewards were earned
                const rewardsSummary = RewardIntegration.formatRewardsSummary(rewardResults);
                if (rewardsSummary) {
                  messageText += rewardsSummary;
                }

                if (config.embedEnabled) {
                  const ui = fluentContainer({ color: config.embedColor })
                    .h2('Voice XP Level Up')
                    .text(messageText)
                    .footerWithTimestamp();

                  await channel.send({
                    components: [ui.build()],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] },
                  });
                } else {
                  await channel.send(messageText);
                }
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
