/**
 * Design System for Moderation Components V2
 *
 * Provides consistent styling, spacing, and builders for all moderation UI.
 */

import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorSpacingSize,
  type User,
} from 'discord.js';

// Custom emojis
export const EMOJI = {
  MOD_SHIELD: '<:mod_shield:1462816389260775547>',
  MEMBER: '<:member:1462785171416813731>',
  VOICE: '<:channel_voice:1462784525766627338>',
  TIME_DAY: '<:time_day:1462786086358093834>',
  RED_CROSS: '<:red_cross:1462784451099754598>',
  DISCONNECT: '<:disconnect_user:1462785393895280660>',
  REPLAY: '<:replay:1462789298293313679>',
  EXIT: '<:exit:1462785168690384974>',
  SUSPECTED: '<:suspected_actvity:1462785167285551167>',
  SUCCESS: '<:success:1462784528094629930>',
  WARNING: '<:warning:1462784529155805254>',
  INFO: '<:info:1462784530196308038>',
} as const;

// Spacing constants
export const SPACING = {
  SMALL: SeparatorSpacingSize.Small,
  LARGE: SeparatorSpacingSize.Large,
} as const;

// Color palette (for embeds that support it)
export const COLORS = {
  SUCCESS: 0x57f287,
  ERROR: 0xed4245,
  WARNING: 0xfee75c,
  INFO: 0x5865f2,
  NEUTRAL: 0x99aab5,
  MOD_PANEL: 0x5865f2,
} as const;

// Error types for standardized error handling
export type ModerationErrorType =
  | 'PERMISSION_DENIED'
  | 'USER_NOT_FOUND'
  | 'HIERARCHY_ERROR'
  | 'RATE_LIMITED'
  | 'SYSTEM_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONFIG_ERROR';

export interface ModerationError {
  type: ModerationErrorType;
  title: string;
  message: string;
  suggestion?: string;
}

const ERROR_ICONS: Record<ModerationErrorType, string> = {
  PERMISSION_DENIED: EMOJI.RED_CROSS,
  USER_NOT_FOUND: EMOJI.MEMBER,
  HIERARCHY_ERROR: EMOJI.WARNING,
  RATE_LIMITED: EMOJI.TIME_DAY,
  SYSTEM_ERROR: EMOJI.RED_CROSS,
  VALIDATION_ERROR: EMOJI.WARNING,
  CONFIG_ERROR: EMOJI.WARNING,
};

/**
 * Create a header text display
 */
export function createHeader(title: string, icon?: string): TextDisplayBuilder {
  const content = icon ? `# ${icon} ${title}` : `# ${title}`;
  return new TextDisplayBuilder().setContent(content);
}

/**
 * Create a subheader text display
 */
export function createSubheader(title: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(`## ${title}`);
}

/**
 * Format an info row with consistent styling
 */
export function formatInfoRow(label: string, value: string, emoji?: string): string {
  const prefix = emoji ? `${emoji} ` : '';
  return `${prefix}**${label}:** ${value}`;
}

/**
 * Format multiple key-value pairs into a grid line
 */
export function formatStatsLine(stats: Record<string, string | number>): string {
  return Object.entries(stats)
    .map(([key, value]) => `**${key}:** ${value}`)
    .join(' \u00b7 ');
}

/**
 * Create a small separator
 */
export function createSmallSeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setSpacing(SPACING.SMALL);
}

/**
 * Create a large separator
 */
export function createLargeSeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setSpacing(SPACING.LARGE);
}

/**
 * Add a standard header section to a container
 */
export function addStandardHeader(
  container: ContainerBuilder,
  title: string,
  subtitle?: string,
  icon?: string
): void {
  container.addTextDisplayComponents(createHeader(title, icon));
  if (subtitle) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(subtitle));
  }
  container.addSeparatorComponents(createSmallSeparator());
}

/**
 * Add a key-value section to a container
 */
export function addKeyValueSection(
  container: ContainerBuilder,
  data: Record<string, string>,
  title?: string
): void {
  if (title) {
    container.addTextDisplayComponents(createSubheader(title));
  }

  const lines = Object.entries(data).map(([key, value]) => formatInfoRow(key, value));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
}

/**
 * Add a list section to a container
 */
export function addListSection(
  container: ContainerBuilder,
  title: string,
  items: string[],
  emptyMessage?: string
): void {
  container.addTextDisplayComponents(createSubheader(title));

  if (items.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`*${emptyMessage ?? 'No items'}*`)
    );
  } else {
    const content = items.map((item) => `- ${item}`).join('\n');
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  }
}

/**
 * Button configuration for reusable button rows
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

/**
 * Build a standardized error response
 */
export function buildErrorResponse(error: ModerationError): ContainerBuilder {
  const container = new ContainerBuilder();
  const icon = ERROR_ICONS[error.type] || EMOJI.RED_CROSS;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${icon} ${error.title}`),
    new TextDisplayBuilder().setContent(error.message)
  );

  if (error.suggestion) {
    container.addSeparatorComponents(createSmallSeparator());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${EMOJI.INFO} **Suggestion:** ${error.suggestion}`)
    );
  }

  return container;
}

/**
 * Build a standardized success response
 */
export function buildSuccessResponse(
  title: string,
  details: Record<string, string>,
  actionButtons?: ButtonConfig[]
): ContainerBuilder {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${EMOJI.SUCCESS} ${title}`)
  );

  const detailLines = Object.entries(details).map(([key, value]) => formatInfoRow(key, value));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(detailLines.join('\n')));

  if (actionButtons && actionButtons.length > 0) {
    container.addSeparatorComponents(createSmallSeparator());
    container.addActionRowComponents(createButtonRow(actionButtons));
  }

  return container;
}

/**
 * Build a loading state response
 */
export function buildLoadingResponse(message: string = 'Loading...'): ContainerBuilder {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${EMOJI.TIME_DAY} ${message}`)
  );
  return container;
}

/**
 * Format a user mention with ID
 */
export function formatUserMention(user: User): string {
  return `${user.tag} (\`${user.id}\`)`;
}

/**
 * Format a relative timestamp
 */
export function formatRelativeTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

/**
 * Format an absolute timestamp
 */
export function formatAbsoluteTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

/**
 * Format duration in a human-readable way
 */
export function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Create a card-style section with border effect using markdown
 */
export function createCardSection(title: string, content: string): string {
  return `**${title}**\n${content}`;
}

/**
 * Build pagination info text
 */
export function formatPaginationInfo(current: number, total: number, itemCount: number): string {
  return `Page ${current} of ${total} (${itemCount} total)`;
}
