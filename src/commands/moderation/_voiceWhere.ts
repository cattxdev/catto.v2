import { Subcommand } from '@sapphire/plugin-subcommands';
import { container } from '@sapphire/framework';
import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
  channelMention,
} from 'discord.js';
import { parseVoiceWhereOptions } from '#lib/interaction/typedOptions.js';
import { getJson, CacheKey } from '#lib/cache/index.js';
import { VoiceMemberPresenceSchema, VOICE_EMOJI } from '#root/modules/voice/domain/types.js';
import {
  getVoiceIndicators,
  formatMemberName,
} from '#root/modules/voice/services/messageBuilders.js';

export async function handleVoiceWhere(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceWhereOptions(interaction);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const cached = await getJson(
      CacheKey.voiceMemberPresence(options.guildId, options.targetId),
      VoiceMemberPresenceSchema
    );

    let member;
    try {
      member = await options.guild.members.fetch(options.targetId);
    } catch {
      await interaction.editReply({
        content: `User **${options.target.tag}** is not a member of this server.`,
      });
      return;
    }

    const voiceState = member.voice;
    const inVoice = voiceState.channelId !== null;

    const lines: string[] = [`## ${VOICE_EMOJI.member} ${formatMemberName(member)}`];

    if (inVoice && voiceState.channel && voiceState.channelId) {
      const indicators = getVoiceIndicators(
        { ...voiceState, channelId: voiceState.channelId },
        member.id
      );
      lines.push(`**Channel:** ${channelMention(voiceState.channelId)}`);
      lines.push(`**State:** ${indicators}`);

      if (voiceState.streaming) {
        lines.push(`${VOICE_EMOJI.serverScreenshare} **Streaming**`);
      }

      if (cached) {
        const joinedAgo = Math.floor((Date.now() - cached.timestamp) / 1000);
        lines.push(`_Tracked for ${formatSeconds(joinedAgo)}_`);
      }
    } else {
      lines.push('_Not in a voice channel_');

      if (cached) {
        lines.push(`_Last seen <t:${Math.floor(cached.timestamp / 1000)}:R>_`);
      }
    }

    const containerComp = new ContainerBuilder().addTextDisplayComponents(
      ...lines.map((line) => new TextDisplayBuilder().setContent(line))
    );

    if (inVoice && voiceState.channelId) {
      containerComp.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      // All buttons in one row
      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`voice_join:${voiceState.channelId}`)
          .setEmoji(VOICE_EMOJI.connectToUser)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`voice_mute:${options.targetId}`)
          .setEmoji(VOICE_EMOJI.voiceToggle)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`voice_disconnect:${options.targetId}`)
          .setEmoji(VOICE_EMOJI.disconnectUser)
          .setStyle(ButtonStyle.Secondary)
      );

      containerComp.addActionRowComponents(actionRow);
    }

    await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    container.logger.error('Error in voice where command:', error);
    await interaction.editReply({
      content: 'An error occurred while checking voice location.',
    });
  }
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
