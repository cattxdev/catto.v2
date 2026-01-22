import { Subcommand } from '@sapphire/plugin-subcommands';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { createCaseEmbed } from '../../modules/moderation/discord/embeds/presets.js';
import { parseCaseOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, editError, defer, editReply, infoMessage } from '#lib/discord/index.js';

export async function handleCase(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseCaseOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await defer(interaction);

  try {
    const modCase = await moderationService.getCase(options.guildId, options.caseNumber);

    if (!modCase) {
      await editReply(interaction, infoMessage(`Case #${options.caseNumber} not found.`));
      return;
    }

    const embed = createCaseEmbed(modCase);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    interaction.client.logger.error('Error in case command:', error);
    await interaction
      .editReply(editError('An unexpected error occurred while fetching the case.'))
      .catch(() => {});
  }
}
