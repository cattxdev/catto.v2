import { ModAction, CaseStatus, AppealStatus } from '@prisma/client';
import type { Snowflake } from 'discord.js';

// Re-export Prisma enums as the single source of truth
export { ModAction, CaseStatus, AppealStatus };

/**
 * Branded type for Discord Snowflake IDs
 * This provides compile-time safety without runtime cost
 */
export type UserId = Snowflake & { readonly __brand: 'UserId' };
export type GuildId = Snowflake & { readonly __brand: 'GuildId' };
export type ChannelId = Snowflake & { readonly __brand: 'ChannelId' };
export type RoleId = Snowflake & { readonly __brand: 'RoleId' };
export type MessageId = Snowflake & { readonly __brand: 'MessageId' };

/**
 * Case ID is a positive integer unique per guild
 */
export type CaseNumber = number & { readonly __brand: 'CaseNumber' };

/**
 * Duration in seconds
 */
export type DurationSeconds = number & { readonly __brand: 'DurationSeconds' };

/**
 * Note ID (cuid)
 */
export type NoteId = string & { readonly __brand: 'NoteId' };

/**
 * Appeal ID (cuid)
 */
export type AppealId = string & { readonly __brand: 'AppealId' };

/**
 * Helper to create branded types from raw values
 */
export const asUserId = (id: string): UserId => id as UserId;
export const asGuildId = (id: string): GuildId => id as GuildId;
export const asChannelId = (id: string): ChannelId => id as ChannelId;
export const asRoleId = (id: string): RoleId => id as RoleId;
export const asMessageId = (id: string): MessageId => id as MessageId;
export const asCaseNumber = (n: number): CaseNumber => n as CaseNumber;
export const asDuration = (seconds: number): DurationSeconds => seconds as DurationSeconds;
export const asNoteId = (id: string): NoteId => id as NoteId;
export const asAppealId = (id: string): AppealId => id as AppealId;

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
 * Input data for updating a case
 */
export interface ModCaseUpdateInput {
  reason?: string;
  status?: CaseStatus;
  evidence?: CaseEvidence;
}

/**
 * Evidence attached to a case
 */
export interface CaseEvidence {
  messageLinks?: string[];
  attachments?: string[];
  notes?: string;
}

/**
 * Input data for creating a mod note
 */
export interface ModNoteInput {
  guildId: GuildId;
  userId: UserId;
  createdById: UserId;
  note: string;
  tags?: string[];
}

/**
 * Input data for creating an appeal
 */
export interface ModAppealInput {
  guildId: GuildId;
  targetId: UserId;
  createdById: UserId;
  caseId?: string;
  reason: string;
}

/**
 * Input data for resolving an appeal
 */
export interface ModAppealResolveInput {
  resolution: string;
  resolvedById: UserId;
  status: AppealStatus;
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
