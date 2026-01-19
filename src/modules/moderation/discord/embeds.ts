import { container } from '@sapphire/framework';
import { EmbedBuilder, User, Guild, GuildMember, Colors, type ColorResolvable } from 'discord.js';
import { ModAction } from '@prisma/client';
import type { DurationSeconds, CaseNumber } from '../domain/types.js';

const ACTION_COLORS: Record<ModAction, ColorResolvable> = {
  [ModAction.BAN]: Colors.Red,
  [ModAction.UNBAN]: Colors.Green,
  [ModAction.KICK]: Colors.Orange,
  [ModAction.TIMEOUT]: Colors.Yellow,
  [ModAction.WARN]: Colors.Gold,
  [ModAction.MUTE]: Colors.DarkGrey,
  [ModAction.UNMUTE]: Colors.LightGrey,
  [ModAction.SOFTBAN]: Colors.DarkOrange,
  [ModAction.TEMPBAN]: Colors.DarkRed,
  [ModAction.MUTE_TEXT]: Colors.DarkGrey,
  [ModAction.MUTE_VOICE]: Colors.DarkGrey,
  [ModAction.MUTE_BOTH]: Colors.DarkGrey,
  [ModAction.UNMUTE_TEXT]: Colors.LightGrey,
  [ModAction.UNMUTE_VOICE]: Colors.LightGrey,
  [ModAction.UNMUTE_BOTH]: Colors.LightGrey,
};

const ACTION_EMOJIS: Record<ModAction, string> = {
  [ModAction.BAN]: 'Ban',
  [ModAction.UNBAN]: 'Unban',
  [ModAction.KICK]: 'Kick',
  [ModAction.TIMEOUT]: 'Timeout',
  [ModAction.WARN]: 'Warn',
  [ModAction.MUTE]: 'Mute',
  [ModAction.UNMUTE]: 'Unmute',
  [ModAction.SOFTBAN]: 'Softban',
  [ModAction.TEMPBAN]: 'Tempban',
  [ModAction.MUTE_TEXT]: 'Text Mute',
  [ModAction.MUTE_VOICE]: 'Voice Mute',
  [ModAction.MUTE_BOTH]: 'Full Mute',
  [ModAction.UNMUTE_TEXT]: 'Text Unmute',
  [ModAction.UNMUTE_VOICE]: 'Voice Unmute',
  [ModAction.UNMUTE_BOTH]: 'Full Unmute',
};

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
 * Create an embed for a moderation action
 */
export function createModEmbed(
  action: ModAction,
  target: User | GuildMember,
  moderator: User,
  reason: string,
  caseNumber?: CaseNumber,
  duration?: DurationSeconds
): EmbedBuilder {
  const targetUser = target instanceof GuildMember ? target.user : target;
  const color = ACTION_COLORS[action] ?? Colors.Grey;
  const emoji = ACTION_EMOJIS[action] ?? '📋';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${action}`)
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
  duration?: DurationSeconds
): EmbedBuilder {
  const color = ACTION_COLORS[action] ?? Colors.Grey;
  const emoji = ACTION_EMOJIS[action] ?? '📋';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} You have been ${action.toLowerCase()}`)
    .addFields(
      { name: '🏰 Server', value: guild.name },
      { name: '📝 Reason', value: reason || 'No reason provided' }
    )
    .setThumbnail(guild.iconURL())
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
  duration?: DurationSeconds
): Promise<boolean> {
  try {
    const user = target instanceof GuildMember ? target.user : target;
    const embed = createUserNotificationEmbed(action, guild, reason, duration);

    await user.send({ embeds: [embed] });
    return true;
  } catch {
    container.logger.warn(`Failed to DM user ${target.id}`);
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
 * Create a case details embed
 */
export function createCaseEmbed(modCase: {
  caseNumber: number;
  action: ModAction;
  targetTag: string;
  targetId: string;
  moderatorTag: string;
  moderatorId: string;
  reason: string | null;
  createdAt: Date;
  duration: number | null;
  expiresAt: Date | null;
  guildId: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle(`📋 Case #${modCase.caseNumber}`)
    .addFields(
      {
        name: '🔨 Action',
        value: modCase.action,
        inline: true,
      },
      {
        name: '👤 Target',
        value: `${modCase.targetTag}\n(\`${modCase.targetId}\`)`,
        inline: true,
      },
      {
        name: '👮 Moderator',
        value: `${modCase.moderatorTag}\n(\`${modCase.moderatorId}\`)`,
        inline: true,
      },
      {
        name: '📝 Reason',
        value: modCase.reason ?? 'No reason provided',
        inline: false,
      },
      {
        name: '📅 Date',
        value: `<t:${Math.floor(modCase.createdAt.getTime() / 1000)}:F>`,
        inline: true,
      }
    );

  if (modCase.duration) {
    embed.addFields({
      name: '⏱️ Duration',
      value: formatDuration(modCase.duration),
      inline: true,
    });
  }

  if (modCase.expiresAt) {
    embed.addFields({
      name: '⏰ Expires',
      value: `<t:${Math.floor(modCase.expiresAt.getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  embed.setFooter({
    text: `Guild ID: ${modCase.guildId}`,
  });

  return embed;
}

/**
 * Create a history embed
 */
export function createHistoryEmbed(
  target: User,
  cases: Array<{
    caseNumber: number;
    action: ModAction;
    createdAt: Date;
    reason: string | null;
  }>
): EmbedBuilder {
  const stats = {
    bans: cases.filter((c) => c.action === ModAction.BAN).length,
    kicks: cases.filter((c) => c.action === ModAction.KICK).length,
    timeouts: cases.filter((c) => c.action === ModAction.TIMEOUT).length,
    warns: cases.filter((c) => c.action === ModAction.WARN).length,
  };

  const embed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle(`📋 Moderation History for ${target.tag}`)
    .setThumbnail(target.displayAvatarURL())
    .setDescription(
      `**Total Cases:** ${cases.length}\n` +
        `**Bans:** ${stats.bans}\n` +
        `**Kicks:** ${stats.kicks}\n` +
        `**Timeouts:** ${stats.timeouts}\n` +
        `**Warns:** ${stats.warns}`
    );

  const recentCases = cases.slice(0, 10);
  const caseList = recentCases
    .map((c) => {
      const timestamp = `<t:${Math.floor(c.createdAt.getTime() / 1000)}:d>`;
      return `**Case #${c.caseNumber}** - ${c.action}\n${timestamp} • ${c.reason ?? 'No reason'}`;
    })
    .join('\n\n');

  embed.addFields({
    name: `Recent Cases (Showing ${recentCases.length} of ${cases.length})`,
    value: caseList || 'No cases',
    inline: false,
  });

  if (cases.length > 10) {
    embed.setFooter({
      text: `Showing 10 of ${cases.length} total cases. Use /mod case <number> to view specific cases.`,
    });
  }

  return embed;
}
