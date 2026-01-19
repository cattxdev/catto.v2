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
} from 'discord.js';
import { parseVoiceWatchOptions, type VoiceWatchOptions } from '#lib/interaction/typedOptions.js';
import { setJson, CacheKey } from '#lib/cache/index.js';
import {
  VoiceWatchSessionSchema,
  VOICE_WATCH_CONFIG,
  VOICE_CACHE_TTL,
  type VoiceWatchSession,
} from '#root/modules/voice/domain/types.js';

export async function handleVoiceWatch(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseVoiceWatchOptions(interaction);

  if (!options) {
    await interaction.reply({
      content: '❌ Invalid duration format. Use formats like: 1m, 5m, 10m, 15m',
      ephemeral: true,
    });
    return;
  }

  // Validate duration bounds
  if (options.durationSeconds < VOICE_WATCH_CONFIG.minDurationSeconds) {
    await interaction.reply({
      content: `❌ Minimum watch duration is ${VOICE_WATCH_CONFIG.minDurationSeconds / 60} minute(s).`,
      ephemeral: true,
    });
    return;
  }

  if (options.durationSeconds > VOICE_WATCH_CONFIG.maxDurationSeconds) {
    await interaction.reply({
      content: `❌ Maximum watch duration is ${VOICE_WATCH_CONFIG.maxDurationSeconds / 60} minutes.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    // Fetch target member
    let member;
    try {
      member = await options.guild.members.fetch(options.targetId);
    } catch {
      await interaction.editReply({
        content: `❌ User **${options.target.tag}** is not a member of this server.`,
      });
      return;
    }

    const voiceState = member.voice;
    const now = Date.now();
    const endsAt = now + options.durationSeconds * 1000;

    // Build initial message
    const containerComp = buildWatchMessage(options, member, voiceState, now, endsAt, 0);

    const reply = await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });

    // Store watch session in Redis
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

    // Store session
    await setJson(
      CacheKey.voiceWatch(options.guildId, interaction.id),
      VoiceWatchSessionSchema,
      session,
      VOICE_CACHE_TTL.watchSession
    );

    // Add to target index for lookup during voice state updates
    await container.redis.sadd(
      CacheKey.voiceWatchByTarget(options.guildId, options.targetId),
      interaction.id
    );
    await container.redis.expire(
      CacheKey.voiceWatchByTarget(options.guildId, options.targetId),
      VOICE_CACHE_TTL.watchSession
    );
  } catch (error) {
    container.logger.error('Error in voice watch command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while starting the watch.',
    });
  }
}

function buildWatchMessage(
  options: VoiceWatchOptions,
  member: { displayName: string },
  voiceState: {
    channelId: string | null;
    channel?: { name: string } | null;
    selfMute: boolean | null;
    selfDeaf: boolean | null;
    serverMute: boolean | null;
    serverDeaf: boolean | null;
    streaming: boolean | null;
  },
  _now: number,
  endsAt: number,
  updateCount: number
): ContainerBuilder {
  const displayName = member.displayName;
  const channelName = voiceState.channelId
    ? (voiceState.channel?.name ?? 'Unknown')
    : 'Not in voice';

  const statusEmoji = voiceState.channelId ? '🟢' : '🔴';
  const muteStatus = getMuteStatus(voiceState);

  const containerComp = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 👁️ Watching: ${displayName}`),
    new TextDisplayBuilder().setContent(`**Target:** ${options.target.tag}`),
    new TextDisplayBuilder().setContent(`${statusEmoji} **Channel:** ${channelName}`),
    new TextDisplayBuilder().setContent(`🔇 **Status:** ${muteStatus}`)
  );

  if (voiceState.streaming) {
    containerComp.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('📺 **Currently Streaming**')
    );
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
          .setCustomId(`voice_watch_stop:${options.targetId}`)
          .setLabel('Stop Watching')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⏹️')
      )
    );

  return containerComp;
}

function getMuteStatus(voiceState: {
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
