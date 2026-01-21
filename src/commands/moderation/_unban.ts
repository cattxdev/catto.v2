import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModActionV2 } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseUnbanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, defer, editReply, v2 } from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';

export async function handleUnban(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseUnbanOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    interaction.client.logger.error('Unexpected error while parsing unban options:', error);
    throw error;
  }

  if (!options) {
    await interaction.reply(ephemeralError('Invalid user ID format.'));
    return;
  }

  await defer(interaction);

  try {
    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('BanMembers')) {
      await editReply(
        interaction,
        v2.errorMessage('Error', 'I do not have permission to unban members.')
      );
      return;
    }

    // Check if user is banned
    let ban;
    try {
      ban = await options.guild.bans.fetch(options.userId);
    } catch {
      await editReply(interaction, v2.errorMessage('Error', 'This user is not banned.'));
      return;
    }

    // Execute unban via service
    const result = await moderationService.unban(
      options.guild,
      options.userId,
      ban.user.tag,
      options.moderator,
      options.reason
    );

    if (!result.success) {
      await editReply(
        interaction,
        buildModActionErrorV2(result.error ?? 'Failed to unban the user.', 'Check bot permissions.')
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.UNBAN,
      ban.user,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_unban > handleUnban > logModActionV2(74): result.caseNumber'
      )
    );

    await editReply(
      interaction,
      buildModActionSuccessV2(
        'Unban',
        ban.user,
        ensureNonNull(
          result.caseNumber,
          '_unban > handleUnban > buildModActionSuccessV2(82): result.caseNumber'
        ),
        options.reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in unban command:', error);
    await editReply(
      interaction,
      v2.errorMessage('Error', 'An unexpected error occurred while processing the unban.')
    ).catch(() => {});
  }
}
