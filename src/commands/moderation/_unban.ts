import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { createModEmbed, logToModChannel } from '../../modules/moderation/discord/embeds.js';
import { parseUnbanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';

export async function handleUnban(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseUnbanOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      return;
    }
    interaction.client.logger.error('Unexpected error while parsing unban options:', error);
    throw error;
  }

  if (!options) {
    await interaction.reply({ content: '❌ Invalid user ID format.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('BanMembers')) {
      await interaction.editReply({
        content: '❌ I do not have permission to unban members.',
      });
      return;
    }

    // Check if user is banned
    let ban;
    try {
      ban = await options.guild.bans.fetch(options.userId);
    } catch {
      await interaction.editReply({ content: '❌ This user is not banned.' });
      return;
    }

    // Execute unban via service
    const result = await moderationService.unban(
      options.guild,
      options.userId,
      ban.user.tag,
      options.moderator,
      options.reason
    );

    if (!result.success) {
      await interaction.editReply({
        content: `❌ ${result.error ?? 'Failed to unban the user. Please check my permissions.'}`,
      });
      return;
    }

    // Create and log embed
    const embed = createModEmbed(
      ModAction.UNBAN,
      ban.user,
      options.moderator,
      options.reason,
      result.caseNumber
    );
    await logToModChannel(options.guild, embed);

    await interaction.editReply({
      content: `✅ **${ban.user.tag}** has been unbanned. (Case #${result.caseNumber})`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in unban command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the unban.',
      })
      .catch(() => {});
  }
}
