import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  createModEmbed,
  notifyUser,
  logToModChannel,
} from '../../modules/moderation/discord/embeds.js';
import { parseWarnOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';

export async function handleWarn(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseWarnOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      return;
    }
    throw error;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Verify target is in guild
    try {
      await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply({ content: '❌ Target is not a member of this server.' });
      return;
    }

    // Basic validation
    if (options.target.id === options.moderator.id) {
      await interaction.editReply({ content: '❌ You cannot warn yourself.' });
      return;
    }

    if (options.target.bot) {
      await interaction.editReply({ content: '❌ You cannot warn bots.' });
      return;
    }

    // Notify user before warn
    const notified = await notifyUser(
      options.target,
      ModAction.WARN,
      options.guild,
      options.reason
    );

    // Execute warn via service
    const result = await moderationService.warn(
      options.guild,
      options.target,
      options.moderator,
      options.reason
    );

    if (!result.success) {
      await interaction.editReply({
        content: `❌ ${result.error ?? 'An unexpected error occurred while processing the warning.'}`,
      });
      return;
    }

    // Create and log embed
    const embed = createModEmbed(
      ModAction.WARN,
      options.target,
      options.moderator,
      options.reason,
      result.caseNumber
    );
    await logToModChannel(options.guild, embed);

    await interaction.editReply({
      content: `✅ **${options.target.tag}** has been warned. (Case #${result.caseNumber})${!notified ? '\n⚠️ Could not send DM notification to user.' : ''}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in warn command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the warning.',
      })
      .catch(() => {});
  }
}
