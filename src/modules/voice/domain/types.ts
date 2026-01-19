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
  // User/Member indicators
  activities: '<:activities:1462784554795270298>',
  member: '<:member:1462785171416813731>',
  modShield: '<:mod_shield:1462816389260775547>',

  // Voice state emojis
  serverScreenshare: '<:server_screenshare:1462784522671095894>',
  video: '<:channel_voice_video:1462784548021600360>',

  // Channel types
  channelVoice: '<:channel_voice:1462784525766627338>',
  channelVoiceNsfw: '<:channel_voice_nsfw:1462784524675977269>',
  channelStage: '<:channel_stage:1462784552379617351>',

  // Mute/Deafen states
  serverMuted: '<:server_muted:1462784529713594596>',
  serverDeafened: '<:server_defean:1462784531038863523>',
  muted: '<:muted:1462784532481577042>',
  deafened: '<:defean:1462784534419603590>',
  unMuted: '<:un_muted:1462784536076353683>',
  unDeafened: '<:un_defean:1462784538072584327>',

  // Action buttons
  replay: '<:replay:1462789298293313679>',
  soundPause: '<:sound_pause_white:1462796413376139429>', // white because it's usually used in destructive actions
  copyId: '<:copy_id:1462785169881825353>',
  connectToUser: '<:connect_to_user:1462785395233390707>',
  disconnectUser: '<:disconnect_user:1462785393895280660>',
  voiceToggle: '<:voice_toggle:1462785392452305100>',
  timeDay: '<:time_day:1462786086358093834>',
  timeDayExpired: '<:time_day_expired:1462784541088415867>',
} as const;
