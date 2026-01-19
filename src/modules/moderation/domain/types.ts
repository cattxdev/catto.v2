import { ModAction } from '@prisma/client';
import type { Snowflake } from 'discord.js';

// Re-export Prisma's ModAction as the single source of truth
export { ModAction };

/**
 * Branded type for Discord Snowflake IDs
 * This provides compile-time safety without runtime cost
 */
export type UserId = Snowflake & { readonly __brand: 'UserId' };
export type GuildId = Snowflake & { readonly __brand: 'GuildId' };
export type ChannelId = Snowflake & { readonly __brand: 'ChannelId' };
export type RoleId = Snowflake & { readonly __brand: 'RoleId' };

/**
 * Case ID is a positive integer unique per guild
 */
export type CaseNumber = number & { readonly __brand: 'CaseNumber' };

/**
 * Duration in seconds
 */
export type DurationSeconds = number & { readonly __brand: 'DurationSeconds' };

/**
 * Helper to create branded types from raw values
 */
export const asUserId = (id: string): UserId => id as UserId;
export const asGuildId = (id: string): GuildId => id as GuildId;
export const asChannelId = (id: string): ChannelId => id as ChannelId;
export const asRoleId = (id: string): RoleId => id as RoleId;
export const asCaseNumber = (n: number): CaseNumber => n as CaseNumber;
export const asDuration = (seconds: number): DurationSeconds => seconds as DurationSeconds;

/**
 * Input data for creating a moderation case
 */
export interface ModCaseInput {
  guildId: GuildId;
  action: ModAction;
  targetId: UserId;
  targetTag: string;
  moderatorId: UserId;
  moderatorTag: string;
  reason?: string;
  duration?: DurationSeconds;
  expiresAt?: Date;
}

/**
 * Result from canModerate check
 */
export interface ModerateCheckResult {
  canModerate: boolean;
  reason?: string;
}

/**
 * Moderation action result
 */
export interface ModActionResult {
  success: boolean;
  caseNumber?: CaseNumber;
  error?: string;
  userNotified: boolean;
}

/**
 * Moderation config per guild
 */
export interface ModerationConfig {
  modLogChannelId: ChannelId | null;
  muteRoleId: RoleId | null;
  autoModEnabled: boolean;
}

/**
 * Statistics for moderation in a guild
 */
export interface ModStats {
  total: number;
  bans: number;
  kicks: number;
  timeouts: number;
  warns: number;
}
