import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModAction, notifyUser } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseSoftbanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { type GuildMember } from 'discord.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { ephemeralError, errorMessage, editReply, defer } from '#root/lib/discord/index.js';
import { getGate } from '#lib/validation/gateContext.js';
import { isFail } from '#lib/validation/Gate.js';

export async function handleSoftban(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  // Parse options (supports both target user and target_id for users not in server)
  let options;
  try {
    options = parseSoftbanOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  const { target, targetId, reason, deleteDays, guild, moderator } = options;

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
    // Check bot permissions
    if (!guild.members.me?.permissions.has('BanMembers')) {
      await editReply(
        interaction,
        errorMessage('Error', 'I do not have permission to ban members.')
      );
      return;
    }

    // Try to fetch the target member if they're in the server
    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(targetId);
    } catch {
      // User is not in the server - that's fine for softban
    }

    // Check hierarchy using Gate (only if target is in server)
    if (targetMember) {
      const hierarchyResult = gate.checkHierarchy(targetMember);
      if (isFail(hierarchyResult)) {
        await editReply(interaction, hierarchyResult.response);
        return;
      }

      // Notify user before softban (only if they're in server)
      if (target) {
        await notifyUser(target, ModAction.SOFTBAN, guild, reason);
      }
    }

    // Determine the target tag to display
    const targetTag = target?.tag ?? `User ID: ${targetId}`;

    // Execute softban via service (use softbanById to support users not in server)
    const result = await moderationService.softbanById(
      guild,
      targetId,
      targetTag,
      moderator,
      reason,
      deleteDays
    );

    if (!result.success) {
      await editReply(
        interaction,
        buildModActionError(
          result.error ?? 'Failed to softban the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel (works even without user object - will use ID)
    await logModAction(
      guild,
      ModAction.SOFTBAN,
      target ?? { id: targetId, tag: targetTag },
      moderator,
      reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_softban > handleSoftban > logModAction(94): result.caseNumber'
      )
    );

    await editReply(
      interaction,
      buildModActionSuccess(
        'Softban',
        target ?? { id: targetId, tag: targetTag },
        ensureNonNull(
          result.caseNumber,
          '_softban > handleSoftban > buildModActionSuccess: result.caseNumber'
        ),
        reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in softban command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the softban.')
    ).catch(() => {});
  }
}
