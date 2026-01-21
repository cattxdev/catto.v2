/**
 * V2 Container - Composable container builder for Components V2
 *
 * The Container is the root component for V2 messages. It can hold:
 * - TextDisplay components
 * - Separator components
 * - Section components (with optional accessories)
 * - MediaGallery components
 * - File components
 * - ActionRow components (buttons, selects)
 *
 * This module provides a fluent, composable API for building containers
 * by nesting components together.
 *
 * @example
 * ```ts
 * // Basic container with text and buttons
 * container()
 *   .accent(COLORS.PRIMARY)
 *   .text('# Welcome!')
 *   .text('Click a button below')
 *   .separator()
 *   .actions(
 *     row(
 *       primaryButton({ customId: 'start', label: 'Get Started' }),
 *       secondaryButton({ customId: 'help', label: 'Help' })
 *     )
 *   )
 *
 * // Container with sections
 * container()
 *   .section('User Information', {
 *     thumbnail: user.displayAvatarURL()
 *   })
 *   .divider()
 *   .section('Actions available')
 *   .actions(confirmationRow('confirm', 'cancel'))
 * ```
 */

import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  MediaGalleryBuilder,
  FileBuilder,
  ActionRowBuilder,
  type MessageActionRowComponentBuilder,
  type RGBTuple,
} from 'discord.js';
import { COLORS } from '../design.js';
import {
  separator as createSeparator,
  divider as createDivider,
  toTextDisplay,
  type TextContent,
  type SeparatorOptions,
} from './primitives.js';
import { section as createSection, type SectionOptions, type SectionContent } from './section.js';
import {
  mediaGallery as createMediaGallery,
  file as createFile,
  type MediaGalleryItemOptions,
  type FileOptions,
} from './media.js';

// ============================================================================
// Types
// ============================================================================

/** Accent color for containers (number for hex, or RGB tuple) */
export type AccentColor = number | RGBTuple;

/** Any component that can be added to a container */
export type ContainerComponent =
  | TextDisplayBuilder
  | SeparatorBuilder
  | SectionBuilder
  | MediaGalleryBuilder
  | FileBuilder
  | ActionRowBuilder<MessageActionRowComponentBuilder>;

/** Options for creating a container */
export interface ContainerOptions {
  /** Accent color for the container */
  color?: AccentColor;
  /** Whether to mark the entire container as a spoiler */
  spoiler?: boolean;
}

// ============================================================================
// Fluent Container Builder
// ============================================================================

/**
 * A fluent wrapper around ContainerBuilder that provides a composable API
 *
 * @example
 * ```ts
 * const message = container()
 *   .accent(COLORS.SUCCESS)
 *   .text('# Success!')
 *   .text('Your action completed successfully.')
 *   .separator()
 *   .actions(row(primaryButton({ customId: 'ok', label: 'OK' })))
 *   .build();
 * ```
 */
export class FluentContainer {
  private builder: ContainerBuilder;

  constructor(options: ContainerOptions = {}) {
    this.builder = new ContainerBuilder();

    if (options.color) {
      this.builder.setAccentColor(options.color);
    }

    if (options.spoiler) {
      this.builder.setSpoiler(true);
    }
  }

  /**
   * Set the accent color
   */
  accent(color: AccentColor): this {
    this.builder.setAccentColor(color);
    return this;
  }

  /**
   * Mark the container as a spoiler
   */
  spoiler(isSpoiler = true): this {
    this.builder.setSpoiler(isSpoiler);
    return this;
  }

  // --------------------------------------------------------------------------
  // Text Display
  // --------------------------------------------------------------------------

  /**
   * Add a text display component
   *
   * @example
   * ```ts
   * container()
   *   .text('Hello, world!')
   *   .text('**Bold** and *italic*')
   *   .text(textDisplay('Pre-built text'))
   * ```
   */
  text(content: TextContent): this {
    this.builder.addTextDisplayComponents(toTextDisplay(content));
    return this;
  }

  /**
   * Add multiple text displays
   */
  texts(...contents: TextContent[]): this {
    for (const content of contents) {
      this.text(content);
    }
    return this;
  }

  /**
   * Add a heading level 1
   */
  h1(content: string): this {
    return this.text(`# ${content}`);
  }

  /**
   * Add a heading level 2
   */
  h2(content: string): this {
    return this.text(`## ${content}`);
  }

  /**
   * Add a heading level 3
   */
  h3(content: string): this {
    return this.text(`### ${content}`);
  }

  /**
   * Add a text display with key-value pairs
   *
   * @example
   * ```ts
   * container().kv({
   *   'User': 'john_doe',
   *   'Status': 'Active',
   *   'Joined': '2024-01-01'
   * })
   * ```
   */
  kv(pairs: Record<string, string | number | boolean | undefined>): this {
    const content = Object.entries(pairs)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `**${k}:** ${v}`)
      .join('\n');

    return this.text(content);
  }

  /**
   * Add a bulleted list
   */
  list(items: string[], title?: string): this {
    const list = items.map((item) => `- ${item}`).join('\n');
    return this.text(title ? `**${title}**\n${list}` : list);
  }

  /**
   * Add a numbered list
   */
  numberedList(items: string[], title?: string): this {
    const list = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    return this.text(title ? `**${title}**\n${list}` : list);
  }

  /**
   * Add a code block
   */
  codeBlock(code: string, language?: string): this {
    return this.text(`\`\`\`${language ?? ''}\n${code}\n\`\`\``);
  }

  /**
   * Add a blockquote
   */
  quote(content: string): this {
    const quoted = content
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    return this.text(quoted);
  }

  // --------------------------------------------------------------------------
  // Separators
  // --------------------------------------------------------------------------

  /**
   * Add a separator
   *
   * @example
   * ```ts
   * container()
   *   .text('Above')
   *   .separator()           // Small spacing, no divider
   *   .separator({ divider: true })  // With line
   *   .separator({ spacing: 'large' }) // Large spacing
   *   .text('Below')
   * ```
   */
  separator(options: SeparatorOptions = {}): this {
    this.builder.addSeparatorComponents(createSeparator(options));
    return this;
  }

  /**
   * Add a divider (separator with a line)
   */
  divider(): this {
    this.builder.addSeparatorComponents(createDivider());
    return this;
  }

  /**
   * Add a large separator (no line, large spacing)
   */
  space(): this {
    return this.separator({ spacing: 'large' });
  }

  // --------------------------------------------------------------------------
  // Sections
  // --------------------------------------------------------------------------

  /**
   * Add a section component
   *
   * @example
   * ```ts
   * container()
   *   .section('Simple section')
   *   .section('With thumbnail', { thumbnail: 'https://example.com/img.png' })
   *   .section('With button', { button: myButton })
   * ```
   */
  section(content: SectionContent, options: SectionOptions = {}): this {
    this.builder.addSectionComponents(createSection(content, options));
    return this;
  }

  /**
   * Add a section with a button accessory
   */
  sectionWithButton(
    content: SectionContent,
    button: Parameters<SectionBuilder['setButtonAccessory']>[0]
  ): this {
    const sec = createSection(content);
    sec.setButtonAccessory(button);
    this.builder.addSectionComponents(sec);
    return this;
  }

  /**
   * Add a section with a thumbnail accessory
   */
  sectionWithThumbnail(content: SectionContent, thumbnailUrl: string): this {
    return this.section(content, { thumbnail: thumbnailUrl });
  }

  /**
   * Add a titled section with key-value content
   *
   * @example
   * ```ts
   * container().infoSection('User Details', {
   *   'Username': 'john',
   *   'ID': '123456789'
   * })
   * ```
   */
  infoSection(
    title: string,
    data: Record<string, string | number | boolean | undefined>,
    options: SectionOptions = {}
  ): this {
    const content = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `**${k}:** ${v}`)
      .join('\n');

    return this.section(`**${title}**\n${content}`, options);
  }

  // --------------------------------------------------------------------------
  // Media
  // --------------------------------------------------------------------------

  /**
   * Add a media gallery
   *
   * @example
   * ```ts
   * container().gallery([
   *   'https://example.com/img1.png',
   *   'https://example.com/img2.png',
   * ])
   *
   * container().gallery([
   *   { url: 'https://example.com/img.png', description: 'Caption' }
   * ])
   * ```
   */
  gallery(items: (string | MediaGalleryItemOptions)[] | MediaGalleryBuilder): this {
    if (items instanceof MediaGalleryBuilder) {
      this.builder.addMediaGalleryComponents(items);
    } else {
      this.builder.addMediaGalleryComponents(createMediaGallery(items));
    }
    return this;
  }

  /**
   * Add a single image (as a gallery with one item)
   */
  image(url: string, description?: string): this {
    return this.gallery([{ url, description }]);
  }

  /**
   * Add a file component
   *
   * @example
   * ```ts
   * container().file('attachment://document.pdf')
   * ```
   */
  file(options: string | FileOptions | FileBuilder): this {
    if (options instanceof FileBuilder) {
      this.builder.addFileComponents(options);
    } else {
      this.builder.addFileComponents(createFile(options));
    }
    return this;
  }

  // --------------------------------------------------------------------------
  // Action Rows
  // --------------------------------------------------------------------------

  /**
   * Add action row(s) with buttons or select menus
   *
   * @example
   * ```ts
   * container()
   *   .actions(
   *     row(primaryButton({ customId: 'a', label: 'A' })),
   *     row(secondaryButton({ customId: 'b', label: 'B' }))
   *   )
   *
   * // Or add pre-built rows
   * container().actions(confirmationRow('confirm', 'cancel'))
   * ```
   */
  actions(...rows: ActionRowBuilder<MessageActionRowComponentBuilder>[]): this {
    this.builder.addActionRowComponents(...rows);
    return this;
  }

  /**
   * Alias for actions()
   */
  rows(...rows: ActionRowBuilder<MessageActionRowComponentBuilder>[]): this {
    return this.actions(...rows);
  }

  // --------------------------------------------------------------------------
  // Raw Components
  // --------------------------------------------------------------------------

  /**
   * Add raw components directly to the container
   *
   * Use this when you need to add pre-built components that don't fit
   * the fluent API methods.
   */
  add(...components: ContainerComponent[]): this {
    for (const component of components) {
      if (component instanceof TextDisplayBuilder) {
        this.builder.addTextDisplayComponents(component);
      } else if (component instanceof SeparatorBuilder) {
        this.builder.addSeparatorComponents(component);
      } else if (component instanceof SectionBuilder) {
        this.builder.addSectionComponents(component);
      } else if (component instanceof MediaGalleryBuilder) {
        this.builder.addMediaGalleryComponents(component);
      } else if (component instanceof FileBuilder) {
        this.builder.addFileComponents(component);
      } else if (component instanceof ActionRowBuilder) {
        this.builder.addActionRowComponents(
          component as ActionRowBuilder<MessageActionRowComponentBuilder>
        );
      }
    }
    return this;
  }

  /**
   * Conditionally add components
   *
   * @example
   * ```ts
   * container()
   *   .text('Always shown')
   *   .when(showWarning, (c) => c.text('**Warning!**'))
   *   .text('Always shown too')
   * ```
   */
  when(condition: boolean, fn: (container: this) => this): this {
    if (condition) {
      return fn(this);
    }
    return this;
  }

  /**
   * Transform the container with a function
   *
   * @example
   * ```ts
   * container()
   *   .text('Base content')
   *   .pipe(addFooter('Powered by Bot'))
   * ```
   */
  pipe(fn: (container: this) => this): this {
    return fn(this);
  }

  // --------------------------------------------------------------------------
  // Build
  // --------------------------------------------------------------------------

  /**
   * Get the underlying ContainerBuilder
   *
   * Use this when you need direct access to the builder for advanced usage.
   */
  unwrap(): ContainerBuilder {
    return this.builder;
  }

  /**
   * Build and return the ContainerBuilder
   *
   * This is an alias for unwrap() that makes the intent clearer.
   */
  build(): ContainerBuilder {
    return this.builder;
  }

  /**
   * Convert to JSON (for debugging or serialization)
   */
  toJSON(): unknown {
    return this.builder.toJSON();
  }
}

// ============================================================================
// Container Factory
// ============================================================================

/**
 * Create a new fluent container
 *
 * @example
 * ```ts
 * const message = container()
 *   .accent(COLORS.SUCCESS)
 *   .h1('Success!')
 *   .text('Operation completed.')
 *   .build();
 * ```
 */
export function container(options: ContainerOptions = {}): FluentContainer {
  return new FluentContainer(options);
}

/**
 * Create a container with success styling
 */
export function successContainer(): FluentContainer {
  return container({ color: COLORS.SUCCESS });
}

/**
 * Create a container with error styling
 */
export function errorContainer(): FluentContainer {
  return container({ color: COLORS.ERROR });
}

/**
 * Create a container with warning styling
 */
export function warningContainer(): FluentContainer {
  return container({ color: COLORS.WARNING });
}

/**
 * Create a container with info styling
 */
export function infoContainer(): FluentContainer {
  return container({ color: COLORS.INFO });
}

/**
 * Create a container with primary/brand styling
 */
export function primaryContainer(): FluentContainer {
  return container({ color: COLORS.PRIMARY });
}

/**
 * Create a container with neutral styling
 */
export function neutralContainer(): FluentContainer {
  return container({ color: COLORS.NEUTRAL });
}

// ============================================================================
// Quick Builders (Pre-composed templates)
// ============================================================================

/**
 * Build a simple message container
 *
 * @example
 * ```ts
 * simpleMessage('# Hello', 'Welcome to the server!')
 * ```
 */
export function simpleMessage(...lines: string[]): FluentContainer {
  const c = container();
  for (const line of lines) {
    c.text(line);
  }
  return c;
}

/**
 * Build a success message
 *
 * @example
 * ```ts
 * successMessage('Done!', 'Your changes have been saved.')
 * ```
 */
export function successMessage(title: string, description?: string): FluentContainer {
  const c = successContainer().h1(title);
  if (description) {
    c.text(description);
  }
  return c;
}

/**
 * Build an error message
 *
 * @example
 * ```ts
 * errorMessage('Error', 'Something went wrong.')
 * ```
 */
export function errorMessage(title: string, description?: string): FluentContainer {
  const c = errorContainer().h1(title);
  if (description) {
    c.text(description);
  }
  return c;
}

/**
 * Build a warning message
 */
export function warningMessage(title: string, description?: string): FluentContainer {
  const c = warningContainer().h1(title);
  if (description) {
    c.text(description);
  }
  return c;
}

/**
 * Build an info message
 */
export function infoMessage(title: string, description?: string): FluentContainer {
  const c = infoContainer().h1(title);
  if (description) {
    c.text(description);
  }
  return c;
}
