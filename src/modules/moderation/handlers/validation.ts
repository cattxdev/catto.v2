/**
 * Moderation Validation
 *
 * Shared validation logic for moderation actions.
 */

import { moderationService } from '../services/ModerationService.js';
import type { ModerationContext } from './context.js';

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
