import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModActionV2, notifyUser } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseBanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, editErrorV2, deferV2Ephemeral, editReplyV2 } from '#lib/discord/index.js';
import type { User } from 'discord.js';

export async function handleBan(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseBanOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await deferV2Ephemeral(interaction);

  try {
    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('BanMembers')) {
      await interaction.editReply(editErrorV2('I do not have permission to ban members.'));
      return;
    }

    // Try to fetch the target user if we don't have it
    let targetUser: User | undefined = options.target;
    if (!targetUser) {
      try {
        targetUser = await interaction.client.users.fetch(options.targetId);
      } catch {
        // User doesn't exist or is not fetchable - we can still ban by ID
      }
    }

    // Try to fetch target member (if they're in the server)
    let targetMember;
    let notified = false;
    try {
      targetMember = await options.guild.members.fetch(options.targetId);

      // Check if moderator can moderate target (only if target is a member)
      const canModerateResult = moderationService.canModerate(
        options.moderatorMember,
        targetMember
      );
      if (!canModerateResult.canModerate) {
        await interaction.editReply(
          editErrorV2(canModerateResult.reason ?? 'You cannot moderate this user.')
        );
        return;
      }

      // Notify user before ban (only if target is a member and we have the user object)
      if (targetUser) {
        notified = await notifyUser(targetUser, ModAction.BAN, options.guild, options.reason);
      }
    } catch {
      // User is not in the server - that's fine, we can still ban them by ID
      // No hierarchy check needed, no DM can be sent
    }

    // Execute ban via service
    // The service should accept either a User object or just the ID
    const result = await moderationService.banById(
      options.guild,
      options.targetId,
      targetUser?.tag ?? `Unknown (${options.targetId})`,
      options.moderator,
      options.reason,
      options.deleteMessages
    );

    if (!result.success) {
      await editReplyV2(
        interaction,
        buildModActionErrorV2(
          result.error ?? 'Failed to ban the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.BAN,
      targetUser ?? { id: options.targetId, tag: `Unknown User (${options.targetId})` },
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!
    );

    // Build success response
    const successTarget = targetUser ?? {
      id: options.targetId,
      tag: `Unknown User (${options.targetId})`,
    };

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Ban',
        successTarget as User,
        result.caseNumber!,
        options.reason ?? 'No reason provided',
        undefined,
        { dmSent: targetMember ? notified : true }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in ban command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the ban.'))
      .catch(() => {});
  }
}
