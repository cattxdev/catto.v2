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
} from '../domain/types.js';

/**
 * Build watch message components (no emojis)
 */
export function buildWatchMessage(
  session: VoiceWatchSession,
  state: VoiceState,
  guild: Guild
): ContainerBuilder {
  const targetMember = guild.members.cache.get(session.targetId);
  const displayName = targetMember?.displayName ?? session.targetId;
  const channelName = state.channelId
    ? (guild.channels.cache.get(state.channelId)?.name ?? 'Unknown')
    : 'Not in voice';

  const statusIndicator = state.channelId ? '[Online]' : '[Offline]';
  const muteStatus = getMuteStatus(state);

  const lines: string[] = [
    `## Watching: ${displayName}`,
    `${statusIndicator} **Channel:** ${channelName}`,
    `**Audio:** ${muteStatus}`,
  ];

  if (state.streaming) {
    lines.push('**Streaming:** Yes');
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
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`voice_watch_stop:${session.targetId}`)
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
      )
    );

  return containerComp;
}

/**
 * Build track message components (no emojis)
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
      const member = m as { displayName: string; voice?: VoiceState };
      const muteIndicator = member.voice?.selfMute || member.voice?.serverMute ? '[M]' : '';
      const streamIndicator = member.voice?.streaming ? '[S]' : '';
      const indicators = [muteIndicator, streamIndicator].filter(Boolean).join(' ');
      return indicators ? `${member.displayName} ${indicators}` : member.displayName;
    });

  const memberList = memberLines.length > 0 ? memberLines.join('\n') : '_No members_';

  const lines: string[] = [
    `## Tracking: ${voiceChannel.name}`,
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
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`voice_track_stop:${session.channelId}`)
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
      )
    );

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

function getMuteStatus(state: VoiceState): string {
  const parts: string[] = [];
  if (state.selfMute) parts.push('Self-muted');
  if (state.selfDeaf) parts.push('Self-deafened');
  if (state.serverMute) parts.push('Server-muted');
  if (state.serverDeaf) parts.push('Server-deafened');
  return parts.length > 0 ? parts.join(', ') : 'Unmuted';
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
