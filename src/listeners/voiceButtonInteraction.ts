import { Listener, container } from '@sapphire/framework';
import {
  Events,
  type Interaction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  type ButtonInteraction,
} from 'discord.js';
import { getJson, deleteJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceWatchSessionSchema,
  VoiceTrackSessionSchema,
} from '#root/modules/voice/domain/types.js';

export class VoiceButtonInteractionListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public async run(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guildId) return;

    const customId = interaction.customId;
    const guildId = interaction.guildId;

    if (customId.startsWith('voice_watch_stop:')) {
      await this.handleWatchStop(interaction, guildId);
    } else if (customId.startsWith('voice_track_stop:')) {
      await this.handleTrackStop(interaction, guildId);
    }
  }

  private async handleWatchStop(interaction: ButtonInteraction, guildId: string): Promise<void> {
    const targetId = interaction.customId.split(':')[1];
    if (!targetId) return;

    try {
      // Find the watch session for this target
      const watchKey = CacheKey.voiceWatchByTarget(guildId, targetId);
      const interactionIds = await container.redis.smembers(watchKey);

      let found = false;
      for (const interactionId of interactionIds) {
        const sessionKey = CacheKey.voiceWatch(guildId, interactionId);
        const session = await getJson(sessionKey, VoiceWatchSessionSchema);

        if (session && session.messageId === interaction.message.id) {
          // Clean up session
          await deleteJson(sessionKey);
          await container.redis.srem(watchKey, interactionId);
          found = true;
          break;
        }
      }

      if (found) {
        const containerComp = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## 👁️ Watch Stopped'),
          new TextDisplayBuilder().setContent('Watching has been stopped by moderator.')
        );

        await interaction.update({
          components: [containerComp],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.reply({
          content: '❌ This watch session has already ended or was not found.',
          ephemeral: true,
        });
      }
    } catch (error) {
      container.logger.error('[VoiceButtonInteraction] Error stopping watch:', error);
      await interaction
        .reply({
          content: '❌ An error occurred while stopping the watch.',
          ephemeral: true,
        })
        .catch(() => {});
    }
  }

  private async handleTrackStop(interaction: ButtonInteraction, guildId: string): Promise<void> {
    const channelId = interaction.customId.split(':')[1];
    if (!channelId) return;

    try {
      // Find the track session for this channel
      const trackKey = CacheKey.voiceTrackByChannel(guildId, channelId);
      const interactionIds = await container.redis.smembers(trackKey);

      let found = false;
      for (const interactionId of interactionIds) {
        const sessionKey = CacheKey.voiceTrack(guildId, interactionId);
        const session = await getJson(sessionKey, VoiceTrackSessionSchema);

        if (session && session.messageId === interaction.message.id) {
          // Clean up session
          await deleteJson(sessionKey);
          await container.redis.srem(trackKey, interactionId);
          found = true;
          break;
        }
      }

      if (found) {
        const containerComp = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## 📡 Track Stopped'),
          new TextDisplayBuilder().setContent('Channel tracking has been stopped by moderator.')
        );

        await interaction.update({
          components: [containerComp],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.reply({
          content: '❌ This track session has already ended or was not found.',
          ephemeral: true,
        });
      }
    } catch (error) {
      container.logger.error('[VoiceButtonInteraction] Error stopping track:', error);
      await interaction
        .reply({
          content: '❌ An error occurred while stopping the track.',
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
}
