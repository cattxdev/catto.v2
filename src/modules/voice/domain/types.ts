import { z } from 'zod';
import type { Snowflake } from 'discord.js';
import {
  type UserId,
  type GuildId,
  type ChannelId,
  asUserId,
  asGuildId,
  asChannelId,
} from '../../moderation/domain/types.js';

// Re-export for convenience
export { UserId, GuildId, ChannelId, asUserId, asGuildId, asChannelId };

/**
 * Branded type for interaction IDs
 */
export type InteractionId = Snowflake & { readonly __brand: 'InteractionId' };
export const asInteractionId = (id: string): InteractionId => id as InteractionId;

/**
 * Voice member presence stored in Redis
 */
export const VoiceMemberPresenceSchema = z.object({
  channelId: z.string(),
  selfMute: z.boolean(),
  selfDeaf: z.boolean(),
  serverMute: z.boolean(),
  serverDeaf: z.boolean(),
  streaming: z.boolean(),
  timestamp: z.number(),
});

export type VoiceMemberPresence = z.infer<typeof VoiceMemberPresenceSchema>;

/**
 * Active voice watch session stored in Redis
 */
export const VoiceWatchSessionSchema = z.object({
  targetId: z.string(),
  channelId: z.string().nullable(),
  startedAt: z.number(),
  endsAt: z.number(),
  lastUpdateAt: z.number(),
  messageId: z.string(),
  channelIdMessage: z.string(),
  updateCount: z.number(),
});

export type VoiceWatchSession = z.infer<typeof VoiceWatchSessionSchema>;

/**
 * Active voice channel track session
 */
export const VoiceTrackSessionSchema = z.object({
  channelId: z.string(),
  startedAt: z.number(),
  endsAt: z.number(),
  lastUpdateAt: z.number(),
  messageId: z.string(),
  channelIdMessage: z.string(),
  updateCount: z.number(),
});

export type VoiceTrackSession = z.infer<typeof VoiceTrackSessionSchema>;

/**
 * Channel snapshot info
 */
export interface VoiceChannelSnapshot {
  channelId: ChannelId;
  channelName: string;
  members: VoiceSnapshotMember[];
  timestamp: number;
}

export interface VoiceSnapshotMember {
  userId: UserId;
  username: string;
  displayName: string;
  selfMute: boolean;
  selfDeaf: boolean;
  serverMute: boolean;
  serverDeaf: boolean;
  streaming: boolean;
}

/**
 * Voice watch/track configuration
 */
export interface VoiceWatchConfig {
  minIntervalMs: number;
  maxUpdates: number;
  maxDurationSeconds: number;
  minDurationSeconds: number;
}

export const VOICE_WATCH_CONFIG: VoiceWatchConfig = {
  minIntervalMs: 2000, // Minimum 2s between message edits
  maxUpdates: 60, // Max 60 updates per session
  maxDurationSeconds: 15 * 60, // 15 minutes max
  minDurationSeconds: 60, // 1 minute min
};

export const VOICE_CACHE_TTL = {
  memberPresence: 300, // 5 minutes for voice presence
  watchSession: 16 * 60, // 16 minutes (slightly longer than max watch)
  trackSession: 16 * 60,
} as const;

/**
 * Custom Discord emojis for voice state indicators
 */
export const VOICE_EMOJI = {
  activities: '<:activities:1462676340967866429>',
  bot: '<:bot:1462676342024835199>',
  member: '<:member:1462676343111155955>',

  serverScreenshare: '<:server_screenshare:1462676345153654794>',

  channelVoice: '<:channel_voice:1462676347464974381>',
  channelVoiceNsfw: '<:channel_voice_nsfw:1462676346215071825>',
  channelStage: '<:channel_stage:1462676690877550745>',

  serverMuted: '<:server_muted:1462676349792817256>',
  serverDeafened: '<:server_defean:1462676350967091292>',
  muted: '<:muted:1462676352321851565>',
  deafened: '<:defean:1462676353479610448>',
  unMuted: '<:un_muted:1462676354364604417>',
  unDeafened: '<:un_defean:1462676355627090055>',
} as const;
