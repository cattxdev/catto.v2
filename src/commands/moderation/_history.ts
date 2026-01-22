import { Subcommand } from '@sapphire/plugin-subcommands';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { createHistoryEmbed } from '../../modules/moderation/discord/embeds/presets.js';
import { parseHistoryOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, editError, defer, editReply, infoMessage } from '#lib/discord/index.js';

// Note: Uses hybrid approach - embeds for history display (rich formatting),
// DCB containers for simple messages (empty history, errors)

export async function handleHistory(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseHistoryOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await defer(interaction);

  try {
    const cases = await moderationService.getUserCases(options.guildId, options.targetId);

    if (cases.length === 0) {
      await editReply(interaction, infoMessage(`${options.target.tag} has no moderation history.`));
      return;
    }

    const embed = createHistoryEmbed(options.target, cases);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    interaction.client.logger.error('Error in history command:', error);
    await interaction
      .editReply(editError('An unexpected error occurred while fetching the history.'))
      .catch(() => {});
  }
}
