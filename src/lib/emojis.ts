/**
 * Centralized emoji definitions for the bot
 * All emojis used across commands, interactions, and services
 */

/**
 * Standard Unicode emojis
 */
export const EMOJIS = {
  // Status indicators
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  // Voice channel states
  LOCKED: '🔒',
  UNLOCKED: '🔓',
  HIDDEN: '👁️‍🗨️',
  VISIBLE: '👁️',

  // Actions
  KICK: '👢',
  BAN: '🔨',
  PERMIT: '👤',
  DENY: '🚫',
  TRUST: '🤝',
  TRANSFER: '👑',
  EDIT: '✏️',
  SETTINGS: '⚙️',

  // Reputation
  HELPFUL: '🤝',
  FRIENDLY: '😊',
  SKILLED: '⭐',
  RELIABLE: '✅',
  STAR: '⭐',
  TROPHY: '🏆',
  CROWN: '👑',

  // Medals
  GOLD_MEDAL: '🥇',
  SILVER_MEDAL: '🥈',
  BRONZE_MEDAL: '🥉',

  // Progress and stats
  ARROW_UP: '📈',
  ARROW_DOWN: '📉',
  CHART: '📊',

  // Rewards and gifts
  GIFT: '🎁',

  // Miscellaneous
  INBOX: '📥',
  OUTBOX: '📤',
  CALENDAR: '📅',
  CLOCK: '🕐',
} as const;

/**
 * Custom Discord emojis used in the bot
 * Format: { id: 'emoji_id', name: 'emoji_name' }
 */
export const CUSTOM_EMOJIS = {
  // Temp voice control panel - Header
  VOICE_EVENT: { id: '1462964331317825711', name: '4767voiceevent' },

  // Temp voice control panel - Fields
  OWNER: { id: '1462962657270169712', name: '4102owner1' },
  MEMBERS: { id: '1462962641105584211', name: '5837members' },
  BITRATE: { id: '1462962615465541642', name: '8635krispon' },
  VOICE_PRIVATE: { id: '1462963079485853707', name: '9577voiceprivateevent' },
  PREVIEW: { id: '1462962674542444658', name: '3500preview' },
  EVENT_LOCATION: { id: '1462962693026611281', name: '2910eventlocation' },

  // Temp voice control panel - Buttons Row 1
  LOCK_BUTTON: { id: '1462963079485853707', name: '9577voiceprivateevent' },
  HIDE_BUTTON: { id: '1462962674542444658', name: '3500preview' },
  RENAME_BUTTON: { id: '1462995803583811725', name: '3639edit' },
  LIMIT_BUTTON: { id: '1462962641105584211', name: '5837members' },
  SETTINGS_BUTTON: { id: '1462995184336765074', name: '2888settings' },

  // Temp voice control panel - Buttons Row 2
  PERMIT_BUTTON: { id: '1462996719120945234', name: '1563invitepeople1' },
  DENY_BUTTON: { id: '1462996737127092305', name: '8056engagedinsuspectedspamactiv1' },
  TRUST_BUTTON: { id: '1463062838179532821', name: '2360cross' },
  CLAIM_BUTTON: { id: '1462784527670837372', name: '8562replay2' },
  TRANSFER_BUTTON: { id: '1463575177358217360', name: '2636securityfilter' },
} as const;

/**
 * Helper function to format custom emoji for Discord
 */
export function formatCustomEmoji(
  emoji: { id: string; name: string },
  animated: boolean = false
): string {
  return `<${animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

/**
 * Reputation tier emojis
 */
export const REPUTATION_EMOJIS = {
  // Tiers
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
  DIAMOND: '💠',

  // Vouch types
  HELPFUL: '🤝',
  FRIENDLY: '😊',
  SKILLED: '⭐',
  RELIABLE: '✅',
  DEFAULT: '👍',
} as const;

/**
 * XP and leveling emojis
 */
export const XP_EMOJIS = {
  LEVEL_UP: '🎉',
  XP_GAIN: '✨',
  PROGRESS_BAR_FILLED: '█',
  PROGRESS_BAR_EMPTY: '░',
} as const;

/**
 * Moderation emojis
 */
export const MODERATION_EMOJIS = {
  BAN: '🔨',
  KICK: '👢',
  WARN: '⚠️',
  TIMEOUT: '⏰',
  UNMUTE: '🔊',
  MUTE: '🔇',
  CASE: '📋',
  HISTORY: '📜',
} as const;
