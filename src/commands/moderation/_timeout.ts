import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  createModEmbed,
  notifyUser,
  logToModChannel,
  formatDuration,
} from '../../modules/moderation/discord/embeds.js';
import { parseTimeoutOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';

export async function handleTimeout(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseTimeoutOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      return;
    }
    throw error;
  }

  if (!options) {
    await interaction.reply({
      content: '❌ Invalid duration format. Use formats like: 10m, 1h, 2d, 1w',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const durationMs = options.durationSeconds * 1000;
    const maxDuration = 28 * 24 * 60 * 60 * 1000;

    if (durationMs > maxDuration) {
      await interaction.editReply({ content: '❌ Timeout duration cannot exceed 28 days.' });
      return;
    }

    if (durationMs < 60 * 1000) {
      await interaction.editReply({ content: '❌ Timeout duration must be at least 1 minute.' });
      return;
    }

    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply({ content: '❌ Target is not a member of this server.' });
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('ModerateMembers')) {
      await interaction.editReply({
        content: '❌ I do not have permission to timeout members.',
      });
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await interaction.editReply({ content: `❌ ${canModerateResult.reason}` });
      return;
    }

    // Notify user before timeout
    const notified = await notifyUser(
      options.target,
      ModAction.TIMEOUT,
      options.guild,
      options.reason,
      options.durationSeconds
    );

    // Execute timeout via service
    const result = await moderationService.timeout(
      options.guild,
      targetMember,
      options.moderator,
      options.reason,
      options.durationSeconds
    );

    if (!result.success) {
      await interaction.editReply({
        content: `❌ ${result.error ?? 'Failed to timeout the user. Please check my permissions and role hierarchy.'}`,
      });
      return;
    }

    // Create and log embed
    const embed = createModEmbed(
      ModAction.TIMEOUT,
      options.target,
      options.moderator,
      options.reason,
      result.caseNumber,
      options.durationSeconds
    );
    await logToModChannel(options.guild, embed);

    await interaction.editReply({
      content: `✅ **${options.target.tag}** has been timed out for ${formatDuration(options.durationSeconds)}. (Case #${result.caseNumber})${!notified ? '\n⚠️ Could not send DM notification to user.' : ''}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in timeout command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the timeout.',
      })
      .catch(() => {});
  }
}
