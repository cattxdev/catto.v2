import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  logModActionV2,
  notifyUser,
  formatDuration,
} from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseTimeoutOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, defer, editReply, v2 } from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';

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

  if (!options) {
    await interaction.reply(
      ephemeralError('Invalid duration format. Use formats like: 10m, 1h, 2d, 1w')
    );
    return;
  }

  await defer(interaction);

  try {
    const durationMs = options.durationSeconds * 1000;
    const maxDuration = 28 * 24 * 60 * 60 * 1000;

    if (durationMs > maxDuration) {
      await editReply(
        interaction,
        v2.errorMessage('Error', 'Timeout duration cannot exceed 28 days.')
      );
      return;
    }

    if (durationMs < 60 * 1000) {
      await editReply(
        interaction,
        v2.errorMessage('Error', 'Timeout duration must be at least 1 minute.')
      );
      return;
    }

    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(
        interaction,
        v2.errorMessage('Error', 'Target is not a member of this server.')
      );
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('ModerateMembers')) {
      await editReply(
        interaction,
        v2.errorMessage('Error', 'I do not have permission to timeout members.')
      );
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await editReply(
        interaction,
        v2.errorMessage('Error', canModerateResult.reason ?? 'You cannot moderate this user.')
      );
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
        buildModActionErrorV2(
          result.error ?? 'Failed to timeout the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.TIMEOUT,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_timeout > handleTimeout > logModActionV2(114): result.caseNumber'
      ),
      options.durationSeconds
    );

    const durationText = formatDuration(options.durationSeconds);

    await editReply(
      interaction,
      buildModActionSuccessV2(
        'Timeout',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_timeout > handleTimeout > buildModActionSuccessV2(125): result.caseNumber'
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
      v2.errorMessage('Error', 'An unexpected error occurred while processing the timeout.')
    ).catch(() => {});
  }
}
