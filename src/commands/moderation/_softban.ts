import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  createModEmbed,
  notifyUser,
  logToModChannel,
} from '../../modules/moderation/discord/embeds.js';
import { type GuildMember, MessageFlags } from 'discord.js';

export async function handleSoftban(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const target = interaction.options.getUser('target', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') ?? 7;

  await interaction.deferReply();

  try {
    // Check bot permissions
    if (!interaction.guild.members.me?.permissions.has('BanMembers')) {
      await interaction.editReply({ content: '❌ I do not have permission to ban members.' });
      return;
    }

    // Fetch target member if they exist
    let targetMember: GuildMember | null = null;
    try {
      targetMember = await interaction.guild.members.fetch(target.id);
    } catch {
      // User may not be in the server
    }

    // Check if moderator can moderate target (if target is in server)
    if (targetMember) {
      const canModerateResult = moderationService.canModerate(
        interaction.member as GuildMember,
        targetMember
      );
      if (!canModerateResult.canModerate) {
        await interaction.editReply({ content: `❌ ${canModerateResult.reason}` });
        return;
      }

      // Notify user before softban
      await notifyUser(target, ModAction.SOFTBAN, interaction.guild, reason);
    }

    // Execute softban via service
    const result = await moderationService.softban(
      interaction.guild,
      target,
      interaction.user,
      reason,
      deleteDays
    );

    if (!result.success) {
      await interaction.editReply({
        content: `❌ ${result.error ?? 'Failed to softban the user.'}`,
      });
      return;
    }

    // Create and log embed
    const embed = createModEmbed(
      ModAction.SOFTBAN,
      target,
      interaction.user,
      reason,
      result.caseNumber
    );
    await logToModChannel(interaction.guild, embed);

    await interaction.editReply({
      content: `✅ **${target.tag}** has been softbanned (messages deleted, user unbanned). (Case #${result.caseNumber})`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in softban command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the softban.',
      })
      .catch(() => {});
  }
}
