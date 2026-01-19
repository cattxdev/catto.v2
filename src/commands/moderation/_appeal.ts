import { Subcommand } from '@sapphire/plugin-subcommands';
import { AppealStatus } from '@prisma/client';
import { appealsService } from '../../modules/moderation/services/AppealsService.js';
import { asGuildId, asUserId, asAppealId } from '../../modules/moderation/domain/types.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} from 'discord.js';

export async function handleAppealCreate(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const target = interaction.options.getUser('target', true);
  const reason = interaction.options.getString('reason', true);

  await interaction.deferReply();

  try {
    const result = await appealsService.createAppeal({
      guildId: asGuildId(interaction.guild.id),
      targetId: asUserId(target.id),
      createdById: asUserId(interaction.user.id),
      reason,
    });

    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    await interaction.editReply({
      content: `✅ Appeal created for **${target.tag}**\n**Appeal ID:** \`${result.appealId}\``,
    });
  } catch (error) {
    interaction.client.logger.error('Error in appeal create command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while creating the appeal.',
      })
      .catch(() => {});
  }
}

export async function handleAppealList(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const statusStr = interaction.options.getString('status');
  const status = statusStr ? (statusStr as AppealStatus) : undefined;

  await interaction.deferReply();

  try {
    const appeals = await appealsService.listAppeals(asGuildId(interaction.guild.id), status);

    const container = new ContainerBuilder();

    // Header
    const statusLabel = status ? ` (${status})` : '';
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📋 Appeals${statusLabel}`),
      new TextDisplayBuilder().setContent(`Found **${appeals.length}** appeal(s)`)
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (appeals.length === 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('*No appeals found.*')
      );
    } else {
      // Show up to 10 appeals
      for (const appeal of appeals.slice(0, 10)) {
        const statusEmoji = {
          [AppealStatus.PENDING]: '🟡',
          [AppealStatus.APPROVED]: '✅',
          [AppealStatus.DENIED]: '❌',
        }[appeal.status];

        const timestamp = `<t:${Math.floor(appeal.createdAt.getTime() / 1000)}:R>`;
        const truncatedReason =
          appeal.reason.length > 100 ? appeal.reason.substring(0, 100) + '...' : appeal.reason;

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**ID:** \`${appeal.id}\` ${statusEmoji} ${appeal.status}\n<@${appeal.targetId}> · ${timestamp}\n**Reason:** ${truncatedReason}`
          )
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );
      }

      if (appeals.length > 10) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`*... and ${appeals.length - 10} more*`)
        );
      }
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    interaction.client.logger.error('Error in appeal list command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while listing appeals.',
      })
      .catch(() => {});
  }
}

export async function handleAppealResolve(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const appealId = interaction.options.getString('appeal_id', true);
  const decision = interaction.options.getString('decision', true) as AppealStatus;
  const resolution = interaction.options.getString('resolution', true);

  await interaction.deferReply();

  try {
    // Get the appeal first to show details
    const appeal = await appealsService.getAppeal(asAppealId(appealId));

    if (!appeal) {
      await interaction.editReply({ content: '❌ Appeal not found.' });
      return;
    }

    const result = await appealsService.resolveAppeal(
      asAppealId(appealId),
      asGuildId(interaction.guild.id),
      {
        status: decision,
        resolution,
        resolvedById: asUserId(interaction.user.id),
      }
    );

    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    const emoji = decision === AppealStatus.APPROVED ? '✅' : '❌';
    await interaction.editReply({
      content: `${emoji} Appeal \`${appealId}\` has been **${decision.toLowerCase()}**.\n**Resolution:** ${resolution}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in appeal resolve command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while resolving the appeal.',
      })
      .catch(() => {});
  }
}
