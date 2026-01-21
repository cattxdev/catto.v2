import { type ContainerBuilder, type User, type GuildMember } from 'discord.js';
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
} from '#lib/discord/index.js';
import type { NoteData } from '../services/NotesService.js';
import type { ExtendedCaseData } from '../services/CaseService.js';

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
export function buildModPanelV2(context: ModPanelContext): ContainerBuilder {
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

  // Create container with primary color
  const container = v2.primaryContainer();

  // Header with optional flag indicator
  const flagIndicator = activeFlags && activeFlags.length > 0 ? ` ${EMOJI.SUSPECTED}` : '';
  container.addTextDisplayComponents(v2.h1(`Mod Panel${flagIndicator}`, EMOJI.MOD_SHIELD));

  // Target info - compact single line
  container.addTextDisplayComponents(
    v2.text(formatInfoRow('Target', `${target.tag} (\`${target.id}\`)`, EMOJI.MEMBER))
  );

  // Stats line - grid format
  const stats: Record<string, string | number> = {
    Cases: casesCount,
    Notes: notesCount,
  };
  if (warningsCount !== undefined) {
    stats['Warnings'] = warningsCount;
  }
  container.addTextDisplayComponents(v2.text(formatStatsLine(stats)));

  // Voice status - only if in voice
  if (voiceChannelName) {
    container.addTextDisplayComponents(
      v2.text(formatInfoRow('Voice', voiceChannelName, EMOJI.VOICE))
    );
  }

  // Account info - single line with joined and account age
  const accountCreatedTs = formatRelativeTimestamp(target.createdAt);
  if (joinedAt) {
    const joinedTs = formatRelativeTimestamp(joinedAt);
    container.addTextDisplayComponents(
      v2.text(`${EMOJI.TIME_DAY} **Joined:** ${joinedTs} · **Account:** ${accountCreatedTs}`)
    );
  } else {
    container.addTextDisplayComponents(
      v2.text(`${EMOJI.TIME_DAY} **Account:** ${accountCreatedTs}`)
    );
  }

  container.addSeparatorComponents(v2.smallSeparator());

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

  const secondaryActions = row(...secondaryButtons);

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

  container.addActionRowComponents(primaryActions, secondaryActions, infoActions);

  return container;
}

/**
 * Build a context bundle card using Components V2
 */
export function buildContextBundleV2(context: ModPanelContext): ContainerBuilder {
  const { target, recentCases, recentNotes, voiceChannelName, joinedAt, hasActiveMutes } = context;
  const nonce = Math.random().toString(36).substring(2, 8);

  const container = v2.infoContainer();

  // Header
  v2.addHeader(container, 'Context Bundle');
  container.addTextDisplayComponents(
    v2.text(formatInfoRow('User', `${target.tag} (\`${target.id}\`)`, EMOJI.MEMBER))
  );

  container.addSeparatorComponents(v2.smallSeparator());

  // Timeline section
  v2.addSection(container, 'Timeline', '');
  const timeline: string[] = [];
  timeline.push(
    `${EMOJI.TIME_DAY} **Account created:** ${formatRelativeTimestamp(target.createdAt)}`
  );

  if (joinedAt) {
    timeline.push(`${EMOJI.TIME_DAY} **Joined server:** ${formatRelativeTimestamp(joinedAt)}`);
  }

  if (voiceChannelName) {
    timeline.push(`${EMOJI.VOICE} **Currently in voice:** ${voiceChannelName}`);
  }

  container.addTextDisplayComponents(v2.text(timeline.join('\n')));

  // Active statuses (if any)
  if (hasActiveMutes) {
    container.addSeparatorComponents(v2.smallSeparator());
    container.addTextDisplayComponents(
      v2.h2('Active Statuses'),
      v2.text(`${EMOJI.SUSPECTED} **Muted** (check /mod mutes for details)`)
    );
  }

  // Recent cases
  if (recentCases.length > 0) {
    container.addSeparatorComponents(v2.smallSeparator());
    const casesText = recentCases
      .slice(0, 5)
      .map((c) => {
        const timestamp = formatRelativeTimestamp(c.createdAt);
        const reasonPreview = c.reason ? truncateText(c.reason, 50) : 'No reason';
        return `**#${c.caseNumber}** ${c.action} · ${timestamp}\n  ${reasonPreview}`;
      })
      .join('\n');

    container.addTextDisplayComponents(v2.h2('Recent Cases'), v2.text(casesText));
  }

  // Recent notes
  if (recentNotes.length > 0) {
    container.addSeparatorComponents(v2.smallSeparator());

    const notesText = recentNotes
      .slice(0, 3)
      .map((n) => {
        const timestamp = formatRelativeTimestamp(n.createdAt);
        const truncatedNote = truncateText(n.note, 100);
        return `${timestamp}: ${truncatedNote}`;
      })
      .join('\n');

    container.addTextDisplayComponents(v2.h2('Recent Notes'), v2.text(notesText));
  }

  container.addSeparatorComponents(v2.smallSeparator());

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

  container.addActionRowComponents(quickActions);

  return container;
}

/**
 * Build a notes list using Components V2
 */
export function buildNotesListV2(
  target: User,
  notes: NoteData[],
  page: number = 1,
  pageSize: number = 5
): ContainerBuilder {
  const container = v2.container();
  const totalPages = Math.ceil(notes.length / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;
  const pageNotes = notes.slice(startIdx, startIdx + pageSize);

  // Header with pagination
  container.addTextDisplayComponents(
    v2.h1(`Notes for ${target.tag}`),
    v2.text(`Page ${page} of ${totalPages} (${notes.length} total)`)
  );

  container.addSeparatorComponents(v2.smallSeparator());

  if (pageNotes.length === 0) {
    container.addTextDisplayComponents(v2.text('*No notes found for this user.*'));
  } else {
    for (const note of pageNotes) {
      const timestamp = formatRelativeTimestamp(note.createdAt);
      const tags =
        note.tags.length > 0 ? `\nTags: ${note.tags.map((t) => `\`${t}\``).join(', ')}` : '';

      container.addTextDisplayComponents(
        v2.text(
          `**ID:** \`${note.id}\`\n<@${note.createdById}> · ${timestamp}${tags}\n${note.note}`
        )
      );

      container.addSeparatorComponents(v2.smallSeparator());
    }
  }

  return container;
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
): ContainerBuilder {
  const c = v2.buildSuccess(`${action} Successful`, {
    details: {
      [`${EMOJI.MEMBER} Target`]: `${target.tag} (\`${target.id}\`)`,
      Case: `#${caseNumber}`,
      Reason: reason,
      ...(duration ? { [`${EMOJI.TIME_DAY} Duration`]: duration } : {}),
    },
  });

  if (options?.dmSent === false) {
    c.addSeparatorComponents(v2.smallSeparator());
    c.addTextDisplayComponents(v2.text(`${EMOJI.WARNING} Could not send DM notification to user.`));
  }

  return c;
}

/**
 * Build error message with optional suggestion
 */
export function buildModActionErrorV2(error: string, suggestion?: string): ContainerBuilder {
  return v2.buildError(error, {
    title: 'Error',
    suggestion,
  });
}
