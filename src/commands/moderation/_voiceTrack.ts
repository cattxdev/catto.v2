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
} from 'discord.js';
import { parseVoiceTrackOptions, type VoiceTrackOptions } from '#lib/interaction/typedOptions.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceTrackSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  type VoiceTrackSession,
} from '#root/modules/voice/domain/types.js';

export async function handleVoiceTrack(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceTrackOptions(interaction);

  if (!options) {
    await interaction.reply({
      content:
        '❌ Invalid channel or duration. Please select a voice channel and use formats like: 1m, 5m, 10m, 15m',
      ephemeral: true,
    });
    return;
  }

  // Validate duration bounds
  if (options.durationSeconds < VOICE_WATCH_CONFIG.minDurationSeconds) {
    await interaction.reply({
      content: `❌ Minimum track duration is ${VOICE_WATCH_CONFIG.minDurationSeconds / 60} minute(s).`,
      ephemeral: true,
    });
    return;
  }

  if (options.durationSeconds > VOICE_WATCH_CONFIG.maxDurationSeconds) {
    await interaction.reply({
      content: `❌ Maximum track duration is ${VOICE_WATCH_CONFIG.maxDurationSeconds / 60} minutes.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const voiceChannel = options.channel;
    const now = Date.now();
    const endsAt = now + options.durationSeconds * 1000;

    // Build initial message
    const containerComp = buildTrackMessage(options, voiceChannel, endsAt, 0);

    const reply = await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });

    // Store track session in Redis
    const session: VoiceTrackSession = {
      channelId: options.channelId,
      startedAt: now,
      endsAt,
      lastUpdateAt: now,
      messageId: reply.id,
      channelIdMessage: interaction.channelId,
      updateCount: 0,
    };

    // Store session
    await setJson(
      CacheKey.voiceTrack(options.guildId, interaction.id),
      VoiceTrackSessionSchema,
      session,
      VOICE_CACHE_TTL.trackSession
    );

    // Add to channel index for lookup during voice state updates
    await container.redis.sadd(
      CacheKey.voiceTrackByChannel(options.guildId, options.channelId),
      interaction.id
    );
    await container.redis.expire(
      CacheKey.voiceTrackByChannel(options.guildId, options.channelId),
      VOICE_CACHE_TTL.trackSession
    );
  } catch (error) {
    container.logger.error('Error in voice track command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while starting the track.',
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

  const memberList = Array.from(members.values())
    .slice(0, 10)
    .map((member: GuildMember) => {
      const muteEmoji = member.voice.selfMute || member.voice.serverMute ? '🔇' : '🔊';
      const streamEmoji = member.voice.streaming ? '📺' : '';
      return `${muteEmoji} ${member.displayName} ${streamEmoji}`;
    })
    .join('\n');

  const moreCount = memberCount > 10 ? `\n_... and ${memberCount - 10} more_` : '';

  const containerComp = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 📡 Tracking: ${voiceChannel.name}`),
    new TextDisplayBuilder().setContent(`👥 **Members:** ${memberCount}`),
    new TextDisplayBuilder().setContent(memberList || '_No members in channel_')
  );

  if (moreCount) {
    containerComp.addTextDisplayComponents(new TextDisplayBuilder().setContent(moreCount));
  }

  containerComp
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⏱️ Ends <t:${Math.floor(endsAt / 1000)}:R> • Updates: ${updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`voice_track_stop:${options.channelId}`)
          .setLabel('Stop Tracking')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⏹️')
      )
    );

  return containerComp;
}
