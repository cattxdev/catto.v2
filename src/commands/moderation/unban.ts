import { Subcommand } from '@sapphire/plugin-subcommands';
import {
	createModCase,
	createModEmbed,
	logToModChannel,
	ModAction
} from '../../lib/moderation.js';

export async function handleUnban(interaction: Subcommand.ChatInputCommandInteraction) {
	if (!interaction.guild) {
		await interaction.reply({
			content: '❌ This command can only be used in a server.',
			ephemeral: true
		});
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	try {
		const userId = interaction.options.getString('user_id', true);
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		if (!/^\d{17,19}$/.test(userId)) {
			await interaction.editReply({
				content: '❌ Invalid user ID format.'
			});
			return;
		}

		if (!interaction.guild.members.me?.permissions.has('BanMembers')) {
			await interaction.editReply({
				content: '❌ I do not have permission to unban members.'
			});
			return;
		}

		let ban;
		try {
			ban = await interaction.guild.bans.fetch(userId);
		} catch {
			await interaction.editReply({
				content: '❌ This user is not banned.'
			});
			return;
		}

		try {
			await interaction.guild.members.unban(
				userId,
				`${reason} | Moderator: ${interaction.user.tag}`
			);
		} catch (error) {
			interaction.client.logger.error('Failed to unban user:', error);
			await interaction.editReply({
				content: '❌ Failed to unban the user. Please check my permissions.'
			});
			return;
		}

		const modCase = await createModCase({
			guildId: interaction.guild.id,
			action: ModAction.UNBAN,
			targetId: userId,
			targetTag: ban.user.tag,
			moderatorId: interaction.user.id,
			moderatorTag: interaction.user.tag,
			reason
		});

		const embed = createModEmbed(
			ModAction.UNBAN,
			ban.user,
			interaction.user,
			reason,
			modCase.caseNumber
		);

		await logToModChannel(interaction.guild, embed);

		await interaction.editReply({
			content: `✅ **${ban.user.tag}** has been unbanned. (Case #${modCase.caseNumber})`
		});
	} catch (error) {
		interaction.client.logger.error('Error in unban command:', error);
		await interaction.editReply({
			content: '❌ An unexpected error occurred while processing the unban.'
		}).catch(() => {});
	}
}
