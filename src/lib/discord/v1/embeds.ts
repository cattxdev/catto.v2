/**
 * V1 Embed Builders
 *
 * Fluent API for building Discord embeds with common patterns.
 * These are the traditional embeds that work everywhere.
 */

import { EmbedBuilder, type User, type APIEmbedField, type ColorResolvable } from 'discord.js';
import { COLORS, EMOJI } from '../design.js';
import { formatRelativeTimestamp } from '../builders.js';

// ============================================================================
// Embed Factory
// ============================================================================

/**
 * Create a new embed with optional defaults
 */
export function embed(color?: ColorResolvable): EmbedBuilder {
  const e = new EmbedBuilder();
  if (color) {
    e.setColor(color);
  }
  return e;
}

/**
 * Create a success embed
 */
export function successEmbed(): EmbedBuilder {
  return embed(COLORS.SUCCESS);
}

/**
 * Create an error embed
 */
export function errorEmbed(): EmbedBuilder {
  return embed(COLORS.ERROR);
}

/**
 * Create a warning embed
 */
export function warningEmbed(): EmbedBuilder {
  return embed(COLORS.WARNING);
}

/**
 * Create an info embed
 */
export function infoEmbed(): EmbedBuilder {
  return embed(COLORS.INFO);
}

/**
 * Create a neutral embed
 */
export function neutralEmbed(): EmbedBuilder {
  return embed(COLORS.NEUTRAL);
}

// ============================================================================
// Embed Builder Extensions (Fluent Helpers)
// ============================================================================

/**
 * Add a titled header to an embed
 */
export function withTitle(e: EmbedBuilder, title: string, emoji?: string): EmbedBuilder {
  const fullTitle = emoji ? `${emoji} ${title}` : title;
  return e.setTitle(fullTitle);
}

/**
 * Add timestamp to embed
 */
export function withTimestamp(e: EmbedBuilder, date?: Date): EmbedBuilder {
  return e.setTimestamp(date);
}

/**
 * Add footer to embed
 */
export function withFooter(
  e: EmbedBuilder,
  text: string,
  options?: { iconURL?: string }
): EmbedBuilder {
  return e.setFooter({ text, iconURL: options?.iconURL });
}

/**
 * Add author to embed
 */
export function withAuthor(
  e: EmbedBuilder,
  name: string,
  options?: { iconURL?: string; url?: string }
): EmbedBuilder {
  return e.setAuthor({ name, iconURL: options?.iconURL, url: options?.url });
}

/**
 * Add user as author
 */
export function withUserAuthor(e: EmbedBuilder, user: User): EmbedBuilder {
  return e.setAuthor({
    name: user.tag,
    iconURL: user.displayAvatarURL(),
  });
}

/**
 * Add thumbnail to embed
 */
export function withThumbnail(e: EmbedBuilder, url: string): EmbedBuilder {
  return e.setThumbnail(url);
}

/**
 * Add user thumbnail
 */
export function withUserThumbnail(e: EmbedBuilder, user: User): EmbedBuilder {
  return e.setThumbnail(user.displayAvatarURL());
}

/**
 * Add image to embed
 */
export function withImage(e: EmbedBuilder, url: string): EmbedBuilder {
  return e.setImage(url);
}

/**
 * Add multiple fields to embed
 */
export function withFields(e: EmbedBuilder, fields: APIEmbedField[]): EmbedBuilder {
  return e.addFields(fields);
}

/**
 * Add a field to embed
 */
export function withField(
  e: EmbedBuilder,
  name: string,
  value: string,
  inline?: boolean
): EmbedBuilder {
  return e.addFields({ name, value, inline });
}

// ============================================================================
// Pre-built Embed Templates
// ============================================================================

/**
 * Build a simple success embed
 */
export function buildSuccessEmbed(
  description: string,
  options?: {
    title?: string;
    footer?: string;
  }
): EmbedBuilder {
  const e = successEmbed()
    .setTitle(`${EMOJI.SUCCESS} ${options?.title ?? 'Success'}`)
    .setDescription(description)
    .setTimestamp();

  if (options?.footer) {
    e.setFooter({ text: options.footer });
  }

  return e;
}

/**
 * Build a simple error embed
 */
export function buildErrorEmbed(
  description: string,
  options?: {
    title?: string;
    suggestion?: string;
    footer?: string;
  }
): EmbedBuilder {
  const e = errorEmbed()
    .setTitle(`${EMOJI.ERROR} ${options?.title ?? 'Error'}`)
    .setDescription(description)
    .setTimestamp();

  if (options?.suggestion) {
    e.addFields({ name: 'Suggestion', value: options.suggestion });
  }

  if (options?.footer) {
    e.setFooter({ text: options.footer });
  }

  return e;
}

/**
 * Build a simple warning embed
 */
export function buildWarningEmbed(
  description: string,
  options?: {
    title?: string;
    footer?: string;
  }
): EmbedBuilder {
  const e = warningEmbed()
    .setTitle(`${EMOJI.WARNING} ${options?.title ?? 'Warning'}`)
    .setDescription(description)
    .setTimestamp();

  if (options?.footer) {
    e.setFooter({ text: options.footer });
  }

  return e;
}

/**
 * Build a simple info embed
 */
export function buildInfoEmbed(
  description: string,
  options?: {
    title?: string;
    footer?: string;
  }
): EmbedBuilder {
  const e = infoEmbed()
    .setTitle(`${EMOJI.INFO} ${options?.title ?? 'Information'}`)
    .setDescription(description)
    .setTimestamp();

  if (options?.footer) {
    e.setFooter({ text: options.footer });
  }

  return e;
}

/**
 * Build a stats embed with multiple field sections
 */
export function buildStatsEmbed(
  title: string,
  sections: Array<{
    name: string;
    stats: Record<string, string | number>;
    inline?: boolean;
  }>,
  options?: {
    color?: ColorResolvable;
    thumbnail?: string;
    footer?: string;
  }
): EmbedBuilder {
  const e = embed(options?.color ?? COLORS.INFO)
    .setTitle(title)
    .setTimestamp();

  if (options?.thumbnail) {
    e.setThumbnail(options.thumbnail);
  }

  for (const section of sections) {
    const value = Object.entries(section.stats)
      .map(([key, val]) => `**${key}:** ${val}`)
      .join('\n');
    e.addFields({ name: section.name, value, inline: section.inline ?? true });
  }

  if (options?.footer) {
    e.setFooter({ text: options.footer });
  }

  return e;
}

/**
 * Build a list embed with pagination info
 */
export function buildListEmbed(
  title: string,
  items: string[],
  options?: {
    description?: string;
    color?: ColorResolvable;
    emptyMessage?: string;
    page?: number;
    totalPages?: number;
    totalItems?: number;
    thumbnail?: string;
  }
): EmbedBuilder {
  const e = embed(options?.color ?? COLORS.INFO)
    .setTitle(title)
    .setTimestamp();

  if (options?.description) {
    e.setDescription(options.description);
  }

  if (options?.thumbnail) {
    e.setThumbnail(options.thumbnail);
  }

  if (items.length === 0) {
    e.addFields({
      name: '\u200b',
      value: options?.emptyMessage ?? '*No items to display*',
    });
  } else {
    e.addFields({
      name: '\u200b',
      value: items.join('\n'),
    });
  }

  // Add pagination footer
  if (options?.page !== undefined && options?.totalPages !== undefined) {
    const itemsText = options.totalItems ? ` (${options.totalItems} total)` : '';
    e.setFooter({ text: `Page ${options.page} of ${options.totalPages}${itemsText}` });
  }

  return e;
}

/**
 * Build a user info embed
 */
export function buildUserEmbed(
  user: User,
  options?: {
    title?: string;
    color?: ColorResolvable;
    fields?: APIEmbedField[];
    showId?: boolean;
    showCreatedAt?: boolean;
  }
): EmbedBuilder {
  const e = embed(options?.color ?? COLORS.INFO)
    .setAuthor({
      name: user.tag,
      iconURL: user.displayAvatarURL(),
    })
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp();

  if (options?.title) {
    e.setTitle(options.title);
  }

  if (options?.showId !== false) {
    e.addFields({ name: 'User ID', value: `\`${user.id}\``, inline: true });
  }

  if (options?.showCreatedAt !== false) {
    e.addFields({
      name: 'Account Created',
      value: formatRelativeTimestamp(user.createdAt),
      inline: true,
    });
  }

  if (options?.fields) {
    e.addFields(options.fields);
  }

  return e;
}
