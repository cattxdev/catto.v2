import type { GuildMember, PermissionResolvable, Snowflake } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';

// Types

export type PermissionCheckResult = { ok: true } | { ok: false; missing: string[] };

/**
 * Custom permission identifiers for the bot's permission framework.
 * These are separate from Discord's built-in permissions.
 */
export type CustomPermission =
  | 'mod.warn'
  | 'mod.mute'
  | 'mod.kick'
  | 'mod.ban'
  | 'mod.timeout'
  | 'mod.manage_cases'
  | 'mod.view_logs'
  | 'mod.configure'
  | 'automod.manage'
  | 'automod.bypass'
  | 'utility.manage_tags'
  | 'utility.manage_embeds'
  | 'admin.manage_permissions'
  | 'admin.manage_roles'
  | (string & {}); // Allow custom string permissions while maintaining autocomplete

/**
 * Permission source - where the permission was granted from
 */
export type PermissionSource = 'discord' | 'custom_role' | 'user_override' | 'default';

/**
 * Detailed permission check result with source information
 */
export interface DetailedPermissionResult {
  granted: boolean;
  permission: CustomPermission | PermissionResolvable;
  source: PermissionSource;
  roleId?: Snowflake;
  roleName?: string;
}

/**
 * Context for permission checks - will be populated from database
 */
export interface PermissionContext {
  guildId: Snowflake;
  userId: Snowflake;
  member: GuildMember | null;
  customRoles?: CustomRolePermissions[];
  userOverrides?: UserPermissionOverride;
  guildDefaults?: GuildPermissionDefaults;
}

/**
 * Custom role with associated permissions (from database)
 */
export interface CustomRolePermissions {
  roleId: Snowflake;
  roleName: string;
  permissions: CustomPermission[];
  priority: number;
  inheritsFrom?: Snowflake[];
}

/**
 * User-specific permission overrides (from database)
 */
export interface UserPermissionOverride {
  userId: Snowflake;
  granted: CustomPermission[];
  denied: CustomPermission[];
  expiresAt?: Date;
}

/**
 * Guild-level default permissions (from database)
 */
export interface GuildPermissionDefaults {
  guildId: Snowflake;
  /** Discord roles that grant specific custom permissions */
  discordRoleMappings: Map<Snowflake, CustomPermission[]>;
  /** Default permissions for @everyone */
  everyonePermissions: CustomPermission[];
  /** Permissions that require Discord Administrator */
  adminOnlyPermissions: CustomPermission[];
}

/**
 * Permission resolver interface for future database integration
 */
export interface PermissionResolver {
  resolveContext(guildId: Snowflake, userId: Snowflake): Promise<PermissionContext>;
  hasCustomPermission(
    ctx: PermissionContext,
    permission: CustomPermission
  ): Promise<DetailedPermissionResult>;
  getEffectivePermissions(ctx: PermissionContext): Promise<CustomPermission[]>;
  invalidateCache(guildId: Snowflake, userId?: Snowflake): void;
}

// Discord Permission Checks (Current Implementation)

/**
 * Check if a member has the required Discord permissions.
 * Returns a result object indicating success or missing permissions.
 */
export function checkPermissions(
  member: GuildMember | null | undefined,
  permissions: PermissionResolvable | PermissionResolvable[]
): PermissionCheckResult {
  if (!member) {
    return { ok: false, missing: ['Unknown (no member)'] };
  }

  const permsArray = Array.isArray(permissions) ? permissions : [permissions];
  const missing: string[] = [];

  for (const perm of permsArray) {
    if (!member.permissions.has(perm)) {
      missing.push(getPermissionName(perm));
    }
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/**
 * Check if a member has a specific Discord permission. Single-line check.
 */
export function hasPermission(
  member: GuildMember | null | undefined,
  permission: PermissionResolvable
): boolean {
  return member?.permissions.has(permission) ?? false;
}

/**
 * Check if a member has Administrator permission.
 */
export function isAdmin(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.Administrator);
}

/**
 * Check if a member has Manage Guild permission.
 */
export function canManageGuild(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.ManageGuild);
}

/**
 * Check if a member has Moderate Members permission.
 */
export function canModerateMembers(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.ModerateMembers);
}

/**
 * Check if a member has Ban Members permission.
 */
export function canBanMembers(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.BanMembers);
}

/**
 * Check if a member has Kick Members permission.
 */
export function canKickMembers(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.KickMembers);
}

/**
 * Check if a member has Manage Roles permission.
 */
export function canManageRoles(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.ManageRoles);
}

/**
 * Check if a member has Manage Channels permission.
 */
export function canManageChannels(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.ManageChannels);
}

/**
 * Check if a member has Mute Members permission.
 */
export function canMuteMembers(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.MuteMembers);
}

/**
 * Check if a member has Deafen Members permission.
 */
export function canDeafenMembers(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.DeafenMembers);
}

/**
 * Check if a member has Move Members permission.
 */
export function canMoveMembers(member: GuildMember | null | undefined): boolean {
  return hasPermission(member, PermissionFlagsBits.MoveMembers);
}

// Moderator Detection

/**
 * Permissions that indicate a user is a moderator.
 * Having ANY of these permissions qualifies someone as a moderator.
 */
const MODERATOR_PERMISSIONS: PermissionResolvable[] = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.ManageGuild,
];

/**
 * Voice-specific moderation permissions.
 * These are the permissions needed to fully moderate voice channels.
 * Used for mod shield indicators and voice mod detection.
 */
const VOICE_MOD_PERMISSIONS: PermissionResolvable[] = [
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.KickMembers,
];

/**
 * Check if a member is a moderator (has any moderation permission).
 * This is a broad check - having ANY mod permission qualifies.
 */
export function isModerator(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  return MODERATOR_PERMISSIONS.some((perm) => member.permissions.has(perm));
}

/**
 * Check if a member has voice moderation permissions.
 * Requires ALL of: MuteMembers, DeafenMembers, MoveMembers.
 */
export function hasVoiceModPermissions(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  return VOICE_MOD_PERMISSIONS.every((perm) => member.permissions.has(perm));
}

/**
 * Check if a member has any voice moderation permission.
 * Having ANY of MuteMembers, DeafenMembers, or MoveMembers qualifies.
 */
export function hasAnyVoiceModPermission(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  return VOICE_MOD_PERMISSIONS.some((perm) => member.permissions.has(perm));
}

/**
 * Get all moderator permissions a member has.
 */
export function getModeratorPermissions(
  member: GuildMember | null | undefined
): PermissionResolvable[] {
  if (!member) return [];
  return MODERATOR_PERMISSIONS.filter((perm) => member.permissions.has(perm));
}

// Custom Permission Checks (Future Implementation Stubs)

/**
 * Check if a member has a custom permission.
 * Currently falls back to Discord permission mapping.
 *
 * @future Will integrate with database-backed permission system
 */
export function hasCustomPermission(
  member: GuildMember | null | undefined,
  permission: CustomPermission,
  _ctx?: Partial<PermissionContext>
): boolean {
  // Future: Check ctx.userOverrides.denied first (explicit denies)
  // Future: Check ctx.userOverrides.granted (explicit grants)
  // Future: Check ctx.customRoles for permission
  // Future: Check ctx.guildDefaults.discordRoleMappings

  // Current: Map to Discord permissions as fallback
  return hasDiscordPermissionFallback(member, permission);
}

/**
 * Check multiple custom permissions at once.
 *
 * @future Will batch database queries for efficiency
 */
export function hasAllCustomPermissions(
  member: GuildMember | null | undefined,
  permissions: CustomPermission[],
  _ctx?: Partial<PermissionContext>
): PermissionCheckResult {
  const missing: string[] = [];

  for (const perm of permissions) {
    if (!hasCustomPermission(member, perm, _ctx)) {
      missing.push(perm);
    }
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/**
 * Check if member has any of the specified custom permissions.
 *
 * @future Will optimize with single database query
 */
export function hasAnyCustomPermission(
  member: GuildMember | null | undefined,
  permissions: CustomPermission[],
  _ctx?: Partial<PermissionContext>
): boolean {
  return permissions.some((perm) => hasCustomPermission(member, perm, _ctx));
}

/**
 * Get all effective custom permissions for a member.
 *
 * @future Will aggregate from all sources (roles, overrides, defaults)
 */
export function getEffectiveCustomPermissions(
  _member: GuildMember | null | undefined,
  _ctx?: Partial<PermissionContext>
): CustomPermission[] {
  // Future: Aggregate permissions from:
  // 1. Guild defaults (everyone permissions)
  // 2. Discord role mappings
  // 3. Custom role permissions (by priority)
  // 4. User overrides (granted - denied)
  return [];
}

// Permission Mapping (Discord <-> Custom)

/**
 * Default mapping from custom permissions to Discord permissions.
 * Used as fallback when database permissions are not configured.
 */
const CUSTOM_TO_DISCORD_MAP: Partial<Record<CustomPermission, PermissionResolvable>> = {
  'mod.warn': PermissionFlagsBits.ModerateMembers,
  'mod.mute': PermissionFlagsBits.ModerateMembers,
  'mod.kick': PermissionFlagsBits.KickMembers,
  'mod.ban': PermissionFlagsBits.BanMembers,
  'mod.timeout': PermissionFlagsBits.ModerateMembers,
  'mod.manage_cases': PermissionFlagsBits.ModerateMembers,
  'mod.view_logs': PermissionFlagsBits.ViewAuditLog,
  'mod.configure': PermissionFlagsBits.Administrator,
  'automod.manage': PermissionFlagsBits.ManageGuild,
  'automod.bypass': PermissionFlagsBits.Administrator,
  'utility.manage_tags': PermissionFlagsBits.ManageMessages,
  'utility.manage_embeds': PermissionFlagsBits.ManageMessages,
  'admin.manage_permissions': PermissionFlagsBits.Administrator,
  'admin.manage_roles': PermissionFlagsBits.ManageRoles,
};

/**
 * Fallback to Discord permission when custom permission system is not configured.
 */
function hasDiscordPermissionFallback(
  member: GuildMember | null | undefined,
  permission: CustomPermission
): boolean {
  const discordPerm = CUSTOM_TO_DISCORD_MAP[permission];
  if (!discordPerm) {
    // Unknown custom permission - require admin by default
    return isAdmin(member);
  }
  return hasPermission(member, discordPerm);
}

// Utility Functions

/**
 * Get a human-readable permission name.
 */
export function getPermissionName(permission: PermissionResolvable | CustomPermission): string {
  if (typeof permission === 'string') {
    // Custom permission - format nicely
    return permission
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' > ');
  }
  if (typeof permission === 'bigint') {
    for (const [name, value] of Object.entries(PermissionFlagsBits)) {
      if (value === permission) {
        return name.replace(/([A-Z])/g, ' $1').trim();
      }
    }
    return `Permission(${permission})`;
  }
  return String(permission);
}

/**
 * Parse a permission string into a CustomPermission.
 * Returns undefined if invalid.
 */
export function parseCustomPermission(input: string): CustomPermission | undefined {
  const normalized = input.toLowerCase().trim();
  if (normalized.includes('.') && /^[a-z_]+\.[a-z_]+$/.test(normalized)) {
    return normalized as CustomPermission;
  }
  return undefined;
}

/**
 * Get all available custom permission categories.
 */
export function getPermissionCategories(): string[] {
  return ['mod', 'automod', 'utility', 'admin'];
}

/**
 * Get all predefined custom permissions for a category.
 */
export function getPermissionsForCategory(category: string): CustomPermission[] {
  const categoryMap: Record<string, CustomPermission[]> = {
    mod: [
      'mod.warn',
      'mod.mute',
      'mod.kick',
      'mod.ban',
      'mod.timeout',
      'mod.manage_cases',
      'mod.view_logs',
      'mod.configure',
    ],
    automod: ['automod.manage', 'automod.bypass'],
    utility: ['utility.manage_tags', 'utility.manage_embeds'],
    admin: ['admin.manage_permissions', 'admin.manage_roles'],
  };
  return categoryMap[category] ?? [];
}
