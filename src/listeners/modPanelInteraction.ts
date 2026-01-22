import { Listener, container as sapphireContainer } from '@sapphire/framework';
import {
  Events,
  type Interaction,
  type ButtonInteraction,
  PermissionFlagsBits,
  type GuildMember,
} from 'discord.js';
import {
  container,
  defer,
  editReply,
  errorMessage,
  ephemeralError,
  formModal,
  paragraphModal,
} from '#lib/discord/index.js';
import {
  isModPanelCustomId,
  decodeModPanelCustomId,
  ModPanelAction,
  encodeReasonModalCustomId,
  encodeDurationModalCustomId,
  encodeNoteModalCustomId,
  encodeMuteModalCustomId,
} from '#root/modules/moderation/discord/customId.js';
import {
  buildModPanel,
  buildContextBundle,
  buildNotesList,
  type ModPanelContext,
} from '#root/modules/moderation/discord/panelBuilder.js';
import { moderationService } from '#root/modules/moderation/services/ModerationService.js';
import { notesService } from '#root/modules/moderation/services/NotesService.js';
import { caseService } from '#root/modules/moderation/services/CaseService.js';
import { muteService } from '#root/modules/moderation/services/MuteService.js';
import { asGuildId, asUserId, CaseStatus } from '#root/modules/moderation/domain/types.js';
import { memoryLimiter } from '#lib/rateLimit/index.js';
import { ensureNonNull } from '#root/lib/utils';

const RATE_LIMIT_MS = 2000; // 2 second cooldown per user per action

export class ModPanelInteractionListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public async run(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guildId) return;
    if (!isModPanelCustomId(interaction.customId)) return;

    const parsed = decodeModPanelCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply(ephemeralError('Invalid interaction.'));
      return;
    }

    // Rate limit check
    const rateLimitKey = `modpanel:${interaction.user.id}:${parsed.action}`;
    const rateLimitResult = memoryLimiter.throttle(rateLimitKey, { minIntervalMs: RATE_LIMIT_MS });
    if (!rateLimitResult.allowed) {
      await interaction.reply(
        ephemeralError(
          `Please wait ${Math.ceil((rateLimitResult.retryAfterMs ?? RATE_LIMIT_MS) / 1000)}s before using this again.`
        )
      );
      return;
    }

    // Permission check
    const member = interaction.member as GuildMember;
    if (!member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply(ephemeralError('You do not have permission to use this.'));
      return;
    }

    const targetId = parsed.targetId;

    try {
      switch (parsed.action) {
        case ModPanelAction.WARN:
        case ModPanelAction.KICK:
        case ModPanelAction.BAN:
        case ModPanelAction.SOFTBAN:
          await this.showReasonModal(interaction, parsed.action, targetId);
          break;

        case ModPanelAction.TIMEOUT:
        case ModPanelAction.TEMPBAN:
          await this.showDurationModal(interaction, parsed.action, targetId);
          break;

        case ModPanelAction.MUTE_TEXT:
          await this.showMuteModal(interaction, 'text', targetId);
          break;

        case ModPanelAction.MUTE_VOICE:
          await this.showMuteModal(interaction, 'voice', targetId);
          break;

        case ModPanelAction.UNMUTE:
          await this.handleUnmute(interaction, targetId);
          break;

        case ModPanelAction.ADD_NOTE:
          await this.showNoteModal(interaction, targetId);
          break;

        case ModPanelAction.VIEW_NOTES:
          await this.showNotes(interaction, targetId);
          break;

        case ModPanelAction.VIEW_CONTEXT:
          await this.showContext(interaction, targetId);
          break;

        case ModPanelAction.VIEW_HISTORY:
          await this.showHistory(interaction, targetId);
          break;

        case ModPanelAction.REFRESH:
          await this.refreshPanel(interaction, targetId);
          break;

        default:
          await interaction.reply(ephemeralError('Unknown action.'));
      }
    } catch (error) {
      sapphireContainer.logger.error('[ModPanelInteraction] Error handling interaction:', error);
      await interaction
        .reply(ephemeralError('An error occurred while processing your request.'))
        .catch(() => {});
    }
  }

  private async showMuteModal(
    interaction: ButtonInteraction,
    muteType: 'text' | 'voice',
    targetId: string
  ): Promise<void> {
    const modal = formModal(
      encodeMuteModalCustomId(muteType, targetId),
      `Mute User (${muteType === 'text' ? 'Text' : 'Voice'})`,
      [
        {
          id: 'duration',
          label: 'Duration (leave empty for permanent)',
          type: 'short',
          placeholder: '1h, 1d, 7d',
          required: false,
          maxLength: 10,
        },
        {
          id: 'reason',
          label: 'Reason',
          type: 'paragraph',
          placeholder: 'Enter the reason for this mute...',
          required: true,
          maxLength: 512,
        },
      ]
    );

    await interaction.showModal(modal);
  }

  private async handleUnmute(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await defer(interaction);

    const guild = ensureNonNull(
      interaction.guild,
      'modPanelInteraction > handleUnmute(189): interaction.guild'
    );
    const guildId = asGuildId(guild.id);
    const userId = asUserId(targetId);

    try {
      const targetMember = await guild.members.fetch(targetId).catch(() => null);
      if (!targetMember) {
        await editReply(interaction, errorMessage('Error', 'User not found in this server.'));
        return;
      }

      const result = await muteService.unmuteBoth(guild, targetMember, {
        guildId,
        userId,
        moderatorId: asUserId(interaction.user.id),
        moderatorTag: interaction.user.tag,
        reason: 'Unmuted via mod panel',
      });

      if (!result.success) {
        await editReply(
          interaction,
          errorMessage('Error', result.error ?? 'Failed to unmute user.')
        );
        return;
      }

      await editReply(
        interaction,
        container()
          .h1('User Unmuted')
          .text(`**${targetMember.user.tag}** has been unmuted.`)
          .footer(`Case #${result.caseNumber}`)
      );
    } catch (error) {
      sapphireContainer.logger.error('[ModPanelInteraction] Error handling unmute:', error);
      await editReply(
        interaction,
        errorMessage('Error', 'An error occurred while processing the unmute.')
      );
    }
  }

  private async showReasonModal(
    interaction: ButtonInteraction,
    action: string,
    targetId: string
  ): Promise<void> {
    const modal = paragraphModal(
      encodeReasonModalCustomId(action as 'warn' | 'kick' | 'ban' | 'softban', targetId),
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      {
        customId: 'reason',
        label: 'Reason',
        placeholder: 'Enter the reason for this action...',
        required: true,
        maxLength: 512,
      }
    );

    await interaction.showModal(modal);
  }

  private async showDurationModal(
    interaction: ButtonInteraction,
    action: string,
    targetId: string
  ): Promise<void> {
    const modal = formModal(
      encodeDurationModalCustomId(action as 'timeout' | 'tempban', targetId),
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      [
        {
          id: 'duration',
          label: 'Duration (e.g., 10m, 1h, 1d)',
          type: 'short',
          placeholder: '1h',
          required: true,
          maxLength: 10,
        },
        {
          id: 'reason',
          label: 'Reason',
          type: 'paragraph',
          placeholder: 'Enter the reason for this action...',
          required: true,
          maxLength: 512,
        },
      ]
    );

    await interaction.showModal(modal);
  }

  private async showNoteModal(interaction: ButtonInteraction, targetId: string): Promise<void> {
    const modal = formModal(encodeNoteModalCustomId('add', targetId), 'Add Moderator Note', [
      {
        id: 'note',
        label: 'Note',
        type: 'paragraph',
        placeholder: 'Enter your note about this user...',
        required: true,
        maxLength: 1000,
      },
      {
        id: 'tags',
        label: 'Tags (comma-separated, optional)',
        type: 'short',
        placeholder: 'toxic, raid, spam',
        required: false,
        maxLength: 100,
      },
    ]);

    await interaction.showModal(modal);
  }

  private async showNotes(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await defer(interaction);

    const guildId = asGuildId(
      ensureNonNull(
        interaction.guildId,
        'modPanelInteraction > showNotes(314): interaction.guildId'
      )
    );
    const userId = asUserId(targetId);

    const notes = await notesService.listNotes(guildId, userId);
    const target = await interaction.client.users.fetch(targetId).catch(() => null);

    if (!target) {
      await editReply(interaction, errorMessage('Error', 'User not found.'));
      return;
    }

    const containerComp = buildNotesList(target, notes);
    await editReply(interaction, containerComp);
  }

  private async showContext(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await defer(interaction);

    const guild = ensureNonNull(
      interaction.guild,
      'modPanelInteraction > showContext(336): interaction.guild'
    );
    const guildId = asGuildId(guild.id);
    const userId = asUserId(targetId);

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
      await editReply(interaction, errorMessage('Error', 'User not found.'));
      return;
    }

    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(targetId);
    } catch {
      // User may not be in the server
    }

    const [userCases, notes, activeMutes] = await Promise.all([
      moderationService.getUserCases(guildId, userId),
      notesService.listNotes(guildId, userId),
      muteService.getActiveMutes(guildId, userId),
    ]);

    const recentCases = await caseService.getCasesByStatus(guildId, CaseStatus.OPEN);
    const userRecentCases = recentCases.filter((c) => c.targetId === targetId).slice(0, 5);

    const context: ModPanelContext = {
      target,
      targetMember,
      casesCount: userCases.length,
      notesCount: notes.length,
      recentCases: userRecentCases,
      recentNotes: notes.slice(0, 5),
      voiceChannelId: targetMember?.voice.channel?.id ?? null,
      joinedAt: targetMember?.joinedAt ?? null,
      accountCreatedAt: target.createdAt,
      hasActiveMutes: activeMutes.length > 0,
    };

    const containerComp = buildContextBundle(context);
    await editReply(interaction, containerComp);
  }

  private async showHistory(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await defer(interaction);

    const guildId = asGuildId(
      ensureNonNull(
        interaction.guildId,
        'modPanelInteraction > showHistory(384): interaction.guildId'
      )
    );
    const userId = asUserId(targetId);

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
      await editReply(interaction, errorMessage('Error', 'User not found.'));
      return;
    }

    const cases = await moderationService.getUserCases(guildId, userId);

    const c = container().h1(`History for ${target.tag}`).text(`Total cases: **${cases.length}**`);

    if (cases.length === 0) {
      c.text('*No moderation history found.*');
    } else {
      const casesList = cases
        .slice(0, 10)
        .map(
          (modCase: {
            createdAt: { getTime: () => number };
            caseNumber: number;
            action: string;
            reason: string | null;
          }) => {
            const timestamp = `<t:${Math.floor(modCase.createdAt.getTime() / 1000)}:R>`;
            return `• **#${modCase.caseNumber}** ${modCase.action} - ${timestamp}\n  ${modCase.reason ?? 'No reason'}`;
          }
        )
        .join('\n\n');

      c.text(casesList);

      if (cases.length > 10) {
        c.text(`\n*... and ${cases.length - 10} more cases*`);
      }
    }

    await editReply(interaction, c);
  }

  private async refreshPanel(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await interaction.deferUpdate();

    const guild = ensureNonNull(
      interaction.guild,
      'modPanelInteraction > refreshPanel(433): interaction.guild'
    );
    const guildId = asGuildId(guild.id);
    const userId = asUserId(targetId);

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
      await interaction.followUp(ephemeralError('User not found.'));
      return;
    }

    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(targetId);
    } catch {
      // User may not be in the server
    }

    const [userCases, notes, activeMutes] = await Promise.all([
      moderationService.getUserCases(guildId, userId),
      notesService.listNotes(guildId, userId),
      muteService.getActiveMutes(guildId, userId),
    ]);

    const recentCases = await caseService.getCasesByStatus(guildId, CaseStatus.OPEN);
    const userRecentCases = recentCases.filter((c) => c.targetId === targetId).slice(0, 5);

    const context: ModPanelContext = {
      target,
      targetMember,
      casesCount: userCases.length,
      notesCount: notes.length,
      recentCases: userRecentCases,
      recentNotes: notes.slice(0, 3),
      voiceChannelId: targetMember?.voice.channel?.id ?? null,
      joinedAt: targetMember?.joinedAt ?? null,
      accountCreatedAt: target.createdAt,
      hasActiveMutes: activeMutes.length > 0,
    };

    const containerComp = buildModPanel(context);
    await editReply(interaction, containerComp);
  }
}
