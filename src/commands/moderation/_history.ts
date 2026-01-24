import { Subcommand } from '@sapphire/plugin-subcommands';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { createHistoryEmbed } from '../../modules/moderation/discord/embeds/presets.js';
import { getHistoryPaginationBase } from '../../modules/moderation/discord/customId.js';
import { parseHistoryOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { ephemeralError, editError, defer, editReply, infoMessage } from '#lib/discord/index.js';

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

  await defer(interaction).public();

  try {
    const cases = await moderationService.getUserCases(options.guildId, options.targetId);

    if (cases.length === 0) {
      await editReply(interaction, infoMessage(`${options.target.tag} has no moderation history.`));
      return;
    }

    const message = createHistoryEmbed(options.target, cases, {
      page: 1,
      paginationCustomIdBase: getHistoryPaginationBase(options.targetId, 1),
    });
    await editReply(interaction, message);
  } catch (error) {
    interaction.client.logger.error('Error in history command:', error);
    await interaction
      .editReply(editError('An unexpected error occurred while fetching the history.'))
      .catch(() => {});
  }
}
