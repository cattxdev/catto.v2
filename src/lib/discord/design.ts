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
    custom: '<:green_check:1463366102917714134>',
    fallback: '\u2705', // check mark
  },
  ERROR: {
    custom: '<:red_cross:1462784451099754598>',
    fallback: '\u274C', // cross mark
  },
  WARNING: {
    custom: '<:yellow_warning:1463366097838407868>',
    fallback: '\u26A0\uFE0F', // warning sign
  },
  INFO: {
    custom: '<:discord_info:1463368489317437612>',
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
  SERVER_FOLDER: {
    custom: '<:server_folder:1463375728958504981>',
    fallback: '\uD83D\uDCC4', // folder
  },
  MODERATION: {
    custom: '<:moderation:1463375710092791932>',
    fallback: '\uD83C\uDFF7\uFE0F', // shield
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

  // Miscellaneous emojis
  UTILITIES: {
    custom: '<:utilities:1463366116033298536>',
    fallback: '\u2699\uFE0F', // gear
  },
  REPORT_FLAG: {
    custom: '<:report_flag:1463366118667190337>',
    fallback: '\uD83D\uDEA9', // triangular flag
  },
  EDIT: {
    custom: '<:edit:1463366117631197298>',
    fallback: '\u270F\uFE0F', // pencil
  },
  INVITE: {
    custom: '<:invite:1463366104767533241>',
    fallback: '\u2795', // plus
  },
  ARROW_LEFT_G: {
    custom: '<:arrow_left_g:1463366126929973455>',
    fallback: '\u2B05\uFE0F', // left arrow
  },
  ARROW_RIGHT_G: {
    custom: '<:arrow_right_g:1463366121204875275>',
    fallback: '\u27A1\uFE0F', // right arrow
  },
  ADD_GREEN: {
    custom: '<:add_green:1463366122916020466>',
    fallback: '\u2795', // plus
  },
  CHEVRON_DROPDOWN: {
    custom: '<:chevron_dropdown:1463366233121620167>',
    fallback: '\u25BC\uFE0F', // down-pointing triangle
  },
  READ_CHECK: {
    custom: '<:read_check:1463366119825084501>',
    fallback: '\u2705', // check mark
  },
  NOTIFICATION_BELL: {
    custom: '<:notification_bell:1463366109213233358>',
    fallback: '\uD83D\uDD14', // bell
  },
  SLOWMODE: {
    custom: '<:slowmode:1463366107804205240>',
    fallback: '\u23F1\uFE0F', // stopwatch
  },
  EVENT_LOCATION: {
    custom: '<:event_location:1463368464235499651>',
    fallback: '\uD83C\uDF0D', // globe showing Americas
  },
  MORE_OPTIONS: {
    custom: '<:more_options:1463368507617050833>',
    fallback: '\u22EF', // horizontal ellipsis
  },
  TEXT_CHANNEL: {
    custom: '<:text:1462785165985321103>',
    fallback: '\uD83D\uDCDD', // text channel
  },
  VOICE_LIMITER: {
    custom: '<:voice_limiter:1463532166586564700>',
    fallback: '\uD83D\uDD08', // speaker low volume
  },
  TEXT_LIMITER: {
    custom: '<:text_limiter:1463532129081229454>',
    fallback: '\uD83D\uDD08', // speaker low volume
  },
  ADD_WHITE: {
    custom: '<:add_white:1463534575299858588>',
    fallback: '\u2795', // plus
  },
  MIC_WITH_CHECK: {
    custom: '<:mic_with_check_white:1463669963251519694>',
    fallback: '\uD83D\uDCF7\uFE0F', // microphone
  },
  TEXT_CHANNEL_WITH_CHECK: {
    custom: '<:text_channel_with_check_white:1463669927121649765>',
    fallback: '\uD83D\uDCDD\uFE0F', // text channel
  },
  SERVER_LEAVE: {
    custom: '<:server_leave:1462784544490000445>',
    fallback: '\uD83D\uDEAA', // door
  },
  TIME_OUT: {
    custom: '<:time_out:1463366100610842806>',
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
 * Custom emojis require the bot to have access to the emoji guild.
 *
 * For dynamic emoji resolution based on global setting, use getEmoji() instead.
 */
export const EMOJI: Record<EmojiKey, string> & {
  // Aliases for backward compatibility
  RED_CROSS: string;
  TIME_DAY: string;
  DISCONNECT_USER: string;
  GREEN_CHECK: string;
  DISCORD_INFO: string;
  YELLOW_WARNING: string;
} = {
  // Status emojis
  SUCCESS: EMOJI_CONFIG.SUCCESS.custom,
  ERROR: EMOJI_CONFIG.ERROR.custom,
  WARNING: EMOJI_CONFIG.WARNING.custom,
  INFO: EMOJI_CONFIG.INFO.custom,

  // Feature emojis
  MOD_SHIELD: EMOJI_CONFIG.MOD_SHIELD.custom,
  MEMBER: EMOJI_CONFIG.MEMBER.custom,
  VOICE: EMOJI_CONFIG.VOICE.custom,
  TIME: EMOJI_CONFIG.TIME.custom,
  DISCONNECT: EMOJI_CONFIG.DISCONNECT.custom,
  REPLAY: EMOJI_CONFIG.REPLAY.custom,
  EXIT: EMOJI_CONFIG.EXIT.custom,
  SUSPECTED: EMOJI_CONFIG.SUSPECTED.custom,
  MODERATION: EMOJI_CONFIG.MODERATION.custom,
  SERVER_FOLDER: EMOJI_CONFIG.SERVER_FOLDER.custom,

  // Voice / activity
  VOICE_ACTIVITIES: EMOJI_CONFIG.VOICE_ACTIVITIES.custom,
  VOICE_SERVER_SCREENSHARE: EMOJI_CONFIG.VOICE_SERVER_SCREENSHARE.custom,
  VOICE_VIDEO: EMOJI_CONFIG.VOICE_VIDEO.custom,
  VOICE_CHANNEL_NSFW: EMOJI_CONFIG.VOICE_CHANNEL_NSFW.custom,
  VOICE_CHANNEL_STAGE: EMOJI_CONFIG.VOICE_CHANNEL_STAGE.custom,
  VOICE_SERVER_MUTED: EMOJI_CONFIG.VOICE_SERVER_MUTED.custom,
  VOICE_SERVER_DEAFENED: EMOJI_CONFIG.VOICE_SERVER_DEAFENED.custom,
  VOICE_MUTED: EMOJI_CONFIG.VOICE_MUTED.custom,
  VOICE_DEAFENED: EMOJI_CONFIG.VOICE_DEAFENED.custom,
  VOICE_UNMUTED: EMOJI_CONFIG.VOICE_UNMUTED.custom,
  VOICE_UNDEAFENED: EMOJI_CONFIG.VOICE_UNDEAFENED.custom,
  VOICE_SOUND_PAUSE: EMOJI_CONFIG.VOICE_SOUND_PAUSE.custom,
  COPY_ID: EMOJI_CONFIG.COPY_ID.custom,
  CONNECT_TO_USER: EMOJI_CONFIG.CONNECT_TO_USER.custom,
  VOICE_TOGGLE: EMOJI_CONFIG.VOICE_TOGGLE.custom,
  TIME_DAY_EXPIRED: EMOJI_CONFIG.TIME_DAY_EXPIRED.custom,

  // Miscellaneous emojis
  UTILITIES: EMOJI_CONFIG.UTILITIES.custom,
  REPORT_FLAG: EMOJI_CONFIG.REPORT_FLAG.custom,
  EDIT: EMOJI_CONFIG.EDIT.custom,
  INVITE: EMOJI_CONFIG.INVITE.custom,
  ARROW_LEFT_G: EMOJI_CONFIG.ARROW_LEFT_G.custom,
  ARROW_RIGHT_G: EMOJI_CONFIG.ARROW_RIGHT_G.custom,
  ADD_GREEN: EMOJI_CONFIG.ADD_GREEN.custom,
  CHEVRON_DROPDOWN: EMOJI_CONFIG.CHEVRON_DROPDOWN.custom,
  READ_CHECK: EMOJI_CONFIG.READ_CHECK.custom,
  NOTIFICATION_BELL: EMOJI_CONFIG.NOTIFICATION_BELL.custom,
  SLOWMODE: EMOJI_CONFIG.SLOWMODE.custom,
  EVENT_LOCATION: EMOJI_CONFIG.EVENT_LOCATION.custom,
  MORE_OPTIONS: EMOJI_CONFIG.MORE_OPTIONS.custom,
  TEXT_CHANNEL: EMOJI_CONFIG.TEXT_CHANNEL.custom,
  VOICE_LIMITER: EMOJI_CONFIG.VOICE_LIMITER.custom,
  TEXT_LIMITER: EMOJI_CONFIG.TEXT_LIMITER.custom,
  ADD_WHITE: EMOJI_CONFIG.ADD_WHITE.custom,
  MIC_WITH_CHECK: EMOJI_CONFIG.MIC_WITH_CHECK.custom,
  TEXT_CHANNEL_WITH_CHECK: EMOJI_CONFIG.TEXT_CHANNEL_WITH_CHECK.custom,
  SERVER_LEAVE: EMOJI_CONFIG.SERVER_LEAVE.custom,
  TIME_OUT: EMOJI_CONFIG.TIME_OUT.custom,

  // Aliases for backward compatibility
  RED_CROSS: EMOJI_CONFIG.ERROR.custom,
  TIME_DAY: EMOJI_CONFIG.TIME.custom,
  DISCONNECT_USER: EMOJI_CONFIG.DISCONNECT.custom,
  GREEN_CHECK: EMOJI_CONFIG.SUCCESS.custom,
  DISCORD_INFO: EMOJI_CONFIG.INFO.custom,
  YELLOW_WARNING: EMOJI_CONFIG.WARNING.custom,
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
