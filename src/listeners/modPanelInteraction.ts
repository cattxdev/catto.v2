import { Listener, container } from '@sapphire/framework';
import {
  Events,
  type Interaction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  type ButtonInteraction,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  type GuildMember,
} from 'discord.js';
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
  buildModPanelV2,
  buildContextBundleV2,
  buildNotesListV2,
  type ModPanelContext,
} from '#root/modules/moderation/discord/panelBuilder.js';
import { moderationService } from '#root/modules/moderation/services/ModerationService.js';
import { notesService } from '#root/modules/moderation/services/NotesService.js';
import { caseService } from '#root/modules/moderation/services/CaseService.js';
import { muteService } from '#root/modules/moderation/services/MuteService.js';
import { asGuildId, asUserId, CaseStatus } from '#root/modules/moderation/domain/types.js';
import { memoryLimiter } from '#lib/rateLimit/index.js';

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
      await interaction.reply({
        content: '❌ Invalid interaction.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Rate limit check
    const rateLimitKey = `modpanel:${interaction.user.id}:${parsed.action}`;
    const rateLimitResult = memoryLimiter.throttle(rateLimitKey, { minIntervalMs: RATE_LIMIT_MS });
    if (!rateLimitResult.allowed) {
      await interaction.reply({
        content: `⏳ Please wait ${Math.ceil((rateLimitResult.retryAfterMs ?? RATE_LIMIT_MS) / 1000)}s before using this again.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Permission check
    const member = interaction.member as GuildMember;
    if (!member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: '❌ You do not have permission to use this.',
        flags: MessageFlags.Ephemeral,
      });
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
          await interaction.reply({
            content: 'Unknown action.',
            flags: MessageFlags.Ephemeral,
          });
      }
    } catch (error) {
      container.logger.error('[ModPanelInteraction] Error handling interaction:', error);
      await interaction
        .reply({
          content: 'An error occurred while processing your request.',
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }

  private async showMuteModal(
    interaction: ButtonInteraction,
    muteType: 'text' | 'voice',
    targetId: string
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(encodeMuteModalCustomId(muteType, targetId))
      .setTitle(`Mute User (${muteType === 'text' ? 'Text' : 'Voice'})`);

    const durationInput = new TextInputBuilder()
      .setCustomId('duration')
      .setLabel('Duration (leave empty for permanent)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1h, 1d, 7d')
      .setRequired(false)
      .setMaxLength(10);

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter the reason for this mute...')
      .setRequired(true)
      .setMaxLength(512);

    const durationRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      durationInput
    );
    const reasonRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      reasonInput
    );
    modal.addComponents(durationRow, reasonRow);

    await interaction.showModal(modal);
  }

  private async handleUnmute(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild!;
    const guildId = asGuildId(guild.id);
    const userId = asUserId(targetId);

    try {
      const targetMember = await guild.members.fetch(targetId).catch(() => null);
      if (!targetMember) {
        await interaction.editReply({ content: 'User not found in this server.' });
        return;
      }

      const result = await muteService.unmuteBoth(
        guild,
        targetMember,
        asUserId(interaction.user.id),
        interaction.user.tag,
        guildId,
        userId,
        'Unmuted via mod panel'
      );

      if (!result.success) {
        await interaction.editReply({ content: result.error ?? 'Failed to unmute user.' });
        return;
      }

      await interaction.editReply({
        content: `**${targetMember.user.tag}** has been unmuted. (Case #${result.caseNumber})`,
      });
    } catch (error) {
      container.logger.error('[ModPanelInteraction] Error handling unmute:', error);
      await interaction.editReply({ content: 'An error occurred while processing the unmute.' });
    }
  }

  private async showReasonModal(
    interaction: ButtonInteraction,
    action: string,
    targetId: string
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(
        encodeReasonModalCustomId(action as 'warn' | 'kick' | 'ban' | 'softban', targetId)
      )
      .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} User`);

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter the reason for this action...')
      .setRequired(true)
      .setMaxLength(512);

    const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  private async showDurationModal(
    interaction: ButtonInteraction,
    action: string,
    targetId: string
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(encodeDurationModalCustomId(action as 'timeout' | 'tempban', targetId))
      .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} User`);

    const durationInput = new TextInputBuilder()
      .setCustomId('duration')
      .setLabel('Duration (e.g., 10m, 1h, 1d)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1h')
      .setRequired(true)
      .setMaxLength(10);

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter the reason for this action...')
      .setRequired(true)
      .setMaxLength(512);

    const durationRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      durationInput
    );
    const reasonRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      reasonInput
    );
    modal.addComponents(durationRow, reasonRow);

    await interaction.showModal(modal);
  }

  private async showNoteModal(interaction: ButtonInteraction, targetId: string): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(encodeNoteModalCustomId('add', targetId))
      .setTitle('Add Moderator Note');

    const noteInput = new TextInputBuilder()
      .setCustomId('note')
      .setLabel('Note')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter your note about this user...')
      .setRequired(true)
      .setMaxLength(1000);

    const tagsInput = new TextInputBuilder()
      .setCustomId('tags')
      .setLabel('Tags (comma-separated, optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('toxic, raid, spam')
      .setRequired(false)
      .setMaxLength(100);

    const noteRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(noteInput);
    const tagsRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(tagsInput);
    modal.addComponents(noteRow, tagsRow);

    await interaction.showModal(modal);
  }

  private async showNotes(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = asGuildId(interaction.guildId!);
    const userId = asUserId(targetId);

    const notes = await notesService.listNotes(guildId, userId);
    const target = await interaction.client.users.fetch(targetId).catch(() => null);

    if (!target) {
      await interaction.editReply({ content: '❌ User not found.' });
      return;
    }

    const containerComp = buildNotesListV2(target, notes);

    await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async showContext(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild!;
    const guildId = asGuildId(guild.id);
    const userId = asUserId(targetId);

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
      await interaction.editReply({ content: '❌ User not found.' });
      return;
    }

    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(targetId);
    } catch {
      // User may not be in the server
    }

    const [userCases, notes] = await Promise.all([
      moderationService.getUserCases(guildId, userId),
      notesService.listNotes(guildId, userId),
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
      voiceChannelName: targetMember?.voice.channel?.name ?? null,
      joinedAt: targetMember?.joinedAt ?? null,
      accountCreatedAt: target.createdAt,
    };

    const containerComp = buildContextBundleV2(context);

    await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async showHistory(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = asGuildId(interaction.guildId!);
    const userId = asUserId(targetId);

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
      await interaction.editReply({ content: '❌ User not found.' });
      return;
    }

    const cases = await moderationService.getUserCases(guildId, userId);

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📜 History for ${target.tag}`),
      new TextDisplayBuilder().setContent(`Total cases: **${cases.length}**`)
    );

    if (cases.length === 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('*No moderation history found.*')
      );
    } else {
      const casesList = cases
        .slice(0, 10)
        .map((c) => {
          const timestamp = `<t:${Math.floor(c.createdAt.getTime() / 1000)}:R>`;
          return `• **#${c.caseNumber}** ${c.action} - ${timestamp}\n  ${c.reason ?? 'No reason'}`;
        })
        .join('\n\n');

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(casesList));

      if (cases.length > 10) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`\n*... and ${cases.length - 10} more cases*`)
        );
      }
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async refreshPanel(interaction: ButtonInteraction, targetId: string): Promise<void> {
    await interaction.deferUpdate();

    const guild = interaction.guild!;
    const guildId = asGuildId(guild.id);
    const userId = asUserId(targetId);

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
      await interaction.followUp({
        content: '❌ User not found.',
        flags: MessageFlags.Ephemeral,
      });
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
      voiceChannelName: targetMember?.voice.channel?.name ?? null,
      joinedAt: targetMember?.joinedAt ?? null,
      accountCreatedAt: target.createdAt,
      hasActiveMutes: activeMutes.length > 0,
    };

    const containerComp = buildModPanelV2(context);

    await interaction.editReply({
      components: [containerComp],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
