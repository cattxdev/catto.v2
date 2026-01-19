import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
  type Guild,
  type VoiceState,
} from 'discord.js';
import {
  type VoiceWatchSession,
  type VoiceTrackSession,
  VOICE_WATCH_CONFIG,
  VOICE_EMOJI,
} from '../domain/types.js';

/**
 * Get voice state emoji indicators for a member
 */
export function getVoiceIndicators(voice: {
  selfMute?: boolean | null;
  selfDeaf?: boolean | null;
  serverMute?: boolean | null;
  serverDeaf?: boolean | null;
  streaming?: boolean | null;
}): string {
  const indicators: string[] = [];

  if (voice.serverMute) {
    indicators.push(VOICE_EMOJI.serverMute);
  } else if (voice.selfMute) {
    indicators.push(VOICE_EMOJI.selfMute);
  } else {
    indicators.push(VOICE_EMOJI.unMute);
  }

  if (voice.serverDeaf) {
    indicators.push(VOICE_EMOJI.serverDeaf);
  } else if (voice.selfDeaf) {
    indicators.push(VOICE_EMOJI.selfDeaf);
  }

  return indicators.join(' ');
}

/**
 * Build watch message components with utility buttons
 */
export function buildWatchMessage(
  session: VoiceWatchSession,
  state: VoiceState,
  guild: Guild
): ContainerBuilder {
  const targetMember = guild.members.cache.get(session.targetId);
  const displayName = targetMember?.displayName ?? session.targetId;
  const channel = state.channelId ? guild.channels.cache.get(state.channelId) : null;
  const channelName = channel?.name ?? 'Not in voice';

  const channelIcon = channel ? VOICE_EMOJI.channelVoice : '';
  const voiceIndicators = state.channelId ? getVoiceIndicators(state) : '';

  const lines: string[] = [`## Watching: ${displayName}`];

  if (state.channelId && channel) {
    lines.push(`${channelIcon} **${channelName}** ${voiceIndicators}`);
    if (state.streaming) {
      lines.push('**Streaming**');
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
        `Ends <t:${Math.floor(session.endsAt / 1000)}:R> | Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    );

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_watch_stop:${session.targetId}`)
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
  );

  if (state.channelId) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_join:${state.channelId}`)
        .setLabel('Join')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_mute:${session.targetId}`)
        .setLabel('Mute')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_disconnect:${session.targetId}`)
        .setLabel('Disconnect')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  containerComp.addActionRowComponents(actionRow);

  return containerComp;
}

/**
 * Build track message components with utility buttons
 */
export function buildTrackMessage(
  session: VoiceTrackSession,
  voiceChannel: { name: string; members?: Map<string, unknown> },
  guild: Guild
): ContainerBuilder {
  const channel = guild.channels.cache.get(session.channelId);
  const members = channel?.isVoiceBased() ? channel.members : new Map();
  const memberCount = members.size;

  const memberLines = Array.from(members.values())
    .slice(0, 10)
    .map((m) => {
      const member = m as { id: string; displayName: string; voice?: VoiceState };
      const indicators = getVoiceIndicators(member.voice ?? {});
      return `${indicators} ${member.displayName}`;
    });

  const memberList = memberLines.length > 0 ? memberLines.join('\n') : '_No members_';

  const lines: string[] = [
    `## ${VOICE_EMOJI.channelVoice} ${voiceChannel.name}`,
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
        `Ends <t:${Math.floor(session.endsAt / 1000)}:R> | Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    );

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_track_stop:${session.channelId}`)
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_join:${session.channelId}`)
      .setLabel('Join')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`voice_mute_all:${session.channelId}`)
      .setLabel('Mute All')
      .setStyle(ButtonStyle.Secondary)
  );

  containerComp.addActionRowComponents(actionRow);

  return containerComp;
}

/**
 * Build ended watch message
 */
export function buildWatchEndedMessage(
  displayName: string,
  reason: string,
  durationMs: number,
  updateCount: number
): ContainerBuilder {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## Watch Ended: ${displayName}`),
    new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
    new TextDisplayBuilder().setContent(
      `**Duration:** ${formatDuration(durationMs)} | **Updates:** ${updateCount}`
    )
  );
}

/**
 * Build ended track message
 */
export function buildTrackEndedMessage(
  channelName: string,
  reason: string,
  durationMs: number,
  updateCount: number
): ContainerBuilder {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## Track Ended: ${channelName}`),
    new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
    new TextDisplayBuilder().setContent(
      `**Duration:** ${formatDuration(durationMs)} | **Updates:** ${updateCount}`
    )
  );
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
