import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  createModEmbed,
  notifyUser,
  logToModChannel,
} from '../../modules/moderation/discord/embeds.js';
import { parseBanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';

export async function handleBan(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseBanOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      return;
    }
    throw error;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply({
        content:
          '❌ Target is not a member of this server. Use the user ID directly to ban someone who left.',
      });
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('BanMembers')) {
      await interaction.editReply({
        content: '❌ I do not have permission to ban members.',
      });
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await interaction.editReply({ content: `❌ ${canModerateResult.reason}` });
      return;
    }

    // Notify user before ban
    const notified = await notifyUser(options.target, ModAction.BAN, options.guild, options.reason);

    // Execute ban via service
    const result = await moderationService.ban(
      options.guild,
      options.target,
      options.moderator,
      options.reason,
      options.deleteMessages
    );

    if (!result.success) {
      await interaction.editReply({
        content: `❌ ${result.error ?? 'Failed to ban the user. Please check my permissions and role hierarchy.'}`,
      });
      return;
    }

    // Create and log embed
    const embed = createModEmbed(
      ModAction.BAN,
      options.target,
      options.moderator,
      options.reason,
      result.caseNumber
    );
    await logToModChannel(options.guild, embed);

    await interaction.editReply({
      content: `✅ **${options.target.tag}** has been banned. (Case #${result.caseNumber})${!notified ? '\n⚠️ Could not send DM notification to user.' : ''}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in ban command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the ban.',
      })
      .catch(() => {});
  }
}
