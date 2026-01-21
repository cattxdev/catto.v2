// Re-export from embeds (moderation-specific)
export {
  formatDuration,
  createModEmbed,
  createUserNotificationEmbed,
  notifyUser,
  logToModChannel,
  createCaseEmbed,
  createHistoryEmbed,
} from './embeds.js';

// Re-export from customId (moderation-specific)
export {
  ModPanelAction,
  encodeModPanelCustomId,
  decodeModPanelCustomId,
  isModPanelCustomId,
} from './customId.js';

// Re-export from panelBuilder (moderation-specific)
export {
  type ModPanelContext,
  buildModPanelV2,
  buildContextBundleV2,
  buildNotesListV2,
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from './panelBuilder.js';

// Re-export selected items from components (backward compat layer)
// These are re-exports from shared lib + moderation-specific extensions
export {
  // Design tokens (from shared lib)
  COLORS,
  EMOJI,
  SPACING,
  // Builders (from shared lib)
  formatInfoRow,
  formatStatsLine,
  formatUserMention,
  formatRelativeTimestamp,
  formatAbsoluteTimestamp,
  truncateText,
  formatPaginationInfo,
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
  // Responses (from shared lib)
  buildSuccessV2,
  buildErrorV2,
  buildLoadingV2,
  // Moderation-specific (deprecated wrappers)
  type ModerationErrorType,
  type ModerationError,
  buildErrorResponse,
  buildSuccessResponse,
  buildLoadingResponse,
  createCardSection,
} from './components.js';
