import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  logModAction,
  notifyUser,
  formatDuration,
} from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionError,
  buildModActionSuccess,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseTempbanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { type GuildMember } from 'discord.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { ephemeralError, defer, editReply, errorMessage } from '#lib/discord/index.js';
import { getGate } from '#lib/validation/gateContext.js';
import { isFail } from '#lib/validation/Gate.js';

export async function handleTempban(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  let options;
  try {
    options = parseTempbanOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  const { target, targetId, reason, durationSeconds, deleteMessages, guild, moderator } = options;

  const maxDuration = 365 * 24 * 60 * 60;
  if (durationSeconds > maxDuration) {
    await interaction.reply(ephemeralError('Maximum tempban duration is 1 year.'));
    return;
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
    if (!guild.members.me?.permissions.has('BanMembers')) {
      await editReply(
        interaction,
        errorMessage('Error', 'I do not have permission to ban members.')
      );
      return;
    }

    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(targetId);
    } catch {
      // User is not in the server - that's fine for tempban
    }

    if (targetMember) {
      const hierarchyResult = gate.checkHierarchy(targetMember);
      if (isFail(hierarchyResult)) {
        await editReply(interaction, hierarchyResult.response);
        return;
      }

      if (target) {
        await notifyUser(target, ModAction.TEMPBAN, guild, reason, durationSeconds);
      }
    }

    const targetTag = target?.tag ?? `User ID: ${targetId}`;

    const result = await moderationService.tempbanById(
      guild,
      targetId,
      targetTag,
      moderator,
      reason,
      durationSeconds,
      deleteMessages
    );

    if (!result.success) {
      await editReply(
        interaction,
        buildModActionError(
          result.error ?? 'Failed to tempban the user.',
          'Check bot permissions and try again.'
        )
      );
      return;
    }

    await logModAction(
      guild,
      ModAction.TEMPBAN,
      target ?? { id: targetId, tag: targetTag },
      moderator,
      reason ?? 'No reason provided',
      ensureNonNull(result.caseNumber, 'tempban > handleTempban: result.caseNumber'),
      durationSeconds
    );

    await editReply(
      interaction,
      buildModActionSuccess(
        'Tempban',
        target ?? { id: targetId, tag: targetTag },
        ensureNonNull(
          result.caseNumber,
          '_tempban > handleTempban > buildModActionSuccess: result.caseNumber'
        ),
        reason ?? 'No reason provided',
        formatDuration(durationSeconds),
        { guildId: guild.id }
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in tempban command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the tempban.')
    ).catch(() => {});
  }
}
