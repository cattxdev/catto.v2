/**
 * Moderation Validation
 *
 * Shared validation logic for moderation actions.
 * Integrates with the custom permission framework from src/lib/validation/permissions.ts
 */

import { moderationService } from '../services/ModerationService.js';
import type { ModerationContext } from './context.js';
import {
  hasCustomPermission,
  checkPermissions,
  getPermissionName,
  type CustomPermission,
} from '#lib/validation/permissions.js';
import type { PermissionResolvable } from 'discord.js';

/**
 * Validation result
 */
export type ValidationResult = { valid: true } | { valid: false; error: string };

/**
 * Validate that target is in server
 */
export function validateTargetInServer(context: ModerationContext): ValidationResult {
  if (!context.targetMember) {
    return { valid: false, error: 'User is not in this server.' };
  }
  return { valid: true };
}

/**
 * Validate moderation hierarchy (moderator can moderate target)
 */
export function validateHierarchy(context: ModerationContext): ValidationResult {
  if (!context.targetMember) {
    return { valid: true }; // Can't check hierarchy if not in server
  }

  const result = moderationService.canModerate(context.moderatorMember, context.targetMember);
  if (!result.canModerate) {
    return { valid: false, error: result.reason ?? 'Cannot moderate this user.' };
  }

  return { valid: true };
}

/**
 * Validate bot has required permission
 */
export function validateBotPermission(
  context: ModerationContext,
  permission: bigint,
  permissionName: string
): ValidationResult {
  const botMember = context.guild.members.me;
  if (!botMember?.permissions.has(permission)) {
    return { valid: false, error: `I do not have permission to ${permissionName}.` };
  }
  return { valid: true };
}

/**
 * Validate moderator has required Discord permission
 */
export function validateModeratorDiscordPermission(
  context: ModerationContext,
  permission: PermissionResolvable | PermissionResolvable[]
): ValidationResult {
  const result = checkPermissions(context.moderatorMember, permission);
  if (!result.ok) {
    const missing = (result as { ok: false; missing: string[] }).missing;
    return {
      valid: false,
      error: `You are missing required permission(s): ${missing.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate moderator has required custom permission (e.g., mod.ban, mod.kick)
 * Falls back to Discord permission mapping if custom permissions are not configured.
 */
export function validateModeratorCustomPermission(
  context: ModerationContext,
  permission: CustomPermission
): ValidationResult {
  if (!hasCustomPermission(context.moderatorMember, permission)) {
    return {
      valid: false,
      error: `You are missing required permission: ${getPermissionName(permission)}`,
    };
  }
  return { valid: true };
}

/**
 * Validate duration is within bounds for timeout (1 min - 28 days)
 */
export function validateTimeoutDuration(durationSeconds: number): ValidationResult {
  const maxDuration = 28 * 24 * 60 * 60; // 28 days in seconds
  const minDuration = 60; // 1 minute

  if (durationSeconds > maxDuration) {
    return { valid: false, error: 'Timeout duration cannot exceed 28 days.' };
  }

  if (durationSeconds < minDuration) {
    return { valid: false, error: 'Timeout duration must be at least 1 minute.' };
  }

  return { valid: true };
}

/**
 * Run multiple validations and return first failure or success
 */
export function runValidations(...validations: ValidationResult[]): ValidationResult {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation;
    }
  }
  return { valid: true };
}

/**
 * Common validation for actions requiring target in server (kick, timeout, mute)
 */
export function validateMemberAction(
  context: ModerationContext,
  botPermission: bigint,
  permissionName: string
): ValidationResult {
  return runValidations(
    validateTargetInServer(context),
    validateBotPermission(context, botPermission, permissionName),
    validateHierarchy(context)
  );
}

/**
 * Full validation for moderation actions including custom permissions.
 * Use this for comprehensive validation of mod actions.
 *
 * @param context - The moderation context
 * @param options - Validation options
 * @param options.botPermission - Discord permission the bot needs (bigint)
 * @param options.botPermissionName - Human-readable name for the bot permission
 * @param options.customPermission - Custom permission required (e.g., 'mod.ban')
 * @param options.requireTargetInServer - Whether target must be in the server (default: true)
 */
export function validateFullModAction(
  context: ModerationContext,
  options: {
    botPermission: bigint;
    botPermissionName: string;
    customPermission?: CustomPermission;
    requireTargetInServer?: boolean;
  }
): ValidationResult {
  const validations: ValidationResult[] = [];

  // Check if target needs to be in server
  if (options.requireTargetInServer !== false) {
    validations.push(validateTargetInServer(context));
  }

  // Check bot has required permission
  validations.push(
    validateBotPermission(context, options.botPermission, options.botPermissionName)
  );

  // Check moderator has custom permission (if specified)
  if (options.customPermission) {
    validations.push(validateModeratorCustomPermission(context, options.customPermission));
  }

  // Check hierarchy (moderator can moderate target)
  validations.push(validateHierarchy(context));

  return runValidations(...validations);
}
