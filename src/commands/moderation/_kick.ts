import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModActionV2, notifyUser } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseKickOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, editErrorV2, deferV2Ephemeral, editReplyV2 } from '#lib/discord/index.js';

export async function handleKick(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseKickOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await deferV2Ephemeral(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('KickMembers')) {
      await interaction.editReply(editErrorV2('I do not have permission to kick members.'));
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await interaction.editReply(
        editErrorV2(canModerateResult.reason ?? 'You cannot moderate this user.')
      );
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
      await editReplyV2(
        interaction,
        buildModActionErrorV2(
          result.error ?? 'Failed to kick the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.KICK,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!
    );

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Kick',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided',
        undefined,
        { dmSent: notified }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in kick command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the kick.'))
      .catch(() => {});
  }
}
