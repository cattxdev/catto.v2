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
  channelMention,
  userMention,
} from 'discord.js';
import {
  type VoiceWatchSession,
  type VoiceTrackSession,
  VOICE_WATCH_CONFIG,
  VOICE_EMOJI,
} from '../domain/types.js';
import { embeddedActivityTracker } from './embeddedActivity.js';

export interface VoiceIndicatorOptions {
  selfMute?: boolean | null;
  selfDeaf?: boolean | null;
  serverMute?: boolean | null;
  serverDeaf?: boolean | null;
  streaming?: boolean | null;
  selfVideo?: boolean | null;
  // For embedded activity detection
  channelId?: string | null;
}

/**
 * Get voice state emoji indicators for a member.
 *
 * @param voice - Voice state properties (from member.voice)
 * @param userId - Optional user ID to check for embedded activity participation
 *
 * Discord embedded activities (Watch Together, Poker Night, etc.) are detected
 * via raw gateway events (EMBEDDED_ACTIVITY_UPDATE_V2) and tracked in memory.
 */
export function getVoiceIndicators(voice: VoiceIndicatorOptions, userId?: string): string {
  const indicators: string[] = [];

  if (voice.serverMute) {
    indicators.push(VOICE_EMOJI.serverMuted);
  } else if (voice.selfMute) {
    indicators.push(VOICE_EMOJI.muted);
  } else {
    indicators.push(VOICE_EMOJI.unMuted);
  }

  if (voice.serverDeaf) {
    indicators.push(VOICE_EMOJI.serverDeafened);
  } else if (voice.selfDeaf) {
    indicators.push(VOICE_EMOJI.deafened);
  } else {
    indicators.push(VOICE_EMOJI.unDeafened);
  }

  if (voice.streaming) {
    indicators.push(VOICE_EMOJI.serverScreenshare);
  }

  if (voice.selfVideo) {
    indicators.push(VOICE_EMOJI.video);
  }

  // Check for Discord embedded activity (Watch Together, Poker Night, etc.)
  // This is tracked via raw gateway events
  if (userId && voice.channelId) {
    if (embeddedActivityTracker.isUserInActivityInChannel(userId, voice.channelId)) {
      indicators.push(VOICE_EMOJI.activities);
    }
  } else if (userId) {
    // Fallback: check if user is in any activity
    if (embeddedActivityTracker.isUserInActivity(userId)) {
      indicators.push(VOICE_EMOJI.activities);
    }
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

  const voiceIndicators = state.channelId
    ? getVoiceIndicators({ ...state, channelId: state.channelId }, session.targetId)
    : '';

  const lines: string[] = [`## ${VOICE_EMOJI.member} ${displayName}`];

  if (state.channelId && channel) {
    lines.push(`**Channel:** ${channelMention(state.channelId)}`);
    lines.push(`**State:** ${voiceIndicators}`);
    // Show explicit indicators for streaming, video, and activities
    if (state.streaming) {
      lines.push(`${VOICE_EMOJI.serverScreenshare} **Streaming**`);
    }
    if (state.selfVideo) {
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
        `${VOICE_EMOJI.timeDay} <t:${Math.floor(session.endsAt / 1000)}:R> • Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    );

  // All buttons in one row (max 5 per row)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_watch_stop:${session.targetId}`)
      .setEmoji(VOICE_EMOJI.soundPause)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_refresh_watch:${session.targetId}`)
      .setEmoji(VOICE_EMOJI.replay)
      .setStyle(ButtonStyle.Secondary)
  );

  if (state.channelId) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_join:${state.channelId}`)
        .setEmoji(VOICE_EMOJI.connectToUser)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_mute:${session.targetId}`)
        .setEmoji(VOICE_EMOJI.voiceToggle)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_disconnect:${session.targetId}`)
        .setEmoji(VOICE_EMOJI.disconnectUser)
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
      const member = m as {
        id: string;
        displayName: string;
        voice?: VoiceState;
      };
      const indicators = getVoiceIndicators(
        { ...(member.voice ?? {}), channelId: session.channelId },
        member.id
      );
      return `${indicators} ${userMention(member.id)}`;
    });

  const memberList = memberLines.length > 0 ? memberLines.join('\n') : '_No members_';

  // IMPORTANT: TextDisplayBuilder.setContent() does NOT accept empty strings!
  // This is a recurring validation error. Always filter or use non-empty strings.
  const lines: string[] = [
    `## ${VOICE_EMOJI.channelVoice} ${voiceChannel.name}`,
    `**Channel:** ${channelMention(session.channelId)}`,
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
        `${VOICE_EMOJI.timeDay} <t:${Math.floor(session.endsAt / 1000)}:R> • Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    );

  // All buttons in one row
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_track_stop:${session.channelId}`)
      .setEmoji(VOICE_EMOJI.soundPause)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_refresh_track:${session.channelId}`)
      .setEmoji(VOICE_EMOJI.replay)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`voice_join:${session.channelId}`)
      .setEmoji(VOICE_EMOJI.connectToUser)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`voice_mute_all:${session.channelId}`)
      .setLabel('All')
      .setEmoji(VOICE_EMOJI.serverMuted)
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
