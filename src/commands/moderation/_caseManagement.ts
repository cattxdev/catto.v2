import { Subcommand } from '@sapphire/plugin-subcommands';
import { CaseStatus } from '@prisma/client';
import { caseService } from '../../modules/moderation/services/CaseService.js';
import { asGuildId } from '../../modules/moderation/domain/types.js';
import {
  ephemeralError,
  defer,
  editReply,
  errorMessage,
  successMessage,
} from '#lib/discord/index.js';

export async function handleCaseEdit(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const caseNumber = interaction.options.getInteger('number', true);
  const reason = interaction.options.getString('reason', true);

  await defer(interaction);

  try {
    const result = await caseService.editReason(
      asGuildId(interaction.guild.id),
      caseNumber,
      reason
    );

    if (!result.success) {
      await editReply(interaction, errorMessage('Error', result.error ?? 'Failed to edit case.'));
      return;
    }

    await editReply(
      interaction,
      successMessage(`Case #${caseNumber} Updated`, `**New Reason:** ${reason}`)
    );
  } catch (error) {
    interaction.client.logger.error('Error in case edit command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while editing the case.')
    ).catch(() => {});
  }
}

export async function handleCaseLink(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const caseNumber = interaction.options.getInteger('number', true);
  const messageLink = interaction.options.getString('message_link', true);

  const messageLinkRegex = /^https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+$/;
  if (!messageLinkRegex.test(messageLink)) {
    await interaction.reply(
      ephemeralError('Invalid message link format. Use a Discord message link.')
    );
    return;
  }

  await defer(interaction);

  try {
    const result = await caseService.linkEvidence(asGuildId(interaction.guild.id), caseNumber, {
      messageLinks: [messageLink],
    });

    if (!result.success) {
      await editReply(
        interaction,
        errorMessage('Error', result.error ?? 'Failed to link evidence.')
      );
      return;
    }

    await editReply(
      interaction,
      successMessage(`Evidence Linked to Case #${caseNumber}`, `**Link:** ${messageLink}`)
    );
  } catch (error) {
    interaction.client.logger.error('Error in case link command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while linking evidence.')
    ).catch(() => {});
  }
}

export async function handleCaseClose(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const caseNumber = interaction.options.getInteger('number', true);
  const statusStr = interaction.options.getString('status') ?? 'CLOSED';
  const status = statusStr as CaseStatus;

  await defer(interaction);

  try {
    const result = await caseService.closeCase(asGuildId(interaction.guild.id), caseNumber, status);

    if (!result.success) {
      await editReply(interaction, errorMessage('Error', result.error ?? 'Failed to close case.'));
      return;
    }

    const statusLabel = status === CaseStatus.VOID ? 'voided' : 'closed';
    await editReply(
      interaction,
      successMessage(
        `Case #${caseNumber} ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in case close command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while closing the case.')
    ).catch(() => {});
  }
}
