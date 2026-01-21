/**
 * Discord UI Library
 *
 * Centralized exports for the shared Discord UI module.
 * This library provides a comprehensive framework for building Discord UIs
 * with both Components V2 and traditional embeds.
 *
 * ## Architecture
 *
 * - **v2/**: Components V2 builders (containers, text displays, separators)
 * - **v1/**: Traditional embed builders (embeds with fields, footers, etc.)
 * - **components/**: Shared components (buttons, select menus, modals)
 * - **design.ts**: Design tokens (colors, emojis, spacing)
 * - **builders.ts**: Low-level utilities (formatting, etc.)
 * - **responses.ts**: High-level response builders
 * - **customId.ts**: Custom ID encoding/decoding
 * - **types.ts**: Shared types
 *
 * ## Quick Start
 *
 * ```ts
 * // V2 Container (modern)
 * import { v2 } from '#lib/discord';
 * const container = v2.buildSuccess('Action Complete', { details: { User: 'John' } });
 *
 * // V1 Embed (traditional)
 * import { v1 } from '#lib/discord';
 * const embed = v1.buildSuccessEmbed('Operation completed successfully');
 *
 * // Components
 * import { components } from '#lib/discord';
 * const row = components.confirmationRow('confirm', 'cancel');
 * ```
 */

// ============================================================================
// V2 Builders (Components V2)
// ============================================================================

import * as v2 from './v2/index.js';
export { v2 };

export {
  // Container factories
  type ContainerConfig,
  container,
  successContainer,
  errorContainer,
  warningContainer,
  infoContainer,
  primaryContainer,
  // Text display builders
  text,
  h1,
  h2,
  h3,
  bold,
  italic,
  code,
  codeBlock,
  quote,
  // Separator builders
  smallSeparator,
  largeSeparator,
  divider,
  // Container extensions
  addHeader,
  addSection,
  addKeyValues,
  addList,
  addFooter,
  addActions,
  // Pre-built templates
  buildSuccess,
  buildError,
  buildWarning,
  buildInfo,
  buildLoading,
  buildConfirmation,
} from './v2/index.js';

// ============================================================================
// V1 Builders (Traditional Embeds)
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
// Low-level Builders (Legacy/Utilities)
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
  // Components V2 builders (legacy names)
  createHeader,
  createSubheader,
  createSmallSeparator,
  createLargeSeparator,
  addStandardHeader,
  addKeyValueSection,
  addListSection,
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
// Response Builders
// ============================================================================

export {
  // Types
  type ErrorData,
  type SuccessData,
  type ModActionSuccessData,
  // V2 builders
  buildSuccessV2,
  buildErrorV2,
  buildLoadingV2,
  // Embed builders
  buildSuccessEmbed as buildSuccessEmbedLegacy,
  buildErrorEmbed as buildErrorEmbedLegacy,
  // Plain text
  buildSuccessText,
  buildErrorText,
  buildWarningText,
  buildInfoText,
  // Interaction helpers
  ephemeralError,
  ephemeralSuccess,
  editError,
  editSuccess,
  // V2 Interaction helpers
  ephemeralErrorV2,
  ephemeralSuccessV2,
  editErrorV2,
  editSuccessV2,
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
// V2 Reply Helpers (Components V2 Interaction Utilities)
// ============================================================================

export {
  // Types
  type V2EditReplyOptions,
  type V2ReplyOptions,
  // Flag constants
  V2_EPHEMERAL_FLAGS,
  V2_FLAGS,
  // Defer helpers
  deferV2Ephemeral,
  deferV2,
  // Reply helpers
  replyV2,
  replyV2Ephemeral,
  // Edit reply helpers
  editReplyV2,
  // Utility functions
  createV2ReplyOptions,
  createV2EditOptions,
} from './v2Reply.js';

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
