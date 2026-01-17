import { Subcommand } from '@sapphire/plugin-subcommands';
import { GuildMember } from 'discord.js';
import {
	createModCase,
	createModEmbed,
	notifyUser,
	logToModChannel,
	canModerate,
	ModAction
} from '../../lib/moderation.js';

export async function handleKick(interaction: Subcommand.ChatInputCommandInteraction) {
	if (!interaction.guild || !interaction.member) {
		await interaction.reply({
			content: '❌ This command can only be used in a server.',
			ephemeral: true
		});
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	try {
		const target = interaction.options.getUser('target', true);
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		let targetMember;
		try {
			targetMember = await interaction.guild.members.fetch(target.id);
		} catch {
			await interaction.editReply({
				content: '❌ Target is not a member of this server.'
			});
			return;
		}

		if (!interaction.guild.members.me?.permissions.has('KickMembers')) {
			await interaction.editReply({
				content: '❌ I do not have permission to kick members.'
			});
			return;
		}

		const canModerateResult = canModerate(
			interaction.member as GuildMember,
			targetMember
		);

		if (!canModerateResult.canModerate) {
			await interaction.editReply({
				content: `❌ ${canModerateResult.reason}`
			});
			return;
		}

		const notified = await notifyUser(
			target,
			ModAction.KICK,
			interaction.guild,
			reason
		);

		try {
			await targetMember.kick(`${reason} | Moderator: ${interaction.user.tag}`);
		} catch (error) {
			interaction.client.logger.error('Failed to kick user:', error);
			await interaction.editReply({
				content: '❌ Failed to kick the user. Please check my permissions and role hierarchy.'
			});
			return;
		}

		const modCase = await createModCase({
			guildId: interaction.guild.id,
			action: ModAction.KICK,
			targetId: target.id,
			targetTag: target.tag,
			moderatorId: interaction.user.id,
			moderatorTag: interaction.user.tag,
			reason
		});

		const embed = createModEmbed(
			ModAction.KICK,
			target,
			interaction.user,
			reason,
			modCase.caseNumber
		);

		await logToModChannel(interaction.guild, embed);

		await interaction.editReply({
			content: `✅ **${target.tag}** has been kicked. (Case #${modCase.caseNumber})${!notified ? '\n⚠️ Could not send DM notification to user.' : ''}`
		});
	} catch (error) {
		interaction.client.logger.error('Error in kick command:', error);
		await interaction.editReply({
			content: '❌ An unexpected error occurred while processing the kick.'
		}).catch(() => {});
	}
}
