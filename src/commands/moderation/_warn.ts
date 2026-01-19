import { Subcommand } from '@sapphire/plugin-subcommands';
import {
  createModCase,
  createModEmbed,
  notifyUser,
  logToModChannel,
  ModAction,
} from '../../lib/moderation.js';

export async function handleWarn(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const target = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason', true);

    try {
      await interaction.guild.members.fetch(target.id);
    } catch {
      await interaction.editReply({
        content: '❌ Target is not a member of this server.',
      });
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.editReply({
        content: '❌ You cannot warn yourself.',
      });
      return;
    }

    if (target.bot) {
      await interaction.editReply({
        content: '❌ You cannot warn bots.',
      });
      return;
    }

    const notified = await notifyUser(target, ModAction.WARN, interaction.guild, reason);

    const modCase = await createModCase({
      guildId: interaction.guild.id,
      action: ModAction.WARN,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
    });

    const embed = createModEmbed(
      ModAction.WARN,
      target,
      interaction.user,
      reason,
      modCase.caseNumber
    );

    await logToModChannel(interaction.guild, embed);

    await interaction.editReply({
      content: `✅ **${target.tag}** has been warned. (Case #${modCase.caseNumber})${!notified ? '\n⚠️ Could not send DM notification to user.' : ''}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in warn command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the warning.',
      })
      .catch(() => {});
  }
}
