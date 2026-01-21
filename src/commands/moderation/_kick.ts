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
import { ephemeralError, defer, editReply, v2 } from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';

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

  await defer(interaction);

  try {
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
    if (!options.guild.members.me?.permissions.has('KickMembers')) {
      await editReply(
        interaction,
        v2.errorMessage('Error', 'I do not have permission to kick members.')
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
      await editReply(
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
      ensureNonNull(result.caseNumber, 'logModActionV2(88): result.caseNumber')
    );

    await editReply(
      interaction,
      buildModActionSuccessV2(
        'Kick',
        options.target,
        ensureNonNull(result.caseNumber, 'buildModActionSuccessV2(96): result.caseNumber'),
        options.reason ?? 'No reason provided',
        undefined,
        { dmSent: notified }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in kick command:', error);
    await editReply(
      interaction,
      v2.errorMessage('Error', 'An unexpected error occurred while processing the kick.')
    ).catch(() => {});
  }
}
