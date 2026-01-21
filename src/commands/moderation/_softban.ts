import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModActionV2, notifyUser } from '../../modules/moderation/discord/embeds.js';
import { parseSoftbanOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { type GuildMember, MessageFlags } from 'discord.js';

export async function handleSoftban(interaction: Subcommand.ChatInputCommandInteraction) {
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
    options = parseSoftbanOptions(interaction);
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

  const { target, targetId, reason, deleteDays, guild, moderator, moderatorMember } = options;

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
      // User is not in the server - that's fine for softban
    }

    // Check if moderator can moderate target (only if target is in server)
    if (targetMember) {
      const canModerateResult = moderationService.canModerate(moderatorMember, targetMember);
      if (!canModerateResult.canModerate) {
        await interaction.editReply({ content: `❌ ${canModerateResult.reason}` });
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
      await interaction.editReply({
        content: `❌ ${result.error ?? 'Failed to softban the user.'}`,
      });
      return;
    }

    // Log to mod channel (works even without user object - will use ID)
    await logModActionV2(
      guild,
      ModAction.SOFTBAN,
      target ?? { id: targetId, tag: targetTag },
      moderator,
      reason ?? 'No reason provided',
      result.caseNumber!
    );

    await interaction.editReply({
      content: `✅ **${targetTag}** has been softbanned (messages deleted, user unbanned). (Case #${result.caseNumber})`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in softban command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the softban.',
      })
      .catch(() => {});
  }
}
