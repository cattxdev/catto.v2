import { EmbedBuilder, type ColorResolvable } from 'discord.js';

/**
 * Creates a success embed
 */
export function createSuccessEmbed(description: string, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#00FF00' as ColorResolvable)
    .setTitle(title ?? '✅ Success')
    .setDescription(description)
    .setTimestamp();
}

/**
 * Creates an error embed
 */
export function createErrorEmbed(description: string, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#FF0000' as ColorResolvable)
    .setTitle(title ?? '❌ Error')
    .setDescription(description)
    .setTimestamp();
}

/**
 * Creates an info embed
 */
export function createInfoEmbed(description: string, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#0099FF' as ColorResolvable)
    .setTitle(title ?? 'ℹ️ Information')
    .setDescription(description)
    .setTimestamp();
}

/**
 * Formats uptime into a readable string
 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

  return parts.join(' ') || '0s';
}
