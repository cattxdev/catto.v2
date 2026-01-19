import { Subcommand } from '@sapphire/plugin-subcommands';
import { GuildMember } from 'discord.js';
import {
  createModCase,
  createModEmbed,
  notifyUser,
  logToModChannel,
  canModerate,
  parseDuration,
  formatDuration,
  ModAction,
} from '../../lib/moderation.js';

export async function handleTimeout(interaction: Subcommand.ChatInputCommandInteraction) {
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
    const durationStr = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    const durationSeconds = parseDuration(durationStr);
    if (!durationSeconds) {
      await interaction.editReply({
        content: '❌ Invalid duration format. Use formats like: 10m, 1h, 2d, 1w',
      });
      return;
    }

    const durationMs = durationSeconds * 1000;
    const maxDuration = 28 * 24 * 60 * 60 * 1000;
    if (durationMs > maxDuration) {
      await interaction.editReply({
        content: '❌ Timeout duration cannot exceed 28 days.',
      });
      return;
    }

    if (durationMs < 60 * 1000) {
      await interaction.editReply({
        content: '❌ Timeout duration must be at least 1 minute.',
      });
      return;
    }

    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(target.id);
    } catch {
      await interaction.editReply({
        content: '❌ Target is not a member of this server.',
      });
      return;
    }

    if (!interaction.guild.members.me?.permissions.has('ModerateMembers')) {
      await interaction.editReply({
        content: '❌ I do not have permission to timeout members.',
      });
      return;
    }

    const canModerateResult = canModerate(interaction.member as GuildMember, targetMember);

    if (!canModerateResult.canModerate) {
      await interaction.editReply({
        content: `❌ ${canModerateResult.reason}`,
      });
      return;
    }

    const notified = await notifyUser(
      target,
      ModAction.TIMEOUT,
      interaction.guild,
      reason,
      durationSeconds
    );

    try {
      await targetMember.timeout(durationMs, `${reason} | Moderator: ${interaction.user.tag}`);
    } catch (error) {
      interaction.client.logger.error('Failed to timeout user:', error);
      await interaction.editReply({
        content: '❌ Failed to timeout the user. Please check my permissions and role hierarchy.',
      });
      return;
    }

    const expiresAt = new Date(Date.now() + durationMs);
    const modCase = await createModCase({
      guildId: interaction.guild.id,
      action: ModAction.TIMEOUT,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      duration: durationSeconds,
      expiresAt,
    });

    const embed = createModEmbed(
      ModAction.TIMEOUT,
      target,
      interaction.user,
      reason,
      modCase.caseNumber,
      durationSeconds
    );

    await logToModChannel(interaction.guild, embed);

    await interaction.editReply({
      content: `✅ **${target.tag}** has been timed out for ${formatDuration(durationSeconds)}. (Case #${modCase.caseNumber})${!notified ? '\n⚠️ Could not send DM notification to user.' : ''}`,
    });
  } catch (error) {
    interaction.client.logger.error('Error in timeout command:', error);
    await interaction
      .editReply({
        content: '❌ An unexpected error occurred while processing the timeout.',
      })
      .catch(() => {});
  }
}
