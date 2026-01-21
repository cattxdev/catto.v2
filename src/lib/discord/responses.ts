/**
 * Unified Response Builders for Discord
 *
 * Provides consistent success/error response builders that work with both
 * traditional embeds and Components V2.
 */

import {
  ContainerBuilder,
  TextDisplayBuilder,
  EmbedBuilder,
  type User,
  type InteractionReplyOptions,
  type MessageEditOptions,
  MessageFlags,
} from 'discord.js';
import { COLORS, EMOJI, ERROR_ICONS, type ErrorType } from './design.js';
import { createSmallSeparator, formatInfoRow } from './builders.js';

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard error response data
 */
export interface ErrorData {
  type?: ErrorType;
  title?: string;
  message: string;
  suggestion?: string;
}

/**
 * Standard success response data
 */
export interface SuccessData {
  title: string;
  details?: Record<string, string>;
  message?: string;
}

/**
 * Moderation action success data
 */
export interface ModActionSuccessData {
  action: string;
  target: User;
  caseNumber: number;
  reason: string;
  duration?: string;
  dmSent?: boolean;
}

// ============================================================================
// Components V2 Builders
// ============================================================================

/**
 * Build a success response using Components V2
 */
export function buildSuccessV2(data: SuccessData): ContainerBuilder {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${EMOJI.SUCCESS} ${data.title}`)
  );

  if (data.message) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(data.message));
  }

  if (data.details && Object.keys(data.details).length > 0) {
    const detailLines = Object.entries(data.details).map(([key, value]) =>
      formatInfoRow(key, value)
    );
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(detailLines.join('\n')));
  }

  return container;
}

/**
 * Build an error response using Components V2
 */
export function buildErrorV2(data: ErrorData): ContainerBuilder {
  const container = new ContainerBuilder();
  const icon = data.type ? ERROR_ICONS[data.type] : EMOJI.ERROR;
  const title = data.title ?? 'Error';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${icon} ${title}`),
    new TextDisplayBuilder().setContent(data.message)
  );

  if (data.suggestion) {
    container.addSeparatorComponents(createSmallSeparator());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${EMOJI.INFO} **Suggestion:** ${data.suggestion}`)
    );
  }

  return container;
}

/**
 * Build a loading state response using Components V2
 */
export function buildLoadingV2(message: string = 'Loading...'): ContainerBuilder {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${EMOJI.TIME} ${message}`)
  );
  return container;
}

// ============================================================================
// Traditional Embed Builders
// ============================================================================

/**
 * Build a success embed (traditional format)
 */
export function buildSuccessEmbed(data: SuccessData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`${EMOJI.SUCCESS} ${data.title}`)
    .setTimestamp();

  if (data.message) {
    embed.setDescription(data.message);
  }

  if (data.details) {
    const description = Object.entries(data.details)
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
    embed.setDescription(description);
  }

  return embed;
}

/**
 * Build an error embed (traditional format)
 */
export function buildErrorEmbed(data: ErrorData): EmbedBuilder {
  const icon = data.type ? ERROR_ICONS[data.type] : EMOJI.ERROR;
  const title = data.title ?? 'Error';

  const embed = new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`${icon} ${title}`)
    .setDescription(data.message)
    .setTimestamp();

  if (data.suggestion) {
    embed.addFields({ name: 'Suggestion', value: data.suggestion });
  }

  return embed;
}

// ============================================================================
// Plain Text Response Builders (for simpler use cases)
// ============================================================================

/**
 * Build a plain text success message
 */
export function buildSuccessText(message: string): string {
  return `${EMOJI.SUCCESS} ${message}`;
}

/**
 * Build a plain text error message
 */
export function buildErrorText(message: string): string {
  return `${EMOJI.ERROR} ${message}`;
}

/**
 * Build a plain text warning message
 */
export function buildWarningText(message: string): string {
  return `${EMOJI.WARNING} ${message}`;
}

/**
 * Build a plain text info message
 */
export function buildInfoText(message: string): string {
  return `${EMOJI.INFO} ${message}`;
}

// ============================================================================
// Interaction Reply Helpers
// ============================================================================

/**
 * Create an ephemeral error reply options object
 */
export function ephemeralError(message: string): InteractionReplyOptions {
  return {
    content: buildErrorText(message),
    flags: MessageFlags.Ephemeral,
  };
}

/**
 * Create an ephemeral success reply options object
 */
export function ephemeralSuccess(message: string): InteractionReplyOptions {
  return {
    content: buildSuccessText(message),
    flags: MessageFlags.Ephemeral,
  };
}

/**
 * Create an edit reply options with error content
 */
export function editError(message: string): MessageEditOptions {
  return {
    content: buildErrorText(message),
  };
}

/**
 * Create an edit reply options with success content
 */
export function editSuccess(message: string): MessageEditOptions {
  return {
    content: buildSuccessText(message),
  };
}

// ============================================================================
// V2 Interaction Reply Helpers
// ============================================================================

/**
 * Create an ephemeral V2 error reply options object
 */
export function ephemeralErrorV2(message: string, suggestion?: string): InteractionReplyOptions {
  return {
    components: [buildErrorV2({ message, suggestion })],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  };
}

/**
 * Create an ephemeral V2 success reply options object
 */
export function ephemeralSuccessV2(title: string, message?: string): InteractionReplyOptions {
  return {
    components: [buildSuccessV2({ title, message })],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  };
}

/**
 * Create an edit reply options with V2 error content
 */
export function editErrorV2(message: string, suggestion?: string): MessageEditOptions {
  return {
    components: [buildErrorV2({ message, suggestion })],
    flags: MessageFlags.IsComponentsV2,
  };
}

/**
 * Create an edit reply options with V2 success content
 */
export function editSuccessV2(title: string, message?: string): MessageEditOptions {
  return {
    components: [buildSuccessV2({ title, message })],
    flags: MessageFlags.IsComponentsV2,
  };
}
