/**
 * UI Builders for Discord
 *
 * Low-level formatting utilities for constructing Discord UI elements.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from 'discord.js';
import { COLORS, EMOJI } from './design.js';

// ============================================================================
// Text Formatting Helpers
// ============================================================================

/**
 * Format an info row with consistent styling
 */
export function formatInfoRow(label: string, value: string, emoji?: string): string {
  const prefix = emoji ? `${emoji} ` : '';
  return `${prefix}**${label}:** ${value}`;
}

/**
 * Format multiple key-value pairs into a stats line
 */
export function formatStatsLine(stats: Record<string, string | number>): string {
  return Object.entries(stats)
    .map(([key, value]) => `**${key}:** ${value}`)
    .join(' \u00b7 '); // middle dot
}

/**
 * Format a user mention with tag and ID
 */
export function formatUserMention(user: User): string {
  return `${user.tag} (\`${user.id}\`)`;
}

/**
 * Format a relative timestamp from Date
 */
export function formatRelativeTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

/**
 * Format an absolute timestamp from Date
 */
export function formatAbsoluteTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format pagination info
 */
export function formatPaginationInfo(current: number, total: number, itemCount: number): string {
  return `Page ${current} of ${total} (${itemCount} total)`;
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Format duration in seconds to a full human-readable string
 * Example: 90061 -> "1d 1h 1m 1s"
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

/**
 * Format duration in a compact way
 * Example: 3661 -> "1h"
 */
export function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ============================================================================
// Button Configuration
// ============================================================================

/**
 * Button configuration interface
 */
export interface ButtonConfig {
  customId: string;
  label: string;
  style: ButtonStyle;
  disabled?: boolean;
  emoji?: string;
}

/**
 * Create a button row from configurations
 */
export function createButtonRow(buttons: ButtonConfig[]): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  for (const config of buttons) {
    const button = new ButtonBuilder()
      .setCustomId(config.customId)
      .setLabel(config.label)
      .setStyle(config.style);

    if (config.disabled) {
      button.setDisabled(true);
    }

    if (config.emoji) {
      button.setEmoji(config.emoji);
    }

    row.addComponents(button);
  }

  return row;
}

// ============================================================================
// Embed Builders (Legacy - for v1 compatibility)
// ============================================================================

/**
 * Create a basic info embed
 */
export function createInfoEmbed(description: string, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(title ? `${EMOJI.INFO} ${title}` : `${EMOJI.INFO} Information`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a basic success embed
 */
export function createSuccessEmbed(description: string, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(title ? `${EMOJI.SUCCESS} ${title}` : `${EMOJI.SUCCESS} Success`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a basic error embed
 */
export function createErrorEmbed(description: string, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(title ? `${EMOJI.ERROR} ${title}` : `${EMOJI.ERROR} Error`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a basic warning embed
 */
export function createWarningEmbed(description: string, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle(title ? `${EMOJI.WARNING} ${title}` : `${EMOJI.WARNING} Warning`)
    .setDescription(description)
    .setTimestamp();
}
