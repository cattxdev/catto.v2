import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  logModActionV2,
  notifyUser,
  formatDuration,
} from '../../modules/moderation/discord/embeds/presets.js';
import { parseTempbanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { type GuildMember, MessageFlags } from 'discord.js';
import { ensureNonNull } from '#root/lib/utils.js';

export async function handleTempban(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Parse options (supports both target user and target_id for users not in server)
  let options;
  try {
    options = parseTempbanOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({
        content: `❌ ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }

  if (!options) {
    await interaction.reply({
      content: '❌ Invalid duration format. Use formats like: 1h, 1d, 7d',
      flags: MessageFlags.Ephemeral,
    });
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

  // Max tempban duration: 1 year
  const maxDuration = 365 * 24 * 60 * 60;
  if (durationSeconds > maxDuration) {
    await interaction.reply({
      content: '❌ Maximum tempban duration is 1 year.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    // Check bot permissions
    if (!guild.members.me?.permissions.has('BanMembers')) {
      await interaction.editReply({ content: '❌ I do not have permission to ban members.' });
      return;
    }

    // Try to fetch the target member if they're in the server
    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(targetId);
    } catch {
      // User is not in the server - that's fine for tempban
    }

    // Check if moderator can moderate target (only if target is in server)
    if (targetMember) {
      const canModerateResult = moderationService.canModerate(moderatorMember, targetMember);
      if (!canModerateResult.canModerate) {
        await interaction.editReply({ content: `❌ ${canModerateResult.reason}` });
        return;
      }

      // Notify user before tempban (only if they're in server)
      if (target) {
        await notifyUser(target, ModAction.TEMPBAN, guild, reason, durationSeconds);
      }
    }

    // Determine the target tag to display
    const targetTag = target?.tag ?? `User ID: ${targetId}`;

    // Execute tempban via service (use tempbanById to support users not in server)
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
      await interaction.editReply({
        content: `❌ ${result.error ?? 'Failed to tempban the user.'}`,
      });
      return;
    }

    // Log to mod channel (works even without user object - will use ID)
    await logModActionV2(
      guild,
      ModAction.TEMPBAN,
      target ?? { id: targetId, tag: targetTag },
      moderator,
      reason ?? 'No reason provided',
      ensureNonNull(result.caseNumber, 'tempban > handleTempban(126): result.caseNumber'),
      durationSeconds
    );

    await interaction.editReply({
      content: `✅ **${targetTag}** has been temporarily banned for **${formatDuration(durationSeconds)}**. (Case #${result.caseNumber})\n⏰ They will be automatically unbanned <t:${Math.floor((Date.now() + durationSeconds * 1000) / 1000)}:R>`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in tempban command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the tempban.',
      })
      .catch(() => {});
  }
}
