/**
 * Moderation Components - Discord UI Adapters
 *
 * Re-exports shared Discord UI library utilities for moderation module.
 */

export {
  // Design tokens
  COLORS,
  EMOJI,
  SPACING,
  type ErrorType,
  // Formatting utilities
  formatInfoRow,
  formatStatsLine,
  formatUserMention,
  formatRelativeTimestamp,
  formatAbsoluteTimestamp,
  truncateText,
  formatPaginationInfo,
  formatDuration,
  formatDurationShort,
  createButtonRow,
  type ButtonConfig,
  // Reply helpers
  reply,
  defer,
  editReply,
  // Message builders
  successMessage,
  errorMessage,
  warningMessage,
  infoMessage,
  loadingMessage,
} from '#lib/discord/index.js';
