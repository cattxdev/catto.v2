/**
 * Shared Types for Discord UI
 *
 * Common type definitions used across Discord UI components.
 */

import type { User, ContainerBuilder, EmbedBuilder } from 'discord.js';

// ============================================================================
// Response Types
// ============================================================================

/**
 * A response that can be either Components V2 or traditional embed
 */
export type UIResponse = ContainerBuilder | EmbedBuilder;

/**
 * Options for a response that supports multiple formats
 */
export interface MultiFormatResponseOptions {
  useComponentsV2?: boolean;
}

// ============================================================================
// Common UI Patterns
// ============================================================================

/**
 * Pagination state
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

/**
 * Sortable list options
 */
export interface SortOptions<T> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

// ============================================================================
// User Display
// ============================================================================

/**
 * User display data for consistent user representation
 */
export interface UserDisplayData {
  id: string;
  tag: string;
  avatarURL?: string | null;
  displayName?: string;
}

/**
 * Extract display data from a Discord User
 */
export function getUserDisplayData(user: User): UserDisplayData {
  return {
    id: user.id,
    tag: user.tag,
    avatarURL: user.displayAvatarURL(),
    displayName: user.displayName,
  };
}

// ============================================================================
// Timestamp Types
// ============================================================================

/**
 * Discord timestamp format types
 */
export type TimestampFormat =
  | 't' // Short time (16:20)
  | 'T' // Long time (16:20:30)
  | 'd' // Short date (20/04/2021)
  | 'D' // Long date (20 April 2021)
  | 'f' // Short date/time (20 April 2021 16:20)
  | 'F' // Long date/time (Tuesday, 20 April 2021 16:20)
  | 'R'; // Relative (2 months ago)

/**
 * Create a Discord timestamp string
 */
export function createTimestamp(date: Date, format: TimestampFormat = 'f'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${format}>`;
}

// ============================================================================
// Interaction Types
// ============================================================================

/**
 * Generic interaction handler result
 */
export interface InteractionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
}

/**
 * Deferred reply state
 */
export interface DeferredReplyState {
  isDeferred: boolean;
  isEphemeral: boolean;
}
