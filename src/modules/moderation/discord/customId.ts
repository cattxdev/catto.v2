import { z } from 'zod';
import { snowflakeSchema } from '#lib/validation/zod.js';

/**
 * Version for the custom_id encoding format
 * Increment if format changes to support backward compatibility
 */
const CUSTOM_ID_VERSION = 'v1';

/**
 * Available mod panel actions
 */
export const ModPanelAction = {
  WARN: 'warn',
  TIMEOUT: 'timeout',
  KICK: 'kick',
  BAN: 'ban',
  SOFTBAN: 'softban',
  TEMPBAN: 'tempban',
  ADD_NOTE: 'addnote',
  VIEW_NOTES: 'viewnotes',
  VIEW_CONTEXT: 'viewctx',
  VIEW_HISTORY: 'history',
  REFRESH: 'refresh',
  MUTE_TEXT: 'mutetxt',
  MUTE_VOICE: 'mutevoice',
  UNMUTE: 'unmute',
} as const;

export type ModPanelActionType = (typeof ModPanelAction)[keyof typeof ModPanelAction];

/**
 * Schema for mod panel custom_id
 * Format: modpanel:v1:{action}:{targetId}:{nonce}
 */
export const ModPanelCustomIdSchema = z.object({
  prefix: z.literal('modpanel'),
  version: z.literal(CUSTOM_ID_VERSION),
  action: z.enum([
    ModPanelAction.WARN,
    ModPanelAction.TIMEOUT,
    ModPanelAction.KICK,
    ModPanelAction.BAN,
    ModPanelAction.SOFTBAN,
    ModPanelAction.TEMPBAN,
    ModPanelAction.ADD_NOTE,
    ModPanelAction.VIEW_NOTES,
    ModPanelAction.VIEW_CONTEXT,
    ModPanelAction.VIEW_HISTORY,
    ModPanelAction.REFRESH,
    ModPanelAction.MUTE_TEXT,
    ModPanelAction.MUTE_VOICE,
    ModPanelAction.UNMUTE,
  ]),
  targetId: snowflakeSchema,
  nonce: z.string().min(1),
});

export type ModPanelCustomId = z.infer<typeof ModPanelCustomIdSchema>;

/**
 * Encode a mod panel custom_id
 */
export function encodeModPanelCustomId(
  action: ModPanelActionType,
  targetId: string,
  nonce?: string
): string {
  const safeNonce = nonce ?? generateNonce();
  return `modpanel:${CUSTOM_ID_VERSION}:${action}:${targetId}:${safeNonce}`;
}

/**
 * Decode and validate a mod panel custom_id
 */
export function decodeModPanelCustomId(customId: string): ModPanelCustomId | null {
  const parts = customId.split(':');

  if (parts.length !== 5) {
    return null;
  }

  const [prefix, version, action, targetId, nonce] = parts;

  const result = ModPanelCustomIdSchema.safeParse({
    prefix,
    version,
    action,
    targetId,
    nonce,
  });

  if (!result.success) {
    return null;
  }

  return result.data;
}

/**
 * Check if a custom_id is a mod panel interaction
 */
export function isModPanelCustomId(customId: string): boolean {
  return customId.startsWith(`modpanel:${CUSTOM_ID_VERSION}:`);
}

/**
 * Generate a short random nonce
 */
function generateNonce(): string {
  return Math.random().toString(36).substring(2, 8);
}

// ==================== Note Modal Custom ID ====================

/**
 * Schema for note modal custom_id
 * Format: modnote:v1:{action}:{targetId}
 */
export const NoteModalCustomIdSchema = z.object({
  prefix: z.literal('modnote'),
  version: z.literal(CUSTOM_ID_VERSION),
  action: z.enum(['add', 'edit']),
  targetId: snowflakeSchema,
});

export type NoteModalCustomId = z.infer<typeof NoteModalCustomIdSchema>;

/**
 * Encode a note modal custom_id
 */
export function encodeNoteModalCustomId(action: 'add' | 'edit', targetId: string): string {
  return `modnote:${CUSTOM_ID_VERSION}:${action}:${targetId}`;
}

/**
 * Decode and validate a note modal custom_id
 */
export function decodeNoteModalCustomId(customId: string): NoteModalCustomId | null {
  const parts = customId.split(':');

  if (parts.length !== 4) {
    return null;
  }

  const [prefix, version, action, targetId] = parts;

  const result = NoteModalCustomIdSchema.safeParse({
    prefix,
    version,
    action,
    targetId,
  });

  if (!result.success) {
    return null;
  }

  return result.data;
}

// ==================== Timeout/Tempban Modal Custom ID ====================

/**
 * Schema for duration modal custom_id
 * Format: moddur:v1:{action}:{targetId}
 */
export const DurationModalCustomIdSchema = z.object({
  prefix: z.literal('moddur'),
  version: z.literal(CUSTOM_ID_VERSION),
  action: z.enum(['timeout', 'tempban']),
  targetId: snowflakeSchema,
});

export type DurationModalCustomId = z.infer<typeof DurationModalCustomIdSchema>;

/**
 * Encode a duration modal custom_id
 */
export function encodeDurationModalCustomId(
  action: 'timeout' | 'tempban',
  targetId: string
): string {
  return `moddur:${CUSTOM_ID_VERSION}:${action}:${targetId}`;
}

/**
 * Decode and validate a duration modal custom_id
 */
export function decodeDurationModalCustomId(customId: string): DurationModalCustomId | null {
  const parts = customId.split(':');

  if (parts.length !== 4) {
    return null;
  }

  const [prefix, version, action, targetId] = parts;

  const result = DurationModalCustomIdSchema.safeParse({
    prefix,
    version,
    action,
    targetId,
  });

  if (!result.success) {
    return null;
  }

  return result.data;
}

// ==================== Reason Modal Custom ID ====================

/**
 * Schema for reason modal custom_id
 * Format: modreason:v1:{action}:{targetId}
 */
export const ReasonModalCustomIdSchema = z.object({
  prefix: z.literal('modreason'),
  version: z.literal(CUSTOM_ID_VERSION),
  action: z.enum(['warn', 'kick', 'ban', 'softban']),
  targetId: snowflakeSchema,
});

export type ReasonModalCustomId = z.infer<typeof ReasonModalCustomIdSchema>;

/**
 * Encode a reason modal custom_id
 */
export function encodeReasonModalCustomId(
  action: 'warn' | 'kick' | 'ban' | 'softban',
  targetId: string
): string {
  return `modreason:${CUSTOM_ID_VERSION}:${action}:${targetId}`;
}

/**
 * Decode and validate a reason modal custom_id
 */
export function decodeReasonModalCustomId(customId: string): ReasonModalCustomId | null {
  const parts = customId.split(':');

  if (parts.length !== 4) {
    return null;
  }

  const [prefix, version, action, targetId] = parts;

  const result = ReasonModalCustomIdSchema.safeParse({
    prefix,
    version,
    action,
    targetId,
  });

  if (!result.success) {
    return null;
  }

  return result.data;
}

// ==================== Mute Modal Custom ID ====================

/**
 * Schema for mute modal custom_id
 * Format: modmute:v1:{action}:{targetId}
 */
export const MuteModalCustomIdSchema = z.object({
  prefix: z.literal('modmute'),
  version: z.literal(CUSTOM_ID_VERSION),
  action: z.enum(['text', 'voice', 'both']),
  targetId: snowflakeSchema,
});

export type MuteModalCustomId = z.infer<typeof MuteModalCustomIdSchema>;

/**
 * Encode a mute modal custom_id
 */
export function encodeMuteModalCustomId(
  action: 'text' | 'voice' | 'both',
  targetId: string
): string {
  return `modmute:${CUSTOM_ID_VERSION}:${action}:${targetId}`;
}

/**
 * Decode and validate a mute modal custom_id
 */
export function decodeMuteModalCustomId(customId: string): MuteModalCustomId | null {
  const parts = customId.split(':');

  if (parts.length !== 4) {
    return null;
  }

  const [prefix, version, action, targetId] = parts;

  const result = MuteModalCustomIdSchema.safeParse({
    prefix,
    version,
    action,
    targetId,
  });

  if (!result.success) {
    return null;
  }

  return result.data;
}

// ==================== Helper to check all mod interaction types ====================

/**
 * Check if a custom_id belongs to any mod interaction type
 */
export function isModInteractionCustomId(customId: string): boolean {
  return (
    customId.startsWith('modpanel:') ||
    customId.startsWith('modnote:') ||
    customId.startsWith('moddur:') ||
    customId.startsWith('modreason:') ||
    customId.startsWith('modmute:')
  );
}
