import { container } from '@sapphire/framework';
import { GuildMember, type User, type Guild, MessageFlags } from 'discord.js';
import { ModAction } from '@prisma/client';
import type { DurationSeconds, CaseNumber } from '../../domain/types.js';
import { formatDuration } from '#lib/discord/index.js';
import * as modV1 from './v1.js';
import { buildModLogEntryV2, type ModLogEntry } from '../modlog-v2.js';

// Re-export formatDuration for backward compatibility
export { formatDuration };

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
 * Log moderation action to mod log channel using V2 containers
 * Non-pinging, readable, consistent format
 */
export async function logToModChannelV2(guild: Guild, entry: ModLogEntry): Promise<void> {
  try {
    const modConfig = await container.prisma.modConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!modConfig?.modLogChannelId) {
      return;
    }

    const channel = await guild.channels.fetch(modConfig.modLogChannelId);
    if (channel?.isTextBased()) {
      const v2Container = buildModLogEntryV2(entry);
      await channel.send({
        components: [v2Container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] }, // No pings
      });
    }
  } catch (error) {
    container.logger.error('Failed to log to mod channel (V2):', error);
  }
}

/**
 * Log a moderation action to the mod channel using V2
 * Convenience wrapper that constructs the ModLogEntry from common parameters
 */
export async function logModActionV2(
  guild: Guild,
  action: ModAction,
  target: User | GuildMember | { id: string; tag?: string },
  moderator: User,
  reason: string,
  caseNumber: CaseNumber,
  duration?: number
): Promise<void> {
  const targetUser = target instanceof GuildMember ? target.user : target;
  const entry: ModLogEntry = {
    action,
    caseNumber,
    targetId: targetUser.id,
    targetTag: 'tag' in targetUser ? targetUser.tag : undefined,
    moderatorId: moderator.id,
    moderatorTag: moderator.tag,
    reason: reason || 'No reason provided',
    duration,
    timestamp: new Date(),
  };
  await logToModChannelV2(guild, entry);
}

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
