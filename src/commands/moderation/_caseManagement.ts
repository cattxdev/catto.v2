import { Subcommand } from '@sapphire/plugin-subcommands';
import { CaseStatus } from '@prisma/client';
import { caseService } from '../../modules/moderation/services/CaseService.js';
import { asGuildId } from '../../modules/moderation/domain/types.js';
import { MessageFlags } from 'discord.js';

export async function handleCaseEdit(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const caseNumber = interaction.options.getInteger('number', true);
  const reason = interaction.options.getString('reason', true);

  await interaction.deferReply();

  try {
    const result = await caseService.editReason(
      asGuildId(interaction.guild.id),
      caseNumber,
      reason
    );

    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    await interaction.editReply({
      content: `✅ Case #${caseNumber} reason updated.\n**New Reason:** ${reason}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in case edit command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while editing the case.',
      })
      .catch(() => {});
  }
}

export async function handleCaseLink(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const caseNumber = interaction.options.getInteger('number', true);
  const messageLink = interaction.options.getString('message_link', true);

  // Validate message link format
  const messageLinkRegex = /^https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+$/;
  if (!messageLinkRegex.test(messageLink)) {
    await interaction.reply({
      content: '❌ Invalid message link format. Use a Discord message link.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const result = await caseService.linkEvidence(asGuildId(interaction.guild.id), caseNumber, {
      messageLinks: [messageLink],
    });

    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    await interaction.editReply({
      content: `✅ Evidence linked to Case #${caseNumber}.\n**Link:** ${messageLink}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in case link command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while linking evidence.',
      })
      .catch(() => {});
  }
}

export async function handleCaseClose(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const caseNumber = interaction.options.getInteger('number', true);
  const statusStr = interaction.options.getString('status') ?? 'CLOSED';
  const status = statusStr as CaseStatus;

  await interaction.deferReply();

  try {
    const result = await caseService.closeCase(asGuildId(interaction.guild.id), caseNumber, status);

    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    const statusLabel = status === CaseStatus.VOID ? 'voided' : 'closed';
    await interaction.editReply({
      content: `✅ Case #${caseNumber} has been ${statusLabel}.`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in case close command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while closing the case.',
      })
      .catch(() => {});
  }
}
