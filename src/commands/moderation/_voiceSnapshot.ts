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
      content: 'Please select a valid voice channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const voiceChannel = options.channel;
    const members = voiceChannel.members;
    const memberCount = members.size;

    const lines: string[] = [
      `## Snapshot: ${voiceChannel.name}`,
      `**Members:** ${memberCount}`,
      `**Taken:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    ];

    const containerComp = new ContainerBuilder().addTextDisplayComponents(
      ...lines.map((line) => new TextDisplayBuilder().setContent(line))
    );

    if (memberCount === 0) {
      containerComp.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('_No members in this channel_')
      );
    } else {
      containerComp.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const memberLines = Array.from(members.values())
        .slice(0, 25)
        .map((member: GuildMember) => formatMemberLine(member));

      const memberList = memberLines.length > 0 ? memberLines.join('\n') : '_No members_';
      containerComp.addTextDisplayComponents(new TextDisplayBuilder().setContent(memberList));

      if (memberCount > 25) {
        containerComp.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`_... and ${memberCount - 25} more members_`)
        );
      }
    }

    containerComp
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Channel Info:** User Limit: ${voiceChannel.userLimit || 'None'} | Bitrate: ${Math.floor(voiceChannel.bitrate / 1000)}kbps`
        )
      );

    await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    container.logger.error('Error in voice snapshot command:', error);
    await interaction.editReply({
      content: 'An error occurred while taking the snapshot.',
    });
  }
}

function formatMemberLine(member: GuildMember): string {
  const voice = member.voice;
  const indicators: string[] = [];

  if (voice.selfMute || voice.serverMute) indicators.push('[M]');
  if (voice.selfDeaf || voice.serverDeaf) indicators.push('[D]');
  if (voice.streaming) indicators.push('[S]');
  if (voice.selfVideo) indicators.push('[V]');

  const status = indicators.length > 0 ? ` ${indicators.join(' ')}` : '';
  return `**${member.displayName}** (${member.user.tag})${status}`;
}
