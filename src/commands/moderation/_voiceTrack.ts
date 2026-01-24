import { Subcommand } from '@sapphire/plugin-subcommands';
import { container as sapphireContainer } from '@sapphire/framework';
import { parseVoiceTrackOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceTrackSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  type VoiceTrackSession,
} from '#root/modules/voice/domain/types.js';
import { ephemeralError, editError, editReply, defer } from '#lib/discord/index.js';
import { registerSession } from '#root/modules/voice/services/voiceUpdate.js';
import { buildTrackMessageFromParams } from '#root/modules/voice/services/messageBuilders.js';

export async function handleVoiceTrack(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseVoiceTrackOptions(interaction);
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

  await defer(interaction).public();

  try {
    const voiceChannel = options.channel;
    const now = Date.now();
    const endsAt = now + options.durationSeconds * 1000;

    const c = buildTrackMessageFromParams({
      channelId: options.channelId,
      channelName: voiceChannel.name,
      members: voiceChannel.members,
      endsAt,
      updateCount: 0,
    });

    const reply = await editReply(interaction, c);

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
