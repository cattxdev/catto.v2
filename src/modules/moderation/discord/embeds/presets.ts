import { container } from '@sapphire/framework';
import { GuildMember, type User, type Guild } from 'discord.js';
import { ModAction } from '@prisma/client';
import type { DurationSeconds, CaseNumber } from '../../domain/types.js';
import { formatDuration } from '#lib/discord/index.js';
import * as modV1 from './v1.js';
import { buildModLogEntry, getModLogMessageOptions, type ModLogEntry } from '../modlog.js';

// Re-export for convenience
export { formatDuration, type ModLogEntry };

const OFFENSE_WINDOW_DAYS = 30;

const OFFENSE_GROUPS: Partial<Record<ModAction, { label: string; actions: ModAction[] }>> = {
  [ModAction.WARN]: { label: 'warn', actions: [ModAction.WARN] },
  [ModAction.TIMEOUT]: { label: 'timeout', actions: [ModAction.TIMEOUT] },
  [ModAction.KICK]: { label: 'kick', actions: [ModAction.KICK] },
  [ModAction.SOFTBAN]: { label: 'softban', actions: [ModAction.SOFTBAN] },
  [ModAction.TEMPBAN]: { label: 'tempban', actions: [ModAction.TEMPBAN] },
  [ModAction.MUTE_TEXT]: {
    label: 'mute',
    actions: [ModAction.MUTE_TEXT, ModAction.MUTE_VOICE, ModAction.MUTE_BOTH],
  },
  [ModAction.MUTE_VOICE]: {
    label: 'mute',
    actions: [ModAction.MUTE_TEXT, ModAction.MUTE_VOICE, ModAction.MUTE_BOTH],
  },
  [ModAction.MUTE_BOTH]: {
    label: 'mute',
    actions: [ModAction.MUTE_TEXT, ModAction.MUTE_VOICE, ModAction.MUTE_BOTH],
  },
};

// Re-export from modlog for backward compatibility during migration
export { buildModLogEntry, getModLogMessageOptions };

/**
 * Create an embed for a moderation action
 */
export function createModEmbed(
  action: ModAction,
  target: User | GuildMember,
  moderator: User,
  reason: string,
  caseNumber?: CaseNumber,
  duration?: DurationSeconds
) {
  const targetUser = target instanceof GuildMember ? target.user : target;

  return modV1.buildModActionEmbed(
    action,
    { tag: targetUser.tag, id: target.id },
    { tag: moderator.tag, id: moderator.id },
    reason || 'No reason provided',
    {
      caseNumber,
      duration,
    }
  );
}

/**
 * Create a DM notification embed for the target user
 */
export function createUserNotificationEmbed(
  action: ModAction,
  guild: Guild,
  reason: string,
  duration?: DurationSeconds
) {
  return modV1.buildUserNotificationEmbed(action, guild, reason || 'No reason provided', {
    duration,
  });
}

/**
 * Send a DM to the target user
 */
export async function notifyUser(
  target: User | GuildMember,
  action: ModAction,
  guild: Guild,
  reason: string,
  duration?: DurationSeconds
): Promise<boolean> {
  try {
    const user = target instanceof GuildMember ? target.user : target;
    const embed = createUserNotificationEmbed(action, guild, reason, duration);

    await user.send({ embeds: [embed] });
    return true;
  } catch {
    container.logger.warn(`Failed to DM user ${target.id}`);
    return false;
  }
}

/**
 * Log moderation action to mod log channel
 * Non-pinging, readable, consistent format
 */
export async function logToModChannel(guild: Guild, entry: ModLogEntry): Promise<void> {
  try {
    const modConfig = await container.prisma.modConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!modConfig?.modLogChannelId) {
      return;
    }

    const channel = await guild.channels.fetch(modConfig.modLogChannelId);
    if (channel?.isTextBased()) {
      const messageOptions = getModLogMessageOptions(entry);
      await channel.send(messageOptions);
    }
  } catch (error) {
    container.logger.error('Failed to log to mod channel:', error);
  }
}

/**
 * Log a moderation action to the mod channel
 * Convenience wrapper that constructs the ModLogEntry from common parameters
 */
export async function logModAction(
  guild: Guild,
  action: ModAction,
  target: User | GuildMember | { id: string; tag?: string },
  moderator: User | 'System',
  reason: string,
  caseNumber: CaseNumber,
  duration?: number,
  options?: { automatic?: boolean }
): Promise<void> {
  const targetUser = target instanceof GuildMember ? target.user : target;
  const isAutomatic = options?.automatic ?? moderator === 'System';
  const offenseGroup = OFFENSE_GROUPS[action];
  const shouldIncludeOffenseSummary = offenseGroup && action !== ModAction.BAN;
  let recentOffenseCount: number | undefined;
  let offenseLabel: string | undefined;

  if (shouldIncludeOffenseSummary) {
    const since = new Date(Date.now() - OFFENSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    recentOffenseCount = await container.prisma.modCase.count({
      where: {
        guildId: guild.id,
        targetId: targetUser.id,
        action: { in: offenseGroup.actions },
        createdAt: { gte: since },
      },
    });
    offenseLabel = offenseGroup.label;
  }

  const entry: ModLogEntry = {
    action,
    caseNumber,
    targetId: targetUser.id,
    targetTag: 'tag' in targetUser ? targetUser.tag : undefined,
    moderatorId: moderator === 'System' ? 'System' : moderator.id,
    moderatorTag: moderator === 'System' ? 'System' : moderator.tag,
    reason: reason || 'No reason provided',
    duration,
    timestamp: new Date(),
    automatic: isAutomatic,
    recentOffenseCount,
    offenseLabel,
  };
  await logToModChannel(guild, entry);
}

// ============================================================================
// Legacy V2 aliases (for backward compatibility during migration)
// ============================================================================

/** @deprecated Use logToModChannel instead */
export const logToModChannelV2 = logToModChannel;

/** @deprecated Use buildModLogEntry instead */
export const buildModLogEntryV2 = buildModLogEntry;

// ============================================================================
// Embed Presets
// ============================================================================

/**
 * Create a case details embed
 */
export function createCaseEmbed(modCase: {
  caseNumber: number;
  action: ModAction;
  targetTag: string;
  targetId: string;
  moderatorTag: string;
  moderatorId: string;
  reason: string | null;
  createdAt: Date;
  duration: number | null;
  expiresAt: Date | null;
  guildId: string;
}) {
  return modV1.buildCaseEmbed({
    caseNumber: modCase.caseNumber,
    action: modCase.action,
    targetTag: modCase.targetTag,
    targetId: modCase.targetId,
    moderatorTag: modCase.moderatorTag,
    moderatorId: modCase.moderatorId,
    reason: modCase.reason,
    createdAt: modCase.createdAt,
    duration: modCase.duration,
    expiresAt: modCase.expiresAt,
    guildId: modCase.guildId,
  });
}

/**
 * Create a history embed
 */
export function createHistoryEmbed(
  target: User,
  cases: Array<{
    caseNumber: number;
    action: ModAction;
    createdAt: Date;
    reason: string | null;
  }>
) {
  return modV1.buildHistoryEmbed(target, cases, {
    maxCases: 10,
    showStats: true,
  });
}
