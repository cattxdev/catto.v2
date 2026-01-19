import { Subcommand } from '@sapphire/plugin-subcommands';
import { container } from '@sapphire/framework';
import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type GuildMember,
  channelMention,
  userMention,
} from 'discord.js';
import { parseVoiceTrackOptions, type VoiceTrackOptions } from '#lib/interaction/typedOptions.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceTrackSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  VOICE_EMOJI,
  type VoiceTrackSession,
} from '#root/modules/voice/domain/types.js';
import { registerSession } from '#root/modules/voice/services/voiceUpdate.js';
import { getVoiceIndicators } from '#root/modules/voice/services/messageBuilders.js';

export async function handleVoiceTrack(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceTrackOptions(interaction);

  if (!options) {
    await interaction.reply({
      content:
        'Invalid channel or duration. Please select a voice channel and use formats like: 1m, 5m, 10m, 15m',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (options.durationSeconds < VOICE_WATCH_CONFIG.minDurationSeconds) {
    await interaction.reply({
      content: `Minimum track duration is ${VOICE_WATCH_CONFIG.minDurationSeconds / 60} minute(s).`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (options.durationSeconds > VOICE_WATCH_CONFIG.maxDurationSeconds) {
    await interaction.reply({
      content: `Maximum track duration is ${VOICE_WATCH_CONFIG.maxDurationSeconds / 60} minutes.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const voiceChannel = options.channel;
    const now = Date.now();
    const endsAt = now + options.durationSeconds * 1000;

    const containerComp = buildTrackMessage(options, voiceChannel, endsAt, 0);

    const reply = await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });

    const session: VoiceTrackSession = {
      channelId: options.channelId,
      startedAt: now,
      endsAt,
      lastUpdateAt: now,
      messageId: reply.id,
      channelIdMessage: interaction.channelId,
      updateCount: 0,
    };

    await setJson(
      CacheKey.voiceTrack(options.guildId, interaction.id),
      VoiceTrackSessionSchema,
      session,
      VOICE_CACHE_TTL.trackSession
    );

    await container.redis.sadd(
      CacheKey.voiceTrackByChannel(options.guildId, options.channelId),
      interaction.id
    );
    await container.redis.expire(
      CacheKey.voiceTrackByChannel(options.guildId, options.channelId),
      VOICE_CACHE_TTL.trackSession
    );

    registerSession('track', options.guildId, interaction.id);
  } catch (error) {
    container.logger.error('Error in voice track command:', error);
    await interaction.editReply({
      content: 'An error occurred while starting the track.',
    });
  }
}

function buildTrackMessage(
  options: VoiceTrackOptions,
  voiceChannel: { name: string; members: Map<string, GuildMember> },
  endsAt: number,
  updateCount: number
): ContainerBuilder {
  const members = voiceChannel.members;
  const memberCount = members.size;

  const memberLines = Array.from(members.values())
    .slice(0, 10)
    .map((member: GuildMember) => {
      const indicators = getVoiceIndicators(
        { ...member.voice, channelId: options.channelId },
        member.id
      );
      return `${indicators} ${userMention(member.id)}`;
    });

  const memberList = memberLines.length > 0 ? memberLines.join('\n') : '_No members_';

  // IMPORTANT: TextDisplayBuilder.setContent() does NOT accept empty strings!
  // This is a recurring validation error. Always filter or use non-empty strings.
  const lines: string[] = [
    `## ${VOICE_EMOJI.channelVoice} ${voiceChannel.name}`,
    `**Channel:** ${channelMention(options.channelId)}`,
    `**Members:** ${memberCount}`,
    memberList,
  ];

  if (memberCount > 10) {
    lines.push(`_... and ${memberCount - 10} more_`);
  }

  const containerComp = new ContainerBuilder().addTextDisplayComponents(
    ...lines.map((line) => new TextDisplayBuilder().setContent(line))
  );

  containerComp
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${VOICE_EMOJI.timeDay} <t:${Math.floor(endsAt / 1000)}:R> • Updates: ${updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`voice_track_stop:${options.channelId}`)
          .setEmoji(VOICE_EMOJI.soundPause)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`voice_refresh_track:${options.channelId}`)
          .setEmoji(VOICE_EMOJI.replay)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`voice_join:${options.channelId}`)
          .setEmoji(VOICE_EMOJI.connectToUser)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`voice_mute_all:${options.channelId}`)
          .setLabel('All')
          .setEmoji(VOICE_EMOJI.serverMuted)
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return containerComp;
}
