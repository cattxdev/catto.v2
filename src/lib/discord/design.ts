/**
 * Design System Tokens for Discord UI
 *
 * Centralized design tokens for consistent UI across all bot modules.
 * This file defines colors, emojis, spacing, and other design primitives.
 */

import { SeparatorSpacingSize } from 'discord.js';

// ============================================================================
// Colors
// ============================================================================

/**
 * Semantic color palette for embeds and UI elements
 *
 * Colors are stored as numbers (hex integers) which are compatible with both
 * EmbedBuilder.setColor() and ContainerBuilder.setAccentColor()
 */
export const COLORS = {
  // Status colors
  SUCCESS: 0x57f287,
  ERROR: 0xed4245,
  WARNING: 0xfee75c,
  INFO: 0x5865f2,
  NEUTRAL: 0x99aab5,

  // Brand/feature colors
  PRIMARY: 0x5865f2,
  MOD_PANEL: 0x5865f2,

  // Moderation action colors
  BAN: 0xed4245,
  KICK: 0xf57c00,
  TIMEOUT: 0xfee75c,
  WARN: 0xffc107,
  MUTE: 0x607d8b,
  UNMUTE: 0x9e9e9e,
} as const;

// ============================================================================
// Emojis
// ============================================================================

/**
 * Custom emoji definitions with fallback support
 *
 * Each emoji has:
 * - custom: The custom Discord emoji format (guild-specific)
 * - fallback: Unicode fallback for when custom emojis aren't available
 */
export const EMOJI_CONFIG = {
  // Status emojis
  SUCCESS: {
    custom: '<:success:1462784528094629930>',
    fallback: '\u2705', // check mark
  },
  ERROR: {
    custom: '<:red_cross:1462784451099754598>',
    fallback: '\u274C', // cross mark
  },
  WARNING: {
    custom: '<:warning:1462784529155805254>',
    fallback: '\u26A0\uFE0F', // warning sign
  },
  INFO: {
    custom: '<:info:1462784530196308038>',
    fallback: '\u2139\uFE0F', // info
  },

  // Feature emojis
  MOD_SHIELD: {
    custom: '<:mod_shield:1462816389260775547>',
    fallback: '\uD83D\uDEE1\uFE0F', // shield
  },
  MEMBER: {
    custom: '<:member:1462785171416813731>',
    fallback: '\uD83D\uDC64', // bust in silhouette
  },
  VOICE: {
    custom: '<:channel_voice:1462784525766627338>',
    fallback: '\uD83D\uDD0A', // speaker high volume
  },
  TIME: {
    custom: '<:time_day:1462786086358093834>',
    fallback: '\u23F0', // alarm clock
  },
  DISCONNECT: {
    custom: '<:disconnect_user:1462785393895280660>',
    fallback: '\uD83D\uDEAA', // door
  },
  REPLAY: {
    custom: '<:replay:1462789298293313679>',
    fallback: '\uD83D\uDD04', // counterclockwise arrows
  },
  EXIT: {
    custom: '<:exit:1462785168690384974>',
    fallback: '\uD83D\uDEAA', // door
  },
  SUSPECTED: {
    custom: '<:suspected_actvity:1462785167285551167>',
    fallback: '\uD83D\uDD75\uFE0F', // detective
  },

  // Voice / activity emojis (shared across modules)
  VOICE_ACTIVITIES: {
    custom: '<:activities:1462784554795270298>',
    fallback: '\uD83C\uDFAE', // video game
  },
  VOICE_SERVER_SCREENSHARE: {
    custom: '<:server_screenshare:1462784522671095894>',
    fallback: '\uD83D\uDCF9', // video camera
  },
  VOICE_VIDEO: {
    custom: '<:channel_voice_video:1462784548021600360>',
    fallback: '\uD83D\uDCF9', // video camera
  },
  VOICE_CHANNEL_NSFW: {
    custom: '<:channel_voice_nsfw:1462784524675977269>',
    fallback: '\uD83D\uDD1E', // no one under eighteen
  },
  VOICE_CHANNEL_STAGE: {
    custom: '<:channel_stage:1462784552379617351>',
    fallback: '\uD83C\uDFAD', // performing arts
  },
  VOICE_SERVER_MUTED: {
    custom: '<:server_muted:1462784529713594596>',
    fallback: '\uD83D\uDD07', // muted speaker
  },
  VOICE_SERVER_DEAFENED: {
    custom: '<:server_defean:1462784531038863523>',
    fallback: '\uD83D\uDD08', // speaker low volume
  },
  VOICE_MUTED: {
    custom: '<:muted:1462784532481577042>',
    fallback: '\uD83D\uDD07',
  },
  VOICE_DEAFENED: {
    custom: '<:defean:1462784534419603590>',
    fallback: '\uD83D\uDD08',
  },
  VOICE_UNMUTED: {
    custom: '<:un_muted:1462784536076353683>',
    fallback: '\uD83D\uDD0A', // speaker high volume
  },
  VOICE_UNDEAFENED: {
    custom: '<:un_defean:1462784538072584327>',
    fallback: '\uD83D\uDD0A',
  },
  VOICE_SOUND_PAUSE: {
    custom: '<:sound_pause_white:1462796413376139429>',
    fallback: '\u23F8\uFE0F', // pause button
  },
  COPY_ID: {
    custom: '<:copy_id:1462785169881825353>',
    fallback: '\uD83D\uDCCB', // clipboard
  },
  CONNECT_TO_USER: {
    custom: '<:connect_to_user:1462785395233390707>',
    fallback: '\uD83D\uDD17', // link
  },
  VOICE_TOGGLE: {
    custom: '<:voice_toggle:1462785392452305100>',
    fallback: '\uD83C\uDFA4', // microphone
  },
  TIME_DAY_EXPIRED: {
    custom: '<:time_day_expired:1462784541088415867>',
    fallback: '\u23F1\uFE0F', // stopwatch
  },
} as const;

export type EmojiKey = keyof typeof EMOJI_CONFIG;

/**
 * Global flag to control whether to use custom emojis or fallbacks
 * Set to false if the bot doesn't have access to the emoji guild
 */
let useCustomEmojis = true;

/**
 * Set whether to use custom emojis or fallback to Unicode
 */
export function setUseCustomEmojis(value: boolean): void {
  useCustomEmojis = value;
}

/**
 * Get emoji string (custom or fallback based on global setting)
 */
export function getEmoji(key: keyof typeof EMOJI_CONFIG): string {
  const config = EMOJI_CONFIG[key];
  return useCustomEmojis ? config.custom : config.fallback;
}

/**
 * Quick access to emojis
 *
 * NOTE: Currently using fallback emojis for reliability.
 * Custom emojis require the bot to have access to the emoji guild.
 * TODO: Re-enable custom emojis once emoji guild access is verified.
 *
 * For dynamic emoji resolution based on global setting, use getEmoji() instead.
 */
export const EMOJI = {
  // Status emojis - using fallbacks for reliability
  SUCCESS: EMOJI_CONFIG.SUCCESS.fallback,
  ERROR: EMOJI_CONFIG.ERROR.fallback,
  WARNING: EMOJI_CONFIG.WARNING.fallback,
  INFO: EMOJI_CONFIG.INFO.fallback,

  // Feature emojis - using fallbacks for reliability
  MOD_SHIELD: EMOJI_CONFIG.MOD_SHIELD.fallback,
  MEMBER: EMOJI_CONFIG.MEMBER.fallback,
  VOICE: EMOJI_CONFIG.VOICE.fallback,
  TIME: EMOJI_CONFIG.TIME.fallback,
  DISCONNECT: EMOJI_CONFIG.DISCONNECT.fallback,
  REPLAY: EMOJI_CONFIG.REPLAY.fallback,
  EXIT: EMOJI_CONFIG.EXIT.fallback,
  SUSPECTED: EMOJI_CONFIG.SUSPECTED.fallback,

  // Voice / activity - using fallbacks for reliability
  VOICE_ACTIVITIES: EMOJI_CONFIG.VOICE_ACTIVITIES.fallback,
  VOICE_SERVER_SCREENSHARE: EMOJI_CONFIG.VOICE_SERVER_SCREENSHARE.fallback,
  VOICE_VIDEO: EMOJI_CONFIG.VOICE_VIDEO.fallback,
  VOICE_CHANNEL_NSFW: EMOJI_CONFIG.VOICE_CHANNEL_NSFW.fallback,
  VOICE_CHANNEL_STAGE: EMOJI_CONFIG.VOICE_CHANNEL_STAGE.fallback,
  VOICE_SERVER_MUTED: EMOJI_CONFIG.VOICE_SERVER_MUTED.fallback,
  VOICE_SERVER_DEAFENED: EMOJI_CONFIG.VOICE_SERVER_DEAFENED.fallback,
  VOICE_MUTED: EMOJI_CONFIG.VOICE_MUTED.fallback,
  VOICE_DEAFENED: EMOJI_CONFIG.VOICE_DEAFENED.fallback,
  VOICE_UNMUTED: EMOJI_CONFIG.VOICE_UNMUTED.fallback,
  VOICE_UNDEAFENED: EMOJI_CONFIG.VOICE_UNDEAFENED.fallback,
  VOICE_SOUND_PAUSE: EMOJI_CONFIG.VOICE_SOUND_PAUSE.fallback,
  COPY_ID: EMOJI_CONFIG.COPY_ID.fallback,
  CONNECT_TO_USER: EMOJI_CONFIG.CONNECT_TO_USER.fallback,
  VOICE_TOGGLE: EMOJI_CONFIG.VOICE_TOGGLE.fallback,
  TIME_DAY_EXPIRED: EMOJI_CONFIG.TIME_DAY_EXPIRED.fallback,

  // Aliases for backward compatibility
  RED_CROSS: EMOJI_CONFIG.ERROR.fallback,
  TIME_DAY: EMOJI_CONFIG.TIME.fallback,
  DISCONNECT_USER: EMOJI_CONFIG.DISCONNECT.fallback,
} as const;

// ============================================================================
// Spacing
// ============================================================================

/**
 * Separator spacing sizes for Components V2
 */
export const SPACING = {
  SMALL: SeparatorSpacingSize.Small,
  LARGE: SeparatorSpacingSize.Large,
} as const;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standardized error types for consistent error handling across modules
 */
export type ErrorType =
  | 'PERMISSION_DENIED'
  | 'USER_NOT_FOUND'
  | 'HIERARCHY_ERROR'
  | 'RATE_LIMITED'
  | 'SYSTEM_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONFIG_ERROR'
  | 'NOT_FOUND';

/**
 * Error type to emoji mapping
 */
export const ERROR_ICONS: Record<ErrorType, string> = {
  PERMISSION_DENIED: EMOJI.ERROR,
  USER_NOT_FOUND: EMOJI.MEMBER,
  HIERARCHY_ERROR: EMOJI.WARNING,
  RATE_LIMITED: EMOJI.TIME,
  SYSTEM_ERROR: EMOJI.ERROR,
  VALIDATION_ERROR: EMOJI.WARNING,
  CONFIG_ERROR: EMOJI.WARNING,
  NOT_FOUND: EMOJI.WARNING,
};
