/**
 * Utility functions
 *
 * Re-exports embed builders from the shared Discord library and provides
 * additional utility functions.
 */

// Re-export embed builders from shared Discord library
export { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from '#lib/discord/index.js';

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
