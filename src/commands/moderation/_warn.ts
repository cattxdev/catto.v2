import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModAction, notifyUser } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseWarnOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, defer, editReply, errorMessage } from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { Gate, isFail } from '#lib/validation/Gate.js';

export async function handleWarn(interaction: Subcommand.ChatInputCommandInteraction) {
  // Create gate for validation
  const gate = Gate.from(interaction);
  if (!gate) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  // Parse options
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

  // Resolve target and check hierarchy (authorization already checked by precondition)
  const targetMember = await gate.resolveMember(options.target.id);
  if (!targetMember) {
    await interaction.reply(ephemeralError('Target is not a member of this server.'));
    return;
  }

  // Check hierarchy
  const hierarchyResult = gate.checkHierarchy(targetMember);
  if (isFail(hierarchyResult)) {
    await gate.deny(hierarchyResult);
    return;
  }

  await defer(interaction);

  try {
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
        buildModActionError(
          result.error ?? 'An unexpected error occurred while processing the warning.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.WARN,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(result.caseNumber, '_warn > handleWarn > logModAction(82): result.caseNumber')
    );

    await editReply(
      interaction,
      buildModActionSuccess(
        'Warning',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_warn > handleWarn > buildModActionSuccess(90): result.caseNumber'
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
      errorMessage('Error', 'An unexpected error occurred while processing the warning.')
    ).catch(() => {});
  }
}
