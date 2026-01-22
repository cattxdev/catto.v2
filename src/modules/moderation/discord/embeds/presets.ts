import { container as sapphireContainer } from '@sapphire/framework';
import { GuildMember, type User, type Guild, MessageFlags } from 'discord.js';
import { ModAction } from '@prisma/client';
import type { DurationSeconds, CaseNumber } from '../../domain/types.js';
import {
  container,
  formatDuration,
  formatRelativeTimestamp,
  formatStatsLine,
  truncateText,
  EMOJI,
  COLORS,
  paginationRow,
  type FluentContainer,
} from '#lib/discord/index.js';
import * as modV1 from './v1.js';
import {
  buildModLogEntry,
  getActionDisplay,
  getModLogMessageOptions,
  type ModLogEntry,
} from '../modlog.js';
import { ensureNonNull } from '#root/lib/utils.js';

// Re-export for convenience
export { formatDuration, type ModLogEntry };

const OFFENSE_WINDOW_DAYS = 30;

const OFFENSE_GROUPS: Partial<Record<ModAction, { label: string; actions: ModAction[] }>> = {
  [ModAction.WARN]: { label: 'warn', actions: [ModAction.WARN] },
  [ModAction.TIMEOUT]: { label: 'timeout', actions: [ModAction.TIMEOUT] },
  [ModAction.KICK]: { label: 'kick', actions: [ModAction.KICK] },
  [ModAction.SOFTBAN]: { label: 'softban', actions: [ModAction.SOFTBAN] },
  [ModAction.TEMPBAN]: { label: 'tempban', actions: [ModAction.TEMPBAN] },
  [ModAction.MUTE_TEXT]: {
    label: 'mute',
    actions: [ModAction.MUTE_TEXT, ModAction.MUTE_VOICE, ModAction.MUTE_BOTH],
  },
  [ModAction.MUTE_VOICE]: {
    label: 'mute',
    actions: [ModAction.MUTE_TEXT, ModAction.MUTE_VOICE, ModAction.MUTE_BOTH],
  },
  [ModAction.MUTE_BOTH]: {
    label: 'mute',
    actions: [ModAction.MUTE_TEXT, ModAction.MUTE_VOICE, ModAction.MUTE_BOTH],
  },
};

// Re-export from modlog for backward compatibility during migration
export { buildModLogEntry, getModLogMessageOptions };

const NOTIFICATION_FLAGS = MessageFlags.IsComponentsV2;

const MOD_ACTION_NOTIFICATIONS: Record<ModAction, { verb: string; emoji: string; color: number }> =
  {
    [ModAction.WARN]: { verb: 'warned', emoji: EMOJI.WARNING, color: COLORS.WARN },
    [ModAction.KICK]: { verb: 'kicked', emoji: EMOJI.SERVER_LEAVE, color: COLORS.KICK },
    [ModAction.BAN]: { verb: 'banned', emoji: EMOJI.RED_SHIELD, color: COLORS.BAN },
    [ModAction.SOFTBAN]: { verb: 'softbanned', emoji: EMOJI.RED_SHIELD, color: COLORS.BAN },
    [ModAction.TEMPBAN]: { verb: 'temporarily banned', emoji: EMOJI.RED_SHIELD, color: COLORS.BAN },
    [ModAction.TIMEOUT]: { verb: 'timed out', emoji: EMOJI.TIME_OUT, color: COLORS.TIMEOUT },
    [ModAction.MUTE_TEXT]: { verb: 'muted (text)', emoji: EMOJI.TEXT_LIMITER, color: COLORS.MUTE },
    [ModAction.MUTE_VOICE]: {
      verb: 'muted (voice)',
      emoji: EMOJI.VOICE_SERVER_MUTED,
      color: COLORS.MUTE,
    },
    [ModAction.MUTE_BOTH]: { verb: 'muted', emoji: EMOJI.VOICE_SERVER_MUTED, color: COLORS.MUTE },
    [ModAction.UNMUTE_TEXT]: {
      verb: 'unmuted (text)',
      emoji: EMOJI.TEXT_CHANNEL_WITH_CHECK,
      color: COLORS.UNMUTE,
    },
    [ModAction.UNMUTE_VOICE]: {
      verb: 'unmuted (voice)',
      emoji: EMOJI.MIC_WITH_CHECK,
      color: COLORS.UNMUTE,
    },
    [ModAction.UNMUTE_BOTH]: { verb: 'unmuted', emoji: EMOJI.SUCCESS, color: COLORS.UNMUTE },
    [ModAction.UNBAN]: { verb: 'unbanned', emoji: EMOJI.SUCCESS, color: COLORS.SUCCESS },
  };

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
) {
  const targetUser = target instanceof GuildMember ? target.user : target;

  return modV1.buildModActionEmbed(
    action,
    { tag: targetUser.tag, id: target.id },
    { tag: moderator.tag, id: moderator.id },
    reason || 'No reason provided',
    {
      caseNumber,
      duration,
    }
  );
}

/**
 * Create a DM notification message for the target user using DCB.
 */
export function createUserNotificationEmbed(
  action: ModAction,
  guild: Guild,
  reason: string,
  duration?: DurationSeconds
): FluentContainer {
  const notification =
    MOD_ACTION_NOTIFICATIONS[action] ??
    ({ verb: action.toLowerCase(), emoji: EMOJI.MODERATION, color: COLORS.INFO } as const);

  const resolvedReason = reason || 'No reason provided';
  const details = [
    `**Server:** ${guild.name}`,
    `**Reason:** ${resolvedReason}`,
    duration ? `**Duration:** ${formatDuration(duration)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const c = container({ color: notification.color }).h2(
    `${notification.emoji} You have been ${notification.verb}`
  );

  const iconUrl = guild.iconURL();
  if (iconUrl) {
    c.sectionWithThumbnail(details, iconUrl);
  } else {
    c.text(details);
  }

  return c.footerWithTimestamp();
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
    const message = createUserNotificationEmbed(action, guild, reason, duration);

    await user.send({
      components: [message.build()],
      flags: NOTIFICATION_FLAGS,
    });
    return true;
  } catch {
    sapphireContainer.logger.warn(`Failed to DM user ${target.id}`);
    return false;
  }
}

/**
 * Log moderation action to mod log channel
 * Non-pinging, readable, consistent format
 */
export async function logToModChannel(guild: Guild, entry: ModLogEntry): Promise<void> {
  try {
    const modConfig = await sapphireContainer.prisma.modConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!modConfig?.modLogChannelId) {
      return;
    }

    const channel = await guild.channels.fetch(modConfig.modLogChannelId);
    if (channel?.isTextBased()) {
      const messageOptions = getModLogMessageOptions(entry);
      await channel.send(messageOptions);
    }
  } catch (error) {
    sapphireContainer.logger.error('Failed to log to mod channel:', error);
  }
}

/**
 * Log a moderation action to the mod channel
 * Convenience wrapper that constructs the ModLogEntry from common parameters
 */
export async function logModAction(
  guild: Guild,
  action: ModAction,
  target: User | GuildMember | { id: string; tag?: string },
  moderator: User | 'System',
  reason: string,
  caseNumber: CaseNumber,
  duration?: number,
  options?: { automatic?: boolean }
): Promise<void> {
  const targetUser = target instanceof GuildMember ? target.user : target;
  const isAutomatic = options?.automatic ?? moderator === 'System';
  const offenseGroup = OFFENSE_GROUPS[action];
  const shouldIncludeOffenseSummary = offenseGroup && action !== ModAction.BAN;
  let recentOffenseCount: number | undefined;
  let offenseLabel: string | undefined;

  if (shouldIncludeOffenseSummary) {
    const since = new Date(Date.now() - OFFENSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    recentOffenseCount = await sapphireContainer.prisma.modCase.count({
      where: {
        guildId: guild.id,
        targetId: targetUser.id,
        action: { in: offenseGroup.actions },
        createdAt: { gte: since },
      },
    });
    offenseLabel = offenseGroup.label;
  }

  const entry: ModLogEntry = {
    action,
    caseNumber,
    targetId: targetUser.id,
    targetTag: 'tag' in targetUser ? targetUser.tag : undefined,
    moderatorId: moderator === 'System' ? 'System' : moderator.id,
    moderatorTag: moderator === 'System' ? 'System' : moderator.tag,
    reason: reason || 'No reason provided',
    duration,
    timestamp: new Date(),
    automatic: isAutomatic,
    recentOffenseCount,
    offenseLabel,
  };
  await logToModChannel(guild, entry);
}

// Legacy V2 aliases (for backward compatibility during migration)

/** @deprecated Use logToModChannel instead */
export const logToModChannelV2 = logToModChannel;

/** @deprecated Use buildModLogEntry instead */
export const buildModLogEntryV2 = buildModLogEntry;

// Embed Presets

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
}): FluentContainer {
  const display = getActionDisplay(modCase.action);
  const reason = modCase.reason ?? 'No reason provided';
  return container({ color: display.color })
    .h1(`${display.emoji} Case #${modCase.caseNumber}`)
    .text(`${EMOJI.MODERATION} ${display.label ?? modCase.action}`)
    .text(`${EMOJI.MEMBER} ${modCase.targetTag}\n(\`${modCase.targetId}\`)`)
    .text(`${EMOJI.MOD_SHIELD} ${modCase.moderatorTag}\n(\`${modCase.moderatorId}\`)`)
    .text(`${EMOJI.REPORT_FLAG} ${reason}`)
    .text(`${EMOJI.TIME_DAY} ${formatRelativeTimestamp(modCase.createdAt)}`)
    .when(!!modCase.duration, (c) =>
      c.text(
        `${EMOJI.SLOWMODE} **Duration** ${formatDuration(ensureNonNull(modCase.duration, 'presets > createCaseEmbed(270): modCase.duration'))}`
      )
    )
    .when(!!modCase.expiresAt, (c) =>
      c.text(
        `${EMOJI.TIME_DAY_EXPIRED} **Expires** ${formatRelativeTimestamp(ensureNonNull(modCase.expiresAt, 'presets > createCaseEmbed(274): modCase.expiresAt'))}`
      )
    )
    .text(`${EMOJI.SERVER_FOLDER} **Guild** ${modCase.guildId}`)
    .footerWithTimestamp(`Case #${modCase.caseNumber}`, modCase.createdAt);
}

export interface HistoryCase {
  caseNumber: number;
  action: ModAction;
  createdAt: Date;
  reason: string | null;
}

export interface HistoryEmbedOptions {
  page?: number;
  pageSize?: number;
  paginationCustomIdBase?: string;
}

const HISTORY_PAGE_SIZE = 5;

/**
 * Create a paginated history embed
 */
export function createHistoryEmbed(
  target: User,
  cases: HistoryCase[],
  options: HistoryEmbedOptions = {}
): FluentContainer {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? HISTORY_PAGE_SIZE;
  const totalPages = Math.ceil(cases.length / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;
  const pageCases = cases.slice(startIdx, startIdx + pageSize);

  const stats = {
    Total: cases.length,
    Bans: cases.filter((c) => c.action === ModAction.BAN || c.action === ModAction.TEMPBAN).length,
    Kicks: cases.filter((c) => c.action === ModAction.KICK).length,
    Timeouts: cases.filter((c) => c.action === ModAction.TIMEOUT).length,
    Warns: cases.filter((c) => c.action === ModAction.WARN).length,
  };

  const caseList = pageCases
    .map((c) => {
      const display = getActionDisplay(c.action);
      const timestamp = formatRelativeTimestamp(c.createdAt);
      const reasonPreview = c.reason ? truncateText(c.reason, 50) : 'No reason provided';
      return `${display.emoji} **#${c.caseNumber} ${display.label}** · ${timestamp}\n> Why: \`${reasonPreview}\``;
    })
    .join('\n');

  const header = `${EMOJI.MEMBER} ${target.tag} (\`${target.id}\`)`;
  const c = container({ color: COLORS.WARN })
    .beginSection()
    .h2(`${EMOJI.MODERATION} Moderation history`)
    .text(header)
    .text(formatStatsLine(stats, 'columns'))
    .withThumbnail(target.displayAvatarURL())
    .separator({ divider: true, spacing: 'small' });

  if (pageCases.length > 0) {
    c.separator();
    c.text(`**Cases (page ${page} of ${totalPages})**\n${caseList}`);
  } else {
    c.text('No cases found.');
  }

  if (totalPages > 1 && options.paginationCustomIdBase) {
    c.actions(
      paginationRow(options.paginationCustomIdBase, page, totalPages, {
        showFirst: false,
        showLast: false,
      })
    );
  }

  c.footer(`Use /mod case <number> to view specific cases.`);

  return c;
}
