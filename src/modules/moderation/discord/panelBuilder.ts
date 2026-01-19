import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type User,
  type GuildMember,
} from 'discord.js';
import { encodeModPanelCustomId, ModPanelAction } from './customId.js';
import {
  EMOJI,
  createSmallSeparator,
  formatInfoRow,
  formatStatsLine,
  formatRelativeTimestamp,
  truncateText,
} from './components.js';
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

  const container = new ContainerBuilder();

  // Header with optional flag indicator
  const flagIndicator = activeFlags && activeFlags.length > 0 ? ` ${EMOJI.SUSPECTED}` : '';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${EMOJI.MOD_SHIELD} Mod Panel${flagIndicator}`)
  );

  // Target info - compact single line
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      formatInfoRow('Target', `${target.tag} (\`${target.id}\`)`, EMOJI.MEMBER)
    )
  );

  // Stats line - grid format
  const stats: Record<string, string | number> = {
    Cases: casesCount,
    Notes: notesCount,
  };
  if (warningsCount !== undefined) {
    stats['Warnings'] = warningsCount;
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatStatsLine(stats)));

  // Voice status - only if in voice
  if (voiceChannelName) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(formatInfoRow('Voice', voiceChannelName, EMOJI.VOICE))
    );
  }

  // Account info - single line with joined and account age
  const accountCreatedTs = formatRelativeTimestamp(target.createdAt);
  if (joinedAt) {
    const joinedTs = formatRelativeTimestamp(joinedAt);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${EMOJI.TIME_DAY} **Joined:** ${joinedTs} \u00b7 **Account:** ${accountCreatedTs}`
      )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${EMOJI.TIME_DAY} **Account:** ${accountCreatedTs}`)
    );
  }

  container.addSeparatorComponents(createSmallSeparator());

  // Primary moderation actions row (4 buttons)
  const primaryActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.WARN, target.id, nonce))
      .setLabel('Warn')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.TIMEOUT, target.id, nonce))
      .setLabel('Timeout')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.KICK, target.id, nonce))
      .setLabel('Kick')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.BAN, target.id, nonce))
      .setLabel('Ban')
      .setStyle(ButtonStyle.Danger)
  );

  // Secondary actions row (5 buttons max - includes conditional unmute)
  const secondaryButtons: ButtonBuilder[] = [
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.MUTE_TEXT, target.id, nonce))
      .setLabel('Mute Text')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.MUTE_VOICE, target.id, nonce))
      .setLabel('Mute Voice')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.SOFTBAN, target.id, nonce))
      .setLabel('Softban')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.TEMPBAN, target.id, nonce))
      .setLabel('Tempban')
      .setStyle(ButtonStyle.Secondary),
  ];

  if (hasActiveMutes) {
    secondaryButtons.push(
      new ButtonBuilder()
        .setCustomId(encodeModPanelCustomId(ModPanelAction.UNMUTE, target.id, nonce))
        .setLabel('Unmute')
        .setStyle(ButtonStyle.Success)
    );
  }

  const secondaryActions = new ActionRowBuilder<ButtonBuilder>().addComponents(...secondaryButtons);

  // Info actions row (5 buttons)
  const infoActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.ADD_NOTE, target.id, nonce))
      .setLabel('Add Note')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.VIEW_NOTES, target.id, nonce))
      .setLabel('Notes')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.VIEW_CONTEXT, target.id, nonce))
      .setLabel('Context')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.VIEW_HISTORY, target.id, nonce))
      .setLabel('History')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.REFRESH, target.id, nonce))
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary)
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

  const container = new ContainerBuilder();

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# Context Bundle`),
    new TextDisplayBuilder().setContent(
      formatInfoRow('User', `${target.tag} (\`${target.id}\`)`, EMOJI.MEMBER)
    )
  );

  container.addSeparatorComponents(createSmallSeparator());

  // Timeline section
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Timeline`));

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

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeline.join('\n')));

  // Active statuses (if any)
  if (hasActiveMutes) {
    container.addSeparatorComponents(createSmallSeparator());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## Active Statuses`),
      new TextDisplayBuilder().setContent(
        `${EMOJI.SUSPECTED} **Muted** (check /mod mutes for details)`
      )
    );
  }

  // Recent cases
  if (recentCases.length > 0) {
    container.addSeparatorComponents(createSmallSeparator());
    const casesText = recentCases
      .slice(0, 5)
      .map((c) => {
        const timestamp = formatRelativeTimestamp(c.createdAt);
        const reasonPreview = c.reason ? truncateText(c.reason, 50) : 'No reason';
        return `**#${c.caseNumber}** ${c.action} \u00b7 ${timestamp}\n  ${reasonPreview}`;
      })
      .join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## Recent Cases`),
      new TextDisplayBuilder().setContent(casesText)
    );
  }

  // Recent notes
  if (recentNotes.length > 0) {
    container.addSeparatorComponents(createSmallSeparator());

    const notesText = recentNotes
      .slice(0, 3)
      .map((n) => {
        const timestamp = formatRelativeTimestamp(n.createdAt);
        const truncatedNote = truncateText(n.note, 100);
        return `${timestamp}: ${truncatedNote}`;
      })
      .join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## Recent Notes`),
      new TextDisplayBuilder().setContent(notesText)
    );
  }

  container.addSeparatorComponents(createSmallSeparator());

  // Quick actions
  const quickActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.ADD_NOTE, target.id, nonce))
      .setLabel('Add Note')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.VIEW_HISTORY, target.id, nonce))
      .setLabel('Full History')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.VIEW_NOTES, target.id, nonce))
      .setLabel('All Notes')
      .setStyle(ButtonStyle.Secondary)
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
  const container = new ContainerBuilder();
  const totalPages = Math.ceil(notes.length / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;
  const pageNotes = notes.slice(startIdx, startIdx + pageSize);

  // Header with pagination
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# Notes for ${target.tag}`),
    new TextDisplayBuilder().setContent(`Page ${page} of ${totalPages} (${notes.length} total)`)
  );

  container.addSeparatorComponents(createSmallSeparator());

  if (pageNotes.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*No notes found for this user.*')
    );
  } else {
    for (const note of pageNotes) {
      const timestamp = formatRelativeTimestamp(note.createdAt);
      const tags =
        note.tags.length > 0 ? `\nTags: ${note.tags.map((t) => `\`${t}\``).join(', ')}` : '';

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**ID:** \`${note.id}\`\n<@${note.createdById}> \u00b7 ${timestamp}${tags}\n${note.note}`
        )
      );

      container.addSeparatorComponents(createSmallSeparator());
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
  duration?: string
): ContainerBuilder {
  const container = new ContainerBuilder();

  const lines = [
    `# ${EMOJI.SUCCESS} ${action} Successful`,
    formatInfoRow('Target', `${target.tag} (\`${target.id}\`)`, EMOJI.MEMBER),
    formatInfoRow('Case', `#${caseNumber}`),
    formatInfoRow('Reason', reason),
  ];

  if (duration) {
    lines.push(formatInfoRow('Duration', duration, EMOJI.TIME_DAY));
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  return container;
}

/**
 * Build error message with optional suggestion
 */
export function buildModActionErrorV2(error: string, suggestion?: string): ContainerBuilder {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${EMOJI.RED_CROSS} Error\n${error}`)
  );

  if (suggestion) {
    container.addSeparatorComponents(createSmallSeparator());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${EMOJI.INFO} **Suggestion:** ${suggestion}`)
    );
  }

  return container;
}
