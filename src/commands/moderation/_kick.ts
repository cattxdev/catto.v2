import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  createModEmbed,
  notifyUser,
  logToModChannel,
} from '../../modules/moderation/discord/embeds.js';
import { parseKickOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';

export async function handleKick(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseKickOptions(interaction);
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
      await interaction.editReply({ content: '❌ Target is not a member of this server.' });
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('KickMembers')) {
      await interaction.editReply({
        content: '❌ I do not have permission to kick members.',
      });
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await interaction.editReply({ content: `❌ ${canModerateResult.reason}` });
      return;
    }

    // Notify user before kick
    const notified = await notifyUser(
      options.target,
      ModAction.KICK,
      options.guild,
      options.reason
    );

    // Execute kick via service
    const result = await moderationService.kick(
      options.guild,
      targetMember,
      options.moderator,
      options.reason
    );

    if (!result.success) {
      await interaction.editReply({
        content: `❌ ${result.error ?? 'Failed to kick the user. Please check my permissions and role hierarchy.'}`,
      });
      return;
    }

    // Create and log embed
    const embed = createModEmbed(
      ModAction.KICK,
      options.target,
      options.moderator,
      options.reason,
      result.caseNumber
    );
    await logToModChannel(options.guild, embed);

    await interaction.editReply({
      content: `✅ **${options.target.tag}** has been kicked. (Case #${result.caseNumber})${!notified ? '\n⚠️ Could not send DM notification to user.' : ''}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in kick command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the kick.',
      })
      .catch(() => {});
  }
}
