import { type User, type GuildMember } from 'discord.js';
import { encodeModPanelCustomId, ModPanelAction } from './customId.js';
import {
  v2,
  EMOJI,
  formatInfoRow,
  formatStatsLine,
  formatRelativeTimestamp,
  truncateText,
  row,
  primaryButton,
  secondaryButton,
  dangerButton,
  successButton,
  type FluentContainer,
} from '#lib/discord/index.js';
import type { NoteData } from '../services/NotesService.js';
import type { ExtendedCaseData } from '../services/CaseService.js';
import { ensureNonNull } from '#root/lib/utils.js';

/**
 * Context data for mod panel
 */
export interface ModPanelContext {
  target: User;
  targetMember: GuildMember | null;
  casesCount: number;
  notesCount: number;
  warningsCount?: number;
  recentCases: ExtendedCaseData[];
  recentNotes: NoteData[];
  voiceChannelName: string | null;
  joinedAt: Date | null;
  accountCreatedAt: Date;
  hasActiveMutes?: boolean;
  activeFlags?: string[];
}

/**
 * Build the mod panel Components V2 message
 */
export function buildModPanelV2(context: ModPanelContext): FluentContainer {
  const {
    target,
    casesCount,
    notesCount,
    warningsCount,
    voiceChannelName,
    joinedAt,
    hasActiveMutes,
    activeFlags,
  } = context;
  const nonce = Math.random().toString(36).substring(2, 8);

  // Header with optional flag indicator
  const flagIndicator = activeFlags && activeFlags.length > 0 ? ` ${EMOJI.SUSPECTED}` : '';

  // Stats for display
  const stats: Record<string, string | number> = {
    Cases: casesCount,
    Notes: notesCount,
  };
  if (warningsCount !== undefined) {
    stats['Warnings'] = warningsCount;
  }

  // Account info line
  const accountCreatedTs = formatRelativeTimestamp(target.createdAt);
  const accountLine = joinedAt
    ? `${EMOJI.TIME_DAY} **Joined:** ${formatRelativeTimestamp(joinedAt)} · **Account:** ${accountCreatedTs}`
    : `${EMOJI.TIME_DAY} **Account:** ${accountCreatedTs}`;

  // Primary moderation actions row (4 buttons)
  const primaryActions = row(
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.WARN, target.id, nonce),
      label: 'Warn',
    }),
    primaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.TIMEOUT, target.id, nonce),
      label: 'Timeout',
    }),
    dangerButton({
      customId: encodeModPanelCustomId(ModPanelAction.KICK, target.id, nonce),
      label: 'Kick',
    }),
    dangerButton({
      customId: encodeModPanelCustomId(ModPanelAction.BAN, target.id, nonce),
      label: 'Ban',
    })
  );

  // Secondary actions row (4-5 buttons)
  const secondaryButtons = [
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.MUTE_TEXT, target.id, nonce),
      label: 'Mute Text',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.MUTE_VOICE, target.id, nonce),
      label: 'Mute Voice',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.SOFTBAN, target.id, nonce),
      label: 'Softban',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.TEMPBAN, target.id, nonce),
      label: 'Tempban',
    }),
  ];

  if (hasActiveMutes) {
    secondaryButtons.push(
      successButton({
        customId: encodeModPanelCustomId(ModPanelAction.UNMUTE, target.id, nonce),
        label: 'Unmute',
      })
    );
  }

  const secondaryActionsRow = row(...secondaryButtons);

  // Info actions row (5 buttons)
  const infoActions = row(
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.ADD_NOTE, target.id, nonce),
      label: 'Add Note',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.VIEW_NOTES, target.id, nonce),
      label: 'Notes',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.VIEW_CONTEXT, target.id, nonce),
      label: 'Context',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.VIEW_HISTORY, target.id, nonce),
      label: 'History',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.REFRESH, target.id, nonce),
      label: 'Refresh',
    })
  );

  return v2
    .primaryContainer()
    .h1(`${EMOJI.MOD_SHIELD} Mod Panel${flagIndicator}`)
    .text(formatInfoRow('Target', `${target.tag} (\`${target.id}\`)`, EMOJI.MEMBER))
    .text(formatStatsLine(stats))
    .when(!!voiceChannelName, (c) =>
      c.text(
        formatInfoRow('Voice', ensureNonNull(voiceChannelName, 'voiceChannelName'), EMOJI.VOICE)
      )
    )
    .text(accountLine)
    .separator()
    .actions(primaryActions, secondaryActionsRow, infoActions);
}

/**
 * Build a context bundle card using Components V2
 */
export function buildContextBundleV2(context: ModPanelContext): FluentContainer {
  const { target, recentCases, recentNotes, voiceChannelName, joinedAt, hasActiveMutes } = context;
  const nonce = Math.random().toString(36).substring(2, 8);

  // Build timeline entries
  const timeline: string[] = [
    `${EMOJI.TIME_DAY} **Account created:** ${formatRelativeTimestamp(target.createdAt)}`,
  ];
  if (joinedAt) {
    timeline.push(`${EMOJI.TIME_DAY} **Joined server:** ${formatRelativeTimestamp(joinedAt)}`);
  }
  if (voiceChannelName) {
    timeline.push(`${EMOJI.VOICE} **Currently in voice:** ${voiceChannelName}`);
  }

  // Format recent cases
  const casesText =
    recentCases.length > 0
      ? recentCases
          .slice(0, 5)
          .map((c) => {
            const timestamp = formatRelativeTimestamp(c.createdAt);
            const reasonPreview = c.reason ? truncateText(c.reason, 50) : 'No reason';
            return `**#${c.caseNumber}** ${c.action} · ${timestamp}\n  ${reasonPreview}`;
          })
          .join('\n')
      : null;

  // Format recent notes
  const notesText =
    recentNotes.length > 0
      ? recentNotes
          .slice(0, 3)
          .map((n) => {
            const timestamp = formatRelativeTimestamp(n.createdAt);
            const truncatedNote = truncateText(n.note, 100);
            return `${timestamp}: ${truncatedNote}`;
          })
          .join('\n')
      : null;

  // Quick actions
  const quickActions = row(
    primaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.ADD_NOTE, target.id, nonce),
      label: 'Add Note',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.VIEW_HISTORY, target.id, nonce),
      label: 'Full History',
    }),
    secondaryButton({
      customId: encodeModPanelCustomId(ModPanelAction.VIEW_NOTES, target.id, nonce),
      label: 'All Notes',
    })
  );

  return v2
    .infoContainer()
    .h1('Context Bundle')
    .text(formatInfoRow('User', `${target.tag} (\`${target.id}\`)`, EMOJI.MEMBER))
    .separator()
    .h2('Timeline')
    .text(timeline.join('\n'))
    .when(!!hasActiveMutes, (c) =>
      c
        .separator()
        .h2('Active Statuses')
        .text(`${EMOJI.SUSPECTED} **Muted** (check /mod mutes for details)`)
    )
    .when(!!casesText, (c) =>
      c.separator().h2('Recent Cases').text(ensureNonNull(notesText, 'casesText'))
    )
    .when(!!notesText, (c) =>
      c.separator().h2('Recent Notes').text(ensureNonNull(notesText, 'notesText'))
    )
    .separator()
    .actions(quickActions);
}

/**
 * Build a notes list using Components V2
 */
export function buildNotesListV2(
  target: User,
  notes: NoteData[],
  page: number = 1,
  pageSize: number = 5
): FluentContainer {
  const totalPages = Math.ceil(notes.length / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;
  const pageNotes = notes.slice(startIdx, startIdx + pageSize);

  const c = v2
    .container()
    .h1(`Notes for ${target.tag}`)
    .text(`Page ${page} of ${totalPages} (${notes.length} total)`)
    .separator();

  if (pageNotes.length === 0) {
    return c.text('*No notes found for this user.*');
  }

  for (const note of pageNotes) {
    const timestamp = formatRelativeTimestamp(note.createdAt);
    const tags =
      note.tags.length > 0 ? `\nTags: ${note.tags.map((t) => `\`${t}\``).join(', ')}` : '';
    c.text(`**ID:** \`${note.id}\`\n<@${note.createdById}> · ${timestamp}${tags}\n${note.note}`);
    c.separator();
  }

  return c;
}

/**
 * Build success message for mod action
 */
export function buildModActionSuccessV2(
  action: string,
  target: User,
  caseNumber: number,
  reason: string,
  duration?: string,
  options?: { dmSent?: boolean }
): FluentContainer {
  const details: Record<string, string> = {
    [`${EMOJI.MEMBER} Target`]: `${target.tag} (\`${target.id}\`)`,
    [`${EMOJI.SERVER_FOLDER} Case`]: `#${caseNumber}`,
    [`${EMOJI.MODERATION} Reason`]: reason,
  };
  if (duration) {
    details[`${EMOJI.SLOWMODE} Duration`] = duration;
  }

  return v2
    .successContainer()
    .h1(`${EMOJI.SUCCESS} ${action} successful`)
    .kv(details)
    .when(options?.dmSent === false, (c) =>
      c.separator().text(`${EMOJI.WARNING} Could not send DM notification to user.`)
    );
}

/**
 * Build error message with optional suggestion
 */
export function buildModActionErrorV2(error: string, suggestion?: string): FluentContainer {
  return v2
    .errorContainer()
    .h1(`${EMOJI.ERROR} Error`)
    .text(error)
    .when(!!suggestion, (c) => c.separator().text(`${EMOJI.INFO} **Suggestion:** ${suggestion}`));
}
