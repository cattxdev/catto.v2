import { Subcommand } from '@sapphire/plugin-subcommands';
import { container as sapphireContainer } from '@sapphire/framework';
import { parseVoiceWatchOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceWatchSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  type VoiceWatchSession,
} from '#root/modules/voice/domain/types.js';
import { ephemeralError, editError, container, editReply, defer } from '#lib/discord/index.js';
import { registerSession } from '#root/modules/voice/services/voiceUpdate.js';
import {
  formatMemberName,
  buildWatchMessageFromParams,
} from '#root/modules/voice/services/messageBuilders.js';

export async function handleVoiceWatch(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseVoiceWatchOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
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

  await defer(interaction).public();

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

    const c = buildWatchMessageFromParams({
      targetId: options.targetId,
      displayName: formatMemberName(member),
      voiceState: {
        channelId: voiceState.channelId,
        channel: voiceState.channel,
        selfMute: voiceState.selfMute,
        selfDeaf: voiceState.selfDeaf,
        serverMute: voiceState.serverMute,
        serverDeaf: voiceState.serverDeaf,
        streaming: voiceState.streaming,
        selfVideo: voiceState.selfVideo,
      },
      endsAt,
      updateCount: 0,
    });

    const reply = await editReply(interaction, c);

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
