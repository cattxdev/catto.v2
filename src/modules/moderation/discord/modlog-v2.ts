/**
 * ModLog V2 Builders
 *
 * Components V2 builders for moderation log entries.
 * These are designed to be:
 * - Readable and compact
 * - Non-pinging (no @mentions)
 * - Consistent emoji usage
 */

import { ContainerBuilder, MessageFlags, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';
import { ModAction } from '@prisma/client';
import { COLORS, getEmoji, SPACING } from '#lib/discord/design.js';
import { formatDuration, formatRelativeTimestamp } from '#lib/discord/builders.js';
import { formatUserForLog } from '#lib/discord/userDisplay.js';

// ============================================================================
// Types
// ============================================================================

export interface ModLogEntry {
  action: ModAction;
  caseNumber: number;
  targetId: string;
  targetTag?: string | null;
  moderatorId: string;
  moderatorTag?: string | null;
  reason: string;
  duration?: number | null;
  timestamp?: Date;
}

// ============================================================================
// Action Display Mapping
// ============================================================================

const ACTION_DISPLAY: Partial<
  Record<ModAction, { emoji: string; label: string; color: number; pastTense: string }>
> = {
  BAN: { emoji: getEmoji('ERROR'), label: 'Ban', color: COLORS.BAN, pastTense: 'banned' },
  UNBAN: {
    emoji: getEmoji('SUCCESS'),
    label: 'Unban',
    color: COLORS.SUCCESS,
    pastTense: 'unbanned',
  },
  KICK: { emoji: getEmoji('WARNING'), label: 'Kick', color: COLORS.KICK, pastTense: 'kicked' },
  TIMEOUT: {
    emoji: getEmoji('TIME'),
    label: 'Timeout',
    color: COLORS.TIMEOUT,
    pastTense: 'timed out',
  },
  WARN: { emoji: getEmoji('WARNING'), label: 'Warning', color: COLORS.WARN, pastTense: 'warned' },
  SOFTBAN: { emoji: getEmoji('ERROR'), label: 'Softban', color: 0xf57c00, pastTense: 'softbanned' },
  TEMPBAN: { emoji: getEmoji('ERROR'), label: 'Tempban', color: 0xb71c1c, pastTense: 'tempbanned' },
  MUTE_TEXT: {
    emoji: getEmoji('TEXT_LIMITER'),
    label: 'Text Mute',
    color: COLORS.MUTE,
    pastTense: 'text muted',
  },
  MUTE_VOICE: {
    emoji: getEmoji('VOICE_LIMITER'),
    label: 'Voice Mute',
    color: COLORS.MUTE,
    pastTense: 'voice muted',
  },
  MUTE_BOTH: {
    emoji: getEmoji('MODERATION'),
    label: 'Full Mute',
    color: COLORS.MUTE,
    pastTense: 'fully muted',
  },
  UNMUTE_TEXT: {
    emoji: getEmoji('TEXT_CHANNEL'),
    label: 'Text Unmute',
    color: COLORS.UNMUTE,
    pastTense: 'text unmuted',
  },
  UNMUTE_VOICE: {
    emoji: getEmoji('VOICE'),
    label: 'Voice Unmute',
    color: COLORS.UNMUTE,
    pastTense: 'voice unmuted',
  },
  UNMUTE_BOTH: {
    emoji: getEmoji('MODERATION'),
    label: 'Full Unmute',
    color: COLORS.UNMUTE,
    pastTense: 'fully unmuted',
  },
};

// ============================================================================
// Builders
// ============================================================================

/**
 * Build a V2 container for a modlog entry
 */
export function buildModLogEntryV2(entry: ModLogEntry): ContainerBuilder {
  const display = ACTION_DISPLAY[entry.action] ?? {
    emoji: getEmoji('INFO'),
    label: entry.action,
    color: COLORS.INFO,
    pastTense: entry.action.toLowerCase(),
  };

  const container = new ContainerBuilder().setAccentColor(display.color);

  // Header: Action emoji + label + case number
  const header = new TextDisplayBuilder().setContent(
    `${display.emoji} **${display.label}** · Case #${entry.caseNumber}`
  );
  container.addTextDisplayComponents(header);

  // Small separator
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SPACING.SMALL).setDivider(false)
  );

  // Target line (no ping - use tag + ID format)
  const targetDisplay = formatUserForLog(entry.targetId, entry.targetTag);
  const targetLine = new TextDisplayBuilder().setContent(`**Target:** ${targetDisplay}`);
  container.addTextDisplayComponents(targetLine);

  // Moderator line (no ping - use tag + ID format)
  const modDisplay = formatUserForLog(entry.moderatorId, entry.moderatorTag);
  const modLine = new TextDisplayBuilder().setContent(`**Moderator:** ${modDisplay}`);
  container.addTextDisplayComponents(modLine);

  // Duration (if applicable)
  if (entry.duration) {
    const durationLine = new TextDisplayBuilder().setContent(
      `**Duration:** ${formatDuration(entry.duration)}`
    );
    container.addTextDisplayComponents(durationLine);
  }

  // Reason
  const reason = entry.reason || 'No reason provided';
  const reasonLine = new TextDisplayBuilder().setContent(`**Reason:** ${reason}`);
  container.addTextDisplayComponents(reasonLine);

  // Timestamp footer
  const timestamp = entry.timestamp ?? new Date();
  const timestampLine = new TextDisplayBuilder().setContent(
    `-# ${formatRelativeTimestamp(timestamp)}`
  );
  container.addTextDisplayComponents(timestampLine);

  return container;
}

/**
 * Get the message options for sending a V2 modlog entry
 */
export function getModLogMessageOptions(entry: ModLogEntry) {
  const container = buildModLogEntryV2(entry);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] as const }, // No pings
  };
}
