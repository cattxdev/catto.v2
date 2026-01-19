import { Subcommand } from '@sapphire/plugin-subcommands';
import { container } from '@sapphire/framework';
import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { parseVoiceSnapshotOptions } from '#lib/interaction/typedOptions.js';
import type { GuildMember } from 'discord.js';

export async function handleVoiceSnapshot(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceSnapshotOptions(interaction);

  if (!options) {
    await interaction.reply({
      content: '❌ Please select a valid voice channel.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const voiceChannel = options.channel;
    const members = voiceChannel.members;
    const memberCount = members.size;

    const containerComp = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 📸 Voice Snapshot: ${voiceChannel.name}`),
      new TextDisplayBuilder().setContent(`**Members:** ${memberCount}`),
      new TextDisplayBuilder().setContent(`**Taken:** <t:${Math.floor(Date.now() / 1000)}:F>`)
    );

    if (memberCount === 0) {
      containerComp.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('_No members in this channel_')
      );
    } else {
      containerComp.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      // Build member list (limit to 25 for display)
      const memberList = Array.from(members.values())
        .slice(0, 25)
        .map((member: GuildMember) => formatMemberLine(member))
        .join('\n');

      containerComp.addTextDisplayComponents(new TextDisplayBuilder().setContent(memberList));

      if (memberCount > 25) {
        containerComp.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`_... and ${memberCount - 25} more members_`)
        );
      }
    }

    // Add channel info
    containerComp
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📊 **Channel Info:** User Limit: ${voiceChannel.userLimit || '∞'} • Bitrate: ${Math.floor(voiceChannel.bitrate / 1000)}kbps`
        )
      );

    await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    container.logger.error('Error in voice snapshot command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while taking the snapshot.',
    });
  }
}

function formatMemberLine(member: GuildMember): string {
  const voice = member.voice;
  const muteEmoji = voice.selfMute || voice.serverMute ? '🔇' : '🔊';
  const deafEmoji = voice.selfDeaf || voice.serverDeaf ? '🔕' : '';
  const streamEmoji = voice.streaming ? '📺' : '';
  const videoEmoji = voice.selfVideo ? '📹' : '';

  const statusIcons = [muteEmoji, deafEmoji, streamEmoji, videoEmoji].filter(Boolean).join(' ');

  return `${statusIcons} **${member.displayName}** (${member.user.tag})`;
}
