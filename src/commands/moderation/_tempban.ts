import { Subcommand } from '@sapphire/plugin-subcommands';
import { ModAction } from '@prisma/client';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import {
  createModEmbed,
  notifyUser,
  logToModChannel,
  formatDuration,
} from '../../modules/moderation/discord/embeds.js';
import { parseDurationToSeconds } from '#lib/interaction/typedOptions.js';
import { safeParse, durationStringSchema } from '#lib/validation/zod.js';
import { type GuildMember, MessageFlags } from 'discord.js';

export async function handleTempban(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const target = interaction.options.getUser('target', true);
  const durationStr = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  const deleteMessages = interaction.options.getBoolean('delete_messages') ?? false;

  // Validate duration format
  const validation = safeParse(durationStringSchema, durationStr);
  if (!validation.success) {
    await interaction.reply({
      content: '❌ Invalid duration format. Use formats like: 1h, 1d, 7d',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const durationSeconds = parseDurationToSeconds(durationStr);
  if (!durationSeconds) {
    await interaction.reply({
      content: '❌ Invalid duration format.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

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
    if (!interaction.guild.members.me?.permissions.has('BanMembers')) {
      await interaction.editReply({ content: '❌ I do not have permission to ban members.' });
      return;
    }

    // Fetch target member if they exist
    let targetMember: GuildMember | null = null;
    try {
      targetMember = await interaction.guild.members.fetch(target.id);
    } catch {
      // User may not be in the server
    }

    // Check if moderator can moderate target (if target is in server)
    if (targetMember) {
      const canModerateResult = moderationService.canModerate(
        interaction.member as GuildMember,
        targetMember
      );
      if (!canModerateResult.canModerate) {
        await interaction.editReply({ content: `❌ ${canModerateResult.reason}` });
        return;
      }

      // Notify user before tempban
      await notifyUser(target, ModAction.TEMPBAN, interaction.guild, reason, durationSeconds);
    }

    // Execute tempban via service
    const result = await moderationService.tempban(
      interaction.guild,
      target,
      interaction.user,
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

    // Create and log embed
    const embed = createModEmbed(
      ModAction.TEMPBAN,
      target,
      interaction.user,
      reason,
      result.caseNumber,
      durationSeconds
    );
    await logToModChannel(interaction.guild, embed);

    await interaction.editReply({
      content: `✅ **${target.tag}** has been temporarily banned for **${formatDuration(durationSeconds)}**. (Case #${result.caseNumber})\n⏰ They will be automatically unbanned <t:${Math.floor((Date.now() + durationSeconds * 1000) / 1000)}:R>`,
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
