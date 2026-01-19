import { Listener, container } from '@sapphire/framework';
import {
  Events,
  type Interaction,
  MessageFlags,
  type GuildMember,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { ModAction } from '@prisma/client';
import {
  decodeReasonModalCustomId,
  decodeDurationModalCustomId,
  decodeNoteModalCustomId,
  decodeMuteModalCustomId,
} from '#root/modules/moderation/discord/customId.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '#root/modules/moderation/discord/panelBuilder.js';
import { moderationService } from '#root/modules/moderation/services/ModerationService.js';
import { notesService } from '#root/modules/moderation/services/NotesService.js';
import { muteService } from '#root/modules/moderation/services/MuteService.js';
import { asGuildId, asUserId, asDuration } from '#root/modules/moderation/domain/types.js';
import {
  createModEmbed,
  notifyUser,
  logToModChannel,
  formatDuration,
} from '#root/modules/moderation/discord/embeds.js';
import { parseDurationToSeconds } from '#lib/interaction/typedOptions.js';
import { safeParse, durationStringSchema } from '#lib/validation/zod.js';

export class ModModalInteractionListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public async run(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.guildId) return;

    const customId = interaction.customId;

    // Check which type of modal this is
    if (customId.startsWith('modreason:')) {
      await this.handleReasonModal(interaction);
    } else if (customId.startsWith('moddur:')) {
      await this.handleDurationModal(interaction);
    } else if (customId.startsWith('modnote:')) {
      await this.handleNoteModal(interaction);
    } else if (customId.startsWith('modmute:')) {
      await this.handleMuteModal(interaction);
    }
  }

  private async handleReasonModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeReasonModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
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

    const reason = interaction.fields.getTextInputValue('reason');
    const targetId = parsed.targetId;
    const action = parsed.action;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = interaction.guild!;
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        const errorContainer = buildModActionErrorV2('User not found.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Get target member if exists
      let targetMember: GuildMember | null = null;
      try {
        targetMember = await guild.members.fetch(targetId);
      } catch {
        // User may not be in the server
      }

      // For kick/warn, user must be in server
      if ((action === 'kick' || action === 'warn') && !targetMember) {
        const errorContainer = buildModActionErrorV2('User is not in this server.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Check moderation hierarchy
      if (targetMember) {
        const canModerateResult = moderationService.canModerate(member, targetMember);
        if (!canModerateResult.canModerate) {
          const errorContainer = buildModActionErrorV2(
            canModerateResult.reason ?? 'Cannot moderate this user.'
          );
          await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      // Execute the action
      let result;
      let modAction: ModAction;

      switch (action) {
        case 'warn':
          modAction = ModAction.WARN;
          result = await moderationService.warn(guild, target, interaction.user, reason);
          break;
        case 'kick':
          modAction = ModAction.KICK;
          result = await moderationService.kick(guild, targetMember!, interaction.user, reason);
          break;
        case 'ban':
          modAction = ModAction.BAN;
          // Notify before ban
          await notifyUser(target, ModAction.BAN, guild, reason);
          result = await moderationService.ban(guild, target, interaction.user, reason, false);
          break;
        case 'softban':
          modAction = ModAction.SOFTBAN;
          // Notify before softban
          if (targetMember) {
            await notifyUser(target, ModAction.SOFTBAN, guild, reason);
          }
          result = await moderationService.softban(guild, target, interaction.user, reason);
          break;
        default: {
          const errorContainer = buildModActionErrorV2('Unknown action.');
          await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (!result.success) {
        const errorContainer = buildModActionErrorV2(result.error ?? 'Action failed.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Log to mod channel
      const embed = createModEmbed(modAction, target, interaction.user, reason, result.caseNumber);
      await logToModChannel(guild, embed);

      // Show success
      const successContainer = buildModActionSuccessV2(
        action.toUpperCase(),
        target,
        result.caseNumber!,
        reason
      );
      await interaction.editReply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in reason modal:', error);
      const errorContainer = buildModActionErrorV2('An unexpected error occurred.');
      await interaction
        .editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  private async handleDurationModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeDurationModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
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

    const durationStr = interaction.fields.getTextInputValue('duration');
    const reason = interaction.fields.getTextInputValue('reason');
    const targetId = parsed.targetId;
    const action = parsed.action;

    // Validate duration
    const validation = safeParse(durationStringSchema, durationStr);
    if (!validation.success) {
      await interaction.reply({
        content: '❌ Invalid duration format. Use formats like: 10m, 1h, 1d',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const durationSeconds = parseDurationToSeconds(durationStr);
    if (!durationSeconds) {
      await interaction.reply({
        content: '❌ Invalid duration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = interaction.guild!;
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        const errorContainer = buildModActionErrorV2('User not found.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Get target member if exists
      let targetMember: GuildMember | null = null;
      try {
        targetMember = await guild.members.fetch(targetId);
      } catch {
        // User may not be in the server
      }

      // For timeout, user must be in server
      if (action === 'timeout' && !targetMember) {
        const errorContainer = buildModActionErrorV2('User is not in this server.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Check moderation hierarchy
      if (targetMember) {
        const canModerateResult = moderationService.canModerate(member, targetMember);
        if (!canModerateResult.canModerate) {
          const errorContainer = buildModActionErrorV2(
            canModerateResult.reason ?? 'Cannot moderate this user.'
          );
          await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      // Execute the action
      let result;
      let modAction: ModAction;

      switch (action) {
        case 'timeout':
          modAction = ModAction.TIMEOUT;
          // Notify before timeout
          if (targetMember) {
            await notifyUser(target, ModAction.TIMEOUT, guild, reason, durationSeconds);
          }
          result = await moderationService.timeout(
            guild,
            targetMember!,
            interaction.user,
            reason,
            durationSeconds
          );
          break;
        case 'tempban':
          modAction = ModAction.TEMPBAN;
          // Notify before tempban
          if (targetMember) {
            await notifyUser(target, ModAction.TEMPBAN, guild, reason, durationSeconds);
          }
          result = await moderationService.tempban(
            guild,
            target,
            interaction.user,
            reason,
            durationSeconds
          );
          break;
        default: {
          const errorContainer = buildModActionErrorV2('Unknown action.');
          await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (!result.success) {
        const errorContainer = buildModActionErrorV2(result.error ?? 'Action failed.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Log to mod channel
      const embed = createModEmbed(
        modAction,
        target,
        interaction.user,
        reason,
        result.caseNumber,
        durationSeconds
      );
      await logToModChannel(guild, embed);

      // Show success
      const successContainer = buildModActionSuccessV2(
        action.toUpperCase(),
        target,
        result.caseNumber!,
        reason,
        formatDuration(durationSeconds)
      );
      await interaction.editReply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in duration modal:', error);
      const errorContainer = buildModActionErrorV2('An unexpected error occurred.');
      await interaction
        .editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  private async handleNoteModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeNoteModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
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

    const note = interaction.fields.getTextInputValue('note');
    const tagsStr = interaction.fields.getTextInputValue('tags');
    const targetId = parsed.targetId;

    const tags = tagsStr
      ? tagsStr
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      : [];

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        await interaction.editReply({ content: '❌ User not found.' });
        return;
      }

      const result = await notesService.addNote({
        guildId: asGuildId(interaction.guildId!),
        userId: asUserId(targetId),
        createdById: asUserId(interaction.user.id),
        note,
        tags,
      });

      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
        return;
      }

      const tagsDisplay =
        tags.length > 0 ? `\n**Tags:** ${tags.map((t) => `\`${t}\``).join(', ')}` : '';
      await interaction.editReply({
        content: `Note added for **${target.tag}**${tagsDisplay}\n**Note ID:** \`${result.noteId}\``,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in note modal:', error);
      await interaction
        .editReply({
          content: 'An unexpected error occurred.',
        })
        .catch(() => {});
    }
  }

  private async handleMuteModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeMuteModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: 'Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Permission check
    const member = interaction.member as GuildMember;
    if (!member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'You do not have permission to use this.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const durationStr = interaction.fields.getTextInputValue('duration');
    const reason = interaction.fields.getTextInputValue('reason');
    const targetId = parsed.targetId;
    const muteType = parsed.action;

    // Validate duration if provided
    let durationSeconds: number | undefined;
    if (durationStr && durationStr.trim().length > 0) {
      const validation = safeParse(durationStringSchema, durationStr);
      if (!validation.success) {
        await interaction.reply({
          content: 'Invalid duration format. Use formats like: 10m, 1h, 1d',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      durationSeconds = parseDurationToSeconds(durationStr) ?? undefined;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = interaction.guild!;
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        const errorContainer = buildModActionErrorV2('User not found.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Get target member
      let targetMember: GuildMember | null = null;
      try {
        targetMember = await guild.members.fetch(targetId);
      } catch {
        // User may not be in the server
      }

      if (!targetMember) {
        const errorContainer = buildModActionErrorV2('User is not in this server.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Check moderation hierarchy
      const canModerateResult = moderationService.canModerate(member, targetMember);
      if (!canModerateResult.canModerate) {
        const errorContainer = buildModActionErrorV2(
          canModerateResult.reason ?? 'Cannot moderate this user.'
        );
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Execute the mute action
      let result;
      let modAction: ModAction;

      const muteInput = {
        guildId: asGuildId(guild.id),
        userId: asUserId(targetId),
        createdById: asUserId(interaction.user.id),
        reason,
        duration: durationSeconds ? asDuration(durationSeconds) : undefined,
      };

      switch (muteType) {
        case 'text':
          modAction = ModAction.MUTE_TEXT;
          result = await muteService.muteText(
            guild,
            targetMember,
            asUserId(interaction.user.id),
            interaction.user.tag,
            muteInput
          );
          break;
        case 'voice':
          modAction = ModAction.MUTE_VOICE;
          result = await muteService.muteVoice(
            guild,
            targetMember,
            asUserId(interaction.user.id),
            interaction.user.tag,
            muteInput
          );
          break;
        case 'both':
          modAction = ModAction.MUTE_BOTH;
          result = await muteService.muteBoth(
            guild,
            targetMember,
            asUserId(interaction.user.id),
            interaction.user.tag,
            muteInput
          );
          break;
        default: {
          const errorContainer = buildModActionErrorV2('Unknown mute type.');
          await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (!result.success) {
        const errorContainer = buildModActionErrorV2(result.error ?? 'Mute action failed.');
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Log to mod channel
      const embed = createModEmbed(
        modAction,
        target,
        interaction.user,
        reason,
        result.caseNumber,
        durationSeconds ? asDuration(durationSeconds) : undefined
      );
      await logToModChannel(guild, embed);

      // Show success
      const durationText = durationSeconds ? formatDuration(durationSeconds) : undefined;
      const successContainer = buildModActionSuccessV2(
        `MUTE ${muteType.toUpperCase()}`,
        target,
        result.caseNumber!,
        reason,
        durationText
      );
      await interaction.editReply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in mute modal:', error);
      const errorContainer = buildModActionErrorV2('An unexpected error occurred.');
      await interaction
        .editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }
}
