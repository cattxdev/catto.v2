import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type User,
  type GuildMember,
  SeparatorSpacingSize,
} from 'discord.js';
import { encodeModPanelCustomId, ModPanelAction } from './customId.js';
import type { NoteData } from '../services/NotesService.js';
import type { ExtendedCaseData } from '../services/CaseService.js';

// Custom emojis
const EMOJI = {
  MOD_SHIELD: '<:mod_shield:1462816389260775547>',
  MEMBER: '<:member:1462785171416813731>',
  VOICE: '<:channel_voice:1462784525766627338>',
  TIME_DAY: '<:time_day:1462786086358093834>',
  RED_CROSS: '<:red_cross:1462784451099754598>',
  DISCONNECT: '<:disconnect_user:1462785393895280660>',
  REPLAY: '<:replay:1462789298293313679>',
  EXIT: '<:exit:1462785168690384974>',
  SUSPECTED: '<:suspected_actvity:1462785167285551167>',
} as const;

/**
 * Context data for mod panel
 */
export interface ModPanelContext {
  target: User;
  targetMember: GuildMember | null;
  casesCount: number;
  notesCount: number;
  recentCases: ExtendedCaseData[];
  recentNotes: NoteData[];
  voiceChannelName: string | null;
  joinedAt: Date | null;
  accountCreatedAt: Date;
}

/**
 * Build the mod panel Components V2 message
 */
export function buildModPanelV2(context: ModPanelContext): ContainerBuilder {
  const { target, casesCount, notesCount, voiceChannelName, joinedAt } = context;
  const nonce = Math.random().toString(36).substring(2, 8);

  const container = new ContainerBuilder();

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${EMOJI.MOD_SHIELD} Mod Panel`)
  );

  // Target info
  const quickFacts: string[] = [];
  quickFacts.push(`${EMOJI.MEMBER} **Target:** ${target.tag} (\`${target.id}\`)`);
  quickFacts.push(`**Cases:** ${casesCount} · **Notes:** ${notesCount}`);

  if (voiceChannelName) {
    quickFacts.push(`${EMOJI.VOICE} **Voice:** ${voiceChannelName}`);
  }

  if (joinedAt) {
    quickFacts.push(
      `${EMOJI.TIME_DAY} **Joined:** <t:${Math.floor(joinedAt.getTime() / 1000)}:R> · **Account:** <t:${Math.floor(target.createdTimestamp / 1000)}:R>`
    );
  } else {
    quickFacts.push(
      `${EMOJI.TIME_DAY} **Account:** <t:${Math.floor(target.createdTimestamp / 1000)}:R>`
    );
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(quickFacts.join('\n')));

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Primary moderation actions row
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

  // Secondary actions row
  const secondaryActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.SOFTBAN, target.id, nonce))
      .setLabel('Softban')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.TEMPBAN, target.id, nonce))
      .setLabel('Tempban')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.ADD_NOTE, target.id, nonce))
      .setLabel('Add Note')
      .setStyle(ButtonStyle.Secondary)
  );

  // Info actions row
  const infoActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
  const { target, recentCases, recentNotes, voiceChannelName, joinedAt } = context;
  const nonce = Math.random().toString(36).substring(2, 8);

  const container = new ContainerBuilder();

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# Context bundle`),
    new TextDisplayBuilder().setContent(`${EMOJI.MEMBER} ${target.tag} (\`${target.id}\`)`)
  );

  // User info
  const userInfo: string[] = [];
  userInfo.push(`${EMOJI.TIME_DAY} Account: <t:${Math.floor(target.createdTimestamp / 1000)}:F>`);

  if (joinedAt) {
    userInfo.push(`${EMOJI.TIME_DAY} <t:${Math.floor(joinedAt.getTime() / 1000)}:F>`);
  }

  if (voiceChannelName) {
    userInfo.push(`${EMOJI.VOICE} ${voiceChannelName}`);
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(userInfo.join('\n')));

  // Recent cases
  if (recentCases.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const casesText = recentCases
      .slice(0, 5)
      .map((c) => {
        const timestamp = `<t:${Math.floor(c.createdAt.getTime() / 1000)}:R>`;
        return `• **#${c.caseNumber}** ${c.action} - ${timestamp}`;
      })
      .join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## Recent cases (${recentCases.length} total)`),
      new TextDisplayBuilder().setContent(casesText || 'No cases')
    );
  }

  // Recent notes
  if (recentNotes.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const notesText = recentNotes
      .slice(0, 3)
      .map((n) => {
        const timestamp = `<t:${Math.floor(n.createdAt.getTime() / 1000)}:R>`;
        const truncatedNote = n.note.length > 100 ? n.note.substring(0, 100) + '...' : n.note;
        return `• ${timestamp}: ${truncatedNote}`;
      })
      .join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## Recent notes (${recentNotes.length} total)`),
      new TextDisplayBuilder().setContent(notesText || 'No notes')
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Quick actions
  const quickActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.ADD_NOTE, target.id, nonce))
      .setLabel('Add note')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(encodeModPanelCustomId(ModPanelAction.VIEW_HISTORY, target.id, nonce))
      .setLabel('Full history')
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

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 📝 Notes for ${target.tag}`),
    new TextDisplayBuilder().setContent(`Page ${page} of ${totalPages} (${notes.length} total)`)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (pageNotes.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*No notes found for this user.*')
    );
  } else {
    for (const note of pageNotes) {
      const timestamp = `<t:${Math.floor(note.createdAt.getTime() / 1000)}:F>`;
      const tags =
        note.tags.length > 0 ? ` · Tags: ${note.tags.map((t) => `\`${t}\``).join(', ')}` : '';

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**ID:** \`${note.id}\` · <@${note.createdById}> · ${timestamp}${tags}\n${note.note}`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );
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
    `# ${EMOJI.MOD_SHIELD} ${action} Successful`,
    `${EMOJI.MEMBER} **Target:** ${target.tag} (\`${target.id}\`)`,
    `📋 **Case:** #${caseNumber}`,
    `**Reason:** ${reason}`,
  ];

  if (duration) {
    lines.push(`${EMOJI.TIME_DAY} **Duration:** ${duration}`);
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  return container;
}

/**
 * Build error message
 */
export function buildModActionErrorV2(error: string): ContainerBuilder {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${EMOJI.RED_CROSS} Error\n${error}`)
  );

  return container;
}
