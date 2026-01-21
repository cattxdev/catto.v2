/**
 * V2 Primitives - Base building blocks for Components V2
 *
 * This module provides factory functions for the fundamental V2 components:
 * - TextDisplay: Markdown text content
 * - Separator: Visual dividers with spacing control
 *
 * These primitives can be composed into containers, sections, and other
 * higher-level components.
 */

import { TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { SPACING } from '../design.js';

// ============================================================================
// Types
// ============================================================================

/** Spacing size options */
export type SpacingSize = 'small' | 'large';

/** Text content that can be converted to a TextDisplay */
export type TextContent = string | TextDisplayBuilder;

/** Options for creating a separator */
export interface SeparatorOptions {
  /** Whether to show a divider line */
  divider?: boolean;
  /** Spacing size above/below the separator */
  spacing?: SpacingSize | SeparatorSpacingSize;
}

// ============================================================================
// Text Display
// ============================================================================

/**
 * Create a text display component
 *
 * @example
 * ```ts
 * // Simple text
 * textDisplay('Hello, world!')
 *
 * // Markdown formatting
 * textDisplay('**Bold** and *italic*')
 *
 * // Multi-line
 * textDisplay(`
 *   # Heading
 *   Some content here
 * `)
 * ```
 */
export function textDisplay(content: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(content);
}

/**
 * Alias for textDisplay - shorter name for convenience
 */
export const text = textDisplay;

/**
 * Create a heading level 1 (# Heading)
 */
export function heading1(content: string): TextDisplayBuilder {
  return textDisplay(`# ${content}`);
}

/**
 * Create a heading level 2 (## Heading)
 */
export function heading2(content: string): TextDisplayBuilder {
  return textDisplay(`## ${content}`);
}

/**
 * Create a heading level 3 (### Heading)
 */
export function heading3(content: string): TextDisplayBuilder {
  return textDisplay(`### ${content}`);
}

/** Aliases for heading functions */
export const h1 = heading1;
export const h2 = heading2;
export const h3 = heading3;

/**
 * Create bold text
 */
export function bold(content: string): string {
  return `**${content}**`;
}

/**
 * Create italic text
 */
export function italic(content: string): string {
  return `*${content}*`;
}

/**
 * Create underlined text
 */
export function underline(content: string): string {
  return `__${content}__`;
}

/**
 * Create strikethrough text
 */
export function strikethrough(content: string): string {
  return `~~${content}~~`;
}

/**
 * Create inline code
 */
export function code(content: string): string {
  return `\`${content}\``;
}

/**
 * Create a code block with optional language
 */
export function codeBlock(content: string, language?: string): string {
  return `\`\`\`${language ?? ''}\n${content}\n\`\`\``;
}

/**
 * Create a blockquote
 */
export function quote(content: string): string {
  return content
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/**
 * Create a spoiler
 */
export function spoiler(content: string): string {
  return `||${content}||`;
}

/**
 * Create a bulleted list
 */
export function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

/**
 * Create a numbered list
 */
export function numberedList(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

/**
 * Create a Discord timestamp
 *
 * @param date - Date or Unix timestamp in seconds
 * @param style - Timestamp style (t, T, d, D, f, F, R)
 */
export function timestamp(
  date: Date | number,
  style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'f'
): string {
  const unix = typeof date === 'number' ? date : Math.floor(date.getTime() / 1000);
  return `<t:${unix}:${style}>`;
}

/**
 * Create a user mention
 */
export function userMention(userId: string): string {
  return `<@${userId}>`;
}

/**
 * Create a channel mention
 */
export function channelMention(channelId: string): string {
  return `<#${channelId}>`;
}

/**
 * Create a role mention
 */
export function roleMention(roleId: string): string {
  return `<@&${roleId}>`;
}

// ============================================================================
// Separator
// ============================================================================

/**
 * Resolve spacing size to SeparatorSpacingSize enum
 */
function resolveSpacing(spacing: SpacingSize | SeparatorSpacingSize): SeparatorSpacingSize {
  if (typeof spacing === 'number') return spacing;
  return spacing === 'small' ? SPACING.SMALL : SPACING.LARGE;
}

/**
 * Create a separator component
 *
 * @example
 * ```ts
 * // Simple separator with small spacing
 * separator()
 *
 * // Separator with divider line
 * separator({ divider: true })
 *
 * // Large spacing separator
 * separator({ spacing: 'large' })
 *
 * // Full divider with large spacing
 * separator({ divider: true, spacing: 'large' })
 * ```
 */
export function separator(options: SeparatorOptions = {}): SeparatorBuilder {
  const { divider = false, spacing = 'small' } = options;

  const builder = new SeparatorBuilder().setSpacing(resolveSpacing(spacing)).setDivider(divider);

  return builder;
}

/**
 * Create a small separator (no divider, small spacing)
 */
export function smallSeparator(): SeparatorBuilder {
  return separator({ spacing: 'small' });
}

/**
 * Create a large separator (no divider, large spacing)
 */
export function largeSeparator(): SeparatorBuilder {
  return separator({ spacing: 'large' });
}

/**
 * Create a divider (with line, small spacing)
 */
export function divider(): SeparatorBuilder {
  return separator({ divider: true, spacing: 'small' });
}

/**
 * Create a large divider (with line, large spacing)
 */
export function largeDivider(): SeparatorBuilder {
  return separator({ divider: true, spacing: 'large' });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert TextContent to a TextDisplayBuilder
 */
export function toTextDisplay(content: TextContent): TextDisplayBuilder {
  return typeof content === 'string' ? textDisplay(content) : content;
}

/**
 * Join multiple text contents with a separator
 */
export function joinText(contents: string[], sep = '\n'): string {
  return contents.join(sep);
}

/**
 * Create a key-value line (e.g., "**Key:** Value")
 */
export function keyValue(key: string, value: string): string {
  return `**${key}:** ${value}`;
}

/**
 * Create multiple key-value lines
 */
export function keyValues(pairs: Record<string, string | number | boolean>): string {
  return Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => keyValue(k, String(v)))
    .join('\n');
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Escape Discord markdown characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([*_~`|\\])/g, '\\$1');
}
