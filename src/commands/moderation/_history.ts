import { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags } from 'discord.js';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { createHistoryEmbed } from '../../modules/moderation/discord/embeds/presets.js';
import { parseHistoryOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';

export async function handleHistory(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseHistoryOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
      return;
    }
    throw error;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const cases = await moderationService.getUserCases(options.guildId, options.targetId);

    if (cases.length === 0) {
      await interaction.editReply({
        content: `📋 **${options.target.tag}** has no moderation history.`,
      });
      return;
    }

    const embed = createHistoryEmbed(options.target, cases);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    interaction.client.logger.error('Error in history command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while fetching the history.',
      })
      .catch(() => {});
  }
}
