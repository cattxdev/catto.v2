import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  logModAction,
  notifyUser,
  formatDuration,
} from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseTimeoutOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, defer, editReply, errorMessage } from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { getGate } from '#lib/validation/gateContext.js';
import { isFail } from '#lib/validation/Gate.js';

export async function handleTimeout(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseTimeoutOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await defer(interaction);

  // Get Gate for hierarchy validation
  const gate = getGate(interaction);
  if (!gate) {
    await editReply(
      interaction,
      errorMessage('Error', 'This command can only be used in a server.')
    );
    return;
  }

  try {
    const durationMs = options.durationSeconds * 1000;
    const maxDuration = 28 * 24 * 60 * 60 * 1000;

    if (durationMs > maxDuration) {
      await editReply(
        interaction,
        errorMessage('Error', 'Timeout duration cannot exceed 28 days.')
      );
      return;
    }

    if (durationMs < 60 * 1000) {
      await editReply(
        interaction,
        errorMessage('Error', 'Timeout duration must be at least 1 minute.')
      );
      return;
    }

    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('ModerateMembers')) {
      await editReply(
        interaction,
        errorMessage('Error', 'I do not have permission to timeout members.')
      );
      return;
    }

    // Check hierarchy using Gate
    const hierarchyResult = gate.checkHierarchy(targetMember);
    if (isFail(hierarchyResult)) {
      await editReply(interaction, errorMessage('Error', hierarchyResult.message));
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
      await editReply(
        interaction,
        buildModActionError(
          result.error ?? 'Failed to timeout the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.TIMEOUT,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_timeout > handleTimeout > logModAction(114): result.caseNumber'
      ),
      options.durationSeconds
    );

    const durationText = formatDuration(options.durationSeconds);

    await editReply(
      interaction,
      buildModActionSuccess(
        'Timeout',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_timeout > handleTimeout > buildModActionSuccess(125): result.caseNumber'
        ),
        options.reason ?? 'No reason provided',
        durationText,
        { dmSent: notified }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in timeout command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the timeout.')
    ).catch(() => {});
  }
}
