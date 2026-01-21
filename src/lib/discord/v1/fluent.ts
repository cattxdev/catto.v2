/**
 * V1 Fluent Embed - Composable embed builder
 *
 * A fluent wrapper around EmbedBuilder that provides a composable API
 * similar to the V2 FluentContainer.
 *
 * @example
 * ```ts
 * // Basic usage
 * const embed = fluentEmbed()
 *   .color(COLORS.SUCCESS)
 *   .title('Success!')
 *   .description('Operation completed.')
 *   .field('Status', 'Active', true)
 *   .timestamp()
 *   .build();
 *
 * // With user data
 * const userEmbed = fluentEmbed()
 *   .color(COLORS.INFO)
 *   .author(user)
 *   .thumbnail(user)
 *   .title('User Profile')
 *   .fields([
 *     { name: 'ID', value: user.id, inline: true },
 *     { name: 'Created', value: timestamp(user.createdAt), inline: true }
 *   ])
 *   .build();
 * ```
 */

import { EmbedBuilder, type User, type APIEmbedField, type ColorResolvable } from 'discord.js';
import { container } from '@sapphire/framework';
import { COLORS } from '../design.js';

// ============================================================================
// Types
// ============================================================================

/** A function that transforms a FluentEmbed */
export type EmbedTransform = (e: FluentEmbed) => FluentEmbed;

// ============================================================================
// Fluent Embed Builder
// ============================================================================

/**
 * A fluent wrapper around EmbedBuilder
 */
export class FluentEmbed {
  private builder: EmbedBuilder;

  constructor(color?: ColorResolvable) {
    this.builder = new EmbedBuilder();
    if (color) {
      this.builder.setColor(color);
    }
  }

  // --------------------------------------------------------------------------
  // Basic Properties
  // --------------------------------------------------------------------------

  /**
   * Set the embed color
   */
  color(color: ColorResolvable): this {
    this.builder.setColor(color);
    return this;
  }

  /**
   * Set the embed title (skips if title is empty)
   */
  title(title: string, emoji?: string): this {
    // Skip empty titles to avoid Discord API errors
    if (!title?.trim()) {
      return this;
    }
    const fullTitle = emoji ? `${emoji} ${title}` : title;
    this.builder.setTitle(fullTitle);
    return this;
  }

  /**
   * Set the embed description (skips if text is empty)
   */
  description(text: string): this {
    // Skip empty descriptions to avoid Discord API errors
    if (!text?.trim()) {
      return this;
    }
    this.builder.setDescription(text);
    return this;
  }

  /**
   * Append text to the description
   */
  appendDescription(text: string): this {
    const current = this.builder.data.description ?? '';
    this.builder.setDescription(current + text);
    return this;
  }

  /**
   * Set the embed URL
   */
  url(url: string): this {
    this.builder.setURL(url);
    return this;
  }

  // --------------------------------------------------------------------------
  // Author
  // --------------------------------------------------------------------------

  /**
   * Set the author from a name string or User object
   */
  author(nameOrUser: string | User, options?: { iconURL?: string; url?: string }): this {
    if (typeof nameOrUser === 'string') {
      this.builder.setAuthor({
        name: nameOrUser,
        iconURL: options?.iconURL,
        url: options?.url,
      });
    } else {
      this.builder.setAuthor({
        name: nameOrUser.tag,
        iconURL: nameOrUser.displayAvatarURL(),
        url: options?.url,
      });
    }
    return this;
  }

  // --------------------------------------------------------------------------
  // Footer
  // --------------------------------------------------------------------------

  /**
   * Set the footer (skips if text is empty)
   */
  footer(text: string, iconURL?: string): this {
    // Skip empty footers to avoid Discord API errors
    if (!text?.trim()) {
      return this;
    }
    this.builder.setFooter({ text, iconURL });
    return this;
  }

  /**
   * Add a timestamp to the embed
   */
  timestamp(date?: Date | number): this {
    this.builder.setTimestamp(date);
    return this;
  }

  // --------------------------------------------------------------------------
  // Images
  // --------------------------------------------------------------------------

  /**
   * Set the thumbnail from URL or User
   */
  thumbnail(urlOrUser: string | User): this {
    const url = typeof urlOrUser === 'string' ? urlOrUser : urlOrUser.displayAvatarURL();
    this.builder.setThumbnail(url);
    return this;
  }

  /**
   * Set the main image
   */
  image(url: string): this {
    this.builder.setImage(url);
    return this;
  }

  // --------------------------------------------------------------------------
  // Fields
  // --------------------------------------------------------------------------

  /**
   * Add a single field (skips if name or value is empty)
   */
  field(name: string, value: string, inline = false): this {
    // Skip fields with empty name or value to avoid Discord API errors
    if (!name?.trim() || !value?.trim()) {
      return this;
    }
    this.builder.addFields({ name, value, inline });
    return this;
  }

  /**
   * Add multiple fields (filters out any with empty name or value)
   */
  fields(fields: APIEmbedField[]): this {
    // Filter out fields with empty name or value
    const validFields = fields.filter((f) => f.name?.trim() && f.value?.trim());
    if (validFields.length > 0) {
      this.builder.addFields(validFields);
    }
    return this;
  }

  /**
   * Add an inline field
   */
  inlineField(name: string, value: string): this {
    return this.field(name, value, true);
  }

  /**
   * Add a blank field (spacer)
   */
  blankField(inline = false): this {
    return this.field('\u200b', '\u200b', inline);
  }

  /**
   * Add key-value pairs as fields
   */
  kvFields(pairs: Record<string, string | number | boolean | undefined>, inline = true): this {
    const fields = Object.entries(pairs)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([name, value]) => ({
        name,
        value: String(value),
        inline,
      }));
    return this.fields(fields);
  }

  /**
   * Add a list as the description or a field
   */
  list(items: string[], title?: string): this {
    const list = items.map((item) => `• ${item}`).join('\n');
    if (title) {
      return this.field(title, list);
    }
    return this.description(list);
  }

  /**
   * Add a numbered list
   */
  numberedList(items: string[], title?: string): this {
    const list = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    if (title) {
      return this.field(title, list);
    }
    return this.description(list);
  }

  // --------------------------------------------------------------------------
  // Conditional & Composition
  // --------------------------------------------------------------------------

  /**
   * Conditionally apply a transformation
   */
  when(condition: boolean, fn: (e: this) => this): this {
    if (condition) {
      return fn(this);
    }
    return this;
  }

  /**
   * Pipe through a transformation
   */
  pipe(fn: (e: this) => this): this {
    return fn(this);
  }

  // --------------------------------------------------------------------------
  // Build
  // --------------------------------------------------------------------------

  /**
   * Check if the embed has any content (at least one visible component)
   */
  hasContent(): boolean {
    const data = this.builder.data;
    return !!(
      data.title?.trim() ||
      data.description?.trim() ||
      (data.fields && data.fields.length > 0) ||
      data.author?.name?.trim() ||
      data.footer?.text?.trim() ||
      data.image?.url ||
      data.thumbnail?.url
    );
  }

  /**
   * Get the underlying EmbedBuilder
   */
  unwrap(): EmbedBuilder {
    return this.builder;
  }

  /**
   * Build and return the EmbedBuilder
   * Logs a warning if the embed has no visible content (would error on Discord API)
   */
  build(): EmbedBuilder {
    if (!this.hasContent()) {
      container.logger.warn(
        '[FluentEmbed] Building embed with no visible content - this may fail on Discord API',
        { embedData: JSON.stringify(this.builder.data) }
      );
    }
    return this.builder;
  }

  /**
   * Build with strict validation - throws if embed is empty
   */
  buildStrict(): EmbedBuilder {
    if (!this.hasContent()) {
      throw new Error(
        'Embed must have at least one visible component (title, description, field, author, footer, or image)'
      );
    }
    return this.builder;
  }

  /**
   * Convert to JSON
   */
  toJSON(): unknown {
    return this.builder.toJSON();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new fluent embed
 */
export function fluentEmbed(color?: ColorResolvable): FluentEmbed {
  return new FluentEmbed(color);
}

/**
 * Create a success-themed fluent embed
 */
export function fluentSuccess(): FluentEmbed {
  return fluentEmbed(COLORS.SUCCESS);
}

/**
 * Create an error-themed fluent embed
 */
export function fluentError(): FluentEmbed {
  return fluentEmbed(COLORS.ERROR);
}

/**
 * Create a warning-themed fluent embed
 */
export function fluentWarning(): FluentEmbed {
  return fluentEmbed(COLORS.WARNING);
}

/**
 * Create an info-themed fluent embed
 */
export function fluentInfo(): FluentEmbed {
  return fluentEmbed(COLORS.INFO);
}

/**
 * Create a neutral-themed fluent embed
 */
export function fluentNeutral(): FluentEmbed {
  return fluentEmbed(COLORS.NEUTRAL);
}

// ============================================================================
// Composition Utilities
// ============================================================================

/**
 * Pipe an embed through multiple transformations
 */
export function pipeEmbed(initial: FluentEmbed, ...transforms: EmbedTransform[]): FluentEmbed {
  return transforms.reduce((e, fn) => fn(e), initial);
}

/**
 * Compose multiple embed transformations
 */
export function composeEmbed(...transforms: EmbedTransform[]): EmbedTransform {
  return (e: FluentEmbed) => transforms.reduce((acc, fn) => fn(acc), e);
}

/**
 * Apply transformation only if condition is true
 */
export function whenEmbed(condition: boolean, transform: EmbedTransform): EmbedTransform {
  return (e: FluentEmbed) => (condition ? transform(e) : e);
}

/**
 * Apply one of two transformations based on condition
 */
export function ifElseEmbed(
  condition: boolean,
  onTrue: EmbedTransform,
  onFalse: EmbedTransform
): EmbedTransform {
  return (e: FluentEmbed) => (condition ? onTrue(e) : onFalse(e));
}

// ============================================================================
// Common Transforms
// ============================================================================

/**
 * Add a user as the author
 */
export function withUser(user: User): EmbedTransform {
  return (e: FluentEmbed) => e.author(user).thumbnail(user);
}

/**
 * Add timestamp and footer
 */
export function withTimestampFooter(footerText: string): EmbedTransform {
  return (e: FluentEmbed) => e.footer(footerText).timestamp();
}

/**
 * Add a standard "Powered by" footer
 */
export function withPoweredBy(name: string): EmbedTransform {
  return (e: FluentEmbed) => e.footer(`Powered by ${name}`);
}
