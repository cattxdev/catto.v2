/**
 * Moderation Components - Discord UI Adapters
 *
 * Thin wrapper around the shared Discord UI library with moderation-specific types.
 * Re-exports shared utilities for backward compatibility.
 */

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
  buildLoadingV2,
} from '#lib/discord/index.js';
