import type { ChatInputCommandInteraction, GuildMember, User, Guild } from 'discord.js';
import {
  snowflakeSchema,
  durationStringSchema,
  safeParse,
  ValidationError,
} from '#lib/validation/zod.js';
import {
  type UserId,
  type GuildId,
  type DurationSeconds,
  asUserId,
  asGuildId,
  asDuration,
} from '../../modules/moderation/domain/types.js';

/**
 * Parsed ban options from interaction
 */
export interface BanOptions {
  target: User;
  targetId: UserId;
  reason: string;
  deleteMessages: boolean;
  guild: Guild;
  guildId: GuildId;
  moderator: User;
  moderatorMember: GuildMember;
}

/**
 * Parsed kick options from interaction
 */
export interface KickOptions {
  target: User;
  targetId: UserId;
  reason: string;
  guild: Guild;
  guildId: GuildId;
  moderator: User;
  moderatorMember: GuildMember;
}

/**
 * Parsed timeout options from interaction
 */
export interface TimeoutOptions {
  target: User;
  targetId: UserId;
  reason: string;
  durationSeconds: DurationSeconds;
  guild: Guild;
  guildId: GuildId;
  moderator: User;
  moderatorMember: GuildMember;
}

/**
 * Parsed warn options from interaction
 */
export interface WarnOptions {
  target: User;
  targetId: UserId;
  reason: string;
  guild: Guild;
  guildId: GuildId;
  moderator: User;
  moderatorMember: GuildMember;
}

/**
 * Parsed unban options from interaction
 */
export interface UnbanOptions {
  userId: UserId;
  reason: string;
  guild: Guild;
  guildId: GuildId;
  moderator: User;
}

/**
 * Parsed case options from interaction
 */
export interface CaseOptions {
  caseNumber: number;
  guild: Guild;
  guildId: GuildId;
}

/**
 * Parsed history options from interaction
 */
export interface HistoryOptions {
  target: User;
  targetId: UserId;
  guild: Guild;
  guildId: GuildId;
}

/**
 * Parse duration string to seconds
 */
export function parseDurationToSeconds(durationStr: string): DurationSeconds | null {
  const regex = /(\d+)([smhdw])/g;
  let total = 0;
  let match;

  while ((match = regex.exec(durationStr)) !== null) {
    const value = parseInt(match[1] ?? '0', 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        total += value;
        break;
      case 'm':
        total += value * 60;
        break;
      case 'h':
        total += value * 3600;
        break;
      case 'd':
        total += value * 86400;
        break;
      case 'w':
        total += value * 604800;
        break;
    }
  }

  return total > 0 ? asDuration(total) : null;
}

/**
 * Ensure interaction is in a guild context
 */
function ensureGuildContext(interaction: ChatInputCommandInteraction): {
  guild: Guild;
  guildId: GuildId;
  moderatorMember: GuildMember;
} {
  if (!interaction.guild || !interaction.member) {
    throw new ValidationError('This command can only be used in a server.');
  }
  return {
    guild: interaction.guild,
    guildId: asGuildId(interaction.guild.id),
    moderatorMember: interaction.member as GuildMember,
  };
}

/**
 * Parse ban subcommand options
 */
export function parseBanOptions(interaction: ChatInputCommandInteraction): BanOptions {
  const { guild, guildId, moderatorMember } = ensureGuildContext(interaction);

  const target = interaction.options.getUser('target', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  const deleteMessages = interaction.options.getBoolean('delete_messages') ?? false;

  return {
    target,
    targetId: asUserId(target.id),
    reason,
    deleteMessages,
    guild,
    guildId,
    moderator: interaction.user,
    moderatorMember,
  };
}

/**
 * Parse kick subcommand options
 */
export function parseKickOptions(interaction: ChatInputCommandInteraction): KickOptions {
  const { guild, guildId, moderatorMember } = ensureGuildContext(interaction);

  const target = interaction.options.getUser('target', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';

  return {
    target,
    targetId: asUserId(target.id),
    reason,
    guild,
    guildId,
    moderator: interaction.user,
    moderatorMember,
  };
}

/**
 * Parse timeout subcommand options
 */
export function parseTimeoutOptions(
  interaction: ChatInputCommandInteraction
): TimeoutOptions | null {
  const { guild, guildId, moderatorMember } = ensureGuildContext(interaction);

  const target = interaction.options.getUser('target', true);
  const durationStr = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';

  const validation = safeParse(durationStringSchema, durationStr);
  if (!validation.success) {
    return null; // Caller handles invalid format
  }

  const durationSeconds = parseDurationToSeconds(durationStr);
  if (!durationSeconds) {
    return null;
  }

  return {
    target,
    targetId: asUserId(target.id),
    reason,
    durationSeconds,
    guild,
    guildId,
    moderator: interaction.user,
    moderatorMember,
  };
}

/**
 * Parse warn subcommand options
 */
export function parseWarnOptions(interaction: ChatInputCommandInteraction): WarnOptions {
  const { guild, guildId, moderatorMember } = ensureGuildContext(interaction);

  const target = interaction.options.getUser('target', true);
  const reason = interaction.options.getString('reason', true);

  return {
    target,
    targetId: asUserId(target.id),
    reason,
    guild,
    guildId,
    moderator: interaction.user,
    moderatorMember,
  };
}

/**
 * Parse unban subcommand options
 */
export function parseUnbanOptions(interaction: ChatInputCommandInteraction): UnbanOptions | null {
  const { guild, guildId } = ensureGuildContext(interaction);

  const userId = interaction.options.getString('user_id', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';

  const validation = safeParse(snowflakeSchema, userId);
  if (!validation.success) {
    return null; // Invalid user ID format
  }

  return {
    userId: asUserId(userId),
    reason,
    guild,
    guildId,
    moderator: interaction.user,
  };
}

/**
 * Parse case subcommand options
 */
export function parseCaseOptions(interaction: ChatInputCommandInteraction): CaseOptions {
  const { guild, guildId } = ensureGuildContext(interaction);

  const caseNumber = interaction.options.getInteger('number', true);

  return {
    caseNumber,
    guild,
    guildId,
  };
}

/**
 * Parse history subcommand options
 */
export function parseHistoryOptions(interaction: ChatInputCommandInteraction): HistoryOptions {
  const { guild, guildId } = ensureGuildContext(interaction);

  const target = interaction.options.getUser('target', true);

  return {
    target,
    targetId: asUserId(target.id),
    guild,
    guildId,
  };
}
