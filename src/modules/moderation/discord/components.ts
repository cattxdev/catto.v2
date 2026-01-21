/**
 * Moderation Components - Discord UI Adapters
 *
 * Thin wrapper around the shared Discord UI library with moderation-specific types.
 * Re-exports shared utilities for backward compatibility.
 */

import { ContainerBuilder } from 'discord.js';

// Re-export from shared Discord library for backward compatibility
export {
  // Design tokens
  COLORS,
  EMOJI,
  SPACING,
  type ErrorType,
  // Builders
  formatInfoRow,
  formatStatsLine,
  formatUserMention,
  formatRelativeTimestamp,
  formatAbsoluteTimestamp,
  truncateText,
  formatPaginationInfo,
  formatDuration,
  formatDurationShort,
  createHeader,
  createSubheader,
  createSmallSeparator,
  createLargeSeparator,
  addStandardHeader,
  addKeyValueSection,
  addListSection,
  createButtonRow,
  type ButtonConfig,
  // Responses
  buildSuccessV2,
  buildErrorV2,
  buildModActionSuccessV2,
  buildModActionErrorV2,
  buildLoadingV2,
} from '#lib/discord/index.js';

// Import for internal use
import {
  createSmallSeparator,
  buildErrorV2 as sharedBuildErrorV2,
  buildSuccessV2 as sharedBuildSuccessV2,
  buildLoadingV2 as sharedBuildLoadingV2,
  type ErrorType,
  type ButtonConfig,
  createButtonRow,
} from '#lib/discord/index.js';

// ============================================================================
// Moderation-Specific Types
// ============================================================================

/**
 * @deprecated Use ErrorType from shared library instead
 */
export type ModerationErrorType = ErrorType;

/**
 * Moderation error interface
 */
export interface ModerationError {
  type: ErrorType;
  title: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// Moderation-Specific Builders (Legacy Compatibility)
// ============================================================================

/**
 * Build a standardized error response for moderation
 * @deprecated Use buildErrorV2 from shared library instead
 */
export function buildErrorResponse(error: ModerationError): ContainerBuilder {
  return sharedBuildErrorV2({
    type: error.type,
    title: error.title,
    message: error.message,
    suggestion: error.suggestion,
  });
}

/**
 * Build a standardized success response
 * @deprecated Use buildSuccessV2 from shared library instead
 */
export function buildSuccessResponse(
  title: string,
  details: Record<string, string>,
  actionButtons?: ButtonConfig[]
): ContainerBuilder {
  const container = sharedBuildSuccessV2({ title, details });

  if (actionButtons && actionButtons.length > 0) {
    container.addSeparatorComponents(createSmallSeparator());
    container.addActionRowComponents(createButtonRow(actionButtons));
  }

  return container;
}

/**
 * Build a loading state response
 * @deprecated Use buildLoadingV2 from shared library instead
 */
export function buildLoadingResponse(message: string = 'Loading...'): ContainerBuilder {
  return sharedBuildLoadingV2(message);
}

/**
 * Create a card-style section with border effect using markdown
 */
export function createCardSection(title: string, content: string): string {
  return `**${title}**\n${content}`;
}
