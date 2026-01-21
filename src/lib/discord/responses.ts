/**
 * Response Builders for Discord
 *
 * Provides text and embed builders for simple responses.
 * For component-based messages, use the fluent container API from v2/container.ts
 * and the reply helpers from reply.ts.
 */

import {
  EmbedBuilder,
  type User,
  type InteractionReplyOptions,
  type MessageEditOptions,
  MessageFlags,
} from 'discord.js';
import { COLORS, EMOJI, ERROR_ICONS, type ErrorType } from './design.js';

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
// Plain Text Response Builders
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
// Interaction Reply Helpers (for plain text responses)
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
