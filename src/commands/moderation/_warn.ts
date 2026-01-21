import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModActionV2, notifyUser } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseWarnOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, defer, editReply, v2 } from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';

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

  await defer(interaction);

  try {
    // Verify target is in guild
    try {
      await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(
        interaction,
        v2.errorMessage('Error', 'Target is not a member of this server.')
      );
      return;
    }

    // Basic validation
    if (options.target.id === options.moderator.id) {
      await editReply(interaction, v2.errorMessage('Error', 'You cannot warn yourself.'));
      return;
    }

    if (options.target.bot) {
      await editReply(interaction, v2.errorMessage('Error', 'You cannot warn bots.'));
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
      await editReply(
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
      ensureNonNull(result.caseNumber, '_warn > handleWarn > logModActionV2(82): result.caseNumber')
    );

    await editReply(
      interaction,
      buildModActionSuccessV2(
        'Warning',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_warn > handleWarn > buildModActionSuccessV2(90): result.caseNumber'
        ),
        options.reason ?? 'No reason provided',
        undefined,
        { dmSent: notified }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in warn command:', error);
    await editReply(
      interaction,
      v2.errorMessage('Error', 'An unexpected error occurred while processing the warning.')
    ).catch(() => {});
  }
}
