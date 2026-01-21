/**
 * User Display Resolver
 *
 * Utilities for displaying user information consistently, even when
 * the user is not in the guild or cannot be resolved.
 *
 * Addresses the "Unknown#0000" problem by providing clean fallbacks.
 */

import type { Client, User } from 'discord.js';
import { container } from '@sapphire/framework';

/**
 * Display format options
 */
export interface UserDisplayOptions {
  /** Include the user ID in backticks */
  includeId?: boolean;
  /** Use mention format for the ID (not recommended for public channels) */
  useMention?: boolean;
}

/**
 * Result of resolving a user display label
 */
export interface UserDisplayResult {
  /** The formatted display label */
  label: string;
  /** The user's tag if available */
  tag: string | null;
  /** The user ID */
  id: string;
  /** Whether the user was successfully resolved */
  resolved: boolean;
}

/**
 * Get a display label for a user by ID.
 *
 * Priority:
 * 1. If user can be fetched: `tag (\`id\`)`
 * 2. If fallback tag provided: `fallbackTag (\`id\`)`
 * 3. Otherwise: `\`id\``
 *
 * @param client - Discord client
 * @param userId - The user's Discord ID
 * @param fallbackTag - Optional fallback tag from database
 * @param options - Display options
 */
export async function getUserDisplayLabel(
  client: Client,
  userId: string,
  fallbackTag?: string | null,
  options: UserDisplayOptions = {}
): Promise<UserDisplayResult> {
  const { includeId = true } = options;

  // Try to fetch the user from Discord
  let user: User | null = null;
  try {
    user = await client.users.fetch(userId);
  } catch {
    // User not found or API error - that's fine
  }

  // Build the label
  if (user) {
    const label = includeId ? `${user.tag} (\`${userId}\`)` : user.tag;
    return { label, tag: user.tag, id: userId, resolved: true };
  }

  // Use fallback tag if available and not "Unknown#0000"
  if (fallbackTag && fallbackTag !== 'Unknown#0000' && !fallbackTag.startsWith('Unknown#')) {
    const label = includeId ? `${fallbackTag} (\`${userId}\`)` : fallbackTag;
    return { label, tag: fallbackTag, id: userId, resolved: false };
  }

  // ID-only fallback (no fake tags)
  const label = `\`${userId}\``;
  return { label, tag: null, id: userId, resolved: false };
}

/**
 * Synchronous version that uses cached user data or returns ID-only.
 *
 * @param client - Discord client
 * @param userId - The user's Discord ID
 * @param fallbackTag - Optional fallback tag from database
 * @param options - Display options
 */
export function getUserDisplayLabelSync(
  client: Client,
  userId: string,
  fallbackTag?: string | null,
  options: UserDisplayOptions = {}
): UserDisplayResult {
  const { includeId = true } = options;

  // Check cache first
  const user = client.users.cache.get(userId);

  if (user) {
    const label = includeId ? `${user.tag} (\`${userId}\`)` : user.tag;
    return { label, tag: user.tag, id: userId, resolved: true };
  }

  // Use fallback tag if available and not "Unknown#0000"
  if (fallbackTag && fallbackTag !== 'Unknown#0000' && !fallbackTag.startsWith('Unknown#')) {
    const label = includeId ? `${fallbackTag} (\`${userId}\`)` : fallbackTag;
    return { label, tag: fallbackTag, id: userId, resolved: false };
  }

  // ID-only fallback
  const label = `\`${userId}\``;
  return { label, tag: null, id: userId, resolved: false };
}

/**
 * Get a safe tag for a user (never returns "Unknown#0000").
 *
 * @param userId - The user's Discord ID
 * @param existingTag - Existing tag from database
 */
export async function getSafeUserTag(userId: string, existingTag?: string | null): Promise<string> {
  // Try to fetch fresh tag
  try {
    const user = await container.client.users.fetch(userId);
    return user.tag;
  } catch {
    // Fall back to existing tag if valid
    if (existingTag && existingTag !== 'Unknown#0000' && !existingTag.startsWith('Unknown#')) {
      return existingTag;
    }
    // Return ID as last resort
    return `User ${userId}`;
  }
}

/**
 * Check if a tag is a placeholder/unknown value
 */
export function isPlaceholderTag(tag: string | null | undefined): boolean {
  if (!tag) return true;
  return tag === 'Unknown#0000' || tag.startsWith('Unknown#') || tag === 'System';
}

/**
 * Format user display for mod log (no pings, clean format)
 *
 * @param userId - The user's Discord ID
 * @param tag - The user's tag (may be stale)
 */
export function formatUserForLog(userId: string, tag?: string | null): string {
  if (tag && !isPlaceholderTag(tag)) {
    return `${tag} (\`${userId}\`)`;
  }
  return `\`${userId}\``;
}
