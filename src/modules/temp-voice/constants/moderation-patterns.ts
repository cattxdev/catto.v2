/**
 * Moderation Patterns and Constants
 * Base patterns for content moderation (configurable per guild)
 */

import type { HeuristicConfig } from '../models/name-moderation.model.js';

/**
 * Default heuristic configuration
 */
export const DEFAULT_HEURISTIC_CONFIG: HeuristicConfig = {
  maxSymbolDensity: 0.4, // 40% symbols is suspicious
  maxRepetition: 4, // More than 4 consecutive identical chars
  minTokenLength: 2, // Tokens shorter than this are ignored
  maxSuspiciousTokenScore: 3, // Cumulative suspicious token threshold
  rejectionThreshold: 5, // Total heuristic score above this -> reject
};

/**
 * Strict mode heuristic configuration (more aggressive)
 */
export const STRICT_HEURISTIC_CONFIG: HeuristicConfig = {
  maxSymbolDensity: 0.3, // 30% symbols is suspicious
  maxRepetition: 3, // More than 3 consecutive identical chars
  minTokenLength: 2,
  maxSuspiciousTokenScore: 2,
  rejectionThreshold: 3,
};

/**
 * Base profanity patterns (basic set - should be extended per deployment)
 * These are examples and should be customized based on community standards
 * Word boundaries (\\b) are used to avoid matching parts of innocent words
 */
export const PROFANITY_PATTERNS: string[] = [
  // Note: These are placeholder patterns
  // Real deployments should use a comprehensive profanity dataset
  '\\b(f+[\\W_]*u+[\\W_]*c+[\\W_]*k+[edsing]*)\\b',
  '\\b(s+[\\W_]*h+[\\W_]*i+[\\W_]*t+[sy]?)\\b',
  '\\b(b+[\\W_]*i+[\\W_]*t+[\\W_]*c+[\\W_]*h+[es]*)\\b',
  '\\b(d+[\\W_]*a+[\\W_]*m+[\\W_]*n+[edsing]*)\\b',
  '\\b(h+[\\W_]*e+[\\W_]*l+[\\W_]*l+)\\b',
  '\\b(a+[\\W_]*s+[\\W_]*s+[es]*)\\b',
];

/**
 * Hate speech patterns (basic set - should be extended)
 * These detect common hate speech variations with obfuscation
 */
export const HATE_SPEECH_PATTERNS: string[] = [
  // Racial slurs (obfuscated) - with word boundaries
  '\\b(n+[\\W_]*[i1!]+[\\W_]*[g9]+[\\W_]*[g9]+)\\b',
  '\\b(h+[\\W_]*[a@4]+[\\W_]*t+[\\W_]*e+)\\b',

  // Note: This is a sensitive area that requires careful consideration
  // Pattern lists should be reviewed and approved by moderation teams
];

/**
 * Spam patterns
 */
export const SPAM_PATTERNS: string[] = [
  // Discord invite links
  '(discord\\.gg/|discordapp\\.com/invite/)',
  // Common spam phrases
  '(free\\s+nitro)',
  '(claim\\s+your)',
  '(click\\s+here)',
  // Suspicious repetition of same word
  '\\b(\\w+)\\s+\\1\\s+\\1',
];

/**
 * Obfuscation detection patterns
 * These patterns are CASE-SENSITIVE and should not use 'i' flag
 */
export const OBFUSCATION_PATTERNS: string[] = [
  // Alternating case (lIkE tHiS) - requires case-sensitive matching
  '(?:[a-z][A-Z]){3,}|(?:[A-Z][a-z]){3,}',
  // Excessive spacing (l i k e  t h i s)
  '(?:[a-z]\\s+){4,}[a-z]',
  // Suspicious character repetition
  '(.)\\1{4,}',
  // Multiple zero-width characters
  '[\\u200B-\\u200D\\uFEFF]{2,}',
];

/**
 * Invalid character patterns (beyond Discord's rules)
 */
export const INVALID_CHAR_PATTERNS: string[] = [
  // Control characters
  '[\\x00-\\x1F\\x7F]',
  // Right-to-left override (used for spoofing)
  '[\\u202E\\u202D]',
];

/**
 * Safe name templates for auto-rename
 */
export const SAFE_NAME_TEMPLATES: string[] = [
  'Chat Room',
  'Voice Lounge',
  'Hangout',
  'Chill Zone',
  'Gaming Hub',
  'Study Room',
  'Music Space',
  'Talk Time',
  'Social Corner',
  'Friendly Chat',
  'Community Room',
  'Voice Chat',
  'Meeting Room',
  'Casual Space',
  'Vibe Zone',
];

/**
 * Adjectives for creative name generation
 */
export const SAFE_ADJECTIVES: string[] = [
  'Cozy',
  'Chill',
  'Cool',
  'Awesome',
  'Epic',
  'Friendly',
  'Warm',
  'Comfy',
  'Nice',
  'Pleasant',
  'Happy',
  'Fun',
  'Cheerful',
  'Bright',
  'Sunny',
  'Peaceful',
  'Calm',
  'Relaxed',
  'Groovy',
  'Rad',
  'Sweet',
  'Lovely',
  'Great',
  'Super',
  'Amazing',
  'Fantastic',
  'Wonderful',
  'Excellent',
  'Delightful',
  'Charming',
];

/**
 * Nouns for creative name generation
 */
export const SAFE_NOUNS: string[] = [
  'Room',
  'Lounge',
  'Space',
  'Zone',
  'Hub',
  'Corner',
  'Place',
  'Spot',
  'Area',
  'Chamber',
  'Den',
  'Haven',
  'Retreat',
  'Hideout',
  'Sanctuary',
  'Nest',
  'Quarters',
  'Hall',
  'Parlor',
  'Lobby',
  'Studio',
  'Café',
  'Club',
  'Circle',
  'Squad',
  'Crew',
  'Gang',
  'Team',
  'Party',
  'Group',
];

/**
 * Themed name templates (category-based)
 */
export const THEMED_NAMES: Record<string, string[]> = {
  gaming: [
    'Game Night',
    'Gaming Session',
    'Victory Room',
    'Player Hub',
    'Quest Room',
    'Battle Station',
    'Gaming Zone',
    'Raid Headquarters',
    'PvP Arena',
    'Co-op Corner',
  ],
  study: [
    'Study Hall',
    'Learning Zone',
    'Study Session',
    'Focus Room',
    'Study Group',
    'Library Corner',
    'Homework Hub',
    'Knowledge Zone',
    'Scholar Space',
    'Academic Room',
  ],
  music: [
    'Music Room',
    'Jam Session',
    'Concert Hall',
    'Audio Studio',
    'Melody Lounge',
    'Rhythm Zone',
    'Sound Space',
    'Beat Room',
    'Tune Haven',
    'Harmony Hub',
  ],
  social: [
    'Social Hour',
    'Chat Room',
    'Conversation Corner',
    'Talk Time',
    'Friendly Space',
    'Community Room',
    'Social Club',
    'Gathering Place',
    'Meet & Greet',
    'Hangout Spot',
  ],
  creative: [
    'Creative Space',
    'Art Studio',
    'Idea Lab',
    'Workshop',
    'Design Room',
    'Creation Station',
    'Maker Space',
    'Project Room',
    'Innovation Hub',
    'Brainstorm Zone',
  ],
};

/**
 * Discord channel name constraints
 */
export const DISCORD_NAME_CONSTRAINTS = {
  minLength: 1,
  maxLength: 100,
  // Allowed characters: alphanumeric, dash, underscore, space (for voice channels)
  allowedCharsPattern: /^[a-zA-Z0-9\-_ ]+$/,
};

/**
 * Collision resolution suffixes
 */
export const COLLISION_SUFFIXES = ['#', ' •', ' -', ' ·', ' '];
export const MAX_COLLISION_ATTEMPTS = 20;

/**
 * Pattern categories for organization
 */
export enum PatternCategory {
  PROFANITY = 'PROFANITY',
  HATE_SPEECH = 'HATE_SPEECH',
  SPAM = 'SPAM',
  OBFUSCATION = 'OBFUSCATION',
  INVALID_CHARS = 'INVALID_CHARS',
  CUSTOM = 'CUSTOM',
}

/**
 * Get all base patterns organized by category
 */
export function getBasePatterns(): Record<PatternCategory, string[]> {
  return {
    [PatternCategory.PROFANITY]: PROFANITY_PATTERNS,
    [PatternCategory.HATE_SPEECH]: HATE_SPEECH_PATTERNS,
    [PatternCategory.SPAM]: SPAM_PATTERNS,
    [PatternCategory.OBFUSCATION]: OBFUSCATION_PATTERNS,
    [PatternCategory.INVALID_CHARS]: INVALID_CHAR_PATTERNS,
    [PatternCategory.CUSTOM]: [],
  };
}

/**
 * Pattern severity levels
 */
export const PATTERN_SEVERITY: Record<PatternCategory, number> = {
  [PatternCategory.PROFANITY]: 5,
  [PatternCategory.HATE_SPEECH]: 10,
  [PatternCategory.SPAM]: 4,
  [PatternCategory.OBFUSCATION]: 3,
  [PatternCategory.INVALID_CHARS]: 2,
  [PatternCategory.CUSTOM]: 5,
};

/**
 * Stopwords to filter from token analysis (common words that aren't suspicious)
 */
export const STOPWORDS: Set<string> = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'should',
  'could',
  'may',
  'might',
  'can',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  'this',
  'that',
  'these',
  'those',
  'room',
  'channel',
  'voice',
  'chat',
  'talk',
  'space',
  'zone',
  'hub',
]);

/**
 * Regex timeout (milliseconds) to prevent ReDoS
 */
export const REGEX_TIMEOUT_MS = 100;
