import { Subcommand } from '@sapphire/plugin-subcommands';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { createCaseEmbed } from '../../modules/moderation/discord/embeds.js';
import { parseCaseOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';

export async function handleCase(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseCaseOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      return;
    }
    throw error;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const modCase = await moderationService.getCase(options.guildId, options.caseNumber);

    if (!modCase) {
      await interaction.editReply({ content: `❌ Case #${options.caseNumber} not found.` });
      return;
    }

    const embed = createCaseEmbed(modCase);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    interaction.client.logger.error('Error in case command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while fetching the case.',
      })
      .catch(() => {});
  }
}
