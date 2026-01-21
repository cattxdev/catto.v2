import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
  PermissionFlagsBits,
  type Guild,
  type VoiceState,
  type GuildMember,
  type PermissionResolvable,
  channelMention,
  userMention,
} from 'discord.js';
import {
  type VoiceWatchSession,
  type VoiceTrackSession,
  VOICE_WATCH_CONFIG,
} from '../domain/types.js';
import { EMOJI } from '#lib/discord/index.js';
import { embeddedActivityTracker } from './embeddedActivity.js';

/**
 * Voice moderation permissions that qualify a member for the mod shield indicator
 */
const VOICE_MOD_PERMISSIONS: PermissionResolvable[] = [
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.KickMembers,
];

/**
 * Check if a member has voice moderation permissions (mute/deafen, move, kick)
 */
export function hasVoiceModPermissions(member: GuildMember): boolean {
  return VOICE_MOD_PERMISSIONS.every((perm) => member.permissions.has(perm));
}

/**
 * Get the mod shield indicator if a member has voice moderation permissions
 */
export function getModShieldIndicator(member: GuildMember): string {
  return hasVoiceModPermissions(member) ? EMOJI.MOD_SHIELD : '';
}

/**
 * Format a member's display name with mod shield if applicable
 */
export function formatMemberName(member: GuildMember): string {
  const modShield = getModShieldIndicator(member);
  return modShield ? `${member.displayName}` : member.displayName;
}

/**
 * Format a member line with voice indicators and optional mod shield
 */
export function formatVoiceMemberLine(
  member: GuildMember,
  options?: { useMention?: boolean; channelId?: string | null }
): string {
  const indicators = getVoiceIndicators(
    { ...member.voice, channelId: options?.channelId ?? member.voice.channelId },
    member.id
  );
  const modShield = getModShieldIndicator(member);
  const nameDisplay = options?.useMention ? userMention(member.id) : member.displayName;

  return `${indicators} ${nameDisplay} ${modShield}${modShield ? ' ' : ''}`;
}

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
    indicators.push(EMOJI.VOICE_SERVER_MUTED);
  } else if (voice.selfMute) {
    indicators.push(EMOJI.VOICE_MUTED);
  } else {
    indicators.push(EMOJI.VOICE_UNMUTED);
  }

  if (voice.serverDeaf) {
    indicators.push(EMOJI.VOICE_SERVER_DEAFENED);
  } else if (voice.selfDeaf) {
    indicators.push(EMOJI.VOICE_DEAFENED);
  } else {
    indicators.push(EMOJI.VOICE_UNDEAFENED);
  }

  if (voice.streaming) {
    indicators.push(EMOJI.VOICE_SERVER_SCREENSHARE);
  }

  if (voice.selfVideo) {
    indicators.push(EMOJI.VOICE_VIDEO);
  }

  // Check for Discord embedded activity (Watch Together, Poker Night, etc.)
  // This is tracked via raw gateway events
  if (userId && voice.channelId) {
    if (embeddedActivityTracker.isUserInActivityInChannel(userId, voice.channelId)) {
      indicators.push(EMOJI.VOICE_ACTIVITIES);
    }
  } else if (userId) {
    // Fallback: check if user is in any activity
    if (embeddedActivityTracker.isUserInActivity(userId)) {
      indicators.push(EMOJI.VOICE_ACTIVITIES);
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
  const displayName = targetMember ? formatMemberName(targetMember) : session.targetId;
  const channel = state.channelId ? guild.channels.cache.get(state.channelId) : null;

  const voiceIndicators = state.channelId
    ? getVoiceIndicators({ ...state, channelId: state.channelId }, session.targetId)
    : '';

  const lines: string[] = [`## ${EMOJI.MEMBER} ${displayName}`];

  if (state.channelId && channel) {
    lines.push(`**Channel:** ${channelMention(state.channelId)}`);
    lines.push(`**State:** ${voiceIndicators}`);
    // Show explicit indicators for streaming, video, and activities
    if (state.streaming) {
      lines.push(`${EMOJI.VOICE_SERVER_SCREENSHARE} **Streaming**`);
    }
    if (state.selfVideo) {
      lines.push(`${EMOJI.VOICE_VIDEO} **Video**`);
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
        `${EMOJI.TIME_DAY} <t:${Math.floor(session.endsAt / 1000)}:R> • Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    );

  // All buttons in one row (max 5 per row)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_watch_stop:${session.targetId}`)
      .setEmoji(EMOJI.VOICE_SOUND_PAUSE)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_refresh_watch:${session.targetId}`)
      .setEmoji(EMOJI.REPLAY)
      .setStyle(ButtonStyle.Secondary)
  );

  if (state.channelId) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_join:${state.channelId}`)
        .setEmoji(EMOJI.CONNECT_TO_USER)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_mute:${session.targetId}`)
        .setEmoji(EMOJI.VOICE_TOGGLE)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_disconnect:${session.targetId}`)
        .setEmoji(EMOJI.DISCONNECT_USER)
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
      const member = m as GuildMember;
      return formatVoiceMemberLine(member, { useMention: true, channelId: session.channelId });
    });

  const memberList = memberLines.length > 0 ? memberLines.join('\n') : '_No members_';

  // IMPORTANT: TextDisplayBuilder.setContent() does NOT accept empty strings!
  // This is a recurring validation error. Always filter or use non-empty strings.
  const lines: string[] = [
    `## ${EMOJI.VOICE} ${voiceChannel.name}`,
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
        `${EMOJI.TIME_DAY} <t:${Math.floor(session.endsAt / 1000)}:R> • Updates: ${session.updateCount}/${VOICE_WATCH_CONFIG.maxUpdates}`
      )
    );

  // All buttons in one row
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice_track_stop:${session.channelId}`)
      .setEmoji(EMOJI.VOICE_SOUND_PAUSE)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`voice_refresh_track:${session.channelId}`)
      .setEmoji(EMOJI.REPLAY)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`voice_join:${session.channelId}`)
      .setEmoji(EMOJI.CONNECT_TO_USER)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`voice_mute_all:${session.channelId}`)
      .setLabel('All')
      .setEmoji(EMOJI.VOICE_SERVER_MUTED)
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
