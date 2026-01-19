/**
 * Moderation Library
 *
 * This file re-exports the moderation domain, services, and discord adapters
 * from their new modular locations for backward compatibility.
 *
 * New code should import directly from:
 * - `#modules/moderation/domain` for types
 * - `#modules/moderation/services` for business logic
 * - `#modules/moderation/discord` for embed helpers
 */

// Re-export domain types
export {
  ModAction,
  type UserId,
  type GuildId,
  type ChannelId,
  type RoleId,
  type CaseNumber,
  type DurationSeconds,
  type ModCaseInput,
  type ModerateCheckResult,
  type ModActionResult,
  type ModStats,
  asUserId,
  asGuildId,
  asChannelId,
  asRoleId,
  asCaseNumber,
  asDuration,
} from '../modules/moderation/domain/types.js';

// Re-export service
export {
  moderationService,
  ModerationService,
} from '../modules/moderation/services/ModerationService.js';

// Re-export discord adapters
export {
  formatDuration,
  createModEmbed,
  createUserNotificationEmbed,
  notifyUser,
  logToModChannel,
  createCaseEmbed,
  createHistoryEmbed,
} from '../modules/moderation/discord/embeds.js';

// Legacy compatibility: Re-export commonly used functions with old names
import { moderationService } from '../modules/moderation/services/ModerationService.js';
import { ModAction } from '@prisma/client';
import type {
  GuildId,
  UserId,
  ModCaseInput,
  DurationSeconds,
} from '../modules/moderation/domain/types.js';

/**
 * @deprecated Use moderationService.createCase() instead
 */
export async function createModCase(data: {
  guildId: string;
  action: ModAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string;
  duration?: number;
  expiresAt?: Date;
}) {
  const input: ModCaseInput = {
    guildId: data.guildId as GuildId,
    action: data.action,
    targetId: data.targetId as UserId,
    targetTag: data.targetTag,
    moderatorId: data.moderatorId as UserId,
    moderatorTag: data.moderatorTag,
    reason: data.reason,
    duration: data.duration as DurationSeconds | undefined,
    expiresAt: data.expiresAt,
  };
  const result = await moderationService.createCase(input);
  return { caseNumber: result.caseNumber, id: result.id };
}

/**
 * @deprecated Use moderationService.getCase() instead
 */
export async function getCase(guildId: string, caseNumber: number) {
  return moderationService.getCase(guildId as GuildId, caseNumber);
}

/**
 * @deprecated Use moderationService.getUserCases() instead
 */
export async function getUserCases(guildId: string, userId: string) {
  return moderationService.getUserCases(guildId as GuildId, userId as UserId);
}

/**
 * @deprecated Use moderationService.canModerate() instead
 */
export function canModerate(
  moderator: import('discord.js').GuildMember,
  target: import('discord.js').GuildMember
) {
  return moderationService.canModerate(moderator, target);
}

/**
 * @deprecated Use moderationService.getStats() instead
 */
export async function getModStats(guildId: string) {
  return moderationService.getStats(guildId as GuildId);
}

/**
 * Parse duration string to seconds
 * @deprecated Use parseDurationToSeconds from #lib/interaction/typedOptions.js
 */
export function parseDuration(duration: string): number | null {
  const regex = /(\d+)([smhdw])/g;
  let total = 0;
  let match;

  while ((match = regex.exec(duration)) !== null) {
    const value = parseInt(match[1] ?? '0', 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        total += value;
        break;
      case 'm':
        total += value * 60;
        break;
      case 'h':
        total += value * 3600;
        break;
      case 'd':
        total += value * 86400;
        break;
      case 'w':
        total += value * 604800;
        break;
    }
  }

  return total > 0 ? total : null;
}

// Legacy type alias for backward compatibility
/** @deprecated Use ModCaseInput from domain/types.ts */
export interface ModCaseData {
  guildId: string;
  action: ModAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string;
  duration?: number;
  expiresAt?: Date;
}
