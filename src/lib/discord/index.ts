/**
 * Discord UI Library
 *
 * Centralized exports for the shared Discord UI module.
 * This library provides a comprehensive framework for building Discord UIs
 * with both component-based messages and traditional embeds.
 *
 * ## Quick Start
 *
 * ```ts
 * import { v2, reply, defer, editReply } from '#lib/discord';
 *
 * // Build a container message
 * const message = v2.successMessage('Done!', 'Your changes have been saved.');
 *
 * // Reply to an interaction (ephemeral by default)
 * await reply(interaction, message);
 *
 * // Or reply publicly
 * await reply(interaction, message).public();
 *
 * // Deferred workflow
 * await defer(interaction);
 * // ... do work ...
 * await editReply(interaction, v2.successMessage('Complete!'));
 * ```
 */

// ============================================================================
// Fluent Container API
// ============================================================================

import * as v2 from './v2/index.js';
export { v2 };

export {
  // Container factories
  container,
  FluentContainer,
  successContainer,
  errorContainer,
  warningContainer,
  infoContainer,
  primaryContainer,
  neutralContainer,
  // Quick message builders
  simpleMessage,
  successMessage,
  errorMessage,
  warningMessage,
  infoMessage,
  loadingMessage,
  // Types
  type ContainerComponent,
  type ContainerOptions,
  type AccentColor,
} from './v2/index.js';

// ============================================================================
// Reply Helpers (Fluent API)
// ============================================================================

export {
  reply,
  defer,
  editReply,
  type RepliableInteraction,
  type MessageContainer,
} from './reply.js';

// ============================================================================
// Traditional Embeds (v1)
// ============================================================================

import * as v1 from './v1/index.js';
export { v1 };

export {
  // Embed factories
  embed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  neutralEmbed,
  // Embed extensions
  withTitle,
  withTimestamp,
  withFooter,
  withAuthor,
  withUserAuthor,
  withThumbnail,
  withUserThumbnail,
  withImage,
  withFields,
  withField,
  // Pre-built templates
  buildSuccessEmbed,
  buildErrorEmbed,
  buildWarningEmbed,
  buildInfoEmbed,
  buildStatsEmbed,
  buildListEmbed,
  buildUserEmbed,
  // Fluent embed API
  FluentEmbed,
  type EmbedTransform,
  fluentEmbed,
  fluentSuccess,
  fluentError,
  fluentWarning,
  fluentInfo,
  fluentNeutral,
  pipeEmbed,
  composeEmbed,
  whenEmbed,
  ifElseEmbed,
  withUser,
  withTimestampFooter,
  withPoweredBy,
} from './v1/index.js';

// ============================================================================
// Components (Buttons, Selects, Modals)
// ============================================================================

import * as components from './components/index.js';
export { components };

export {
  // Select types
  type SelectOption,
  type SelectMenuConfig,
  type StringSelectConfig,
  type ChannelSelectConfig,
  type RoleSelectConfig,
  type UserSelectConfig,
  type MentionableSelectConfig,
  // String select
  stringSelect,
  stringSelectRow,
  yesNoSelect,
  pageSelect,
  // Channel select
  channelSelect,
  channelSelectRow,
  textChannelSelect,
  voiceChannelSelect,
  categorySelect,
  // Role select
  roleSelect,
  roleSelectRow,
  singleRoleSelect,
  multiRoleSelect,
  // User select
  userSelect,
  userSelectRow,
  singleUserSelect,
  multiUserSelect,
  // Mentionable select
  mentionableSelect,
  mentionableSelectRow,
  singleMentionableSelect,
  // Button types
  type ButtonConfig,
  type SimpleButtonConfig,
  type LinkButtonConfig,
  // Button factories
  button,
  primaryButton,
  secondaryButton,
  successButton,
  dangerButton,
  linkButton,
  // Row builders
  buttonRow,
  row,
  // Button presets
  confirmButton,
  cancelButton,
  deleteButton,
  refreshButton,
  backButton,
  nextButton,
  doneButton,
  editButton,
  viewButton,
  // Preset rows
  confirmationRow,
  paginationRow,
  navigationRow,
  // Modal types
  type TextInputConfig,
  type ModalConfig,
  // Text input builders
  textInput,
  shortInput,
  paragraphInput,
  inputRow,
  // Modal builders
  modal,
  singleInputModal,
  paragraphModal,
  formModal,
} from './components/index.js';

// ============================================================================
// Design Tokens
// ============================================================================

export {
  COLORS,
  EMOJI,
  EMOJI_CONFIG,
  type EmojiKey,
  SPACING,
  ERROR_ICONS,
  type ErrorType,
  getEmoji,
  setUseCustomEmojis,
} from './design.js';

// ============================================================================
// Formatting Utilities
// ============================================================================

export {
  // Text formatting
  formatInfoRow,
  formatStatsLine,
  formatUserMention,
  formatRelativeTimestamp,
  formatAbsoluteTimestamp,
  truncateText,
  formatPaginationInfo,
  // Duration formatting
  formatDuration,
  formatDurationShort,
  // Button builders (legacy)
  createButtonRow,
  type ButtonConfig as LegacyButtonConfig,
  // Embed builders (legacy)
  createInfoEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from './builders.js';

// ============================================================================
// Response Builders (Text & Embeds)
// ============================================================================

export {
  // Types
  type ErrorData,
  type SuccessData,
  type ModActionSuccessData,
  // Embed builders
  buildSuccessEmbed as buildSuccessEmbedResponse,
  buildErrorEmbed as buildErrorEmbedResponse,
  // Plain text
  buildSuccessText,
  buildErrorText,
  buildWarningText,
  buildInfoText,
  // Interaction helpers (plain text)
  ephemeralError,
  ephemeralSuccess,
  editError,
  editSuccess,
} from './responses.js';

// ============================================================================
// Custom ID Utilities
// ============================================================================

export {
  type ParsedCustomId,
  encodeCustomId,
  decodeCustomId,
  matchesCustomId,
  extractFirstParam,
  extractParams,
  encodeWithNonce,
  stripNonce,
  isValidCustomId,
  sanitizeForCustomId,
} from './customId.js';

// ============================================================================
// Shared Types
// ============================================================================

export {
  type UIResponse,
  type MultiFormatResponseOptions,
  type PaginationState,
  type SortOptions,
  type UserDisplayData,
  type TimestampFormat,
  type InteractionResult,
  type DeferredReplyState,
  getUserDisplayData,
  createTimestamp,
} from './types.js';

// ============================================================================
// User Display Utilities
// ============================================================================

export {
  type UserDisplayOptions,
  type UserDisplayResult,
  getUserDisplayLabel,
  getUserDisplayLabelSync,
  getSafeUserTag,
  isPlaceholderTag,
  formatUserForLog,
} from './userDisplay.js';
