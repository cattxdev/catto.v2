import { container } from '@sapphire/framework';
import { EmbedBuilder, User, Guild, GuildMember, Colors, type ColorResolvable } from 'discord.js';

export enum ModAction {
  BAN = 'BAN',
  UNBAN = 'UNBAN',
  KICK = 'KICK',
  TIMEOUT = 'TIMEOUT',
  WARN = 'WARN',
  MUTE = 'MUTE',
  UNMUTE = 'UNMUTE',
}

export interface ModCaseData {
  guildId: string;
  action: ModAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string;
  duration?: number;
  expiresAt?: Date;
}

const ACTION_COLORS: Record<ModAction, ColorResolvable> = {
  [ModAction.BAN]: Colors.Red,
  [ModAction.UNBAN]: Colors.Green,
  [ModAction.KICK]: Colors.Orange,
  [ModAction.TIMEOUT]: Colors.Yellow,
  [ModAction.WARN]: Colors.Gold,
  [ModAction.MUTE]: Colors.DarkGrey,
  [ModAction.UNMUTE]: Colors.LightGrey,
};

const ACTION_EMOJIS: Record<ModAction, string> = {
  [ModAction.BAN]: '🔨',
  [ModAction.UNBAN]: '✅',
  [ModAction.KICK]: '👢',
  [ModAction.TIMEOUT]: '⏱️',
  [ModAction.WARN]: '⚠️',
  [ModAction.MUTE]: '🔇',
  [ModAction.UNMUTE]: '🔊',
};

/**
 * Get the next case number for a guild
 */
async function getNextCaseNumber(guildId: string): Promise<number> {
  const lastCase = await container.prisma.modCase.findFirst({
    where: { guildId },
    orderBy: { caseNumber: 'desc' },
  });

  return (lastCase?.caseNumber ?? 0) + 1;
}

/**
 * Create a moderation case in the database
 */
export async function createModCase(data: ModCaseData) {
  const caseNumber = await getNextCaseNumber(data.guildId);

  return await container.prisma.modCase.create({
    data: {
      caseNumber,
      guildId: data.guildId,
      action: data.action,
      targetId: data.targetId,
      targetTag: data.targetTag,
      moderatorId: data.moderatorId,
      moderatorTag: data.moderatorTag,
      reason: data.reason || 'No reason provided',
      duration: data.duration,
      expiresAt: data.expiresAt,
    },
  });
}

/**
 * Get a case by number
 */
export async function getCase(guildId: string, caseNumber: number) {
  return await container.prisma.modCase.findUnique({
    where: {
      guildId_caseNumber: {
        guildId,
        caseNumber,
      },
    },
  });
}

/**
 * Get all cases for a user
 */
export async function getUserCases(guildId: string, userId: string) {
  return await container.prisma.modCase.findMany({
    where: {
      guildId,
      targetId: userId,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create an embed for a moderation action
 */
export function createModEmbed(
  action: ModAction,
  target: User | GuildMember,
  moderator: User,
  reason: string,
  caseNumber?: number,
  duration?: number
): EmbedBuilder {
  const targetUser = target instanceof GuildMember ? target.user : target;
  const embed = new EmbedBuilder()
    .setColor(ACTION_COLORS[action])
    .setTitle(`${ACTION_EMOJIS[action]} ${action}`)
    .addFields(
      { name: '👤 Target', value: `${targetUser.tag} (${target.id})`, inline: true },
      { name: '🔨 Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true },
      { name: '📝 Reason', value: reason || 'No reason provided' }
    )
    .setTimestamp();

  if (caseNumber) {
    embed.setFooter({ text: `Case #${caseNumber}` });
  }

  if (duration) {
    embed.addFields({ name: '⏱️ Duration', value: formatDuration(duration) });
  }

  return embed;
}

/**
 * Create a DM notification embed for the target user
 */
export function createUserNotificationEmbed(
  action: ModAction,
  guild: Guild,
  reason: string,
  duration?: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(ACTION_COLORS[action])
    .setTitle(`${ACTION_EMOJIS[action]} You have been ${action.toLowerCase()}`)
    .addFields(
      { name: '🏰 Server', value: guild.name },
      { name: '📝 Reason', value: reason || 'No reason provided' }
    )
    .setThumbnail(guild.iconURL() || null)
    .setTimestamp();

  if (duration) {
    embed.addFields({ name: '⏱️ Duration', value: formatDuration(duration) });
  }

  return embed;
}

/**
 * Send a DM to the target user
 */
export async function notifyUser(
  target: User | GuildMember,
  action: ModAction,
  guild: Guild,
  reason: string,
  duration?: number
): Promise<boolean> {
  try {
    const user = target instanceof GuildMember ? target.user : target;
    const embed = createUserNotificationEmbed(action, guild, reason, duration);

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    container.logger.warn(`Failed to DM user ${target.id}:`, error);
    return false;
  }
}

/**
 * Log moderation action to mod log channel
 */
export async function logToModChannel(guild: Guild, embed: EmbedBuilder): Promise<void> {
  try {
    const modConfig = await container.prisma.modConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!modConfig?.modLogChannelId) {
      return;
    }

    const channel = await guild.channels.fetch(modConfig.modLogChannelId);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    container.logger.error('Failed to log to mod channel:', error);
  }
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

/**
 * Parse duration string to seconds
 */
export function parseDuration(duration: string): number | null {
  const regex = /(\d+)([smhdw])/g;
  let total = 0;
  let match;

  while ((match = regex.exec(duration)) !== null) {
    const value = parseInt(match[1] || '0');
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

  return total > 0 ? total : null;
}

/**
 * Check if user can be moderated
 */
export function canModerate(
  moderator: GuildMember,
  target: GuildMember
): { canModerate: boolean; reason?: string } {
  // Can't moderate yourself
  if (moderator.id === target.id) {
    return { canModerate: false, reason: 'You cannot moderate yourself' };
  }

  // Can't moderate the guild owner
  if (target.id === target.guild.ownerId) {
    return { canModerate: false, reason: 'You cannot moderate the server owner' };
  }

  // Can't moderate bots (usually)
  if (target.user.bot && !moderator.permissions.has('Administrator')) {
    return { canModerate: false, reason: 'You cannot moderate bots' };
  }

  // Check role hierarchy
  if (target.roles.highest.position >= moderator.roles.highest.position) {
    return { canModerate: false, reason: 'Target has equal or higher role than you' };
  }

  // Check bot's role hierarchy
  const botMember = target.guild.members.me;
  if (botMember && target.roles.highest.position >= botMember.roles.highest.position) {
    return { canModerate: false, reason: 'Target has equal or higher role than me' };
  }

  return { canModerate: true };
}

/**
 * Get moderation statistics for a guild
 */
export async function getModStats(guildId: string) {
  const cases = await container.prisma.modCase.findMany({
    where: { guildId },
  });

  const stats = {
    total: cases.length,
    bans: cases.filter((c) => c.action === ModAction.BAN).length,
    kicks: cases.filter((c) => c.action === ModAction.KICK).length,
    timeouts: cases.filter((c) => c.action === ModAction.TIMEOUT).length,
    warns: cases.filter((c) => c.action === ModAction.WARN).length,
    recent: cases.slice(-5).reverse(),
  };

  return stats;
}
