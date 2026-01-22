import { Subcommand } from '@sapphire/plugin-subcommands';
import { container as sapphireContainer } from '@sapphire/framework';
import {
  type GuildMember,
  channelMention,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { parseVoiceTrackOptions, type VoiceTrackOptions } from '#lib/interaction/typedOptions.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceTrackSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  type VoiceTrackSession,
} from '#root/modules/voice/domain/types.js';
import {
  EMOJI,
  ephemeralError,
  editError,
  container,
  type FluentContainer,
} from '#lib/discord/index.js';
import { registerSession } from '#root/modules/voice/services/voiceUpdate.js';
import { formatVoiceMemberLine } from '#root/modules/voice/services/messageBuilders.js';

export async function handleVoiceTrack(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceTrackOptions(interaction);

  if (!options) {
    await interaction.reply(
      ephemeralError(
        'Invalid channel or duration. Please select a voice channel and use formats like: 1m, 5m, 10m, 15m'
      )
    );
    return;
  }

  if (options.durationSeconds < VOICE_WATCH_CONFIG.minDurationSeconds) {
    await interaction.reply(
      ephemeralError(
        `Minimum track duration is ${VOICE_WATCH_CONFIG.minDurationSeconds / 60} minute(s).`
      )
    );
    return;
  }

  if (options.durationSeconds > VOICE_WATCH_CONFIG.maxDurationSeconds) {
    await interaction.reply(
      ephemeralError(
        `Maximum track duration is ${VOICE_WATCH_CONFIG.maxDurationSeconds / 60} minutes.`
      )
    );
    return;
  }

  await interaction.deferReply();

  try {
    const voiceChannel = options.channel;
    const now = Date.now();
    const endsAt = now + options.durationSeconds * 1000;

    const c = buildTrackMessage(options, voiceChannel, endsAt, 0);

    const reply = await interaction.editReply({
      components: [c.build()],
      allowedMentions: { parse: [] },
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

    await sapphireContainer.redis.sadd(
      CacheKey.voiceTrackByChannel(options.guildId, options.channelId),
      interaction.id
    );
    await sapphireContainer.redis.expire(
      CacheKey.voiceTrackByChannel(options.guildId, options.channelId),
      VOICE_CACHE_TTL.trackSession
    );

    registerSession('track', options.guildId, interaction.id);
  } catch (error) {
    sapphireContainer.logger.error('Error in voice track command:', error);
    await interaction
      .editReply(editError('An error occurred while starting the track.'))
      .catch(() => {});
  }
}

function buildTrackMessage(
  options: VoiceTrackOptions,
  voiceChannel: { name: string; members: Map<string, GuildMember> },
  endsAt: number,
  updateCount: number
): FluentContainer {
  const members = voiceChannel.members;
  const memberCount = members.size;

  const memberLines = Array.from(members.values())
    .slice(0, 10)
    .map((member: GuildMember) =>
      formatVoiceMemberLine(member, { useMention: true, channelId: options.channelId })
    );

  const memberList = memberLines.length > 0 ? memberLines.join('\n') : '_No members_';

  const c = container()
    .h2(`${EMOJI.VOICE} ${voiceChannel.name}`)
    .kv({
      Channel: channelMention(options.channelId),
      Members: memberCount.toString(),
    })
    .text(memberList);

  if (memberCount > 10) {
    c.text(`_... and ${memberCount - 10} more_`);
  }

  c.separator().text(
    `${EMOJI.TIME_DAY} <t:${Math.floor(endsAt / 1000)}:R> • Updates: ${updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
  );

  // All buttons in one row
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_track_stop:${options.channelId}`)
      .setEmoji(EMOJI.VOICE_SOUND_PAUSE)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_refresh_track:${options.channelId}`)
      .setEmoji(EMOJI.REPLAY)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`voice_join:${options.channelId}`)
      .setEmoji(EMOJI.CONNECT_TO_USER)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`voice_mute_all:${options.channelId}`)
      .setLabel('All')
      .setEmoji(EMOJI.VOICE_SERVER_MUTED)
      .setStyle(ButtonStyle.Secondary)
  );

  c.actions(actionRow);

  return c;
}
