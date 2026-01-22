import { Subcommand } from '@sapphire/plugin-subcommands';
import { container as sapphireContainer } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  type GuildMember,
} from 'discord.js';
import { parseVoiceWatchOptions, type VoiceWatchOptions } from '#lib/interaction/typedOptions.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceWatchSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  type VoiceWatchSession,
} from '#root/modules/voice/domain/types.js';
import {
  EMOJI,
  ephemeralError,
  editError,
  container,
  editReply,
  type FluentContainer,
} from '#lib/discord/index.js';
import { registerSession } from '#root/modules/voice/services/voiceUpdate.js';
import {
  getVoiceIndicators,
  formatMemberName,
} from '#root/modules/voice/services/messageBuilders.js';

export async function handleVoiceWatch(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceWatchOptions(interaction);

  if (!options) {
    await interaction.reply(
      ephemeralError('Invalid duration format. Use formats like: 1m, 5m, 10m, 15m')
    );
    return;
  }

  if (options.durationSeconds < VOICE_WATCH_CONFIG.minDurationSeconds) {
    await interaction.reply(
      ephemeralError(
        `Minimum watch duration is ${VOICE_WATCH_CONFIG.minDurationSeconds / 60} minute(s).`
      )
    );
    return;
  }

  if (options.durationSeconds > VOICE_WATCH_CONFIG.maxDurationSeconds) {
    await interaction.reply(
      ephemeralError(
        `Maximum watch duration is ${VOICE_WATCH_CONFIG.maxDurationSeconds / 60} minutes.`
      )
    );
    return;
  }

  await interaction.deferReply();

  try {
    let member;
    try {
      member = await options.guild.members.fetch(options.targetId);
    } catch {
      await editReply(
        interaction,
        container().text(`User **${options.target.tag}** is not a member of this server.`)
      );
      return;
    }

    const voiceState = member.voice;
    const now = Date.now();
    const endsAt = now + options.durationSeconds * 1000;

    const c = buildWatchMessage(options, member, voiceState, endsAt, 0);

    const reply = await interaction.editReply({
      components: [c.build()],
      allowedMentions: { parse: [] },
    });

    const session: VoiceWatchSession = {
      targetId: options.targetId,
      channelId: voiceState.channelId,
      startedAt: now,
      endsAt,
      lastUpdateAt: now,
      messageId: reply.id,
      channelIdMessage: interaction.channelId,
      updateCount: 0,
    };

    await setJson(
      CacheKey.voiceWatch(options.guildId, interaction.id),
      VoiceWatchSessionSchema,
      session,
      VOICE_CACHE_TTL.watchSession
    );

    await sapphireContainer.redis.sadd(
      CacheKey.voiceWatchByTarget(options.guildId, options.targetId),
      interaction.id
    );
    await sapphireContainer.redis.expire(
      CacheKey.voiceWatchByTarget(options.guildId, options.targetId),
      VOICE_CACHE_TTL.watchSession
    );

    registerSession('watch', options.guildId, interaction.id);
  } catch (error) {
    sapphireContainer.logger.error('Error in voice watch command:', error);
    await interaction
      .editReply(editError('An error occurred while starting the watch.'))
      .catch(() => {});
  }
}

function buildWatchMessage(
  options: VoiceWatchOptions,
  member: GuildMember,
  voiceState: {
    channelId: string | null;
    channel?: { name: string } | null;
    selfMute: boolean | null;
    selfDeaf: boolean | null;
    serverMute: boolean | null;
    serverDeaf: boolean | null;
    streaming: boolean | null;
    selfVideo: boolean | null;
  },
  endsAt: number,
  updateCount: number
): FluentContainer {
  const displayName = formatMemberName(member);

  const c = container().h2(`${EMOJI.MEMBER} ${displayName}`);

  if (voiceState.channelId && voiceState.channel) {
    const indicators = getVoiceIndicators(
      {
        selfMute: voiceState.selfMute ?? false,
        selfDeaf: voiceState.selfDeaf ?? false,
        serverMute: voiceState.serverMute ?? false,
        serverDeaf: voiceState.serverDeaf ?? false,
        selfVideo: voiceState.selfVideo ?? false,
        channelId: voiceState.channelId,
      },
      options.targetId
    );
    c.kv({
      Channel: channelMention(voiceState.channelId),
      State: indicators,
    });

    // Show explicit indicators for streaming, video, and activities
    if (voiceState.streaming) {
      c.text(`${EMOJI.VOICE_SERVER_SCREENSHARE} **Streaming**`);
    }
    if (voiceState.selfVideo) {
      c.text(`${EMOJI.VOICE_VIDEO} **Video**`);
    }
  } else {
    c.text('_Not in a voice channel_');
  }

  c.separator().text(
    `${EMOJI.TIME_DAY} <t:${Math.floor(endsAt / 1000)}:R> • Updates: ${updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
  );

  // All buttons in one row (max 5 per row)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_watch_stop:${options.targetId}`)
      .setEmoji(EMOJI.VOICE_SOUND_PAUSE)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_refresh_watch:${options.targetId}`)
      .setEmoji(EMOJI.REPLAY)
      .setStyle(ButtonStyle.Secondary)
  );

  if (voiceState.channelId) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_join:${voiceState.channelId}`)
        .setEmoji(EMOJI.CONNECT_TO_USER)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_mute:${options.targetId}`)
        .setEmoji(EMOJI.VOICE_TOGGLE)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_disconnect:${options.targetId}`)
        .setEmoji(EMOJI.DISCONNECT_USER)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  c.actions(actionRow);

  return c;
}
