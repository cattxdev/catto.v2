import { Subcommand } from '@sapphire/plugin-subcommands';
import { container } from '@sapphire/framework';
import { MessageFlags, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { parseVoiceWhereOptions } from '#lib/interaction/typedOptions.js';
import { getJson, CacheKey } from '#lib/cache/index.js';
import { VoiceMemberPresenceSchema } from '#root/modules/voice/domain/types.js';

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

    const lines: string[] = [
      `## Voice Location`,
      `**User:** ${member.displayName} (${options.target.tag})`,
    ];

    if (inVoice && voiceState.channel) {
      const muteStatus = getMuteStatusText(voiceState);
      lines.push(`**Status:** Online`);
      lines.push(`**Channel:** ${voiceState.channel.name}`);
      lines.push(`**Audio:** ${muteStatus}`);

      if (voiceState.streaming) {
        lines.push(`**Streaming:** Yes`);
      }

      if (cached) {
        const joinedAgo = Math.floor((Date.now() - cached.timestamp) / 1000);
        lines.push(`_State tracked for ${formatSeconds(joinedAgo)}_`);
      }
    } else {
      lines.push(`**Status:** Not in voice`);

      if (cached) {
        lines.push(`_Last seen in voice <t:${Math.floor(cached.timestamp / 1000)}:R>_`);
      }
    }

    const containerComp = new ContainerBuilder().addTextDisplayComponents(
      ...lines.map((line) => new TextDisplayBuilder().setContent(line))
    );

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

function getMuteStatusText(voiceState: {
  selfMute: boolean | null;
  selfDeaf: boolean | null;
  serverMute: boolean | null;
  serverDeaf: boolean | null;
}): string {
  const parts: string[] = [];
  if (voiceState.selfMute) parts.push('Self-muted');
  if (voiceState.selfDeaf) parts.push('Self-deafened');
  if (voiceState.serverMute) parts.push('Server-muted');
  if (voiceState.serverDeaf) parts.push('Server-deafened');
  return parts.length > 0 ? parts.join(', ') : 'Unmuted';
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
