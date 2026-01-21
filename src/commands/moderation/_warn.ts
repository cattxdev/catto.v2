import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModActionV2, notifyUser } from '../../modules/moderation/discord/embeds.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseWarnOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, editErrorV2, deferV2Ephemeral, editReplyV2 } from '#lib/discord/index.js';

export async function handleWarn(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseWarnOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    interaction.client.logger.error('Unexpected error while parsing warn options:', error);
    throw error;
  }

  await deferV2Ephemeral(interaction);

  try {
    // Verify target is in guild
    try {
      await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Basic validation
    if (options.target.id === options.moderator.id) {
      await interaction.editReply(editErrorV2('You cannot warn yourself.'));
      return;
    }

    if (options.target.bot) {
      await interaction.editReply(editErrorV2('You cannot warn bots.'));
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
      await editReplyV2(
        interaction,
        buildModActionErrorV2(
          result.error ?? 'An unexpected error occurred while processing the warning.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.WARN,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!
    );

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Warning',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided',
        undefined,
        { dmSent: notified }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in warn command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the warning.'))
      .catch(() => {});
  }
}
