/**
 * V2 Container Builders
 *
 * Fluent API for building Discord Components V2 containers with a composable,
 * framework-like approach. Containers are the root elements of V2 messages.
 */

import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { COLORS, SPACING, EMOJI } from '../design.js';

// ============================================================================
// Container Factory
// ============================================================================

/**
 * Configuration for a container
 */
export interface ContainerConfig {
  accentColor?: number;
  spoiler?: boolean;
}

/**
 * Create a new container with optional configuration
 */
export function container(config?: ContainerConfig): ContainerBuilder {
  const c = new ContainerBuilder();
  if (config?.accentColor) {
    c.setAccentColor(config.accentColor);
  }
  if (config?.spoiler) {
    c.setSpoiler(true);
  }
  return c;
}

/**
 * Create a success-themed container
 */
export function successContainer(): ContainerBuilder {
  return container({ accentColor: COLORS.SUCCESS as number });
}

/**
 * Create an error-themed container
 */
export function errorContainer(): ContainerBuilder {
  return container({ accentColor: COLORS.ERROR as number });
}

/**
 * Create a warning-themed container
 */
export function warningContainer(): ContainerBuilder {
  return container({ accentColor: COLORS.WARNING as number });
}

/**
 * Create an info-themed container
 */
export function infoContainer(): ContainerBuilder {
  return container({ accentColor: COLORS.INFO as number });
}

/**
 * Create a primary-themed container (for mod panels, etc.)
 */
export function primaryContainer(): ContainerBuilder {
  return container({ accentColor: COLORS.PRIMARY as number });
}

// ============================================================================
// Text Display Builders
// ============================================================================

/**
 * Create a text display with content
 */
export function text(content: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(content);
}

/**
 * Create a heading (h1)
 */
export function h1(content: string, emoji?: string): TextDisplayBuilder {
  const prefix = emoji ? `${emoji} ` : '';
  return text(`# ${prefix}${content}`);
}

/**
 * Create a subheading (h2)
 */
export function h2(content: string, emoji?: string): TextDisplayBuilder {
  const prefix = emoji ? `${emoji} ` : '';
  return text(`## ${prefix}${content}`);
}

/**
 * Create a sub-subheading (h3)
 */
export function h3(content: string, emoji?: string): TextDisplayBuilder {
  const prefix = emoji ? `${emoji} ` : '';
  return text(`### ${prefix}${content}`);
}

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
 * Create inline code
 */
export function code(content: string): string {
  return `\`${content}\``;
}

/**
 * Create a code block
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

// ============================================================================
// Separator Builders
// ============================================================================

/**
 * Create a small separator
 */
export function smallSeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setSpacing(SPACING.SMALL);
}

/**
 * Create a large separator
 */
export function largeSeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setSpacing(SPACING.LARGE);
}

/**
 * Create a divider (separator with line)
 */
export function divider(spacing: 'small' | 'large' = 'small'): SeparatorBuilder {
  return new SeparatorBuilder()
    .setSpacing(spacing === 'small' ? SeparatorSpacingSize.Small : SeparatorSpacingSize.Large)
    .setDivider(true);
}

// ============================================================================
// Container Builder Extensions (Fluent Helpers)
// ============================================================================

/**
 * Add a header section to a container
 */
export function addHeader(
  c: ContainerBuilder,
  title: string,
  options?: {
    subtitle?: string;
    emoji?: string;
  }
): ContainerBuilder {
  c.addTextDisplayComponents(h1(title, options?.emoji));
  if (options?.subtitle) {
    c.addTextDisplayComponents(text(options.subtitle));
  }
  c.addSeparatorComponents(smallSeparator());
  return c;
}

/**
 * Add a section with title and content
 */
export function addSection(
  c: ContainerBuilder,
  title: string,
  content: string,
  options?: {
    emoji?: string;
    dividerBefore?: boolean;
    dividerAfter?: boolean;
  }
): ContainerBuilder {
  if (options?.dividerBefore) {
    c.addSeparatorComponents(smallSeparator());
  }
  c.addTextDisplayComponents(h2(title, options?.emoji));
  c.addTextDisplayComponents(text(content));
  if (options?.dividerAfter) {
    c.addSeparatorComponents(smallSeparator());
  }
  return c;
}

/**
 * Add key-value pairs to a container
 */
export function addKeyValues(
  c: ContainerBuilder,
  data: Record<string, string | number | boolean>,
  options?: {
    title?: string;
    emoji?: string;
    inline?: boolean;
  }
): ContainerBuilder {
  if (options?.title) {
    c.addTextDisplayComponents(h2(options.title, options.emoji));
  }

  if (options?.inline) {
    // Inline format: Key: Value · Key: Value
    const line = Object.entries(data)
      .map(([key, value]) => `${bold(key)}: ${value}`)
      .join(' · ');
    c.addTextDisplayComponents(text(line));
  } else {
    // Stacked format
    const lines = Object.entries(data).map(([key, value]) => `${bold(key)}: ${value}`);
    c.addTextDisplayComponents(text(lines.join('\n')));
  }

  return c;
}

/**
 * Add a bulleted list to a container
 */
export function addList(
  c: ContainerBuilder,
  items: string[],
  options?: {
    title?: string;
    emoji?: string;
    emptyMessage?: string;
    ordered?: boolean;
  }
): ContainerBuilder {
  if (options?.title) {
    c.addTextDisplayComponents(h2(options.title, options.emoji));
  }

  if (items.length === 0) {
    c.addTextDisplayComponents(text(italic(options?.emptyMessage ?? 'No items')));
  } else if (options?.ordered) {
    const content = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    c.addTextDisplayComponents(text(content));
  } else {
    const content = items.map((item) => `- ${item}`).join('\n');
    c.addTextDisplayComponents(text(content));
  }

  return c;
}

/**
 * Add a footer text to a container
 */
export function addFooter(
  c: ContainerBuilder,
  content: string,
  options?: {
    dividerBefore?: boolean;
  }
): ContainerBuilder {
  if (options?.dividerBefore) {
    c.addSeparatorComponents(smallSeparator());
  }
  c.addTextDisplayComponents(text(italic(content)));
  return c;
}

/**
 * Add action rows (buttons/selects) to a container
 */
export function addActions(
  c: ContainerBuilder,
  ...rows: ActionRowBuilder<ButtonBuilder>[]
): ContainerBuilder {
  c.addActionRowComponents(...rows);
  return c;
}

// ============================================================================
// Pre-built Container Templates
// ============================================================================

/**
 * Build a success message container
 */
export function buildSuccess(
  title: string,
  options?: {
    message?: string;
    details?: Record<string, string>;
    footer?: string;
  }
): ContainerBuilder {
  const c = successContainer();
  c.addTextDisplayComponents(h1(title, EMOJI.SUCCESS));

  if (options?.message) {
    c.addTextDisplayComponents(text(options.message));
  }

  if (options?.details && Object.keys(options.details).length > 0) {
    addKeyValues(c, options.details);
  }

  if (options?.footer) {
    addFooter(c, options.footer, { dividerBefore: true });
  }

  return c;
}

/**
 * Build an error message container
 */
export function buildError(
  message: string,
  options?: {
    title?: string;
    suggestion?: string;
    footer?: string;
  }
): ContainerBuilder {
  const c = errorContainer();
  c.addTextDisplayComponents(h1(options?.title ?? 'Error', EMOJI.ERROR));
  c.addTextDisplayComponents(text(message));

  if (options?.suggestion) {
    c.addSeparatorComponents(smallSeparator());
    c.addTextDisplayComponents(text(`${EMOJI.INFO} ${bold('Suggestion:')} ${options.suggestion}`));
  }

  if (options?.footer) {
    addFooter(c, options.footer, { dividerBefore: true });
  }

  return c;
}

/**
 * Build a warning message container
 */
export function buildWarning(
  message: string,
  options?: {
    title?: string;
    details?: Record<string, string>;
  }
): ContainerBuilder {
  const c = warningContainer();
  c.addTextDisplayComponents(h1(options?.title ?? 'Warning', EMOJI.WARNING));
  c.addTextDisplayComponents(text(message));

  if (options?.details && Object.keys(options.details).length > 0) {
    c.addSeparatorComponents(smallSeparator());
    addKeyValues(c, options.details);
  }

  return c;
}

/**
 * Build an info message container
 */
export function buildInfo(
  message: string,
  options?: {
    title?: string;
    details?: Record<string, string>;
  }
): ContainerBuilder {
  const c = infoContainer();
  c.addTextDisplayComponents(h1(options?.title ?? 'Information', EMOJI.INFO));
  c.addTextDisplayComponents(text(message));

  if (options?.details && Object.keys(options.details).length > 0) {
    c.addSeparatorComponents(smallSeparator());
    addKeyValues(c, options.details);
  }

  return c;
}

/**
 * Build a loading state container
 */
export function buildLoading(message: string = 'Loading...'): ContainerBuilder {
  const c = container();
  c.addTextDisplayComponents(text(`${EMOJI.TIME} ${message}`));
  return c;
}

/**
 * Build a confirmation prompt container
 */
export function buildConfirmation(
  message: string,
  options?: {
    title?: string;
    warning?: string;
    details?: Record<string, string>;
  }
): ContainerBuilder {
  const c = warningContainer();
  c.addTextDisplayComponents(h1(options?.title ?? 'Confirm Action', EMOJI.WARNING));
  c.addTextDisplayComponents(text(message));

  if (options?.warning) {
    c.addTextDisplayComponents(text(`\n${EMOJI.WARNING} ${options.warning}`));
  }

  if (options?.details && Object.keys(options.details).length > 0) {
    c.addSeparatorComponents(smallSeparator());
    addKeyValues(c, options.details);
  }

  return c;
}
