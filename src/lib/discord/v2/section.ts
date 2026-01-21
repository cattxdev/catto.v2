/**
 * V2 Section - Section components with accessories
 *
 * Sections are containers that hold text content and can optionally have
 * an accessory (button or thumbnail) displayed alongside the content.
 *
 * @example
 * ```ts
 * // Section with text only
 * section('Some content here')
 *
 * // Section with button accessory
 * section('Click the button!').setButtonAccessory(
 *   primaryButton({ customId: 'action', label: 'Click Me' })
 * )
 *
 * // Section with thumbnail
 * section('Image description').setThumbnailAccessory(
 *   thumbnail('https://example.com/image.png')
 * )
 *
 * // Using the builder pattern
 * sectionWithButton('Content', primaryButton({ customId: 'x', label: 'X' }))
 * sectionWithThumbnail('Content', 'https://example.com/img.png')
 * ```
 */

import { SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, ButtonBuilder } from 'discord.js';
import { toTextDisplay, type TextContent } from './primitives.js';

// ============================================================================
// Types
// ============================================================================

/** Content that can be added to a section */
export type SectionContent = TextContent | TextDisplayBuilder[];

/** Accessory types for sections */
export type SectionAccessory = ButtonBuilder | ThumbnailBuilder;

/** Options for creating a section */
export interface SectionOptions {
  /** Button accessory to display */
  button?: ButtonBuilder;
  /** Thumbnail accessory to display */
  thumbnail?: ThumbnailBuilder | string;
}

// ============================================================================
// Section Factory
// ============================================================================

/**
 * Create a section component
 *
 * @param content - Text content or array of TextDisplayBuilders
 * @param options - Optional button or thumbnail accessory
 *
 * @example
 * ```ts
 * // Simple section
 * section('Hello, world!')
 *
 * // Section with multiple text displays
 * section([
 *   text('Line 1'),
 *   text('Line 2'),
 * ])
 *
 * // Section with button
 * section('Click me!', {
 *   button: primaryButton({ customId: 'click', label: 'Click' })
 * })
 *
 * // Section with thumbnail
 * section('Nice image!', {
 *   thumbnail: 'https://example.com/image.png'
 * })
 * ```
 */
export function section(content: SectionContent, options: SectionOptions = {}): SectionBuilder {
  const builder = new SectionBuilder();

  // Add text content
  if (Array.isArray(content)) {
    builder.addTextDisplayComponents(...content);
  } else {
    builder.addTextDisplayComponents(toTextDisplay(content));
  }

  // Add accessory
  if (options.button) {
    builder.setButtonAccessory(options.button);
  } else if (options.thumbnail) {
    const thumb =
      typeof options.thumbnail === 'string'
        ? new ThumbnailBuilder().setURL(options.thumbnail)
        : options.thumbnail;
    builder.setThumbnailAccessory(thumb);
  }

  return builder;
}

/**
 * Create a section with a button accessory
 *
 * @example
 * ```ts
 * sectionWithButton(
 *   'Press the button to continue',
 *   primaryButton({ customId: 'continue', label: 'Continue' })
 * )
 * ```
 */
export function sectionWithButton(content: SectionContent, button: ButtonBuilder): SectionBuilder {
  return section(content, { button });
}

/**
 * Create a section with a thumbnail accessory
 *
 * @example
 * ```ts
 * sectionWithThumbnail(
 *   'Check out this image!',
 *   'https://example.com/image.png'
 * )
 * ```
 */
export function sectionWithThumbnail(
  content: SectionContent,
  thumbnail: ThumbnailBuilder | string
): SectionBuilder {
  return section(content, { thumbnail });
}

// ============================================================================
// Section Content Helpers
// ============================================================================

/**
 * Create a section with a title and description
 *
 * @example
 * ```ts
 * titledSection('Welcome', 'This is the description text.')
 * ```
 */
export function titledSection(
  title: string,
  description: string,
  options: SectionOptions = {}
): SectionBuilder {
  return section(`**${title}**\n${description}`, options);
}

/**
 * Create a section displaying key-value pairs
 *
 * @example
 * ```ts
 * kvSection({
 *   'Username': 'john_doe',
 *   'Status': 'Active',
 *   'Role': 'Member'
 * })
 * ```
 */
export function kvSection(
  pairs: Record<string, string | number | boolean | undefined>,
  options: SectionOptions = {}
): SectionBuilder {
  const content = Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `**${k}:** ${v}`)
    .join('\n');

  return section(content, options);
}

/**
 * Create a section with a bulleted list
 *
 * @example
 * ```ts
 * listSection(['Item 1', 'Item 2', 'Item 3'])
 *
 * // With title
 * listSection(['Apple', 'Banana', 'Cherry'], {}, 'Fruits')
 * ```
 */
export function listSection(
  items: string[],
  options: SectionOptions = {},
  title?: string
): SectionBuilder {
  const list = items.map((item) => `- ${item}`).join('\n');
  const content = title ? `**${title}**\n${list}` : list;
  return section(content, options);
}

/**
 * Create a section with a numbered list
 *
 * @example
 * ```ts
 * numberedSection(['First step', 'Second step', 'Third step'])
 * ```
 */
export function numberedSection(
  items: string[],
  options: SectionOptions = {},
  title?: string
): SectionBuilder {
  const list = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const content = title ? `**${title}**\n${list}` : list;
  return section(content, options);
}

// ============================================================================
// Section Builder Extensions
// ============================================================================

/**
 * Add text content to an existing section
 */
export function addSectionText(
  sectionBuilder: SectionBuilder,
  content: TextContent
): SectionBuilder {
  return sectionBuilder.addTextDisplayComponents(toTextDisplay(content));
}

/**
 * Set button accessory on an existing section
 */
export function withButton(sectionBuilder: SectionBuilder, button: ButtonBuilder): SectionBuilder {
  return sectionBuilder.setButtonAccessory(button);
}

/**
 * Set thumbnail accessory on an existing section
 */
export function withThumbnail(
  sectionBuilder: SectionBuilder,
  thumbnail: ThumbnailBuilder | string
): SectionBuilder {
  const thumb =
    typeof thumbnail === 'string' ? new ThumbnailBuilder().setURL(thumbnail) : thumbnail;
  return sectionBuilder.setThumbnailAccessory(thumb);
}
