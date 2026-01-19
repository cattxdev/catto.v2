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
  channelMention,
  type GuildMember,
} from 'discord.js';
import { parseVoiceWatchOptions, type VoiceWatchOptions } from '#lib/interaction/typedOptions.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceWatchSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  VOICE_EMOJI,
  type VoiceWatchSession,
} from '#root/modules/voice/domain/types.js';
import { registerSession } from '#root/modules/voice/services/voiceUpdate.js';
import {
  getVoiceIndicators,
  formatMemberName,
} from '#root/modules/voice/services/messageBuilders.js';

export async function handleVoiceWatch(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceWatchOptions(interaction);

  if (!options) {
    await interaction.reply({
      content: 'Invalid duration format. Use formats like: 1m, 5m, 10m, 15m',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (options.durationSeconds < VOICE_WATCH_CONFIG.minDurationSeconds) {
    await interaction.reply({
      content: `Minimum watch duration is ${VOICE_WATCH_CONFIG.minDurationSeconds / 60} minute(s).`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (options.durationSeconds > VOICE_WATCH_CONFIG.maxDurationSeconds) {
    await interaction.reply({
      content: `Maximum watch duration is ${VOICE_WATCH_CONFIG.maxDurationSeconds / 60} minutes.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
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
    const now = Date.now();
    const endsAt = now + options.durationSeconds * 1000;

    const containerComp = buildWatchMessage(options, member, voiceState, endsAt, 0);

    const reply = await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
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

    await container.redis.sadd(
      CacheKey.voiceWatchByTarget(options.guildId, options.targetId),
      interaction.id
    );
    await container.redis.expire(
      CacheKey.voiceWatchByTarget(options.guildId, options.targetId),
      VOICE_CACHE_TTL.watchSession
    );

    registerSession('watch', options.guildId, interaction.id);
  } catch (error) {
    container.logger.error('Error in voice watch command:', error);
    await interaction.editReply({
      content: 'An error occurred while starting the watch.',
    });
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
): ContainerBuilder {
  const displayName = formatMemberName(member);

  const lines: string[] = [`## ${VOICE_EMOJI.member} ${displayName}`];

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
    lines.push(`**Channel:** ${channelMention(voiceState.channelId)}`);
    lines.push(`**State:** ${indicators}`);

    // Show explicit indicators for streaming, video, and activities
    if (voiceState.streaming) {
      lines.push(`${VOICE_EMOJI.serverScreenshare} **Streaming**`);
    }
    if (voiceState.selfVideo) {
      lines.push(`${VOICE_EMOJI.video} **Video**`);
    }
  } else {
    lines.push('_Not in a voice channel_');
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
    );

  // All buttons in one row (max 5 per row)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_watch_stop:${options.targetId}`)
      .setEmoji(VOICE_EMOJI.soundPause)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_refresh_watch:${options.targetId}`)
      .setEmoji(VOICE_EMOJI.replay)
      .setStyle(ButtonStyle.Secondary)
  );

  if (voiceState.channelId) {
    actionRow.addComponents(
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
  }

  containerComp.addActionRowComponents(actionRow);

  return containerComp;
}
