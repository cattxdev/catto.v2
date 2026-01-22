import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  logModAction,
  notifyUser,
  formatDuration,
} from '../../modules/moderation/discord/embeds/presets.js';
import { buildModActionError } from '../../modules/moderation/discord/panelBuilder.js';
import { parseTempbanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { type GuildMember } from 'discord.js';
import { ensureNonNull } from '#root/lib/utils.js';
import {
  ephemeralError,
  defer,
  editReply,
  errorMessage,
  successContainer,
  EMOJI,
} from '#lib/discord/index.js';

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

  if (!options) {
    await interaction.reply(
      ephemeralError('Invalid duration format. Use formats like: 1h, 1d, 7d')
    );
    return;
  }

  const {
    target,
    targetId,
    reason,
    durationSeconds,
    deleteMessages,
    guild,
    moderator,
    moderatorMember,
  } = options;

  const maxDuration = 365 * 24 * 60 * 60;
  if (durationSeconds > maxDuration) {
    await interaction.reply(ephemeralError('Maximum tempban duration is 1 year.'));
    return;
  }

  await defer(interaction);

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
      const canModerateResult = moderationService.canModerate(moderatorMember, targetMember);
      if (!canModerateResult.canModerate) {
        await editReply(
          interaction,
          errorMessage('Error', canModerateResult.reason ?? 'Cannot moderate this user.')
        );
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

    const unbanTimestamp = Math.floor((Date.now() + durationSeconds * 1000) / 1000);

    await editReply(
      interaction,
      successContainer()
        .h1(`${EMOJI.SUCCESS} Tempban Successful`)
        .kv({
          [`${EMOJI.MEMBER} Target`]: `${targetTag}`,
          [`${EMOJI.SERVER_FOLDER} Case`]: `#${result.caseNumber}`,
          [`${EMOJI.SLOWMODE} Duration`]: formatDuration(durationSeconds),
        })
        .separator()
        .footer(`Auto-unban <t:${unbanTimestamp}:R>`)
    );
  } catch (error) {
    interaction.client.logger.error('Error in tempban command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the tempban.')
    ).catch(() => {});
  }
}
