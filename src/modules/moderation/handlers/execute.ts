/**
 * Moderation Action Execution
 *
 * Shared execution logic for moderation actions with consistent
 * logging and response building.
 */

import type { Guild, User } from 'discord.js';
import { ModAction } from '@prisma/client';
import { moderationService } from '../services/ModerationService.js';
import { muteService } from '../services/MuteService.js';
import { notifyUser, logModActionV2 } from '../discord/embeds.js';
import type { ModerationContext } from './context.js';
import type { ModActionResult, MuteResult, UserId } from '../domain/types.js';
import { asGuildId, asUserId, asDuration } from '../domain/types.js';

// ============================================================================
// Core Action Executors
// ============================================================================

/**
 * Execute a warn action
 */
export async function executeWarn(context: ModerationContext): Promise<ModActionResult> {
  // Notify user before warning
  await notifyUser(context.target, ModAction.WARN, context.guild, context.reason);

  // Execute via service
  const result = await moderationService.warn(
    context.guild,
    context.target,
    context.moderator,
    context.reason
  );

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      ModAction.WARN,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber
    );
  }

  return result;
}

/**
 * Execute a kick action
 */
export async function executeKick(context: ModerationContext): Promise<ModActionResult> {
  if (!context.targetMember) {
    return { success: false, error: 'User is not in this server.', userNotified: false };
  }

  // Notify user before kick
  await notifyUser(context.target, ModAction.KICK, context.guild, context.reason);

  // Execute via service
  const result = await moderationService.kick(
    context.guild,
    context.targetMember,
    context.moderator,
    context.reason
  );

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      ModAction.KICK,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber
    );
  }

  return result;
}

/**
 * Execute a ban action
 */
export async function executeBan(
  context: ModerationContext,
  deleteMessages: boolean = false
): Promise<ModActionResult> {
  // Notify user before ban (only if in server)
  if (context.targetMember) {
    await notifyUser(context.target, ModAction.BAN, context.guild, context.reason);
  }

  // Execute via service
  const result = await moderationService.ban(
    context.guild,
    context.target,
    context.moderator,
    context.reason,
    deleteMessages
  );

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      ModAction.BAN,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber
    );
  }

  return result;
}

/**
 * Execute a softban action (ban + immediate unban to delete messages)
 */
export async function executeSoftban(context: ModerationContext): Promise<ModActionResult> {
  // Notify user before softban (only if in server)
  if (context.targetMember) {
    await notifyUser(context.target, ModAction.SOFTBAN, context.guild, context.reason);
  }

  // Execute via service
  const result = await moderationService.softban(
    context.guild,
    context.target,
    context.moderator,
    context.reason
  );

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      ModAction.SOFTBAN,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber
    );
  }

  return result;
}

/**
 * Execute a timeout action
 */
export async function executeTimeout(context: ModerationContext): Promise<ModActionResult> {
  if (!context.targetMember) {
    return { success: false, error: 'User is not in this server.', userNotified: false };
  }

  if (!context.duration) {
    return { success: false, error: 'Duration is required for timeout.', userNotified: false };
  }

  // Notify user before timeout
  await notifyUser(
    context.target,
    ModAction.TIMEOUT,
    context.guild,
    context.reason,
    context.duration
  );

  // Execute via service
  const result = await moderationService.timeout(
    context.guild,
    context.targetMember,
    context.moderator,
    context.reason,
    context.duration
  );

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      ModAction.TIMEOUT,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber,
      context.duration
    );
  }

  return result;
}

/**
 * Execute a tempban action
 */
export async function executeTempban(
  context: ModerationContext,
  deleteMessages: boolean = false
): Promise<ModActionResult> {
  if (!context.duration) {
    return { success: false, error: 'Duration is required for tempban.', userNotified: false };
  }

  // Notify user before tempban (only if in server)
  if (context.targetMember) {
    await notifyUser(
      context.target,
      ModAction.TEMPBAN,
      context.guild,
      context.reason,
      context.duration
    );
  }

  // Execute via service
  const result = await moderationService.tempban(
    context.guild,
    context.target,
    context.moderator,
    context.reason,
    context.duration,
    deleteMessages
  );

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      ModAction.TEMPBAN,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber,
      context.duration
    );
  }

  return result;
}

/**
 * Execute an unban action
 */
export async function executeUnban(
  guild: Guild,
  userId: UserId,
  userTag: string,
  moderator: User,
  reason: string
): Promise<ModActionResult> {
  // Execute via service
  const result = await moderationService.unban(guild, userId, userTag, moderator, reason);

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    // We need to fetch the user for the modlog - use ID if fetch fails
    const target = await guild.client.users.fetch(userId).catch(() => null);
    await logModActionV2(
      guild,
      ModAction.UNBAN,
      target ?? { id: userId, tag: userTag },
      moderator,
      reason,
      result.caseNumber
    );
  }

  return result;
}

// ============================================================================
// Mute Action Executors
// ============================================================================

/**
 * Mute type for execution
 */
export type MuteType = 'text' | 'voice' | 'both';

/**
 * Execute a mute action
 */
export async function executeMute(
  context: ModerationContext,
  muteType: MuteType
): Promise<MuteResult> {
  if (!context.targetMember) {
    return { success: false, error: 'User is not in this server.' };
  }

  const muteInput = {
    guildId: asGuildId(context.guild.id),
    userId: asUserId(context.target.id),
    createdById: asUserId(context.moderator.id),
    reason: context.reason,
    duration: context.duration ? asDuration(context.duration) : undefined,
  };

  let result: MuteResult;
  let modAction: ModAction;

  switch (muteType) {
    case 'text':
      modAction = ModAction.MUTE_TEXT;
      result = await muteService.muteText(
        context.guild,
        context.targetMember,
        asUserId(context.moderator.id),
        context.moderator.tag,
        muteInput
      );
      break;
    case 'voice':
      modAction = ModAction.MUTE_VOICE;
      result = await muteService.muteVoice(
        context.guild,
        context.targetMember,
        asUserId(context.moderator.id),
        context.moderator.tag,
        muteInput
      );
      break;
    case 'both':
      modAction = ModAction.MUTE_BOTH;
      result = await muteService.muteBoth(
        context.guild,
        context.targetMember,
        asUserId(context.moderator.id),
        context.moderator.tag,
        muteInput
      );
      break;
  }

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      modAction,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber,
      context.duration
    );
  }

  return result;
}

/**
 * Execute an unmute action
 */
export async function executeUnmute(
  context: ModerationContext,
  muteType: MuteType
): Promise<MuteResult> {
  if (!context.targetMember) {
    return { success: false, error: 'User is not in this server.' };
  }

  const unmuteInput = {
    guildId: asGuildId(context.guild.id),
    userId: asUserId(context.target.id),
    moderatorId: asUserId(context.moderator.id),
    moderatorTag: context.moderator.tag,
    reason: context.reason,
  };

  let result: MuteResult;
  let modAction: ModAction;

  switch (muteType) {
    case 'text':
      modAction = ModAction.UNMUTE_TEXT;
      result = await muteService.unmuteText(context.guild, context.targetMember, unmuteInput);
      break;
    case 'voice':
      modAction = ModAction.UNMUTE_VOICE;
      result = await muteService.unmuteVoice(context.guild, context.targetMember, unmuteInput);
      break;
    case 'both':
      modAction = ModAction.UNMUTE_BOTH;
      result = await muteService.unmuteBoth(context.guild, context.targetMember, unmuteInput);
      break;
  }

  // Log to mod channel on success
  if (result.success && result.caseNumber) {
    await logModActionV2(
      context.guild,
      modAction,
      context.target,
      context.moderator,
      context.reason,
      result.caseNumber
    );
  }

  return result;
}
