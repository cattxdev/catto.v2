import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModAction, notifyUser } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseKickOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, defer, editReply, errorMessage } from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { getGate } from '#lib/validation/gateContext.js';
import { isFail } from '#lib/validation/Gate.js';

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
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('KickMembers')) {
      await editReply(
        interaction,
        errorMessage('Error', 'I do not have permission to kick members.')
      );
      return;
    }

    // Check hierarchy using Gate
    const hierarchyResult = gate.checkHierarchy(targetMember);
    if (isFail(hierarchyResult)) {
      await editReply(interaction, errorMessage('Error', hierarchyResult.message));
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
        buildModActionError(
          result.error ?? 'Failed to kick the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.KICK,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(result.caseNumber, 'logModAction(88): result.caseNumber')
    );

    await editReply(
      interaction,
      buildModActionSuccess(
        'Kick',
        options.target,
        ensureNonNull(result.caseNumber, 'buildModActionSuccess(96): result.caseNumber'),
        options.reason ?? 'No reason provided',
        undefined,
        { dmSent: notified }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in kick command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the kick.')
    ).catch(() => {});
  }
}
